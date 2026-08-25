// ============================================================================
// DB Factory - Soporte dual SQLite / MongoDB
// ============================================================================
// Detecta automáticamente qué BD usar:
//   - Si MONGODB_URI está definida → usa MongoDB
//   - Si no → usa SQLite nativo (node:sqlite DatabaseSync)
// ============================================================================

const path = require('path');
const MONGODB_URI = process.env.MONGODB_URI;
const DB_PATH = path.join(__dirname, 'activos.db');

let dbInstance = null;
let dbType = null;

// Log env vars on first init
let envLogged = false;

// ============================================================================
// INICIALIZACIÓN: Detectar y crear la BD correspondiente
// ============================================================================

async function initializeDB() {
  if (dbInstance) return dbInstance;

  // Log environment on first init
  if (!envLogged) {
    console.log('🌍 MONGODB_URI env:', MONGODB_URI ? `${MONGODB_URI.substring(0, 50)}...` : 'NOT SET');
    console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
    console.log('🌍 VERCEL:', process.env.VERCEL);
    envLogged = true;
  }

  if (MONGODB_URI) {
    console.log('🔄 Inicializando MongoDB...');
    dbInstance = createMongoDBAdapter();
    dbType = 'mongodb';
    console.log('✅ Base de datos: MongoDB');
    console.log(`   URI: ${MONGODB_URI.replace(/:[^:]*@/, ':****@')}`);
  } else {
    console.log('🔄 Inicializando SQLite...');
    dbInstance = createSQLiteAdapter();
    dbType = 'sqlite';
    console.log('✅ Base de datos: SQLite');
    console.log(`   Path: ${DB_PATH}`);
  }

  return dbInstance;
}

// ============================================================================
// ADAPTADOR SQLITE (usa node:sqlite DatabaseSync)
// ============================================================================

function createSQLiteAdapter() {
  // Lazy load para evitar error si sqlite3 no está instalada en Vercel
  let Database;
  try {
    // En Node 22.5+ está disponible sqlite como built-in
    const { DatabaseSync } = require('node:sqlite');
    Database = DatabaseSync;
  } catch (e) {
    // Fallback a better-sqlite3 si está disponible
    try {
      const BetterSqlite3 = require('better-sqlite3');
      Database = class DatabaseSync {
        constructor(path) {
          this.db = new BetterSqlite3(path);
        }
        exec(sql) {
          return this.db.exec(sql);
        }
        prepare(sql) {
          const stmt = this.db.prepare(sql);
          return {
            run: (...params) => stmt.run(...params),
            get: (...params) => stmt.get(...params),
            all: (...params) => stmt.all(...params)
          };
        }
      };
    } catch (e2) {
      throw new Error(
        'SQLite no disponible. Instala: npm install better-sqlite3\n' +
        'O usa Node.js 22.5+ que incluye sqlite nativo.'
      );
    }
  }

  const sqlite = new Database(DB_PATH);

  return {
    exec: async (sql) => {
      try {
        sqlite.exec(sql);
      } catch (err) {
        console.error('❌ Error en SQLite exec:', err.message);
        throw err;
      }
    },

    prepare: (sql) => {
      return {
        run: async (...params) => {
          try {
            return sqlite.prepare(sql).run(...params);
          } catch (err) {
            console.error('❌ Error en SQLite prepare.run:', sql, err.message);
            throw err;
          }
        },
        get: async (...params) => {
          try {
            return sqlite.prepare(sql).get(...params);
          } catch (err) {
            console.error('❌ Error en SQLite prepare.get:', sql, err.message);
            throw err;
          }
        },
        all: async (...params) => {
          try {
            return sqlite.prepare(sql).all(...params);
          } catch (err) {
            console.error('❌ Error en SQLite prepare.all:', sql, err.message);
            throw err;
          }
        }
      };
    }
  };
}

// ============================================================================
// ADAPTADOR MONGODB (mantiene código existente)
// ============================================================================

