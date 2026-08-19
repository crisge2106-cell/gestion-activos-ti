# 📋 Actualización de Nombres de Equipos

## ✅ Estado actual

- **Seed.json actualizado**: Contiene 27 nombres del Excel + 201 nombres generados automáticamente
- **Base de datos**: Pendiente de actualización
- **Script de actualización**: Listo para ejecutar

---

## 🚀 Pasos para actualizar

### Opción 1: Automática (Recomendada)

1. **Abre una terminal** en la carpeta `servidor`
   ```bash
   cd "D:\Proyectos\Gestion de activos TI\servidor"
   ```

2. **Ejecuta el script de actualización**
   ```bash
   node actualizar_nombres.js
   ```

3. **Reinicia el servidor**
   - Cierra `iniciar_servidor.bat` si está ejecutándose
   - Ejecuta `iniciar_servidor.bat` nuevamente
   - Espera a que el servidor esté listo

4. **Recarga la aplicación**
   - En el navegador: `Ctrl+F5` (recarga forzada)
   - Navega a **Inventario**
   - Verás los nombres actualizados ✅

---

## 📊 Qué se actualizó

### Del Excel (27 equipos)
Estos equipos tienen el nombre que figura en el Excel:
- **LPT-031**: Lenovo IDEAPAD SLIM 5 14IAH8
- **LPT-023**: Lenovo ThinkPad E15
- **AXLI-LEG01**: Lenovo YOGA Pro 9i
- Y 24 más...

### Generados automáticamente (201 equipos)
Equipos sin nombre en el Excel reciben nombre automático:
- Formato: `Equipo-{ID}` 
- Ejemplo: `Equipo-EQ-0001`, `Equipo-EQ-0042`, etc.

---

## ⚠️ Importante

- **Validación de duplicados**: Los nombres no pueden repetirse. El sistema validará esto.
- **Reversible**: Si algo sale mal, puedes restaurar desde el backup original
- **Los datos existentes se preservan**: Solo se agregan/actualizan los nombres

---

## 🔍 Verificación

Después de actualizar, puedes verificar:

1. Ve a **Inventario**
2. Haz clic en **editar** en cualquier equipo
3. Deberías ver el campo **"Nombre del equipo"** lleno con:
   - El nombre del Excel (si coincidió por serie), o
   - Un nombre generado (formato: `Equipo-{ID}`)

---

## ❌ Si algo sale mal

1. **Cierra el servidor**
2. **Borra la base de datos**: `activos.db`
3. **Reinicia el servidor** (se recreará con el seed.json actualizado)
4. **Contacta si persisten los problemas**

---

## 📞 Información técnica

- **Archivo actualizado**: `seed.json`
- **Script de actualización**: `servidor/actualizar_nombres.js`
- **Tabla actualizada**: `equipos.nombre`
- **Validación**: Case-insensitive (LPT-031 ≠ lpt-031, pero se consideran iguales)

---

**Fecha de actualización**: 2026-07-18
**Equipos procesados**: 22 del Excel + 228 de la BD = 250 total
