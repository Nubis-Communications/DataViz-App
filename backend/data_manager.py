"""
Centralized Data Management System
Handles all data operations, transformations, and versioning consistently across the application.
"""

import logging
import json
import uuid
import os
import pickle
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd
import numpy as np
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)

class DataType(Enum):
    """Standardized data types across the application"""
    NUMERIC = "numeric"
    CATEGORICAL = "categorical"
    DATETIME = "datetime"
    TEXT = "text"
    BOOLEAN = "boolean"

class FilterType(Enum):
    """Standardized filter types"""
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    CONTAINS = "contains"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    BETWEEN = "between"
    IN_LIST = "in_list"
    IS_NULL = "is_null"
    NOT_NULL = "not_null"

@dataclass
class FilterConfig:
    """Standardized filter configuration"""
    column: str
    type: FilterType
    value: Any
    enabled: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "column": self.column,
            "type": self.type.value,
            "value": self.value,
            "enabled": self.enabled
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FilterConfig':
        return cls(
            column=data["column"],
            type=FilterType(data["type"]),
            value=data["value"],
            enabled=data.get("enabled", True)
        )

@dataclass
class DatasetVersion:
    """Dataset version information"""
    version_id: str
    parent_id: Optional[str]
    name: str
    description: str
    created_at: datetime
    filters_applied: List[FilterConfig]
    transformations_applied: List[Dict[str, Any]]
    row_count: int
    column_count: int
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "version_id": self.version_id,
            "parent_id": self.parent_id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
            "filters_applied": [f.to_dict() for f in self.filters_applied],
            "transformations_applied": self.transformations_applied,
            "row_count": self.row_count,
            "column_count": self.column_count
        }

class DataTypeConverter:
    """Centralized data type conversion utilities"""
    
    @staticmethod
    def detect_column_type(series: pd.Series) -> DataType:
        """Detect the standardized data type of a pandas Series"""
        if pd.api.types.is_numeric_dtype(series):
            return DataType.NUMERIC
        elif pd.api.types.is_datetime64_any_dtype(series):
            return DataType.DATETIME
        elif pd.api.types.is_bool_dtype(series):
            return DataType.BOOLEAN
        elif pd.api.types.is_categorical_dtype(series) or series.dtype == 'object':
            # Check if it's actually categorical (limited unique values)
            unique_ratio = series.nunique() / len(series)
            if unique_ratio < 0.1:  # Less than 10% unique values
                return DataType.CATEGORICAL
            else:
                return DataType.TEXT
        else:
            return DataType.TEXT
    
    @staticmethod
    def convert_filter_value(value: Any, target_type: DataType) -> Any:
        """Convert filter value to match target data type"""
        try:
            if target_type == DataType.NUMERIC:
                return pd.to_numeric(value, errors='coerce')
            elif target_type == DataType.DATETIME:
                return pd.to_datetime(value, errors='coerce')
            elif target_type == DataType.BOOLEAN:
                if isinstance(value, str):
                    return value.lower() in ['true', '1', 'yes', 'on']
                return bool(value)
            else:  # CATEGORICAL, TEXT
                return str(value)
        except Exception as e:
            logger.warning(f"Failed to convert value {value} to {target_type}: {e}")
            return str(value)
    
    @staticmethod
    def standardize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
        """Standardize dataframe data types and handle common issues"""
        standardized_df = df.copy()
        
        # Convert object columns to appropriate types
        for col in standardized_df.columns:
            if standardized_df[col].dtype == 'object':
                # Try to convert to numeric first
                numeric_series = pd.to_numeric(standardized_df[col], errors='coerce')
                if not numeric_series.isna().all():
                    standardized_df[col] = numeric_series
                else:
                    # Try to convert to datetime
                    import warnings
                    with warnings.catch_warnings():
                        warnings.simplefilter("ignore")
                        datetime_series = pd.to_datetime(standardized_df[col], errors='coerce')
                    if not datetime_series.isna().all():
                        standardized_df[col] = datetime_series
        
        return standardized_df

