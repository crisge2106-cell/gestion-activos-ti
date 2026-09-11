const DatabaseFactory = require('./db-factory.js');

async function checkMigration() {
  try {
    process.env.MONGODB_URI = undefined;
    process.env.NODE_ENV = 'local';

    const db = await DatabaseFactory.init();

    const conID = await db.prepare('SELECT COUNT(*) as c FROM trabajadores WHERE id IS NOT NULL').get();
    const sinID = await db.prepare('SELECT COUNT(*) as c FROM trabajadores WHERE id IS NULL').get();
    const total = await db.prepare('SELECT COUNT(*) as c FROM trabajadores').get();

    console.log('\n📊 Estado de migración:');
    console.log(`   Total de registros: ${total.c}`);
    console.log(`   Con ID: ${conID.c}`);
    console.log(`   Sin ID: ${sinID.c}`);

    if (conID.c > 0) {
      console.log('\n📋 Ejemplos de registros migrados:');
      const ejemplos = await db.prepare('SELECT nombre, id FROM trabajadores WHERE id IS NOT NULL LIMIT 5').all();
      ejemplos.forEach(e => console.log(`   ${e.nombre}: ${e.id}`));
    }

    if (sinID.c > 0) {
      console.log('\n⚠️  Registros sin ID (necesitan migración):');
      const sinIDrecords = await db.prepare('SELECT nombre FROM trabajadores WHERE id IS NULL LIMIT 5').all();
      sinIDrecords.forEach(e => console.log(`   ${e.nombre}`));
      console.log('\n🔄 Ejecutando migración ahora...');

      const trabajadores = await db.prepare(`
        SELECT rowid, nombre FROM trabajadores WHERE id IS NULL
        ORDER BY rowid ASC
      `).all();

      let contador = 1;
      for (const trab of trabajadores) {
        const id = `TRAB-${String(contador).padStart(4, '0')}`;
        await db.prepare('UPDATE trabajadores SET id = ? WHERE rowid = ?').run(id, trab.rowid);
        contador++;
      }

      console.log(`✅ Se asignaron ${contador - 1} IDs nuevos`);

      const verification = await db.prepare('SELECT COUNT(*) as c FROM trabajadores WHERE id IS NULL').get();
      if (verification.c === 0) {
        console.log('\n✅ MIGRACIÓN COMPLETADA - Todos los registros tienen ID');
      }
    } else {
      console.log('\n✅ MIGRACIÓN YA COMPLETADA - Todos los registros tienen ID');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkMigration();
