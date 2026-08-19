# Asociar Equipos del Inventario con el Agente

## 📋 Resumen

El agente de inventario busca automáticamente qué equipo del inventario pertenece a cada computadora mediante:

1. **Número de serie del disco** (primera prioridad)
2. **Nombre del equipo/hostname** (segunda prioridad)
3. **Usuario de Windows** (fallback)

---

## 🔗 **Método 1: Por Número de Serie (RECOMENDADO)**

### Paso 1: Obtener el número de serie del equipo

En el equipo del usuario, ejecuta en **PowerShell (Administrador)**:

```powershell
wmic logicaldisk get volumeserialnumber,name
```

Verás algo como:
```
Name  VolumeSerialNumber
C:    B8F2C4E5
```

### Paso 2: Registrar el equipo en el inventario

En la aplicación **Gestión de Activos TI**:

1. Ve a **Inventario**
2. Click en **+ Registrar equipo** (o **Editar** si ya existe)
3. En el campo **"Serie / IMEI"**, ingresa: `B8F2C4E5`
4. Completa otros datos (Marca, Modelo, Usuario, etc.)
5. **Guardar**

✅ **Ahora:** Cuando el agente se ejecute, encontrará automáticamente este equipo y guardará sus especificaciones.

---

## 🔗 **Método 2: Por Nombre del Equipo**

### Paso 1: Obtener el nombre de la computadora

En el equipo, ejecuta:

```powershell
hostname
```

O también:

```powershell
$env:COMPUTERNAME
```

Verás algo como:
```
PC-CRISTOPHER
```

### Paso 2: Usar el nombre en el inventario

En la aplicación:

1. Ve a **Inventario**
2. Click en **+ Registrar equipo** (o **Editar**)
3. En el campo **"Nombre del equipo"**, ingresa: `PC-CRISTOPHER`
4. **Guardar**

✅ **Ahora:** El agente buscará equipos cuyo nombre contenga `PC-CRISTOPHER`.

---

## 🔗 **Método 3: Por Usuario de Windows (Fallback)**

Si no tienes número de serie ni nombre del equipo registrado:

1. Ve a **Inventario**
2. Click en **Editar** el equipo
3. En **"Usuario actual"**, ingresa el usuario de Windows
4. **Guardar**

⚠️ **Nota:** Este método solo funciona si el equipo está en estado **"Asignado"**.

---

## 🧪 **Probar la Asociación**

### 1. Ejecutar el agente manualmente

En el equipo del usuario:

```bash
python agente_inventario.py --ahora
```

### 2. Verificar en la aplicación

1. Ve a **Inventario**
2. Busca el equipo por nombre
3. Click en **"💻 Specs"**
4. ✅ Deberías ver las especificaciones técnicas

### 3. Ver logs del servidor

En el servidor, verás en la consola:

```
✅ Inventario enviado a http://localhost:3335
```

O si no encuentra el equipo:

```
⚠️  Inventario: No se encontró equipo para hostname=PC-CRISTOPHER, usuario=cristopher
```

---

## 📊 **Orden de Búsqueda**

El agente intenta en este orden:

```
1. ¿Existe equipo con número de serie = número_serie_disco?
   ↓ (si no encontrado)
   
2. ¿Existe equipo cuyo nombre contenga el hostname?
   ↓ (si no encontrado)
   
3. ¿Existe equipo asignado al usuario de Windows?
   ↓ (si no encontrado)
   
❌ No se asoció → logs muestran qué faltó
```

---

## 💡 **Recomendaciones**

### **Mejor práctica:**
- Registra el **número de serie del disco** en el campo "Serie / IMEI"
- Es el identificador más único y confiable
- No depende del nombre de usuario o computadora

### **Alternativa:**
- Registra el **nombre del equipo** exactamente como aparece en Windows
- Usa nombres en mayúscula (ej: `PC-CRISTOPHER`)

### **Evitar:**
- ❌ No confíes solo en usuario de Windows (cambia si la persona se va)
- ❌ No dejes el campo "Serie / IMEI" vacío si puedes

---

## 🔧 **Solucionar Problemas**

### Problema: "No se muestran especificaciones"

1. Verifica que el equipo esté en estado **"Asignado"**
2. Ejecuta manualmente: `python agente_inventario.py --ahora`
3. Comprueba en los logs del servidor

### Problema: "Especificaciones de otro equipo"

1. Verifica que el número de serie sea único
2. No duplicles números de serie en el inventario

### Problema: "El agente no se ejecuta a las 9 a.m."

1. Ve a **Config** → **Configuración del Agente**
2. Verifica la URL del servidor
3. Prueba: `Start-ScheduledTask -TaskName "Axis_Inventario_Diario_9AM"`

---

## 📱 **Datos Sincronizados**

Una vez asociado, el equipo mostrará:

- ✅ Hostname del equipo
- ✅ Sistema Operativo
- ✅ Procesador (CPU)
- ✅ RAM (Total, Usado, Disponible)
- ✅ Disco (Total, Usado, Disponible)
- ✅ Porcentaje de utilización
- ✅ Timestamp del último reporte

---

## 📝 **Ejemplo Completo**

### Equipo: Laptop de Cristopher

**En Windows:**
```powershell
hostname                    → PC-CRISTOPHER
wmic logicaldisk get volumeserialnumber  → B8F2C4E5
$env:USERNAME               → cristopher
```

**En Gestión de Activos TI (Inventario):**

| Campo | Valor |
|-------|-------|
| Nombre | Laptop Cristopher |
| Tipo | Laptop |
| Marca | Dell |
| Modelo | Inspiron 15 |
| Serie / IMEI | **B8F2C4E5** ← Número de disco |
| Usuario | cristopher |
| Estado | Asignado |

✅ **Resultado:** Cuando el agente se ejecuta, encuentra este equipo y guarda sus especificaciones técnicas.
