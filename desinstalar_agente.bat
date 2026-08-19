@echo off
REM ============================================================================
REM Desinstalador del Agente de Inventario - Axis Group
REM ============================================================================

setlocal enabledelayedexpansion

cls
echo.
echo ============================================================================
echo  Desinstalador del Agente de Inventario - Axis Group
echo ============================================================================
echo.

REM Verificar si se ejecuta como admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Este script debe ejecutarse como Administrador
    echo.
    pause
    exit /b 1
)

echo ✅ Se ejecuta como Administrador
echo.

set INSTALL_DIR=%PROGRAMFILES%\Axis\Inventario

echo 🔍 Buscando servicio de Axis Inventario...
echo.

REM Verificar si el servicio existe
sc query AxisInventario >nul 2>&1
if %errorlevel% equ 0 (
    echo ℹ️  Servicio encontrado. Deteniendo...
    net stop AxisInventario >nul 2>&1
    echo ✅ Servicio detenido
    echo.

    echo 🗑️  Eliminando servicio...
    sc delete AxisInventario >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Servicio eliminado
    ) else (
        echo ⚠️  Advertencia: No se pudo eliminar el servicio
    )
) else (
    echo ℹ️  Servicio no encontrado
)

echo.
echo 🗑️  Eliminando archivos de instalación...
if exist "%INSTALL_DIR%" (
    rmdir /s /q "%INSTALL_DIR%" >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Directorio %INSTALL_DIR% eliminado
    ) else (
        echo ⚠️  No se pudo eliminar %INSTALL_DIR%
        echo    Intenta eliminarlo manualmente
    )
) else (
    echo ℹ️  Directorio de instalación no encontrado
)

echo.
echo ============================================================================
echo ✅ ¡Desinstalación completada!
echo ============================================================================
echo.
echo ℹ️  Se han eliminado:
echo    - El servicio de Windows 'AxisInventario'
echo    - Los archivos de instalación
echo.
pause
