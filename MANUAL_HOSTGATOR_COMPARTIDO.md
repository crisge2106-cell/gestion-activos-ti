# 🌐 GUÍA: DESPLEGAR EN HOSTGATOR COMPARTIDO
## Gestión de Activos TI - Axis Group

---

## ⚠️ IMPORTANTE: LIMITACIONES DE HOSTGATOR COMPARTIDO

Hosting compartido de HostGator **NO está optimizado para Node.js**. Típicamente ofrece:

✅ **Soporta:**
- PHP 7.4 - 8.1
- MySQL 5.7 - 8.0
- WordPress, Joomla, Drupal
- Acceso FTP/SFTP

❌ **NO Soporta nativamente:**
- Node.js directo
- Procesos de larga duración (forever running)
- SQLite en algunos planes
- Instalación de paquetes npm

---

## 🎯 SOLUCIONES POSIBLES

| Opción | Complejidad | Costo | Tiempo |
|--------|-------------|-------|--------|
| A. Actualizar a VPS HostGator | Baja | +$3/mes | 15 min |
| B. Node.js en cPanel (si lo permite) | Media | Gratis | 1 hora |
| C. Backend externo + Frontend PHP | Alta | +$5/mes | 4 horas |
| D. Usar servicio cloud para backend | Media | +$5/mes | 2 horas |

---

## 💡 RECOMENDACIÓN

**Para Axis Group con HostGator compartido:**

→ **Opción D (Híbrida):**
- **Frontend (interfaz web):** En HostGator compartido (PHP)
- **Backend (API + Base de datos):** En servicio cloud gratuito (Vercel, Railway, Render)
- **Agentes:** Se conectan al backend en la nube

**Ventajas:**
- Mantiene hosting actual ($3-5/mes)
- Backend gratuito o muy barato ($0-5/mes)
- Escalable
- Separación clara de responsabilidades

---

# 🔍 OPCIÓN A: VERIFICAR SI HOSTGATOR PERMITE NODE.JS

## Paso 1: Acceder a cPanel

1. Ve a `https://tudominio.com:2083` o `https://tudominio.com/cPanel`
2. Login con credenciales de HostGator
3. Busca **Software** o **Development**

## Paso 2: Buscar Node.js

En cPanel, busca:
- **Setup Node.js App**
- **Node.js Manager**
- **Developer Tools**

### Si EXISTE "Setup Node.js App":

¡Buena noticia! HostGator permite Node.js en tu cuenta.

**Sigue estos pasos:**

```bash
# 1. En cPanel → Setup Node.js App
# 2. Click en "Create Application"
# 3. Configura:
#    - Node.js Version: 18.x o superior
#    - Application URL: activos.tudominio.com
#    - Application Startup File: server.js
#    - Application Root: /home/tunombreusuario/public_html/gestion-activos
# 4. Click en "Deploy"
```

**Luego sube tu código:**

```powershell
# Desde tu máquina Windows, conecta por SFTP
# (HostGator provee credenciales SFTP en cPanel)

# Usando WinSCP (interfaz gráfica):
# 1. Descarga: https://winscp.net/eng/download.php
# 2. Abre WinSCP
# 3. Conexión rápida:
#    - Nombre de host: sftp.tudominio.com
#    - Nombre de usuario: tu_usuario_hostgator
#    - Contraseña: tu_contraseña
# 4. Navega a: /public_html/gestion-activos
# 5. Sube archivos de servidor/ aquí
# 6. Sube package.json también
```

**En cPanel, instala dependencias:**

```bash
# En el terminal SSH de cPanel (si está disponible):
cd /home/tunombreusuario/public_html/gestion-activos
npm install
```

### Si NO EXISTE "Setup Node.js App":

Tu plan de HostGator no soporta Node.js. Ve a **Opción D** (Backend Externo).

---

# 🌍 OPCIÓN D: BACKEND EN LA NUBE + FRONTEND EN HOSTGATOR

Esta es la solución más práctica para HostGator compartido.

## Arquitectura

```
Agentes Windows
      ↓
  API Backend (Cloud)  ← Vercel, Railway, Render
      ↓
  Base de datos (Cloud) ← MongoDB Atlas, Railway
      ↓
  Interface Web (HostGator) ← HTML/PHP
      ↓
Usuarios Admin
```

---

## PASO 1: Crear Backend en Vercel (GRATIS)

### 1.1: Registrarse en Vercel

1. Ve a https://vercel.com
2. Click en **Sign Up**
3. Usa GitHub / Google / email

### 1.2: Preparar código Node.js para Vercel

Vercel requiere que el servidor sea compatible con **Serverless**.

**Modifica `server.js`:**

```javascript
// Al inicio del archivo, agrega:
const isDev = process.env.NODE_ENV !== 'production';

// Si es Vercel (production), exporta como función serverless
if (!isDev && process.env.VERCEL) {
  // Modo Vercel
  module.exports = app;
} else {
  // Modo local/desarrollo
  const PORT = process.env.PORT || 3335;
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
  });
}
```

**Crear `vercel.json` en la raíz del proyecto:**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "servidor/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "servidor/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 1.3: Subir a GitHub

