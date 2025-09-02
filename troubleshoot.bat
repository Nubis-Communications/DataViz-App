@echo off
echo ========================================
echo    DataViz Platform - Troubleshooting
echo ========================================
echo.

echo Checking common issues...
echo.

:: Check if ports are in use
echo 1. Checking if ports are already in use...
netstat -an | findstr ":8000" >nul 2>&1
if not errorlevel 1 (
    echo ❌ Port 8000 is already in use by another application
    echo    This will prevent the backend server from starting
    echo.
) else (
    echo ✅ Port 8000 is available
)

netstat -an | findstr ":3000" >nul 2>&1
if not errorlevel 1 (
    echo ❌ Port 3000 is already in use by another application
    echo    This will prevent the frontend server from starting
    echo.
) else (
    echo ✅ Port 3000 is available
)

:: Check Windows Firewall
echo.
echo 2. Checking Windows Firewall...
netsh advfirewall firewall show rule name="DataViz Backend 8000" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  No specific firewall rule found for port 8000
    echo    Creating firewall rule for backend...
    netsh advfirewall firewall add rule name="DataViz Backend 8000" dir=in action=allow protocol=TCP localport=8000
    if not errorlevel 1 (
        echo ✅ Firewall rule created for port 8000
    ) else (
        echo ❌ Failed to create firewall rule (run as Administrator)
    )
) else (
    echo ✅ Firewall rule exists for port 8000
)

netsh advfirewall firewall show rule name="DataViz Frontend 3000" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  No specific firewall rule found for port 3000
    echo    Creating firewall rule for frontend...
    netsh advfirewall firewall add rule name="DataViz Frontend 3000" dir=in action=allow protocol=TCP localport=3000
    if not errorlevel 1 (
        echo ✅ Firewall rule created for port 3000
    ) else (
        echo ❌ Failed to create firewall rule (run as Administrator)
    )
) else (
    echo ✅ Firewall rule exists for port 3000
)

:: Check if servers are actually running
echo.
echo 3. Checking server status...
netstat -an | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo ✅ Backend server is running on port 8000
) else (
    echo ❌ Backend server is NOT running on port 8000
    echo    Check the backend command window for error messages
)

netstat -an | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo ✅ Frontend server is running on port 3000
) else (
    echo ❌ Frontend server is NOT running on port 3000
    echo    Check the frontend command window for error messages
)

:: Test local connections
echo.
echo 4. Testing local connections...
echo Testing backend connection...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8000/health' -TimeoutSec 5; Write-Host '✅ Backend connection successful' } catch { Write-Host '❌ Backend connection failed: ' $_.Exception.Message }"

echo Testing frontend connection...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 5; Write-Host '✅ Frontend connection successful' } catch { Write-Host '❌ Frontend connection failed: ' $_.Exception.Message }"

:: Check for common error patterns
echo.
echo 5. Common solutions to try:
echo.
echo If servers won't start:
echo - Close any applications using ports 3000 or 8000
echo - Run the startup script as Administrator
echo - Check that Python and Node.js are properly installed
echo.
echo If localhost connections fail:
echo - Ensure both servers are actually running
echo - Check the command windows for error messages
echo - Try accessing http://127.0.0.1:3000 instead of localhost:3000
echo.
echo If firewall issues persist:
echo - Run this script as Administrator
echo - Manually add firewall rules in Windows Defender
echo - Temporarily disable Windows Firewall for testing
echo.

echo ========================================
echo Troubleshooting complete!
echo.
echo Next steps:
echo 1. If ports are in use, close those applications
echo 2. If firewall rules failed, run as Administrator
echo 3. If servers aren't running, check command windows
echo 4. Try launching again with 🚀 Launch DataViz Platform.bat
echo.
pause
