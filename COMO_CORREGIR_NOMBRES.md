# Cómo Corregir los Nombres de Equipos

## Problemas Identificados ❌

1. **Todos los equipos tienen prefijo "EQP"** en lugar del prefijo correcto según su tipo
   - Deberían ser: LPT-, CEL-, IMP-, ACC-, SCA-, etc.

2. **Equipos con nombre tienen un cero adicional**
   - Ejemplo: `LPT-040` aparece como `LPT-0040`

## Causa del Problema

La tabla `equipos` en la base de datos no tenía la columna `nombre` desde el inicio. Se agregó mediante una migración en el servidor, que automáticamente creó nombres genéricos `Equipo-{id}`. El script anterior intentó actualizar pero no funcionó correctamente.

## Solución

Se ha creado un **script de corrección completo** que:

1. ✅ Limpia todos los nombres
2. ✅ Aplica los 179 nombres del Excel correctamente
3. ✅ Auto-genera nombres con prefijos correctos para el resto
4. ✅ Verifica que todo se guardó correctamente

---

## Instrucciones de Ejecución

### Paso 1: Detener el servidor

1. Si el servidor está corriendo, ciérralo:
   - Haz clic en la ventana de `iniciar_servidor.bat`
   - Presiona `Ctrl+C`
   - Espera a que se cierre completamente

2. Verifica que no haya proceso de Node:
   ```
   tasklist | find "node"
   ```
   (No debe mostrar resultados)

### Paso 2: Ejecutar la corrección

**Opción A: Doble clic (Recomendado)**
```
CORREGIR_NOMBRES.bat
```

**Opción B: Línea de comandos**
```bash
cd servidor
node corregir_nombres.js
```

### Paso 3: Verificar la corrección

El script mostrará:

```
📊 Resumen por prefijo:
   Total equipos: 228
   Sin nombre: 0
   LPT-: 82
   CEL-: 106
   IMP-: 12
   ACC-: 7
   SCA-: 1
   MOU-: 5
   ...
```

**Si ves esto, todo está correcto** ✅

---

## Después de la Corrección

1. **Reinicia el servidor:**
   ```bash
   iniciar_servidor.bat
   ```

2. **Abre el navegador:**
   - Vai a: `http://localhost:3335`

3. **Limpiar caché:**
   - Presiona: `Ctrl+F5` (no solo F5)

4. **Verificar nombres:**
   - Ve a: **Inventario**
   - Deberías ver nombres como:
     - `LPT-001`, `LPT-002`, ... `LPT-082`
     - `CEL-001`, `CEL-002`, ... `CEL-106`
     - `IMP-001`, `IMP-002`, ... `IMP-012`
     - etc.

---

## Verificación Rápida

Si quieres verificar desde línea de comandos:

```bash
cd servidor
sqlite3 activos.db "SELECT nombre, COUNT(*) as count FROM equipos GROUP BY nombre LIKE 'LPT-%' LIMIT 5;"
```

Deberías ver nombres como:
```
LPT-001
LPT-002
LPT-003
...
CEL-001
CEL-002
```

**Sin** `LPT-0001`, `EQP`, o `Equipo-`.

---

## Si Algo Sale Mal

### Error: "El servidor está ejecutándose"

**Solución:**
```bash
# En otra terminal:
taskkill /F /IM node.exe
```

Luego vuelve a ejecutar `CORREGIR_NOMBRES.bat`

### Los nombres siguen mal

**Verifica:**
1. ¿Ejecutaste `CORREGIR_NOMBRES.bat` completamente?
2. ¿Reiniciaste el servidor?
3. ¿Limpiaste el caché (Ctrl+F5)?

Si nada funciona, contacta a cmore@axis-gl.com

---

## Archivos Involucrados

- **corregir_nombres.js** - Script de corrección (Node.js)
- **CORREGIR_NOMBRES.bat** - Ejecutor del script
- **activos.db** - Base de datos SQLite

---

## Tiempo Estimado

- Detener servidor: 5 segundos
- Ejecutar corrección: 10-15 segundos
- Reiniciar servidor: 2-3 segundos
- **Total: ~30 segundos**

---

## ¿Qué Hace Exactamente?

### Paso 1: Diagnóstico
Muestra el estado actual de los nombres

### Paso 2: Limpieza
Pone todos los nombres en NULL

### Paso 3: Aplicar Mapeo Excel
Aplica los 179 nombres del Excel según el número de serie

### Paso 4: Auto-generar
Para los 49 equipos restantes, genera nombres automáticos:
- Identifica su tipo (Laptop, Celular, etc.)
- Asigna el prefijo correcto (LPT-, CEL-, etc.)
- Encuentra el próximo número correlativo
- Genera nombre: `PREFIJO-XXX` (sin ceros extras)

### Paso 5: Verificación
Muestra estadísticas finales y verifica que todo esté correcto

---

## Resultados Esperados

**Total Equipos:** 228

| Prefijo | Cantidad | Rango |
|---------|----------|-------|
| LPT- | 82 | LPT-001 a LPT-082 |
| CEL- | 106 | CEL-001 a CEL-106 |
| IMP- | 12 | IMP-001 a IMP-012 |
| ACC- | 7 | ACC-001 a ACC-007 |
| SCA- | 1 | SCA-001 |
| MOU- | 5 | MOU-001 a MOU-005 |
| Personalizado | 15 | AXPA-*, AXLI-*, etc |

---

## Contacto

Si tienes problemas:
- Email: cmore@axis-gl.com
- Proyecto: Gestion de Activos TI - Axis Group

✅ ¡Listo para corregir!
