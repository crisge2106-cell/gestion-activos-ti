const DatabaseFactory = require('./db-factory.js');

async function checkDuplicates() {
  try {
    // Inicializar BD (SQLite en LOCAL)
    process.env.MONGODB_URI = undefined; // Asegurar que usa SQLite
    process.env.NODE_ENV = 'local';

    const db = await DatabaseFactory.init();

    // Buscar todos los MARIA NATALY
    const records = await db.prepare(`
      SELECT nombre, dni, area, sede
      FROM trabajadores
      WHERE LOWER(nombre) LIKE '%maria%nataly%'
      ORDER BY ROWID DESC
    `).all();

    console.log('\n📋 Registros encontrados:');
    records.forEach((r, i) => {
      console.log(`  [${i+1}] Nombre: ${r.nombre} | DNI: ${r.dni || '(vacío)'} | Área: ${r.area} | Sede: ${r.sede}`);
    });

    if (records.length > 1) {
      console.log('\n⚠️  DUPLICADOS DETECTADOS!');

      // Buscar el registro con DNI (más completo)
      const withDni = records.find(r => r.dni && r.dni.trim());
      const withoutDni = records.filter(r => !r.dni || !r.dni.trim());

      if (withDni && withoutDni.length > 0) {
        console.log(`\n🗑️  Eliminando ${withoutDni.length} registro(s) duplicado(s) sin DNI`);

        // Eliminar todos los registros duplicados sin DNI
        await db.prepare(`
          DELETE FROM trabajadores
          WHERE LOWER(nombre) = LOWER(?)
          AND (dni IS NULL OR dni = '')
        `).run(withDni.nombre);

        console.log('✅ Duplicados eliminados');

        // Verificar
        const final = await db.prepare(`
          SELECT nombre, dni FROM trabajadores
          WHERE LOWER(nombre) LIKE '%maria%nataly%'
        `).all();
        console.log('\n✅ Registros finales:', final.length);
        final.forEach(r => console.log(`   - ${r.nombre} | DNI: ${r.dni || '(vacío)'}`));
      }
    } else {
      console.log('\n✅ No hay duplicados');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkDuplicates();
