# ============================================================================
# Script PowerShell para instalar/desinstalar servicio de Agente de Inventario
# Ejecutar como Administrador
# ============================================================================

param(
    [ValidateSet("instalar", "desinstalar", "estado")]
    [string]$Accion = "instalar"
)

# Verificar permisos de administrador
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERROR: Este script debe ejecutarse como Administrador" -ForegroundColor Red
    Write-Host ""
    Write-Host "Haz clic derecho en PowerShell y selecciona 'Ejecutar como administrador'"
    exit 1
}

$InstallDir = "$env:ProgramFiles\Axis\Inventario"
$ServiceName = "AxisInventario"
$DisplayName = "Axis - Agente de Inventario"
$PythonScript = "$InstallDir\agente_inventario.py"

# ============================================================================
# INSTALAR
# ============================================================================
function Instalar {
    Write-Host ""
    Write-Host "============================================================================"
    Write-Host "  Instalador del Agente de Inventario - Axis Group"
    Write-Host "============================================================================"
    Write-Host ""

    # Copiar archivos
    Write-Host "📁 Creando directorio de instalación..."
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }
    Write-Host "✅ Directorio: $InstallDir"
    Write-Host ""

    # Copiar agente_inventario.py
    $ScriptOrigen = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "agente_inventario.py"
    if (-not (Test-Path $ScriptOrigen)) {
        Write-Host "❌ ERROR: No se encontró agente_inventario.py" -ForegroundColor Red
        exit 1
    }

    Write-Host "📦 Copiando agente_inventario.py..."
    Copy-Item $ScriptOrigen $PythonScript -Force
    Write-Host "✅ Copiado"
    Write-Host ""

    # Verificar Python
    Write-Host "🐍 Verificando Python..."
    $pythonPath = (Get-Command python -ErrorAction SilentlyContinue).Source
    if (-not $pythonPath) {
        Write-Host "❌ ERROR: Python no está instalado o no está en el PATH" -ForegroundColor Red
        Write-Host ""
        Write-Host "Descarga Python desde https://www.python.org/downloads/"
        Write-Host "IMPORTANTE: Marca 'Add Python to PATH' durante la instalación"
        exit 1
    }
    Write-Host "✅ Python encontrado:"
    python --version
    Write-Host ""

    # Instalar dependencias
    Write-Host "📚 Instalando dependencias Python..."
    & python -m pip install -q psutil requests 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependencias instaladas"
    } else {
        Write-Host "⚠️  Advertencia: Hubo un problema con las dependencias"
        Write-Host "    Intenta: pip install psutil requests"
    }
    Write-Host ""

    # Crear config.json
    Write-Host "⚙️  Creando configuración..."
    $configPath = "$InstallDir\config.json"
    $config = @{
        servidor = "http://localhost:3335"
        intervalo_segundos = 3600
        habilitado = $true
    }
    $config | ConvertTo-Json | Set-Content $configPath
    Write-Host "✅ Configuración: $configPath"
    Write-Host ""

    # Verificar si el servicio ya existe
    $servicioExistente = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($servicioExistente) {
        Write-Host "ℹ️  Servicio ya existe. Actualizando..."
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        Remove-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }

    # Crear servicio
    Write-Host "🔧 Creando servicio de Windows..."
    $arguments = "-u `"$PythonScript`" --servicio"
    New-Service -Name $ServiceName `
                -DisplayName $DisplayName `
                -BinaryPathName "`"$pythonPath`" $arguments" `
                -StartupType Automatic `
                -Description "Agente de inventario que reporta hardware y disponibilidad de equipos" `
                -ErrorAction SilentlyContinue | Out-Null

    Write-Host "✅ Servicio registrado"
    Write-Host ""

    # Iniciar servicio
    Write-Host "🚀 Iniciando servicio..."
    Start-Service -Name $ServiceName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    $estado = (Get-Service -Name $ServiceName).Status
    Write-Host "✅ Estado: $estado"
    Write-Host ""

    Write-Host "============================================================================"
    Write-Host "✅ ¡Instalación completada!"
    Write-Host "============================================================================"
    Write-Host ""
    Write-Host "📍 Ubicación de archivos: $InstallDir"
    Write-Host ""
    Write-Host "🌐 Servidor configurado en:"
    Write-Host "   http://localhost:3335"
    Write-Host ""
    Write-Host "📝 Para cambiar el servidor:"
    Write-Host "   Edita: $configPath"
    Write-Host ""
    Write-Host "📊 Comandos útiles:"
    Write-Host "   Ver estado:   Get-Service $ServiceName"
    Write-Host "   Iniciar:      Start-Service $ServiceName"
    Write-Host "   Detener:      Stop-Service $ServiceName"
    Write-Host ""
}

# ============================================================================
# DESINSTALAR
# ============================================================================
function Desinstalar {
    Write-Host ""
    Write-Host "============================================================================"
    Write-Host "  Desinstalador del Agente de Inventario"
    Write-Host "============================================================================"
    Write-Host ""

    # Detener servicio
    $servicio = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($servicio) {
        Write-Host "🛑 Deteniendo servicio..."
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        Write-Host "✅ Servicio detenido"
        Write-Host ""

        # Eliminar servicio
        Write-Host "🗑️  Eliminando servicio..."
        Remove-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
        Write-Host "✅ Servicio eliminado"
    } else {
        Write-Host "ℹ️  Servicio no encontrado"
    }
    Write-Host ""

    # Eliminar archivos
    Write-Host "🗑️  Eliminando archivos..."
    if (Test-Path $InstallDir) {
        Remove-Item -Path $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✅ Directorio eliminado"
    }
    Write-Host ""

    Write-Host "============================================================================"
    Write-Host "✅ ¡Desinstalación completada!"
    Write-Host "============================================================================"
    Write-Host ""
}

# ============================================================================
# ESTADO
# ============================================================================
function Estado {
    Write-Host ""
    Write-Host "Estado del Agente de Inventario:"
    Write-Host ""

    $servicio = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($servicio) {
        Write-Host "✅ Servicio: $($servicio.Status)"
        Write-Host "   Nombre: $($servicio.Name)"
        Write-Host "   Display: $($servicio.DisplayName)"
        Write-Host ""

        if (Test-Path "$InstallDir\config.json") {
            Write-Host "⚙️  Configuración:"
            $config = Get-Content "$InstallDir\config.json" | ConvertFrom-Json
            Write-Host "   Servidor: $($config.servidor)"
            Write-Host "   Intervalo: $($config.intervalo_segundos)s"
            Write-Host "   Habilitado: $($config.habilitado)"
        }
    } else {
        Write-Host "❌ Servicio no está instalado"
        Write-Host ""
        Write-Host "Para instalar, ejecuta: .\setup_servicio.ps1 -Accion instalar"
    }
    Write-Host ""
}

# ============================================================================
# PRINCIPAL
# ============================================================================
switch ($Accion) {
    "instalar" { Instalar }
    "desinstalar" { Desinstalar }
    "estado" { Estado }
    default { Write-Host "Acción no reconocida: $Accion" }
}
