from fastapi import APIRouter, HTTPException, Body, Response, Query
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd
import numpy as np
try:
    import matplotlib.pyplot as plt
except ImportError:
    plt = None
try:
    import seaborn as sns
    sns.set_palette("husl")
except ImportError:
    sns = None
import plotly.express as px
import plotly.graph_objects as go
import plotly.utils
import json
import io
import base64
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/visualize", tags=["visualization"])

# Import from shared module
from shared import datasets

def apply_data_transformation(series: pd.Series, transform_type: str, bins: int = 10) -> pd.Series:
    """Apply data transformation based on the specified type"""
    if transform_type == 'numeric_to_categorical':
        # Convert numeric to categorical by binning
        if pd.api.types.is_numeric_dtype(series):
            return pd.cut(series, bins=bins, duplicates='drop')
        return series
    elif transform_type == 'categorical_to_numeric':
        # Convert categorical to numeric (label encoding)
        if pd.api.types.is_categorical_dtype(series) or series.dtype == 'object':
            return pd.Categorical(series).codes
        return series
    elif transform_type == 'datetime_to_numeric':
        # Convert datetime to numeric (timestamp)
        if pd.api.types.is_datetime64_any_dtype(series):
            return series.astype('int64') // 10**9  # Convert to seconds
        return series
    elif transform_type == 'datetime_to_categorical':
        # Convert datetime to categorical (extract time periods)
        if pd.api.types.is_datetime64_any_dtype(series):
            return series.dt.strftime('%Y-%m')
        return series
    else:
        return series

# Set matplotlib style for professional plots
try:
    plt.style.use('seaborn-v0_8')
except:
    try:
        plt.style.use('seaborn')
    except:
        plt.style.use('default')

@router.post("/{dataset_id}/generate")
async def generate_chart(
    dataset_id: str,
    chart_config: Dict[str, Any] = Body(...)
):
    """Generate chart based on configuration"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    data_info = datasets[dataset_id]
    df = data_info.df
    
    try:
        # Log the incoming request for debugging
        logger.info(f"Generating chart for dataset {dataset_id}: {chart_config}")
        
        chart_type = chart_config.get("type", "bar")
        x_axis = chart_config.get("xAxis")
        y_axis = chart_config.get("yAxis")
        customizations = chart_config.get("customizations", {})
        
        if not x_axis or not y_axis:
            raise HTTPException(status_code=400, detail="X and Y axes must be specified")
        
        if x_axis not in df.columns or y_axis not in df.columns:
            available_columns = list(df.columns)
            raise HTTPException(
                status_code=400, 
                detail=f"Specified columns not found in dataset. Available columns: {available_columns}"
            )
        
        # Generate chart data based on type
        chart_data = generate_chart_data(df, chart_type, x_axis, y_axis, chart_config)
        
        # Create plotly figure
        fig = create_plotly_chart(chart_data, chart_type, chart_config)
        
        # Apply customizations
        apply_chart_customizations(fig, customizations)
        
        # Convert to JSON for frontend
        plot_json = json.loads(fig.to_json())
        
        logger.info(f"Chart generated successfully: {chart_type} chart with {len(chart_data.get('x', []))} data points")
        
        return {
            "chart_id": chart_config.get("id"),
            "plot_data": plot_json,
            "chart_type": chart_type,
            "generated_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Chart generation error: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chart generation failed: {str(e)}")

@router.post("/{dataset_id}/test")
async def test_chart_generation(dataset_id: str):
    """Generate a test chart to validate functionality"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    try:
        data_info = datasets[dataset_id]
        df = data_info.df
        
        # Find suitable columns for testing
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        
        if len(numeric_cols) < 2:
            raise HTTPException(status_code=400, detail="Need at least 2 numeric columns for test chart")
        
        # Create a simple test chart
        x_col = numeric_cols[0]
        y_col = numeric_cols[1]
        
        # Generate sample data (first 20 rows to avoid overwhelming)
        sample_df = df.head(20)
        
        # Create a simple scatter plot
        fig = go.Figure(data=[
            go.Scatter(
                x=sample_df[x_col].tolist(),
                y=sample_df[y_col].tolist(),
                mode='markers',
                name=f'Test Chart: {x_col} vs {y_col}'
            )
        ])
        
        fig.update_layout(
            title=f"Test Chart - {x_col} vs {y_col}",
            xaxis_title=x_col,
            yaxis_title=y_col,
            template="plotly_white"
        )
        
        plot_json = json.loads(fig.to_json())
        
        return {
            "chart_id": "test_chart",
            "plot_data": plot_json,
            "chart_type": "scatter",
            "generated_at": datetime.now().isoformat(),
            "test_info": {
                "x_column": x_col,
                "y_column": y_col,
                "data_points": len(sample_df),
                "message": "Test chart generated successfully"
            }
        }
        
    except Exception as e:
        logger.error(f"Test chart generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Test chart generation failed: {str(e)}")

