# 📚 MANUAL COMPLETO: DESPLEGAR EN HOSTING COMPARTIDO
## Gestión de Activos TI - Axis Group

---

## 📋 TABLA DE CONTENIDOS

1. [Opciones de Hosting](#opciones-de-hosting)
2. [Requisitos Técnicos](#requisitos-técnicos)
3. [Opción A: Hosting VPS (Recomendado)](#opción-a-hosting-vps-recomendado)
4. [Opción B: Hosting en la Nube (AWS/Azure/GCP)](#opción-b-hosting-en-la-nube)
5. [Opción C: Servidor Dedicado Local](#opción-c-servidor-dedicado-local)
6. [Configuración de Seguridad](#configuración-de-seguridad)
7. [Configuración de Agentes Remotos](#configuración-de-agentes-remotos)
8. [Monitoreo y Mantenimiento](#monitoreo-y-mantenimiento)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 OPCIONES DE HOSTING

### Comparativa de Opciones

| Característica | VPS | Cloud | Dedicado Local |
|---|---|---|---|
| **Costo** | $$ (5-30 USD/mes) | $$$ (15-100 USD/mes) | $ (hardware) + $$$ (internet) |
| **Escalabilidad** | Media | Alta | Baja |
| **Mantenimiento** | Moderado | Bajo | Alto |
| **Uptime** | 99.5% | 99.9% | Variable |
| **Complejidad** | Media | Baja | Media |
| **Ideal para** | Medianas empresas | Grandes empresas | Oficinas locales |

### Recomendación
**Para Axis Group:** VPS o Cloud (si es primera vez, usa Cloud para menos problemas de configuración)

**Proveedores Recomendados:**

#### VPS (Linux)
- **Linode** — desde $5/mes, muy confiable
- **DigitalOcean** — desde $4/mes, interfaz amigable
- **Hetzner** — desde $3/mes, excelente valor
- **Vultr** — desde $2.50/mes, muchas ubicaciones

#### Cloud
- **AWS Lightsail** — desde $3.50/mes, muy accesible
- **Microsoft Azure App Service** — prueba gratis 12 meses
- **Google Cloud Run** — pago solo por uso
- **Heroku** — muy fácil pero más caro

---

## ⚙️ REQUISITOS TÉCNICOS

### Software Necesario
- **Node.js 22.5+** (runtime JavaScript)
- **npm** (gestor de paquetes)
- **SQLite3** (base de datos embebida)
- **Git** (control de versiones, opcional pero recomendado)
- **Supervisor o PM2** (para mantener el servidor corriendo)

### Puertos Requeridos
- **3335** — Aplicación web (o cualquier puerto > 1024)
- **22** — SSH (acceso remoto)
- **80** — HTTP (redireccionar a HTTPS)
- **443** — HTTPS (SSL/TLS)

### Requisitos de Red
- **Acceso SSH** a la máquina remota
- **Conexión estable** de internet
- **Dominio** (opcional pero recomendado)
- **Certificado SSL** (gratis con Let's Encrypt)

---

# 🚀 OPCIÓN A: HOSTING VPS (RECOMENDADO)

## PASO 1: Contratar un VPS

### Ejemplo: DigitalOcean

1. Registrate en https://digitalocean.com
2. Click en **Create** → **Droplets**
3. Elige configuración:
   - **OS:** Ubuntu 22.04 LTS (o superior)
   - **Size:** $4/mes (1 CPU, 1GB RAM es suficiente)
   - **Región:** Elige la más cercana (ej: New York, Amsterdam)
   - **Authentication:** Genera SSH key (más seguro que contraseña)
4. Click en **Create Droplet**
5. Espera 2-3 minutos a que se provision

**Nota:** Guarda la IP de tu servidor (ej: `192.168.1.100`)

---

## PASO 2: Acceso Inicial por SSH

### En Windows (PowerShell):
```powershell
# Si tienes clave SSH privada
ssh -i "C:\ruta\a\tu\clave.pem" root@TU_IP_SERVIDOR

# Ejemplo real:
ssh -i "C:\Users\Cristopher\Downloads\my-key.pem" root@192.168.1.100
```

### En Mac/Linux:
```bash
ssh -i ~/.ssh/tu-clave.pem root@192.168.1.100
```

**Si no tienes SSH key:**
```powershell
# PowerShell: Usa PuTTY como alternativa
# Descarga: https://www.putty.org/
```

---

## PASO 3: Actualizar el Sistema

Una vez conectado por SSH, ejecuta:

```bash
# Actualizar paquetes
sudo apt update && sudo apt upgrade -y

# Instalar utilidades básicas
sudo apt install -y curl wget git nano htop

# Instalar Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalación
node --version    # Debe mostrar v22.x.x
npm --version     # Debe mostrar 10.x.x
```

---

## PASO 4: Preparar Proyecto en el Servidor

### Opción A1: Clonar desde Git (si tienes repositorio)

```bash
# Navegar a carpeta de aplicaciones
cd /var/www

# Clonar repositorio
git clone https://github.com/tuusuario/gestion-activos-ti.git
cd gestion-activos-ti/servidor

# Instalar dependencias
npm install
```

### Opción A2: Subir archivos manualmente (sin Git)

```bash
# Crear carpeta
mkdir -p /var/www/gestion-activos-ti/servidor
cd /var/www/gestion-activos-ti/servidor
```

**Luego desde tu computadora (Windows PowerShell):**

```powershell
# Copiar archivos al servidor (SCP)
scp -i "C:\Users\Cristopher\Downloads\my-key.pem" `
    -r "D:\Proyectos\Gestion de activos TI\servidor\*" `
    root@192.168.1.100:/var/www/gestion-activos-ti/servidor/

# Ejemplo con rutas reales:
scp -i "C:\Users\Cristopher\Downloads\clave.pem" `
    -r "D:\Proyectos\Gestion de activos TI\servidor\public" `
    root@192.168.1.100:/var/www/gestion-activos-ti/servidor/

# Copiar server.js y archivos principales
scp -i "C:\Users\Cristopher\Downloads\clave.pem" `
    "D:\Proyectos\Gestion de activos TI\servidor\server.js" `
    root@192.168.1.100:/var/www/gestion-activos-ti/servidor/
```

**De vuelta en SSH del servidor:**

```bash
# Instalar dependencias (si existe package.json)
npm install

# Si no hay package.json, crear uno:
npm init -y
npm install express body-parser
```

---

## PASO 5: Probar la Aplicación Localmente

```bash
# En el servidor, desde /var/www/gestion-activos-ti/servidor
node server.js

# Deberías ver:
# ✅ Migración: Columnas completadas en agentes_reportes
# Servidor de Gestion de Activos TI escuchando en el puerto 3335
```

**Prueba desde tu máquina:**
```powershell
# Abre el navegador:
# http://TU_IP_SERVIDOR:3335
# Ejemplo: http://192.168.1.100:3335
```

---

## PASO 6: Configurar PM2 (Gestor de Procesos)

PM2 mantiene tu aplicación corriendo incluso si falla, y se reinicia automáticamente.

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Navegar a la carpeta del proyecto
cd /var/www/gestion-activos-ti/servidor

# Iniciar con PM2
pm2 start server.js --name "gestion-activos"

# Ver estado
pm2 status

# Ver logs
pm2 logs gestion-activos

# Configurar para que inicie con el sistema
pm2 startup
# (ejecuta el comando que muestre)
pm2 save
```

**Comando para verificar que PM2 funciona:**

```bash
# Reinicia el servidor y verifica que la app sigue corriendo
sudo reboot

# Después de reiniciar, espera 30 segundos y:
pm2 status  # Debe mostrar "online"
```

---

## PASO 7: Configurar Reverse Proxy con Nginx

Nginx redirige el tráfico HTTP/HTTPS al puerto 3335 de tu Node.js.

```bash
# Instalar Nginx
sudo apt install -y nginx

# Crear archivo de configuración
sudo nano /etc/nginx/sites-available/gestion-activos
```

**Pega el siguiente contenido:**

```nginx
server {
    listen 80;
    server_name TU_DOMINIO_O_IP;

    # Redireccionar HTTP a HTTPS (más adelante)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3335;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Reemplaza `TU_DOMINIO_O_IP` con tu dirección:**
- Si usas IP: `192.168.1.100`
- Si usas dominio: `activos.tuempresa.com`

**Activa la configuración:**

```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/gestion-activos /etc/nginx/sites-enabled/

# Verificar sintaxis
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver estado
sudo systemctl status nginx
```

---

## PASO 8: Certificado SSL (HTTPS) - Opcional pero Recomendado

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Generar certificado (reemplaza con tu dominio)
sudo certbot certonly --nginx -d activos.tuempresa.com

# Actualizar configuración Nginx automáticamente
sudo certbot --nginx -d activos.tuempresa.com
```

**Después, actualiza `/etc/nginx/sites-available/gestion-activos`:**

```nginx
server {
    listen 80;
    server_name activos.tuempresa.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name activos.tuempresa.com;

    ssl_certificate /etc/letsencrypt/live/activos.tuempresa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/activos.tuempresa.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3335;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Reinicia:**

```bash
sudo systemctl restart nginx
```

---

## PASO 9: Configurar Variables de Entorno

Crear archivo `.env` para configuraciones sensibles:

```bash
cd /var/www/gestion-activos-ti/servidor

# Crear archivo .env
nano .env
```

**Contenido:**

```
# Puerto de escucha
PORT=3335

# URL pública (para agentes remotos)
PUBLIC_URL=https://activos.tuempresa.com

# Clave secreta para sesiones
SESSION_SECRET=tu-clave-secreta-muy-larga-y-aleatoria-aqui

# Configuración de base de datos
DB_PATH=/var/www/gestion-activos-ti/servidor/activos.db

# Nivel de logging
LOG_LEVEL=info
```

**Modificar `server.js` para leer variables:**

```javascript
require('dotenv').config(); // Al inicio del archivo

const PORT = process.env.PORT || 3335;
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
```

---

## PASO 10: Backup Automático de Base de Datos

```bash
# Crear script de backup
sudo nano /usr/local/bin/backup-activos.sh
```

**Contenido:**

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/gestion-activos"
DB_PATH="/var/www/gestion-activos-ti/servidor/activos.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Copiar base de datos
cp $DB_PATH $BACKUP_DIR/activos_$DATE.db

# Comprimir
gzip $BACKUP_DIR/activos_$DATE.db

# Eliminar backups más antiguos de 30 días
find $BACKUP_DIR -name "*.db.gz" -mtime +30 -delete

echo "Backup completado: $BACKUP_DIR/activos_$DATE.db.gz"
```

**Hacer ejecutable:**

```bash
sudo chmod +x /usr/local/bin/backup-activos.sh

# Ejecutar manualmente para probar
sudo /usr/local/bin/backup-activos.sh
```

**Automatizar con Cron (diariamente a las 2 AM):**

```bash
sudo crontab -e

# Agregar al final:
0 2 * * * /usr/local/bin/backup-activos.sh
```

---

# ☁️ OPCIÓN B: HOSTING EN LA NUBE

## Para AWS Lightsail (más fácil que EC2)

### Paso 1: Crear Instancia Lightsail

1. Ve a https://lightsail.aws.amazon.com
2. Click en **Create Instance**
3. Elige:
   - **Blueprint:** Linux/Unix → Ubuntu 22.04 LTS
   - **Plan:** $3.50/mes
4. Click **Create Instance**

### Paso 2: Abrir Terminal Lightsail

1. En Dashboard de Lightsail, haz click en tu instancia
2. Click en **Connect** (abre terminal en navegador)

### Paso 3: Instalar Node.js

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nano
```

### Paso 4: Descargar Proyecto

```bash
cd /opt
sudo git clone https://github.com/tuusuario/gestion-activos-ti.git
cd gestion-activos-ti/servidor
sudo npm install
```

### Paso 5: Configurar con PM2

```bash
sudo npm install -g pm2
pm2 start server.js --name "gestion-activos"
pm2 startup
pm2 save
```

### Paso 6: Configurar Firewall

En el dashboard de Lightsail:

1. Click en tu instancia
2. Ir a **Networking** → **Firewall**
3. Agregar regla:
   - Protocol: TCP
   - Port: 3335
   - Source: Anywhere (0.0.0.0/0)

### Paso 7: Obtener Dirección Pública

1. En el dashboard, verás **Public IP** (ej: 54.123.456.789)
2. Accede a: `http://54.123.456.789:3335`

### Paso 8: Asignar Dominio (Opcional)

En Lightsail Dashboard:

1. Ve a **Networking**
2. Click en **Create DNS zone**
3. Ingresa tu dominio (ej: activos.tuempresa.com)
4. Apunta tus registros DNS al IP público de Lightsail

---

# 🏢 OPCIÓN C: SERVIDOR DEDICADO LOCAL

Si prefieres mantener todo en tu oficina:

### Hardware Mínimo Requerido

- **CPU:** Intel i3 o superior (2 núcleos mínimo)
- **RAM:** 4GB mínimo (8GB recomendado)
- **Almacenamiento:** 256GB SSD
- **Conexión:** Fibra óptica o ADSL estable (mínimo 10 Mbps)

### Sistema Operativo

Recomendado: **Ubuntu Server 22.04 LTS** (sin GUI)

```bash
# Instalación similar a VPS (Pasos 3-10 arriba)
```

### Configuración de Red en Oficina

1. **Configura IP estática** en el servidor
2. **Abre Puerto 3335** en el router:
   - IP interna: IP del servidor
   - Puerto externo: 3335 (o usa 80/443 si quieres)
3. **Usa Dynamic DNS** si tu IP cambia:
   - Servicio: No-IP, DuckDNS, etc.
   - Dominio: `activos.tuempresa.no-ip.info`

### Acceso Remoto para Agentes

En el router, configura **Port Forwarding:**
```
Protocolo: TCP
Puerto Externo: 3335
IP Interna: 192.168.x.x (IP del servidor)
Puerto Interno: 3335
```

---

# 🔐 CONFIGURACIÓN DE SEGURIDAD

## 1. Cambiar Contraseña Root

```bash
sudo passwd root
```

## 2. Crear Usuario No-Root

```bash
# Crear usuario
sudo adduser gestion-activos

# Agregar a grupo sudo
sudo usermod -aG sudo gestion-activos

# Cambiar a ese usuario
su - gestion-activos
```

## 3. Configurar SSH Seguro

```bash
# Editar configuración SSH
sudo nano /etc/ssh/sshd_config
```

**Cambios importantes:**

```
# Cambiar puerto (opcional, más seguro)
Port 2222

# Deshabilitar login con contraseña
PasswordAuthentication no
PubkeyAuthentication yes

# Deshabilitar root login
PermitRootLogin no

# Deshabilitar autenticación vacía
PermitEmptyPasswords no
```

**Aplicar cambios:**

```bash
sudo systemctl restart sshd
```

## 4. Firewall (UFW)

```bash
# Habilitar firewall
sudo ufw enable

# Permitir SSH (importante!)
sudo ufw allow 22

# Permitir HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Permitir puerto de aplicación
sudo ufw allow 3335

# Ver reglas
sudo ufw status
```

## 5. Actualizar Automáticamente

```bash
# Instalar unattended-upgrades
sudo apt install -y unattended-upgrades

# Configurar
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades

# Habilitar
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 6. Monitorar Accesos Fallidos

```bash
# Instalar Fail2Ban
sudo apt install -y fail2ban

# Iniciar
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

---

# 🔌 CONFIGURACIÓN DE AGENTES REMOTOS

## Para que los Agentes Windows se conecten al Servidor Remoto

### Paso 1: Obtener URL Pública del Servidor

- **Si usas VPS con dominio:** `https://activos.tuempresa.com`
- **Si usas IP pública:** `http://54.123.456.789:3335`
- **Si usas servidor local:** `http://192.168.x.x:3335` (solo dentro de la red) o configura DuckDNS

### Paso 2: Configurar Agentes para URL Remota

**En Windows (en cada computadora):**

```powershell
# Ejecutar agente con configuración
python agente_inventario.py --config
```

**Ingresa:**
```
Servidor destino [http://localhost:3335]: https://activos.tuempresa.com
Intervalo en segundos [3600]: 3600
```

### Paso 3: Probar Conexión

```powershell
python agente_inventario.py --ahora
```

**Respuesta esperada:**
```
✅ Inventario REGISTRADO en https://activos.tuempresa.com
   Hostname: PC-CRISTOPHER
   CPU: Intel Core i7-10700K (8 núcleos)
   RAM: 16GB (52.8% utilizado)
   GPU: NVIDIA GeForce...
   ⏳ Esperando enlace manual en la interfaz web...
```

### Paso 4: Agendar Ejecución Diaria (Windows Task Scheduler)

**Opción Manual:**

```powershell
# Abre PowerShell como administrador
$action = New-ScheduledTaskAction -Execute "python.exe" -Argument "C:\Program Files\Axis\Inventario\agente_inventario.py --ahora"
$trigger = New-ScheduledTaskTrigger -Daily -At 9:00AM
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "Axis_Inventario_Diario_9AM" -Description "Enviar inventario diariamente a las 9AM"
```

**O manualmente:**
1. Abre **Programador de tareas** de Windows
2. **Crear tarea básica**
3. Nombre: `Axis Inventario 9AM`
4. Desencadenador: Diario a las 9:00 AM
5. Acción: Ejecutar programa
   - Programa: `python.exe`
   - Argumentos: `C:\Program Files\Axis\Inventario\agente_inventario.py --ahora`

---

# 📊 MONITOREO Y MANTENIMIENTO

## Monitoreo de Servidor

```bash
# Ver estadísticas en tiempo real
htop

# Ver espacio en disco
df -h

# Ver uso de memoria
free -h

# Ver procesos de Node.js
ps aux | grep node
```

## Ver Logs

```bash
# Logs de PM2
pm2 logs gestion-activos

# Logs de Nginx
sudo tail -f /var/log/nginx/error.log

# Logs del sistema
sudo tail -f /var/log/syslog
```

## Reiniciar Servicios

```bash
# Reiniciar aplicación
pm2 restart gestion-activos

# Reiniciar Nginx
sudo systemctl restart nginx

# Reiniciar servidor completo (cuidado, afecta usuarios)
sudo reboot
```

## Monitoreo de Salud

Crear script para verificar que todo está funcionando:

```bash
# Crear script
nano /usr/local/bin/health-check.sh
```

**Contenido:**

```bash
#!/bin/bash

echo "=== HEALTH CHECK - $(date) ==="

# Verificar Node.js
if pm2 status | grep -q "online"; then
    echo "✅ Aplicación Node.js: ONLINE"
else
    echo "❌ Aplicación Node.js: OFFLINE"
    pm2 restart gestion-activos
fi

# Verificar Nginx
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx: ACTIVO"
else
    echo "❌ Nginx: INACTIVO"
    sudo systemctl restart nginx
fi

# Verificar conexión HTTP
if curl -s http://localhost:3335 > /dev/null; then
    echo "✅ Acceso HTTP: OK"
else
    echo "❌ Acceso HTTP: ERROR"
fi

# Verificar espacio en disco
DISK=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK" -lt 80 ]; then
    echo "✅ Espacio en disco: ${DISK}%"
else
    echo "⚠️  Espacio en disco: ${DISK}% (CRÍTICO)"
fi

echo "=== FIN HEALTH CHECK ==="
```

**Hacer ejecutable:**

```bash
sudo chmod +x /usr/local/bin/health-check.sh

# Ejecutar cada 5 minutos
crontab -e
# Agregar:
*/5 * * * * /usr/local/bin/health-check.sh >> /var/log/health-check.log 2>&1
```

---

# ❌ TROUBLESHOOTING

## Error: "Connection refused" (Conexión rechazada)

**Síntomas:**
```
⚠️ Error en servidor: Error: connect ECONNREFUSED 127.0.0.1:3335
```

**Soluciones:**

```bash
# 1. Verificar que PM2 está corriendo
pm2 status

# 2. Si está offline, reiniciar
pm2 restart gestion-activos

# 3. Ver logs
pm2 logs gestion-activos

# 4. Verificar puerto
sudo netstat -tlnp | grep 3335

# 5. Reiniciar PM2 completamente
pm2 kill
pm2 start server.js --name "gestion-activos"
```

---

## Error: "404 Not Found"

**Síntomas:**
```
Error 404 al acceder a http://servidor:3335
```

**Soluciones:**

```bash
# 1. Verificar que archivos estén en lugar correcto
ls -la /var/www/gestion-activos-ti/servidor/public/

# 2. Si falta carpeta public, copiarla
scp -r "local/path/public" usuario@servidor:/var/www/gestion-activos-ti/servidor/

# 3. Reiniciar aplicación
pm2 restart gestion-activos
```

---

## Error: "Error: table agentes_reportes has no column named..."

**Síntomas:**
```
Error: table agentes_reportes has no column named cpu_nucleos
```

**Soluciones:**

```bash
# 1. Opción A: Eliminar y recrear BD (pierde datos)
rm /var/www/gestion-activos-ti/servidor/activos.db
pm2 restart gestion-activos

# 2. Opción B: Aplicar migración manual (si tienes SSH)
sqlite3 /var/www/gestion-activos-ti/servidor/activos.db

# Dentro de sqlite:
ALTER TABLE agentes_reportes ADD COLUMN cpu_nucleos INTEGER;
ALTER TABLE agentes_reportes ADD COLUMN cpu_threads INTEGER;
ALTER TABLE agentes_reportes ADD COLUMN cpu_frecuencia TEXT;
# ... agregar otras columnas

.quit
```

---

## Error: "502 Bad Gateway" (Nginx)

**Síntomas:**
```
502 Bad Gateway
```

**Soluciones:**

```bash
# 1. Verificar que PM2 está corriendo
pm2 status

# 2. Ver logs de Nginx
sudo tail -f /var/log/nginx/error.log

# 3. Reiniciar Nginx
sudo systemctl restart nginx

# 4. Verificar puerto correcto en Nginx config
sudo cat /etc/nginx/sites-available/gestion-activos

# Debe tener:
# proxy_pass http://localhost:3335;
```

---

## Error: "SSL_CERTIFICATE_VERIFY_FAILED" (Certificados)

**Síntomas:**
```
Error: [SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed
```

**Soluciones:**

```bash
# 1. Renovar certificado Let's Encrypt
sudo certbot renew

# 2. Verificar que existe
sudo ls -la /etc/letsencrypt/live/activos.tuempresa.com/

# 3. Si falta, generar:
sudo certbot certonly --nginx -d activos.tuempresa.com

# 4. Actualizar Nginx config con rutas correctas
sudo nano /etc/nginx/sites-available/gestion-activos
```

---

## Agente no se conecta (Timeout)

**Síntomas:**
```
❌ No se puede conectar a https://activos.tuempresa.com
```

**Soluciones:**

```bash
# 1. Verificar desde Windows que la URL es accesible
# En PowerShell:
Invoke-WebRequest -Uri "https://activos.tuempresa.com" -SkipCertificateCheck

# 2. Verificar que Nginx está corriendo
sudo systemctl status nginx

# 3. Verificar que PM2 está corriendo
pm2 status

# 4. Verificar firewall (si usas UW)
sudo ufw status

# 5. Verificar que puerto está abierto
sudo netstat -tlnp | grep 3335

# 6. Revisar DNS
nslookup activos.tuempresa.com
```

---

## Base de datos corrupta

**Síntomas:**
```
Error: database disk image is malformed
```

**Soluciones:**

```bash
# 1. Hacer backup
cp /var/www/gestion-activos-ti/servidor/activos.db /var/www/gestion-activos-ti/servidor/activos.db.bak

# 2. Reparar (si es posible)
sqlite3 /var/www/gestion-activos-ti/servidor/activos.db "PRAGMA integrity_check;"

# 3. Si falla, eliminar y recrear
rm /var/www/gestion-activos-ti/servidor/activos.db

# 4. Reiniciar aplicación
pm2 restart gestion-activos

# La BD se recreará vacía
```

---

# 📋 CHECKLIST FINAL

Antes de ir a producción, verifica:

- [ ] Node.js 22.5+ instalado en servidor
- [ ] PM2 configurado y corriendo
- [ ] Nginx proxy configurado
- [ ] SSL/HTTPS funcionando
- [ ] Firewall configurado correctamente
- [ ] Backups automáticos configurados
- [ ] Agentes pueden conectarse a URL remota
- [ ] Base de datos tiene todas las columnas (sin errores 500)
- [ ] Logs monitoreados regularmente
- [ ] Documentación de acceso actualizada
- [ ] Equipo capacitado en mantenimiento básico

---

# 📞 CONTACTO Y SOPORTE

**En caso de problemas:**

1. **Verifica logs:** `pm2 logs gestion-activos`
2. **Reinicia servicios:** `pm2 restart gestion-activos`
3. **Consulta Troubleshooting** arriba
4. **Contacta al proveedor de hosting** si es problema de red/servidor

**Para actualizaciones:**

```bash
# Actualizar código
cd /var/www/gestion-activos-ti/servidor
git pull origin main

# Reinstalar dependencias
npm install

# Reiniciar
pm2 restart gestion-activos
```

---

## 🎉 ¡LISTO!

Tu sistema **Gestión de Activos TI** está en producción. Accede a:

- **URL pública:** `https://activos.tuempresa.com`
- **Dashboard:** Login con credenciales admin
- **Agentes:** Configuran URL remota en `--config`

**Próximos pasos:**
1. Instala agentes en 2-3 computadoras de prueba
2. Verifica que reportes lleguen correctamente
3. Entrena al equipo de admins
4. Realiza backups regulares
5. Monitorea logs diariamente

---

**Documento actualizado:** 27-07-2026  
**Versión:** 2.0  
**Autor:** Equipo Técnico Axis Group
