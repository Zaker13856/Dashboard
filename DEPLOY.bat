@echo off
REM Deploy dashboard ISINNOVA su isinnova.cloud (FTP Hostinger)
REM Doppio click per eseguire. La cartella dist/ deve essere gia' buildata.
cd /d "%~dp0"
echo ============================================
echo  DEPLOY DASHBOARD ISINNOVA - isinnova.cloud
echo ============================================
echo.
node scripts\deploy-ftp.cjs
if errorlevel 1 (
  echo.
  echo *** DEPLOY FALLITO - vecchia versione ancora online, nessun danno ***
  pause
  exit /b 1
)
echo.
echo Deploy OK. Pulizia vecchi asset...
node scripts\clean-old-assets.cjs
echo.
echo ============================================
echo  FATTO. Controlla https://isinnova.cloud
echo ============================================
pause
