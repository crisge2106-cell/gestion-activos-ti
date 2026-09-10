const crypto = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'activos.db');
const db = new Database(DB_PATH);

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
  return { salt, hash };
}

try {
  db.prepare(`CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    salt TEXT, hash TEXT,
    mustChangePassword INTEGER DEFAULT 0,
    email TEXT
  )`).run();

  const { salt, hash } = hashPassword('admin123');
  db.prepare('INSERT OR REPLACE INTO users (username, email, salt, hash, mustChangePassword) VALUES (?,?,?,?,0)')
    .run('admin', 'admin@axis-gl.com', salt, hash);

  console.log('✅ Usuario admin creado');
  console.log('   Usuario: admin');
  console.log('   Contraseña: admin123');
  console.log('   Email: admin@axis-gl.com');
  process.exit(0);
} catch(err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
