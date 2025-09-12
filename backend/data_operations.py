from fastapi import APIRouter, HTTPException, Body, Query
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np
from datetime import datetime
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/data", tags=["data-operations"])

# Import the centralized data manager
from data_manager import data_manager, FilterConfig, FilterType, DataType

# Import from shared module to avoid circular imports
from shared import datasets, DataInfo

@router.post("/{dataset_id}/filter")
async def filter_dataset(
    dataset_id: str,
    filters: Dict[str, Any] = Body(...)
):
    """Apply filters to dataset and return filtered results"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    data_info = datasets[dataset_id]
    df = data_info.df.copy()
    
    try:
        filtered_df = apply_filters(df, filters)
        
        return {
            "dataset_id": dataset_id,
            "original_rows": len(df),
            "filtered_rows": len(filtered_df),
            "filters_applied": filters,
            "preview_data": convert_df_to_json(filtered_df.head(20))
        }
    
    except Exception as e:
        logger.error(f"Filtering error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Filtering error: {str(e)}")

@router.post("/{dataset_id}/transform")
async def transform_dataset(
    dataset_id: str,
    transformations: List[Dict[str, Any]] = Body(...)
):
    """Apply data transformations to dataset"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    data_info = datasets[dataset_id]
    original_rows = len(data_info.df)
    df = data_info.df.copy()
    
    try:
        logger.info(f"Applying transformations to {dataset_id}: {transformations}")
        transformed_df = apply_transformations(df, transformations)
        new_rows = len(transformed_df)
        
        logger.info(f"Transformation result: {original_rows} rows -> {new_rows} rows")
        
        # Update the original dataset
        data_info.df = transformed_df
        data_info.data_types = data_info._infer_data_types()
        data_info.summary_stats = data_info._generate_summary_stats()
        
        return {
            "dataset_id": dataset_id,
            "transformations_applied": transformations,
            "new_rows": new_rows,
            "new_columns": len(transformed_df.columns),
            "column_names": list(transformed_df.columns)
        }
    
    except Exception as e:
        logger.error(f"Transformation error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Transformation error: {str(e)}")

