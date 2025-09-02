# 🚀 DataViz Platform

**Professional Data Visualization and Analysis Platform** - A comprehensive web-based dashboard for data exploration, manipulation, and visualization.

## ✨ Features

### Phase 1: Data Management ✅
- **Smart File Upload**: Excel (.xlsx, .xls), CSV, TXT with automatic format detection
- **Data Type Inference**: Automatic detection with user override capability
- **Data Preview**: Interactive data exploration with column information
- **File Size Support**: Up to 20MB files

### Phase 2: Data Operations ✅
- **Advanced Filtering**: Multiple filter types (equals, contains, range, null checks)
- **Data Transformations**: Column operations, data cleaning, sorting
- **Data Merging**: Join datasets with flexible merge strategies
- **Data Concatenation**: Combine multiple datasets
- **Comprehensive Statistics**: Descriptive stats, correlation analysis, missing data patterns

### Phase 3: Data Visualization (Coming Soon)
- **Interactive Plots**: Plotly, Bokeh, Altair integration
- **Professional Templates**: Pre-built chart styles and themes
- **Export Capabilities**: PNG, SVG, PDF, HTML formats
- **Advanced Chart Types**: 2D/3D plots, statistical charts, subplots

## 🏗️ Architecture

- **Frontend**: React.js + TypeScript + Material-UI + Vite
- **Backend**: FastAPI + Python + Pandas + NumPy
- **Data Storage**: In-memory (production: database)
- **Network**: Local network deployment with CORS support

## 🚀 Quick Start

### Single Launch Solution
**Just run one file to launch everything:**

```bash
start_dataviz_platform.bat
```

This single script will:
- ✅ Check Python and Node.js installation
- ✅ Create/activate virtual environment
- ✅ Install all dependencies automatically
- ✅ Launch both backend and frontend servers
- ✅ Verify servers are running before success message
- ✅ Open browser automatically

### Requirements
- **Python**: 3.11+ (3.13 supported)
- **Node.js**: 18+ (24 supported)
- **Windows**: 10/11 with PowerShell

## 🌐 Network Deployment

### Local Access
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Network Access (Remote PCs)
- **Frontend**: http://YOUR_SERVER_IP:3000
- **Backend API**: http://YOUR_SERVER_IP:8000
- **API Docs**: http://YOUR_SERVER_IP:8000/docs

### Firewall Configuration
The startup script automatically creates necessary firewall rules for network access.

## 📁 Project Structure

```
DataViz-App/
├── start_dataviz_platform.bat    # 🚀 SINGLE LAUNCH SCRIPT
├── check_status.bat              # Status checker
├── troubleshoot.bat              # Troubleshooting & diagnostics
├── backend/                      # FastAPI backend
│   ├── main.py                   # Main application
│   ├── data_operations.py        # Data operations API
│   ├── shared.py                 # Shared data structures
│   ├── requirements.txt          # Python dependencies
│   └── venv/                     # Virtual environment
├── frontend/                     # React frontend
│   ├── src/                      # Source code
│   ├── package.json              # Node.js dependencies
│   ├── vite.config.ts            # Vite configuration
│   └── node_modules/             # Installed packages
└── README.md                     # This file
```

## 🔧 Development

### Backend Development
```bash
cd backend
# Activate virtual environment
venv\Scripts\activate
# Install dependencies
pip install -r requirements.txt
# Run development server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Development
```bash
cd frontend
# Install dependencies
npm install
# Run development server
npm start
```

## 🐛 Troubleshooting

### Quick Diagnostics
1. **Run `check_status.bat`** - Shows current state of all components
2. **Run `troubleshoot.bat`** - Automatically detects and fixes common issues
3. **Check command windows** - Look for error messages in server windows

### Common Issues

#### 1. **"localhost refused to connect"**
- **Cause**: Servers aren't actually running despite success messages
- **Solution**: Run `troubleshoot.bat` to diagnose
- **Check**: Look at the separate command windows for error messages

#### 2. **Port Already in Use**
- **Cause**: Another application is using ports 3000 or 8000
- **Solution**: Close conflicting applications or change ports
- **Detection**: `troubleshoot.bat` will show this automatically

#### 3. **Firewall Blocking**
- **Cause**: Windows Firewall blocking connections
- **Solution**: Run `troubleshoot.bat` as Administrator
- **Manual**: Add inbound rules for ports 3000 and 8000

#### 4. **Servers Start But Don't Respond**
- **Cause**: Dependencies missing or corrupted
- **Solution**: Delete `backend\venv` and `frontend\node_modules`, restart
- **Check**: Look for import errors in command windows

### Error Solutions
- **Dependency Issues**: Run the startup script with administrator privileges
- **Virtual Environment**: Delete `backend\venv` folder and restart
- **Node Modules**: Delete `frontend\node_modules` folder and restart
- **Port Conflicts**: Close applications using ports 3000/8000
- **Firewall Issues**: Run `troubleshoot.bat` as Administrator

### Advanced Troubleshooting
Run `troubleshoot.bat` for:
- ✅ Port availability checking
- ✅ Automatic firewall rule creation
- ✅ Server status verification
- ✅ Connection testing
- ✅ Common solution suggestions

## 📈 Roadmap

### Current Status
- **Phase 1**: ✅ Complete - Data Management
- **Phase 2**: ✅ Complete - Data Operations
- **Phase 3**: 🔄 In Progress - Data Visualization

### Future Enhancements
- **User Authentication**: Role-based access control
- **Advanced Analytics**: Machine learning integration
- **Real-time Collaboration**: Multi-user editing
- **Cloud Deployment**: AWS, Azure, GCP support
- **Database Integration**: PostgreSQL, MySQL, MongoDB

## 🎯 Key Benefits

- **Single Launch**: One script launches everything
- **Automatic Setup**: Dependencies installed automatically
- **Network Ready**: Built-in network deployment support
- **Professional UI**: Material-UI based interface
- **Scalable Architecture**: FastAPI + React foundation
- **Automatic Updates**: Only installs new packages when requirements change
- **Status Monitoring**: Easy diagnosis with status checker script
- **Server Verification**: Ensures servers are actually running before success messages
- **Automatic Troubleshooting**: Built-in diagnostics and firewall rule creation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

- **Documentation**: Check this README and API docs
- **Troubleshooting**: Run `troubleshoot.bat` for automatic fixes
- **Status Check**: Run `check_status.bat` for current state
- **Issues**: Report problems with detailed error messages

---

**🚀 Ready to launch? Just run `start_dataviz_platform.bat` and everything will be set up automatically!**
