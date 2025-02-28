# app.py
import streamlit as st
from helpers import common_sidebar

st.set_page_config(page_title="Nubis DataViz App", page_icon="📊")

# Call the common sidebar to show download/revert options
common_sidebar()

st.title("Welcome to Nubis DataViz App")
st.write("""
This is the home page. Use the sidebar to navigate between pages:
- **Upload File:** Upload a CSV or Excel file.
- **Filter Data:** Filter the data with dynamic criteria.
- **Scatterplot:** Visualize your data with interactive scatter plots.
""")
