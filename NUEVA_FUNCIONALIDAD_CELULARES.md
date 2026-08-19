# Nueva Funcionalidad - Asignación de Celulares con Números Telefónicos

## ✅ Cambios Implementados

### 1. Base de Datos
- **Nueva columna:** `telefonoAsignado` en tabla `equipos`
- **Migración automática:** Se crea al iniciar el servidor si no existe
- Almacena números telefónicos asignados a celulares

### 2. Interfaz Web (Frontend)

#### Botón "Asignar Teléfono" en Inventario
- Aparece en la tabla de Inventario para celulares asignados
- Muestra `[asignar teléfono]` si no tiene número
- Muestra `[ver teléfono]` si ya tiene número asignado
- Al hacer clic, abre modal para ingresar/editar el número

#### Modal de Asignación
- Título: "Asignar número telefónico"
- Muestra información del celular (ID, marca, modelo, usuario, área)
- Campo para ingresar número (formato libre)
- Botón para guardar
- Confirmación visual cuando se guarda

#### Nueva Pestaña: "📱 Directorio de Celulares"
- Listado de todos los celulares asignados con números registrados
- **Funcionalidades:**
  - Búsqueda en tiempo real (por número, usuario, área, marca)
  - Estadísticas:
    - Total de celulares con teléfono
    - Celulares sin teléfono asignado
    - Porcentaje de cobertura
  - Tabla con columnas:
    - Teléfono (resaltado en monospace)
    - Usuario asignado
    - Área del trabajador
    - Sede
    - Nombre del equipo
    - Marca y modelo
  - Botón de edición para cada registro

#### Exportar Directorio
- Botón "Exportar Directorio (CSV)"
- Genera archivo con todos los celulares asignados y sus números
- Nombre: `directorio_celulares_YYYY-MM-DD.csv`

### 3. Endpoints del Servidor

#### POST /api/asignar-celular
Asigna o actualiza el número telefónico de un celular

**Parámetros:**
```json
{
  "equipoId": "EQ-0001",
  "numeroTelefonico": "+51 9 1234 5678"
}
```

**Respuesta:**
```json
{
  "ok": true,
  "equipoId": "EQ-0001",
  "numeroTelefonico": "+51 9 1234 5678"
}
```

#### GET /api/directorio-celulares
Obtiene listado de celulares con números asignados

**Respuesta:**
```json
{
  "celulares": [
    {
      "id": "EQ-0001",
      "nombre": "CEL-001",
      "marca": "Samsung",
      "modelo": "A12",
      "usuarioActual": "Juan Pérez",
      "area": "Ventas",
      "sede": "LIMA",
      "telefonoAsignado": "+51 9 1234 5678"
    },
    ...
  ],
  "total": 45
}
```

#### GET /api/directorio-celulares/export-csv
Exporta el directorio en formato CSV

#### GET /api/stats-celulares
Estadísticas de celulares

**Respuesta:**
```json
{
  "total": 120,
  "conTel": 45,
  "sinTel": 75,
  "porcentaje": 38
}
```

---

## 📋 Cómo Usar

### Asignar Número Telefónico

1. **Opción A: Desde Inventario**
   - Ve a la pestaña "Inventario"
   - Busca un celular en estado "Asignado"
   - En la columna de acciones, haz clic en "[asignar teléfono]"
   - Ingresa el número telefónico
   - Haz clic en "Guardar número telefónico"

2. **Opción B: Desde Directorio**
   - Ve a la pestaña "📱 Directorio de Celulares"
   - Busca el celular en la tabla
   - Haz clic en "[editar]"
   - Actualiza el número
   - Guarda

### Ver Directorio Completo

1. Ve a la pestaña "📱 Directorio de Celulares"
2. Ve el listado actualizado con:
   - Estadísticas (celulares con/sin teléfono)
   - Tabla ordenada por número telefónico
3. Usa la búsqueda para filtrar por:
   - Número telefónico
   - Nombre del usuario
   - Área de trabajo
   - Marca del equipo

### Exportar Directorio

1. Ve a "📱 Directorio de Celulares"
2. Haz clic en "Exportar Directorio (CSV)"
3. Selecciona dónde guardar el archivo
4. Archivo descargado: `directorio_celulares_2026-07-27.csv`

---

## 🔍 Formatos de Número Telefónico

El campo acepta cualquier formato:
- ✅ `+51 9 1234 5678` (con espacios)
- ✅ `9 1234 5678` (sin código país)
- ✅ `+51-9-1234-5678` (con guiones)
- ✅ `919234567` (solo dígitos)

---

## 📊 Estadísticas en el Directorio

En la pestaña "📱 Directorio de Celulares" aparecen tres tarjetas:

| Stat | Descripción |
|------|-------------|
| **Con teléfono** | Cantidad de celulares asignados que tienen número registrado |
| **Sin teléfono** | Cantidad de celulares asignados sin número aún |
| **Cobertura** | Porcentaje de celulares con número vs total asignado |

Ejemplo:
```
Con teléfono: 45
Sin teléfono: 75
Cobertura: 38%
```

---

## 💾 Archivo CSV Exportado

El archivo de directorio contiene columnas:

```
ID,Nombre,Marca,Modelo,Usuario Actual,Área,Número Telefónico
CEL-001,Samsung,A12,Juan Pérez,Ventas,+51 9 1234 5678
CEL-002,iPhone,12,María González,Marketing,+51 9 2345 6789
```

---

## 🔄 Próximas Mejoras Posibles

- [ ] Importar números desde CSV
- [ ] Validación de formato de teléfono
- [ ] Historial de cambios de teléfono
- [ ] Alertas si un celular pierde asignación
- [ ] Sincronización con directorio AD/LDAP

---

## ⚠️ Notas

1. **Cambio de columna en BD:**
   - Se agregó `nombre` y `telefonoAsignado` a la tabla `equipos`
   - No afecta datos existentes

2. **Compatibilidad:**
   - Works con todos los navegadores modernos
   - Compatible con CSV imports en Excel, Google Sheets

3. **Sincronización:**
   - Los cambios se sincronizan automáticamente entre dispositivos
   - Actualiza cada 20 segundos

---

**Implementación completada.** ✅