@router.post("/{dataset_id}/merge")
async def merge_datasets(
    dataset_id: str,
    merge_config: Dict[str, Any] = Body(...)
):
    """Merge current dataset with another dataset"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    target_dataset_id = merge_config.get("target_dataset_id")
    if target_dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Target dataset not found")
    
    data_info = datasets[dataset_id]
    target_data_info = datasets[target_dataset_id]
    
    try:
        merged_df = perform_merge(
            data_info.df, 
            target_data_info.df, 
            merge_config
        )
        
        # Create new merged dataset
        new_dataset_id = f"merged_{dataset_id}_{target_dataset_id}_{int(datetime.now().timestamp())}"
        datasets[new_dataset_id] = DataInfo(
            merged_df, 
            f"Merged_{data_info.filename}_{target_data_info.filename}", 
            datetime.now()
        )
        
        return {
            "new_dataset_id": new_dataset_id,
            "source_datasets": [dataset_id, target_dataset_id],
            "merged_rows": len(merged_df),
            "merged_columns": len(merged_df.columns),
            "merge_config": merge_config
        }
    
    except Exception as e:
        logger.error(f"Merge error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Merge error: {str(e)}")

@router.post("/{dataset_id}/concatenate")
async def concatenate_datasets(
    dataset_id: str,
    concat_config: Dict[str, Any] = Body(...)
):
    """Concatenate multiple datasets"""
    source_datasets = concat_config.get("source_datasets", [])
    
    if not source_datasets:
        raise HTTPException(status_code=400, detail="No source datasets specified")
    
    # Verify all datasets exist
    for ds_id in source_datasets:
        if ds_id not in datasets:
            raise HTTPException(status_code=404, detail=f"Dataset {ds_id} not found")
    
    try:
        # Get all dataframes
        dataframes = [datasets[ds_id].df for ds_id in source_datasets]
        
        # Perform concatenation
        axis = concat_config.get("axis", 0)  # 0 for rows, 1 for columns
        ignore_index = concat_config.get("ignore_index", True)
        
        concatenated_df = pd.concat(dataframes, axis=axis, ignore_index=ignore_index)
        
        # Create new concatenated dataset
        new_dataset_id = f"concatenated_{int(datetime.now().timestamp())}"
        datasets[new_dataset_id] = DataInfo(
            concatenated_df,
            f"Concatenated_{len(source_datasets)}_datasets",
            datetime.now()
        )
        
        return {
            "new_dataset_id": new_dataset_id,
            "source_datasets": source_datasets,
            "concatenated_rows": len(concatenated_df),
            "concatenated_columns": len(concatenated_df.columns),
            "concat_config": concat_config
        }
    
    except Exception as e:
        logger.error(f"Concatenation error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Concatenation error: {str(e)}")

@router.get("/{dataset_id}/statistics")
async def get_detailed_statistics(dataset_id: str):
    """Get comprehensive statistics for dataset"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    data_info = datasets[dataset_id]
    df = data_info.df
    
    try:
        stats = {
            "dataset_id": dataset_id,
            "basic_info": {
                "rows": len(df),
                "columns": len(df.columns),
                "memory_usage": df.memory_usage(deep=True).sum(),
                "duplicate_rows": df.duplicated().sum()
            },
            "column_statistics": {},
            "correlation_matrix": None,
            "missing_data": {}
        }
        
        # Column statistics
        for col in df.columns:
            col_stats = {}
            
            if df[col].dtype in ['int64', 'float64']:
                col_stats.update({
                    "type": "numeric",
                    "min": float(df[col].min()) if not df[col].isna().all() else None,
                    "max": float(df[col].max()) if not df[col].isna().all() else None,
                    "mean": float(df[col].mean()) if not df[col].isna().all() else None,
                    "median": float(df[col].median()) if not df[col].isna().all() else None,
                    "std": float(df[col].std()) if not df[col].isna().all() else None,
                    "skewness": float(df[col].skew()) if not df[col].isna().all() else None,
                    "kurtosis": float(df[col].kurtosis()) if not df[col].isna().all() else None
                })
            
            elif df[col].dtype == 'datetime64[ns]':
                col_stats.update({
                    "type": "datetime",
                    "min": str(df[col].min()) if not df[col].isna().all() else None,
                    "max": str(df[col].max()) if not df[col].isna().all() else None,
                    "frequency": get_datetime_frequency(df[col])
                })
            
            else:  # categorical
                col_stats.update({
                    "type": "categorical",
                    "unique_values": int(df[col].nunique()),
                    "top_values": df[col].value_counts().head(10).to_dict(),
                    "cardinality": "high" if df[col].nunique() > 50 else "medium" if df[col].nunique() > 10 else "low"
                })
            
            col_stats["missing_count"] = int(df[col].isna().sum())
            col_stats["missing_percentage"] = float(df[col].isna().sum() / len(df) * 100)
            
            stats["column_statistics"][col] = col_stats
        
        # Correlation matrix for numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 1:
            corr_matrix = df[numeric_cols].corr()
            stats["correlation_matrix"] = corr_matrix.to_dict()
        
        # Missing data summary
        missing_data = df.isnull().sum()
        stats["missing_data"] = {
            "total_missing": int(missing_data.sum()),
            "columns_with_missing": missing_data[missing_data > 0].to_dict(),
            "missing_patterns": analyze_missing_patterns(df)
        }
        
        return stats
    
    except Exception as e:
        logger.error(f"Statistics error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Statistics error: {str(e)}")