class FilterEngine:
    """Centralized filter processing engine"""
    
    def __init__(self, data_type_converter: DataTypeConverter):
        self.converter = data_type_converter
    
    def apply_filters(self, df: pd.DataFrame, filters: List[FilterConfig]) -> pd.DataFrame:
        """Apply filters to dataframe with consistent type handling"""
        filtered_df = df.copy()
        
        logger.info(f"Starting with {len(filtered_df)} rows")
        
        for filter_config in filters:
            if not filter_config.enabled:
                continue
                
            column = filter_config.column
            if column not in filtered_df.columns:
                logger.warning(f"Column '{column}' not found in dataframe")
                continue
            
            # Get column data type
            column_type = self.converter.detect_column_type(filtered_df[column])
            logger.info(f"Column '{column}' type: {column_type.value}")
            
            # Convert filter value to match column type
            converted_value = self.converter.convert_filter_value(
                filter_config.value, column_type
            )
            logger.info(f"Filter value converted: '{filter_config.value}' -> {converted_value}")
            
            before_rows = len(filtered_df)
            filtered_df = self._apply_single_filter(
                filtered_df, column, filter_config.type, converted_value, column_type
            )
            after_rows = len(filtered_df)
            
            logger.info(f"Filter '{column}' ({filter_config.type.value}): {before_rows} -> {after_rows} rows")
        
        logger.info(f"Final result: {len(filtered_df)} rows")
        return filtered_df
    
    def _apply_single_filter(self, df: pd.DataFrame, column: str, filter_type: FilterType, 
                           value: Any, column_type: DataType) -> pd.DataFrame:
        """Apply a single filter with proper type handling"""
        
        if filter_type == FilterType.EQUALS:
            return df[df[column] == value]
        elif filter_type == FilterType.NOT_EQUALS:
            return df[df[column] != value]
        elif filter_type == FilterType.CONTAINS:
            return df[df[column].astype(str).str.contains(str(value), na=False, case=False)]
        elif filter_type == FilterType.GREATER_THAN:
            return df[df[column] > value]
        elif filter_type == FilterType.LESS_THAN:
            return df[df[column] < value]
        elif filter_type == FilterType.BETWEEN:
            if isinstance(value, dict):
                min_val = value.get("min")
                max_val = value.get("max")
                min_val = self.converter.convert_filter_value(min_val, column_type)
                max_val = self.converter.convert_filter_value(max_val, column_type)
                return df[(df[column] >= min_val) & (df[column] <= max_val)]
        elif filter_type == FilterType.IN_LIST:
            if isinstance(value, list):
                converted_values = [self.converter.convert_filter_value(v, column_type) for v in value]
                return df[df[column].isin(converted_values)]
        elif filter_type == FilterType.IS_NULL:
            return df[df[column].isna()]
        elif filter_type == FilterType.NOT_NULL:
            return df[df[column].notna()]
        
        logger.warning(f"Unknown filter type: {filter_type}")
        return df

