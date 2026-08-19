#!/usr/bin/env node
/**
 * Actualizador correcto de nombres de equipos
 * Usa la columna "Nom. Equipo" del Excel como ID
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'activos.db');
const seedPath = path.join(__dirname, 'seed.json');

console.log('\n🔄 Iniciando actualización CORRECTA de nombres...\n');

try {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Base de datos no encontrada: ${dbPath}`);
  }

  console.log(`📊 BD: ${dbPath}\n`);

  const db = new DatabaseSync(dbPath);
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

  console.log(`📦 Equipos en seed: ${seedData.equipos.length}\n`);

  // Mapeo: serie -> nombre (del Excel)
  const serieToNombre = {};

  // Equipos con nombre en el Excel (columna Nom. Equipo)
  const nombresExcel = [
    { serie: 'MP2LFYPM', nombre: 'LPT-031' },
    { serie: 'PF2ERB93', nombre: 'LPT-023' },
    { serie: 'PF3K83N9', nombre: 'LPT-009' },
    { serie: 'PF42F6EH', nombre: 'LPT-017' },
    { serie: '8CG938MBXL', nombre: 'LPT-013' },
    { serie: 'PF3JFYW7', nombre: 'LPT-064' },
    { serie: 'PF5AQL45', nombre: 'LPT-053' },
    { serie: '5CG7125ZHP', nombre: 'LPT-012' },
    { serie: 'PF2ERC56', nombre: 'AXPA-DOC02' },
    { serie: 'CND7030NW3', nombre: 'NOTEBOOK' },
    { serie: 'PF38HZBA', nombre: 'LPT-003' },
    { serie: '5CD00704JS', nombre: 'AXLI-OPER06' },
    { serie: 'PF36D6PD', nombre: 'AXLIM-OPER09' },
    { serie: 'PF38J7R0', nombre: 'AXLI-OPER07' },
    { serie: '5CD1298MDD', nombre: 'AXLI-LEG01' },
    { serie: 'LR0EW8TD', nombre: 'AXPA-DOC03' }
  ];

  console.log(`📋 Actualizando ${nombresExcel.length} equipos del Excel...\n`);

  let actualizados = 0;
  for (const item of nombresExcel) {
    try {
      db.exec(`UPDATE equipos SET nombre = '${item.nombre}' WHERE serie = '${item.serie}'`);
      console.log(`   ✅ ${item.nombre}`);
      actualizados++;
    } catch (err) {
      console.log(`   ⚠️  Error: ${item.nombre}`);
    }
  }

  console.log(`\n✅ Actualizados: ${actualizados}/${nombresExcel.length}`);

  // Generar nombres automáticos para los demás
  console.log(`\n🔨 Generando nombres automáticos para equipos sin nombre...\n`);
  db.exec(`UPDATE equipos SET nombre = 'Equipo-' || id WHERE nombre IS NULL OR nombre = ''`);

  // Verificar
  const total = db.prepare('SELECT COUNT(*) as count FROM equipos').get().count;
  const conNombre = db.prepare("SELECT COUNT(*) as count FROM equipos WHERE nombre IS NOT NULL AND nombre != ''").get().count;

  console.log(`✅ Total equipos: ${total}`);
  console.log(`✅ Con nombre: ${conNombre}`);
  console.log(`✅ Sin nombre: ${total - conNombre}\n`);

  db.close();

  console.log(`🎉 ¡Actualización completada!\n`);
  console.log(`📝 Próximos pasos:`);
  console.log(`   1. Reinicia iniciar_servidor.bat`);
  console.log(`   2. Recarga el navegador (Ctrl+F5)`);
  console.log(`   3. Ve a Inventario\n`);

} catch (err) {
  console.error(`\n❌ Error:`, err.message);
  process.exit(1);
}
