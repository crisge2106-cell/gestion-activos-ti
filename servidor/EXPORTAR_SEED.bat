@echo off
REM Exportar Seed Corregido
REM Actualiza seed.json con los nombres correctos de la BD

cls
echo.
echo ========================================
echo Exportar Seed Corregido
echo Axis Group - Gestion de Activos TI
echo ========================================
echo.

REM Cambiar a la carpeta del servidor
cd /d "%~dp0"

echo 📖 Exportando nombres correctos de la BD a seed.json...
echo.

node exportar_seed_corregido.js

if %errorlevel%==0 (
    echo.
    echo ✅ ¡Seed.json actualizado!
    echo.
    echo 📝 Próximos pasos:
    echo    1. Ejecuta: iniciar_servidor.bat
    echo    2. Abre: http://localhost:3335
    echo    3. Presiona: Ctrl+F5
    echo    4. Ve a: Inventario
    echo.
) else (
    echo.
    echo ❌ Error durante la exportación
    echo.
)

pause
