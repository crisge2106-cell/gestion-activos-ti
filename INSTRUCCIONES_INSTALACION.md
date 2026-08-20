# Instrucciones de Instalación - Gestión de Activos TI

La aplicación soporta **dos tipos de base de datos** automáticamente:
- **SQLite** para desarrollo local y servidores VPS/Docker
- **MongoDB** para plataformas serverless como Vercel

La BD se elige automáticamente según la presencia de la variable de entorno `MONGODB_URI`.

---

## Tabla de Contenidos

1. [Instalación Local (Desarrollo con SQLite)](#instalación-local-desarrollo-con-sqlite)
2. [Instalación en VPS/Docker (SQLite)](#instalación-en-vpsdocker-sqlite)
3. [Instalación en Vercel (MongoDB)](#instalación-en-vercel-mongodb)
4. [Cómo el Sistema Elige la BD](#cómo-el-sistema-elige-la-bd)
5. [Variables de Entorno](#variables-de-entorno)
6. [Solución de Problemas](#solución-de-problemas)

---

## Instalación Local (Desarrollo con SQLite)

### Requisitos

- **Node.js**: 22.5 o superior (recomendado 22.11+)
- **npm**: Incluido con Node.js
- **Git** (opcional, pero recomendado)

### Pasos

1. **Clonar o descargar el repositorio**
   ```bash
   cd "D:\Proyectos\Gestion de activos TI"
   ```

2. **Instalar dependencias**
   ```bash
   cd servidor
   npm install
   ```
   Esto instalará:
   - `exceljs` - para generación de reportes Excel
   - `mongodb` - para soporte Vercel (no se usa en desarrollo)
   - `better-sqlite3` - para SQLite (dependencia opcional, instalada si está disponible)

   > **Nota**: Si `better-sqlite3` falla en instalar (común en Windows), Node.js 22.5+ incluye SQLite nativo, así que el sistema funcionará igual.

3. **Iniciar el servidor**
   ```bash
   npm start
   # O: node server.js
   ```

4. **Acceder a la aplicación**
   - Navegador local: `http://localhost:3335`
   - Desde otra máquina en la red: `http://<IP-DE-ESTE-EQUIPO>:3335`

### Notas sobre SQLite en Desarrollo

- La BD se guarda en `servidor/activos.db` (archivo local)
- Los datos persisten entre reinicios
- SQLite usa la interfaz sincrónica de Node.js 22.5+ (built-in `sqlite`)
- Ideal para desarrollo, testing y prototipado

---

## Instalación en VPS/Docker (SQLite)

### Para Servidores VPS/Dedicados

1. **Instalar Node.js 22.5+**
   ```bash
   # En Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Verificar instalación
   node --version
   ```

2. **Clonar el repositorio**
   ```bash
   git clone <tu-repo-url>
   cd "Gestion-de-activos-TI/servidor"
   ```

3. **Instalar dependencias**
   ```bash
   npm install --production
   ```

4. **Crear carpeta de datos (opcional)**
   ```bash
   mkdir -p /var/lib/gestion-activos
   chmod 755 /var/lib/gestion-activos
   ```

5. **Iniciar el servidor**
   ```bash
   # Ejecución simple
   node server.js

   # O con pm2 (recomendado para producción)
   npm install -g pm2
   pm2 start server.js --name "gestion-activos"
   pm2 startup
   pm2 save
   ```

6. **Configurar reverse proxy (Nginx/Apache)**
   ```nginx
   # Nginx
   server {
       listen 80;
       server_name tu-dominio.com;

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

### Para Docker

**Dockerfile**
```dockerfile
FROM node:22-alpine

WORKDIR /app
COPY servidor/ .

RUN npm install --production

EXPOSE 3335

CMD ["node", "server.js"]
```

**docker-compose.yml**
```yaml
version: '3.8'

services:
  gestion-activos:
    build: .
    ports:
      - "3335:3335"
    volumes:
      - ./data:/app  # Persiste la BD SQLite
    environment:
      - NODE_ENV=production
      - PORT=3335
```

**Ejecutar con Docker**
```bash
docker-compose up -d
```

### Notas sobre SQLite en VPS

- La BD SQLite se guarda en el volumen/carpeta del servidor
- Asegurar permisos de lectura/escritura en la carpeta
- Hacer backups regulares de `activos.db`
- Para bases de datos muy grandes (>1GB), considerar migrar a PostgreSQL

---

## Instalación en Vercel (MongoDB)

### Requisitos

- Cuenta en [Vercel](https://vercel.com)
- Cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Git y GitHub configurados

### Pasos

1. **Crear cluster MongoDB en Atlas**
   - Ir a https://www.mongodb.com/cloud/atlas
   - Crear un proyecto nuevo
   - Crear un cluster (tier gratuito es suficiente)
   - Crear un usuario de BD
   - Obtener la URI de conexión (formato: `mongodb+srv://user:password@cluster.mongodb.net/gestion_activos`)

2. **Clonar y preparar el repositorio**
   ```bash
   git clone <tu-repo-url>
   cd "Gestion-de-activos-TI"
   git add .
   git commit -m "Agregar soporte dual SQLite/MongoDB"
   git push origin main
   ```

3. **Importar proyecto en Vercel**
   - Ir a https://vercel.com/new
   - Conectar tu repositorio de GitHub
   - Seleccionar la rama `main`
   - En "Environment Variables", agregar:
     ```
     MONGODB_URI = mongodb+srv://user:password@cluster.mongodb.net/gestion_activos
     ```

4. **Configurar Vercel (vercel.json)**
   ```json
   {
     "buildCommand": "npm install",
     "outputDirectory": "servidor",
     "env": {
       "MONGODB_URI": "@mongodb_uri"
     }
   }
   ```

5. **Deploy**
   - Vercel desplegará automáticamente
   - La app usará MongoDB automáticamente (por MONGODB_URI)

### Notas sobre MongoDB en Vercel

- MongoDB Atlas gratuito tiene límites (512MB, 3 usuarios)
- Para producción, considerar tier pago
- La BD se gestiona en MongoDB Atlas (no localmente)
- Backup automático disponible en Atlas

---

## Cómo el Sistema Elige la BD

El sistema de **detección automática** funciona así:

```
┌─────────────────────────────────────┐
│  Inicio de servidor.js              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  db.init() verifica:                │
│  ¿MONGODB_URI está definida?        │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │             │
       SÍ             NO
        │             │
        ▼             ▼
   ┌────────────┐  ┌──────────────┐
   │ Usa        │  │ Usa SQLite   │
   │ MongoDB    │  │ (nativo)     │
   └────────────┘  └──────────────┘
        │             │
        ▼             ▼
    Vercel       Local/VPS/Docker
```

**Código en `db-factory.js`:**
```javascript
if (MONGODB_URI) {
  // Usa MongoDB para Vercel
  dbInstance = createMongoDBAdapter();
} else {
  // Usa SQLite para desarrollo/VPS
  dbInstance = createSQLiteAdapter();
}
```

**No es necesario cambiar código ni configuración**: el sistema elige automáticamente basado en la presencia de `MONGODB_URI`.

---

## Variables de Entorno

### Desarrollo Local (SQLite)
No se requieren variables de entorno. Por defecto:
- `PORT=3335` (puerto del servidor)
- BD en `servidor/activos.db`

### VPS/Docker (SQLite)
```bash
# Opcional
NODE_ENV=production      # Para modo producción
PORT=3335               # Puerto personalizado (default: 3335)
# NO definir MONGODB_URI para usar SQLite
```

### Vercel (MongoDB)
```bash
# REQUERIDO
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/gestion_activos

# Opcional
NODE_ENV=production
PORT=3335
```

### Verificar Variables en Runtime

El servidor imprime la BD en uso al iniciar:
```
✅ Base de datos: SQLite
   Path: /ruta/a/activos.db

# O:

✅ Base de datos: MongoDB
   URI: mongodb+srv://user:****@cluster.mongodb.net/gestion_activos
```

---

## Solución de Problemas

### "Error: SQLite no disponible"

**Problema**: Node.js < 22.5 o `better-sqlite3` no instalada

**Solución**:
1. Actualizar Node.js a 22.5+
   ```bash
   node --version  # Debe ser v22.5.0 o superior
   ```
2. O instalar `better-sqlite3`:
   ```bash
   npm install better-sqlite3
   ```

### "Error conectando a MongoDB"

**Problema**: `MONGODB_URI` inválida o sin conexión a internet

**Verificar**:
1. URI correcta:
   ```bash
   echo $MONGODB_URI  # En Linux/Mac
   echo %MONGODB_URI% # En Windows
   ```
2. Acceso a MongoDB Atlas:
   - IP del servidor agregada a whitelist
   - Usuario de BD existe
   - Contraseña correcta

### "Base de datos vacía en Vercel"

**Causa**: Puede ser un redeploy que creó BD nueva

**Solución**:
1. Si es primera vez, importar seed:
   ```bash
   # Desde local (desarrollo)
   npm run seed  # Si existe script
   ```
2. O restaurar backup de MongoDB Atlas

### "Permisos denegados en VPS"

**Problema**: No puede escribir `activos.db`

**Solución**:
```bash
# En VPS
sudo chmod 755 /ruta/a/servidor
sudo chmod 644 /ruta/a/servidor/activos.db

# O asignar usuario:
sudo chown -R app_user:app_user /ruta/a/servidor
```

### "Puerto 3335 ya en uso"

**Solución**:
```bash
# Cambiar puerto
PORT=3336 npm start

# O liberar puerto (Linux):
sudo lsof -i :3335
sudo kill -9 <PID>
```

---

## Migración entre BD

### De SQLite a MongoDB (para Vercel)

1. **En desarrollo local**:
   ```bash
   # Exportar datos de SQLite
   node -e "const db = require('sqlite3'); ..."
   ```

2. **En MongoDB Atlas**:
   - Crear colecciones manualmente o via script
   - Importar datos JSON

3. **Usar script de migración** (si existe):
   ```bash
   node migrate_to_mongodb.js
   ```

### De MongoDB a SQLite (para VPS)

Similar pero inverso. Contactar al equipo de desarrollo.

---

## Soporte

Para problemas o dudas:
- Revisar logs del servidor: `npm start` (verá errores en consola)
- En Vercel: revisar logs en Dashboard > Deployments > Details
- En MongoDB: revisar Atlas > Clusters > Connect > Logs

---

**Versión**: 1.0  
**Última actualización**: 2026-08-20  
**Autor**: Equipo Desarrollo Axis Group
