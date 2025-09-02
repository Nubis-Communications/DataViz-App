@echo off
echo ========================================
echo    DataViz Platform - Status Check
echo ========================================
echo.

:: Check Python
echo Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python: NOT INSTALLED or not in PATH
) else (
    for /f "tokens=2" %%i in ('python --version 2^>^&1') do echo ✅ Python: %%i
)

:: Check Node.js
echo.
echo Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js: NOT INSTALLED or not in PATH
) else (
    for /f "tokens=1" %%i in ('node --version 2^>^&1') do echo ✅ Node.js: %%i
)

:: Check Virtual Environment
echo.
echo Checking Virtual Environment...
set "VENV_PATH=backend\venv"
if exist "%VENV_PATH%" (
    echo ✅ Virtual Environment: Found at %VENV_PATH%
    
    :: Check if key packages are installed
    if exist "%VENV_PATH%\Scripts\python.exe" (
        echo Checking key packages...
        "%VENV_PATH%\Scripts\python.exe" -c "import fastapi, pandas, numpy" >nul 2>&1
        if not errorlevel 1 (
            echo ✅ Backend Dependencies: All required packages installed
        ) else (
            echo ⚠️  Backend Dependencies: Some packages missing
        )
    ) else (
        echo ❌ Virtual Environment: Corrupted (python.exe missing)
    )
) else (
    echo ❌ Virtual Environment: Not found
)

:: Check Frontend Dependencies
echo.
echo Checking Frontend Dependencies...
if exist "frontend\node_modules" (
    echo ✅ Frontend Dependencies: Found (node_modules exists)
) else (
    echo ❌ Frontend Dependencies: Not installed
)

:: Check if servers are running
echo.
echo Checking Server Status...
netstat -an | findstr ":8000" >nul 2>&1
if not errorlevel 1 (
    echo ✅ Backend Server: Running on port 8000
) else (
    echo ❌ Backend Server: Not running
)

netstat -an | findstr ":3000" >nul 2>&1
if not errorlevel 1 (
    echo ✅ Frontend Server: Running on port 3000
) else (
    echo ❌ Frontend Server: Not running
)

echo.
echo ========================================
echo Status check complete!
echo.
echo To launch the platform, run:
echo   🚀 Launch DataViz Platform.bat
echo.
echo To see this status again, run:
echo   check_status.bat
echo.
pause
