@echo off
echo ========================================
echo    DataViz Platform - Complete Setup
echo ========================================
echo.

:: Check if we're in the right directory
if not exist "backend\venv" (
    echo ERROR: Please run this script from the DataViz Platform project root
    echo Current directory: %CD%
    pause
    exit /b 1
)

echo Running from: %CD%
echo.

:: Check Python
python -V >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.8+
    pause
    exit /b 1
)

:: Check Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
)

echo Python and Node.js found. Starting setup...
echo.

:: Define paths
set "VENV_PATH=backend\venv"
set "VENV_ACTIVATE=%VENV_PATH%\Scripts\activate.bat"

:: Check virtual environment
if exist "%VENV_PATH%" (
    echo Virtual environment found. Checking dependencies...
    "%VENV_PATH%\Scripts\python.exe" -c "import fastapi, pandas, numpy" >nul 2>&1
    if not errorlevel 1 (
        echo All packages installed. Starting servers...
        goto :start_servers
    )
) else (
    echo Creating virtual environment...
    cd backend
    python -m venv venv
    cd ..
)

:: Install backend dependencies
echo Installing backend dependencies...
cd backend
call "%VENV_ACTIVATE%"
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)
cd ..

:: Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
if not exist "node_modules" (
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install frontend dependencies
        pause
        exit /b 1
    )
)
cd ..

echo Dependencies ready!
echo.

:start_servers
:: Start backend in a new window (from backend directory)
echo Starting backend server...
echo.
echo IMPORTANT: The backend window will open. Make sure it shows:
echo "INFO: Application startup complete" and "INFO: Uvicorn running on http://0.0.0.0:8000"
echo.
start "DataViz Backend" cmd /k "cd /d %CD%\backend && call "%VENV_ACTIVATE%" && echo Backend server starting from backend directory... && echo Current directory: %CD%\backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait for backend to start
echo Waiting for backend to start...
timeout /t 15 /nobreak >nul

:: Start frontend in a new window
echo Starting frontend server...
start "DataViz Frontend" cmd /k "cd /d %CD%\frontend && npm start"

:: Wait for frontend to start
echo Waiting for frontend to start...
timeout /t 15 /nobreak >nul

echo.
echo ========================================
echo    DataViz Platform is starting up!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo Both servers are starting in separate windows.
echo Close those windows to stop the servers.
echo.
echo IMPORTANT: Check the backend window for success message:
echo "INFO: Uvicorn running on http://0.0.0.0:8000"
echo.
echo Press any key to open the platform in your browser...
pause >nul

:: Open browser
start http://localhost:3000

echo.
echo Platform launched successfully!
echo You can now access the DataViz Platform at:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:8000
echo.
echo For network access, other users can connect to:
echo - Frontend: http://YOUR_SERVER_IP:3000
echo - Backend: http://YOUR_SERVER_IP:8000
echo.
echo Note: User capacity is flexible and depends on server resources
echo.
pause
