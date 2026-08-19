@echo off
setlocal
title Servidor - Gestion de Activos TI

rem Ubicarse en la carpeta donde esta este archivo (servidor)
cd /d "%~dp0"

echo ============================================================
echo   Gestion de Activos TI - Axis Group
echo   Iniciando servidor...
echo ============================================================
echo.

rem Verificar que Node.js este instalado
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] No se encontro Node.js instalado en este equipo.
    echo Instala Node.js LTS desde https://nodejs.org y vuelve a intentar.
    echo.
    pause
    exit /b 1
)

node server.js

echo.
echo El servidor se detuvo.
pause
