const DatabaseFactory = require('./db-factory.js');

function generateTrabajadorId(){
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `TRAB-${timestamp}-${random}`;
}

async function fixMongoDBDuplicates() {
  try {
    // Asegurar que se conecta a MongoDB
    if (!process.env.MONGODB_URI) {
      console.log('ℹ️ SKIP: No es MongoDB (MONGODB_URI no definida)');
      return;
    }

    const db = await DatabaseFactory.init();
    const dbType = DatabaseFactory.getType();

    if (dbType !== 'mongodb') {
      console.log('ℹ️ SKIP: No es MongoDB, usando', dbType);
      return;
    }

    console.log('\n🔧 LIMPIEZA DE DUPLICADOS EN MONGODB\n');

    const mongoDb = await DatabaseFactory.getMongoDatabase();
    const collection = mongoDb.collection('trabajadores');

    // 1. Encontrar duplicados (mismo nombre, diferentes _id)
    console.log('📍 Buscando duplicados por nombre...');
    const duplicates = await collection.aggregate([
      {
        $group: {
          _id: { $toLower: '$nombre' },
          count: { $sum: 1 },
          ids: { $push: '$_id' },
          docs: { $push: '$$ROOT' }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    if (duplicates.length === 0) {
      console.log('✅ No hay duplicados\n');
      return;
    }

    console.log(`⚠️ Encontrados ${duplicates.length} grupos de duplicados\n`);

    // 2. Procesar cada grupo de duplicados
    for (const group of duplicates) {
      const nombreLower = group._id;
      const count = group.count;
      const docs = group.docs;

      console.log(`\n📝 Procesando: "${nombreLower}" (${count} copias)`);

      // Ordenar por: 1. tiene DNI (preferir el que tiene DNI), 2. timestamp de _id descendente
      docs.sort((a, b) => {
        // Preferir el que tiene DNI
        const aDni = a.dni && a.dni !== '' ? 1 : 0;
        const bDni = b.dni && b.dni !== '' ? 1 : 0;
        if (aDni !== bDni) return bDni - aDni;

        // Si ambos tienen o ambos no tienen DNI, preferir el más reciente (_id)
        return b._id.getTimestamp ? b._id.getTimestamp() - a._id.getTimestamp() : 0;
      });

      const keepDoc = docs[0];
      const deleteIds = docs.slice(1).map(d => d._id);

      console.log(`   ✓ Mantener: ${keepDoc.nombre} (DNI: ${keepDoc.dni || '(sin DNI)'})`);
      console.log(`   ✗ Eliminar ${deleteIds.length} copias`);

      // Asignar ID si no existe
      if (!keepDoc.id) {
        const newId = generateTrabajadorId();
        await collection.updateOne(
          { _id: keepDoc._id },
          { $set: { id: newId } }
        );
        console.log(`   📌 Asignado ID: ${newId}`);
      }

      // Eliminar duplicados
      const deleteResult = await collection.deleteMany({
        _id: { $in: deleteIds }
      });
      console.log(`   🗑️ Eliminados ${deleteResult.deletedCount} documentos`);
    }

    // 3. Asignar IDs a documentos sin ID
    console.log('\n📍 Asignando IDs a documentos sin ID...');
    const docsWithoutId = await collection.find({
      $or: [
        { id: { $exists: false } },
        { id: null }
      ]
    }).toArray();

    console.log(`   Encontrados ${docsWithoutId.length} documentos sin ID`);

    for (const doc of docsWithoutId) {
      const newId = generateTrabajadorId();
      await collection.updateOne(
        { _id: doc._id },
        { $set: { id: newId } }
      );
      console.log(`   ✓ ${doc.nombre}: ${newId}`);
    }

    // 4. Crear índice único en nombre
    console.log('\n📍 Creando índice UNIQUE en nombre...');
    try {
      // Primero, eliminar índice existente si está ahí
      try {
        await collection.dropIndex('nombre_1');
      } catch (e) {
        // Índice no existe, es normal
      }

      // Crear nuevo índice único y case-insensitive
      await collection.createIndex({ nombre: 1 }, { unique: true, collation: { locale: 'es', strength: 2 } });
      console.log('   ✅ Índice UNIQUE creado\n');
    } catch (err) {
      console.log(`   ⚠️ No se pudo crear índice: ${err.message}`);
      console.log('   (Los duplicados ya fueron eliminados)\n');
    }

    // 5. Verificación final
    console.log('📊 Verificación final:');
    const totalFinal = await collection.countDocuments();
    const withIdFinal = await collection.countDocuments({ id: { $exists: true, $ne: null } });
    console.log(`   Total: ${totalFinal}`);
    console.log(`   Con ID: ${withIdFinal}`);
    console.log(`   ✅ LIMPIEZA COMPLETADA\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    throw err;
  }
}

module.exports = { fixMongoDBDuplicates };

if (require.main === module) {
  fixMongoDBDuplicates().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
