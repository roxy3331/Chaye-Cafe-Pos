@echo off
title Shop Hisab — Build & Deploy
color 0A
echo.
echo  ========================================
echo   SHOP HISAB — Build and Deploy
echo  ========================================
echo.

cd /d "%~dp0"

echo [1/3] Installing dependencies...
call npm install
if errorlevel 1 (
  echo.
  echo  ERROR: npm install failed!
  pause
  exit /b 1
)

echo.
echo [2/3] Building project...
call npm run build
if errorlevel 1 (
  echo.
  echo  ERROR: Build failed! Check TypeScript errors above.
  pause
  exit /b 1
)

echo.
echo [3/3] Deploying to Firebase...
call firebase deploy --only hosting
if errorlevel 1 (
  echo.
  echo  ERROR: Firebase deploy failed!
  pause
  exit /b 1
)

echo.
echo  ========================================
echo   Deploy complete!
echo   URL: https://chaye-cafe-pos.web.app
echo  ========================================
echo.
pause
