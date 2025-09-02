import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Any

# Global storage for uploaded datasets (in production, use database)
datasets = {}
dataset_counter = 0

class DataInfo:
    def __init__(self, df: pd.DataFrame, filename: str, upload_time: datetime):
        self.df = df
        self.filename = filename
        self.upload_time = upload_time
        self.data_types = self._infer_data_types()
        self.summary_stats = self._generate_summary_stats()
    
    def _infer_data_types(self) -> Dict[str, str]:
        """Smart data type inference with user override capability"""
        type_mapping = {}
        for col in self.df.columns:
            # Handle empty columns
            if self.df[col].isna().all():
                type_mapping[col] = 'object'
                continue
            
            # Try to infer numeric types first
            try:
                pd.to_numeric(self.df[col], errors='raise')
                if self.df[col].dtype == 'int64':
                    type_mapping[col] = 'int64'
                else:
                    type_mapping[col] = 'float64'
            except (ValueError, TypeError):
                # Try to infer datetime with better format detection
                try:
                    # Check if column name suggests it's a date/time column
                    col_lower = col.lower()
                    date_indicators = ['date', 'time', 'timestamp', 'created', 'updated', 'modified']
                    is_likely_date = any(indicator in col_lower for indicator in date_indicators)
                    
                    if is_likely_date:
                        # Try common datetime formats first
                        sample_values = self.df[col].dropna().head(10)
                        if len(sample_values) > 0:
                            # Try to parse with common formats
                            try:
                                pd.to_datetime(sample_values, format='%Y-%m-%d', errors='raise')
                                type_mapping[col] = 'datetime64[ns]'
                                continue
                            except:
                                try:
                                    pd.to_datetime(sample_values, format='%d/%m/%Y', errors='raise')
                                    type_mapping[col] = 'datetime64[ns]'
                                    continue
                                except:
                                    try:
                                        pd.to_datetime(sample_values, format='%m/%d/%Y', errors='raise')
                                        type_mapping[col] = 'datetime64[ns]'
                                        continue
                                    except:
                                        pass
                    
                    # If no specific format worked, try generic parsing with warnings suppressed
                    import warnings
                    with warnings.catch_warnings():
                        warnings.simplefilter("ignore")
                        pd.to_datetime(self.df[col], errors='raise')
                        type_mapping[col] = 'datetime64[ns]'
                        
                except (ValueError, TypeError):
                    # Default to object (string)
                    type_mapping[col] = 'object'
        
        return type_mapping
    
    def _generate_summary_stats(self) -> Dict[str, Any]:
        """Generate comprehensive summary statistics"""
        stats = {}
        for col in self.df.columns:
            col_stats = {}
            
            if self.df[col].dtype in ['int64', 'float64']:
                col_stats['type'] = 'numeric'
                col_stats['min'] = float(self.df[col].min()) if not self.df[col].isna().all() else None
                col_stats['max'] = float(self.df[col].max()) if not self.df[col].isna().all() else None
                col_stats['mean'] = float(self.df[col].mean()) if not self.df[col].isna().all() else None
                col_stats['std'] = float(self.df[col].std()) if not self.df[col].isna().all() else None
                col_stats['null_count'] = int(self.df[col].isna().sum())
                col_stats['unique_count'] = int(self.df[col].nunique())
            
            elif self.df[col].dtype == 'datetime64[ns]':
                col_stats['type'] = 'datetime'
                col_stats['min'] = str(self.df[col].min()) if not self.df[col].isna().all() else None
                col_stats['max'] = str(self.df[col].max()) if not self.df[col].isna().all() else None
                col_stats['null_count'] = int(self.df[col].isna().sum())
                col_stats['unique_count'] = int(self.df[col].nunique())
            
            else:  # object type
                col_stats['type'] = 'categorical'
                col_stats['null_count'] = int(self.df[col].isna().sum())
                col_stats['unique_count'] = int(self.df[col].nunique())
                if not self.df[col].isna().all():
                    col_stats['top_values'] = self.df[col].value_counts().head(5).to_dict()
            
            stats[col] = col_stats
        
        return stats
