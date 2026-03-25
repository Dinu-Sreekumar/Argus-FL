@echo off
:: BatchGotAdmin - Auto-Elevate to Administrator
:-------------------------------------
REM  --> Check for permissions
    IF "%PROCESSOR_ARCHITECTURE%" EQU "amd64" (
>nul 2>&1 "%SYSTEMROOT%\SysWOW64\cacls.exe" "%SYSTEMROOT%\SysWOW64\config\system"
) ELSE (
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
)

REM --> If error flag set, we do not have admin.
if '%errorlevel%' NEQ '0' (
    echo Requesting administrative privileges...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"

    "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
    pushd "%CD%"
    CD /D "%~dp0"
:--------------------------------------

color 0B
echo ============================================
echo      ARGUS-FL IDPS SYSTEM LAUNCHER
echo ============================================
echo  [ ADMINISTRATOR PRIVILEGES CONFIRMED ]
echo.

echo [0/3] Cleaning up previous sessions...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
taskkill /FI "WINDOWTITLE eq Argus SERVER" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Argus DASHBOARD" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Node 1" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Node 2" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Node 3" /F >nul 2>&1
timeout /t 2 /nobreak >nul

:: Fix: Scapy Permission Error (Common on Windows)
if exist "%USERPROFILE%\.cache\scapy\services.pickle" (
    echo [FIX] Clearing Scapy cache to prevent permission errors...
    del "%USERPROFILE%\.cache\scapy\services.pickle" /F /Q >nul 2>&1
)

echo.

echo [1/3] Starting Argus SERVER (Backend + Sentry)...
:: CD into backend ensures .env is loaded correctly and imports work
start "Argus SERVER" cmd /c "venv\Scripts\activate && cd backend && python server.py || pause"
timeout /t 5 /nobreak >nul

echo.
echo [2/3] Starting 3 FL CLIENTS...
:: Clients simulate the IoT devices
start "Node 1" cmd /c "venv\Scripts\activate && cd backend && python client.py --node-id 1 || pause"
start "Node 2" cmd /c "venv\Scripts\activate && cd backend && python client.py --node-id 2 || pause"
start "Node 3" cmd /c "venv\Scripts\activate && cd backend && python client.py --node-id 3 || pause"

echo.
echo [3/3] Starting Argus DASHBOARD (Frontend)...
:: Using regular start port (3000) - Clean kill above ensures it is free
start "Argus DASHBOARD" cmd /c "cd frontend && npm start || pause"

echo.
echo ============================================
echo      SYSTEM LAUNCHED SUCCESSFULLY
echo ============================================
echo.
echo IMPORTANT STEPS:
echo 1. Open http://localhost:3000
echo 2. REGISTER a new account (Email Verification required).
echo 3. LOGIN to access the Dashboard.
echo.
pause
