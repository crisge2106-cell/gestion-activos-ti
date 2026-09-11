const DatabaseFactory = require('./db-factory.js');

async function testUpdateFix() {
  try {
    process.env.MONGODB_URI = undefined;
    process.env.NODE_ENV = 'local';

    const db = await DatabaseFactory.init();
    const dbType = DatabaseFactory.getType();

    console.log(`\n🧪 PRUEBA: UPDATE sin crear duplicados (${dbType})\n`);

    // 1. Contar trabajadores ANTES
    const countBefore = await db.prepare('SELECT COUNT(*) as c FROM trabajadores').get();
    console.log(`✓ Trabajadores ANTES: ${countBefore.c}`);

    // 2. Buscar un trabajador para actualizar
    const targetName = 'ASLHI ASTILLO';
    const targetBefore = await db.prepare('SELECT * FROM trabajadores WHERE LOWER(nombre) = LOWER(?)').get(targetName);
    console.log(`✓ Encontrado: ${targetBefore.nombre}`);
    console.log(`  - ID: ${targetBefore.id}`);
    console.log(`  - DNI ANTES: ${targetBefore.dni || '(vacío)'}`);

    // 3. Actualizar el DNI
    const newDni = '12345678';
    const updateResult = await db.prepare('UPDATE trabajadores SET dni = ? WHERE id = ?').run(newDni, targetBefore.id);
    console.log(`\n✓ UPDATE ejecutado: ${updateResult.changes} registros modificados`);

    if (updateResult.changes === 0) {
      console.log('❌ ERROR: UPDATE no encontró documentos! El problema persiste.');
      process.exit(1);
    }

    // 4. Verificar que el DNI se actualizó
    const targetAfter = await db.prepare('SELECT * FROM trabajadores WHERE id = ?').get(targetBefore.id);
    console.log(`\n✓ Verificación POST-UPDATE:`);
    console.log(`  - Nombre: ${targetAfter.nombre}`);
    console.log(`  - DNI DESPUÉS: ${targetAfter.dni}`);

    if (targetAfter.dni !== newDni) {
      console.log(`❌ ERROR: El DNI no se actualizó! Esperado: ${newDni}, Obtenido: ${targetAfter.dni}`);
      process.exit(1);
    }

    // 5. Contar trabajadores DESPUÉS
    const countAfter = await db.prepare('SELECT COUNT(*) as c FROM trabajadores').get();
    console.log(`\n✓ Trabajadores DESPUÉS: ${countAfter.c}`);

    if (countAfter.c !== countBefore.c) {
      console.log(`❌ ERROR: Se creó un duplicado! ANTES: ${countBefore.c}, DESPUÉS: ${countAfter.c}`);

      // Mostrar duplicados
      const duplicates = await db.prepare(`
        SELECT nombre, COUNT(*) as cnt FROM trabajadores
        GROUP BY LOWER(nombre)
        HAVING cnt > 1
      `).all();
      console.log('\n⚠️ Registros duplicados encontrados:');
      duplicates.forEach(d => console.log(`  - ${d.nombre}: ${d.cnt} registros`));
      process.exit(1);
    }

    console.log(`\n✅ ÉXITO: No se crearon duplicados. El problema está RESUELTO!\n`);

    // Revertir cambios
    await db.prepare('UPDATE trabajadores SET dni = ? WHERE id = ?').run(targetBefore.dni || '', targetBefore.id);
    console.log('✓ Cambios revertidos para mantenimiento de datos.\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testUpdateFix();
