const DatabaseFactory = require('./db-factory.js');
const fs = require('fs');
const path = require('path');

async function exportData() {
  try {
    // Forzar LOCAL (SQLite)
    process.env.MONGODB_URI = undefined;
    process.env.NODE_ENV = 'local';

    const db = await DatabaseFactory.init();

    console.log('\n📤 EXPORTANDO DATOS DE LOCAL...\n');

    // Exportar equipos
    const equipos = await db.prepare('SELECT * FROM equipos ORDER BY id').all();
    console.log(`✓ Equipos: ${equipos.length}`);

    // Exportar trabajadores
    const trabajadores = await db.prepare('SELECT * FROM trabajadores ORDER BY id').all();
    console.log(`✓ Trabajadores: ${trabajadores.length}`);

    // Exportar movimientos
    const movimientos = await db.prepare('SELECT * FROM movimientos ORDER BY id').all();
    console.log(`✓ Movimientos: ${movimientos.length}`);

    // Exportar movimiento_items
    const movimiento_items = await db.prepare('SELECT * FROM movimiento_items').all();
    console.log(`✓ Movimiento items: ${movimiento_items.length}`);

    const data = {
      equipos,
      trabajadores,
      movimientos,
      movimiento_items,
      exportedAt: new Date().toISOString(),
      source: 'LOCAL SQLite'
    };

    // Guardar a archivo
    const filePath = path.join(__dirname, 'export-backup.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    console.log(`\n✅ EXPORTACIÓN COMPLETADA`);
    console.log(`📁 Archivo: ${filePath}`);
    console.log(`💾 Tamaño: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
    console.log(`\n📋 INSTRUCCIONES PARA IMPORTAR A VERCEL:`);
    console.log(`1. Copia el contenido del archivo export-backup.json`);
    console.log(`2. Haz POST a: https://tu-app.vercel.app/api/admin/import-data`);
    console.log(`3. Con body: el JSON exportado`);
    console.log('\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

exportData();
