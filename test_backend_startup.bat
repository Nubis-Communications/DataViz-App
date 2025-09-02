@echo off
echo Testing Backend Startup Command...
echo.

cd backend
echo Current directory: %CD%
echo.

echo Testing batch activation and uvicorn command...
.\venv\Scripts\activate.bat && echo Virtual environment activated successfully && echo Testing uvicorn command... && uvicorn --version

echo.
echo Test completed. If you see uvicorn version info above, the startup command will work.
echo.
pause
