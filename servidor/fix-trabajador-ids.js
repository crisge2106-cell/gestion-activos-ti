const DatabaseFactory = require('./db-factory.js');

// Función para generar IDs (igual que en server.js)
function generateTrabajadorId(){
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `TRAB-${timestamp}-${random}`;
}

async function fixTrabajadorIds() {
  try {
    // No establecer MONGODB_URI aquí para que la migración se ejecute en ambos ambientes
    const db = await DatabaseFactory.init();
    const dbType = DatabaseFactory.getType();

    console.log('\n🔧 MIGRACIÓN: Asegurando que TODOS los trabajadores tienen ID único\n');

    if (dbType === 'mongodb') {
      console.log('📦 Usando MongoDB...');

      // En MongoDB, obtener la base de datos
      const mongoDb = await DatabaseFactory.getMongoDatabase();
      const collection = mongoDb.collection('trabajadores');

      // Encontrar todos los documentos sin ID o con ID null
      const docsWithoutId = await collection.find({
        $or: [
          { id: { $exists: false } },
          { id: null }
        ]
      }).toArray();

      console.log(`   Encontrados ${docsWithoutId.length} documentos sin ID`);

      if (docsWithoutId.length > 0) {
        for (const doc of docsWithoutId) {
          const id = generateTrabajadorId();
          await collection.updateOne(
            { _id: doc._id },
            { $set: { id } }
          );
          console.log(`   ✓ Asignado ID a: ${doc.nombre}`);
        }
        console.log(`\n✅ ${docsWithoutId.length} documentos actualizados en MongoDB\n`);
      } else {
        console.log('   ✅ Todos los documentos ya tienen ID\n');
      }
    } else {
      console.log('📁 Usando SQLite...');

      // En SQLite, contar registros sin ID
      const result = await db.prepare('SELECT COUNT(*) as c FROM trabajadores WHERE id IS NULL').get();
      const countWithoutId = result?.c || 0;

      console.log(`   Encontrados ${countWithoutId} registros sin ID`);

      if (countWithoutId > 0) {
        // Obtener todos los registros sin ID
        const registros = await db.prepare('SELECT * FROM trabajadores WHERE id IS NULL').all();

        for (const reg of registros) {
          const id = generateTrabajadorId();
          await db.prepare('UPDATE trabajadores SET id = ? WHERE nombre = ?').run(id, reg.nombre);
          console.log(`   ✓ Asignado ID a: ${reg.nombre}`);
        }
        console.log(`\n✅ ${countWithoutId} registros actualizados en SQLite\n`);
      } else {
        console.log('   ✅ Todos los registros ya tienen ID\n');
      }
    }

    // Verificación final
    const allTrabajadores = await db.prepare('SELECT id, nombre FROM trabajadores').all();
    const sinId = allTrabajadores.filter(t => !t.id || t.id === null);

    if (sinId.length === 0) {
      console.log('✅ MIGRACIÓN COMPLETADA: Todos los trabajadores tienen ID único\n');
    } else {
      console.log(`⚠️ ADVERTENCIA: ${sinId.length} trabajadores aún sin ID:`);
      sinId.forEach(t => console.log(`   ${t.nombre}`));
    }

  } catch (err) {
    console.error('❌ Error en migración:', err.message);
    throw err;
  }
}

module.exports = { fixTrabajadorIds };

// Si se ejecuta directamente
if (require.main === module) {
  fixTrabajadorIds().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
