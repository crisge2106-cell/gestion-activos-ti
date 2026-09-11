const DatabaseFactory = require('./db-factory.js');

async function verify() {
  try {
    process.env.MONGODB_URI = undefined;
    process.env.NODE_ENV = 'local';

    const db = await DatabaseFactory.init();

    console.log('\n🔍 VERIFICACIÓN DE IDs EN TRABAJADORES\n');

    // Contar total
    const total = await db.prepare('SELECT COUNT(*) as c FROM trabajadores').get();
    console.log(`Total de trabajadores: ${total.c}`);

    // Contar con ID
    const conId = await db.prepare("SELECT COUNT(*) as c FROM trabajadores WHERE id IS NOT NULL").get();
    console.log(`Con ID: ${conId.c}`);

    // Contar sin ID
    const sinId = await db.prepare("SELECT COUNT(*) as c FROM trabajadores WHERE id IS NULL").get();
    console.log(`Sin ID: ${sinId.c}`);

    // Mostrar ejemplos
    console.log('\n📋 Primeros 10 trabajadores:');
    const ejemplos = await db.prepare('SELECT id, nombre, dni FROM trabajadores LIMIT 10').all();
    ejemplos.forEach((t, i) => {
      console.log(`   ${i+1}. [${t.id}] ${t.nombre} (DNI: ${t.dni || 'N/A'})`);
    });

    if (sinId.c > 0) {
      console.log('\n⚠️ Trabajadores sin ID:');
      const sinIdRecords = await db.prepare('SELECT nombre FROM trabajadores WHERE id IS NULL LIMIT 10').all();
      sinIdRecords.forEach(t => console.log(`   - ${t.nombre}`));
    } else {
      console.log('\n✅ TODOS los trabajadores tienen ID\n');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

verify();
