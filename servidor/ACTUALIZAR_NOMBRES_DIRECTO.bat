@echo off
REM Actualizar nombres directamente en la BD
REM Mapea por serie (el método que funciona)

cls
echo.
echo ========================================
echo Actualizar Nombres Directamente
echo Axis Group - Gestion de Activos TI
echo ========================================
echo.

cd /d "%~dp0"

REM Verificar que el servidor no esté ejecutándose
tasklist | find /i "node.exe" >nul
if %errorlevel%==0 (
    echo.
    echo ❌ ERROR: El servidor está ejecutándose
    echo.
    echo Por favor:
    echo 1. Detén iniciar_servidor.bat
    echo 2. Espera a que se cierre completamente
    echo 3. Vuelve a ejecutar este script
    echo.
    pause
    exit /b 1
)

echo ✅ Servidor no está ejecutándose
echo.
echo 🔄 Actualizando nombres directamente en BD...
echo.

node actualizar_nombres_directo.js

if %errorlevel%==0 (
    echo.
    echo ✅ ¡Nombres actualizados!
    echo.
) else (
    echo.
    echo ❌ Error durante la actualización
    echo.
)

pause
