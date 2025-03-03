# pages/2-Filter Data.py
import streamlit as st
import pandas as pd
from helpers import update_df, initialize_state, common_sidebar

def app():
    initialize_state()
    common_sidebar()

    st.title("Filter Data")

    # Use the original DataFrame as the source for filtering.
    if st.session_state.original_df is None:
        st.warning("Please upload a file first on the 'Upload File' page.")
        return

    original_df = st.session_state.original_df

    # Create a two-column layout: left for filter options, right for the filtered DataFrame.
    left_col, right_col = st.columns(2)

    with left_col:
        st.subheader("Filter Options")
        cols = list(original_df.columns)
        selected_columns = st.multiselect(
            "Columns to filter",
            options=cols,
            default=[cols[0]] if cols else []
        )

        filter_criteria = {}
        for col in selected_columns:
            unique_vals = sorted(original_df[col].dropna().unique().tolist())

            # If the filter for this column doesn't exist, initialize it.
            key = f"filter_{col}"
            if key not in st.session_state:
                st.session_state[key] = unique_vals
            else:
                # Ensure the stored default values are valid (i.e. exist in unique_vals).
                current_defaults = st.session_state[key]
                updated_defaults = [val for val in current_defaults if val in unique_vals]
                if updated_defaults != current_defaults:
                    st.session_state[key] = updated_defaults

            # Display the multiselect using the session state as default.
            current_selection = st.multiselect(
                f"Filter values in '{col}'",
                options=unique_vals,
                default=st.session_state[key],
                key=key
            )

            # Buttons to quickly select or unselect all options.
            btn_select, btn_unselect = st.columns(2)
            with btn_select:
                if st.button("Select All", key=f"select_all_{col}"):
                    st.session_state[key] = unique_vals
                    st.experimental_rerun()
            with btn_unselect:
                if st.button("Unselect All", key=f"unselect_all_{col}"):
                    st.session_state[key] = []
                    st.experimental_rerun()

            filter_criteria[col] = st.session_state[key]

    with right_col:
        st.subheader("Filtered Data Preview")
        filtered_df = original_df.copy()
        for col, values in filter_criteria.items():
            if values:  # Apply filter only if there are selected values.
                filtered_df = filtered_df[filtered_df[col].isin(values)]
        st.dataframe(filtered_df)

    # Update the session state so that this filtered DataFrame is used across pages.
    update_df(filtered_df)

if __name__ == '__main__':
    app()