function createMongoDBAdapter() {
  const { MongoClient } = require('mongodb');

  let client = null;
  let db = null;
  const DB_NAME = 'gestion_activos';

  // Conectar a MongoDB
  async function connectDB() {
    if (!client) {
      const t0 = Date.now();
      client = new MongoClient(MONGODB_URI, {
        maxPoolSize: 10,
        minPoolSize: 1,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 5000
      });
      await client.connect();
      db = client.db(DB_NAME);
      const elapsed = Date.now() - t0;
      console.log(`✅ Conectado a MongoDB (${elapsed}ms):`, DB_NAME);
    }
    return db;
  }

  // Crear tablas (colecciones) si no existen
  async function exec(sql) {
    const database = await connectDB();

    // Solo procesamos CREATE TABLE IF NOT EXISTS
    if (sql.includes('CREATE TABLE IF NOT EXISTS')) {
      const tableMatches = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/gi);
      if (tableMatches) {
        for (const match of tableMatches) {
          const tableName = match.replace(/CREATE TABLE IF NOT EXISTS /i, '').trim();
          try {
            await database.createCollection(tableName);
            console.log(`✅ Colección '${tableName}' creada o ya existe`);
          } catch (err) {
            if (err.codeName === 'NamespaceExists') {
              // Colección ya existe, no es error
            } else {
              console.error(`Error creando colección '${tableName}':`, err.message);
            }
          }
        }
      }
    }
  }

  // Simulador de prepared statements
  function prepare(sql) {
    return {
      run: async (...params) => {
        const database = await connectDB();
        return executeQuery(database, sql, params, 'run');
      },
      get: async (...params) => {
        const database = await connectDB();
        return executeQuery(database, sql, params, 'get');
      },
      all: async (...params) => {
        const database = await connectDB();
        return executeQuery(database, sql, params, 'all');
      }
    };
  }

  // Ejecutor de queries SQL -> MongoDB
  async function executeQuery(database, sql, params, type) {
    const t0 = Date.now();
    const sqlShort = sql.substring(0, 50).replace(/\n/g, ' ');
    try {
      let result;

      // INSERT
      if (sql.trim().toUpperCase().startsWith('INSERT INTO')) {
        result = await handleInsert(database, sql, params);
      }
      // SELECT
      else if (sql.trim().toUpperCase().startsWith('SELECT')) {
        result = await handleSelect(database, sql, params);
        if (type === 'get') result = result[0] || null;
      }
      // UPDATE
      else if (sql.trim().toUpperCase().startsWith('UPDATE')) {
        result = await handleUpdate(database, sql, params);
      }
      // DELETE
      else if (sql.trim().toUpperCase().startsWith('DELETE')) {
        result = await handleDelete(database, sql, params);
      }
      // BEGIN/COMMIT/ROLLBACK (no-op en MongoDB)
      else if (sql.includes('BEGIN') || sql.includes('COMMIT') || sql.includes('ROLLBACK')) {
        result = { ok: true };
      }
      else {
        console.warn('⚠️ Query no soportada:', sqlShort);
        return null;
      }

      const elapsed = Date.now() - t0;
      if (elapsed > 100) console.log(`⏱️ Query lenta (${elapsed}ms): ${sqlShort}...`);
      return result;
    } catch (err) {
      const elapsed = Date.now() - t0;
      console.error(`❌ Error en query (${elapsed}ms): ${sqlShort}... - ${err.message}`);
      throw err;
    }
  }

  // Manejar INSERT
  async function handleInsert(database, sql, params) {
    const tableMatch = sql.match(/INSERT INTO (\w+)/i);
    if (!tableMatch) throw new Error('Invalid INSERT');

    const tableName = tableMatch[1];
    const columnsMatch = sql.match(/\((.*?)\)/);
    const columns = columnsMatch ? columnsMatch[1].split(',').map(c => c.trim()) : [];

    const doc = {};
    columns.forEach((col, i) => {
      doc[col] = params[i] ?? null;
    });

    const collection = database.collection(tableName);
    try {
      // Intentar insertMany si hay múltiples documentos en buffer (para futuro)
      const result = await collection.insertOne(doc);
      return { lastID: result.insertedId, changes: 1 };
    } catch (err) {
      // Si falla porque el documento ya existe (duplicate key), ignorar
      if (err.code === 11000) {
        return { lastID: doc._id, changes: 0 };
      }
      throw err;
    }
  }

  // Manejar SELECT
  async function handleSelect(database, sql, params) {
    // Detectar COUNT(*)
    const countMatch = sql.match(/SELECT\s+COUNT\(\*\)\s+(?:AS\s+)?(\w+)?/i);
    if (countMatch) {
      const tableMatch = sql.match(/FROM (\w+)/i);
      if (!tableMatch) throw new Error('Invalid SELECT COUNT');

      const tableName = tableMatch[1];
      const collection = database.collection(tableName);
      const filter = buildWhereFilter(sql, params);
      const count = await collection.countDocuments(filter);
      const alias = countMatch[1] || 'COUNT(*)';
      return [{ [alias]: count }];
    }

    const tableMatch = sql.match(/FROM (\w+)/i);
    if (!tableMatch) throw new Error('Invalid SELECT');

    const tableName = tableMatch[1];
    const collection = database.collection(tableName);

    // Construir filtro WHERE
    const filter = buildWhereFilter(sql, params);

    // Construir opciones (LIMIT, ORDER BY, etc.)
    const options = {};

    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) options.limit = parseInt(limitMatch[1]);

    const orderMatch = sql.match(/ORDER BY\s+(\w+)\s+(ASC|DESC)?/i);
    if (orderMatch) {
      options.sort = { [orderMatch[1]]: orderMatch[2]?.toUpperCase() === 'DESC' ? -1 : 1 };
    }

    const results = await collection.find(filter).sort(options.sort || {}).limit(options.limit || 0).toArray();
    return results;
  }

  // Manejar UPDATE
  async function handleUpdate(database, sql, params) {
    const tableMatch = sql.match(/UPDATE (\w+)/i);
    if (!tableMatch) throw new Error('Invalid UPDATE');

    const tableName = tableMatch[1];
    const collection = database.collection(tableName);

    // Extraer SET y WHERE
    const setMatch = sql.match(/SET\s+([\s\S]*?)\s+WHERE/i);
    const whereMatch = sql.match(/WHERE\s+([\s\S]*?)$/i);

    if (!setMatch || !whereMatch) throw new Error('Invalid UPDATE syntax');

    const updates = {};
    const setPairs = setMatch[1].split(',').map(p => p.trim());
    let paramIndex = 0;

    setPairs.forEach(pair => {
      const [col] = pair.split('=');
      updates[col.trim()] = params[paramIndex++];
    });

    const filter = buildWhereFilter('WHERE ' + whereMatch[1], params.slice(paramIndex));

    const result = await collection.updateOne(filter, { $set: updates });
    return { changes: result.modifiedCount };
  }

  // Manejar DELETE
  async function handleDelete(database, sql, params) {
    const tableMatch = sql.match(/FROM (\w+)/i);
    if (!tableMatch) throw new Error('Invalid DELETE');

    const tableName = tableMatch[1];
    const collection = database.collection(tableName);

    const filter = buildWhereFilter(sql, params);
    const result = await collection.deleteMany(filter);
    return { changes: result.deletedCount };
  }

  // Constructor de filtros WHERE
  function buildWhereFilter(sql, params) {
    const whereMatch = sql.match(/WHERE\s+([\s\S]*?)(?:LIMIT|ORDER|$)/i);
    if (!whereMatch) return {};

    const whereClause = whereMatch[1].trim();
    const filter = {};

    // Parsear WHERE simple: "column = ?" o "column = ? AND column2 = ?"
    const conditions = whereClause.split('AND').map(c => c.trim());
    let paramIndex = 0;

    conditions.forEach(condition => {
      const match = condition.match(/(\w+)\s*(=|!=|<|>|<=|>=|LIKE|IS)\s*(.+)/);
      if (!match) return;

      const [, col, op, val] = match;

      if (op === '=') {
        if (val.trim() === '?') {
          filter[col] = params[paramIndex++];
        } else if (val.trim().toUpperCase() === 'NULL') {
          filter[col] = null;
        } else {
          filter[col] = val.trim().replace(/'/g, '');
        }
      } else if (op === '!=') {
        filter[col] = { $ne: params[paramIndex++] };
      } else if (op === 'LIKE') {
        const pattern = params[paramIndex++];
        filter[col] = { $regex: pattern.replace(/%/g, '.*'), $options: 'i' };
      } else if (op === 'IS') {
        filter[col] = val.trim().toUpperCase() === 'NULL' ? null : params[paramIndex++];
      } else if (op === '<') {
        filter[col] = { $lt: params[paramIndex++] };
      } else if (op === '>') {
        filter[col] = { $gt: params[paramIndex++] };
      } else if (op === '<=') {
        filter[col] = { $lte: params[paramIndex++] };
      } else if (op === '>=') {
        filter[col] = { $gte: params[paramIndex++] };
      }
    });

    return filter;
  }

  return {
    connectDB,
    exec,
    prepare
  };
}

// ============================================================================
// EXPORTAR INTERFAZ UNIFICADA
// ============================================================================

module.exports = {
  init: initializeDB,
  getDB: () => dbInstance,
  getType: () => dbType,

  // Forward métodos a la instancia actual
  exec: async (sql) => {
    const db = await initializeDB();
    return db.exec(sql);
  },

  prepare: (sql) => {
    // El prepare es síncrono en apariencia, pero retorna métodos async
    if (!dbInstance) {
      throw new Error('BD no inicializada. Llama a db.init() primero.');
    }
    return dbInstance.prepare(sql);
  }
};
