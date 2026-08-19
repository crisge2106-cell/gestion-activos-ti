#!/usr/bin/env node
/**
 * EXPORTAR SEED CORREGIDO
 * Lee la base de datos y actualiza seed.json con los nombres correctos
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'activos.db');
const seedPath = path.join(__dirname, 'seed.json');

console.log('\n' + '='.repeat(70));
console.log('  EXPORTAR SEED CORREGIDO');
console.log('='.repeat(70) + '\n');

try {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`BD no encontrada: ${dbPath}`);
  }

  console.log('📖 Leyendo base de datos...\n');

  const db = new DatabaseSync(dbPath);

  // Leer todos los equipos de la BD actual
  const equipos = db.prepare(`
    SELECT * FROM equipos
    ORDER BY id
  `).all();

  console.log(`✅ Leídos ${equipos.length} equipos de la BD\n`);

  // Leer todos los movimientos
  const movimientos = db.prepare(`
    SELECT * FROM movimientos
    ORDER BY id
  `).all();

  console.log(`✅ Leídos ${movimientos.length} movimientos de la BD\n`);

  // Leer todos los mantenimientos
  const mantenimientos = db.prepare(`
    SELECT * FROM mantenimientos
    ORDER BY id
  `).all();

  console.log(`✅ Leídos ${mantenimientos.length} mantenimientos de la BD\n`);

  // Crear objeto seed
  const seed = {
    equipos: equipos,
    movimientos: movimientos,
    mantenimientos: mantenimientos,
    nextEqId: equipos.length + 1,
    nextMvId: movimientos.length + 1,
    nextMantId: mantenimientos.length + 1
  };

  // Respaldar seed.json antiguo
  if (fs.existsSync(seedPath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(__dirname, `seed.json.backup-${timestamp}`);
    fs.copyFileSync(seedPath, backupPath);
    console.log(`💾 Backup creado: ${backupPath}\n`);
  }

  // Guardar nuevo seed.json
  console.log('💾 Guardando nuevo seed.json...\n');
  fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2));

  console.log(`✅ seed.json actualizado\n`);

  // Mostrar resumen
  console.log('📊 Resumen de nombres en seed.json:');

  const prefijos = {};
  for (const eq of equipos) {
    if (eq.nombre) {
      const prefijo = eq.nombre.split('-')[0];
      prefijos[prefijo] = (prefijos[prefijo] || 0) + 1;
    }
  }

  for (const [prefijo, count] of Object.entries(prefijos).sort()) {
    console.log(`   ${prefijo}: ${count}`);
  }

  console.log();

  // Mostrar ejemplos
  console.log('📋 Ejemplos de equipos en seed.json:\n');
  const ejemplos = equipos.filter(eq => eq.nombre).slice(0, 10);
  for (const eq of ejemplos) {
    console.log(`   ${eq.id.padEnd(10)} → ${eq.nombre}`);
  }

  console.log();

  db.close();

  console.log('=' .repeat(70));
  console.log('✅ ¡SEED.JSON ACTUALIZADO CORRECTAMENTE!');
  console.log('=' .repeat(70));
  console.log();
  console.log('📝 Próximos pasos:');
  console.log('   1. Reinicia iniciar_servidor.bat');
  console.log('   2. Abre http://localhost:3335');
  console.log('   3. Presiona Ctrl+F5');
  console.log('   4. Ve a Inventario y verifica\n');

} catch (err) {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
}