# Helper functions
def apply_filters(df: pd.DataFrame, filters: Dict[str, Any]) -> pd.DataFrame:
    """Apply filters to dataframe"""
    filtered_df = df.copy()
    
    logger.info(f"Starting with {len(filtered_df)} rows")
    
    for column, filter_config in filters.items():
        if column not in df.columns:
            logger.warning(f"Column '{column}' not found in dataframe")
            continue
        
        filter_type = filter_config.get("type")
        filter_value = filter_config.get("value")
        
        logger.info(f"Applying filter to column '{column}': type='{filter_type}', value='{filter_value}'")
        logger.info(f"Column data type: {filtered_df[column].dtype}")
        logger.info(f"Filter value type: {type(filter_value)}")
        
        before_rows = len(filtered_df)
        
        if filter_type == "equals":
            # Try to convert filter value to match column data type
            try:
                if pd.api.types.is_numeric_dtype(filtered_df[column]):
                    original_value = filter_value
                    filter_value = pd.to_numeric(filter_value, errors='coerce')
                    logger.info(f"Converted numeric filter: '{original_value}' -> {filter_value}")
                elif pd.api.types.is_datetime64_any_dtype(filtered_df[column]):
                    original_value = filter_value
                    filter_value = pd.to_datetime(filter_value, errors='coerce')
                    logger.info(f"Converted datetime filter: '{original_value}' -> {filter_value}")
                filtered_df = filtered_df[filtered_df[column] == filter_value]
            except Exception as e:
                logger.warning(f"Type conversion failed, using string comparison: {e}")
                # Fallback to string comparison
                filtered_df = filtered_df[filtered_df[column].astype(str) == str(filter_value)]
        elif filter_type == "not_equals":
            # Try to convert filter value to match column data type
            try:
                if pd.api.types.is_numeric_dtype(filtered_df[column]):
                    filter_value = pd.to_numeric(filter_value, errors='coerce')
                elif pd.api.types.is_datetime64_any_dtype(filtered_df[column]):
                    filter_value = pd.to_datetime(filter_value, errors='coerce')
                filtered_df = filtered_df[filtered_df[column] != filter_value]
            except:
                # Fallback to string comparison
                filtered_df = filtered_df[filtered_df[column].astype(str) != str(filter_value)]
        elif filter_type == "contains":
            filtered_df = filtered_df[filtered_df[column].astype(str).str.contains(str(filter_value), na=False)]
        elif filter_type == "greater_than":
            # Try to convert filter value to match column data type
            try:
                if pd.api.types.is_numeric_dtype(filtered_df[column]):
                    filter_value = pd.to_numeric(filter_value, errors='coerce')
                elif pd.api.types.is_datetime64_any_dtype(filtered_df[column]):
                    filter_value = pd.to_datetime(filter_value, errors='coerce')
                filtered_df = filtered_df[filtered_df[column] > filter_value]
            except:
                # Fallback to string comparison
                filtered_df = filtered_df[filtered_df[column].astype(str) > str(filter_value)]
        elif filter_type == "less_than":
            # Try to convert filter value to match column data type
            try:
                if pd.api.types.is_numeric_dtype(filtered_df[column]):
                    filter_value = pd.to_numeric(filter_value, errors='coerce')
                elif pd.api.types.is_datetime64_any_dtype(filtered_df[column]):
                    filter_value = pd.to_datetime(filter_value, errors='coerce')
                filtered_df = filtered_df[filtered_df[column] < filter_value]
            except:
                # Fallback to string comparison
                filtered_df = filtered_df[filtered_df[column].astype(str) < str(filter_value)]
        elif filter_type == "between":
            min_val = filter_value.get("min")
            max_val = filter_value.get("max")
            # Try to convert values to match column data type
            try:
                if pd.api.types.is_numeric_dtype(filtered_df[column]):
                    min_val = pd.to_numeric(min_val, errors='coerce')
                    max_val = pd.to_numeric(max_val, errors='coerce')
                elif pd.api.types.is_datetime64_any_dtype(filtered_df[column]):
                    min_val = pd.to_datetime(min_val, errors='coerce')
                    max_val = pd.to_datetime(max_val, errors='coerce')
                filtered_df = filtered_df[(filtered_df[column] >= min_val) & (filtered_df[column] <= max_val)]
            except:
                # Fallback to string comparison
                filtered_df = filtered_df[(filtered_df[column].astype(str) >= str(min_val)) & (filtered_df[column].astype(str) <= str(max_val))]
        elif filter_type == "in_list":
            # Try to convert filter values to match column data type
            try:
                if pd.api.types.is_numeric_dtype(filtered_df[column]):
                    filter_value = [pd.to_numeric(v, errors='coerce') for v in filter_value]
                elif pd.api.types.is_datetime64_any_dtype(filtered_df[column]):
                    filter_value = [pd.to_datetime(v, errors='coerce') for v in filter_value]
                filtered_df = filtered_df[filtered_df[column].isin(filter_value)]
            except:
                # Fallback to string comparison
                filtered_df = filtered_df[filtered_df[column].astype(str).isin([str(v) for v in filter_value])]
        elif filter_type == "is_null":
            filtered_df = filtered_df[filtered_df[column].isna()]
        elif filter_type == "not_null":
            filtered_df = filtered_df[filtered_df[column].notna()]
        else:
            logger.warning(f"Unknown filter type: {filter_type}")
            continue
        
        after_rows = len(filtered_df)
        logger.info(f"Filter '{column}' ({filter_type}): {before_rows} -> {after_rows} rows")
    
    logger.info(f"Final result: {len(filtered_df)} rows")
    
    # Safety check: if all rows are filtered out, log a warning and return original
    if len(filtered_df) == 0 and len(df) > 0:
        logger.warning("All rows filtered out! This might indicate a filter configuration issue.")
        logger.warning("Consider checking filter values and data types.")
    
    return filtered_df

