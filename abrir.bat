@echo off
rem Abre o Oratorio: sobe o servidor (janela minimizada) e abre no Brave.
cd /d "%~dp0"
start "Oratorio" /min python servidor\iniciar.py
