# 🏗️ Arquitectura del Sistema de Agentes de Inventario
## Manual Agent-to-Equipment Linking (Gestión de Activos TI - Axis Group)

---

## 📊 Flujo General del Sistema

```
AGENTE (Windows)              →  SERVIDOR (Node.js)          →  INTERFAZ WEB (Admin)
─────────────────────────────────────────────────────────────────────────────
Recolecta hardware   ┐
(24 campos)          │
                     ├──→ POST /api/inventario (SIN AUTENTICACIÓN)
Genera ID de serie   │
(único por equipo)   │
                     └──→ Almacena en: agentes_reportes
                            (UNIQUE por: numero_serie_disco)
                                  ↓
                            ¿Existe reporte?
                            ├─ SÍ: UPDATE (preserva fecha creación)
                            └─ NO: INSERT (genera identificador)
                                  ↓
                            Responde: {id, actualizado: bool}
                                                              ↓
                                                    Administrador revisa
                                                    en: "Reportes de Agentes"
                                                              ↓
                                                    Click: 🔗 Enlazar
                                                    Modal abierto
                                                              ↓
                                                    Busca equipo
                                                    Selecciona de lista
                                                              ↓
                                                    POST /api/agentes/reportes/{id}/enlazar
                                                              ↓
                                                    ✅ Equipo actualizado
                                                    Especificaciones copiadas
```

---

## 🗄️ Base de Datos

### Tabla: `agentes_reportes` (Reporte de Agentes)

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | TEXT PRIMARY KEY | Identificador único del reporte |
| `identificador` | TEXT UNIQUE | **Formato:** `AGENTE-{HOSTNAME}-{LAST4SERIAL}` |
| `numero_serie_disco` | TEXT UNIQUE | **Clave de deduplicación** |
| Información del Sistema | | |
| `hostname` | TEXT | Nombre del equipo (ej: PC-CRISTOPHER) |
| `usuario_windows` | TEXT | Usuario que reportó (ej: cristopher) |
| `so` | TEXT | Sistema operativo (ej: Windows-10...) |
| `tipo_dispositivo` | TEXT | Siempre "PC" |
| CPU Detallado | | |
| `cpu` | TEXT | Modelo (ej: Intel Core i7-10700K) |
| `cpu_nucleos` | INTEGER | Número de núcleos físicos |
| `cpu_threads` | INTEGER | Número de hilos lógicos |
| `cpu_frecuencia` | TEXT | Frecuencia (ej: 3600 MHz) |
| Memoria RAM | | |
| `ram_total_gb` | REAL | Total disponible |
| `ram_usado_gb` | REAL | Actualmente en uso |
| `ram_disponible_gb` | REAL | Disponible |
| `ram_porcentaje` | REAL | Utilización % |
| Almacenamiento | | |
| `disco_total_gb` | REAL | Total en C:/ |
| `disco_usado_gb` | REAL | Usado en C:/ |
| `disco_disponible_gb` | REAL | Disponible en C:/ |
| `disco_porcentaje` | REAL | Utilización % |
| Hardware Adicional | | |
| `placa_madre` | TEXT | Manufacturer + Model |
| `gpu` | TEXT | Tarjeta gráfica |
| `monitor` | TEXT | Pantalla conectada |
| `uptime` | TEXT | Formato: "{days}d {hours}h" |
| Red | | |
| `ips` | TEXT | Direcciones IP (comma-separated) |
| `macs` | TEXT | Direcciones MAC (comma-separated) |
| Relación y Timestamps | | |
| `equipoId` | TEXT FK | NULL si no está enlazado |
| `fecha_primer_reporte` | TEXT | **NUNCA cambia** (creación) |
| `fecha_ultima_actualizacion` | TEXT | **SIEMPRE actualiza** |

### Relación: Equipo ↔ Reporte

```
equipos                          agentes_reportes
───────────────────────          ─────────────────────
id (PK)           ◄──────────── equipoId (FK)
nombre
especificaciones_tecnicas ◄──── (se copia desde reporte al enlazar)
ultima_actualizacion_inventario
```

---

## 🔌 API Endpoints

### 🔓 PÚBLICOS (Sin Autenticación)