class DatasetManager:
    """Centralized dataset management with versioning"""
    
    def __init__(self, data_dir: str = "data_storage"):
        self.data_dir = data_dir
        self.datasets: Dict[str, pd.DataFrame] = {}
        self.versions: Dict[str, DatasetVersion] = {}
        self.data_type_converter = DataTypeConverter()
        self.filter_engine = FilterEngine(self.data_type_converter)
        
        # Create data directory if it doesn't exist
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Load existing data on startup
        self._load_persistent_data()
    
    def add_dataset(self, dataset_id: str, df: pd.DataFrame, filename: str) -> str:
        """Add a new dataset and create initial version"""
        # Standardize the dataframe
        standardized_df = self.data_type_converter.standardize_dataframe(df)
        
        # Create initial version
        version_id = f"{dataset_id}_original"
        
        # Store the dataframe with both dataset_id and version_id keys
        self.datasets[dataset_id] = standardized_df
        self.datasets[version_id] = standardized_df  # Also store with version_id for version endpoints
        
        version = DatasetVersion(
            version_id=version_id,
            parent_id=None,
            name=f"{filename} (Original)",
            description="Original uploaded dataset",
            created_at=datetime.now(),
            filters_applied=[],
            transformations_applied=[],
            row_count=len(standardized_df),
            column_count=len(standardized_df.columns)
        )
        self.versions[version_id] = version
        
        logger.info(f"Added dataset {dataset_id} with {len(standardized_df)} rows, {len(standardized_df.columns)} columns")
        logger.info(f"Stored with keys: {dataset_id} and {version_id}")
        
        # Persist the new dataset
        self._save_persistent_data()
        
        return version_id
    
    def create_filtered_version(self, parent_id: str, filters: List[FilterConfig], 
                              name: str, description: str) -> str:
        """Create a new filtered version of a dataset"""
        logger.info(f"Creating filtered version for parent_id: {parent_id}")
        logger.info(f"Available versions: {list(self.versions.keys())}")
        logger.info(f"Available datasets: {list(self.datasets.keys())}")
        
        if parent_id not in self.versions:
            raise ValueError(f"Parent version {parent_id} not found")
        
        parent_version = self.versions[parent_id]
        
        # Extract dataset_id from version_id (e.g., "dataset_0_original" -> "dataset_0")
        if parent_id.endswith('_original'):
            parent_dataset_id = parent_id[:-9]  # Remove "_original" suffix
        elif '_filtered_' in parent_id:
            parent_dataset_id = parent_id.split('_filtered_')[0]  # Get part before "_filtered_"
        else:
            # Fallback: assume it's a direct dataset_id
            parent_dataset_id = parent_id
        
        logger.info(f"Extracted parent_dataset_id: {parent_dataset_id}")
        
        if parent_dataset_id not in self.datasets:
            raise ValueError(f"Parent dataset {parent_dataset_id} not found")
        
        # Get the parent dataframe
        parent_df = self.datasets[parent_dataset_id]
        
        # Apply filters to create new version
        filtered_df = self.filter_engine.apply_filters(parent_df, filters)
        
        # Create new version ID
        version_id = f"{parent_dataset_id}_filtered_{uuid.uuid4().hex[:8]}"
        
        # Store the filtered dataframe
        self.datasets[version_id] = filtered_df
        
        # Create version record
        version = DatasetVersion(
            version_id=version_id,
            parent_id=parent_id,
            name=name,
            description=description,
            created_at=datetime.now(),
            filters_applied=filters,
            transformations_applied=[],
            row_count=len(filtered_df),
            column_count=len(filtered_df.columns)
        )
        self.versions[version_id] = version
        
        logger.info(f"Created filtered version {version_id} with {len(filtered_df)} rows")
        logger.info(f"New version stored in datasets: {version_id in self.datasets}")
        logger.info(f"New version stored in versions: {version_id in self.versions}")
        
        # Persist the new version
        self._save_persistent_data()
        
        return version_id
    
    def get_dataset(self, version_id: str) -> Optional[pd.DataFrame]:
        """Get dataset by version ID"""
        return self.datasets.get(version_id)
    
    def get_version_info(self, version_id: str) -> Optional[DatasetVersion]:
        """Get version information"""
        return self.versions.get(version_id)
    
    def list_versions(self, dataset_id: str) -> List[DatasetVersion]:
        """List all versions for a dataset"""
        return [v for v in self.versions.values() if v.version_id.startswith(dataset_id)]
    
    def get_column_info(self, version_id: str) -> Dict[str, Any]:
        """Get standardized column information for a version"""
        df = self.get_dataset(version_id)
        if df is None:
            return {}
        
        column_info = {}
        for col in df.columns:
            column_type = self.data_type_converter.detect_column_type(df[col])
            column_info[col] = {
                "type": column_type.value,
                "dtype": str(df[col].dtype),
                "unique_count": int(df[col].nunique()),
                "null_count": int(df[col].isna().sum()),
                "sample_values": df[col].dropna().head(5).tolist()
            }
        
        return column_info
    
    def get_unique_values(self, version_id: str, column: str, limit: int = 100) -> List[Any]:
        """Get unique values for a column in a version"""
        df = self.get_dataset(version_id)
        if df is None or column not in df.columns:
            return []
        
        unique_values = df[column].dropna().unique()
        return unique_values[:limit].tolist()
    
    def delete_version(self, version_id: str) -> bool:
        """Delete a version and its data"""
        if version_id in self.datasets:
            del self.datasets[version_id]
        if version_id in self.versions:
            del self.versions[version_id]
            logger.info(f"Deleted version {version_id}")
            self._save_persistent_data()
            return True
        return False
    
    def clear_cache(self) -> dict:
        """Clear all temporary versions and cached data, keeping only original datasets"""
        logger.info("Clearing cache and temporary versions...")
        
        # Count what we're about to delete
        original_versions = [v for v in self.versions.values() if v.version_id.endswith('_original')]
        filtered_versions = [v for v in self.versions.values() if not v.version_id.endswith('_original')]
        
        # Keep only original datasets and versions
        # Extract dataset_id from version_id (e.g., "dataset_0_original" -> "dataset_0")
        original_dataset_ids = []
        for v in original_versions:
            if v.version_id.endswith('_original'):
                dataset_id = v.version_id[:-9]  # Remove "_original" suffix
                original_dataset_ids.append(dataset_id)
        
        # Clear filtered versions
        versions_to_delete = [v.version_id for v in filtered_versions]
        for version_id in versions_to_delete:
            if version_id in self.versions:
                del self.versions[version_id]
            if version_id in self.datasets:
                del self.datasets[version_id]
        
        # Clear any datasets that don't have original versions
        datasets_to_delete = []
        for dataset_id in list(self.datasets.keys()):
            if not dataset_id.endswith('_original') and dataset_id not in original_dataset_ids:
                datasets_to_delete.append(dataset_id)
        
        for dataset_id in datasets_to_delete:
            if dataset_id in self.datasets:
                del self.datasets[dataset_id]
        
        # Save the cleaned state
        self._save_persistent_data()
        
        result = {
            "deleted_filtered_versions": len(versions_to_delete),
            "deleted_datasets": len(datasets_to_delete),
            "remaining_original_datasets": len(original_versions),
            "deleted_version_ids": versions_to_delete,
            "deleted_dataset_ids": datasets_to_delete
        }
        
        logger.info(f"Cache cleared: {result}")
        return result
    
    def _save_persistent_data(self):
        """Save datasets and versions to disk"""
        try:
            # Save versions metadata
            versions_file = os.path.join(self.data_dir, "versions.json")
            versions_data = {}
            for version_id, version in self.versions.items():
                versions_data[version_id] = version.to_dict()
            
            with open(versions_file, 'w') as f:
                json.dump(versions_data, f, indent=2)
            
            # Save datasets (only save original datasets, not filtered ones to save space)
            for dataset_id, df in self.datasets.items():
                if not dataset_id.endswith('_original'):
                    continue
                    
                dataset_file = os.path.join(self.data_dir, f"{dataset_id}.parquet")
                df.to_parquet(dataset_file, index=False)
            
            logger.info(f"Saved persistent data to {self.data_dir}")
        except Exception as e:
            logger.error(f"Failed to save persistent data: {e}")
    
    def _load_persistent_data(self):
        """Load datasets and versions from disk"""
        try:
            # Load versions metadata
            versions_file = os.path.join(self.data_dir, "versions.json")
            if os.path.exists(versions_file):
                with open(versions_file, 'r') as f:
                    versions_data = json.load(f)
                
                for version_id, version_dict in versions_data.items():
                    # Convert datetime string back to datetime object
                    version_dict['created_at'] = datetime.fromisoformat(version_dict['created_at'])
                    # Convert filter configs back to FilterConfig objects
                    filters = [FilterConfig.from_dict(f) for f in version_dict['filters_applied']]
                    version_dict['filters_applied'] = filters
                    
                    version = DatasetVersion(**version_dict)
                    self.versions[version_id] = version
                
                logger.info(f"Loaded {len(self.versions)} versions from disk")
            
            # Load original datasets
            for version_id in self.versions.keys():
                if version_id.endswith('_original'):
                    dataset_id = version_id[:-9]  # Remove "_original" suffix
                    # Try both naming conventions
                    dataset_file = os.path.join(self.data_dir, f"{dataset_id}.parquet")
                    version_file = os.path.join(self.data_dir, f"{version_id}.parquet")
                    
                    if os.path.exists(version_file):
                        df = pd.read_parquet(version_file)
                        self.datasets[dataset_id] = df
                        self.datasets[version_id] = df  # Also store with version_id
                        logger.info(f"Loaded dataset {dataset_id} with {len(df)} rows")
                    elif os.path.exists(dataset_file):
                        df = pd.read_parquet(dataset_file)
                        self.datasets[dataset_id] = df
                        self.datasets[version_id] = df  # Also store with version_id
                        logger.info(f"Loaded dataset {dataset_id} with {len(df)} rows")
            
            logger.info(f"Loaded persistent data from {self.data_dir}")
            
            # Recreate filtered versions
            self._recreate_filtered_versions()
        except Exception as e:
            logger.error(f"Failed to load persistent data: {e}")
    
    def _recreate_filtered_versions(self):
        """Recreate filtered versions from original datasets and version metadata"""
        try:
            for version_id, version in self.versions.items():
                if not version_id.endswith('_original') and version.parent_id:
                    # This is a filtered version, recreate it
                    parent_dataset_id = version.parent_id[:-9] if version.parent_id.endswith('_original') else version.parent_id
                    
                    if parent_dataset_id in self.datasets:
                        parent_df = self.datasets[parent_dataset_id]
                        filtered_df = self.filter_engine.apply_filters(parent_df, version.filters_applied)
                        self.datasets[version_id] = filtered_df
                        logger.info(f"Recreated filtered version {version_id} with {len(filtered_df)} rows")
        except Exception as e:
            logger.error(f"Failed to recreate filtered versions: {e}")

# Global instance
data_manager = DatasetManager()
