# pages/2-Filter Data.py
import streamlit as st
import pandas as pd
from helpers import update_df, initialize_state, common_sidebar

def app():
    initialize_state()
    common_sidebar()
    
    st.title("Filter Data")
    
    if st.session_state.original_df is None:
        st.warning("Please upload a file first on the 'Upload File' page.")
        return

    original_df = st.session_state.original_df

    # Only initialize if the key doesn't exist.
    if "selected_columns" not in st.session_state:
        st.session_state.selected_columns = [original_df.columns[0]] if original_df.columns.size > 0 else []
    if "filter_criteria" not in st.session_state:
        st.session_state.filter_criteria = {}

    left_col, right_col = st.columns(2)

    with left_col:
        st.subheader("Filter Options")
        cols = list(original_df.columns)
        # Create the widget with its key; do not reassign its value afterward.
        selected_columns = st.multiselect(
            "Columns to filter",
            options=cols,
            default=st.session_state.get("selected_columns", [cols[0]] if cols else []),
            key="selected_columns"
        )
        
        # For each selected column, handle filter criteria
        for col in selected_columns:
            unique_vals = sorted(original_df[col].dropna().unique().tolist())
            if col not in st.session_state.filter_criteria:
                st.session_state.filter_criteria[col] = unique_vals
            current_selection = st.multiselect(
                f"Filter values in '{col}'",
                options=unique_vals,
                default=st.session_state.filter_criteria[col],
                key=f"filter_{col}"
            )
            st.session_state.filter_criteria[col] = current_selection
            
            btn_select, btn_unselect = st.columns(2)
            with btn_select:
                if st.button("Select All", key=f"select_all_{col}"):
                    st.session_state.filter_criteria[col] = unique_vals
                    st.experimental_rerun()
            with btn_unselect:
                if st.button("Unselect All", key=f"unselect_all_{col}"):
                    st.session_state.filter_criteria[col] = []
                    st.experimental_rerun()

    with right_col:
        st.subheader("Filtered Data Preview")
        filtered_df = original_df.copy()
        for col in st.session_state.get("selected_columns", []):
            selected_vals = st.session_state.filter_criteria.get(col, [])
            if selected_vals:
                filtered_df = filtered_df[filtered_df[col].isin(selected_vals)]
        st.dataframe(filtered_df)
    
    update_df(filtered_df)

if __name__ == '__main__':
    app()
