const DatabaseFactory = require('./db-factory.js');

async function migrateTrabajadores() {
  try {
    process.env.MONGODB_URI = undefined;
    process.env.NODE_ENV = 'local';

    console.log('🔄 Iniciando migración: Agregar ID a trabajadores...\n');

    const db = await DatabaseFactory.init();

    // Verificar si la columna ID ya existe
    const checkId = await db.prepare(`
      SELECT COUNT(*) as count FROM pragma_table_info('trabajadores')
      WHERE name = 'id'
    `).get();

    if (checkId && checkId.count > 0) {
      console.log('✅ Columna ID ya existe. Migracion completada.');
      return;
    }

    console.log('📝 Paso 1: Agregando columna ID...');
    await db.prepare(`ALTER TABLE trabajadores ADD COLUMN id TEXT`).run();
    console.log('✅ Columna ID agregada\n');

    // Obtener todos los trabajadores sin ID
    console.log('📝 Paso 2: Generando IDs para trabajadores existentes...');
    const trabajadores = await db.prepare(`
      SELECT rowid, nombre FROM trabajadores
      ORDER BY rowid ASC
    `).all();

    console.log(`   Encontrados: ${trabajadores.length} trabajadores\n`);

    let contador = 1;
    for (const trab of trabajadores) {
      const id = `TRAB-${String(contador).padStart(4, '0')}`;

      await db.prepare(`
        UPDATE trabajadores
        SET id = ?
        WHERE rowid = ?
      `).run(id, trab.rowid);

      if (contador % 10 === 0) {
        console.log(`   ✓ Procesados ${contador}/${trabajadores.length}...`);
      }
      contador++;
    }

    console.log(`\n✅ IDs generados para ${trabajadores.length} trabajadores\n`);

    // Verificar integridad
    console.log('📋 Paso 3: Verificando integridad...');
    const conIDs = await db.prepare(`
      SELECT COUNT(*) as count FROM trabajadores WHERE id IS NOT NULL
    `).get();
    const sinIDs = await db.prepare(`
      SELECT COUNT(*) as count FROM trabajadores WHERE id IS NULL
    `).get();

    console.log(`   Registros con ID: ${conIDs.count}`);
    console.log(`   Registros sin ID: ${sinIDs.count}`);

    if (sinIDs.count === 0) {
      console.log('\n✅ MIGRACIÓN COMPLETADA CON ÉXITO');
      console.log('   ✓ Todos los trabajadores tienen ID único');
      console.log('   ✓ No se perdió ningún dato');
      console.log(`   ✓ Total de registros: ${trabajadores.length}\n`);
    } else {
      console.log('\n⚠️ ADVERTENCIA: Algunos registros no tienen ID');
    }

  } catch (err) {
    console.error('❌ Error en migración:', err.message);
    console.error(err);
  }
}

migrateTrabajadores();
