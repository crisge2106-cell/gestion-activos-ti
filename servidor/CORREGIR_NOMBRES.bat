@echo off
REM Corrector de Nombres de Equipos
REM Axis Group - Gestion de Activos TI
REM
REM Soluciona problemas de nombres incorrectos:
REM - Prefijos EQP cuando deberían ser LPT-, CEL-, IMP-, etc.
REM - Ceros adicionales en nombres (LPT-0040 -> LPT-040)

cls
echo.
echo ========================================
echo Corrector de Nombres de Equipos
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
echo ⚠️  ADVERTENCIA: Este script va a:
echo   1. Limpiar todos los nombres de equipos
echo   2. Volver a aplicar los prefijos correctos
echo   3. Puede tardar unos segundos...
echo.
pause

echo.
echo 🔄 Corrigiendo nombres de equipos...
echo.

REM Ejecutar script de corrección
node corregir_nombres.js

if %errorlevel%==0 (
    echo.
    echo ✅ ¡Corrección completada!
    echo.
    echo 📝 Próximos pasos:
    echo    1. Ejecuta: iniciar_servidor.bat
    echo    2. Abre navegador: http://localhost:3335
    echo    3. Presiona: Ctrl+F5 (limpiar caché)
    echo    4. Ve a: Inventario y verifica los nombres
    echo.
) else (
    echo.
    echo ❌ Error durante la corrección
    echo.
)

pause
