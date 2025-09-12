from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import io
import json
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
from pathlib import Path
import tempfile
import os

# Import from shared module to avoid circular imports
from shared import datasets, dataset_counter, DataInfo

# Import routers
from data_operations import router as data_router
from visualization import router as visualization_router
from analytics import router as analytics_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="DataViz Platform API",
    description="Professional data visualization and analysis platform",
    version="1.0.0"
)

# CORS middleware for local network access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def smart_parse_file(file_content: bytes, filename: str, separator: Optional[str] = None) -> pd.DataFrame:
    """Smart file parsing with automatic format detection"""
    try:
        file_ext = Path(filename).suffix.lower()
        
        if file_ext in ['.xlsx', '.xls']:
            # Excel file
            df = pd.read_excel(io.BytesIO(file_content), engine='openpyxl')
        elif file_ext == '.csv':
            # CSV file with smart separator detection
            if separator:
                df = pd.read_csv(io.BytesIO(file_content), sep=separator)
            else:
                # Try common separators
                for sep in [',', ';', '\t', '|']:
                    try:
                        df = pd.read_csv(io.BytesIO(file_content), sep=sep)
                        if len(df.columns) > 1:  # Valid separator found
                            break
                    except:
                        continue
                else:
                    # Fallback to comma
                    df = pd.read_csv(io.BytesIO(file_content))
        elif file_ext == '.txt':
            # Text file - try to detect separator
            content = file_content.decode('utf-8')
            lines = content.split('\n')[:5]  # Check first 5 lines
            
            # Detect separator
            if separator:
                sep = separator
            else:
                # Count common separators
                sep_counts = {',' : 0, ';': 0, '\t': 0, '|': 0}
                for line in lines:
                    for sep in sep_counts:
                        sep_counts[sep] += line.count(sep)
                
                # Use most common separator
                sep = max(sep_counts, key=sep_counts.get)
            
            df = pd.read_csv(io.BytesIO(file_content), sep=sep)
        else:
            raise ValueError(f"Unsupported file format: {file_ext}")
        
        # Clean up the dataframe
        df = df.dropna(how='all')  # Remove completely empty rows
        df = df.dropna(axis=1, how='all')  # Remove completely empty columns
        
        # Reset index
        df = df.reset_index(drop=True)
        
        return df
    
    except Exception as e:
        logger.error(f"Error parsing file {filename}: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    separator: Optional[str] = None
):
    """Upload and parse data file with smart format detection"""
    global dataset_counter
    
    try:
        # Read file content
        content = await file.read()
        
        # Check file size (20MB limit)
        if len(content) > 20 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 20MB limit")
        
        # Parse file
        df = smart_parse_file(content, file.filename, separator)
        
        # Create dataset info
        dataset_id = f"dataset_{dataset_counter}"
        dataset_counter += 1
        
        # Store in both old system (for backward compatibility) and new system
        datasets[dataset_id] = DataInfo(df, file.filename, datetime.now())
        
        # Also add to centralized data manager
        from data_manager import data_manager
        version_id = data_manager.add_dataset(dataset_id, df, file.filename)
        
        return {
            "dataset_id": dataset_id,
            "filename": file.filename,
            "rows": len(df),
            "columns": len(df.columns),
            "column_names": list(df.columns),
            "data_types": datasets[dataset_id].data_types,
            "summary_stats": datasets[dataset_id].summary_stats,
            "upload_time": datasets[dataset_id].upload_time.isoformat()
        }
    
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/datasets")
async def list_datasets():
    """List all uploaded datasets"""
    dataset_list = []
    for dataset_id, data_info in datasets.items():
        dataset_list.append({
            "dataset_id": dataset_id,
            "filename": data_info.filename,
            "rows": len(data_info.df),
            "columns": len(data_info.df.columns),
            "upload_time": data_info.upload_time.isoformat()
        })
    
    return {"datasets": dataset_list}

@app.get("/dataset/{dataset_id}")
async def get_dataset_info(dataset_id: str):
    """Get detailed information about a specific dataset"""
    from data_manager import data_manager
    
    # Get the original version of the dataset
    original_version_id = f"{dataset_id}_original"
    if original_version_id not in data_manager.versions:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    version_info = data_manager.versions[original_version_id]
    dataset_data = data_manager.datasets[original_version_id]
    
    logger.info(f"Dataset info requested for {dataset_id}: {version_info.row_count} rows")
    
    # Get column information with proper data types
    column_info = {}
    for col in dataset_data.columns:
        col_series = dataset_data[col]
        detected_type = data_manager.data_type_converter.detect_column_type(col_series)
        column_info[col] = {
            "type": detected_type.value,
            "dtype": str(col_series.dtype),
            "unique_count": int(col_series.nunique()),
            "null_count": int(col_series.isnull().sum())
        }
    
    return {
        "dataset_id": dataset_id,
        "filename": version_info.name,
        "rows": int(version_info.row_count),
        "columns": int(version_info.column_count),
        "column_names": list(dataset_data.columns),
        "column_info": column_info,
        "data_types": {col: info["type"] for col, info in column_info.items()},
        "upload_time": version_info.created_at.isoformat()
    }

@app.get("/dataset/{dataset_id}/preview")
async def get_dataset_preview(dataset_id: str, rows: int = 10):
    """Get preview of dataset data"""
    from data_manager import data_manager
    
    # Get the original version of the dataset
    original_version_id = f"{dataset_id}_original"
    if original_version_id not in data_manager.versions:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    dataset_data = data_manager.datasets[original_version_id]
    preview_df = dataset_data.head(rows)
    
    # Convert to JSON-serializable format
    preview_data = []
    for _, row in preview_df.iterrows():
        row_dict = {}
        for col in preview_df.columns:
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
        "dataset_id": dataset_id,
        "preview_data": preview_data,
        "total_rows": int(len(dataset_data))
    }

@app.post("/dataset/{dataset_id}/update-types")
async def update_data_types(dataset_id: str, type_mapping: Dict[str, str]):
    """Update data types for specific columns"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    data_info = datasets[dataset_id]
    
    try:
        for col, new_type in type_mapping.items():
            if col not in data_info.df.columns:
                continue
            
            if new_type == 'datetime64[ns]':
                data_info.df[col] = pd.to_datetime(data_info.df[col], errors='coerce')
            elif new_type in ['int64', 'float64']:
                data_info.df[col] = pd.to_numeric(data_info.df[col], errors='coerce')
            # For object type, no conversion needed
        
        # Update data info
        data_info.data_types = data_info._infer_data_types()
        data_info.summary_stats = data_info._generate_summary_stats()
        
        return {"message": "Data types updated successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error updating data types: {str(e)}")

@app.delete("/dataset/{dataset_id}")
async def delete_dataset(dataset_id: str):
    """Delete a dataset"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    del datasets[dataset_id]
    return {"message": "Dataset deleted successfully"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Include routers
app.include_router(data_router)
app.include_router(visualization_router)
app.include_router(analytics_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 