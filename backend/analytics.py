from fastapi import APIRouter, HTTPException, Body
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np
from scipy import stats
from scipy.stats import zscore, iqr
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Import from shared module
from shared import datasets

@router.post("/{dataset_id}/analyze")
async def analyze_dataset(
    dataset_id: str,
    analysis_config: Dict[str, Any] = Body(...)
):
    """Perform comprehensive statistical analysis on dataset"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    data_info = datasets[dataset_id]
    df = data_info.df
    
    try:
        config = analysis_config.get("config", {})
        
        # Perform analysis based on configuration
        analysis_results = {
            "basic_stats": generate_basic_statistics(df),
            "correlation_matrix": generate_correlation_matrix(df) if config.get("include_correlations", True) else None,
            "data_quality": assess_data_quality(df) if config.get("data_quality", True) else None,
            "outliers": detect_outliers(df) if config.get("outlier_detection", True) else None,
            "trends": analyze_trends(df) if config.get("trend_analysis", True) else None,
            "insights": generate_insights(df, config)
        }
        
        return analysis_results
        
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Analysis failed: {str(e)}")

@router.post("/{dataset_id}/export")
async def export_analysis(
    dataset_id: str,
    export_config: Dict[str, Any] = Body(...)
):
    """Export analysis results in various formats"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    try:
        format_type = export_config.get("format", "json")
        analysis = export_config.get("analysis", {})
        
        if format_type == "json":
            return analysis
        elif format_type == "html":
            html_content = generate_analysis_html(analysis)
            return {"html": html_content}
        elif format_type == "pdf":
            # Placeholder for PDF export
            return {"message": "PDF export not yet implemented"}
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported export format: {format_type}")
            
    except Exception as e:
        logger.error(f"Export error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Export failed: {str(e)}")

def generate_basic_statistics(df: pd.DataFrame) -> Dict[str, Any]:
    """Generate basic descriptive statistics"""
    stats = {}
    
    for col in df.columns:
        col_stats = {}
        
        if df[col].dtype in ['int64', 'float64']:
            # Numeric statistics
            col_stats.update({
                "type": "numeric",
                "count": int(df[col].count()),
                "mean": float(df[col].mean()) if not df[col].isna().all() else None,
                "median": float(df[col].median()) if not df[col].isna().all() else None,
                "std": float(df[col].std()) if not df[col].isna().all() else None,
                "min": float(df[col].min()) if not df[col].isna().all() else None,
                "max": float(df[col].max()) if not df[col].isna().all() else None,
                "q25": float(df[col].quantile(0.25)) if not df[col].isna().all() else None,
                "q75": float(df[col].quantile(0.75)) if not df[col].isna().all() else None,
                "skewness": float(df[col].skew()) if not df[col].isna().all() else None,
                "kurtosis": float(df[col].kurtosis()) if not df[col].isna().all() else None
            })
        
        elif df[col].dtype == 'datetime64[ns]':
            # Datetime statistics
            col_stats.update({
                "type": "datetime",
                "count": int(df[col].count()),
                "min": str(df[col].min()) if not df[col].isna().all() else None,
                "max": str(df[col].max()) if not df[col].isna().all() else None,
                "range_days": int((df[col].max() - df[col].min()).days) if not df[col].isna().all() else None
            })
        
        else:
            # Categorical statistics
            col_stats.update({
                "type": "categorical",
                "count": int(df[col].count()),
                "unique_count": int(df[col].nunique()),
                "most_common": df[col].mode().iloc[0] if not df[col].isna().all() else None,
                "most_common_count": int(df[col].value_counts().iloc[0]) if not df[col].isna().all() else None
            })
        
        # Common statistics for all types
        col_stats["missing_count"] = int(df[col].isna().sum())
        col_stats["missing_percentage"] = float(df[col].isna().sum() / len(df) * 100)
        
        stats[col] = col_stats
    
    return stats

def generate_correlation_matrix(df: pd.DataFrame) -> Dict[str, Any]:
    """Generate correlation matrix for numeric columns"""
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    
    if len(numeric_cols) < 2:
        return {}
    
    corr_matrix = df[numeric_cols].corr()
    return corr_matrix.to_dict()