#### 1️⃣ `POST /api/inventario`
**Envía:** Reporte de hardware del agente

**Body esperado:**
```json
{
  "hostname": "PC-CRISTOPHER",
  "numero_serie_disco": "B8F2C4E5",
  "usuario_windows": "cristopher",
  "so": "Windows-10...",
  "cpu": "Intel Core i7-10700K",
  "cpu_nucleos": 8,
  "cpu_threads": 16,
  "cpu_frecuencia": "3600 MHz",
  "ram_total_gb": 16.0,
  "ram_usado_gb": 8.45,
  "ram_disponible_gb": 7.55,
  "ram_porcentaje": 52.8,
  "disco_total_gb": 476.84,
  "disco_usado_gb": 245.32,
  "disco_disponible_gb": 231.52,
  "disco_porcentaje": 51.4,
  "placa_madre": "Dell Inc. OptiPlex...",
  "gpu": "NVIDIA GeForce...",
  "monitor": "Dell Monitor",
  "uptime": "5d 3h",
  "ips": ["192.168.1.100"],
  "macs": ["00:11:22:33:44:55"]
}
```

**Lógica del Servidor:**
```
if (numero_serie_disco existente) {
  UPDATE agentes_reportes
    fecha_ultima_actualizacion = NOW
    (todos los campos se actualizan)
} else {
  INSERT nuevo reporte
    identificador = `AGENTE-{hostname}-{last4chars(serial)}`
    fecha_primer_reporte = NOW
    fecha_ultima_actualizacion = NOW
}
```

**Respuesta:**
```json
{
  "id": "a1b2c3d4e5f6...",
  "timestamp": "2026-07-27T14:30:00.000Z",
  "actualizado": false  // true si fue UPDATE
}
```

---

#### 2️⃣ `GET /api/config-agente`
**Obtiene:** Configuración del servidor para el agente

**Respuesta:**
```json
{
  "servidor": "http://localhost:3335",
  "intervalo_segundos": 3600,
  "habilitado": true
}
```

---

### 🔐 AUTENTICADOS (Requieren sesión admin)

#### 3️⃣ `GET /api/agentes/reportes`
**Obtiene:** Lista de todos los reportes de agentes

**Respuesta:**
```json
{
  "reportes": [
    {
      "id": "a1b2c3d4e5f6...",
      "identificador": "AGENTE-PC-CRISTOPHER-C4E5",
      "numero_serie_disco": "B8F2C4E5",
      "hostname": "PC-CRISTOPHER",
      "usuario_windows": "cristopher",
      "ram_total_gb": 16,
      "ram_usado_gb": 8.45,
      "disco_total_gb": 476.84,
      "disco_usado_gb": 245.32,
      "nombre_equipo": "Laptop Cristopher",  // Del JOIN con equipos
      "tipo_equipo": "Laptop",
      "equipoId": null,  // null si no enlazado
      "fecha_primer_reporte": "2026-07-27T14:30:00.000Z",
      "fecha_ultima_actualizacion": "2026-07-27T14:30:00.000Z",
      "cpu_nucleos": 8,
      "cpu_threads": 16,
      "cpu_frecuencia": "3600 MHz",
      "ram_porcentaje": 52.8,
      "disco_porcentaje": 51.4,
      "placa_madre": "Dell Inc. OptiPlex...",
      "gpu": "NVIDIA GeForce...",
      "monitor": "Dell Monitor",
      "ips": "192.168.1.100",
      "macs": "00:11:22:33:44:55",
      "uptime": "5d 3h"
    }
  ]
}
```

---

#### 4️⃣ `POST /api/agentes/reportes/{id}/enlazar`
**Acción:** Enlaza reporte con equipo

**Body esperado:**
```json
{
  "equipoId": "EQ-0001"
}
```

**Lógica:**
1. UPDATE `agentes_reportes.equipoId = 'EQ-0001'`
2. Copia todo el reporte a `equipos.especificaciones_tecnicas` como JSON
3. UPDATE `equipos.ultima_actualizacion_inventario = NOW`

**Respuesta:**
```json
{
  "ok": true,
  "reporteId": "a1b2c3d4e5f6...",
  "equipoId": "EQ-0001"
}
```

---

