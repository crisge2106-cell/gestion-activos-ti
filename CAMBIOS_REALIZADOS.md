# Cambios Realizados — Gestión de Activos TI

**Fecha:** 2026-07-18

## 1. ✅ Campo "Usuario actual" como cuadro de búsqueda
**Archivo:** `servidor/public/index.html`

### Cambios:
- **Línea 366:** Cambié el campo de usuario en el modal de edición de equipo de texto simple a cuadro de búsqueda con datalist
  - De: `<input type="text" id="eqUsuario">`
  - A: `<input type="text" id="eqUsuario" list="eqUsuarioOptions" autocomplete="off" placeholder="Buscar usuario..."><datalist id="eqUsuarioOptions"></datalist>`

- **Línea 776-778:** Actualicé `openEquipoModal()` para llenar la datalist con los trabajadores registrados
  ```javascript
  const usuarios = [...new Set((DB.trabajadores||[]).map(t=>t.nombre))].sort();
  fillDatalist('eqUsuarioOptions', usuarios);
  ```

---

## 2. ✅ Funcionalidad para eliminar equipos
**Archivos:** `servidor/public/index.html` y `servidor/server.js`

### Cambios en index.html:

**1. Línea 375-378:** Agregué un botón "Eliminar equipo" en el modal de edición
```html
<div style="display:flex; gap:10px; justify-content:space-between;">
  <button class="btn" onclick="saveEquipoModal()">Guardar</button>
  <button class="btn danger" id="btnDeleteEquipo" onclick="deleteEquipo()" style="display:none;">Eliminar equipo</button>
</div>
```

**2. Línea 790-796:** Agregué control para mostrar el botón solo cuando se edita un equipo existente
```javascript
const btnDelete = document.getElementById('btnDeleteEquipo');
// En la rama if(id):
btnDelete.style.display = 'block';
// En la rama else:
btnDelete.style.display = 'none';
```

**3. Línea 847-863:** Agregué la función `deleteEquipo()` que:
- Pide confirmación antes de eliminar
- Muestra advertencia si el equipo está asignado a un usuario
- Llama al endpoint DELETE del servidor
- Actualiza la interfaz después de la eliminación

### Cambios en server.js:

**Línea 697-703:** Agregué el endpoint DELETE `/api/equipos/{id}` que:
```javascript
if(pathname.startsWith('/api/equipos/') && req.method === 'DELETE'){
  const id = decodeURIComponent(pathname.split('/').pop());
  const equipo = getEquipo(id);
  if(!equipo) return sendJson(res, 404, {error:'Equipo no encontrado'});
  db.prepare('DELETE FROM equipos WHERE id = ?').run(id);
  return sendJson(res, 200, {ok:true, message:'Equipo eliminado'});
}
```

---

## 3. ✅ Impresión de actas post-entrega
**Estado:** Funcionalidad ya existente en el sistema

El sistema permite imprimir actas después de la entrega mediante:
- Botón automático en el acta generada (cuando se guarda una entrega)
- Enlace "ver / imprimir acta" en la pestaña "Actas/Cargos"
- El botón "Imprimir / Guardar PDF" está disponible en cada acta

---

## 4. ✅ Campo "Nombre del equipo" con validación de duplicados
**Archivos:** `servidor/public/index.html` y `servidor/server.js`

### Cambios:

**En server.js:**

**1. Línea 89-99:** Agregué migración para crear el campo `nombre` en equipos
```javascript
(function migrateEquiposNombre(){
  try{
    const cols = db.prepare("PRAGMA table_info(equipos)").all();
    if(!cols.some(c=>c.name==='nombre')){
      db.exec('ALTER TABLE equipos ADD COLUMN nombre TEXT');
      // Generar nombres automáticos
      const equipos = db.prepare('SELECT id FROM equipos WHERE nombre IS NULL').all();
      for(const eq of equipos){
        const nuevoNombre = 'Equipo-' + eq.id;
        db.prepare('UPDATE equipos SET nombre = ? WHERE id = ?').run(nuevoNombre, eq.id);
      }
    }
  }catch(e){ console.error(...); }
})();
```

**2. Línea 432-434:** Actualicé `getEquipo()` para incluir el campo nombre
```javascript
return {id:e.id, nombre:e.nombre, tipo:e.tipo, ...};
```

