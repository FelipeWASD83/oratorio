@echo off
rem Abre o Oratorio numa janela (Electron). Na primeira vez baixa o Electron (uns 250 MB, so nesta pasta).
cd /d "%~dp0"
if not exist "node_modules\electron\dist\electron.exe" (
  echo Instalando o Electron, so na primeira vez...
  call npm install --no-audit --no-fund
  if not exist "node_modules\electron\dist\electron.exe" call node node_modules\electron\install.js
)
if not exist "node_modules\electron\dist\electron.exe" (
  echo Nao consegui instalar o Electron. Veja a mensagem acima.
  pause
  exit /b 1
)
start "" "node_modules\electron\dist\electron.exe" .
