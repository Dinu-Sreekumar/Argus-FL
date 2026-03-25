@echo off
:: relaunch_backend.bat - Restarts Backend components ONLY (Preserves Frontend)

echo [0/2] Stopping Backend Processes...
taskkill /F /IM python.exe >nul 2>&1
taskkill /FI "WINDOWTITLE eq Argus SERVER" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Node 1" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Node 2" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Node 3" /F >nul 2>&1
timeout /t 2 /nobreak >nul

:: Fix: Scapy Permission Error
if exist "%USERPROFILE%\.cache\scapy\services.pickle" (
    del "%USERPROFILE%\.cache\scapy\services.pickle" /F /Q >nul 2>&1
)

echo.
echo [1/2] Starting Argus SERVER...
start "Argus SERVER" cmd /c "venv\Scripts\activate && cd backend && python server.py || pause"
timeout /t 5 /nobreak >nul

echo.
echo [2/2] Starting 3 FL CLIENTS...
start "Node 1" cmd /c "venv\Scripts\activate && cd backend && python client.py --node-id 1 || pause"
start "Node 2" cmd /c "venv\Scripts\activate && cd backend && python client.py --node-id 2 || pause"
start "Node 3" cmd /c "venv\Scripts\activate && cd backend && python client.py --node-id 3 || pause"

echo.
echo ============================================
echo      BACKEND RESTARTED SUCCESSFULLY
echo ============================================
echo.
pause
exit
