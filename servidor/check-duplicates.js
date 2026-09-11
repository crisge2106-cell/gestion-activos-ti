const DatabaseFactory = require('./db-factory.js');
const path = require('path');

async function checkDuplicates() {
  try {
    // Usar SQLite local
    const dbPath = path.join('D:\\Proyectos\\Gestion de activos TI\\servidor', 'activos.db');
    console.log('📂 Base de datos:', dbPath);

    // Inicializar BD (SQLite en LOCAL)
    process.env.MONGODB_URI = undefined; // Asegurar que usa SQLite
    process.env.NODE_ENV = 'local';

    const db = await DatabaseFactory.init();

    // Buscar todos los MARIA NATALY
    const records = db.prepare(`
      SELECT id, nombre, dni, area, sede
      FROM trabajadores
      WHERE LOWER(nombre) LIKE '%maria%nataly%'
      ORDER BY id DESC
    `).all();

    console.log('\n📋 Registros encontrados:');
    records.forEach((r, i) => {
      console.log(`  [${i+1}] ID: ${r.id} | Nombre: ${r.nombre} | DNI: ${r.dni || '(vacío)'} | Área: ${r.area} | Sede: ${r.sede}`);
    });

    if (records.length > 1) {
      console.log('\n⚠️  DUPLICADOS DETECTADOS!');

      // Buscar el registro con DNI (más completo)
      const withDni = records.find(r => r.dni && r.dni.trim());
      const withoutDni = records.find(r => !r.dni || !r.dni.trim());

      if (withDni && withoutDni) {
        console.log(`\n🗑️  Eliminando duplicado sin DNI (ID: ${withoutDni.id})`);
        db.prepare('DELETE FROM trabajadores WHERE id = ?').run(withoutDni.id);
        console.log('✅ Duplicado eliminado');

        // Verificar
        const final = db.prepare(`
          SELECT id, nombre, dni FROM trabajadores
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
