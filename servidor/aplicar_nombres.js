#!/usr/bin/env node
/**
 * APLICAR NOMBRES A EQUIPOS
 * Lee seed.json y actualiza la BD con los nombres correctos
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'activos.db');
const seedPath = path.join(__dirname, 'seed.json');

console.log('\n' + '='.repeat(70));
console.log('  APLICAR NOMBRES A EQUIPOS DESDE SEED.JSON');
console.log('='.repeat(70) + '\n');

try {
  if (!fs.existsSync(seedPath)) {
    throw new Error(`seed.json no encontrado en ${seedPath}`);
  }

  if (!fs.existsSync(dbPath)) {
    throw new Error(`BD no encontrada en ${dbPath}`);
  }

  console.log('📖 Leyendo seed.json...\n');
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  console.log(`✅ Leídos ${seed.equipos.length} equipos del seed\n`);

  const db = new DatabaseSync(dbPath);

  console.log('🔄 PASO 1: Limpiando nombres existentes...\n');
  db.exec('UPDATE equipos SET nombre = NULL');
  console.log('✅ Nombres puestos en NULL\n');

  console.log('📝 PASO 2: Aplicando nombres desde seed.json...\n');

  let actualizados = 0;
  let noEncontrados = 0;
  const updateStmt = db.prepare('UPDATE equipos SET nombre = ? WHERE id = ?');

  for (const eq of seed.equipos) {
    if (eq.nombre && !eq.nombre.startsWith('Equipo-')) {
      const result = updateStmt.run(eq.nombre, eq.id);
      if (result.changes > 0) {
        actualizados++;
        console.log(`   ✅ ${eq.id.padEnd(10)} → ${eq.nombre}`);
      } else {
        noEncontrados++;
      }
    }
  }

  console.log(`\n✅ Actualizados: ${actualizados} equipos`);
  console.log(`⚠️  No encontrados: ${noEncontrados} equipos\n`);

  // Verificación
  console.log('✅ VERIFICACIÓN FINAL\n');

  const total = db.prepare('SELECT COUNT(*) as c FROM equipos').get().c;
  const conNombre = db.prepare("SELECT COUNT(*) as c FROM equipos WHERE nombre IS NOT NULL AND nombre != ''").get().c;
  const sinNombre = total - conNombre;

  console.log(`Total equipos: ${total}`);
  console.log(`Con nombre: ${conNombre}`);
  console.log(`Sin nombre: ${sinNombre}\n`);

  // Mostrar resumen por prefijo
  const prefijos = ['LPT', 'CEL', 'IMP', 'ACC', 'SCA', 'DES', 'MOU', 'AXPA', 'AXLI', 'AXLIM'];
  console.log('📊 Equipos por prefijo:\n');
  for (const prefijo of prefijos) {
    const count = db.prepare(`SELECT COUNT(*) as c FROM equipos WHERE nombre LIKE ?`).get(prefijo + '%').c;
    if (count > 0) {
      console.log(`   ${prefijo}: ${count}`);
    }
  }

  console.log();

  // Mostrar ejemplos
  console.log('📋 Ejemplos de nombres asignados:\n');
  const ejemplos = db.prepare(`
    SELECT id, nombre, tipo FROM equipos
    WHERE nombre IS NOT NULL AND nombre != ''
    ORDER BY nombre
    LIMIT 15
  `).all();

  for (const eq of ejemplos) {
    console.log(`   ${eq.nombre.padEnd(15)} (${eq.tipo.padEnd(12)}) - ${eq.id}`);
  }

  console.log();
  db.close();

  console.log('=' .repeat(70));
  console.log('✅ ¡NOMBRES APLICADOS CORRECTAMENTE!');
  console.log('=' .repeat(70));
  console.log();
  console.log('📝 Próximos pasos:');
  console.log('   1. Reinicia iniciar_servidor.bat');
  console.log('   2. Abre http://localhost:3335');
  console.log('   3. Presiona Ctrl+F5');
  console.log('   4. Ve a Inventario y verifica\n');

} catch (err) {
  console.error('\n❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
}
