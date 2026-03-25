@echo off
title Argus System Restarter
echo ============================================
echo      RESTARTING ARGUS SYSTEM...
echo ============================================
echo.
echo Waiting for server shutdown...
timeout /t 2 /nobreak > nul

echo Killing Python processes...
taskkill /F /IM python.exe /T 2>nul

echo Killing Node.js processes...
taskkill /F /IM node.exe /T 2>nul

echo.
echo Relaunching System...
timeout /t 2 /nobreak > nul
call launch_Argus-FL.bat
exit
