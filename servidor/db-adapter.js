// ============================================================================
// Adaptador MongoDB - Simula interfaz SQLite3
// ============================================================================

const { MongoClient } = require('mongodb');

let client = null;
let db = null;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'gestion_activos';

// Conectar a MongoDB
async function connectDB() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Conectado a MongoDB:', DB_NAME);
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
  try {
    // INSERT
    if (sql.trim().toUpperCase().startsWith('INSERT INTO')) {
      return await handleInsert(database, sql, params);
    }

    // SELECT
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const result = await handleSelect(database, sql, params);
      if (type === 'get') return result[0] || null;
      return result;
    }

    // UPDATE
    if (sql.trim().toUpperCase().startsWith('UPDATE')) {
      return await handleUpdate(database, sql, params);
    }

    // DELETE
    if (sql.trim().toUpperCase().startsWith('DELETE')) {
      return await handleDelete(database, sql, params);
    }

    // BEGIN/COMMIT/ROLLBACK (no-op en MongoDB)
    if (sql.includes('BEGIN') || sql.includes('COMMIT') || sql.includes('ROLLBACK')) {
      return { ok: true };
    }

    console.warn('⚠️ Query no soportada:', sql);
    return null;
  } catch (err) {
    console.error('❌ Error en query:', sql, err.message);
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
  const result = await collection.insertOne(doc);
  return { lastID: result.insertedId, changes: 1 };
}

// Manejar SELECT
async function handleSelect(database, sql, params) {
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

module.exports = {
  connectDB,
  exec,
  prepare
};
