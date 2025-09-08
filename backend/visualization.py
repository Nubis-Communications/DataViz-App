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
    sample: Optional[int] = Query(None, description="Optional down-sample size")
):
    """Return raw x/y arrays and basic stats for client-side rendering."""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = datasets[dataset_id].df
    if x not in df.columns or y not in df.columns:
        raise HTTPException(status_code=400, detail=f"Columns not found. Available: {list(df.columns)}")

    x_vals = df[x].tolist()
    y_vals = df[y].tolist()

    # convert non-numeric y gracefully where possible
    try:
        y_numeric = pd.to_numeric(df[y], errors='coerce').tolist()
    except Exception:
        y_numeric = y_vals

    x_vals, y_numeric = _downsample_xy(x_vals, y_numeric, sample)

    return {
        "x": x_vals,
        "y": y_numeric,
        "x_label": x,
        "y_label": y,
        "stats": _basic_stats([v for v in y_numeric if v is not None]),
    }

@router.get("/{dataset_id}/json_series")
async def json_series(
    dataset_id: str,
    column: str = Query(..., description="Numeric column name"),
    sample: Optional[int] = Query(None)
):
    """Return index as x and column values as y for a simple series plot."""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = datasets[dataset_id].df
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
    agg: str = Query("mean", description="Aggregation: mean|sum|count")
):
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = datasets[dataset_id].df
    if category not in df.columns or value not in df.columns:
        raise HTTPException(status_code=400, detail=f"Columns not found. Available: {list(df.columns)}")

    if agg == "mean":
        agg_df = df.groupby(category)[value].mean().reset_index()
    elif agg == "sum":
        agg_df = df.groupby(category)[value].sum().reset_index()
    elif agg == "count":
        agg_df = df.groupby(category)[value].count().reset_index()
    else:
        raise HTTPException(status_code=400, detail="Unsupported aggregation")

    return {
        "x": agg_df[category].astype(str).tolist(),
        "y": pd.to_numeric(agg_df[value], errors='coerce').tolist(),
        "x_label": category,
        "y_label": f"{agg}({value})",
        "stats": _basic_stats(pd.to_numeric(agg_df[value], errors='coerce').tolist()),
    }
