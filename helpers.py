# helpers.py
import pandas as pd
import streamlit as st

def initialize_state():
    """Initialize session state for data storage."""
    if 'df' not in st.session_state:
        st.session_state.df = None
    if 'original_df' not in st.session_state:
        st.session_state.original_df = None

def load_data(file):
    """Load CSV or Excel file into a pandas DataFrame."""
    filename = file.name
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(file)
        elif filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file)
        else:
            st.error("Unsupported file format.")
            return None
        return df
    except Exception as e:
        st.error(f"Error loading file: {e}")
        return None

def update_df(new_df):
    """Update the global DataFrame in session state."""
    st.session_state.df = new_df

def revert_df():
    """Revert the working DataFrame to its original state."""
    if st.session_state.original_df is not None:
        st.session_state.df = st.session_state.original_df.copy()

def download_csv():
    """Convert current DataFrame to CSV for download."""
    if st.session_state.df is not None:
        return st.session_state.df.to_csv(index=False).encode('utf-8')
    return None

def common_sidebar():
    """Common sidebar elements available on all pages."""
    # Ensure session state is initialized
    initialize_state()
    
    st.sidebar.subheader("Data Options")
    csv = download_csv()
    if csv is not None:
        st.sidebar.download_button("Download CSV", data=csv, file_name="filtered_data.csv", mime="text/csv")
    if st.sidebar.button("Revert DF to Original"):
        revert_df()
        st.sidebar.success("DataFrame reverted to original state.")