def apply_transformations(df: pd.DataFrame, transformations: List[Dict[str, Any]]) -> pd.DataFrame:
    """Apply data transformations to dataframe"""
    transformed_df = df.copy()
    
    for transform in transformations:
        transform_type = transform.get("type")
        
        if transform_type == "apply_filters":
            # Persist filters as a transformation on the dataframe
            filters_cfg = transform.get("config", {}).get("filters", {})
            logger.info(f"Applying filters: {filters_cfg}")
            logger.info(f"Filter config details: {json.dumps(filters_cfg, indent=2)}")
            if isinstance(filters_cfg, dict) and filters_cfg:
                before_rows = len(transformed_df)
                logger.info(f"Before filtering: {before_rows} rows")
                transformed_df = apply_filters(transformed_df, filters_cfg)
                after_rows = len(transformed_df)
                logger.info(f"Filter result: {before_rows} rows -> {after_rows} rows")
            continue

        if transform_type == "rename_column":
            old_name = transform.get("old_name")
            new_name = transform.get("new_name")
            if old_name in transformed_df.columns:
                transformed_df = transformed_df.rename(columns={old_name: new_name})
        
        elif transform_type == "drop_column":
            columns_to_drop = transform.get("columns", [])
            transformed_df = transformed_df.drop(columns=columns_to_drop, errors='ignore')
        
        elif transform_type == "fill_na":
            column = transform.get("column")
            fill_value = transform.get("fill_value")
            method = transform.get("method", "value")
            
            if method == "value" and column in transformed_df.columns:
                transformed_df[column] = transformed_df[column].fillna(fill_value)
            elif method in ["ffill", "bfill"] and column in transformed_df.columns:
                transformed_df[column] = transformed_df[column].fillna(method=method)
        
        elif transform_type == "drop_na":
            columns = transform.get("columns", [])
            how = transform.get("how", "any")
            transformed_df = transformed_df.dropna(subset=columns, how=how)
        
        elif transform_type == "sort_values":
            columns = transform.get("columns", [])
            ascending = transform.get("ascending", True)
            transformed_df = transformed_df.sort_values(by=columns, ascending=ascending)
        
        elif transform_type == "reset_index":
            transformed_df = transformed_df.reset_index(drop=True)
    
    return transformed_df

def perform_merge(df1: pd.DataFrame, df2: pd.DataFrame, merge_config: Dict[str, Any]) -> pd.DataFrame:
    """Perform merge operation between two dataframes"""
    how = merge_config.get("how", "inner")
    left_on = merge_config.get("left_on")
    right_on = merge_config.get("right_on")
    on = merge_config.get("on")
    
    if on:
        merged_df = df1.merge(df2, on=on, how=how)
    elif left_on and right_on:
        merged_df = df1.merge(df2, left_on=left_on, right_on=right_on, how=how)
    else:
        raise ValueError("Merge configuration must specify 'on' or both 'left_on' and 'right_on'")
    
    return merged_df