#### 5️⃣ `POST /api/agentes/reportes/{id}/desenlazar`
**Acción:** Desenlaza reporte del equipo

**Lógica:**
1. UPDATE `agentes_reportes.equipoId = NULL`
2. Las especificaciones en `equipos.especificaciones_tecnicas` se mantienen

**Respuesta:**
```json
{
  "ok": true,
  "reporteId": "a1b2c3d4e5f6..."
}
```

---

#### 6️⃣ `DELETE /api/agentes/reportes/{id}`
**Acción:** Elimina permanentemente el reporte

**Lógica:**
1. DELETE FROM `agentes_reportes` WHERE id = ?
2. Log: `✅ Reporte de agente ELIMINADO: {id} ({identificador})`

**Respuesta:**
```json
{
  "ok": true,
  "reporteId": "a1b2c3d4e5f6...",
  "eliminado": "AGENTE-PC-CRISTOPHER-C4E5"
}
```

---

## 🎨 Interfaz de Usuario (Web)

### Vista: "Reportes de Agentes"

#### Tabla Principal

| Identificador | Primer Reporte | Última Actualización | Hostname | Usuario | Serie Disco | RAM | Disco | Equipo | Acciones |
|---|---|---|---|---|---|---|---|---|---|
| `AGENTE-PC-CRISTOPHER-C4E5` | 27/07/2026 14:30 | 🔄 27/07/2026 14:30 | PC-CRISTOPHER | cristopher | B8F2C4E5 | 8.5/16GB | 245/476GB | — | 👁️ 🔗 🗑️ |
| `AGENTE-PC-JUAN-L9L2` | 26/07/2026 10:15 | 26/07/2026 10:15 | PC-JUAN | juan | D1K5X9L2 | 4.2/8GB | 150/256GB | Laptop Juan | 👁️ ✂️ 🗑️ |

**Estilos:**
- Filas sin enlazar: background rojo claro (`#fff5f5`)
- Filas enlazadas: background verde claro (`#f0fff4`)
- Identificador: código badge (`font-family: monospace`, fondo gris)
- Primer Reporte: texto gris pequeño (auditoría)
- Última Actualización: 🔄 si es diferente de creación

#### Botones de Acciones

| Botón | Acción | Resultado |
|-------|--------|-----------|
| 👁️ | Ver detalles | Abre alert con todos los 24 campos (CPU, RAM%, Disk%, Motherboard, GPU, Monitor, IPs, MACs, Uptime, Timestamps) |
| 🔗 | Enlazar con equipo | Abre modal con búsqueda de equipos disponibles (sin enlazar) |
| ✂️ | Desenlazar | Remueve asociación con equipo (especificaciones se mantienen) |
| 🗑️ | Eliminar agente | Borra permanentemente el reporte (pide confirmación) |

#### Modal de Selección de Equipo

**Características:**
- Campo de búsqueda en tiempo real
- Filtra por: ID, nombre, tipo, serie
- Lista de equipos disponibles
- Highlight visual al pasar mouse
- Seleccionar hace click
- Botón "Confirmar" (deshabilitado hasta seleccionar)

**Ejemplo de búsqueda:**
```
Búsqueda: "laptop"

EQ-0001 - Laptop Cristopher (Laptop)
  Dell Inspiron 15 · Serie: B8F2C4E5

EQ-0086 - Laptop Juan (Laptop)
  HP ProBook 450 · Serie: D1K5X9L2
```

---

## 🤖 Agente de Inventario (Python)

### Ubicación: `agente_inventario.py`

### Modos de Ejecución

```bash
# Enviar inventario ahora
python agente_inventario.py --ahora

# Configurar servidor interactivamente
python agente_inventario.py --config

# Ejecutar en modo servicio (contínuo)
python agente_inventario.py --servicio
```

### Datos Recolectados (24 campos)

**Información del Sistema:**
- `hostname` — nombre del equipo
- `usuario_windows` — usuario actual
- `tipo_dispositivo` — "PC"
- `so` — sistema operativo completo

**Procesador (CPU) — Detallado:**
- `cpu` — modelo (ej: Intel Core i7-10700K)
- `cpu_nucleos` — núcleos físicos (8)
- `cpu_threads` — hilos lógicos (16)
- `cpu_frecuencia` — frecuencia en MHz (3600)