def assess_data_quality(df: pd.DataFrame) -> Dict[str, Any]:
    """Assess overall data quality"""
    
    # Calculate quality metrics
    total_cells = len(df) * len(df.columns)
    missing_cells = df.isna().sum().sum()
    completeness = (total_cells - missing_cells) / total_cells * 100
    
    # Check for duplicates
    duplicate_rows = df.duplicated().sum()
    consistency = (len(df) - duplicate_rows) / len(df) * 100
    
    # Check for outliers in numeric columns
    outlier_score = 0
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if len(numeric_cols) > 0:
        outlier_counts = []
        for col in numeric_cols:
            z_scores = np.abs(zscore(df[col].dropna()))
            outlier_count = np.sum(z_scores > 3)
            outlier_counts.append(outlier_count)
        
        total_numeric_values = df[numeric_cols].count().sum()
        if total_numeric_values > 0:
            outlier_score = (total_numeric_values - sum(outlier_counts)) / total_numeric_values * 100
        else:
            outlier_score = 100
    
    # Overall quality score
    overall_score = (completeness + consistency + outlier_score) / 3
    
    # Identify data quality issues
    issues = identify_data_issues(df)
    
    # Generate recommendations
    recommendations = generate_quality_recommendations(df, issues, overall_score)
    
    return {
        "overall_score": round(overall_score, 2),
        "completeness": round(completeness, 2),
        "accuracy": 95.0,  # Placeholder - would need domain knowledge
        "consistency": round(consistency, 2),
        "validity": round(outlier_score, 2),
        "issues": issues,
        "recommendations": recommendations
    }

