# Agente de Inventario - Axis Group

Sistema automático para reportar información de hardware y disponibilidad de equipos al servidor central de gestión de activos TI.

## ¿Qué hace?

El agente recolecta información del equipo cada hora:

- **Información del Sistema**
  - Sistema operativo
  - Usuario de Windows actual
  - Procesador (CPU)

- **Información de Memoria (RAM)**
  - Total en GB
  - Usado en GB
  - Disponible en GB

- **Información de Almacenamiento**
  - Espacio total en disco C:
  - Espacio usado
  - Espacio disponible

- **Para Teléfonos** (opcional)
  - Modelo del dispositivo
  - Número telefónico
  - Última actualización

Los datos se envían automáticamente al servidor cada hora y quedan registrados en la base de datos.

## Requisitos

- Windows 7 o superior
- Python 3.7 o superior (desde https://www.python.org/downloads/)
- Acceso a internet (para conectarse al servidor)
- Permisos de administrador (para instalar como servicio)

## Instalación

### Opción 1: Instalación Automática (Recomendado)

1. **Ejecuta el instalador como administrador:**
   ```
   instalar_agente.bat
   ```

2. **Sigue las instrucciones:**
   - Se verificará Python
   - Se instalarán las dependencias
   - Se te preguntará si quieres instalarlo como servicio

3. **Selecciona opción 2** para instalar como servicio (se ejecutará automáticamente con Windows)

### Opción 2: Instalación Manual con PowerShell

1. **Abre PowerShell como administrador**

2. **Ejecuta:**
   ```powershell
   .\setup_servicio.ps1 -Accion instalar
   ```

3. **El script:**
   - Copiará los archivos
   - Verificará Python
   - Instalará dependencias
   - Registrará el servicio de Windows

## Configuración

Después de la instalación, los archivos estarán en:
```
C:\Program Files\Axis\Inventario\
```

### Cambiar el Servidor

1. **Abre el archivo de configuración:**
   ```
   C:\Program Files\Axis\Inventario\config.json
   ```

2. **Edita el servidor:**
   ```json
   {
     "servidor": "http://192.168.1.100:3335",
     "intervalo_segundos": 3600,
     "habilitado": true
   }
   ```

3. **Guarda y reinicia el servicio:**
   ```powershell
   Restart-Service AxisInventario
   ```

## Uso

### Ejecutar Manualmente

```bash
# Enviar inventario ahora
python "C:\Program Files\Axis\Inventario\agente_inventario.py" --ahora

# Ver/cambiar configuración
python "C:\Program Files\Axis\Inventario\agente_inventario.py" --config

# Ejecutar en modo continuo
python "C:\Program Files\Axis\Inventario\agente_inventario.py" --servicio
```

### Gestionar el Servicio

```powershell
# Ver estado
Get-Service AxisInventario

# Iniciar
Start-Service AxisInventario

# Detener
Stop-Service AxisInventario

# Reiniciar
Restart-Service AxisInventario

# Ver últimas líneas del log
Get-EventLog -LogName System -Source "AxisInventario" -Newest 10
```

## Desinstalación

### Opción 1: Batch
```
desinstalar_agente.bat
```

### Opción 2: PowerShell
```powershell
.\setup_servicio.ps1 -Accion desinstalar
```

## Resolución de Problemas

### Python no se encuentra

**Problema:** "Python no está instalado o no está en el PATH"

**Solución:**
1. Descarga Python desde https://www.python.org/downloads/
2. **IMPORTANTE:** Durante la instalación, marca ✓ "Add Python to PATH"
3. Reinicia la terminal/símbolo del sistema
4. Vuelve a ejecutar el instalador

### El servidor no es alcanzable

**Problema:** "No se puede conectar a http://localhost:3335"

**Solución:**
1. Verifica que el servidor esté ejecutándose
2. Edita `config.json` con la IP correcta:
   ```json
   {
     "servidor": "http://IP_DEL_SERVIDOR:3335"
   }
   ```
3. Reinicia el servicio

### Permisos insuficientes

**Problema:** "Este script debe ejecutarse como Administrador"

**Solución:**
1. Haz clic derecho en `instalar_agente.bat`
2. Selecciona "Ejecutar como administrador"

### Las dependencias no se instalan

```bash
# Intenta manualmente:
pip install psutil requests
```

## Archivos Generados

Después de la instalación:

```
C:\Program Files\Axis\Inventario\
├── agente_inventario.py      # Script principal del agente
├── config.json                # Archivo de configuración
└── crear_servicio.vbs        # (solo Windows) Script de servicio
```

## Contacto y Soporte

Para reportar problemas o sugerencias:
- Email: cmore@axis-gl.com
- Axis Group - Gestión de Activos TI

## Cambios y Actualizaciones

### v1.0 - Inicial
- Recolección básica de información del sistema
- Envío automático cada hora
- Configuración flexible del servidor
- Instalación como servicio Windows

## Seguridad

- Los datos se envían en HTTP (considera HTTPS en producción)
- El servidor destino se configura localmente
- No se almacenan credenciales
- Los datos se borran después de ser enviados

## Notas

- El intervalo por defecto es 1 hora (3600 segundos)
- El agente se ejecuta como usuario del sistema
- Los logs se guardan en el Event Viewer de Windows
- Es seguro ejecutar múltiples agentes en la red