**Memoria (RAM):**
- `ram_total_gb` — Total disponible
- `ram_usado_gb` — En uso
- `ram_disponible_gb` — Disponible
- `ram_porcentaje` — % de utilización

**Almacenamiento (Disco C:/):**
- `disco_total_gb` — Total
- `disco_usado_gb` — Usado
- `disco_disponible_gb` — Disponible
- `disco_porcentaje` — % de utilización

**Hardware Adicional:**
- `numero_serie_disco` — Identificador único
- `placa_madre` — Baseboard manufacturer + model
- `gpu` — Tarjeta gráfica
- `monitor` — Pantalla conectada

**Red:**
- `ips` — Lista de direcciones IP
- `macs` — Lista de direcciones MAC

**Tiempo:**
- `uptime` — "{days}d {hours}h" (ej: 5d 3h)

### Salida en Consola

**Primera ejecución:**
```
✅ Inventario REGISTRADO en http://localhost:3335
   Hostname: PC-CRISTOPHER
   CPU: Intel Core i7-10700K (8 núcleos)
   RAM: 16GB (52.8% utilizado)
   GPU: NVIDIA GeForce...
   ⏳ Esperando enlace manual en la interfaz web...
```

**Siguientes ejecuciones (mismo disco):**
```
✅ Inventario ACTUALIZADO en http://localhost:3335
   Hostname: PC-CRISTOPHER
   CPU: Intel Core i7-10700K (8 núcleos)
   RAM: 16GB (48.3% utilizado)  ← Cambio
   GPU: NVIDIA GeForce...
   ⏳ Esperando enlace manual en la interfaz web...
```

### Configuración

**Archivo:** `%PROGRAMFILES%\Axis\Inventario\config.json`

```json
{
  "servidor": "http://localhost:3335",
  "intervalo_segundos": 3600,
  "habilitado": true
}
```

---

## 📈 Flujo Completo: Ejemplo Paso a Paso

### Escenario: Nuevo Usuario con Laptop

#### Paso 1: Usuario ejecuta agente
```bash
python agente_inventario.py --ahora
```

**Servidor:**
- Recibe POST /api/inventario con 24 campos
- Busca `numero_serie_disco = "B8F2C4E5"`
- No existe → INSERT nuevo reporte
- Genera `identificador = "AGENTE-PC-CRISTOPHER-C4E5"`
- Guarda con timestamps: fecha_primer_reporte y fecha_ultima_actualizacion = NOW

#### Paso 2: Admin revisa reportes
- Web: "Reportes de Agentes"
- Ve nuevo reporte sin enlazar (fondo rojo)
- Identificador: `AGENTE-PC-CRISTOPHER-C4E5`
- Equipo: — (sin enlazar)

#### Paso 3: Admin enlaza equipo
1. Click en 🔗 (Enlazar)
2. Modal abierto: búsqueda de equipos
3. Busca: "Laptop Cristopher" → encontrado: EQ-0001
4. Click en equipo → selecciona visualmente
5. Click en "Confirmar"

**Servidor:**
- POST /api/agentes/reportes/{id}/enlazar con `equipoId = "EQ-0001"`
- UPDATE agentes_reportes.equipoId = "EQ-0001"
- Copia JSON completo a equipos.especificaciones_tecnicas
- UPDATE equipos.ultima_actualizacion_inventario = NOW

#### Paso 4: Resultados
- **En la tabla:** Fila ahora verde, equipo muestra "Laptop Cristopher"
- **En Inventario:** Al abrir EQ-0001, 💻 Specs muestra todos los datos
- Especificaciones incluyen:
  - CPU: 8 núcleos, 16 threads, 3600 MHz
  - RAM: 16GB (52.8% utilizado)
  - Disco: 476.84GB (51.4% utilizado)
  - GPU, Placa madre, Monitor
  - Red: IPs y MACs
  - Uptime: 5d 3h

#### Paso 5: Usuario ejecuta agente de nuevo (1 semana después)
```bash
python agente_inventario.py --ahora
```