@router.post("/{dataset_id}/export")
async def export_chart(
    dataset_id: str,
    export_config: Dict[str, Any] = Body(...)
):
    """Export chart in various formats"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    try:
        chart_id = export_config.get("chart_id")
        format_type = export_config.get("format", "png")
        config = export_config.get("config", {})
        
        # For now, return a placeholder. In a real implementation, you'd regenerate the chart
        # and export it in the requested format
        
        if format_type == "png":
            # Create a simple matplotlib figure for PNG export
            if plt is None:
                raise HTTPException(status_code=400, detail="Matplotlib not available for PNG export")
            fig, ax = plt.subplots(figsize=(8, 6))
            ax.text(0.5, 0.5, f"Chart: {config.get('title', 'Untitled')}", 
                   ha='center', va='center', transform=ax.transAxes, fontsize=16)
            ax.set_title("Chart Export")
            
            # Save to bytes buffer
            buf = io.BytesIO()
            fig.savefig(buf, format='png', dpi=300, bbox_inches='tight')
            buf.seek(0)
            plt.close(fig)
            
            return Response(content=buf.getvalue(), media_type="image/png")
            
        elif format_type == "svg":
            # SVG export
            if plt is None:
                raise HTTPException(status_code=400, detail="Matplotlib not available for SVG export")
            fig, ax = plt.subplots(figsize=(8, 6))
            ax.text(0.5, 0.5, f"Chart: {config.get('title', 'Untitled')}", 
                   ha='center', va='center', transform=ax.transAxes, fontsize=16)
            ax.set_title("Chart Export")
            
            buf = io.BytesIO()
            fig.savefig(buf, format='svg', bbox_inches='tight')
            buf.seek(0)
            plt.close(fig)
            
            return Response(content=buf.getvalue(), media_type="image/svg+xml")
            
        elif format_type == "pdf":
            # PDF export
            if plt is None:
                raise HTTPException(status_code=400, detail="Matplotlib not available for PDF export")
            fig, ax = plt.subplots(figsize=(8, 6))
            ax.text(0.5, 0.5, f"Chart: {config.get('title', 'Untitled')}", 
                   ha='center', va='center', transform=ax.transAxes, fontsize=16)
            ax.set_title("Chart Export")
            
            buf = io.BytesIO()
            fig.savefig(buf, format='pdf', bbox_inches='tight')
            buf.seek(0)
            plt.close(fig)
            
            return Response(content=buf.getvalue(), media_type="application/pdf")
            
        elif format_type == "html":
            # HTML export with embedded plotly
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>{config.get('title', 'Chart Export')}</title>
                <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
            </head>
            <body>
                <h1>{config.get('title', 'Chart Export')}</h1>
                <div id="chart"></div>
                <script>
                    // Placeholder for chart data
                    document.getElementById('chart').innerHTML = '<p>Chart export: {config.get("title", "Untitled")}</p>';
                </script>
            </body>
            </html>
            """
            return Response(content=html_content, media_type="text/html")
            
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported export format: {format_type}")
            
    except Exception as e:
        logger.error(f"Export error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Export failed: {str(e)}")