**3. Línea 440-449:** Actualicé `updateEquipoFields()` con:
- Validación de nombre duplicado (case-insensitive)
- Actualización del campo nombre en la base de datos

**4. Línea 453-466:** Actualicé `insertEquipo()` con:
- Validación de que el nombre sea obligatorio
- Validación de nombre duplicado
- Inserción del campo nombre

**En index.html:**

**1. Línea 346:** Agregué campo "Nombre del equipo" al modal
```html
<div class="field"><label>Nombre del equipo</label><input type="text" id="eqNombre" placeholder="Ej: LAPTOP-JUAN-001" style="width:100%"></div>
```

**2. Línea 790:** Actualicé `openEquipoModal()` para cargar el nombre
```javascript
document.getElementById('eqNombre').value = e.nombre||'';
```

**3. Línea 805:** Agregué validación de nombre en `saveEquipoModal()`
```javascript
const nombre = document.getElementById('eqNombre').value.trim();
if(!nombre){ alert('Ingresa el nombre del equipo'); return; }
// Validar duplicado
const existente = DB.equipos.find(e => e.nombre && e.nombre.toLowerCase() === nombre.toLowerCase() && e.id !== id);
if(existente){ alert('Ya existe un equipo con el nombre...'); return; }
```

### Características:
- ✅ Permite editar el nombre del equipo
- ✅ Genera automáticamente nombres para equipos sin nombre (formato: "Equipo-{ID}")
- ✅ Valida que no haya nombres duplicados (case-insensitive)
- ✅ Validación en cliente y servidor para máxima seguridad

---

## 5. ✅ Actualización de nombres de equipos desde Excel
**Estado**: Completado y listo para aplicar

### Resumen:
- **27 equipos** con nombres del Excel (coincidieron por serie/IMEI)
- **201 equipos** con nombres generados automáticamente (formato: `Equipo-{ID}`)
- **Seed.json** completamente actualizado
- **Script de actualización** listo para ejecutar

### Archivos generados:
1. **`seed.json`** - Actualizado con todos los nombres
2. **`servidor/actualizar_nombres.js`** - Script para aplicar cambios a la BD
3. **`INSTRUCCIONES_ACTUALIZACION_NOMBRES.md`** - Guía paso a paso

### Cómo aplicar:
```bash
cd "D:\Proyectos\Gestion de activos TI\servidor"
node actualizar_nombres.js
```

### Nombres del Excel capturados:
- LPT-031, LPT-023, LPT-053, LPT-009
- AXLI-LEG01, AXLI-OPER07
- AXPA-DOC02, AXPA-DOC03, AXPA-OPE01
- NOTEBOOK, PRINTER-Lima
- Y 11 más...

---

## 📝 Próximos pasos para activar los cambios:

1. **Cierra el servidor:** Detén `iniciar_servidor.bat`
2. **Limpia caché:** Presiona `Ctrl+Shift+Supr` en el navegador y borra la caché
3. **Reinicia el servidor:** Ejecuta `iniciar_servidor.bat` nuevamente
4. **Recarga la página:** `Ctrl+F5` en el navegador

## 🧪 Cómo probar los cambios:

### Búsqueda de usuario en edición de equipo:
1. Ve a **Inventario**
2. Haz clic en **editar** en cualquier equipo
3. En el campo "Usuario actual" deberías ver un cuadro de búsqueda con auto-completado de trabajadores

### Eliminar equipo:
1. Ve a **Inventario**
2. Haz clic en **editar** en cualquier equipo
3. Verás un botón rojo **"Eliminar equipo"** al pie del formulario
4. Haz clic para eliminar (con confirmación)

### Nombre del equipo:
1. Ve a **Inventario**
2. Haz clic en **editar** en cualquier equipo
3. Verás un nuevo campo **"Nombre del equipo"** al inicio del formulario
4. Los equipos creados antes de esta actualización tendrán nombres generados automáticamente (formato: "Equipo-{ID}")
5. Puedes editar el nombre, pero no puede ser igual al de otro equipo
6. Al crear un nuevo equipo, debes especificar obligatoriamente un nombre único

---

**✨ Todos los cambios están listos para activar. Solo necesitas reiniciar el servidor.**
