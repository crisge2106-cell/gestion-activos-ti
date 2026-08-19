@echo off
REM ============================================================================
REM Instalador del Agente de Inventario - Axis Group
REM ============================================================================

setlocal enabledelayedexpansion

cls
echo.
echo ============================================================================
echo  Instalador del Agente de Inventario - Axis Group
echo ============================================================================
echo.

REM Verificar si se ejecuta como admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Este script debe ejecutarse como Administrador
    echo.
    echo Por favor:
    echo 1. Haz clic derecho en este archivo
    echo 2. Selecciona "Ejecutar como administrador"
    echo.
    pause
    exit /b 1
)

echo ✅ Se ejecuta como Administrador
echo.

REM Crear directorio de instalación
set INSTALL_DIR=%PROGRAMFILES%\Axis\Inventario
echo 📁 Directorio de instalación: %INSTALL_DIR%
echo.

if not exist "%INSTALL_DIR%" (
    echo 🔨 Creando directorio...
    mkdir "%INSTALL_DIR%" >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ No se pudo crear el directorio
        pause
        exit /b 1
    )
    echo ✅ Directorio creado
) else (
    echo ℹ️  Directorio ya existe
)
echo.

REM Copiar el script Python
echo 📦 Copiando agente_inventario.py...
if not exist "%~dp0agente_inventario.py" (
    echo ❌ ERROR: No se encontró agente_inventario.py en esta carpeta
    pause
    exit /b 1
)

copy "%~dp0agente_inventario.py" "%INSTALL_DIR%\agente_inventario.py" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ No se pudo copiar el archivo
    pause
    exit /b 1
)
echo ✅ Agente copiado
echo.

REM Verificar Python
echo 🐍 Verificando Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Python no está instalado o no está en el PATH
    echo.
    echo Por favor:
    echo 1. Descarga Python desde https://www.python.org/downloads/
    echo 2. Instálalo marcando "Add Python to PATH"
    echo 3. Vuelve a ejecutar este script
    echo.
    pause
    exit /b 1
)

echo ✅ Python encontrado:
python --version
echo.

REM Instalar dependencias
echo 📚 Instalando dependencias Python...
echo.
pip install psutil requests --quiet
if %errorlevel% neq 0 (
    echo ⚠️  Advertencia: Hubo un problema instalando dependencias
    echo    Puedes intentarlo manualmente con:
    echo    pip install psutil requests
    echo.
)
echo ✅ Dependencias verificadas
echo.

REM Crear archivo de configuración por defecto
echo ⚙️  Creando configuración por defecto...
(
    echo {
    echo   "servidor": "http://localhost:3335",
    echo   "intervalo_segundos": 3600,
    echo   "habilitado": true
    echo }
) > "%INSTALL_DIR%\config.json"
echo ✅ Configuración creada en: %INSTALL_DIR%\config.json
echo.

REM Opción de instalar como servicio
echo.
echo ============================================================================
echo Opciones de instalación:
echo ============================================================================
echo.
echo 1. Solo copiar el agente (ejecutar manualmente)
echo 2. Instalar como servicio de Windows (se ejecuta automáticamente)
echo.

set /p OPCION="Selecciona una opción (1 o 2): "

if "%OPCION%"=="2" goto :INSTALAR_SERVICIO
if "%OPCION%"=="1" goto :SOLO_COPIAR

echo ❌ Opción inválida
goto :FIN

:INSTALAR_SERVICIO
echo.
echo 🔧 Instalando como servicio de Windows...
echo.

REM Crear script .vbs para registrar el servicio
set VBS_FILE=%INSTALL_DIR%\crear_servicio.vbs
(
    echo CreateObject("WScript.Shell"^).Run "powershell.exe -Command ""$path='%INSTALL_DIR%\agente_inventario.py'; $python='python'; $cmd='$python ' + $path + ' --servicio'; New-Service -Name AxisInventario -DisplayName 'Axis - Agente de Inventario' -BinaryPathName 'python -u %INSTALL_DIR%\agente_inventario.py --servicio' -StartupType Automatic -Description 'Agente de inventario que reporta hardware y disponibilidad de equipos' -ea SilentlyContinue; Start-Service AxisInventario"", 0"
) > "%VBS_FILE%"

REM Usar PowerShell para crear el servicio (más confiable)
powershell -Command "try { if (-not (Get-Service AxisInventario -ErrorAction SilentlyContinue)) { New-Service -Name AxisInventario -DisplayName 'Axis - Agente de Inventario' -BinaryPathName 'python -u %INSTALL_DIR%\agente_inventario.py --servicio' -StartupType Automatic -Description 'Agente de inventario que reporta hardware' } else { Write-Output 'Servicio ya existe' } } catch { Write-Error $_ }"

if %errorlevel% equ 0 (
    echo ✅ Servicio registrado como 'AxisInventario'
    echo.
    echo ℹ️  El servicio se iniciará automáticamente con Windows.
    echo.
    echo 📝 Comandos útiles:
    echo    - Ver estado: Get-Service AxisInventario
    echo    - Iniciar:    Start-Service AxisInventario
    echo    - Detener:    Stop-Service AxisInventario
    echo.
) else (
    echo ⚠️  No se pudo crear el servicio usando PowerShell
    echo    Intenta ejecutar como administrador en PowerShell:
    echo    New-Service -Name AxisInventario -DisplayName 'Axis Inventario' ^
    echo      -BinaryPathName 'python -u %INSTALL_DIR%\agente_inventario.py --servicio' ^
    echo      -StartupType Automatic
)

goto :FIN

:SOLO_COPIAR
echo.
echo ✅ Agente copiado en: %INSTALL_DIR%
echo.
echo 📝 Para ejecutar manualmente:
echo    python "%INSTALL_DIR%\agente_inventario.py" --ahora
echo.
echo 📝 Para configurar el servidor:
echo    python "%INSTALL_DIR%\agente_inventario.py" --config
echo.
echo 📝 Para ejecutar continuamente (cada hora):
echo    python "%INSTALL_DIR%\agente_inventario.py" --servicio
echo.

:FIN
echo.
echo ============================================================================
echo ✅ ¡Instalación completada!
echo ============================================================================
echo.
echo 📍 Archivos en: %INSTALL_DIR%
echo.
echo 🌐 Asegúrate de que el servidor esté configurado correctamente:
echo    - Por defecto: http://localhost:3335
echo    - Edita %INSTALL_DIR%\config.json para cambiar el servidor
echo.
pause
