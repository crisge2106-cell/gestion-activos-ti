// ============================================================================
//  Gestion de Activos TI - Axis Group
//  Servidor local (Node.js nativo + node:sqlite) con inicio de sesion
//
//  Requisitos: Node.js 22.5 o superior
//  Uso:
//    node server.js
//  Luego abre en el navegador:  http://localhost:3335
//  Desde otros dispositivos en la misma red: http://<IP-DE-ESTE-EQUIPO>:3335
// ============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const net = require('net');
const tls = require('tls');
const db = require('./db-factory');
const { execSync, spawn } = require('child_process');
const ExcelJS = require('exceljs');

const PORT = process.env.PORT || 3335;
const DB_PATH = path.join(__dirname, 'activos.db');
const PUBLIC_DIR = path.join(__dirname, 'public');
const SEED_PATH = path.join(__dirname, 'seed.json');
const RESET_LOG_PATH = path.join(__dirname, 'codigos-recuperacion.txt');
const SMTP_CONFIG_PATH = path.join(__dirname, 'smtp-config.json');

// ---------------------------------------------------------------------------
// Detección de entorno (LOCAL vs VERCEL/SERVERLESS)
// ---------------------------------------------------------------------------
const isVercel = process.env.VERCEL === 'true';
const isProduction = process.env.NODE_ENV === 'production';
const isServerless = isVercel || isProduction;

console.log(`🌍 Entorno: ${isServerless ? 'VERCEL/SERVERLESS' : 'LOCAL'}`);
console.log(`📦 BD será: ${process.env.MONGODB_URI ? 'MongoDB' : 'SQLite'}`);

// ---------------------------------------------------------------------------
// Base de datos
// ---------------------------------------------------------------------------
// Variables de estado de la BD
let dbReady = false;
let dbPromise = null;
let ensureDBReady = null;

// Función auxiliar para crear tablas
const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS equipos (
    id TEXT PRIMARY KEY,
    tipo TEXT, marca TEXT, modelo TEXT, serie TEXT, fechaCompra TEXT,
    sede TEXT, estado TEXT, usuarioActual TEXT, area TEXT, observaciones TEXT,
    cpu TEXT, ram TEXT, disco TEXT, origen TEXT, nombre TEXT, telefonoAsignado TEXT
  );
  CREATE TABLE IF NOT EXISTS movimientos (
    id TEXT PRIMARY KEY,
    tipo TEXT, fecha TEXT, trabajador TEXT, dni TEXT, area TEXT, sede TEXT,
    observaciones TEXT, origen TEXT
  );
  CREATE TABLE IF NOT EXISTS movimiento_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movimientoId TEXT, equipoId TEXT, cantidad INTEGER,
    descripcion TEXT, marcaModelo TEXT, serieEstado TEXT,
    numeroTelefonico1 TEXT, numeroTelefonico2 TEXT
  );
  CREATE TABLE IF NOT EXISTS mantenimientos (
    id TEXT PRIMARY KEY,
    equipoId TEXT, fecha TEXT, tipo TEXT, realizadoPor TEXT, descripcion TEXT
  );
  CREATE TABLE IF NOT EXISTS trabajadores (
    nombre TEXT PRIMARY KEY,
    dni TEXT, area TEXT, sede TEXT, activo INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER);
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    salt TEXT, hash TEXT,
    mustChangePassword INTEGER DEFAULT 0,
    email TEXT
  );
  CREATE TABLE IF NOT EXISTS inventario_reportes (
    id TEXT PRIMARY KEY,
    timestamp TEXT,
    dispositivo_ip TEXT,
    tipo_dispositivo TEXT,
    so TEXT,
    usuario_windows TEXT,
    cpu TEXT,
    ram_total_gb REAL,
    ram_usado_gb REAL,
    ram_disponible_gb REAL,
    disco_total_gb REAL,
    disco_usado_gb REAL,
    disco_disponible_gb REAL,
    modelo_telefono TEXT,
    numero_telefono TEXT,
    ultima_actualizacion TEXT
  );
  CREATE TABLE IF NOT EXISTS agentes_reportes (
    id TEXT PRIMARY KEY,
    identificador TEXT UNIQUE NOT NULL,
    numero_serie_disco TEXT UNIQUE,
    tipo_dispositivo TEXT,
    hostname TEXT,
    so TEXT,
    usuario_windows TEXT,
    cpu TEXT,
    cpu_nucleos INTEGER,
    cpu_threads INTEGER,
    cpu_frecuencia TEXT,
    ram_total_gb REAL,
    ram_usado_gb REAL,
    ram_disponible_gb REAL,
    ram_porcentaje REAL,
    disco_total_gb REAL,
    disco_usado_gb REAL,
    disco_disponible_gb REAL,
    disco_porcentaje REAL,
    placa_madre TEXT,
    gpu TEXT,
    uptime TEXT,
    ips TEXT,
    macs TEXT,
    monitor TEXT,
    equipoId TEXT,
    fecha_primer_reporte TEXT,
    fecha_ultima_actualizacion TEXT,
    enlazado_timestamp TEXT
  );
  CREATE TABLE IF NOT EXISTS solicitudes_compra (
    id TEXT PRIMARY KEY,
    numero TEXT UNIQUE,
    fecha TEXT,
    usuario TEXT,
    descripcion TEXT,
    estado TEXT DEFAULT 'pendiente',
    observaciones TEXT,
    createdAt TEXT
  );
  CREATE TABLE IF NOT EXISTS solicitudes_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    solicitudId TEXT,
    tipo TEXT,
    descripcion TEXT,
    cantidad INTEGER,
    precioUnitario REAL,
    usuarioDestino TEXT,
    observaciones TEXT,
    FOREIGN KEY (solicitudId) REFERENCES solicitudes_compra(id)
  );
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    username TEXT,
    createdAt TEXT,
    expiresAt TEXT
  );
`;

if (!isServerless) {
  // LOCAL: Inicializar inmediatamente
  (async () => {
    try {
      console.log('🔄 Inicializando BD (LOCAL)...');
      await db.init();

      await db.exec(CREATE_TABLES_SQL);

      await seedIfEmpty();
      await backfillTrabajadoresIfEmpty();
      await seedUsersIfEmpty();

      console.log('✅ BD inicializada (LOCAL)');
      dbReady = true;
    } catch (err) {
      console.error('❌ Error inicializando BD (LOCAL):', err.message);
    }
  })();
} else {
  // VERCEL: Lazy initialization
  ensureDBReady = async function() {
    if (dbReady) return;
    if (dbPromise) return dbPromise;

    dbPromise = (async () => {
      try {
        console.log('🔄 Inicializando BD (VERCEL - lazy)...');
        await db.init();

        await db.exec(CREATE_TABLES_SQL);

        await seedIfEmpty();
        await backfillTrabajadoresIfEmpty();
        await seedUsersIfEmpty();

        console.log('✅ BD inicializada (VERCEL)');
        dbReady = true;
      } catch (err) {
        console.error('❌ Error inicializando BD (VERCEL):', err.message);
        throw err;
      }
    })();

    return dbPromise;
  };
}

// ---------------------------------------------------------------------------
// Contadores y IDs
// ---------------------------------------------------------------------------
async function getCounter(name){
  const row = await db.prepare('SELECT value FROM counters WHERE name = ?').get(name);
  if(row) return row.value;
  await db.prepare('INSERT INTO counters (name, value) VALUES (?, 1)').run(name);
  return 1;
}
async function setCounter(name, value){
  // Intentar UPDATE primero, si no actualiza nada, hacer INSERT
  const result = await db.prepare('UPDATE counters SET value = ? WHERE name = ?').run(value, name);
  if(!result || result.changes === 0){
    // Si no se actualizó, insertar (el contador no existe)
    await db.prepare('INSERT INTO counters (name, value) VALUES (?, ?)').run(name, value);
  }
}
async function nextId(prefix, counterName){
  const n = await getCounter(counterName);
  await setCounter(counterName, n+1);
  return prefix + '-' + String(n).padStart(4, '0');
}

// ---------------------------------------------------------------------------
// Trabajadores
// ---------------------------------------------------------------------------
async function upsertTrabajador(t){
  const nombre = (t.nombre||'').trim();
  if(!nombre) return;
  const existing = await db.prepare('SELECT * FROM trabajadores WHERE nombre = ? COLLATE NOCASE').get(nombre);
  if(existing){
    await db.prepare(`UPDATE trabajadores SET dni=COALESCE(NULLIF(?,''),dni), area=COALESCE(NULLIF(?,''),area), sede=COALESCE(NULLIF(?,''),sede), activo=1 WHERE nombre = ? COLLATE NOCASE`)
      .run(t.dni||'', t.area||'', t.sede||'', nombre);
  } else {
    await db.prepare('INSERT INTO trabajadores (nombre,dni,area,sede,activo) VALUES (?,?,?,?,1)').run(nombre, t.dni||'', t.area||'', t.sede||'');
  }
}
async function getTrabajadores(){
  return await db.prepare('SELECT * FROM trabajadores ORDER BY nombre').all();
}
async function getTrabajador(nombre){
  return await db.prepare('SELECT * FROM trabajadores WHERE nombre = ? COLLATE NOCASE').get((nombre||'').trim());
}
async function setTrabajadorActivo(nombre, activo){
  const n = (nombre||'').trim();
  if(!n) return;
  const existing = await getTrabajador(n);
  if(existing){
    await db.prepare('UPDATE trabajadores SET activo=? WHERE nombre = ? COLLATE NOCASE').run(activo?1:0, n);
  } else {
    await db.prepare('INSERT INTO trabajadores (nombre,dni,area,sede,activo) VALUES (?,?,?,?,?)').run(n, '', '', '', activo?1:0);
  }
}

// ---------------------------------------------------------------------------
// Solicitudes de compra
// ---------------------------------------------------------------------------
async function getSolicitudesCompra(){
  const solicitudes = await db.prepare('SELECT * FROM solicitudes_compra ORDER BY fecha DESC').all();
  const solicitudesMap = {};
  for(const sol of solicitudes){
    const items = await db.prepare('SELECT * FROM solicitudes_items WHERE solicitudId = ?').all(sol.id);
    solicitudesMap[sol.id] = {...sol, items};
  }
  return solicitudes.map(s => solicitudesMap[s.id]);
}

async function getSolicitudCompra(id){
  const sol = await db.prepare('SELECT * FROM solicitudes_compra WHERE id = ?').get(id);
  if(!sol) return null;
  const items = await db.prepare('SELECT * FROM solicitudes_items WHERE solicitudId = ?').all(id);
  return {...sol, items};
}

async function insertSolicitudCompra(s){
  const id = await nextId('SOL', 'sol');
  const numero = await nextId('SOL-', 'sol_numero');
  await db.prepare(`INSERT INTO solicitudes_compra (id, numero, fecha, usuario, descripcion, estado, observaciones, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, numero, s.fecha||new Date().toISOString(), s.usuario||'', s.descripcion||'', s.estado||'pendiente', s.observaciones||'', new Date().toISOString());

  const insItem = db.prepare(`INSERT INTO solicitudes_items (solicitudId, tipo, descripcion, cantidad, precioUnitario, usuarioDestino, observaciones)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);

  for(const item of (s.items||[])){
    await insItem.run(id, item.tipo||'bien', item.descripcion||'', item.cantidad||1, 0, item.usuarioDestino||'', item.observaciones||'');
  }

  return getSolicitudCompra(id);
}

async function updateSolicitudCompra(id, s){
  await db.prepare(`UPDATE solicitudes_compra SET fecha=?, usuario=?, descripcion=?, estado=?, observaciones=? WHERE id=?`)
    .run(s.fecha||'', s.usuario||'', s.descripcion||'', s.estado||'pendiente', s.observaciones||'', id);

  await db.prepare('DELETE FROM solicitudes_items WHERE solicitudId = ?').run(id);
  const insItem = db.prepare(`INSERT INTO solicitudes_items (solicitudId, tipo, descripcion, cantidad, precioUnitario, usuarioDestino, observaciones)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);

  for(const item of (s.items||[])){
    await insItem.run(id, item.tipo||'bien', item.descripcion||'', item.cantidad||1, 0, item.usuarioDestino||'', item.observaciones||'');
  }

  return getSolicitudCompra(id);
}

