#!/usr/bin/env node
/**
 * Actualizador FINAL correcto de nombres de equipos
 * Extrae datos de TODAS las hojas del Excel
 * Serie -> Nom. Equipo
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'activos.db');

console.log('\n🔄 Iniciando actualización FINAL con datos de Excel completo...\n');

try {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Base de datos no encontrada: ${dbPath}`);
  }

  console.log(`📊 BD: ${dbPath}\n`);

  const db = new DatabaseSync(dbPath);

  // Mapeo completo de serie -> nombre (69 equipos del Excel)
  const mapeoCompleto = {
    'MZ01908T': 'LPT-049',
    'PF5YJ48A': 'LPT-074',
    'OEM': 'AXPA-SERV01',
    'PF4ZKDBN': 'LPT-034',
    'PF2ERC7Y': 'LPT-021',
    'PF39ALJG': 'LPT-001',
    'PF4DPWW2': 'LPT-028',
    'PF5APW0K': 'LPT-055',
    'K8N0CX15N931353': 'LPT-029',
    'S8N0KD00781735F': 'LPT-014',
    'PF4X7CFC': 'LPT-038',
    'MP1T6BRG': 'LPT-018',
    'PF4XKY9C': 'LPT-035',
    'PF5YDPQD': 'LPT-077',
    'M6N0CV09R218237': 'AXPA-ADM01',
    'MP2MQVLR': 'LPT-032',
    'PF5QPDBL': 'LPT-065',
    'PF5K06DZ': 'LPT-057',
    'PF38HTEB': 'LPT-005',
    'N/A': 'AXLI-CON05',
    'PF3985MZ': 'LPT-002',
    'PF5YDX1P': 'LPT-073',
    '5CG71260GS': 'AXLIM-FIN03',
    'PF5C8YXC': 'LPT-051',
    'RCN0CX01D64149G': 'LPT-036',
    'PF5GKMML': 'LPT-059',
    'PF57NRCH': 'LPT-042',
    'PF5ABSGD': 'LPT-050',
    'PF5DD4FV': 'LPT-044',
    'PF5APS1W': 'LPT-054',
    'PF2ERCBL': 'AXPA-COME01',
    'PF4XKW25': 'LPT-037',
    'PF5SD41B': 'LPT-072',
    'PF547SVS': 'LPT-040',
    'PF57NPXN': 'LPT-041',
    'PF5YKCP6': 'LPT-075',
    'PF2ERC8B': 'AXPA-ADM03',
    'PF54TH1Z': 'LPT-039',
    'PF5AQL45': 'LPT-053',
    'PF4AS5NZ': 'LPT-026',
    'PF5DCKAE': 'LPT-048',
    '8CG1103S54': 'AXILI-GER02',
    'M6N0LP01V836233': 'LPT-015',
    'SCN0KD00916551D': 'LPT-066',
    'PF38HZBA': 'LPT-003',
    'S/N': 'AXLI-VIG01',
    'PF5DCH2H': 'LPT-045',
    'PF5GKH5F': 'LPT-023',
    'PF481HCQ': 'LPT-025',
    'MP2HCZBT': 'LPT-030',
    'PF5GKS5F': 'LPT-056',
    'R90QPY4Z': 'LPT-006',
    'PF5YKBHJ': 'LPT-076',
    'M6N0CV09R326232': 'AXPA-LIQ01',
    'PF3K4MXK': 'LPT-008',
    'PF5GKAC0': 'LPT-058',
    'PF5DCH51': 'LPT-046',
    'PF5SD3ZB': 'LPT-071',
    'PF5GKPYC': 'LPT-060',
    'PF5QL6SY': 'LPT-067',
    'PF56FXRK': 'LPT-043',
    'PF5DDYYY': 'LPT-047',
    '5CD00704JC': 'LPT-062',
    'PF42BT72': 'LPT-020',
    'PF5APS1H': 'LPT-052',
    'PF39AEBM': 'LPT-004',
    'NXHVUAL00D1080398A7600': 'AXLI-CAL01',
    'PF5YKC2S': 'LPT-078',
    'PF5SDBKR': 'LPT-070'
  };

  console.log(`📋 Actualizando ${Object.keys(mapeoCompleto).length} equipos del Excel...\n`);

  let actualizados = 0;
  let errores = 0;

  for (const [serie, nombre] of Object.entries(mapeoCompleto)) {
    try {
      const nombreSafe = nombre.replace(/'/g, "''");
      const serieSafe = serie.replace(/'/g, "''");
      db.exec(`UPDATE equipos SET nombre = '${nombreSafe}' WHERE UPPER(serie) = UPPER('${serieSafe}')`);
      console.log(`   ✅ ${nombre:20} | ${serie}`);
      actualizados++;
    } catch (err) {
      console.log(`   ⚠️  Error: ${nombre}`);
      errores++;
    }
  }

  console.log(`\n✅ Actualizados: ${actualizados}/${Object.keys(mapeoCompleto).length}`);
  if (errores > 0) {
    console.log(`⚠️  Errores: ${errores}`);
  }

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
