# Funcionalidad - Asignación de Números Telefónicos en Entregas

## ✅ Cambios Implementados

### 1. Base de Datos
**Columnas agregadas a `movimiento_items`:**
- `numeroTelefonico1` - Primer número telefónico
- `numeroTelefonico2` - Segundo número telefónico (opcional)

Migración automática al iniciar el servidor si no existen.

---

## 2. Interfaz Web - Formulario de Nueva Entrega

### Campos Dinámicos para Celulares

Cuando se selecciona un **celular** en el formulario de "Nueva Entrega (Cargo)":

1. **Aparecen automáticamente dos campos:**
   - Número telefónico 1 (requerido si se asignan números)
   - Número telefónico 2 (opcional)

2. **Formato flexible:**
   - Acepta cualquier formato: `+51 9 1234 5678`, `9 1234 5678`, etc.
   - No valida formato (el usuario ingresa como lo necesita)

3. **Para otros equipos:**
   - Los campos de teléfono NO aparecen (solo relevante para celulares)

### Entregas de Solo Número Telefónico

Se puede crear un ítem de **solo número telefónico** sin equipo físico:

1. **Dejar en blanco** el campo "Equipo existente"
2. **Dejar en blanco** la descripción
3. **Ingresar al menos un número telefónico**
4. El sistema lo reconoce como entrega de número sin hardware

---

## 3. Flujo Completo de Una Entrega

### Escenario 1: Entrega de Celular + Números

```
1. Ve a "Nueva Entrega (Cargo)"
2. Completa datos del trabajador (Nombre, DNI, Área, Sede)
3. Haz clic en "+ Agregar ítem"
4. Selecciona un celular disponible → Aparecen campos de números
5. Ingresa:
   - Número 1: +51 9 1234 5678
   - Número 2: +51 9 2345 6789 (opcional)
6. Si hay más ítems, repite con otros equipos
7. Haz clic en "Guardar entrega y generar acta"
```

### Escenario 2: Entrega de Solo Números (sin equipo)

```
1. Ve a "Nueva Entrega (Cargo)"
2. Completa datos del trabajador
3. Haz clic en "+ Agregar ítem"
4. Deja en blanco "Equipo existente"
5. Deja en blanco "Descripción"
6. Ingresa números en los campos de teléfono
7. Guarda la entrega
```

### Escenario 3: Entrega de Múltiples Celulares

```
1. Agrega primer celular con números
2. Haz clic en "+ Agregar ítem" de nuevo
3. Agrega segundo celular con sus números
4. Continúa para más equipos
5. Guarda toda la entrega en una acta
```

---

## 4. Datos Guardados

Los números se registran en:
- **Tabla:** `movimiento_items`
- **Campos:** `numeroTelefonico1`, `numeroTelefonico2`
- **Vinculados a:** El movimiento de entrega (acta)
- **Accesibles vía:** La sección de actas/cargos

---

## 5. Visualización en Actas

Cuando se genera un acta de entrega que incluye números:

```
ACTA DE ENTREGA
Trabajador: Juan Pérez
Fecha: 2026-07-27

ÍTEMS ENTREGADOS:
- Celular Samsung A12 (CEL-001)
  Números: +51 9 1234 5678 / +51 9 2345 6789
  
- Mouse Logitech
  Cantidad: 1
  
- Número Telefónico Solo
  Números: +51 9 3456 7890
```

---

## 6. Limitaciones y Notas

1. **Máximo 2 números por celular**
   - Número 1: Requerido (si se asignan números)
   - Número 2: Opcional

2. **Sin validación de formato**
   - Acepta cualquier valor (ej: números, caracteres especiales)
   - El usuario es responsable del formato correcto

3. **Números vinculados a entregas**
   - No se almacenan directamente en la tabla `equipos`
   - Se guardan en el histórico de movimientos

4. **Edición limitada**
   - Una vez guardada la entrega, los números no se pueden editar
   - Se debe crear una nueva entrega para cambiar números

5. **Devolución de números**
   - Cuando se devuelve un celular, se registra como devolución
   - Los números asociados quedan en el histórico

---

## 7. Casos de Uso

### Caso A: Nuevo empleado recibe celular

```
Nueva Entrega
- Trabajador: María García
- Celular: Samsung A12
- Números: +51 9 1111 1111 / +51 9 2222 2222

→ Se genera acta con todos los datos
→ Números quedan registrados en la entrega
```

### Caso B: Cambio de número telefónico

```
Nota: Cambio de número de María García a +51 9 3333 3333

Procedimiento:
1. Devolver celular (registro de devolución)
2. Nueva entrega del mismo celular con nuevo número
```

### Caso B: Empleado recibe solo número (caso raro)

```
Nueva Entrega
- Trabajador: Carlos López
- (Sin equipo físico)
- Solo números: +51 9 4444 4444

→ Acta con solo números (sin equipo)
```

---

## 8. Consultas en Actas

Para encontrar números telefónicos asignados a un trabajador:

1. Ve a "Actas / Cargos"
2. Busca por nombre del trabajador
3. Haz clic en el acta
4. Ver números en la descripción del ítem de celular

---

## ⚙️ Detalles Técnicos

### Estructura de Datos Guardada

```json
{
  "movimiento": {
    "id": "MV-0001",
    "tipo": "Asignacion",
    "trabajador": "María García",
    "items": [
      {
        "equipoId": "EQ-0105",
        "descripcion": "Celular Samsung A12",
        "numeroTelefonico1": "+51 9 1111 1111",
        "numeroTelefonico2": "+51 9 2222 2222"
      }
    ]
  }
}
```

### Tabla movimiento_items

```sql
CREATE TABLE movimiento_items (
  id INTEGER PRIMARY KEY,
  movimientoId TEXT,
  equipoId TEXT,
  cantidad INTEGER,
  descripcion TEXT,
  marcaModelo TEXT,
  serieEstado TEXT,
  numeroTelefonico1 TEXT,
  numeroTelefonico2 TEXT
);
```

---

## 🚀 Próximas Mejoras (Futuras)

- [ ] Validación de formato telefónico
- [ ] Búsqueda de números en actas
- [ ] Reportes de números asignados
- [ ] Cambio de número en devoluciones (re-asignación)
- [ ] Integración con directorio global

---

**Implementación completada.** ✅

Los números telefónicos se asignan **exclusivamente en el momento de la entrega** y se registran en el acta correspondiente.
