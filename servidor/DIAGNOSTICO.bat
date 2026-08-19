@echo off
REM Ejecutar diagnóstico exhaustivo del problema de nombres

cd /d "%~dp0"

echo.
echo ========================================
echo Diagnóstico Exhaustivo
echo Axis Group - Gestion de Activos TI
echo ========================================
echo.
echo Analizando la base de datos...
echo.

node diagnostico_nombres.js

echo.
pause