function maxSuffix(ids, prefix){
  let max = 0;
  for(const id of ids){
    if(!id) continue;
    const m = String(id).match(new RegExp('^' + prefix + '-0*(\\d+)$'));
    if(m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

// ---------------------------------------------------------------------------
// Carga masiva de datos
// ---------------------------------------------------------------------------
async function bulkLoad(data){
  const isMongoDBType = db.getType && db.getType() === 'mongodb';

  // En MongoDB: usar insertMany para mejor performance
  if (isMongoDBType) {
    const t0 = Date.now();

    // Preparar documentos en formato MongoDB
    const equiposDocs = (data.equipos||[]).map(e => ({
      id: e.id, nombre: e.nombre||'', tipo: e.tipo||'', marca: e.marca||'', modelo: e.modelo||'', serie: e.serie||'',
      fechaCompra: e.fechaCompra||null, sede: e.sede||'', estado: e.estado||'Disponible',
      usuarioActual: e.usuarioActual||'', area: e.area||'', observaciones: e.observaciones||'',
      cpu: (e.specs&&e.specs.cpu)||e.cpu||'', ram: (e.specs&&e.specs.ram)||e.ram||'', disco: (e.specs&&e.specs.disco)||e.disco||'',
      origen: e.origen||''
    }));

    const movimientosDocs = (data.movimientos||[]).map(m => ({
      id: m.id, tipo: m.tipo||'', fecha: m.fecha||null, trabajador: m.trabajador||'', dni: m.dni||'',
      area: m.area||'', sede: m.sede||'', observaciones: m.observaciones||'', origen: m.origen||''
    }));

    const movItemsDocs = [];
    for(const m of (data.movimientos||[])){
      for(const it of (m.items||[])){
        movItemsDocs.push({
          movimientoId: m.id, equipoId: it.equipoId||null, cantidad: it.cantidad||1,
          descripcion: it.descripcion||'', marcaModelo: it.marcaModelo||'', serieEstado: it.serieEstado||''
        });
      }
    }

    const mantenimientosDocs = (data.mantenimientos||[]).map(mt => ({
      id: mt.id, equipoId: mt.equipoId, fecha: mt.fecha||null, tipo: mt.tipo||'',
      realizadoPor: mt.realizadoPor||'', descripcion: mt.descripcion||''
    }));

    const trabajadoresDocs = (data.trabajadores||[]).map(t => ({
      nombre: t.nombre||'', dni: t.dni||'', area: t.area||'', sede: t.sede||'', activo: 1
    }));

    try {
      // Obtener conexión MongoDB directa
      const mongoDb = await db.getMongoDatabase();
      if (!mongoDb) throw new Error('MongoDB no inicializada');

      // LIMPIAR colecciones antes de insertar (elimina datos corruptos de despliegues anteriores)
      if (equiposDocs.length > 0) {
        await mongoDb.collection('equipos').deleteMany({});
        await mongoDb.collection('movimientos').deleteMany({});
        await mongoDb.collection('movimiento_items').deleteMany({});
        await mongoDb.collection('mantenimientos').deleteMany({});
        await mongoDb.collection('trabajadores').deleteMany({});
        console.log('✅ Colecciones limpiadas antes de bulkLoad');
      }

      if (equiposDocs.length > 0) await mongoDb.collection('equipos').insertMany(equiposDocs, { ordered: false });
      if (movimientosDocs.length > 0) await mongoDb.collection('movimientos').insertMany(movimientosDocs, { ordered: false });
      if (movItemsDocs.length > 0) await mongoDb.collection('movimiento_items').insertMany(movItemsDocs, { ordered: false });
      if (mantenimientosDocs.length > 0) await mongoDb.collection('mantenimientos').insertMany(mantenimientosDocs, { ordered: false });
      if (trabajadoresDocs.length > 0) await mongoDb.collection('trabajadores').insertMany(trabajadoresDocs, { ordered: false });

      const elapsed = Date.now() - t0;
      console.log(`✅ MongoDB bulkLoad completado en ${elapsed}ms (${equiposDocs.length} equipos, ${movimientosDocs.length} movimientos, ${trabajadoresDocs.length} trabajadores)`);
    } catch (err) {
      console.error('❌ Error en bulkLoad MongoDB:', err.message);
      throw err;
    }
  } else {
    // En SQLite: usar INSERT tradicional
    const insEq = db.prepare(`INSERT INTO equipos (id,tipo,marca,modelo,serie,fechaCompra,sede,estado,usuarioActual,area,observaciones,cpu,ram,disco,origen)
      VALUES (@id,@tipo,@marca,@modelo,@serie,@fechaCompra,@sede,@estado,@usuarioActual,@area,@observaciones,@cpu,@ram,@disco,@origen)`);
    const insMv = db.prepare(`INSERT INTO movimientos (id,tipo,fecha,trabajador,dni,area,sede,observaciones,origen)
      VALUES (@id,@tipo,@fecha,@trabajador,@dni,@area,@sede,@observaciones,@origen)`);
    const insIt = db.prepare(`INSERT INTO movimiento_items (movimientoId,equipoId,cantidad,descripcion,marcaModelo,serieEstado)
      VALUES (@movimientoId,@equipoId,@cantidad,@descripcion,@marcaModelo,@serieEstado)`);
    const insMt = db.prepare(`INSERT INTO mantenimientos (id,equipoId,fecha,tipo,realizadoPor,descripcion)
      VALUES (@id,@equipoId,@fecha,@tipo,@realizadoPor,@descripcion)`);

    await db.exec('BEGIN');
    try{
      for(const e of (data.equipos||[])){
        await insEq.run({
          id: e.id, tipo: e.tipo||'', marca: e.marca||'', modelo: e.modelo||'', serie: e.serie||'',
          fechaCompra: e.fechaCompra||null, sede: e.sede||'', estado: e.estado||'Disponible',
          usuarioActual: e.usuarioActual||'', area: e.area||'', observaciones: e.observaciones||'',
          cpu: (e.specs&&e.specs.cpu)||'', ram: (e.specs&&e.specs.ram)||'', disco: (e.specs&&e.specs.disco)||'',
          origen: e.origen||''
        });
      }
      for(const m of (data.movimientos||[])){
        await insMv.run({
          id: m.id, tipo: m.tipo||'', fecha: m.fecha||null, trabajador: m.trabajador||'', dni: m.dni||'',
          area: m.area||'', sede: m.sede||'', observaciones: m.observaciones||'', origen: m.origen||''
        });
        for(const it of (m.items||[])){
          await insIt.run({
            movimientoId: m.id, equipoId: it.equipoId||null, cantidad: it.cantidad||1,
            descripcion: it.descripcion||'', marcaModelo: it.marcaModelo||'', serieEstado: it.serieEstado||''
          });
        }
      }
      for(const mt of (data.mantenimientos||[])){
        await insMt.run({
          id: mt.id, equipoId: mt.equipoId, fecha: mt.fecha||null, tipo: mt.tipo||'',
          realizadoPor: mt.realizadoPor||'', descripcion: mt.descripcion||''
        });
      }
      await db.exec('COMMIT');
    }catch(err){
      await db.exec('ROLLBACK');
      throw err;
    }
  }

  await setCounter('eq', Math.max(maxSuffix((data.equipos||[]).map(e=>e.id), 'EQ'), data.nextEqId||0) + 1);
  await setCounter('mv', Math.max(maxSuffix((data.movimientos||[]).map(m=>m.id), 'MV'), data.nextMvId||0) + 1);
  await setCounter('mt', Math.max(maxSuffix((data.mantenimientos||[]).map(m=>m.id), 'MT'), data.nextMantId||0) + 1);

  for(const m of (data.movimientos||[])){
    if(m.trabajador) await upsertTrabajador({nombre:m.trabajador, dni:m.dni, area:m.area, sede:m.sede});
  }
  for(const e of (data.equipos||[])){
    if(e.usuarioActual && e.estado==='Asignado') await upsertTrabajador({nombre:e.usuarioActual, area:e.area, sede:e.sede});
  }
}

async function clearAllTables(){
  console.log('🧹 Limpiando TODAS las colecciones...');
  const tables = [
    'movimiento_items', 'movimientos', 'mantenimientos', 'equipos', 'trabajadores',
    'solicitudes_compra', 'solicitudes_items', 'inventario_reportes', 'agentes_reportes'
  ];
  for(const table of tables) {
    try {
      await db.prepare(`DELETE FROM ${table}`).run();
      console.log(`  ✓ ${table}`);
    } catch(err) {
      console.log(`  ⚠️ ${table}: ${err.message}`);
    }
  }
  console.log('✅ Limpieza completada');
}

async function isFreshStartNeeded(){
  try {
    console.log('[SEED] Verificando integridad de equipos...');

    // Contar equipos
    const countResult = await db.prepare('SELECT COUNT(*) AS c FROM equipos').get();
    const count = countResult?.c || 0;
    console.log(`[SEED] COUNT(*) FROM equipos: ${count}`);

    if(count === 0) {
      console.log('[SEED] → Tabla equipos vacía, necesita fresh start');
      return true;
    }

    // EN VERCEL: Sincronizar con seed.json actualizado
    if(isVercel) {
      const trabCount = await db.prepare('SELECT COUNT(*) AS c FROM trabajadores WHERE activo=?').get(1);
      const trabTotal = trabCount?.c || 0;
      console.log(`[SEED] VERCEL: ${count} equipos, ${trabTotal} trabajadores`);

      // Si hay equipos pero pocos trabajadores, hacer fresh start para sincronizar
      if(count > 0 && trabTotal < 100) {
        console.log(`[SEED] → VERCEL necesita sincronización: ${trabTotal} trabajadores (esperaba 123)`);
        return true;
      }

      // Si hay más equipos de lo esperado (duplicados), hacer fresh start
      if(count > 250) {
        console.log(`[SEED] → VERCEL tiene ${count} equipos (POSIBLES DUPLICADOS, esperaba 232), limpiando...`);
        return true;
      }
    }

    // Verificar estructura del primer equipo
    const result = await db.prepare('SELECT * FROM equipos LIMIT 1').get();
    console.log(`[SEED] Primer equipo estructura:`, {
      tieneId: !!result?.id,
      idEsString: typeof result?.id === 'string',
      tieneNombre: !!result?.nombre,
      nombreEsString: typeof result?.nombre === 'string'
    });

    if(result && result.id && typeof result.id === 'string') {
      console.log('[SEED] → Datos válidos, no necesita fresh start');
      return false;
    }

    console.log('[SEED] → Datos corruptos, necesita fresh start');
    return true;
  } catch (err) {
    console.error('[SEED] Error verificando:', err.message);
    return true;
  }
}

async function seedIfEmpty(){
  console.log('[SEED] === INICIANDO SEED ===');

  if(!fs.existsSync(SEED_PATH)){
    console.log('[SEED] ❌ No existe seed.json en:', SEED_PATH);
    return;
  }

  console.log('[SEED] ✅ seed.json encontrado');
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  console.log(`[SEED] Seed contiene: ${seed.equipos?.length || 0} equipos, ${seed.movimientos?.length || 0} movimientos`);

  // Verificar si necesita fresh start
  const needsFreshStart = await isFreshStartNeeded();
  console.log(`[SEED] needsFreshStart: ${needsFreshStart}`);

  if(!needsFreshStart) {
    const count = await db.prepare('SELECT COUNT(*) AS c FROM equipos').get();
    console.log(`[SEED] ✅ Base de datos ya tiene ${count?.c || 0} equipos válidos, SKIPEANDO carga`);
    return;
  }

  // Fresh start: limpiar y recargar TODO
  console.log('[SEED] 🔄 FRESH START: limpiando y recargando TODA la BD...');
  try {
    await clearAllTables();
    console.log('[SEED] ✅ Tablas limpiadas');

    await bulkLoad(seed);
    console.log(`[SEED] ✅ bulkLoad completado: ${seed.equipos.length} equipos insertados`);

    // Verificar que se insertó correctamente
    const verifyCountEquipos = await db.prepare('SELECT COUNT(*) AS c FROM equipos').get();
    const verifyCountTrabajadores = await db.prepare('SELECT COUNT(*) AS c FROM trabajadores').get();
    const verifyCountTrabajadoresActivos = await db.prepare('SELECT COUNT(*) AS c FROM trabajadores WHERE activo=?').get(1);
    console.log(`[SEED] ✅ Verificación después de bulkLoad:`);
    console.log(`[SEED]    - ${verifyCountEquipos?.c || 0} equipos en BD`);
    console.log(`[SEED]    - ${verifyCountTrabajadores?.c || 0} trabajadores TOTAL en BD`);
    console.log(`[SEED]    - ${verifyCountTrabajadoresActivos?.c || 0} trabajadores activos (activo=1) en BD`);
  } catch(err) {
    console.error('[SEED] ❌ Error en fresh start:', err.message, err.stack);
    throw err;
  }

  console.log('[SEED] === FIN SEED ===');
}

async function backfillTrabajadoresIfEmpty(){
  console.log('[TRAB] === INICIANDO BACKFILL TRABAJADORES ===');
  try {
    // Verificar si hay datos válidos
    const count = await db.prepare('SELECT COUNT(*) AS c FROM trabajadores').get();
    const trabCount = count?.c || 0;
    console.log(`[TRAB] COUNT(*) FROM trabajadores: ${trabCount}`);

    if(trabCount > 0) {
      const sample = await db.prepare('SELECT * FROM trabajadores LIMIT 1').get();
      if(sample && sample.nombre && typeof sample.nombre === 'string') {
        console.log(`[TRAB] ✅ Trabajadores válidos ya cargados (${trabCount} registros), SKIPEANDO`);
        return;
      }
      console.log('[TRAB] ⚠️ Datos de trabajadores corruptos, LIMPIANDO...');
      await db.prepare('DELETE FROM trabajadores').run();
    }

    console.log('[TRAB] 📝 Extrayendo trabajadores de movimientos y equipos...');
    const movs = await getMovimientos();
    console.log(`[TRAB]   ✓ getMovimientos(): ${movs?.length || 0} registros`);
    if(movs?.length > 0) {
      console.log(`[TRAB]   Primer movimiento:`, JSON.stringify(movs[0]).substring(0, 150));
    }

    const equips = await getEquipos();
    console.log(`[TRAB]   ✓ getEquipos(): ${equips?.length || 0} registros`);

    let insertedCount = 0;
    const uniqueTrabajadores = new Set();

    for(const m of movs || []){
      if(m && m.trabajador && !uniqueTrabajadores.has(m.trabajador)) {
        try {
          await upsertTrabajador({nombre:m.trabajador, dni:m.dni||'', area:m.area||'', sede:m.sede||''});
          uniqueTrabajadores.add(m.trabajador);
          insertedCount++;
        } catch(err) {
          console.log(`[TRAB]   ⚠️ Error al crear trabajador "${m.trabajador}": ${err.message}`);
        }
      }
    }

    for(const e of equips || []){
      if(e && e.usuarioActual && e.estado==='Asignado' && !uniqueTrabajadores.has(e.usuarioActual)) {
        try {
          await upsertTrabajador({nombre:e.usuarioActual, dni:'', area:e.area||'', sede:e.sede||''});
          uniqueTrabajadores.add(e.usuarioActual);
          insertedCount++;
        } catch(err) {
          console.log(`[TRAB]   ⚠️ Error al crear trabajador "${e.usuarioActual}": ${err.message}`);
        }
      }
    }

    // Verificación final
    const finalCount = await db.prepare('SELECT COUNT(*) AS c FROM trabajadores').get();
    console.log(`[TRAB] ✅ Completado: ${insertedCount} insertados, ${finalCount?.c || 0} total en BD`);

  } catch(err) {
    console.error('[TRAB] ❌ Error critical en backfillTrabajadores:', err.message, err.stack);
  }
  console.log('[TRAB] === FIN BACKFILL TRABAJADORES ===');
}

// ---------------------------------------------------------------------------
// Autenticacion y usuarios
// ---------------------------------------------------------------------------
function hashPassword(pw, salt){
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return {salt, hash};
}

function verifyPassword(pw, salt, hash){
  const check = crypto.scryptSync(pw, salt, 64).toString('hex');
  try{
    return crypto.timingSafeEqual(Buffer.from(check,'hex'), Buffer.from(hash,'hex'));
  }catch(e){ return false; }
}

async function seedUsersIfEmpty(){
  try {
    // Verificar si hay usuarios válidos
    const existing = await db.prepare('SELECT * FROM users LIMIT 1').get();
    if(existing && existing.username && typeof existing.username === 'string') {
      console.log('✅ Usuarios ya cargados (datos válidos)');
      return;
    }
    // Si hay datos pero son inválidos, limpiar
    if(existing) {
      console.log('⚠️ Datos de usuarios corruptos, limpiando...');
      await db.prepare('DELETE FROM users').run();
    }
  } catch (err) {
    console.log('No se pudo verificar usuarios:', err.message);
  }

  // Usuario de prueba: admin / admin123
  const {salt, hash} = hashPassword('admin123');
  const defaults = [
    {username:'admin', salt, hash}, // Usuario de prueba
    {username:'cmore', salt:'a9221343754fa88ab44a51c16d51d8ea', hash:'bb813e8ea4d5dfd0680de7294c27f6692acbd705f65d3a6cea529ae9e7b2538d4bcb65fa20c5ed153666b0b90e2331edb3f247e9f816c1c2a833aa65eb393bbf'},
    {username:'dvalnecia', salt:'960284915d484ffe07c5e65dd6087cfe', hash:'8d0bc56a9834741c7166d550c1f82b23090a4abb754d33ed9ddfba69497346613d6cd19eedc02461242249019dc894c3037f27adeebd6bcb4dfc917523159989'}
  ];

  // Solo agregar usuarios que no existan - preserva usuarios existentes
  const ins = db.prepare('INSERT INTO users (username, salt, hash, mustChangePassword) VALUES (?,?,?,1)');
  for(const u of defaults){
    const existing = await getUser(u.username);
    if(!existing){
      try{
        await ins.run(u.username, u.salt, u.hash);
        console.log(`✅ Usuario creado: ${u.username}`);
      } catch(err){
        console.log(`⚠️ Usuario ${u.username} ya existe o error al crear`);
      }
    }
  }
}

async function getUser(username){
  return await db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

// ---------------------------------------------------------------------------
// Sesiones (en memoria para LOCAL, en MongoDB para VERCEL)
// ---------------------------------------------------------------------------
const localSessions = new Map(); // Solo para desarrollo local

async function createSession(username){
  const sid = crypto.randomBytes(24).toString('hex');
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 60 * 60 * 12 * 1000).toISOString(); // 12 horas

  console.log(`🔐 Creando sesión: ${username}`);

  try {
    console.log('🔐 Ejecutando INSERT INTO sessions...');
    const result = await db.prepare('INSERT INTO sessions (sid, username, createdAt, expiresAt) VALUES (?, ?, ?, ?)')
      .run(sid, username, now, expiresAt);
    console.log('✅ Sesión creada:', result);
  } catch (err) {
    console.error('❌ Error creando sesión:', err.message, err.stack);
    throw err;
  }

  return sid;
}

async function getSession(req){
  const cookies = parseCookies(req);
  const sid = cookies['sid'];
  if(!sid) return null;

  try {
    const s = await db.prepare('SELECT * FROM sessions WHERE sid = ? AND expiresAt > ?')
      .get(sid, new Date().toISOString());
    if(!s) return null;
    return {sid, username: s.username, createdAt: s.createdAt};
  } catch (err) {
    console.error('❌ Error obteniendo sesión:', err.message);
    return null;
  }
}

function parseCookies(req){
  const header = req.headers['cookie'] || '';
  const out = {};
  header.split(';').forEach(pair=>{
    const idx = pair.indexOf('=');
    if(idx===-1) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx+1).trim();
    if(k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function setSessionCookie(res, sid){
  res.setHeader('Set-Cookie', `sid=${sid}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60*60*12}`);
}

async function deleteSession(sid){
  try {
    await db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
  } catch (err) {
    console.error('❌ Error eliminando sesión:', err.message);
  }
}

function clearSessionCookie(res){
  res.setHeader('Set-Cookie', `sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

// ---------------------------------------------------------------------------
// Correo SMTP
// ---------------------------------------------------------------------------
function smtpReadResponse(socket){
  return new Promise((resolve, reject)=>{
    let buf = '';
    function onData(chunk){
      buf += chunk.toString('utf8');
      const lines = buf.split(/\r\n/).filter(Boolean);
      const last = lines[lines.length-1] || '';
      if(/^\d{3} /.test(last)){
        cleanup();
        resolve(buf);
      }
    }
    function onError(err){ cleanup(); reject(err); }
    function cleanup(){ socket.removeListener('data', onData); socket.removeListener('error', onError); }
    socket.on('data', onData);
    socket.once('error', onError);
  });
}

function smtpSend(socket, line){ socket.write(line + '\r\n'); }

async function sendMailSMTP({to, subject, text}){
  if(!fs.existsSync(SMTP_CONFIG_PATH)){
    throw new Error('No existe smtp-config.json. Copia smtp-config.example.json a smtp-config.json y completa los datos del servidor de correo.');
  }
  const cfg = JSON.parse(fs.readFileSync(SMTP_CONFIG_PATH, 'utf8'));
  if(!cfg.enabled) throw new Error('El envío de correo está deshabilitado ("enabled": false en smtp-config.json).');
  if(!cfg.host || !cfg.user || !cfg.pass || !cfg.from) throw new Error('smtp-config.json está incompleto (host/user/pass/from).');

  let socket = cfg.secure
    ? tls.connect({host: cfg.host, port: cfg.port || 465})
    : net.connect({host: cfg.host, port: cfg.port || 587});
  await new Promise((resolve, reject)=>{
    socket.once(cfg.secure ? 'secureConnect' : 'connect', resolve);
    socket.once('error', reject);
  });
  await smtpReadResponse(socket);

  smtpSend(socket, 'EHLO localhost');
  const ehloResp = await smtpReadResponse(socket);

  if(!cfg.secure && /STARTTLS/i.test(ehloResp)){
    smtpSend(socket, 'STARTTLS');
    await smtpReadResponse(socket);
    socket = await new Promise((resolve, reject)=>{
      const s2 = tls.connect({socket, host: cfg.host});
      s2.once('secureConnect', ()=>resolve(s2));
      s2.once('error', reject);
    });
    smtpSend(socket, 'EHLO localhost');
    await smtpReadResponse(socket);
  }

  smtpSend(socket, 'AUTH LOGIN');
  await smtpReadResponse(socket);
  smtpSend(socket, Buffer.from(cfg.user, 'utf8').toString('base64'));
  await smtpReadResponse(socket);
  smtpSend(socket, Buffer.from(cfg.pass, 'utf8').toString('base64'));
  const authResp = await smtpReadResponse(socket);
  const authLastLine = authResp.trim().split('\n').pop();
  if(!/^235/.test(authLastLine)){
    socket.end();
    throw new Error('Autenticación SMTP falló: ' + authLastLine);
  }

  const fromEmailMatch = cfg.from.match(/<([^>]+)>/);
  const fromEmail = fromEmailMatch ? fromEmailMatch[1] : cfg.from;

  smtpSend(socket, `MAIL FROM:<${fromEmail}>`);
  await smtpReadResponse(socket);
  smtpSend(socket, `RCPT TO:<${to}>`);
  await smtpReadResponse(socket);
  smtpSend(socket, 'DATA');
  await smtpReadResponse(socket);

  const headers = [
    `From: ${cfg.from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ''
  ].join('\r\n');
  const bodyEscaped = text.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
  smtpSend(socket, headers + '\r\n' + bodyEscaped + '\r\n.');
  await smtpReadResponse(socket);

  smtpSend(socket, 'QUIT');
  socket.end();
}

const ALERT_MESES = { 'Laptop':36, 'PC':36, 'Impresora':36, 'Escaner':36, 'Celular':24 };

// ---------------------------------------------------------------------------
// Helpers de datos (equipos, movimientos, mantenimientos)
// ---------------------------------------------------------------------------
async function getEquipos(){
  return (await db.prepare('SELECT * FROM equipos ORDER BY id').all()).map(e=>({
    id:e.id, nombre:e.nombre, tipo:e.tipo, marca:e.marca, modelo:e.modelo, serie:e.serie, fechaCompra:e.fechaCompra,
    sede:e.sede, estado:e.estado, usuarioActual:e.usuarioActual, area:e.area, observaciones:e.observaciones,
    specs:{cpu:e.cpu, ram:e.ram, disco:e.disco}, origen:e.origen
  }));
}

async function getMovimientos(){
  const movs = await db.prepare('SELECT * FROM movimientos ORDER BY fecha DESC, id DESC').all();
  const items = await db.prepare('SELECT * FROM movimiento_items').all();
  const byMov = {};
  for(const it of items){
    (byMov[it.movimientoId] = byMov[it.movimientoId] || []).push({
      equipoId: it.equipoId, cantidad: it.cantidad, descripcion: it.descripcion,
      marcaModelo: it.marcaModelo, serieEstado: it.serieEstado
    });
  }
  return movs.map(m=>({
    id:m.id, tipo:m.tipo, fecha:m.fecha, trabajador:m.trabajador, dni:m.dni, area:m.area, sede:m.sede,
    observaciones:m.observaciones, origen:m.origen, items: byMov[m.id]||[]
  }));
}

async function getMantenimientos(){
  return await db.prepare('SELECT * FROM mantenimientos ORDER BY fecha DESC').all();
}

async function getEquipo(id){
  const e = await db.prepare('SELECT * FROM equipos WHERE id = ?').get(id);
  if(!e) return null;
  return {id:e.id, nombre:e.nombre, tipo:e.tipo, marca:e.marca, modelo:e.modelo, serie:e.serie, fechaCompra:e.fechaCompra,
    sede:e.sede, estado:e.estado, usuarioActual:e.usuarioActual, area:e.area, observaciones:e.observaciones,
    specs:{cpu:e.cpu, ram:e.ram, disco:e.disco}, origen:e.origen};
}

async function updateEquipoFields(id, fields){
  const cur = await getEquipo(id);
  if(!cur) return null;
  const merged = Object.assign({}, cur, fields, {specs: Object.assign({}, cur.specs, fields.specs||{})});
  if(fields.nombre !== undefined){
    const nombre = (fields.nombre||'').trim();
    if(!nombre) throw new Error('El nombre del equipo es obligatorio');
    // Solo validar si el nombre CAMBIÓ (no es el mismo que el actual)
    if(nombre.toLowerCase() !== (cur.nombre||'').toLowerCase()){
      // Obtener todos los equipos y buscar por nombre (case-insensitive)
      const todos = await db.prepare('SELECT id, nombre FROM equipos').all();
      const existente = (todos||[]).find(e => e.nombre && e.nombre.toLowerCase() === nombre.toLowerCase());
      if(existente && (existente.id || existente._id) !== id) {
        throw new Error('Ya existe un equipo con el nombre "' + nombre + '"');
      }
    }
  }
  await db.prepare(`UPDATE equipos SET nombre=?,tipo=?,marca=?,modelo=?,serie=?,fechaCompra=?,sede=?,estado=?,usuarioActual=?,area=?,observaciones=?,cpu=?,ram=?,disco=? WHERE id=?`)
    .run(merged.nombre, merged.tipo, merged.marca, merged.modelo, merged.serie, merged.fechaCompra, merged.sede, merged.estado,
      merged.usuarioActual, merged.area, merged.observaciones, merged.specs.cpu, merged.specs.ram, merged.specs.disco, id);
  return getEquipo(id);
}

async function insertEquipo(e){
  let nombre = (e.nombre||'').trim();

  if(!nombre){
    const tipoBase = (e.tipo||'ACCESORIO').toUpperCase();
    const tipoCorto = tipoBase.substring(0, 4);
    const contadorName = 'eq_contador_' + tipoCorto;
    let contador = await getCounter(contadorName);
    let candidato = tipoCorto + '-' + String(contador).padStart(4, '0');

    let intento = 0;
    const todos = await db.prepare('SELECT nombre FROM equipos').all();
    const nombresExistentes = new Set((todos||[]).map(e => (e.nombre||'').toLowerCase()));
    while(nombresExistentes.has(candidato.toLowerCase())){
      contador++;
      candidato = tipoCorto + '-' + String(contador).padStart(4, '0');
      intento++;
      if(intento > 10000) throw new Error('No se pudo generar un nombre único para el equipo');
    }

    nombre = candidato;
    await setCounter(contadorName, contador + 1);
  } else {
    // Obtener todos los equipos y buscar por nombre (case-insensitive)
    const todos = await db.prepare('SELECT id, nombre FROM equipos').all();
    const existente = (todos||[]).find(e => e.nombre && e.nombre.toLowerCase() === nombre.toLowerCase());
    if(existente) throw new Error('Ya existe un equipo con el nombre "' + nombre + '"');
  }

  const id = await nextId('EQ','eq');
  await db.prepare(`INSERT INTO equipos (id,nombre,tipo,marca,modelo,serie,fechaCompra,sede,estado,usuarioActual,area,observaciones,cpu,ram,disco,origen)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, nombre, e.tipo||'', e.marca||'', e.modelo||'', e.serie||'', e.fechaCompra||null, e.sede||'', e.estado||'Disponible',
    e.usuarioActual||'', e.area||'', e.observaciones||'', (e.specs&&e.specs.cpu)||'', (e.specs&&e.specs.ram)||'',
    (e.specs&&e.specs.disco)||'', e.origen||'Manual'
  );
  return getEquipo(id);
}

async function insertMovimiento(m){
  const id = await nextId('MV','mv');
  await db.prepare(`INSERT INTO movimientos (id,tipo,fecha,trabajador,dni,area,sede,observaciones,origen) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(id, m.tipo, m.fecha||null, m.trabajador||'', m.dni||'', m.area||'', m.sede||'', m.observaciones||'', m.origen||'Manual');
  const insIt = db.prepare(`INSERT INTO movimiento_items (movimientoId,equipoId,cantidad,descripcion,marcaModelo,serieEstado) VALUES (?,?,?,?,?,?)`);
  for(const it of (m.items||[])){
    await insIt.run(id, it.equipoId||null, it.cantidad||1, it.descripcion||'', it.marcaModelo||'', it.serieEstado||'');
  }
  return id;
}

// ---------------------------------------------------------------------------
// Generacion de actas
// ---------------------------------------------------------------------------
function escapeHtml(s){ return (s==null?'':String(s)).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtDate(iso){ if(!iso) return '—'; const d = new Date(iso+'T00:00:00'); if(isNaN(d)) return iso; return d.toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'}); }

async function renderActaHtml(movId){
  const movs = await getMovimientos();
  const m = movs.find(x=>x.id===movId);
  if(!m) return null;
  const esDevolucion = m.tipo.startsWith('Devolucion');
  const esBaja = m.tipo==='Baja';
  const tituloTipo = esBaja? 'ACTA DE BAJA DE EQUIPOS' : (esDevolucion? 'ACTA DE DEVOLUCIÓN DE EQUIPOS' : 'ACTA DE RECEPCIÓN DE EQUIPOS');
  const itemsRows = m.items.map((it,i)=>{
    return `<tr><td>${i+1}</td><td>${it.cantidad}</td><td>${escapeHtml(it.descripcion)}</td><td>${escapeHtml(it.marcaModelo)}</td><td>${escapeHtml(it.serieEstado)}</td></tr>`;
  }).join('');
  const fechaTxt = fmtDate(m.fecha);
  let cuerpo = '';
  if(!esDevolucion && !esBaja){
    cuerpo = `<p>Siendo el ${fechaTxt}, el grupo empresarial AXIS GROUP, hace entrega a la Sr(a). <b>${escapeHtml(m.trabajador)}</b>${m.dni? ' identificado con DNI N°'+escapeHtml(m.dni):''} para el cumplimiento de sus labores dentro de la organización, el/los equipo(s) con las siguientes características:</p>
    <table>${itemsRows? '<tr><th>ITEM</th><th>CANTIDAD</th><th>DESCRIPCIÓN</th><th>MARCA/MODELO</th><th>SERIE/ESTADO</th></tr>'+itemsRows : ''}</table>
    <p>Comprometiéndose la persona que recepciona a hacerse responsable absoluto del mismo en caso de pérdida, daño y/o robo. Al finalizar la relación laboral deberá ser devuelto junto con los otros implementos proporcionados por la empresa.</p>
    <p>Se deja constancia que el bien entregado tiene carácter de responsabilidad y por tanto firman al pie del presente el responsable de la entrega y el recepcionante, aceptando y dando conformidad de lo recibido y asumiendo la responsabilidad establecida en los párrafos precedentes.</p>
    ${m.observaciones? '<p><i>Observaciones: '+escapeHtml(m.observaciones)+'</i></p>':''}
    <br><br>
    <table style="border:none; margin-top:40px;"><tr style="border:none;">
      <td style="border:none; text-align:center; width:50%;">_________________________________<br>${escapeHtml(m.trabajador)}<br>RECEPCIONA</td>
      <td style="border:none; text-align:center; width:50%;">_________________________________<br>AXIS GROUP<br>ENTREGA</td>
    </tr></table>`;
  } else if(esDevolucion){
    cuerpo = `<p>Siendo el ${fechaTxt}, el Sr(a). <b>${escapeHtml(m.trabajador)}</b> hizo la devolución de los siguientes equipos a AXIS GROUP, por motivo de: <b>${m.tipo==='Devolucion por renovacion'?'renovación de equipo':'salida del trabajador'}</b>.</p>
    <table>${itemsRows? '<tr><th>ITEM</th><th>CANTIDAD</th><th>DESCRIPCIÓN</th><th>MARCA/MODELO</th><th>SERIE/ESTADO</th><th>TELÉFONO</th></tr>'+itemsRows : ''}</table>
    <p>Observaciones: ${escapeHtml(m.observaciones)||'____________________________________________'}</p>
    <br><br>
    <table style="border:none; margin-top:40px;"><tr style="border:none;">
      <td style="border:none; text-align:center; width:50%;">_________________________________<br>${escapeHtml(m.trabajador)}<br>ENTREGA (DEVUELVE)</td>
      <td style="border:none; text-align:center; width:50%;">_________________________________<br>AXIS GROUP<br>RECEPCIONA</td>
    </tr></table>`;
  } else {
    cuerpo = `<p>Siendo el ${fechaTxt}, AXIS GROUP da de baja el/los siguiente(s) equipo(s):</p>
    <table>${itemsRows? '<tr><th>ITEM</th><th>CANTIDAD</th><th>DESCRIPCIÓN</th><th>MARCA/MODELO</th><th>SERIE/ESTADO</th><th>TELÉFONO</th></tr>'+itemsRows : ''}</table>
    <p>Motivo: ${escapeHtml(m.observaciones)}</p>
    <br><br>
    <table style="border:none; margin-top:40px;"><tr style="border:none;">
      <td style="border:none; text-align:center; width:100%;">_________________________________<br>Responsable de TI</td>
    </tr></table>`;
  }
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${tituloTipo}</title>
  <style>
    body{font-family: Calibri, Arial, sans-serif; font-size:14px; color:#111; padding:40px; max-width:800px; margin:auto;}
    h1{font-size:18px; text-align:center; color:#1e3a5f;}
    table{width:100%; border-collapse:collapse; margin:14px 0;}
    th,td{border:1px solid #999; padding:6px 8px; font-size:12px;}
    th{background:#eee;}
    p{line-height:1.5;}
    .print-btn{margin-bottom:20px;}
    @media print{ .print-btn{display:none;} }
  </style></head><body>
  <div class="print-btn"><button onclick="window.print()" style="padding:8px 16px;">Imprimir / Guardar PDF</button></div>
  <h1>${tituloTipo}</h1>
  ${cuerpo}
  </body></html>`;
}

// ---------------------------------------------------------------------------
// Helpers HTTP
// ---------------------------------------------------------------------------
function sendJson(res, status, obj){
  const body = JSON.stringify(obj);
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body)});
  res.end(body);
}

function readBody(req){
  return new Promise((resolve, reject)=>{
    let data = '';
    req.on('data', chunk=> data += chunk);
    req.on('end', ()=>{
      if(!data) return resolve({});
      try{ resolve(JSON.parse(data)); }catch(e){ reject(e); }
    });
    req.on('error', reject);
  });
}

const MIME = {'.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json'};

function serveStatic(req, res, pathname){
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if(!filePath.startsWith(PUBLIC_DIR)){ res.writeHead(403); res.end(); return; }
  fs.readFile(filePath, (err, content)=>{
    if(err){ res.writeHead(404); res.end('No encontrado'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, {'Content-Type': MIME[ext] || 'application/octet-stream'});
    res.end(content);
  });
}

const PUBLIC_PATHS = new Set(['/login.html', '/index.html', '/test.html', '/api/login', '/api/forgot-password', '/api/health']);

// ============================================================================
// MANEJADOR DE REQUESTS - Usado por LOCAL y VERCEL
// ============================================================================
async function handleRequest(req, res){
  const u = new URL(req.url, `http://${req.headers.host}`);
  const pathname = u.pathname;

  try{
    // ---- Rutas publicas (sin sesion) ----
    if(pathname === '/api/login' && req.method === 'POST'){
      try {
        const body = await readBody(req);
        console.log(`📧 Login attempt: ${body.username}`);
        const user = await getUser((body.username||'').trim());
        if(!user){
          console.log(`❌ Usuario no encontrado: ${body.username}`);
          return sendJson(res, 401, {error:'Usuario o contraseña incorrectos'});
        }
        if(!verifyPassword(body.password||'', user.salt, user.hash)){
          console.log(`❌ Contraseña incorrecta para: ${body.username}`);
          return sendJson(res, 401, {error:'Usuario o contraseña incorrectos'});
        }
        console.log(`✅ Credenciales válidas: ${body.username}`);
        const sid = await createSession(user.username);
        console.log(`✅ Sesión creada: ${sid.substring(0, 8)}...`);
        setSessionCookie(res, sid);
        console.log(`✅ Cookie de sesión establecida`);
        return sendJson(res, 200, {ok:true, username:user.username, mustChangePassword: !!user.mustChangePassword});
      } catch (err) {
        console.error(`❌ Error en login:`, err.message, err.stack);
        return sendJson(res, 500, {error: 'Error al procesar login', details: err.message});
      }
    }
    if(pathname === '/api/forgot-password' && req.method === 'POST'){
      const body = await readBody(req);
      const email = (body.email||'').trim();
      const mensajeGenerico = 'Si el correo está registrado, se envió una contraseña temporal. Revisa tu bandeja de entrada (y spam).';
      if(!email) return sendJson(res, 400, {error:'Ingresa tu correo de recuperación'});
      const user = email ? await db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) : null;
      if(user){
        const tempPassword = crypto.randomBytes(5).toString('hex');
        const {salt, hash} = hashPassword(tempPassword);
        await db.prepare('UPDATE users SET salt=?, hash=?, mustChangePassword=1 WHERE username=?').run(salt, hash, user.username);
        const asunto = 'Contraseña temporal — Gestión de Activos TI';
        const cuerpo = `Hola,\n\nSe generó una contraseña temporal para tu usuario "${user.username}" en Gestión de Activos TI:\n\n${tempPassword}\n\nInicia sesión con ella; el sistema te pedirá definir una nueva contraseña de inmediato.\n\nSi no solicitaste esto, contacta a un administrador del sistema.`;
        try{
          await sendMailSMTP({to: email, subject: asunto, text: cuerpo});
          console.log(`Correo de recuperación enviado a ${email} (usuario ${user.username}).`);
        }catch(err){
          // Respaldo local si el correo no se pudo enviar (p.ej. SMTP aun no configurado)
          const linea = `[${new Date().toLocaleString('es-PE')}] Usuario: ${user.username}  Correo: ${email}  Contraseña temporal: ${tempPassword}  (No se pudo enviar el correo: ${err.message})\n`;
          fs.appendFileSync(RESET_LOG_PATH, linea);
          console.log('No se pudo enviar el correo de recuperación -> ' + linea.trim());
        }
      }
      // Respuesta generica (no revela si el correo existe)
      return sendJson(res, 200, {ok:true, mensaje: mensajeGenerico});
    }
    if(pathname === '/api/health' && req.method === 'GET'){
      return sendJson(res, 200, {ok:true, hora: new Date().toISOString()});
    }

    // ---- A partir de aqui, requiere sesion activa ----
    if(PUBLIC_PATHS.has(pathname) && req.method === 'GET'){
      return serveStatic(req, res, pathname);
    }

    // Endpoints públicos (sin autenticación)
    const endpointsPublicos = ['/api/inventario', '/api/config-agente', '/api/state'];
    const esPublico = endpointsPublicos.some(ep => pathname === ep || pathname.startsWith(ep + '/'));

    const session = await getSession(req);
    if(!session && !esPublico){
      if(pathname.startsWith('/api/')) return sendJson(res, 401, {error:'No autenticado'});
      if(req.method === 'GET'){
        res.writeHead(302, {'Location': '/login.html'});
        return res.end();
      }
      res.writeHead(401); return res.end();
    }

    if(pathname === '/api/logout' && req.method === 'POST'){
      await deleteSession(session.sid);
      clearSessionCookie(res);
      return sendJson(res, 200, {ok:true});
    }
    if(pathname === '/api/me' && req.method === 'GET'){
      const user = await getUser(session.username);
      return sendJson(res, 200, {username: session.username, mustChangePassword: !!(user&&user.mustChangePassword)});
    }
    if(pathname === '/api/change-password' && req.method === 'POST'){
      const body = await readBody(req);
      const user = await getUser(session.username);
      if(!user) return sendJson(res, 404, {error:'Usuario no encontrado'});
      if(!user.mustChangePassword && !verifyPassword(body.oldPassword||'', user.salt, user.hash)){
        return sendJson(res, 401, {error:'La contraseña actual no es correcta'});
      }
      if(!body.newPassword || body.newPassword.length < 6) return sendJson(res, 400, {error:'La nueva contraseña debe tener al menos 6 caracteres'});
      const {salt, hash} = hashPassword(body.newPassword);
      await db.prepare('UPDATE users SET salt=?, hash=?, mustChangePassword=0 WHERE username=?').run(salt, hash, session.username);
      return sendJson(res, 200, {ok:true});
    }

    function validEmail(email){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
    if(pathname === '/api/system-users' && req.method === 'GET'){
      const rows = await db.prepare('SELECT username, email, mustChangePassword FROM users ORDER BY username COLLATE NOCASE').all();
      return sendJson(res, 200, rows.map(u=>({username:u.username, email:u.email||'', mustChangePassword: !!u.mustChangePassword})));
    }
    if(pathname === '/api/system-users' && req.method === 'POST'){
      const body = await readBody(req);
      const username = (body.username||'').trim();
      const email = (body.email||'').trim();
      if(!username) return sendJson(res, 400, {error:'El usuario es obligatorio'});
      if(!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) return sendJson(res, 400, {error:'El usuario debe tener 3-40 caracteres: letras, números, punto, guion o guion bajo'});
      if(await getUser(username)) return sendJson(res, 400, {error:'Ya existe un usuario del sistema con ese nombre'});
      if(email && !validEmail(email)) return sendJson(res, 400, {error:'El correo de recuperación no es válido'});
      let password = body.password || '';
      let generated = false;
      if(!password){ password = crypto.randomBytes(5).toString('hex'); generated = true; }
      else if(password.length < 6) return sendJson(res, 400, {error:'La contraseña debe tener al menos 6 caracteres'});
      const {salt, hash} = hashPassword(password);
      await db.prepare('INSERT INTO users (username, email, salt, hash, mustChangePassword) VALUES (?,?,?,?,1)').run(username, email||null, salt, hash);
      return sendJson(res, 200, {username, email, tempPassword: generated ? password : undefined});
    }
    if(pathname.startsWith('/api/system-users/') && pathname.endsWith('/reset-password') && req.method === 'POST'){
      const username = decodeURIComponent(pathname.split('/')[3] || '');
      if(!await getUser(username)) return sendJson(res, 404, {error:'Usuario no encontrado'});
      const tempPassword = crypto.randomBytes(5).toString('hex');
      const {salt, hash} = hashPassword(tempPassword);
      await db.prepare('UPDATE users SET salt=?, hash=?, mustChangePassword=1 WHERE username=?').run(salt, hash, username);
      return sendJson(res, 200, {username, tempPassword});
    }
    if(pathname.startsWith('/api/system-users/') && !pathname.endsWith('/reset-password') && req.method === 'PUT'){
      const username = decodeURIComponent(pathname.split('/').pop());
      const existing = await getUser(username);
      if(!existing) return sendJson(res, 404, {error:'Usuario no encontrado'});
      const body = await readBody(req);
      if(body.email !== undefined){
        const email = (body.email||'').trim();
        if(email && !validEmail(email)) return sendJson(res, 400, {error:'El correo de recuperación no es válido'});
        await db.prepare('UPDATE users SET email=? WHERE username=?').run(email||null, username);
      }
      if(body.password){
        if(body.password.length < 6) return sendJson(res, 400, {error:'La contraseña debe tener al menos 6 caracteres'});
        const {salt, hash} = hashPassword(body.password);
        await db.prepare('UPDATE users SET salt=?, hash=?, mustChangePassword=1 WHERE username=?').run(salt, hash, username);
      }
      return sendJson(res, 200, {ok:true});
    }
    if(pathname.startsWith('/api/system-users/') && req.method === 'DELETE'){
      const username = decodeURIComponent(pathname.split('/').pop());
      if(!await getUser(username)) return sendJson(res, 404, {error:'Usuario no encontrado'});
      if(username === session.username) return sendJson(res, 400, {error:'No puedes eliminar tu propio usuario mientras tienes la sesión activa'});
      const result = await db.prepare('SELECT COUNT(*) AS c FROM users').get();
  const count = result?.c || 0;
      if(count <= 1) return sendJson(res, 400, {error:'Debe existir al menos un usuario del sistema'});
      await db.prepare('DELETE FROM users WHERE username=?').run(username);
      return sendJson(res, 200, {ok:true});
    }

    if(pathname === '/api/state' && req.method === 'GET'){
      // Cargar datos con LIMIT para performance
      const equiposRaw = await db.prepare('SELECT * FROM equipos ORDER BY id LIMIT 500').all();
      console.log(`📊 /api/state: ${equiposRaw?.length || 0} equipos cargados`);
      if (equiposRaw?.length > 0) {
        console.log(`   [DEBUG] Primer equipo RAW:`, JSON.stringify(equiposRaw[0]));
        console.log(`   [DEBUG] Tipo de primer equipo:`, typeof equiposRaw[0]);
        console.log(`   [DEBUG] Keys del primer equipo:`, Object.keys(equiposRaw[0] || {}));
        console.log(`   [DEBUG] equiposRaw[0].nombre:`, equiposRaw[0].nombre);
        console.log(`   [DEBUG] equiposRaw[0].id:`, equiposRaw[0].id);
      }
      const equipos = (equiposRaw || []).filter(e => e && typeof e === 'object').map((e, idx)=>{
        // Normalizar: MongoDB puede tener propiedades diferentes
        const obj = {
          id: e.id || e._id,
          nombre: e.nombre || '',
          tipo: e.tipo || '',
          marca: e.marca || '',
          modelo: e.modelo || '',
          serie: e.serie || '',
          fechaCompra: e.fechaCompra || '',
          sede: e.sede || '',
          estado: e.estado || '',
          usuarioActual: e.usuarioActual || '',
          area: e.area || '',
          observaciones: e.observaciones || '',
          specs: {cpu: e.cpu || '', ram: e.ram || '', disco: e.disco || ''},
          origen: e.origen || ''
        };
        if (idx === 0) {
          console.log(`   [DEBUG] Primer equipo NORMALIZADO:`, JSON.stringify(obj));
        }
        return obj;
      });

      const movs = await db.prepare('SELECT * FROM movimientos ORDER BY fecha DESC LIMIT 200').all();
      const items = await db.prepare('SELECT * FROM movimiento_items LIMIT 500').all();
      const byMov = {};
      for(const it of (items || [])){
        if (it && typeof it === 'object') {
          (byMov[it.movimientoId] = byMov[it.movimientoId] || []).push({
            equipoId: it.equipoId || '', cantidad: it.cantidad || 0, descripcion: it.descripcion || '',
            marcaModelo: it.marcaModelo || '', serieEstado: it.serieEstado || ''
          });
        }
      }
      const movimientos = (movs || []).filter(m => m && typeof m === 'object').map(m=>({
        id: m.id || m._id, tipo: m.tipo || '', fecha: m.fecha || '', trabajador: m.trabajador || '', dni: m.dni || '',
        area: m.area || '', sede: m.sede || '', observaciones: m.observaciones || '', origen: m.origen || '',
        items: byMov[m.id || m._id] || []
      }));

      const mantenimientos = (await db.prepare('SELECT * FROM mantenimientos ORDER BY fecha DESC LIMIT 200').all() || [])
        .filter(m => m && typeof m === 'object')
        .map(m => ({id: m.id || m._id, equipoId: m.equipoId || '', fecha: m.fecha || '', tipo: m.tipo || '', realizadoPor: m.realizadoPor || '', descripcion: m.descripcion || ''}));

      const trabajadoresRaw = await db.prepare('SELECT * FROM trabajadores WHERE activo=? ORDER BY nombre LIMIT 300').all(1) || [];
      console.log(`📊 /api/state: ${trabajadoresRaw?.length || 0} trabajadores cargados`);
      if (trabajadoresRaw?.length > 0) {
        console.log(`   [DEBUG] Primer trabajador RAW:`, JSON.stringify(trabajadoresRaw[0]));
        console.log(`   [DEBUG] Tipo de primer trabajador:`, typeof trabajadoresRaw[0]);
        console.log(`   [DEBUG] Keys:`, Object.keys(trabajadoresRaw[0] || {}));
      }
      const trabajadores = (trabajadoresRaw || [])
        .filter(t => t && typeof t === 'object')
        .map(t => ({nombre: t.nombre || '', dni: t.dni || '', area: t.area || '', sede: t.sede || '', activo: t.activo || 1}));

      const solicitudesCompra = (await db.prepare('SELECT * FROM solicitudes_compra ORDER BY fecha DESC LIMIT 100').all() || [])
        .filter(s => s && typeof s === 'object')
        .map(s => ({id: s.id || s._id, numero: s.numero || '', fecha: s.fecha || '', usuario: s.usuario || '', descripcion: s.descripcion || '', estado: s.estado || 'pendiente', observaciones: s.observaciones || ''}));
      const inventarioReportes = await db.prepare(`SELECT * FROM inventario_reportes ORDER BY timestamp DESC LIMIT 50`).all();
      const agentesReportes = await db.prepare(`
        SELECT ar.*, eq.nombre as nombre_equipo, eq.tipo as tipo_equipo
        FROM agentes_reportes ar
        LEFT JOIN equipos eq ON ar.equipoId = eq.id
        ORDER BY ar.timestamp DESC
        LIMIT 100
      `).all();
      return sendJson(res, 200, { equipos, movimientos, mantenimientos, trabajadores, solicitudesCompra, inventarioReportes, agentesReportes });
    }
    if(pathname === '/api/equipos' && req.method === 'POST'){
      const body = await readBody(req);
      return sendJson(res, 200, await insertEquipo(body));
    }
    if(pathname.startsWith('/api/equipos/') && req.method === 'PUT'){
      const id = decodeURIComponent(pathname.split('/').pop());
      const body = await readBody(req);
      const updated = await updateEquipoFields(id, body);
      if(!updated) return sendJson(res, 404, {error:'Equipo no encontrado'});
      return sendJson(res, 200, updated);
    }
    if(pathname.startsWith('/api/equipos/') && req.method === 'DELETE'){
      const id = decodeURIComponent(pathname.split('/').pop());
      const equipo = await getEquipo(id);
      if(!equipo) return sendJson(res, 404, {error:'Equipo no encontrado'});
      await db.prepare('DELETE FROM equipos WHERE id = ?').run(id);
      return sendJson(res, 200, {ok:true, message:'Equipo eliminado'});
    }
    if(pathname === '/api/trabajadores' && req.method === 'POST'){
      const body = await readBody(req);
      const nombre = (body.nombre||'').trim();
      if(!nombre) return sendJson(res, 400, {error:'El nombre es obligatorio'});
      if(await getTrabajador(nombre)) return sendJson(res, 400, {error:'Ya existe un usuario con ese nombre'});
      await db.prepare('INSERT INTO trabajadores (nombre,dni,area,sede,activo) VALUES (?,?,?,?,?)')
        .run(nombre, body.dni||'', body.area||'', body.sede||'', body.activo===0?0:1);
      return sendJson(res, 200, await getTrabajador(nombre));
    }
    if(pathname.startsWith('/api/trabajadores/') && req.method === 'PUT'){
      const nombreOrig = decodeURIComponent(pathname.split('/').pop());
      const body = await readBody(req);
      const existing = await getTrabajador(nombreOrig);
      if(!existing) return sendJson(res, 404, {error:'Usuario no encontrado'});
      const nuevoNombre = (body.nombre||existing.nombre).trim();
      const dni = body.dni!==undefined ? body.dni : existing.dni;
      const area = body.area!==undefined ? body.area : existing.area;
      const sede = body.sede!==undefined ? body.sede : existing.sede;
      const activo = body.activo!==undefined ? (body.activo?1:0) : existing.activo;
      if(nuevoNombre.toLowerCase() !== existing.nombre.toLowerCase()){
        if(await getTrabajador(nuevoNombre)) return sendJson(res, 400, {error:'Ya existe un usuario con ese nombre'});
        await db.exec('BEGIN');
        try{
          await db.prepare('DELETE FROM trabajadores WHERE nombre = ? COLLATE NOCASE').run(existing.nombre);
          await db.prepare('INSERT INTO trabajadores (nombre,dni,area,sede,activo) VALUES (?,?,?,?,?)').run(nuevoNombre, dni, area, sede, activo);
          await db.exec('COMMIT');
        }catch(err){ await db.exec('ROLLBACK'); throw err; }
      } else {
        await db.prepare('UPDATE trabajadores SET dni=?, area=?, sede=?, activo=? WHERE nombre = ? COLLATE NOCASE').run(dni, area, sede, activo, existing.nombre);
      }
      return sendJson(res, 200, await getTrabajador(nuevoNombre));
    }
    if(pathname === '/api/cargos' && req.method === 'POST'){
      const body = await readBody(req);
      const trabajadorExistente = await getTrabajador(body.trabajador);
      if(trabajadorExistente && trabajadorExistente.activo === 0){
        return sendJson(res, 400, {error:'Este trabajador figura como inactivo (tiene una devolución por salida registrada). Actívalo en la pestaña Usuarios antes de asignarle un equipo.'});
      }
      const items = [];
      for(const it of (body.items||[])){
        console.log(`[DEBUG CARGO] Item:`, {
          equipoId: it.equipoId,
          equipoNombre: it.equipoNombre,
          descripcion: it.descripcion,
          numeroTelefonico1: it.numeroTelefonico1,
          numeroTelefonico2: it.numeroTelefonico2
        });
        let equipoId = it.equipoId;
        if(!equipoId){
          // Si es una línea móvil (tipo LIN), buscar o crear equipo LIN
          if(it.tipo === 'LIN' && it.serieEstado){
            // Buscar si ya existe un equipo LIN con ese número de serie
            const existente = await db.prepare('SELECT id FROM equipos WHERE tipo=? AND serie=?').get('LIN', it.serieEstado);
            if(existente){
              equipoId = existente.id;
              // Actualizar estado y usuario si cambió
              await updateEquipoFields(equipoId, {estado:'Asignado', usuarioActual: body.trabajador, area: body.area, sede: body.sede});
            } else {
              // Crear nuevo equipo LIN
              const created = await insertEquipo({
                // Nombre se auto-genera como "LIN-XXXX"
                tipo: 'LIN',
                marca:'',
                modelo: '',
                serie: it.serieEstado, // El número telefónico es la serie
                fechaCompra: null,
                sede: body.sede,
                estado:'Asignado',
                usuarioActual: body.trabajador,
                area: body.area,
                observaciones: it.descripcion || 'Línea móvil',
                origen:'Manual'
              });
              equipoId = created.id;
            }
          } else if(it.equipoNombre){
            // Si hay nombre de equipo, crear con ese nombre
            const created = await insertEquipo({
              nombre: it.equipoNombre,
              tipo: 'Accesorio',
              marca:'',
              modelo: it.descripcion||'',
              serie: it.serieEstado||'',
              fechaCompra: null,
              sede: body.sede,
              estado:'Asignado',
              usuarioActual: body.trabajador,
              area: body.area,
              observaciones:'',
              origen:'Manual'
            });
            equipoId = created.id;
          } else {
            // Sin nombre, crear automáticamente (generará nombre según tipo)
            const created = await insertEquipo({
              tipo:'Accesorio',
              marca:'',
              modelo: it.descripcion||'',
              serie: it.serieEstado||'',
              fechaCompra: null,
              sede: body.sede,
              estado:'Asignado',
              usuarioActual: body.trabajador,
              area: body.area,
              observaciones:'',
              origen:'Manual'
            });
            equipoId = created.id;
          }
        } else {
          // Validar que el equipo no esté ya asignado
          const equipoExistente = await db.prepare('SELECT estado, usuarioActual FROM equipos WHERE id=?').get(equipoId);
          if(equipoExistente && equipoExistente.estado === 'Asignado'){
            return sendJson(res, 400, {error: `El equipo ya está asignado a ${equipoExistente.usuarioActual}. Debe devolverse primero.`});
          }
          await updateEquipoFields(equipoId, {estado:'Asignado', usuarioActual: body.trabajador, area: body.area, sede: body.sede});
        }
        items.push({equipoId, cantidad: it.cantidad||1, descripcion: it.descripcion, marcaModelo: it.marcaModelo, serieEstado: it.serieEstado});
      }
      const movId = await insertMovimiento({tipo:'Asignacion', fecha: body.fecha, trabajador: body.trabajador, dni: body.dni,
        area: body.area, sede: body.sede, observaciones: body.observaciones, origen:'Manual', items});
      await upsertTrabajador({nombre: body.trabajador, dni: body.dni, area: body.area, sede: body.sede});
      return sendJson(res, 200, {id: movId});
    }
    if(pathname.startsWith('/api/cargos/') && req.method === 'PUT'){
      const movId = pathname.split('/').pop();
      const movimiento = await db.prepare('SELECT * FROM movimientos WHERE id=?').get(movId);
      if(!movimiento) return sendJson(res, 404, {error:'Cargo no encontrado'});
      const body = await readBody(req);
      // Actualizar movimiento
      await db.prepare(`UPDATE movimientos SET fecha=?, trabajador=?, dni=?, area=?, sede=?, observaciones=? WHERE id=?`)
        .run(body.fecha||movimiento.fecha, body.trabajador||movimiento.trabajador, body.dni||movimiento.dni,
          body.area||movimiento.area, body.sede||movimiento.sede, body.observaciones||movimiento.observaciones, movId);
      // Actualizar items si se proporcionan
      if(body.items && Array.isArray(body.items)){
        await db.prepare('DELETE FROM movimiento_items WHERE movimientoId=?').run(movId);
        const insIt = db.prepare(`INSERT INTO movimiento_items (movimientoId,equipoId,cantidad,descripcion,marcaModelo,serieEstado) VALUES (?,?,?,?,?,?)`);
        for(const it of body.items){
          let equipoId = it.equipoId;
          // Si es una línea móvil (tipo LIN), buscar o crear equipo LIN
          if(!equipoId && it.tipo === 'LIN' && it.serieEstado){
            // Buscar si ya existe un equipo LIN con ese número de serie
            const existente = await db.prepare('SELECT id FROM equipos WHERE tipo=? AND serie=?').get('LIN', it.serieEstado);
            if(existente){
              equipoId = existente.id;
              // Actualizar estado y usuario si cambió
              await updateEquipoFields(equipoId, {estado:'Asignado', usuarioActual: body.trabajador||movimiento.trabajador, area: body.area||movimiento.area, sede: body.sede});
            } else {
              // Crear nuevo equipo LIN
              const created = await insertEquipo({
                // Nombre se auto-genera como "LIN-XXXX"
                tipo: 'LIN',
                marca:'',
                modelo: '',
                serie: it.serieEstado, // El número telefónico es la serie
                fechaCompra: null,
                sede: body.sede,
                estado:'Asignado',
                usuarioActual: body.trabajador||movimiento.trabajador,
                area: body.area||movimiento.area,
                observaciones: it.descripcion || 'Línea móvil',
                origen:'Manual'
              });
              equipoId = created.id;
            }
          } else if(!equipoId && it.equipoNombre){
            // Si hay nombre de equipo, crear con ese nombre
            const created = await insertEquipo({
              nombre: it.equipoNombre,
              tipo: 'Accesorio',
              marca:'',
              modelo: it.descripcion||'',
              serie: it.serieEstado||'',
              fechaCompra: null,
              sede: body.sede,
              estado:'Asignado',
              usuarioActual: body.trabajador||movimiento.trabajador,
              area: body.area||movimiento.area,
              observaciones:'',
              origen:'Manual'
            });
            equipoId = created.id;
          }
          await insIt.run(movId, equipoId||null, it.cantidad||1, it.descripcion||'', it.marcaModelo||'', it.serieEstado||'');
        }
      }
      await upsertTrabajador({nombre: body.trabajador||movimiento.trabajador, dni: body.dni||movimiento.dni, area: body.area||movimiento.area, sede: body.sede||movimiento.sede});
      return sendJson(res, 200, {id: movId});
    }
    if(pathname === '/api/devoluciones' && req.method === 'POST'){
      const body = await readBody(req);
      const ids = Array.isArray(body.equipoIds) ? body.equipoIds : (body.equipoId ? [body.equipoId] : []);
      const equipos = (await Promise.all(ids.map(id=>getEquipo(id)))).filter(Boolean);
      if(equipos.length===0) return sendJson(res, 404, {error:'Selecciona al menos un equipo a devolver'});
      const trabajador = body.trabajador || equipos[0].usuarioActual;
      const items = equipos.map(eq=>({equipoId: eq.id, cantidad:1, descripcion:`${eq.tipo} ${eq.marca||''} ${eq.modelo||''}`.trim(), marcaModelo:`${eq.marca||''} ${eq.modelo||''}`.trim(), serieEstado: eq.serie}));
      const movId = await insertMovimiento({tipo: body.motivo, fecha: body.fecha, trabajador, dni:'', area: equipos[0].area, sede: equipos[0].sede,
        observaciones: body.observaciones, origen:'Manual', items});
      for(const eq of equipos) await updateEquipoFields(eq.id, {estado: body.estadoNuevo, usuarioActual: ''});
      if(body.motivo === 'Devolucion por salida' && trabajador){
        await setTrabajadorActivo(trabajador, 0);
      }
      return sendJson(res, 200, {id: movId});
    }
    if(pathname === '/api/bajas' && req.method === 'POST'){
      const body = await readBody(req);
      const eq = await getEquipo(body.equipoId);
      if(!eq) return sendJson(res, 404, {error:'Equipo no encontrado'});
      const obsFull = body.motivo + (body.observaciones? ' — ' + body.observaciones : '');
      const movId = await insertMovimiento({tipo:'Baja', fecha: body.fecha, trabajador: eq.usuarioActual, dni:'', area: eq.area, sede: eq.sede,
        observaciones: obsFull, origen:'Manual',
        items:[{equipoId: eq.id, cantidad:1, descripcion:`${eq.tipo} ${eq.marca||''} ${eq.modelo||''}`.trim(), marcaModelo:`${eq.marca||''} ${eq.modelo||''}`.trim(), serieEstado: eq.serie}]});
      await updateEquipoFields(eq.id, {estado:'De baja', usuarioActual:''});
      return sendJson(res, 200, {id: movId});
    }
    if(pathname === '/api/mantenimientos' && req.method === 'POST'){
      const body = await readBody(req);
      const id = await nextId('MT','mt');
      await db.prepare(`INSERT INTO mantenimientos (id,equipoId,fecha,tipo,realizadoPor,descripcion) VALUES (?,?,?,?,?,?)`)
        .run(id, body.equipoId, body.fecha, body.tipo, body.realizadoPor||'', body.descripcion||'');
      return sendJson(res, 200, {id});
    }

    // ---- SOLICITUDES DE COMPRA ----
    if(pathname === '/api/solicitudes-compra' && req.method === 'GET'){
      return sendJson(res, 200, await getSolicitudesCompra());
    }
    if(pathname === '/api/solicitudes-compra' && req.method === 'POST'){
      const body = await readBody(req);
      const sol = await insertSolicitudCompra(body);
      return sendJson(res, 200, sol);
    }
    if(pathname.startsWith('/api/solicitudes-compra/') && !pathname.endsWith('/excel') && !pathname.endsWith('/email') && req.method === 'GET'){
      const id = decodeURIComponent(pathname.split('/').pop());
      const sol = await getSolicitudCompra(id);
      if(!sol) return sendJson(res, 404, {error:'Solicitud no encontrada'});
      return sendJson(res, 200, sol);
    }
    if(pathname.startsWith('/api/solicitudes-compra/') && req.method === 'PUT'){
      const id = decodeURIComponent(pathname.split('/').pop());
      const body = await readBody(req);
      const sol = await updateSolicitudCompra(id, body);
      return sendJson(res, 200, sol);
    }
    if(pathname.startsWith('/api/solicitudes-compra/') && pathname.endsWith('/excel') && req.method === 'GET'){
      (async () => {
        try {
          const parts = pathname.split('/');
          const id = decodeURIComponent(parts[3]);
          const sol = await getSolicitudCompra(id);
          if(!sol) return sendJson(res, 404, {error:'Solicitud no encontrada'});

          const plantillaPath = path.join(__dirname, 'ADM-FO-01_Nuevo.xlsx');
          if(!fs.existsSync(plantillaPath)){
            return sendJson(res, 404, {error:'Plantilla no encontrada'});
          }

          // Cargar plantilla con ExcelJS
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.readFile(plantillaPath);
          const ws = workbook.getWorksheet(1);

          // Rellenar datos
          ws.getCell('D6').value = (sol.usuario || '').toUpperCase();
          ws.getCell('J6').value = sol.numero;
          const fecha = sol.fecha.substring(0, 10);
          ws.getCell('J8').value = fecha;

          // Rellenar items (comenzar en fila 11)
          const items = sol.items || [];
          for(let i = 0; i < items.length; i++){
            const item = items[i];
            const row = 11 + i;

            ws.getCell(`B${row}`).value = i + 1;  // Número de item
            ws.getCell(`C${row}`).value = item.cantidad || 1;  // Cantidad
            ws.getCell(`D${row}`).value = 'UNIDAD';  // Unidad
            ws.getCell(`E${row}`).value = item.descripcion || '';  // Descripción
            ws.getCell(`J${row}`).value = fecha;  // Fecha de entrega
            if(item.usuarioDestino) {
              ws.getCell(`K${row}`).value = `Para: ${item.usuarioDestino}`;  // Observación
            }
          }

          // Generar buffer
          const buffer = await workbook.xlsx.writeBuffer();

          res.writeHead(200, {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="Requerimiento_${sol.numero}.xlsx"`,
            'Content-Length': buffer.length
          });
          res.end(buffer);
        } catch(e) {
          console.error('Error generando Excel:', e.message);
          sendJson(res, 500, {error: 'Error: ' + e.message});
        }
      })();
      return;
    }

    if(pathname.startsWith('/api/solicitudes-compra/') && pathname.endsWith('/email') && req.method === 'GET'){
      (async () => {
        try {
          const parts = pathname.split('/');
          const id = decodeURIComponent(parts[3]);
          const sol = await getSolicitudCompra(id);
          if(!sol) return sendJson(res, 404, {error:'Solicitud no encontrada'});

          const tempDir = path.join(__dirname, 'temp');
          if(!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, {recursive: true});

          const outputPath = path.join(tempDir, `Requerimiento_${sol.numero}_${Date.now()}.xlsx`);
          const plantillaPath = path.join(__dirname, 'ADM-FO-01_Nuevo.xlsx');

          if(!fs.existsSync(plantillaPath)){
            return sendJson(res, 404, {error:'Plantilla no encontrada'});
          }

          // Cargar plantilla con ExcelJS
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.readFile(plantillaPath);
          const ws = workbook.getWorksheet(1);

          // Rellenar datos
          ws.getCell('D6').value = (sol.usuario || '').toUpperCase();
          ws.getCell('J6').value = sol.numero;
          const fecha = sol.fecha.substring(0, 10);
          ws.getCell('J8').value = fecha;

          // Rellenar items
          const items = sol.items || [];
          for(let i = 0; i < items.length; i++){
            const item = items[i];
            const row = 11 + i;
            ws.getCell(`B${row}`).value = i + 1;
            ws.getCell(`C${row}`).value = item.cantidad || 1;
            ws.getCell(`D${row}`).value = 'UNIDAD';
            ws.getCell(`E${row}`).value = item.descripcion || '';
            ws.getCell(`J${row}`).value = fecha;
            if(item.usuarioDestino) {
              ws.getCell(`K${row}`).value = `Para: ${item.usuarioDestino}`;
            }
          }

          // Guardar archivo
          await workbook.xlsx.writeFile(outputPath);

          // Abrir Outlook con el archivo adjunto
          setTimeout(() => {
            try {
              const windowsPath = outputPath.replace(/\//g, '\\');
              const outlookCmd = `start outlook.exe /c ipm.note /a "${windowsPath}"`;
              execSync(outlookCmd, {shell: true, windowsHide: true});
              console.log(`Outlook abierto con archivo: ${outputPath}`);
            } catch(outlookErr) {
              console.error('Error abriendo Outlook:', outlookErr.message);
            }
          }, 500);

          // Retornar confirmación
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({
            success: true,
            message: 'Outlook se abrirá en segundos con el archivo adjunto',
            archivo: outputPath
          }));
        } catch(e) {
          console.error('Error generando email:', e.message);
          sendJson(res, 500, {error: 'Error: ' + e.message});
        }
      })();
      return;
    }

    if(pathname.startsWith('/api/solicitudes-compra/') && req.method === 'DELETE'){
      const id = decodeURIComponent(pathname.split('/').pop());
      await db.prepare('DELETE FROM solicitudes_items WHERE solicitudId = ?').run(id);
      await db.prepare('DELETE FROM solicitudes_compra WHERE id = ?').run(id);
      return sendJson(res, 200, {ok:true});
    }

    if(pathname === '/api/import-specs' && req.method === 'POST'){
      const body = await readBody(req);
      const list = Array.isArray(body) ? body : [body];
      let matched=0, creados=0;
      for(const s of list){
        const serie = (s.serie||s.Serie||s.SerialNumber||'').toString().trim();
        const existing = serie ? await db.prepare('SELECT id FROM equipos WHERE LOWER(serie)=LOWER(?)').get(serie) : null;
        const specs = {cpu: s.procesador||s.CPU||'', ram: s.ram||s.RAM||'', disco: s.almacenamiento||s.Disco||''};
        if(existing){
          await updateEquipoFields(existing.id, {
            marca: s.marca||s.Marca||undefined, modelo: s.modelo||s.Modelo||undefined, specs
          });
          matched++;
        } else {
          await insertEquipo({tipo: s.tipo||'PC', marca: s.marca||s.Marca||'', modelo: s.modelo||s.Modelo||'', serie,
            fechaCompra:null, sede: s.sede||'', estado:'Disponible', usuarioActual: s.usuario||s.Usuario||'',
            area:'', observaciones:'Creado por importación de specs', specs, origen:'Script specs'});
          creados++;
        }
      }
      return sendJson(res, 200, {matched, creados});
    }
    if(pathname === '/api/backup' && req.method === 'GET'){
      const data = { equipos: await getEquipos(), movimientos: await getMovimientos(), mantenimientos: await getMantenimientos() };
      const body = JSON.stringify(data, null, 1);
      res.writeHead(200, {'Content-Type':'application/json; charset=utf-8', 'Content-Disposition':'attachment; filename="backup_activos_ti.json"'});
      return res.end(body);
    }
    if(pathname === '/api/restore' && req.method === 'POST'){
      const body = await readBody(req);
      if(!body.equipos || !body.movimientos) return sendJson(res, 400, {error:'Archivo invalido: se esperaba equipos y movimientos'});
      await clearAllTables();
      await bulkLoad(body);
      return sendJson(res, 200, {ok:true});
    }
    if(pathname === '/api/reseed' && req.method === 'POST'){
      if(!fs.existsSync(SEED_PATH)) return sendJson(res, 400, {error:'No existe seed.json'});
      await clearAllTables();
      await bulkLoad(JSON.parse(fs.readFileSync(SEED_PATH, 'utf8')));
      return sendJson(res, 200, {ok:true});
    }
    if(pathname.startsWith('/api/acta/') && req.method === 'GET'){
      const movId = decodeURIComponent(pathname.split('/').pop());
      const html = await renderActaHtml(movId);
      if(!html) { res.writeHead(404); return res.end('Acta no encontrada'); }
      res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
      return res.end(html);
    }

    // ---- Endpoints de Inventario (Agente) ----
    if(pathname === '/api/inventario' && req.method === 'POST'){
      const body = await readBody(req);
      if(!body.timestamp) body.timestamp = new Date().toISOString();
      const id = crypto.randomBytes(12).toString('hex');
      const stmt = db.prepare(`INSERT INTO inventario_reportes (
        id, timestamp, dispositivo_ip, tipo_dispositivo, so, usuario_windows, cpu,
        ram_total_gb, ram_usado_gb, ram_disponible_gb,
        disco_total_gb, disco_usado_gb, disco_disponible_gb,
        modelo_telefono, numero_telefono, ultima_actualizacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
      await stmt.run(
        id,
        body.timestamp,
        ip.split(',')[0].trim(),
        body.tipo_dispositivo || 'PC',
        body.so || '',
        body.usuario_windows || '',
        body.cpu || '',
        body.ram_total_gb || 0,
        body.ram_usado_gb || 0,
        body.ram_disponible_gb || 0,
        body.disco_total_gb || 0,
        body.disco_usado_gb || 0,
        body.disco_disponible_gb || 0,
        body.modelo_telefono || null,
        body.numero_telefono || null,
        new Date().toISOString()
      );

      // Guardar/actualizar reporte de agente (identificado por número de serie del disco)
      const numeroSerieDisco = body.numero_serie_disco || 'N/A';
      const ahora = body.timestamp || new Date().toISOString();
      // Generar identificador único: AGENTE-{hostname}-{ultimosDígitosdelSerie}
      const identificador = `AGENTE-${(body.hostname || 'DESCONOCIDO').toUpperCase()}-${numeroSerieDisco.substring(numeroSerieDisco.length - 4).toUpperCase()}`;

      // Buscar si ya existe un reporte para este disco
      const reporteExistente = await db.prepare('SELECT id FROM agentes_reportes WHERE numero_serie_disco = ?')
        .get(numeroSerieDisco);

      let reporteId;
      let esActualizacion = false;

      if(reporteExistente){
        // Actualizar reporte existente
        reporteId = reporteExistente.id;
        await db.prepare(`
          UPDATE agentes_reportes SET
            tipo_dispositivo = ?, hostname = ?, so = ?, usuario_windows = ?, cpu = ?,
            cpu_nucleos = ?, cpu_threads = ?, cpu_frecuencia = ?,
            ram_total_gb = ?, ram_usado_gb = ?, ram_disponible_gb = ?, ram_porcentaje = ?,
            disco_total_gb = ?, disco_usado_gb = ?, disco_disponible_gb = ?, disco_porcentaje = ?,
            placa_madre = ?, gpu = ?, uptime = ?, ips = ?, macs = ?, monitor = ?,
            fecha_ultima_actualizacion = ?
          WHERE id = ?
        `).run(
          body.tipo_dispositivo || 'PC',
          body.hostname || 'Desconocido',
          body.so || '',
          body.usuario_windows || '',
          body.cpu || '',
          body.cpu_nucleos || 0,
          body.cpu_threads || 0,
          body.cpu_frecuencia || 'N/A',
          body.ram_total_gb || 0,
          body.ram_usado_gb || 0,
          body.ram_disponible_gb || 0,
          body.ram_porcentaje || 0,
          body.disco_total_gb || 0,
          body.disco_usado_gb || 0,
          body.disco_disponible_gb || 0,
          body.disco_porcentaje || 0,
          body.placa_madre || 'N/A',
          body.gpu || 'N/A',
          body.uptime || 'N/A',
          (body.ips || []).join(', ') || 'N/A',
          (body.macs || []).join(', ') || 'N/A',
          body.monitor || 'N/A',
          ahora,
          reporteId
        );
        esActualizacion = true;
      } else {
        // Crear nuevo reporte
        reporteId = crypto.randomBytes(8).toString('hex');
        await db.prepare(`
          INSERT INTO agentes_reportes (
            id, identificador, numero_serie_disco, tipo_dispositivo, hostname, so, usuario_windows, cpu,
            cpu_nucleos, cpu_threads, cpu_frecuencia,
            ram_total_gb, ram_usado_gb, ram_disponible_gb, ram_porcentaje,
            disco_total_gb, disco_usado_gb, disco_disponible_gb, disco_porcentaje,
            placa_madre, gpu, uptime, ips, macs, monitor, equipoId,
            fecha_primer_reporte, fecha_ultima_actualizacion
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
        `).run(
          reporteId,
          identificador,
          numeroSerieDisco,
          body.tipo_dispositivo || 'PC',
          body.hostname || 'Desconocido',
          body.so || '',
          body.usuario_windows || '',
          body.cpu || '',
          body.cpu_nucleos || 0,
          body.cpu_threads || 0,
          body.cpu_frecuencia || 'N/A',
          body.ram_total_gb || 0,
          body.ram_usado_gb || 0,
          body.ram_disponible_gb || 0,
          body.ram_porcentaje || 0,
          body.disco_total_gb || 0,
          body.disco_usado_gb || 0,
          body.disco_disponible_gb || 0,
          body.disco_porcentaje || 0,
          body.placa_madre || 'N/A',
          body.gpu || 'N/A',
          body.uptime || 'N/A',
          (body.ips || []).join(', ') || 'N/A',
          (body.macs || []).join(', ') || 'N/A',
          body.monitor || 'N/A',
          ahora,
          ahora
        );
      }

      if(esActualizacion){
        console.log(`✅ Reporte de agente ACTUALIZADO: ${reporteId} (${body.hostname}) - Última actualización: ${ahora}`);
      } else {
        console.log(`✅ Reporte de agente CREADO: ${reporteId} (${body.hostname})`);
      }
      return sendJson(res, 200, {id: reporteId, timestamp: ahora, actualizado: esActualizacion});
    }

    if(pathname === '/api/inventario/ultimos' && req.method === 'GET'){
      const limite = req.url.includes('?') ? new URLSearchParams(req.url.split('?')[1]).get('limite') || 50 : 50;
      const reportes = await db.prepare(`
        SELECT * FROM inventario_reportes
        ORDER BY timestamp DESC
        LIMIT ?
      `).all(parseInt(limite));
      return sendJson(res, 200, {reportes, total: reportes.length});
    }

    if(pathname === '/api/inventario/stats' && req.method === 'GET'){
      const stats = await db.prepare(`
        SELECT
          COUNT(*) as total_reportes,
          MAX(timestamp) as ultimo_reporte,
          COUNT(DISTINCT dispositivo_ip) as dispositivos_unicos
        FROM inventario_reportes
      `).get();
      return sendJson(res, 200, stats);
    }

    // ---- Configuración del Agente de Inventario ----
    if(pathname === '/api/config-agente' && req.method === 'GET'){
      const configPath = path.join(__dirname, 'config-agente.json');
      let config = {servidor: 'http://localhost:3335', intervalo_segundos: 3600, habilitado: true};
      if(fs.existsSync(configPath)){
        try{
          config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }catch(e){ console.error('Error leyendo config-agente.json:', e.message); }
      }
      return sendJson(res, 200, config);
    }

    if(pathname === '/api/config-agente' && req.method === 'PUT'){
      const body = await readBody(req);
      const configPath = path.join(__dirname, 'config-agente.json');
      try{
        const config = {
          servidor: (body.servidor || 'http://localhost:3335').trim(),
          intervalo_segundos: parseInt(body.intervalo_segundos) || 3600,
          habilitado: body.habilitado !== false
        };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return sendJson(res, 200, {ok: true, config});
      }catch(err){
        return sendJson(res, 400, {error: 'Error guardando configuración: ' + err.message});
      }
    }

    // ---- Gestión de Agentes y Reportes ----
    if(pathname === '/api/agentes/reportes' && req.method === 'GET'){
      const reportes = await db.prepare(`
        SELECT ar.*, eq.nombre as nombre_equipo, eq.tipo as tipo_equipo
        FROM agentes_reportes ar
        LEFT JOIN equipos eq ON ar.equipoId = eq.id
        ORDER BY ar.timestamp DESC
        LIMIT 100
      `).all();
      return sendJson(res, 200, {reportes});
    }

    if(pathname.startsWith('/api/agentes/reportes/') && pathname.includes('/enlazar') && req.method === 'POST'){
      const reporteId = pathname.split('/')[4];
      const body = await readBody(req);
      const equipoId = body.equipoId;

      if(!reporteId || !equipoId){
        return sendJson(res, 400, {error: 'reporteId y equipoId requeridos'});
      }

      // Verificar que el reporte existe
      const reporte = await db.prepare('SELECT * FROM agentes_reportes WHERE id = ?').get(reporteId);
      if(!reporte){
        return sendJson(res, 404, {error: 'Reporte no encontrado'});
      }

      // Verificar que el equipo existe
      const equipo = await db.prepare('SELECT * FROM equipos WHERE id = ?').get(equipoId);
      if(!equipo){
        return sendJson(res, 404, {error: 'Equipo no encontrado'});
      }

      // Enlazar el reporte con el equipo
      await db.prepare('UPDATE agentes_reportes SET equipoId = ?, enlazado_timestamp = ? WHERE id = ?')
        .run(equipoId, new Date().toISOString(), reporteId);

      // Actualizar especificaciones técnicas del equipo
      const especificaciones = {
        hostname: reporte.hostname,
        numero_serie_disco: reporte.numero_serie_disco,
        so: reporte.so,
        cpu: reporte.cpu,
        ram_total_gb: reporte.ram_total_gb,
        ram_usado_gb: reporte.ram_usado_gb,
        ram_disponible_gb: reporte.ram_disponible_gb,
        disco_total_gb: reporte.disco_total_gb,
        disco_usado_gb: reporte.disco_usado_gb,
        disco_disponible_gb: reporte.disco_disponible_gb,
        usuario_windows: reporte.usuario_windows,
        timestamp: reporte.timestamp
      };

      await db.prepare('UPDATE equipos SET especificaciones_tecnicas = ?, ultima_actualizacion_inventario = ? WHERE id = ?')
        .run(JSON.stringify(especificaciones), reporte.timestamp, equipoId);

      console.log(`✅ Reporte ${reporteId} enlazado con equipo ${equipoId}`);
      return sendJson(res, 200, {ok: true, reporteId, equipoId});
    }

    if(pathname.startsWith('/api/agentes/reportes/') && pathname.includes('/desenlazar') && req.method === 'POST'){
      const reporteId = pathname.split('/')[4];

      if(!reporteId){
        return sendJson(res, 400, {error: 'reporteId requerido'});
      }

      // Desenlazar el reporte
      await db.prepare('UPDATE agentes_reportes SET equipoId = NULL, enlazado_timestamp = NULL WHERE id = ?')
        .run(reporteId);

      console.log(`✅ Reporte ${reporteId} desenlazado`);
      return sendJson(res, 200, {ok: true, reporteId});
    }

    if(pathname.startsWith('/api/agentes/reportes/') && req.method === 'DELETE'){
      const reporteId = pathname.split('/')[4];

      if(!reporteId){
        return sendJson(res, 400, {error: 'reporteId requerido'});
      }

      // Obtener información del reporte antes de eliminarlo
      const reporte = await db.prepare('SELECT identificador FROM agentes_reportes WHERE id = ?').get(reporteId);
      if(!reporte){
        return sendJson(res, 404, {error: 'Reporte no encontrado'});
      }

      // Eliminar el reporte
      await db.prepare('DELETE FROM agentes_reportes WHERE id = ?').run(reporteId);

      console.log(`✅ Reporte de agente ELIMINADO: ${reporteId} (${reporte.identificador})`);
      return sendJson(res, 200, {ok: true, reporteId, eliminado: reporte.identificador});
    }

    // ---- Endpoints para Asignación de Celulares ----
    if(pathname === '/api/asignar-celular' && req.method === 'POST'){
      const body = await readBody(req);
      const {equipoId, numeroTelefonico} = body;

      if(!equipoId || !numeroTelefonico) {
        return sendJson(res, 400, {error: 'equipoId y numeroTelefonico requeridos'});
      }

      // Actualizar equipo con teléfono
      await db.prepare('UPDATE equipos SET telefonoAsignado = ? WHERE id = ?').run(numeroTelefonico, equipoId);

      return sendJson(res, 200, {ok: true, equipoId, numeroTelefonico});
    }

    if(pathname === '/api/directorio-celulares' && req.method === 'GET'){
      // Obtener directorio de celulares asignados
      const celulares = await db.prepare(`
        SELECT
          id, nombre, marca, modelo, serie, usuarioActual, area, sede,
          estado, telefonoAsignado, fechaCompra
        FROM equipos
        WHERE tipo = 'Celular' AND estado = 'Asignado' AND telefonoAsignado IS NOT NULL
        ORDER BY telefonoAsignado
      `).all();

      return sendJson(res, 200, {celulares, total: celulares.length});
    }

    if(pathname === '/api/directorio-celulares/export-csv' && req.method === 'GET'){
      // Exportar directorio como CSV
      const celulares = await db.prepare(`
        SELECT
          id, nombre, marca, modelo, usuarioActual, area, telefonoAsignado
        FROM equipos
        WHERE tipo = 'Celular' AND estado = 'Asignado' AND telefonoAsignado IS NOT NULL
        ORDER BY telefonoAsignado
      `).all();

      const headers = ['ID', 'Nombre', 'Marca', 'Modelo', 'Usuario Actual', 'Área', 'Número Telefónico'];
      const rows = celulares.map(c => [c.id, c.nombre, c.marca, c.modelo, c.usuarioActual, c.area, c.telefonoAsignado]);
      const csv = [headers.join(',')].concat(rows.map(r => r.map(v => '"' + String(v==null?'':v).replace(/"/g,'""') + '"').join(','))).join('\n');

      res.writeHead(200, {'Content-Type':'text/csv; charset=utf-8', 'Content-Disposition':'attachment; filename="directorio_celulares_' + new Date().toISOString().slice(0,10) + '.csv"'});
      return res.end('﻿' + csv);
    }

    if(pathname === '/api/stats-celulares' && req.method === 'GET'){
      const totalResult = await db.prepare('SELECT COUNT(*) as c FROM equipos WHERE tipo = ? AND estado = ?').get('Celular', 'Asignado');
      const total = totalResult?.c || 0;
      const conTelResult = await db.prepare('SELECT COUNT(*) as c FROM equipos WHERE tipo = ? AND estado = ? AND telefonoAsignado IS NOT NULL').get('Celular', 'Asignado');
      const conTel = conTelResult?.c || 0;
      const sinTel = total - conTel;

      return sendJson(res, 200, {total, conTel, sinTel, porcentaje: total > 0 ? Math.round((conTel/total)*100) : 0});
    }

    // ---- Estaticos (frontend) ----
    if(req.method === 'GET'){
      return serveStatic(req, res, pathname);
    }
    res.writeHead(404); res.end('No encontrado');
  }catch(err){
    console.error(err);
    sendJson(res, 500, {error: err.message});
  }
}

// Crear el server con la función handleRequest
const server = http.createServer(handleRequest);

// ============================================================================
// EXPORTACIÓN: Local vs Vercel
// ============================================================================

if (isServerless) {
  // VERCEL: Handler serverless - Usar handleRequest directamente
  module.exports = async (req, res) => {
    try {
      // 1. Asegurar que BD esté inicializada
      if (ensureDBReady) {
        await ensureDBReady();
      }

      // 2. Invocar el manejador
      await handleRequest(req, res);

    } catch (err) {
      console.error('❌ Handler Vercel error:', err.message, err.stack);
      if (!res.headersSent) {
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
          error: 'Internal Server Error',
          message: err.message
        }));
      }
    }
  };

  console.log('✅ Vercel handler exportado correctamente');

} else {
  // LOCAL: Usar http.createServer() normalmente
  server.listen(PORT, () => {
    console.log(`✅ LOCAL: Servidor escuchando en http://localhost:${PORT}`);
    console.log(`   Abre en este equipo, o accede desde: http://<IP-de-este-equipo>:${PORT}`);
  });
}
