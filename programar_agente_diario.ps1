# Script para programar la ejecución automática del agente de inventario
# Ejecutar como Administrador
# Uso: powershell -ExecutionPolicy Bypass -File programar_agente_diario.ps1

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Programar Agente de Inventario" -ForegroundColor Cyan
Write-Host "Axis Group - Gestion de Activos TI" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Verificar permisos de administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "❌ Este script requiere permisos de Administrador" -ForegroundColor Red
    Write-Host "Por favor, ejecuta PowerShell como Administrador" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Configurar la tarea programada
$TaskName = "Axis_Inventario_Diario_9AM"
$ScriptPath = "$PSScriptRoot\agente_inventario.py"
$PythonExe = "python.exe"

Write-Host "Verificando archivo del agente..." -ForegroundColor Yellow
if (-not (Test-Path $ScriptPath)) {
    Write-Host "❌ No se encontró: $ScriptPath" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host "✅ Archivo encontrado: $ScriptPath" -ForegroundColor Green
Write-Host ""

# Verificar si la tarea ya existe
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "La tarea programada ya existe. Se va a actualizar..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false | Out-Null
}

# Crear la acción de la tarea
$action = New-ScheduledTaskAction -Execute $PythonExe -Argument "$ScriptPath --ahora"

# Crear el trigger (todos los días a las 9 a.m.)
$trigger = New-ScheduledTaskTrigger -Daily -At 09:00AM

# Configuración adicional de la tarea
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

# Crear la descripción
$description = "Ejecuta el agente de inventario de Axis Group diariamente a las 9 a.m."

# Registrar la tarea
try {
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    Register-ScheduledTask -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description $description `
        -Force | Out-Null

    Write-Host "✅ Tarea programada creada exitosamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 DETALLES:" -ForegroundColor Cyan
    Write-Host "  Nombre: $TaskName"
    Write-Host "  Horario: 09:00 AM todos los días"
    Write-Host "  Script: $ScriptPath"
    Write-Host "  Usuario: SYSTEM"
    Write-Host ""
    Write-Host "⏱️  La próxima ejecución será:" -ForegroundColor Yellow

    $nextRun = (Get-ScheduledTask -TaskName $TaskName | Get-ScheduledTaskInfo).NextRunTime
    if ($nextRun) {
        Write-Host "  $nextRun" -ForegroundColor Yellow
    } else {
        Write-Host "  (se calcula después del primer ciclo)" -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "💡 Para ver detalles de la tarea:" -ForegroundColor Cyan
    Write-Host "  Get-ScheduledTask -TaskName '$TaskName' | Select-Object *" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 Para probar la ejecución manual:" -ForegroundColor Cyan
    Write-Host "  Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Host "❌ Error al crear la tarea programada:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host "✅ ¡Configuración completada!" -ForegroundColor Green
Read-Host "Presiona Enter para salir"