def generate_chart_data(df: pd.DataFrame, chart_type: str, x_axis: str, y_axis: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """Generate chart data based on type and configuration"""
    
    if chart_type == "bar":
        # Bar chart - aggregate data if needed
        if df[x_axis].dtype in ['object', 'category']:
            # Categorical x-axis, aggregate y-axis
            agg_data = df.groupby(x_axis)[y_axis].agg(['mean', 'count', 'sum']).reset_index()
            return {
                "x": agg_data[x_axis].tolist(),
                "y": agg_data['mean'].tolist(),
                "count": agg_data['count'].tolist(),
                "sum": agg_data['sum'].tolist()
            }
        else:
            # Numeric x-axis, use binned data
            bins = pd.cut(df[x_axis], bins=10)
            agg_data = df.groupby(bins)[y_axis].mean().reset_index()
            return {
                "x": [str(bin) for bin in agg_data[x_axis]],
                "y": agg_data[y_axis].tolist()
            }
    
    elif chart_type == "line":
        # Line chart - sort by x-axis
        sorted_df = df.sort_values(x_axis)
        return {
            "x": sorted_df[x_axis].tolist(),
            "y": sorted_df[y_axis].tolist()
        }
    
    elif chart_type == "scatter":
        # Scatter plot
        return {
            "x": df[x_axis].tolist(),
            "y": df[y_axis].tolist()
        }
    
    elif chart_type == "pie":
        # Pie chart - aggregate by x-axis
        agg_data = df.groupby(x_axis)[y_axis].sum().reset_index()
        return {
            "labels": agg_data[x_axis].tolist(),
            "values": agg_data[y_axis].tolist()
        }
    
    elif chart_type == "heatmap":
        # Heatmap - correlation matrix for numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) >= 2:
            corr_matrix = df[numeric_cols].corr()
            return {
                "x": corr_matrix.columns.tolist(),
                "y": corr_matrix.index.tolist(),
                "z": corr_matrix.values.tolist()
            }
        else:
            # Fallback to pivot table
            pivot_data = df.pivot_table(values=y_axis, index=x_axis, aggfunc='mean')
            return {
                "x": pivot_data.columns.tolist(),
                "y": pivot_data.index.tolist(),
                "z": pivot_data.values.tolist()
            }
    
    elif chart_type == "histogram":
        # Histogram
        return {
            "x": df[x_axis].tolist(),
            "nbinsx": 20
        }
    
    elif chart_type == "box":
        # Box plot
        return {
            "x": df[x_axis].tolist(),
            "y": df[y_axis].tolist()
        }
    
    else:
        # Default to scatter
        return {
            "x": df[x_axis].tolist(),
            "y": df[y_axis].tolist()
        }

def create_plotly_chart(chart_data: Dict[str, Any], chart_type: str, config: Dict[str, Any]) -> go.Figure:
    """Create plotly figure based on chart type and data"""
    
    if chart_type == "bar":
        fig = go.Figure(data=[
            go.Bar(
                x=chart_data["x"],
                y=chart_data["y"],
                name=config.get("title", "Bar Chart")
            )
        ])
    
    elif chart_type == "line":
        fig = go.Figure(data=[
            go.Scatter(
                x=chart_data["x"],
                y=chart_data["y"],
                mode='lines+markers',
                name=config.get("title", "Line Chart")
            )
        ])
    
    elif chart_type == "scatter":
        fig = go.Figure(data=[
            go.Scatter(
                x=chart_data["x"],
                y=chart_data["y"],
                mode='markers',
                name=config.get("title", "Scatter Plot")
            )
        ])
    
    elif chart_type == "pie":
        fig = go.Figure(data=[
            go.Pie(
                labels=chart_data["labels"],
                values=chart_data["values"],
                name=config.get("title", "Pie Chart")
            )
        ])
    
    elif chart_type == "heatmap":
        fig = go.Figure(data=[
            go.Heatmap(
                x=chart_data["x"],
                y=chart_data["y"],
                z=chart_data["z"],
                colorscale='Viridis'
            )
        ])
    
    elif chart_type == "histogram":
        fig = go.Figure(data=[
            go.Histogram(
                x=chart_data["x"],
                nbinsx=chart_data.get("nbinsx", 20),
                name=config.get("title", "Histogram")
            )
        ])
    
    elif chart_type == "box":
        fig = go.Figure(data=[
            go.Box(
                x=chart_data["x"],
                y=chart_data["y"],
                name=config.get("title", "Box Plot")
            )
        ])
    
    else:
        # Default to scatter
        fig = go.Figure(data=[
            go.Scatter(
                x=chart_data["x"],
                y=chart_data["y"],
                mode='markers',
                name=config.get("title", "Chart")
            )
        ])
    
    return fig

def apply_chart_customizations(fig: go.Figure, customizations: Dict[str, Any]):
    """Apply customization options to the chart"""
    
    # Update layout
    fig.update_layout(
        title=customizations.get("title", "Chart"),
        xaxis_title=customizations.get("xAxis", "X Axis"),
        yaxis_title=customizations.get("yAxis", "Y Axis"),
        font_size=customizations.get("fontSize", 12),
        showlegend=customizations.get("showLegend", True),
        width=customizations.get("width", 600),
        height=customizations.get("height", 400),
        template=customizations.get("theme", "plotly_white")
    )
    
    # Update traces for opacity
    opacity = customizations.get("opacity", 0.8)
    for trace in fig.data:
        if hasattr(trace, 'opacity'):
            trace.opacity = opacity
    
    # Show/hide grid
    if not customizations.get("showGrid", True):
        fig.update_xaxes(showgrid=False)
        fig.update_yaxes(showgrid=False)
    
    # Show/hide labels
    if not customizations.get("showLabels", False):
        fig.update_traces(textposition="none")


# ------------------ JSON-ONLY PLOT ENDPOINTS (front-end renders) ------------------

def _downsample_xy(x: List[Any], y: List[Any], sample: Optional[int]) -> Tuple[List[Any], List[Any]]:
    if sample is None or sample <= 0 or len(x) <= sample:
        return x, y
    # simple uniform sampling
    step = max(1, len(x) // sample)
    xs = x[::step][:sample]
    ys = y[::step][:sample]
    return xs, ys

def _downsample_columns(cols: List[List[Any]], sample: Optional[int]) -> List[List[Any]]:
    if not cols:
        return cols
    length = len(cols[0])
    if sample is None or sample <= 0 or length <= sample:
        return cols
    step = max(1, length // sample)
    indices = list(range(0, length, step))[:sample]
    return [[col[i] for i in indices] for col in cols]

def _nan_to_none(value: Any) -> Any:
    try:
        if value is None:
            return None
        if isinstance(value, float) and (np.isnan(value) or np.isinf(value)):
            return None
        return value
    except Exception:
        return value

def _sanitize_list(values: Optional[List[Any]]) -> Optional[List[Any]]:
    if values is None:
        return None
    return [ _nan_to_none(v) for v in values ]

def _basic_stats(values: List[float]) -> Dict[str, Any]:
    arr = np.array([v for v in values if v is not None and not (isinstance(v, float) and np.isnan(v))], dtype=float)
    if arr.size == 0:
        return {"mean": None, "std": None, "min": None, "max": None, "n": 0}
    return {
        "mean": float(np.mean(arr)),
        "std": float(np.std(arr, ddof=1)) if arr.size > 1 else 0.0,
        "min": float(np.min(arr)),
        "max": float(np.max(arr)),
        "n": int(arr.size),
    }

@router.get("/{dataset_id}/json_scatter")
async def json_scatter(
    dataset_id: str,
    x: str = Query(..., description="X column name"),
    y: str = Query(..., description="Y column name"),
    sample: Optional[int] = Query(None, description="Optional down-sample size"),
    group: Optional[str] = Query(None, description="Optional categorical column to group by for facets"),
    color: Optional[str] = Query(None, description="Optional column to use for marker color (numeric preferred)"),
    size: Optional[str] = Query(None, description="Optional column to use for marker size (numeric preferred)"),
    x_transform: Optional[str] = Query(None, description="Transform for x-axis: numeric_to_categorical, categorical_to_numeric, datetime_to_numeric, datetime_to_categorical"),
    y_transform: Optional[str] = Query(None, description="Transform for y-axis: numeric_to_categorical, categorical_to_numeric, datetime_to_numeric, datetime_to_categorical")
):
    """Return raw x/y arrays and basic stats for client-side rendering."""
    from data_manager import data_manager
    
    # Get the original version of the dataset
    original_version_id = f"{dataset_id}_original"
    if original_version_id not in data_manager.versions:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = data_manager.datasets[original_version_id]
    if x not in df.columns or y not in df.columns:
        raise HTTPException(status_code=400, detail=f"Columns not found. Available: {list(df.columns)}")

    warnings: List[str] = []
    
    # Apply data transformations if specified
    if x_transform:
        try:
            original_x = df[x].copy()
            df[x] = apply_data_transformation(df[x], x_transform)
            warnings.append(f"Applied {x_transform} transformation to X-axis column '{x}'")
        except Exception as e:
            logger.error(f"Failed to apply {x_transform} to X-axis '{x}': {str(e)}")
            warnings.append(f"Failed to apply {x_transform} to X-axis: {str(e)}")
            # Restore original data if transformation fails
            df[x] = original_x
    
    if y_transform:
        try:
            original_y = df[y].copy()
            df[y] = apply_data_transformation(df[y], y_transform)
            warnings.append(f"Applied {y_transform} transformation to Y-axis column '{y}'")
        except Exception as e:
            logger.error(f"Failed to apply {y_transform} to Y-axis '{y}': {str(e)}")
            warnings.append(f"Failed to apply {y_transform} to Y-axis: {str(e)}")
            # Restore original data if transformation fails
            df[y] = original_y

    def cast_numeric(series_name: Optional[str]) -> Optional[List[Optional[float]]]:
        if not series_name or series_name not in df.columns:
            return None
        s = pd.to_numeric(df[series_name], errors='coerce')
        nan_count = int(s.isna().sum())
        if nan_count > 0:
            warnings.append(f"Column '{series_name}' had {nan_count} non-numeric values; coerced to NaN")
        return s.tolist()

    if group and group in df.columns:
        groups_out = []
        for g, gdf in df.groupby(group):
            x_vals = gdf[x].tolist()
            try:
                y_numeric = pd.to_numeric(gdf[y], errors='coerce').tolist()
            except Exception:
                y_numeric = gdf[y].tolist()
            c_vals = cast_numeric(color) if color else None
            s_vals = cast_numeric(size) if size else None
            if c_vals is not None:
                c_vals = [c for idx, c in zip(gdf.index, c_vals) if idx in gdf.index]
            if s_vals is not None:
                s_vals = [s for idx, s in zip(gdf.index, s_vals) if idx in gdf.index]
            cols = [x_vals, y_numeric]
            if c_vals is not None:
                cols.append(c_vals)
            if s_vals is not None:
                cols.append(s_vals)
            ds_cols = _downsample_columns(cols, sample)
            x_s, y_s = ds_cols[0], ds_cols[1]
            c_s = ds_cols[2] if (c_vals is not None and len(ds_cols) > 2) else None
            s_s = ds_cols[3] if (s_vals is not None and len(ds_cols) > 3) else None
            groups_out.append({
                "name": str(g),
                "x": _sanitize_list(x_s),
                "y": _sanitize_list(y_s),
                "color": _sanitize_list(c_s),
                "size": _sanitize_list(s_s),
                "stats": _basic_stats([v for v in y_s if v is not None])
            })
        return {
            "groups": groups_out,
            "x_label": x,
            "y_label": y,
            "group_label": group,
            "warnings": warnings
        }
    else:
        x_vals = df[x].tolist()
        y_vals = df[y].tolist()
        try:
            y_numeric = pd.to_numeric(df[y], errors='coerce').tolist()
        except Exception:
            y_numeric = y_vals
        c_vals = cast_numeric(color) if color else None
        s_vals = cast_numeric(size) if size else None
        cols = [x_vals, y_numeric]
        if c_vals is not None:
            cols.append(c_vals)
        if s_vals is not None:
            cols.append(s_vals)
        ds_cols = _downsample_columns(cols, sample)
        x_vals, y_numeric = ds_cols[0], ds_cols[1]
        c_vals = ds_cols[2] if (len(ds_cols) > 2 and ('color' in locals() and color)) else c_vals
        s_vals = ds_cols[3] if (len(ds_cols) > 3 and ('size' in locals() and size)) else s_vals
        return {
            "x": _sanitize_list(x_vals),
            "y": _sanitize_list(y_numeric),
            "x_label": x,
            "y_label": y,
            "color": _sanitize_list(c_vals),
            "size": _sanitize_list(s_vals),
            "stats": _basic_stats([v for v in y_numeric if v is not None]),
            "warnings": warnings,
        }

@router.get("/{dataset_id}/json_series")
async def json_series(
    dataset_id: str,
    column: str = Query(..., description="Numeric column name"),
    sample: Optional[int] = Query(None)
):
    """Return index as x and column values as y for a simple series plot."""
    from data_manager import data_manager
    
    # Get the original version of the dataset
    original_version_id = f"{dataset_id}_original"
    if original_version_id not in data_manager.versions:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = data_manager.datasets[original_version_id]
    if column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column not found. Available: {list(df.columns)}")

    y_vals = pd.to_numeric(df[column], errors='coerce').tolist()
    x_vals = list(range(len(y_vals)))

    x_vals, y_vals = _downsample_xy(x_vals, y_vals, sample)

    return {
        "x": x_vals,
        "y": y_vals,
        "x_label": "index",
        "y_label": column,
        "stats": _basic_stats([v for v in y_vals if v is not None]),
    }

@router.get("/{dataset_id}/json_bar")
async def json_bar(
    dataset_id: str,
    category: str = Query(...),
    value: str = Query(...),
    agg: str = Query("mean", description="Aggregation: mean|sum|count"),
    bins: int = Query(10, description="Number of bins when category is numeric"),
    x_transform: Optional[str] = Query(None, description="Transform for x-axis: numeric_to_categorical, categorical_to_numeric, datetime_to_numeric, datetime_to_categorical"),
    y_transform: Optional[str] = Query(None, description="Transform for y-axis: numeric_to_categorical, categorical_to_numeric, datetime_to_numeric, datetime_to_categorical")
):
    from data_manager import data_manager
    
    # Get the original version of the dataset
    original_version_id = f"{dataset_id}_original"
    if original_version_id not in data_manager.versions:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = data_manager.datasets[original_version_id]
    if category not in df.columns or value not in df.columns:
        raise HTTPException(status_code=400, detail=f"Columns not found. Available: {list(df.columns)}")

    warnings: List[str] = []
    
    # Apply data transformations if specified
    if x_transform:
        try:
            original_category = df[category].copy()
            df[category] = apply_data_transformation(df[category], x_transform, bins)
            warnings.append(f"Applied {x_transform} transformation to category column '{category}'")
        except Exception as e:
            logger.error(f"Failed to apply {x_transform} to category '{category}': {str(e)}")
            warnings.append(f"Failed to apply {x_transform} to category: {str(e)}")
            df[category] = original_category
    
    if y_transform:
        try:
            original_value = df[value].copy()
            df[value] = apply_data_transformation(df[value], y_transform)
            warnings.append(f"Applied {y_transform} transformation to value column '{value}'")
        except Exception as e:
            logger.error(f"Failed to apply {y_transform} to value '{value}': {str(e)}")
            warnings.append(f"Failed to apply {y_transform} to value: {str(e)}")
            df[value] = original_value
    # If category is numeric, bin it
    cat_series = df[category]
    if pd.api.types.is_numeric_dtype(cat_series) or pd.api.types.is_datetime64_any_dtype(cat_series):
        try:
            if not pd.api.types.is_numeric_dtype(cat_series):
                # attempt to convert datetime to ordinal
                cat_numeric = pd.to_datetime(cat_series, errors='coerce').map(lambda d: d.toordinal() if pd.notna(d) else None)
            else:
                cat_numeric = pd.to_numeric(cat_series, errors='coerce')
            # bin numeric category
            binned = pd.cut(cat_numeric, bins=bins)
            grp = df.groupby(binned)[value]
            if agg == "mean":
                agg_df = grp.mean().reset_index()
            elif agg == "sum":
                agg_df = grp.sum().reset_index()
            elif agg == "count":
                agg_df = grp.count().reset_index()
            else:
                raise HTTPException(status_code=400, detail="Unsupported aggregation")
            x_out = [str(b) for b in agg_df[binned.name]]
            y_out = pd.to_numeric(agg_df[value], errors='coerce').tolist()
        except Exception as e:
            warnings.append(f"Failed to bin numeric category: {e}")
            grp = df.groupby(category)[value]
            agg_df = grp.mean().reset_index() if agg == 'mean' else grp.sum().reset_index() if agg == 'sum' else grp.count().reset_index()
            x_out = agg_df[category].astype(str).tolist()
            y_out = pd.to_numeric(agg_df[value], errors='coerce').tolist()
    else:
        grp = df.groupby(category)[value]
        agg_df = grp.mean().reset_index() if agg == 'mean' else grp.sum().reset_index() if agg == 'sum' else grp.count().reset_index()
        x_out = agg_df[category].astype(str).tolist()
        y_out = pd.to_numeric(agg_df[value], errors='coerce').tolist()

    return {
        "x": _sanitize_list(x_out),
        "y": _sanitize_list(y_out),
        "x_label": category,
        "y_label": f"{agg}({value})",
        "stats": _basic_stats([v for v in y_out if v is not None]),
        "warnings": warnings,
    }

@router.get("/{dataset_id}/json_histogram")
async def json_histogram(
    dataset_id: str,
    x: str = Query(..., description="Column name for histogram"),
    bins: int = Query(20, description="Number of bins"),
    x_transform: Optional[str] = Query(None, description="Transform for x-axis: numeric_to_categorical, categorical_to_numeric, datetime_to_numeric, datetime_to_categorical")
):
    """Get histogram data as JSON"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    data_info = datasets[dataset_id]
    df = data_info.df
    
    try:
        warnings: List[str] = []
        
        # Apply data transformations if specified
        if x_transform:
            try:
                df[x] = apply_data_transformation(df[x], x_transform, bins)
                warnings.append(f"Applied {x_transform} transformation to column '{x}'")
            except Exception as e:
                warnings.append(f"Failed to apply {x_transform}: {str(e)}")
        
        if not pd.api.types.is_numeric_dtype(df[x]):
            raise HTTPException(status_code=400, detail=f"Column '{x}' must be numeric for histogram")
        
        # Calculate histogram
        hist, bin_edges = np.histogram(df[x].dropna(), bins=bins)
        bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2
        
        return {
            "x": sanitize_json_output(bin_centers.tolist()),
            "y": sanitize_json_output(hist.tolist()),
            "x_label": x,
            "y_label": "Frequency",
            "stats": {
                "total_points": len(df[x].dropna()),
                "bins": bins,
                "x_range": [float(df[x].min()), float(df[x].max())]
            },
            "warnings": warnings
        }
        
    except Exception as e:
        logger.error(f"Error generating histogram: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating histogram: {str(e)}")

@router.get("/{dataset_id}/json_box")
async def json_box_plot(
    dataset_id: str,
    x: str = Query(..., description="Column name for categories"),
    y: str = Query(..., description="Column name for values"),
    x_transform: Optional[str] = Query(None, description="Transform for x-axis: numeric_to_categorical, categorical_to_numeric, datetime_to_numeric, datetime_to_categorical"),
    y_transform: Optional[str] = Query(None, description="Transform for y-axis: numeric_to_categorical, categorical_to_numeric, datetime_to_numeric, datetime_to_categorical")
):
    """Get box plot data as JSON"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    data_info = datasets[dataset_id]
    df = data_info.df
    
    try:
        warnings: List[str] = []
        
        # Apply data transformations if specified
        if x_transform:
            try:
                df[x] = apply_data_transformation(df[x], x_transform)
                warnings.append(f"Applied {x_transform} transformation to X-axis column '{x}'")
            except Exception as e:
                warnings.append(f"Failed to apply {x_transform} to X-axis: {str(e)}")
        
        if y_transform:
            try:
                df[y] = apply_data_transformation(df[y], y_transform)
                warnings.append(f"Applied {y_transform} transformation to Y-axis column '{y}'")
            except Exception as e:
                warnings.append(f"Failed to apply {y_transform} to Y-axis: {str(e)}")
        
        if not pd.api.types.is_numeric_dtype(df[y]):
            raise HTTPException(status_code=400, detail=f"Column '{y}' must be numeric for box plot")
        
        # Group data by x categories
        grouped_data = df.groupby(x)[y].apply(list).to_dict()
        
        # Calculate box plot statistics for each group
        box_data = []
        categories = []
        
        for category, values in grouped_data.items():
            if len(values) > 0:
                q1 = np.percentile(values, 25)
                q2 = np.percentile(values, 50)  # median
                q3 = np.percentile(values, 75)
                iqr = q3 - q1
                lower_fence = q1 - 1.5 * iqr
                upper_fence = q3 + 1.5 * iqr
                
                # Filter outliers
                outliers = [v for v in values if v < lower_fence or v > upper_fence]
                inliers = [v for v in values if lower_fence <= v <= upper_fence]
                
                box_data.append({
                    "category": str(category),
                    "q1": float(q1),
                    "median": float(q2),
                    "q3": float(q3),
                    "lower_fence": float(lower_fence),
                    "upper_fence": float(upper_fence),
                    "outliers": sanitize_json_output(outliers),
                    "inliers": sanitize_json_output(inliers)
                })
                categories.append(str(category))
        
        return {
            "box_data": box_data,
            "categories": categories,
            "x_label": x,
            "y_label": y,
            "stats": {
                "total_groups": len(categories),
                "y_range": [float(df[y].min()), float(df[y].max())]
            },
            "warnings": warnings
        }
        
    except Exception as e:
        logger.error(f"Error generating box plot: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating box plot: {str(e)}")

@router.get("/{dataset_id}/json_heatmap")
async def json_heatmap(
    dataset_id: str,
    x: str = Query(..., description="Column name for x-axis"),
    y: str = Query(..., description="Column name for y-axis"),
    z: str = Query(..., description="Column name for values"),
    x_transform: Optional[str] = Query(None, description="Transform for x-axis: numeric_to_categorical, categorical_to_numeric, datetime_to_numeric, datetime_to_categorical"),
    y_transform: Optional[str] = Query(None, description="Transform for y-axis: numeric_to_categorical, categorical_to_numeric, datetime_to_numeric, datetime_to_categorical")
):
    """Get heatmap data as JSON"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    data_info = datasets[dataset_id]
    df = data_info.df
    
    try:
        warnings: List[str] = []
        
        # Apply data transformations if specified
        if x_transform:
            try:
                df[x] = apply_data_transformation(df[x], x_transform)
                warnings.append(f"Applied {x_transform} transformation to X-axis column '{x}'")
            except Exception as e:
                warnings.append(f"Failed to apply {x_transform} to X-axis: {str(e)}")
        
        if y_transform:
            try:
                df[y] = apply_data_transformation(df[y], y_transform)
                warnings.append(f"Applied {y_transform} transformation to Y-axis column '{y}'")
            except Exception as e:
                warnings.append(f"Failed to apply {y_transform} to Y-axis: {str(e)}")
        
        if not pd.api.types.is_numeric_dtype(df[z]):
            raise HTTPException(status_code=400, detail=f"Column '{z}' must be numeric for heatmap")
        
        # Create pivot table
        pivot_table = df.pivot_table(values=z, index=y, columns=x, aggfunc='mean', fill_value=0)
        
        return {
            "x": sanitize_json_output(pivot_table.columns.tolist()),
            "y": sanitize_json_output(pivot_table.index.tolist()),
            "z": sanitize_json_output(pivot_table.values.tolist()),
            "x_label": x,
            "y_label": y,
            "z_label": z,
            "stats": {
                "x_categories": len(pivot_table.columns),
                "y_categories": len(pivot_table.index),
                "z_range": [float(pivot_table.min().min()), float(pivot_table.max().max())]
            },
            "warnings": warnings
        }
        
    except Exception as e:
        logger.error(f"Error generating heatmap: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating heatmap: {str(e)}")
