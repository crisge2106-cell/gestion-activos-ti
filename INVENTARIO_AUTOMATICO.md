# Inventario Automático - Agente de Especificaciones Técnicas

## 📋 Descripción

El agente de inventario recolecta automáticamente información técnica de los equipos Windows y la envía al servidor cada día a las 9 a.m. Estos datos se guardan en un único campo JSON y se visualizan formateados en la interfaz.

## 🚀 Configuración Inicial

### 1. Instalar el Agente (Primera vez)

```bash
cd "Ruta\del\Proyecto\Gestion de activos TI"
instalador_agente.bat
```

O manualmente:
```bash
python -m pip install psutil requests --break-system-packages
```

### 2. Configurar el Servidor Destino

```bash
agente_inventario.py --config
```

Ingresa:
- Servidor: `http://localhost:3335` (o tu IP/URL del servidor)
- Intervalo: `3600` (1 hora en modo prueba)

### 3. Programar Ejecución Diaria a las 9 a.m.

**⚠️ Requiere permisos de Administrador**

```powershell
# Abre PowerShell como Administrador y ejecuta:
powershell -ExecutionPolicy Bypass -File programar_agente_diario.ps1
```

## 📊 Datos Recolectados

El agente recolecta automáticamente:

| Campo | Ejemplo |
|-------|---------|
| **Hostname** | PC-CRISTOPHER |
| **SO** | Windows 10 Pro |
| **CPU** | Intel Core i7-10700K @ 3.80GHz |
| **RAM Total** | 16.00 GB |
| **RAM Usado** | 8.45 GB |
| **RAM Disponible** | 7.55 GB |
| **Disco Total** | 476.84 GB |
| **Disco Usado** | 245.32 GB |
| **Disco Disponible** | 231.52 GB |
| **Usuario Windows** | cristopher |

## 🔍 Ver Especificaciones Técnicas

### Desde la tabla de Inventario

1. Ve a **"Inventario"** en el menú
2. Encuentra el equipo en la tabla
3. Click en **"specs"** en la columna de acciones
4. Se abre un modal con:
   - Información general del equipo
   - Especificaciones técnicas (RAM, CPU, Disco)
   - Fecha del último reporte
   - Porcentaje de utilización

### Desde la vista de Últimos Inventarios

1. Ve a **"Últimos Inventarios"** en el menú
2. Verás una tabla con los últimos 50 reportes
3. Click en **"ver"** para detalles completos del reporte

## ⚙️ Estructura de Datos

Las especificaciones se guardan en un campo JSON `especificaciones_tecnicas` en la tabla de equipos:

```json
{
  "hostname": "PC-CRISTOPHER",
  "so": "Windows-10-10.0.19042-SP0-x86_64",
  "cpu": "Intel Core i7-10700K @ 3.80GHz",
  "ram_total_gb": 16.00,
  "ram_usado_gb": 8.45,
  "ram_disponible_gb": 7.55,
  "disco_total_gb": 476.84,
  "disco_usado_gb": 245.32,
  "disco_disponible_gb": 231.52,
  "usuario_windows": "cristopher",
  "timestamp": "2026-07-27T14:30:00.000Z"
}
```

## 📅 Programación Automática

### Ver Tareas Programadas

```powershell
Get-ScheduledTask -TaskName "Axis_Inventario_Diario_9AM"
```

### Ejecutar Manualmente

```powershell
Start-ScheduledTask -TaskName "Axis_Inventario_Diario_9AM"
```

### Cambiar Horario

1. Abre el Planificador de Tareas (Task Scheduler)
2. Busca "Axis_Inventario_Diario_9AM"
3. Haz clic derecho → Propiedades
4. Ve a "Desencadenadores" → Editar
5. Cambia la hora

### Desactivar la Tarea

```powershell
Disable-ScheduledTask -TaskName "Axis_Inventario_Diario_9AM"
```

## 🔧 Troubleshooting

### El agente no se ejecuta a las 9 a.m.

1. Verifica que la tarea esté activa:
   ```powershell
   Get-ScheduledTask -TaskName "Axis_Inventario_Diario_9AM" | Select-Object State
   ```
   
2. Revisa si Python está en PATH:
   ```powershell
   python --version
   ```
   
3. Prueba ejecutar manualmente:
   ```bash
   python agente_inventario.py --ahora
   ```

### No se guardan las especificaciones

1. Verifica que el usuario Windows coincida con el registrado en equipos
2. El equipo debe estar en estado "Asignado"
3. Comprueba la conexión con el servidor

### Ver logs del servidor

En la carpeta del proyecto, el servidor guarda:
- Reportes en tabla `inventario_reportes`
- Especificaciones en tabla `equipos` (columna `especificaciones_tecnicas`)

## 📱 Modos de Operación

### Prueba Manual (Ahora)
```bash
python agente_inventario.py --ahora
```

### Modo Interactivo
```bash
python agente_inventario.py
```

### Modo Servicio (Continuo)
```bash
python agente_inventario.py --servicio
```

## 🔐 Seguridad

- El agente se ejecuta con permisos del SYSTEM
- Los datos se transmiten por HTTP (considera HTTPS en producción)
- Los reportes se guardan en la base de datos del servidor

## 📝 Notas

- ⏰ La ejecución a las 9 a.m. es en la zona horaria del servidor
- 📊 Los últimos 50 reportes se muestran en la vista de inventarios
- 💾 Los datos se guardan indefinidamente en `inventario_reportes`
- 🔄 Las especificaciones se actualizan cada vez que se ejecuta el agente
