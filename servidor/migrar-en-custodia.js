// Migra equipos con estado "En custodia" a "Disponible" (sin observaciones) o "Por reparar" (con observaciones).
// Uso: node migrar-en-custodia.js   (con MONGODB_URI definido, aplica a MongoDB; si no, a SQLite local)
const db = require('./db-factory');

(async () => {
  const equipos = await db.prepare('SELECT * FROM equipos WHERE estado = ?').all('En custodia');
  let disponibles = 0, reparar = 0;
  for (const e of equipos) {
    const nuevo = (e.observaciones || '').trim() ? 'Por reparar' : 'Disponible';
    await db.prepare('UPDATE equipos SET estado = ? WHERE id = ?').run(nuevo, e.id);
    if (nuevo === 'Por reparar') reparar++; else disponibles++;
  }
  console.log(`Migrados: ${equipos.length} (Disponible: ${disponibles}, Por reparar: ${reparar})`);
  process.exit(0);
})().catch(err => {
  console.error('Error en la migración:', err.message);
  process.exit(1);
});