```bash
cd D:\Proyectos\Gestion de activos TI
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tuusuario/gestion-activos-ti.git
git push -u origin main
```

### 1.4: Desplegar en Vercel

1. En Vercel dashboard, click en **New Project**
2. Conecta tu repositorio GitHub
3. Elige rama: **main**
4. Configura:
   - **Root Directory:** `servidor`
   - **Build Command:** `npm install`
   - **Output Directory:** `.next` (o dejarlo vacío)
5. Click en **Deploy**

**Vercel te dará una URL:** `https://gestion-activos-xxxxxxx.vercel.app`

---

## PASO 2: Base de Datos en MongoDB Atlas (GRATIS)

### 2.1: Crear cuenta MongoDB Atlas

1. Ve a https://www.mongodb.com/cloud/atlas
2. Click en **Get Started Free**
3. Registrate

### 2.2: Crear cluster gratis

1. Click en **Build a Database**
2. Elige **Shared** (gratis)
3. Selecciona proveedor: **AWS**
4. Región: Tu región más cercana
5. Click en **Create Cluster**

### 2.3: Configurar base de datos

1. Click en **Database Access**
2. **Add new database user:**
   - Username: `gestion_activos`
   - Password: (genera una segura)
   - Roles: `readWriteAnyDatabase`

3. Click en **Network Access**
4. **Add IP Address:**
   - Ingresa: `0.0.0.0/0` (permite desde cualquier lugar)
   - Reason: "Production Access"

### 2.4: Obtener cadena de conexión

1. Vuelve a **Clusters**
2. Click en **Connect**
3. Elige **Connect your application**
4. Copia la cadena: 
   ```
   mongodb+srv://gestion_activos:PASSWORD@cluster0.xxxxx.mongodb.net/gestion_activos?retryWrites=true&w=majority
   ```

### 2.5: Guardar en Vercel (variables de entorno)

En Vercel Dashboard:

1. Ve a tu proyecto
2. **Settings** → **Environment Variables**
3. Agrega:
   - **Name:** `MONGODB_URI`
   - **Value:** (pega la cadena de MongoDB)
4. Click en **Save** y **Redeploy**

---

## PASO 3: Modificar Backend para MongoDB

**Modifica `server.js` para usar MongoDB en lugar de SQLite:**

```javascript
// Instala primero:
// npm install mongodb

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
let db;
let client;

async function connectDB() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db('gestion_activos');
  }
  return db;
}

// Reemplaza consultas SQLite con MongoDB equivalentes:

// SQLite: db.prepare('SELECT * FROM equipos').all()
// MongoDB: await db.collection('equipos').find({}).toArray()

// SQLite: db.prepare('INSERT INTO equipos...').run(...)
// MongoDB: await db.collection('equipos').insertOne({...})

// SQLite: db.prepare('UPDATE equipos SET...').run(...)
// MongoDB: await db.collection('equipos').updateOne({id}, {$set: {...}})
```

**Alternativa más fácil: Mantener SQLite**

Si prefieres no cambiar a MongoDB, mantén SQLite y:
- En Vercel, guarda la BD en `/tmp` (se borra al reiniciar)
- O usa una base de datos compatible con Vercel

---

## PASO 4: Frontend en HostGator

### 4.1: Crear archivo `config.js`

En HostGator, crea `/public/config.js`:

```javascript
// Configuración del backend remoto
const API_BASE_URL = 'https://gestion-activos-xxxxxxx.vercel.app';

// Reemplaza todas las llamadas a /api con el URL remoto
async function apiCall(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
```

### 4.2: Modificar `index.html`

En la sección `<head>`, agrega:

```html
<script src="config.js"></script>
```

Luego, modifica todas las llamadas a `fetch('/api/...', ...)`:

```javascript
// Antes:
fetch('/api/equipos')

// Después:
apiCall('/api/equipos')
```

### 4.3: Subir a HostGator

Usa WinSCP o el **File Manager** de cPanel:

1. Conecta por SFTP
2. Navega a `/public_html`
3. Sube carpeta `public/` completa
4. Sube `config.js`

### 4.4: Acceder desde navegador

```
https://tudominio.com/public/index.html
```

---

## PASO 5: Configurar Agentes para Backend Remoto

En cada máquina Windows:

```powershell
python agente_inventario.py --config
```

**Ingresa URL de Vercel:**
```
Servidor destino: https://gestion-activos-xxxxxxx.vercel.app
Intervalo en segundos: 3600
```

**Prueba:**
```powershell
python agente_inventario.py --ahora
```

Respuesta esperada:
```
✅ Inventario REGISTRADO en https://gestion-activos-xxxxxxx.vercel.app
   Hostname: PC-CRISTOPHER
   CPU: Intel Core i7-10700K (8 núcleos)
   ...
```

---

## PASO 6: Dominio Personalizado (Opcional)

### Para Vercel (Backend)

1. En Vercel, ve a **Settings** → **Domains**
2. Agrega: `api.tudominio.com`
3. Vercel te dirá qué registros DNS agregar
4. En tu registrador de dominio, agrega los registros CNAME