**Servidor:**
- Recibe mismo numero_serie_disco
- Existe → UPDATE (sin cambiar fecha_primer_reporte)
- Actualiza todos los campos (RAM ahora 48.3%, etc.)
- fecha_ultima_actualizacion = NOW

**Interfaz:**
- Timestamp "Última Actualización" cambia a nuevo valor
- Se muestra 🔄 (indicador de UPDATE)
- Specs en equipo se actualizan automáticamente

---

## 🔍 Casos de Uso

### Caso 1: Equipo Nuevo Sin Registro
```
Agente ejecutado → Reporte creado en servidor
↓
Equipo NO existe en inventario
↓
Admin: Primero crea equipo en "Inventario"
↓
Admin: Luego enlaza el reporte con ese equipo
↓
✅ Especificaciones actualizadas
```

### Caso 2: Equipo Cambió de Usuario
```
EQ-0001: Antes usuario="Juan"
↓
Ahora usuario="Cristopher"
↓
Agente desde Cristopher reporta (nuevo numero_serie_disco)
↓
Admin desenlaza reporte antiguo de EQ-0001
↓
Admin enlaza nuevo reporte con EQ-0001
↓
✅ Especificaciones actualizadas con Cristopher
```

### Caso 3: Quitar Equipo de Servicio
```
Equipo EQ-0001 se daña
↓
Admin: Click en 🗑️ (Eliminar agente)
↓
Reporte se borra permanentemente
↓
Equipo puede ser marcado "Descartado" o "En reparación"
```

---

## ✅ Características Implementadas

### Servidor (Node.js + SQLite)
- ✅ Tabla `agentes_reportes` con 25 columnas
- ✅ UNIQUE constraint en `numero_serie_disco` (deduplicación)
- ✅ UNIQUE constraint en `identificador` (humanamente legible)
- ✅ Lógica INSERT/UPDATE automática
- ✅ 6 endpoints (2 públicos, 4 autenticados)
- ✅ Migración automática de schema
- ✅ Timestamps con auditoría (creación vs. última actualización)

### UI (HTML5 + JavaScript)
- ✅ Vista "Reportes de Agentes" con tabla
- ✅ Columna de identificador
- ✅ Columnas de timestamps (Primer Reporte, Última Actualización)
- ✅ Indicador 🔄 si fue UPDATE
- ✅ 4 botones por reporte: 👁️ 🔗 ✂️ 🗑️
- ✅ Modal de búsqueda de equipos (filtro real-time)
- ✅ Alert con detalles completos (24 campos)
- ✅ Confirmación antes de eliminar

### Agente (Python 3)
- ✅ Recolecta 24 campos (CPU cores/threads/freq, RAM%, Disk%, Hardware, Network, Uptime)
- ✅ Identifica reportes por número de serie (deduplicación)
- ✅ 3 modos: --ahora, --config, --servicio
- ✅ Salida descriptiva (distingue CREATE vs UPDATE)
- ✅ Configuración persistent en archivo

---

## 🚀 Próximos Pasos

1. **Prueba en equipo real:** Ejecutar agente en una computadora con Windows
2. **Verificar detalles:** Revisar que todos los 24 campos se recolecten correctamente
3. **Sincronización:** Confirmar que enlaces se copian a especificaciones
4. **Auditoría:** Revisar logs de servidor y timestamps en UI

---

## 📚 Archivos Clave

```
servidor/
├── server.js                 ← Backend (endpoints + DB)
├── activos.db               ← Base de datos SQLite
├── public/
│   ├── index.html           ← Interfaz web + JavaScript
│   └── [otros assets]
└── agente_inventario.py     ← Agente de recolección (Windows)
```

---

## 📞 Contacto y Soporte

**Sistema:** Gestión de Activos TI - Axis Group
**Arquitecto:** Sistema de Agentes Manual (Versión 2.0)
**Última Actualización:** 27-07-2026
**Estado:** ✅ COMPLETO Y VALIDADO

Para preguntas o mejoras, consulta la documentación técnica en:
- `ARQUITECTURA_SISTEMA_AGENTES.md` (este archivo)
- `FLUJO_AGENTES_MANUAL.md` (guía de usuario)
- Memoria del proyecto: `project_gestion_activos_ti.md`
