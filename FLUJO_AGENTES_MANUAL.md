# Flujo de Enlace de Agentes (Manual)

## 📋 Descripción General

**Nuevo flujo:**
1. Agente envía datos al servidor
2. Admin revisa reportes en la interfaz
3. Admin enlaza manualmente cada reporte con su equipo

**Ventajas:**
- ✅ Control total del administrador
- ✅ Evita enlaces incorrectos automáticos
- ✅ Permite revisar datos antes de guardar
- ✅ Más flexible y seguro

---

## 🔄 Flujo Paso a Paso

### Paso 1: Agente Envía Datos

El agente se ejecuta (manual o automático a las 9 a.m.):

```bash
python agente_inventario.py --ahora
```

**Salida del agente:**
```
✅ Inventario enviado a http://localhost:3335
   Hostname: PC-CRISTOPHER
   CPU: Intel Core i7...
   RAM: 16GB
   ⏳ Esperando enlace manual en la interfaz web...
```

**¿Qué sucede en el servidor?**
- Se guarda un reporte en tabla `agentes_reportes`
- **NO busca automáticamente equipos**
- **NO actualiza especificaciones aún**

---

### Paso 2: Admin Revisa Reportes

En la aplicación web:

1. **Menú** → **"Reportes de Agentes"**
2. Verás una tabla con todos los reportes:

```
Fecha        | Hostname        | Usuario    | Serie Disco | RAM      | Disco    | Equipo | Acciones
2026-07-27   | PC-CRISTOPHER   | cristopher | B8F2C4E5    | 8.5/16GB | 245/476 | —      | 👁️ 🔗
2026-07-26   | PC-JUAN         | juan       | D1K5X9L2    | 4.2/8GB  | 150/256 | —      | 👁️ 🔗
```

---

### Paso 3: Admin Enlaza Reportes

Para cada reporte sin enlazar (⚠️ estado rojo):

1. Click en botón **🔗** (Enlazar)
2. Se abre un selector con todos los equipos **Asignados**:

```
Selecciona el equipo a enlazar:

EQ-0001 - Laptop Cristopher (Laptop)
EQ-0086 - PC Juan (PC)
EQ-0045 - Impresora Xerox (Impresora)

Ingresa el ID del equipo: 
```

3. Ingresa el ID del equipo: `EQ-0001`
4. ✅ Aparece confirmación: "✅ Reporte enlazado correctamente"

**¿Qué sucede en el servidor?**
- Se actualiza `agentes_reportes.equipoId = EQ-0001`
- Se copia la información a `equipos.especificaciones_tecnicas`
- El equipo ahora tiene sus specs actualizadas

---

### Paso 4: Ver Especificaciones

En **Inventario**, el equipo ahora muestra:

1. Click en **💻 Specs**
2. Aparecen todas las especificaciones técnicas:

```
📊 EQUIPO: Laptop Cristopher (EQ-0001)
Tipo: Laptop
Marca/Modelo: Dell Inspiron 15
Serie: B8F2C4E5
Usuario: cristopher

🖥️ ESPECIFICACIONES TÉCNICAS
Reporte: 27/07/2026 14:30

Hostname: PC-CRISTOPHER
SO: Windows-10...
CPU: Intel Core i7-10700K
Usuario Windows: cristopher

💾 MEMORIA RAM
Total: 16.00 GB
Usado: 8.45 GB
Disponible: 7.55 GB
Utilización: 52.8%

💿 DISCO C:/
Total: 476.84 GB
Usado: 245.32 GB
Disponible: 231.52 GB
Utilización: 51.4%
```

---

## 🎯 Estados de Reportes

### ⚠️ Sin Enlazar (Rojo)

```
Estado: Sin asignar
Acciones: 👁️ Ver | 🔗 Enlazar
```

- El reporte llegó pero no tiene equipo asociado
- Esperando que el admin lo enlace

### ✅ Enlazado (Verde)

```
Estado: Asignado a EQ-0001
Acciones: 👁️ Ver | ✂️ Desenlazar
```

- El reporte está enlazado
- Las especificaciones se actualizaron en el equipo
- Si necesitas cambiar, primero desenlaza

