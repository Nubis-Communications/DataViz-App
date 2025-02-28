# pages/1-Upload File.py
import streamlit as st
import pandas as pd
from helpers import load_data, update_df, initialize_state, common_sidebar

def app():
    # Initialize session state if needed
    initialize_state()
    
    # Show common sidebar elements
    common_sidebar()
    
    st.title("Upload File")
    file = st.file_uploader("Upload CSV or Excel File", type=['csv', 'xlsx', 'xls'])
    
    if file is not None:
        df = load_data(file)
        if df is not None:
            # Save a copy as the original and update the working DataFrame
            st.session_state.original_df = df.copy()
            update_df(df)
            st.write("Data Preview (editable):")
            st.data_editor(df, num_rows="dynamic")
        else:
            st.error("Failed to load data.")

if __name__ == '__main__':
    app()
