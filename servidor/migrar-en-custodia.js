// Migra equipos con estado "En custodia": "Por reparar" si la observación menciona una falla, "Disponible" en el resto.
// Uso: node migrar-en-custodia.js   (con MONGODB_URI definido, aplica a MongoDB; si no, a SQLite local)
const db = require('./db-factory');

const PATRON_FALLA = /aver[ií]a|problema|\brot[ao]s?\b|inoperativ|repar|desgast|desgat|falla|pantalla/i;

(async () => {
  await db.init();
  const equipos = await db.prepare('SELECT * FROM equipos WHERE estado = ?').all('En custodia');
  let disponibles = 0, reparar = 0;
  for (const e of equipos) {
    const nuevo = PATRON_FALLA.test(e.observaciones || '') ? 'Por reparar' : 'Disponible';
    await db.prepare('UPDATE equipos SET estado = ? WHERE id = ?').run(nuevo, e.id);
    console.log(`${e.id} ${nuevo}`);
    if (nuevo === 'Por reparar') reparar++; else disponibles++;
  }
  console.log(`Migrados: ${equipos.length} (Disponible: ${disponibles}, Por reparar: ${reparar})`);
  process.exit(0);
})().catch(err => {
  console.error('Error en la migración:', err.message);
  process.exit(1);
});
