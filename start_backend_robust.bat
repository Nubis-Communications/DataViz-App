@echo off
echo ========================================
echo    DataViz Platform - Backend Startup
echo ========================================
echo.

cd backend
echo Current directory: %CD%
echo.

echo Activating virtual environment...
call .\venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)

echo.
echo Testing imports...
python -c "import main; print('✅ Main module imported successfully')"
if errorlevel 1 (
    echo ERROR: Failed to import main module
    echo Check for import errors above
    pause
    exit /b 1
)

echo.
echo Testing visualization module...
python -c "import visualization; print('✅ Visualization module imported successfully')"
if errorlevel 1 (
    echo ERROR: Failed to import visualization module
    echo Check for import errors above
    pause
    exit /b 1
)

echo.
echo Starting backend server...
echo IMPORTANT: Keep this window open!
echo.
echo If you see any errors, they will appear below:
echo ========================================
echo.

uvicorn main:app --host 127.0.0.1 --port 8000 --reload

echo.
echo Backend stopped. Press any key to exit...
pause >nul