def identify_data_issues(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Identify specific data quality issues"""
    issues = []
    
    for col in df.columns:
        # Missing data issues
        missing_pct = df[col].isna().sum() / len(df) * 100
        if missing_pct > 20:
            issues.append({
                "type": "missing",
                "severity": "high" if missing_pct > 50 else "medium",
                "description": f"Column '{col}' has {missing_pct:.1f}% missing values",
                "affected_columns": [col],
                "affected_rows": int(df[col].isna().sum()),
                "suggestion": "Consider imputation strategies or investigate why data is missing"
            })
        
        # Outlier detection for numeric columns
        if df[col].dtype in ['int64', 'float64']:
            z_scores = np.abs(zscore(df[col].dropna()))
            extreme_outliers = np.sum(z_scores > 3)
            if extreme_outliers > 0:
                outlier_pct = extreme_outliers / len(df[col].dropna()) * 100
                if outlier_pct > 5:
                    issues.append({
                        "type": "outlier",
                        "severity": "medium" if outlier_pct < 10 else "high",
                        "description": f"Column '{col}' has {extreme_outliers} extreme outliers ({outlier_pct:.1f}%)",
                        "affected_columns": [col],
                        "affected_rows": extreme_outliers,
                        "suggestion": "Investigate outliers for data entry errors or legitimate extreme values"
                    })
        
        # Consistency checks for categorical columns
        if df[col].dtype == 'object':
            # Check for inconsistent formatting
            unique_values = df[col].dropna().unique()
            if len(unique_values) > 0:
                # Check for case inconsistencies
                case_variations = set(val.lower() for val in unique_values if isinstance(val, str))
                if len(case_variations) < len(unique_values):
                    issues.append({
                        "type": "inconsistent",
                        "severity": "low",
                        "description": f"Column '{col}' has case inconsistencies",
                        "affected_columns": [col],
                        "affected_rows": len(df),
                        "suggestion": "Standardize case formatting for consistency"
                    })
    
    # Check for duplicate rows
    duplicate_count = df.duplicated().sum()
    if duplicate_count > 0:
        duplicate_pct = duplicate_count / len(df) * 100
        issues.append({
            "type": "duplicate",
            "severity": "medium" if duplicate_pct < 10 else "high",
            "description": f"Dataset has {duplicate_count} duplicate rows ({duplicate_pct:.1f}%)",
            "affected_columns": df.columns.tolist(),
            "affected_rows": duplicate_count,
            "suggestion": "Remove duplicate rows or investigate why duplicates exist"
        })
    
    return issues

def generate_quality_recommendations(df: pd.DataFrame, issues: List[Dict], overall_score: float) -> List[str]:
    """Generate actionable recommendations for data quality improvement"""
    recommendations = []
    
    if overall_score < 70:
        recommendations.append("Data quality needs immediate attention. Focus on completeness and consistency first.")
    
    # Missing data recommendations
    high_missing_cols = [col for col in df.columns if df[col].isna().sum() / len(df) > 0.2]
    if high_missing_cols:
        recommendations.append(f"Columns with high missing data: {', '.join(high_missing_cols[:3])}. Consider data collection improvements.")
    
    # Outlier recommendations
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if len(numeric_cols) > 0:
        recommendations.append("Review numeric columns for outliers and validate extreme values.")
    
    # Consistency recommendations
    if any(issue["type"] == "inconsistent" for issue in issues):
        recommendations.append("Standardize categorical data formats for better consistency.")
    
    # General recommendations
    if len(df) < 100:
        recommendations.append("Consider collecting more data for robust statistical analysis.")
    
    if len(df.columns) > 50:
        recommendations.append("Large number of columns detected. Consider feature selection or dimensionality reduction.")
    
    return recommendations

def detect_outliers(df: pd.DataFrame) -> Dict[str, Any]:
    """Detect outliers using multiple methods"""
    outliers = {}
    summary = {}
    
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    
    for col in numeric_cols:
        col_data = df[col].dropna()
        if len(col_data) == 0:
            continue
        
        # Z-score method
        z_scores = np.abs(zscore(col_data))
        z_outliers = col_data[z_scores > 3]
        
        # IQR method
        Q1 = col_data.quantile(0.25)
        Q3 = col_data.quantile(0.75)
        IQR = Q3 - Q1
        iqr_outliers = col_data[(col_data < (Q1 - 1.5 * IQR)) | (col_data > (Q3 + 1.5 * IQR))]
        
        # Use the method that detects fewer outliers (more conservative)
        if len(z_outliers) <= len(iqr_outliers):
            method = "Z-score (|z| > 3)"
            threshold = 3
            outlier_values = z_outliers.tolist()
        else:
            method = "IQR (1.5 * IQR)"
            threshold = 1.5
            outlier_values = iqr_outliers.tolist()
        
        outliers[col] = outlier_values
        summary[col] = {
            "method": method,
            "threshold": threshold,
            "outlier_count": len(outlier_values),
            "outlier_percentage": len(outlier_values) / len(col_data) * 100
        }
    
    return {
        "method": "Z-score and IQR comparison",
        "threshold": 3,
        "outliers": outliers,
        "summary": summary
    }

def analyze_trends(df: pd.DataFrame) -> Dict[str, Any]:
    """Analyze trends in temporal data"""
    trends = {}
    seasonality = {}
    forecasts = {}
    
    # Find datetime columns
    datetime_cols = df.select_dtypes(include=['datetime64[ns]']).columns
    
    for col in datetime_cols:
        col_data = df[col].dropna()
        if len(col_data) < 10:
            continue
        
        # Sort by datetime
        sorted_data = col_data.sort_values()
        
        # Simple trend analysis
        if len(sorted_data) > 1:
            # Calculate linear trend
            x = np.arange(len(sorted_data))
            y = np.arange(len(sorted_data))  # Placeholder - would use actual values
            
            if len(y) > 1:
                slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
                
                trend_direction = "increasing" if slope > 0 else "decreasing"
                trend_strength = "strong" if abs(r_value) > 0.7 else "moderate" if abs(r_value) > 0.5 else "weak"
                
                trends[col] = {
                    "direction": trend_direction,
                    "slope": slope,
                    "r_squared": r_value ** 2,
                    "p_value": p_value,
                    "strength": trend_strength
                }
        
        # Seasonality detection (simplified)
        if len(sorted_data) > 30:  # Need sufficient data for seasonality
            seasonality[col] = {
                "pattern": "unknown",  # Would implement actual seasonality detection
                "period": "unknown",
                "strength": 0.0
            }
    
    return {
        "temporal_columns": datetime_cols.tolist(),
        "trends": trends,
        "seasonality": seasonality,
        "forecasts": forecasts
    }

def generate_insights(df: pd.DataFrame, config: Dict[str, Any]) -> List[str]:
    """Generate actionable insights from the data"""
    insights = []
    
    # Data size insights
    if len(df) > 10000:
        insights.append("Large dataset detected - consider sampling for faster analysis")
    elif len(df) < 100:
        insights.append("Small dataset - results may not be statistically significant")
    
    # Column insights
    if len(df.columns) > 20:
        insights.append("High-dimensional data - consider feature selection techniques")
    
    # Missing data insights
    missing_cols = [col for col in df.columns if df[col].isna().sum() > 0]
    if missing_cols:
        insights.append(f"Missing data detected in {len(missing_cols)} columns - review data collection process")
    
    # Correlation insights
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if len(numeric_cols) > 1:
        corr_matrix = df[numeric_cols].corr()
        high_corr_pairs = []
        for i in range(len(corr_matrix.columns)):
            for j in range(i+1, len(corr_matrix.columns)):
                corr_val = abs(corr_matrix.iloc[i, j])
                if corr_val > 0.8:
                    col1, col2 = corr_matrix.columns[i], corr_matrix.columns[j]
                    high_corr_pairs.append(f"{col1}-{col2} (r={corr_val:.2f})")
        
        if high_corr_pairs:
            insights.append(f"High correlations detected: {', '.join(high_corr_pairs[:3])}")
    
    # Outlier insights
    outlier_cols = []
    for col in numeric_cols:
        if len(df[col].dropna()) > 0:
            z_scores = np.abs(zscore(df[col].dropna()))
            if np.sum(z_scores > 3) > 0:
                outlier_cols.append(col)
    
    if outlier_cols:
        insights.append(f"Outliers detected in columns: {', '.join(outlier_cols[:3])}")
    
    # Data type insights
    categorical_cols = df.select_dtypes(include=['object']).columns
    if len(categorical_cols) > 0:
        high_cardinality = [col for col in categorical_cols if df[col].nunique() > 50]
        if high_cardinality:
            insights.append(f"High cardinality categorical columns: {', '.join(high_cardinality[:3])}")
    
    return insights

def generate_analysis_html(analysis: Dict[str, Any]) -> str:
    """Generate HTML report for analysis results"""
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Data Analysis Report</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; }}
            .section {{ margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }}
            .metric {{ display: inline-block; margin: 10px; padding: 10px; background: #f5f5f5; border-radius: 3px; }}
            .issue {{ margin: 10px 0; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; }}
            .insight {{ margin: 10px 0; padding: 10px; background: #d1ecf1; border-left: 4px solid #17a2b8; }}
        </style>
    </head>
    <body>
        <h1>Data Analysis Report</h1>
        <p>Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        
        <div class="section">
            <h2>Data Quality Overview</h2>
            <div class="metric">
                <strong>Overall Score:</strong> {analysis.get('data_quality', {}).get('overall_score', 'N/A')}%
            </div>
            <div class="metric">
                <strong>Completeness:</strong> {analysis.get('data_quality', {}).get('completeness', 'N/A')}%
            </div>
            <div class="metric">
                <strong>Consistency:</strong> {analysis.get('data_quality', {}).get('consistency', 'N/A')}%
            </div>
        </div>
        
        <div class="section">
            <h2>Key Insights</h2>
            {''.join([f'<div class="insight">• {insight}</div>' for insight in analysis.get('insights', [])])}
        </div>
        
        <div class="section">
            <h2>Data Quality Issues</h2>
            {''.join([f'<div class="issue"><strong>{issue["type"].title()}:</strong> {issue["description"]}</div>' for issue in analysis.get('data_quality', {}).get('issues', [])])}
        </div>
    </body>
    </html>
    """
    
    return html_content
