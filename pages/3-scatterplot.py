# pages/3-scatterplot.py
import streamlit as st
import plotly.express as px
from helpers import update_df, initialize_state, common_sidebar

def app():
    initialize_state()
    common_sidebar()
    
    st.title("Scatterplot")
    
    if st.session_state.df is None:
        st.warning("Please upload and (optionally) filter data first.")
        return

    df = st.session_state.df

    # Right column: Plot Options; Left column: Plot and fixed criterions.
    left_col, right_col = st.columns([5, 2])

    with right_col:
        st.subheader("Plot Options")
        x_axis = st.selectbox("Select X-axis", options=df.columns, key="x_axis")
        y_axis = st.selectbox("Select Y-axis", options=df.columns, key="y_axis")
        select_legend = st.checkbox("Select legend column", key="select_legend")
        legend_col = None
        if select_legend:
            legend_col = st.selectbox("Select Legend Column", options=df.columns, key="legend_col")
        show_line = st.checkbox("Show Line", key="show_line")
    
    # Initialize fixed criteria state if not present.
    if "fixed_columns" not in st.session_state:
        st.session_state.fixed_columns = []
    if "fixed_values" not in st.session_state:
        st.session_state.fixed_values = {}

    # Apply fixed criterions to create a plotting DataFrame.
    plot_df = df.copy()
    for col, value in st.session_state.fixed_values.items():
        if value != "":  # Only apply if a value was selected.
            plot_df = plot_df[plot_df[col] == value]
    
    with left_col:
        st.subheader("Plot")
        # Force legend column to be categorical if selected.
        if legend_col:
            plot_df[legend_col] = plot_df[legend_col].astype(str)
            if show_line:
                fig = px.line(plot_df, x=x_axis, y=y_axis, color=legend_col,
                              title="Line Plot with Markers", markers=True)
            else:
                fig = px.scatter(plot_df, x=x_axis, y=y_axis, color=legend_col,
                                 title="Scatter Plot")
        else:
            if show_line:
                fig = px.line(plot_df, x=x_axis, y=y_axis,
                              title="Line Plot with Markers", markers=True)
            else:
                fig = px.scatter(plot_df, x=x_axis, y=y_axis,
                                 title="Scatter Plot")
        
        # Update axes to show grid lines and boundary lines.
        fig.update_xaxes(showgrid=True, gridcolor='lightgrey', zeroline=True, zerolinecolor='black', linecolor='black', mirror=True)
        fig.update_yaxes(showgrid=True, gridcolor='lightgrey', zeroline=True, zerolinecolor='black', linecolor='black', mirror=True)
        
        st.plotly_chart(fig, use_container_width=True)
        
        # Fixed criterions appear below the plot.
        st.subheader("Fixed Criterions (Plot-Specific)")
        fixed_columns = st.multiselect("Select columns for fixed values", options=df.columns, key="fixed_columns")
        new_fixed_values = {}
        # For each fixed column, let the user select a value. Always default to the first option.
        for col in fixed_columns:
            options = [""] + sorted(df[col].dropna().unique().tolist())
            new_fixed_values[col] = st.selectbox(f"Fixed value for {col}", options=options,
                                                  index=0, key=f"fixed_{col}")
        st.session_state.fixed_values = new_fixed_values
        
        st.write("This filtering applies to the plot only.")
        st.write("### Plot Data Preview")
        st.dataframe(plot_df)

    st.write("### Global Data Preview")
    st.dataframe(df)

if __name__ == '__main__':
    app()
