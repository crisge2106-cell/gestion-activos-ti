@echo off
REM Actualizador de Nombres de Equipos
REM Axis Group - Gestion de Activos TI

cls
echo.
echo ========================================
echo Actualizador de Nombres de Equipos
echo Axis Group - Gestion de Activos TI
echo ========================================
echo.

REM Cambiar a la carpeta del servidor
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
echo 🔄 Actualizando base de datos...
echo.

REM Ejecutar script Node.js (228 equipos - TODOS con prefijos por tipo)
node actualizar_completo.js

if %errorlevel%==0 (
    echo.
    echo ✅ ¡Actualización completada!
    echo.
) else (
    echo.
    echo ❌ Error durante la actualización
    echo.
)

pause
