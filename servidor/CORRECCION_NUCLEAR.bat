@echo off
REM CORRECCIÓN NUCLEAR
REM Última solución - reescribe seed.json completamente

cls
echo.
echo ========================================
echo CORRECCIÓN NUCLEAR DE seed.json
echo Axis Group - Gestion de Activos TI
echo ========================================
echo.
echo Este script va a:
echo   1. Reescribir completamente seed.json
echo   2. Con TODOS los nombres correctos
echo   3. Evitando problemas de SQLite
echo.
pause

cd /d "%~dp0"

echo.
echo 🔧 Ejecutando corrección nuclear...
echo.

node corregir_seed_nuclear.js

if %errorlevel%==0 (
    echo.
    echo ✅ Corrección completada
    echo.
    echo ⚠️  IMPORTANTE - Ejecuta EXACTAMENTE estos comandos:
    echo.
    echo 1. Elimina la base de datos actual (será regenerada):
    echo    DEL activos.db
    echo.
    echo 2. Reinicia el servidor:
    echo    iniciar_servidor.bat
    echo.
    echo 3. Abre navegador: http://localhost:3335
    echo    Presiona: Ctrl+F5
    echo    Ve a: Inventario
    echo.
) else (
    echo.
    echo ❌ Error durante la corrección
    echo.
)

pause