### Para HostGator (Frontend)

Ya está incluido en tu hosting. Accede a:
```
https://tudominio.com/public/index.html
```

---

## ✅ VENTAJAS DE ESTA SOLUCIÓN

✅ **HostGator compartido mantiene hosting actual ($5-10/mes)**
✅ **Backend en Vercel gratis** (hasta 100GB tráfico/mes)
✅ **Base de datos MongoDB gratis** (hasta 512MB)
✅ **Escalable** — Puedes agregar máquinas sin problemas
✅ **Seguro** — APIs separadas, CORS configurado
✅ **Fácil de mantener** — Actualiza backend sin tocar HostGator

---

## ⚠️ LIMITACIONES

❌ **Vercel reinicia cada 24 horas** — Pero tus datos persisten en MongoDB
❌ **Primer acceso es lento** (~2 seg) — Cold start de función serverless
❌ **Tráfico limitado** — 100GB/mes gratuito (suficiente para 50+ equipos)
❌ **Base de datos limitada** — 512MB MongoDB gratis (suficiente)

---

## 🔧 ALTERNATIVAS SI VERCEL NO FUNCIONA

### Opción D2: Railway.app (Recomendado como alternativa)

Railway es más fácil que Vercel para Node.js + MongoDB:

1. Ve a https://railway.app
2. Signup con GitHub
3. Click en **New Project** → **Deploy from GitHub**
4. Selecciona tu repositorio
5. Railway detecta Node.js automáticamente
6. Configura variables de entorno (MONGODB_URI)
7. Click en **Deploy**

**Costo:** $5/mes (pero muy fácil de usar)

### Opción D3: Render.com

Similar a Railway, también soporta Node.js + PostgreSQL (o MongoDB):

1. https://render.com
2. **New** → **Web Service**
3. Conecta GitHub
4. Configura y Deploy

**Costo:** Gratis hasta 750 horas/mes (suficiente para desarrollo)

---

# 🚀 IMPLEMENTACIÓN RÁPIDA

Si quieres empezar rápido, sigue estos pasos:

## Semana 1: Setup

```bash
# 1. Crea repositorio GitHub
git clone tu-repo
cd gestion-activos-ti

# 2. Instala dependencias locales
npm install

# 3. Crea vercel.json (copiar de arriba)

# 4. Push a GitHub
git add .
git commit -m "Setup for Vercel"
git push
```

## Semana 2: Deployment

```bash
# 1. Deploy en Vercel (automático desde GitHub)
# 2. Configura MongoDB Atlas (5 min)
# 3. Agrega MONGODB_URI a Vercel env vars
# 4. Redeploy en Vercel
```

## Semana 3: Frontend en HostGator

```bash
# 1. Crea config.js con URL de Vercel
# 2. Sube files a HostGator
# 3. Prueba acceso: https://tudominio.com/public
```

## Semana 4: Agentes

```bash
# En cada equipo Windows:
python agente_inventario.py --config
# Ingresa URL Vercel: https://gestion-activos-xxx.vercel.app
```

---

# 📋 CHECKLIST FINAL

- [ ] HostGator compartido tiene acceso SSH
- [ ] Vercel está configurado y deployado
- [ ] MongoDB Atlas está corriendo
- [ ] Variables de entorno en Vercel configuradas
- [ ] Frontend sube a HostGator
- [ ] config.js apunta a URL Vercel correcto
- [ ] Prueba manual: `curl https://vercel-url/api/health`
- [ ] Agentes pueden conectarse
- [ ] Datos llegan a MongoDB Atlas
- [ ] Interfaz muestra datos correctamente

---

# 💬 PREGUNTAS FRECUENTES

### P: ¿Puedo usar HostGator compartido directamente?

R: No fácilmente. Node.js no está optimizado en hosting compartido. Usa la solución híbrida (backend externo).

### P: ¿Cuánto cuesta en total?

R: 
- HostGator compartido: $5-10/mes (ya lo tienes)
- Vercel/Railway: $0-5/mes adicional
- MongoDB: Gratis

**Total adicional: $0-5/mes**

### P: ¿Qué pasa si Vercel se cae?

R: Los agentes fallarán al conectar. Configura un email de alerta y monitorea el status en https://www.vercelstatus.com

### P: ¿Puedo volver a HostGator si quiero?

R: Sí, pero necesitarías actualizar a VPS HostGator. La solución híbrida es temporal.

### P: ¿Los agentes remotos funcionan igual?

R: Sí, se conectan a la URL de Vercel igual que si fuera local.

---

# 📞 SIGUIENTE PASO

**Elige:**

1. ¿Intentar Node.js en HostGator? → Verifica en cPanel si existe "Setup Node.js App"
2. ¿Usar solución híbrida (recomendado)? → Sigue los pasos Opción D arriba
3. ¿Cambiar a VPS HostGator? → Cuesta similar pero mucho más fácil

¿Cuál prefieres?

---

**Documento actualizado:** 27-07-2026  
**Para:** HostGator Compartido  
**Soporte:** Contacta a tu proveedor de hosting para acceso SSH/cPanel