---

## 📊 Información de Reportes

Cada reporte contiene:

| Campo | Descripción |
|-------|-------------|
| **Fecha** | Cuándo se ejecutó el agente |
| **Hostname** | Nombre de la computadora (ej: PC-CRISTOPHER) |
| **Usuario** | Usuario de Windows que ejecutó (ej: cristopher) |
| **Serie Disco** | Identificador único del disco (ej: B8F2C4E5) |
| **RAM** | Total / Usado (ej: 8.5/16GB) |
| **Disco** | Total / Usado (ej: 245/476GB) |
| **Equipo** | A qué equipo está enlazado (o —) |

---

## 🔧 Acciones Disponibles

### 👁️ Ver Detalles

Click para ver información completa del reporte:
- Especificaciones de CPU, RAM, Disco
- Porcentaje de utilización
- Timestamp del reporte

### 🔗 Enlazar

Click para asociar el reporte con un equipo:
1. Selecciona de los equipos disponibles
2. El reporte se asigna al equipo
3. Se copian las especificaciones

### ✂️ Desenlazar

Click para desasociar un reporte:
1. Confirma la acción
2. El reporte se queda sin equipo
3. Las especificaciones del equipo se mantienen

---

## 💡 Casos de Uso

### Caso 1: Nuevo Equipo

1. Agente se ejecuta → Reporte guardado
2. Equipo existe en inventario → Admin enlaza
3. ✅ Especificaciones se actualizan automáticamente

### Caso 2: Nuevo Equipo (No existe en inventario)

1. Agente se ejecuta → Reporte guardado
2. Equipo NO existe en inventario
3. Admin primero **crea el equipo** en Inventario
4. Luego **enlaza el reporte** con ese equipo

### Caso 3: Equipo Cambió de Usuario

1. Equipo EQ-0001 antes → Usuario: Juan
2. Ahora → Usuario: Cristopher
3. Agente se ejecuta desde Cristopher
4. Nuevo reporte llega con usuario "cristopher"
5. Admin desenlaza el reporte antiguo
6. Admin enlaza el nuevo reporte con EQ-0001
7. ✅ Especificaciones actualizadas

---

## 📱 Estadísticas

En la parte superior de "Reportes de Agentes" ves:

```
⚠️ Sin enlazar: 3    ✅ Enlazados: 15
```

- Puedes identificar rápidamente qué reportes faltan enlazar
- Ayuda a auditar si todos los agentes han reportado

---

## 🔐 Ventajas de Este Flujo

1. **Control Total**
   - Admin revisa antes de actualizar especificaciones
   - Previene asociaciones incorrectas

2. **Flexibilidad**
   - Equipos pueden cambiar de usuario
   - Desenlazar es fácil si hay error

3. **Auditoría**
   - Se mantiene histórico de reportes
   - Se sabe cuándo se actualizó cada equipo

4. **Seguridad**
   - No hay búsquedas automáticas por usuario (que cambia)
   - Solo datos verificados por el admin se guardan

---

## ❌ Solución de Problemas

### Problema: "No veo el reporte del agente"

1. Verifica que el agente se ejecutó: `python agente_inventario.py --ahora`
2. Verifica conexión con el servidor (no debe mostrar error)
3. Presiona **🔄 Actualizar** en la vista de Reportes

### Problema: "No puedo enlazar porque no aparece el equipo"

1. El equipo debe estar en estado **"Asignado"**
2. Ve a **Inventario** y verifica el estado
3. Si está "Disponible" o "En custodia", cámbialo a "Asignado"
4. Intenta enlazar de nuevo

### Problema: "Enlacé equivocado"

1. Click en **✂️ Desenlazar**
2. Confirma
3. El reporte vuelve a estado "Sin enlazar"
4. Puedes enlazar con otro equipo

---

## 📝 Notas

- ✅ Los reportes se guardan indefinidamente
- ✅ Puedes desenlazar y volver a enlazar cuando quieras
- ✅ Cada enlace actualiza las especificaciones del equipo
- ⚠️ Desenlazar NO borra las especificaciones, solo quita la asociación
