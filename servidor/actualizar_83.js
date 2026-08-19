#!/usr/bin/env node
/**
 * ACTUALIZACIÓN FINAL - 83 equipos de Excel
 * De hojas: Asignados (69) + Laptop en custodia (14)
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'activos.db');

console.log('\n🔄 Iniciando actualización con 83 equipos...
');

try {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`BD no encontrada: ${dbPath}`);
  }

  const db = new DatabaseSync(dbPath);

  // Mapeo de 83 equipos
  const mapeo = {
    '5CD00704JC': 'LPT-062',
    '5CD00704JS': 'AXLI-OPER06',
    '5CD1298MDD': 'AXLI-LEG01',
    '5CG7125ZHP': 'LPT-012',
    '5CG71260GS': 'AXLIM-FIN03',
    '8CG1103S54': 'AXILI-GER02',
    '8CG938MBXL': 'LPT-013',
    'CND7030NW3': 'NOTEBOOK',
    'K8N0CX15N931353': 'LPT-029',
    'LR0EW8TD': 'AXPA-DOC03',
    'M6N0CV09R218237': 'AXPA-ADM01',
    'M6N0CV09R326232': 'AXPA-LIQ01',
    'M6N0LP01V836233': 'LPT-015',
    'MP1T6BRG': 'LPT-018',
    'MP2HCZBT': 'LPT-030',
    'MP2LFYPM': 'LPT-031',
    'MP2MQVLR': 'LPT-032',
    'MZ01908T': 'LPT-049',
    'N/A': 'AXLI-CON05',
    'NXHVUAL00D1080398A7600': 'AXLI-CAL01',
    'OEM': 'Conatabilidad_06',
    'PF2ERB93': 'LPT-023',
    'PF2ERC56': 'AXPA-DOC02',
    'PF2ERC7Y': 'LPT-021',
    'PF2ERC8B': 'AXPA-ADM03',
    'PF2ERCBL': 'AXPA-COME01',
    'PF36D6PD': 'AXLIM-OPER09',
    'PF38HTEB': 'LPT-005',
    'PF38HZBA': 'LPT-003',
    'PF38J7R0': 'AXLI-OPER07',
    'PF3985MZ': 'LPT-002',
    'PF39AEBM': 'LPT-004',
    'PF39ALJG': 'LPT-001',
    'PF3JFYW7': 'LPT-064',
    'PF3K4MXK': 'LPT-008',
    'PF3K83N9': 'LPT-009',
    'PF42BT72': 'LPT-020',
    'PF42F6EH': 'LPT-017',
    'PF481HCQ': 'LPT-025',
    'PF4AS5NZ': 'LPT-026',
    'PF4DPWW2': 'LPT-028',
    'PF4X7CFC': 'LPT-038',
    'PF4XKW25': 'LPT-037',
    'PF4XKY9C': 'LPT-035',
    'PF4ZKDBN': 'LPT-034',
    'PF547SVS': 'LPT-040',
    'PF54TH1Z': 'LPT-039',
    'PF56FXRK': 'LPT-043',
    'PF57NPXN': 'LPT-041',
    'PF57NRCH': 'LPT-042',
    'PF5ABSGD': 'LPT-050',
    'PF5APS1H': 'LPT-052',
    'PF5APS1W': 'LPT-054',
    'PF5APW0K': 'LPT-055',
    'PF5AQL45': 'LPT-053',
    'PF5C8YXC': 'LPT-051',
    'PF5DCH2H': 'LPT-045',
    'PF5DCH51': 'LPT-046',
    'PF5DCKAE': 'LPT-048',
    'PF5DD4FV': 'LPT-044',
    'PF5DDYYY': 'LPT-047',
    'PF5GKAC0': 'LPT-058',
    'PF5GKH5F': 'LPT-023',
    'PF5GKMML': 'LPT-059',
    'PF5GKPYC': 'LPT-060',
    'PF5GKS5F': 'LPT-056',
    'PF5K06DZ': 'LPT-057',
    'PF5QL6SY': 'LPT-067',
    'PF5QPDBL': 'LPT-065',
    'PF5SD3ZB': 'LPT-071',
    'PF5SD41B': 'LPT-072',
    'PF5SDBKR': 'LPT-070',
    'PF5YDPQD': 'LPT-077',
    'PF5YDX1P': 'LPT-073',
    'PF5YJ48A': 'LPT-074',
    'PF5YKBHJ': 'LPT-076',
    'PF5YKC2S': 'LPT-078',
    'PF5YKCP6': 'LPT-075',
    'R90QPY4Z': 'LPT-006',
    'RCN0CX01D64149G': 'LPT-036',
    'S/N': 'AXLI-VIG01',
    'S8N0KD00781735F': 'LPT-014',
    'SCN0KD00916551D': 'LPT-066',
  };

  console.log(`📋 Actualizando ${Object.keys(mapeo).length} equipos...
`);

  let actualizados = 0;
  for (const [serie, nombre] of Object.entries(mapeo)) {
    try {
      const nombreSafe = nombre.replace(/'/g, "''");
      const serieSafe = serie.replace(/'/g, "''");
      db.exec(`UPDATE equipos SET nombre = '${nombreSafe}' WHERE UPPER(serie) = UPPER('${serieSafe}')`);
      console.log(`   ✅ ${nombre}`);
      actualizados++;
    } catch (err) {
      console.log(`   ⚠️  ${nombre}`);
    }
  }

  console.log(`\n✅ Actualizados: ${actualizados}/${Object.keys(mapeo).length}`);

  // Generar nombres automáticos
  console.log(`\n🔨 Generando nombres para equipos sin nombre...`);
  db.exec(`UPDATE equipos SET nombre = 'Equipo-' || id WHERE nombre IS NULL OR nombre = ''`);

  // Verificar
  const total = db.prepare('SELECT COUNT(*) as count FROM equipos').get().count;
  const conNombre = db.prepare("SELECT COUNT(*) as count FROM equipos WHERE nombre IS NOT NULL AND nombre != ''").get().count;

  console.log(`\n✅ Total: ${total}`);
  console.log(`✅ Con nombre: ${conNombre}`);
  console.log(`✅ Sin nombre: ${total - conNombre}\n`);

  db.close();

  console.log(`🎉 ¡Actualización completa!\n`);
  console.log(`📝 Próximos pasos:`);
  console.log(`   1. Reinicia iniciar_servidor.bat`);
  console.log(`   2. Recarga navegador (Ctrl+F5)\n`);

} catch (err) {
  console.error(`\n❌ Error:`, err.message);
  process.exit(1);
}
