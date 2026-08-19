# ============================================================================
#  Get-EquipoSpecs.ps1
#  Axis Group - Gestion de Activos TI
#
#  Recolecta las especificaciones del equipo (marca, modelo, numero de serie,
#  procesador, memoria RAM, almacenamiento) y las exporta a un archivo JSON
#  que luego se importa en la app "Gestion de Activos TI" desde la pestana
#  "Backup / Importar specs" -> "Importar archivo de specs (JSON)".
#
#  USO:
#    1. Clic derecho sobre el archivo -> "Ejecutar con PowerShell"
#       (o abrir PowerShell y ejecutar:  .\Get-EquipoSpecs.ps1 )
#    2. Si Windows bloquea la ejecucion de scripts, ejecutar antes (una vez):
#       Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#    3. El script genera un archivo  specs_<NOMBREEQUIPO>_<fecha>.json
#       en la misma carpeta donde se ejecuta el script.
#    4. Enviar ese archivo al area de TI o importarlo directamente en la app.
# ============================================================================

$ErrorActionPreference = 'SilentlyContinue'

Write-Host "Recolectando especificaciones del equipo..." -ForegroundColor Cyan

# --- Sistema / Marca / Modelo ---
$cs = Get-CimInstance -ClassName Win32_ComputerSystem
$bios = Get-CimInstance -ClassName Win32_BIOS
$os = Get-CimInstance -ClassName Win32_OperatingSystem

$marca = $cs.Manufacturer
$modelo = $cs.Model
$serie = $bios.SerialNumber
$nombreEquipo = $env:COMPUTERNAME
$usuario = $env:USERNAME

# --- Tipo de equipo (Laptop vs PC de escritorio) ---
# PCSystemType: 1 = Desktop, 2 = Mobile/Laptop, 3 = Workstation, etc.
$tieneBateria = Get-CimInstance -ClassName Win32_Battery
$tipo = 'PC'
if ($tieneBateria -or $cs.PCSystemType -eq 2) {
    $tipo = 'Laptop'
}

# --- Procesador ---
$cpu = Get-CimInstance -ClassName Win32_Processor | Select-Object -First 1
$procesador = $cpu.Name -replace '\s+', ' '

# --- Memoria RAM ---
$ramBytes = ($cs.TotalPhysicalMemory)
$ramGB = if ($ramBytes) { [math]::Round($ramBytes / 1GB, 0) } else { $null }
$ramTexto = if ($ramGB) { "$ramGB GB" } else { "" }

# --- Almacenamiento (todos los discos fisicos) ---
$discos = Get-CimInstance -ClassName Win32_DiskDrive
$discosTexto = @()
foreach ($d in $discos) {
    $tamGB = [math]::Round($d.Size / 1GB, 0)
    $modeloDisco = $d.Model
    $discosTexto += "$modeloDisco ($tamGB GB)"
}
$almacenamiento = $discosTexto -join ' + '

# --- Resultado ---
$resultado = [PSCustomObject]@{
    tipo            = $tipo
    marca           = $marca
    modelo          = $modelo
    serie           = $serie
    procesador      = $procesador
    ram             = $ramTexto
    almacenamiento  = $almacenamiento
    sistemaOperativo = $os.Caption
    nombreEquipo    = $nombreEquipo
    usuario         = $usuario
    fechaRelevamiento = (Get-Date -Format 'yyyy-MM-dd')
}

# La app espera un arreglo de objetos (aunque sea de uno solo)
$json = ConvertTo-Json -InputObject @($resultado) -Depth 4

$fecha = Get-Date -Format 'yyyyMMdd'
$nombreArchivo = "specs_${nombreEquipo}_${fecha}.json"
$rutaSalida = Join-Path -Path (Get-Location) -ChildPath $nombreArchivo

$json | Out-File -FilePath $rutaSalida -Encoding UTF8

Write-Host ""
Write-Host "Especificaciones recolectadas:" -ForegroundColor Green
Write-Host "  Tipo:           $tipo"
Write-Host "  Marca:          $marca"
Write-Host "  Modelo:         $modelo"
Write-Host "  Serie:          $serie"
Write-Host "  Procesador:     $procesador"
Write-Host "  RAM:            $ramTexto"
Write-Host "  Almacenamiento: $almacenamiento"
Write-Host ""
Write-Host "Archivo generado: $rutaSalida" -ForegroundColor Yellow
Write-Host "Importa este archivo en la app (pestana 'Backup / Importar specs')." -ForegroundColor Yellow
