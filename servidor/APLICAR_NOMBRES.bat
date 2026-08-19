@echo off
REM Aplicar nombres a equipos desde seed.json
REM Axis Group - Gestion de Activos TI

cls
echo.
echo ========================================
echo Aplicar Nombres a Equipos
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
echo 🔧 Aplicando nombres a equipos desde seed.json...
echo.

REM Ejecutar script
node aplicar_nombres.js

if %errorlevel%==0 (
    echo.
    echo ✅ ¡Nombres aplicados!
    echo.
    echo 📝 Próximos pasos:
    echo    1. Ejecuta: iniciar_servidor.bat
    echo    2. Abre: http://localhost:3335
    echo    3. Presiona: Ctrl+F5
    echo    4. Ve a: Inventario
    echo.
) else (
    echo.
    echo ❌ Error durante la aplicación
    echo.
)

pause
