# Correo de recuperación de contraseña

Cada usuario del sistema (pestaña **Backup / Importar specs → Usuarios del sistema**)
puede tener un correo de recuperación. Si olvida su contraseña, puede escribirlo en
"¿Olvidaste tu contraseña?" en la pantalla de ingreso, y el sistema le envía una
contraseña temporal por correo.

## Activar el envío real de correo

1. Edita `smtp-config.json` (en esta misma carpeta) con los datos de tu servidor SMTP:

```json
{
  "enabled": true,
  "host": "smtp.tudominio.com",
  "port": 587,
  "secure": false,
  "user": "correo@tudominio.com",
  "pass": "tu-contraseña-o-contraseña-de-aplicacion",
  "from": "Gestión de Activos TI <correo@tudominio.com>"
}
```

- `port: 587` + `secure: false` → conexión con STARTTLS (lo más común).
- `port: 465` + `secure: true` → conexión con SSL/TLS directo.
- Cambia `"enabled": false` a `true` cuando ya hayas completado los datos.

2. No hace falta instalar nada (`npm install`, etc.) ni reiniciar el servidor: el
   archivo se lee en cada solicitud de recuperación.

## Mientras no lo configures

Si `smtp-config.json` no existe, está incompleto o `enabled` es `false`, el sistema
sigue funcionando: genera la contraseña temporal igual, pero en vez de enviarla por
correo la escribe en `codigos-recuperacion.txt` en esta carpeta, junto con el motivo
por el que no se pudo enviar. Un administrador con acceso al servidor puede revisar
ese archivo y entregar la contraseña temporal manualmente.

## Nota de seguridad

`smtp-config.json` contiene una contraseña de correo en texto plano. No lo compartas
ni lo subas a ningún repositorio público.
