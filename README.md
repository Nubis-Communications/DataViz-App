Nubis DataViz App is an interactive, multipage data visualization tool built with Streamlit. The application provides a user-friendly interface for uploading, filtering, and visualizing data through various custom pages.

Features
Upload File:
Upload CSV or Excel files to load data into a pandas DataFrame, with the option to edit data directly.

Filter Data:
Dynamically filter your dataset with a persistent selection interface. Customize your filters with options to select or unselect values while retaining the original dataset for further analysis.

Scatterplot:
Create scatter plots and line plots with interactive options:

Choose x-axis and y-axis variables.
Optionally specify a legend column (treated as discrete).
Connect data points with lines.
Set fixed criterions exclusive to the plot.
Customize the plot with visible grid and boundary lines on both axes.
File Structure


NubisDataVizApp/
├── app.py                   # Home page and multipage launcher.
├── helpers.py               # Helper functions and shared logic.
├── requirements.txt         # Project dependencies.
└── pages/
    ├── 1-Upload File.py     # Data upload page.
    ├── 2-Filter Data.py     # Data filtering page.
    └── 3-Scatterplot.py     # Data visualization page.
Installation and Running the App
Clone the repository:


git clone <repository_url>
cd NubisDataVizApp
Create a virtual environment and install dependencies:


python -m venv venv
# Activate the virtual environment:
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
Run the application:


streamlit run app.py


Contact
Developed by Shafee Khan
Email: shafee.khan@nubis-communications.com