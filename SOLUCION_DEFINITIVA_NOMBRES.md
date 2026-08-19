# Solución Definitiva - Nombres de Equipos

## ⚠️ El Problema Raíz

El archivo **seed.json** contiene nombres genéricos de equipos:
- Ejemplo: "Equipo-EQ-0001", "Equipo-EQ-0002", etc.

Cuando la aplicación se reinicia o se recarga:
1. Lee la base de datos (BD)
2. Si la BD está vacía, carga el seed.json
3. Los nombres se vuelven genéricos nuevamente

**Por eso los cambios no se conservan.**

---

## ✅ Solución en 3 Pasos

### Paso 1: Corregir la Base de Datos ✓ (Ya hecho)

```bash
cd servidor
CORREGIR_NOMBRES.bat
```

**Resultado:** Los 228 equipos tienen nombres correctos en la BD

### Paso 2: Actualizar seed.json (Próximo paso)

```bash
cd servidor
EXPORTAR_SEED.bat
```

**Qué hace:**
- Lee la BD con nombres corregidos
- Actualiza seed.json con esos nombres
- Crea un backup automático

### Paso 3: Reiniciar y Verificar

```bash
# Reiniciar servidor
iniciar_servidor.bat

# Abre navegador
http://localhost:3335

# Limpiar caché
Ctrl+F5

# Ir a Inventario y verificar
```

---

## Instrucciones Paso a Paso

### 1️⃣ **Verifica que la BD está corregida**

```bash
cd servidor
sqlite3 activos.db "SELECT nombre, COUNT(*) FROM equipos WHERE nombre IS NOT NULL GROUP BY SUBSTR(nombre, 1, 3) LIMIT 10;"
```

Deberías ver:
```
ACC|7
CEL|113
IMP|12
LPT|82
...
```

### 2️⃣ **Exporta el seed.json corregido**

```bash
cd servidor
node exportar_seed_corregido.js
```

O simplemente:
```bash
EXPORTAR_SEED.bat
```

**Verifica el output:**
```
✅ Leídos 228 equipos de la BD
✅ seed.json actualizado
```

### 3️⃣ **Reinicia el servidor**

```bash
iniciar_servidor.bat
```

### 4️⃣ **Abre la aplicación**

- URL: `http://localhost:3335`
- Presiona: `Ctrl+F5` (limpiar caché)
- Ve a: **Inventario**

### 5️⃣ **Verifica los nombres**

Deberías ver:
- ✅ LPT-001, LPT-002, ... LPT-082
- ✅ CEL-001, CEL-002, ... CEL-106
- ✅ IMP-001, IMP-002, ... IMP-012
- ✅ ACC-001, ACC-002, ... ACC-007
- ✅ SCA-001
- ✅ MOU-001, MOU-002, ... MOU-005

**SIN:**
- ❌ LPT-0001 (4 dígitos)
- ❌ Equipo-EQ-0001
- ❌ EQP

---

## Archivos Involucrados

| Archivo | Propósito |
|---------|-----------|
| `activos.db` | Base de datos (datos actuales) |
| `seed.json` | Datos iniciales (para cargar si BD está vacía) |
| `corregir_nombres.js` | Actualiza BD con nombres correctos |
| `exportar_seed_corregido.js` | Sincroniza seed.json con BD |
| `CORREGIR_NOMBRES.bat` | Ejecuta corrección de BD |
| `EXPORTAR_SEED.bat` | Ejecuta exportación de seed |

---

## ¿Por Qué Pasó Esto?

1. **seed.json** se creó hace tiempo con nombres genéricos "Equipo-EQ-XXX"
2. **Cuando se inicia el servidor:**
   - Carga seed.json en la BD si está vacía
   - Los nombres genéricos se guardan en la BD
3. **Los scripts anteriores** actualizaban la BD pero no el seed.json
4. **Resultado:** Cambios temporales, pero al reiniciar se pierden

---

## Prevención en el Futuro

**Después de esta corrección, si necesitas cambiar nombres:**

1. Actualiza en la interfaz web o en la BD
2. Siempre ejecuta: `EXPORTAR_SEED.bat`
3. Así el seed.json se mantiene sincronizado

---

## Checklist de Ejecución

```
☐ 1. Ejecuta CORREGIR_NOMBRES.bat
☐ 2. Espera a que termine
☐ 3. Ejecuta EXPORTAR_SEED.bat
☐ 4. Espera a que termine
☐ 5. Ejecuta iniciar_servidor.bat
☐ 6. Abre http://localhost:3335
☐ 7. Presiona Ctrl+F5
☐ 8. Vai a Inventario
☐ 9. Verifica que los nombres son correctos
```

---

## Si Algo Sale Mal

### Nombres siguen siendo genéricos

**Solución:**
```bash
# 1. Detén servidor
taskkill /F /IM node.exe

# 2. Ejecuta en orden:
cd servidor
node corregir_nombres.js
node exportar_seed_corregido.js
node iniciar_servidor.bat
```

### "BD no encontrada"

**Solución:**
- Verifica que `activos.db` existe en `servidor/`
- Si no, ejecuta: `node iniciar_servidor.bat` (crea BD vacía)

### Los nombres siguen con ceros extras

**Solución:**
- Verifica en la BD directamente:
  ```bash
  sqlite3 activos.db "SELECT nombre FROM equipos LIMIT 5;"
  ```
- Si la BD tiene nombres correctos pero la web no los muestra:
  - Limpia caché: Ctrl+Shift+Del (en navegador)
  - Recarga: Ctrl+F5

---

## Verificación Final

Para confirmar que todo está bien:

```bash
# Ver primeros 10 nombres en BD
sqlite3 activos.db "SELECT nombre FROM equipos WHERE nombre IS NOT NULL LIMIT 10;"

# Ver resumen por prefijo
sqlite3 activos.db "SELECT SUBSTR(nombre,1,3) as prefijo, COUNT(*) FROM equipos WHERE nombre IS NOT NULL GROUP BY prefijo;"

# Ver total sin nombre
sqlite3 activos.db "SELECT COUNT(*) FROM equipos WHERE nombre IS NULL OR nombre = '';"
```

**Resultados esperados:**
```
✅ Primeros 10 nombres: LPT-001, LPT-002, ..., CEL-001, etc.
✅ Resumen: ACC|7, CEL|113, IMP|12, LPT|82, etc.
✅ Sin nombre: 0
```

---

## Contacto

Si persisten problemas:
- Email: cmore@axis-gl.com
- Proyecto: Gestion de Activos TI

**¡Ahora sí debería funcionar definitivamente!** ✅