def convert_df_to_json(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Convert dataframe to JSON-serializable format"""
    data = []
    for _, row in df.iterrows():
        row_dict = {}
        for col in df.columns:
            value = row[col]
            if pd.isna(value):
                row_dict[col] = None
            elif isinstance(value, (np.integer, np.floating)):
                row_dict[col] = float(value)
            elif isinstance(value, pd.Timestamp):
                row_dict[col] = value.isoformat()
            elif isinstance(value, np.ndarray):
                row_dict[col] = value.tolist()
            else:
                row_dict[col] = str(value)
        data.append(row_dict)
    return data

def get_datetime_frequency(series: pd.Series) -> str:
    """Get frequency of datetime series"""
    try:
        freq = pd.infer_freq(series.dropna())
        return freq if freq else "irregular"
    except:
        return "irregular"

def analyze_missing_patterns(df: pd.DataFrame) -> Dict[str, Any]:
    """Analyze patterns in missing data"""
    missing_df = df.isnull()
    
    # Find columns that have missing values together
    missing_patterns = {}
    for i in range(len(missing_df.columns)):
        for j in range(i+1, len(missing_df.columns)):
            col1, col2 = missing_df.columns[i], missing_df.columns[j]
            both_missing = (missing_df[col1] & missing_df[col2]).sum()
            if both_missing > 0:
                pattern_key = f"{col1}_and_{col2}"
                missing_patterns[pattern_key] = int(both_missing)
    
    return missing_patterns

# New centralized data management endpoints

@router.get("/versions/{version_id}")
async def get_version_info(version_id: str):
    """Get information about a specific dataset version"""
    version_info = data_manager.get_version_info(version_id)
    if not version_info:
        raise HTTPException(status_code=404, detail="Version not found")
    
    return version_info.to_dict()

@router.get("/versions/{version_id}/data")
async def get_version_data(version_id: str, rows: int = Query(100, description="Number of rows to return")):
    """Get data for a specific version"""
    df = data_manager.get_dataset(version_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Convert to JSON-serializable format
    preview_data = []
    for _, row in df.head(rows).iterrows():
        row_dict = {}
        for col in df.columns:
            value = row[col]
            if pd.isna(value):
                row_dict[col] = None
            elif isinstance(value, (np.integer, np.floating)):
                row_dict[col] = float(value)
            elif isinstance(value, pd.Timestamp):
                row_dict[col] = value.isoformat()
            elif isinstance(value, np.ndarray):
                row_dict[col] = value.tolist()
            else:
                row_dict[col] = str(value)
        preview_data.append(row_dict)
    
    return {
        "version_id": version_id,
        "preview_data": preview_data,
        "total_rows": len(df),
        "columns": list(df.columns)
    }

@router.get("/versions/{version_id}/columns")
async def get_version_column_info(version_id: str):
    """Get column information for a specific version"""
    column_info = data_manager.get_column_info(version_id)
    if not column_info:
        raise HTTPException(status_code=404, detail="Version not found")
    
    return {
        "version_id": version_id,
        "columns": column_info
    }

@router.get("/versions/{version_id}/unique-values/{column}")
async def get_unique_values(version_id: str, column: str, limit: int = Query(100)):
    """Get unique values for a column in a specific version"""
    unique_values = data_manager.get_unique_values(version_id, column, limit)
    if unique_values is None:
        raise HTTPException(status_code=404, detail="Version or column not found")
    
    return {
        "version_id": version_id,
        "column": column,
        "unique_values": unique_values,
        "count": len(unique_values)
    }

@router.post("/versions/{parent_version_id}/create-filtered")
async def create_filtered_version(
    parent_version_id: str,
    name: str = Body(...),
    description: str = Body(...),
    filters: List[Dict[str, Any]] = Body(...)
):
    """Create a new filtered version of a dataset"""
    try:
        # Convert filter dictionaries to FilterConfig objects
        filter_configs = []
        for filter_dict in filters:
            filter_config = FilterConfig.from_dict(filter_dict)
            filter_configs.append(filter_config)
        
        # Create the filtered version
        version_id = data_manager.create_filtered_version(
            parent_version_id, filter_configs, name, description
        )
        
        version_info = data_manager.get_version_info(version_id)
        return {
            "success": True,
            "version_id": version_id,
            "version_info": version_info.to_dict()
        }
    
    except Exception as e:
        logger.error(f"Error creating filtered version: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating filtered version: {str(e)}")

@router.get("/datasets/{dataset_id}/versions")
async def list_dataset_versions(dataset_id: str):
    """List all versions for a dataset"""
    versions = data_manager.list_versions(dataset_id)
    return {
        "dataset_id": dataset_id,
        "versions": [v.to_dict() for v in versions]
    }

@router.delete("/versions/{version_id}")
async def delete_version(version_id: str):
    """Delete a dataset version"""
    success = data_manager.delete_version(version_id)
    if not success:
        raise HTTPException(status_code=404, detail="Version not found")
    
    return {"success": True, "message": f"Version {version_id} deleted"}

@router.post("/clear-cache")
async def clear_cache():
    """Clear all temporary versions and cached data, keeping only original datasets"""
    try:
        result = data_manager.clear_cache()
        return {
            "success": True,
            "message": f"Cache cleared successfully. Deleted {result['deleted_filtered_versions']} filtered versions and {result['deleted_datasets']} datasets. {result['remaining_original_datasets']} original datasets remain.",
            "details": result
        }
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 