#!/usr/bin/env node
/**
 * ACTUALIZAR NOMBRES DIRECTAMENTE EN LA BD
 * Mapea por número de serie (como hicimos antes)
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'activos.db');

console.log('\n' + '='.repeat(70));
console.log('  ACTUALIZAR NOMBRES DIRECTAMENTE EN BD');
console.log('='.repeat(70) + '\n');

try {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`BD no encontrada: ${dbPath}`);
  }

  const db = new DatabaseSync(dbPath);

  // Mapeo de serie -> nombre (179 equipos)
  const mapeoConocidos = {
    '3350P602970': 'IMP-001',
    '3350P603051': 'IMP-010',
    '354648963001514': 'CEL-072',
    '356228321561133': 'CEL-016',
    '356263631218355/01': 'CEL-051',
    '356263631221961': 'CEL-009',
    '534541593031303810': 'IMP-007',
    '5CD00704JC': 'LPT-062',
    '5CD00704JS': 'AXLI-OPER06',
    '5CD1298MDD': 'AXLI-LEG01',
    '5CG7125ZHP': 'LPT-012',
    '5CG71260GS': 'AXLIM-FIN03',
    '701930310FN1X': 'IMP-005',
    '701933230H3WK': 'IMP-004',
    '860223064413203': 'CEL-059',
    '860319070466787': 'CEL-026',
    '860319072855102': 'CEL-078',
    '860380070100198': 'CEL-004',
    '860688076881847': 'CEL-003',
    '860688076881888': 'CEL-040',
    '860820073242968': 'CEL-014',
    '862053070357195': 'CEL-033',
    '862058076851646': 'CEL-042',
    '862058076873889': 'CEL-081',
    '862058076996565': 'CEL-039',
    '862374070905225': 'CEL-045',
    '862374070905829': 'CEL-019',
    '862374070908427': 'CEL-041',
    '862374070910944': 'CEL-015',
    '862374070914607': 'CEL-020',
    '862374071325746': 'CEL-008',
    '862374071333948': 'CEL-077',
    '862374071708164': 'CEL-007',
    '862378070869588': 'CEL-036',
    '862378070879181': 'CEL-076',
    '862378070879868/11': 'CEL-022',
    '862378074793321': 'CEL-001',
    '862844074577725': 'CEL-037',
    '862844074581560': 'CEL-074',
    '862844074605468': 'CEL-060',
    '862844074607787': 'CEL-029',
    '862844074613561': 'CEL-034',
    '862844074873405': 'CEL-012',
    '862844076098464': 'CEL-028',
    '862844076415783/05': 'CEL-053',
    '862844076418027': 'CEL-061',
    '862844076420262': 'CEL-023',
    '862844076436045': 'CEL-027',
    '862844076924602': 'CEL-046',
    '86379060209425': 'CEL-025',
    '864469067939308': 'CEL-021',
    '865201071403602': 'CEL-010',
    '865201071406027': 'CEL-071',
    '865201071569667': 'CEL-044',
    '865201071577165': 'CEL-058',
    '865201071599268': 'CEL-035',
    '865201071629743': 'CEL-006',
    '865201072597303': 'CEL-030',
    '865201072671066': 'CEL-069',
    '865201072706763': 'CEL-054',
    '865201072751686': 'CEL-032',
    '865346076997882': 'CEL-056',
    '865346077001122': 'CEL-031',
    '865346077021203': 'CEL-073',
    '865346077034107': 'CEL-082',
    '865346077044262': 'CEL-065',
    '865991075054548': 'CEL-064',
    '867274075963341': 'CEL-048',
    '86836906956988': 'CEL-079',
    '868379060231924': 'CEL-013',
    '869244070937028': 'CEL-017',
    '869244070962083': 'CEL-067',
    '869244071001246': 'CEL-055',
    '869244071071462': 'CEL-002',
    '869244071241347': 'CEL-011',
    '869244071263820': 'CEL-068',
    '869244079906263': 'CEL-052',
    '869341078036462': 'CEL-024',
    '869341078092564': 'CEL-063',
    '86944071151504/01': 'CEL-080',
    '869912060317704': 'CEL-018',
    '86991206128543': 'CEL-075',
    '869912061740425': 'CEL-066',
    '869912062772526': 'CEL-005',
    '869912063349746': 'CEL-050',
    '869912063449140': 'CEL-043',
    '8CG1103S54': 'AXILI-GER02',
    '8CG938MBXL': 'LPT-013',
    'CND7030NW3': 'NOTEBOOK',
    'GG7G42PNQ16Q': 'CEL-062',
    'K8N0CX15N931353': 'LPT-029',
    'LR0EW8TD': 'AXPA-DOC03',
    'M6N0CV09R218237': 'AXPA-ADM01',
    'M6N0CV09R326232': 'AXPA-LIQ01',
    'M6N0LP01V836233': 'LPT-015',
    'MCN0CX335355523': 'LPT-081',
    'MP1T6BRG': 'LPT-018',
    'MP2HCZBT': 'LPT-030',
    'MP2LFYPM': 'LPT-031',
    'MP2MQVLR': 'LPT-032',
    'MZ01908T': 'LPT-049',
    'N/A': 'CEL-070',
    'NXHSLAL00H034095FD7600': 'LPT-080',
    'NXHVUAL00D1080398A7600': 'AXLI-CAL01',
    'OEM': 'Contabilidad_06',
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
    'PF5QCF60': 'LPT-079',
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
    'RK16NPZPR1A': 'IMP-009',
    'S/N': 'AXLI-VIG01',
    'S8N0KD00781735F': 'LPT-014',
    'SCN0KD00916551D': 'LPT-066',
    'UKTY000580': 'IMP-006',
    'X2P6252519': 'IMP-002',
    'X3B2013197': 'IMP-003',
    'XBFS021269': 'IMP-011',
    'YJ38X04PR1A': 'IMP-008',
    'MOUSE-EDI-001': 'MOU-001',
    'MOUSE-MID-001': 'MOU-002',
    'MOUSE-EDD-001': 'MOU-003',
    'MOUSE-YES-001': 'MOU-004',
    'MOUSE-SPARE-001': 'MOU-005',
  };

  console.log(`🔄 PASO 1: Aplicando ${Object.keys(mapeoConocidos).length} nombres por serie\n`);

  let actualizados = 0;
  let noEncontrados = 0;

  const updateStmt = db.prepare('UPDATE equipos SET nombre = ? WHERE serie = ?');

  for (const [serie, nombre] of Object.entries(mapeoConocidos)) {
    const result = updateStmt.run(nombre, serie);
    if (result.changes > 0) {
      actualizados++;
      console.log(`   ✅ ${serie.padEnd(25)} → ${nombre}`);
    } else {
      noEncontrados++;
    }
  }

  console.log(`\n✅ Actualizados: ${actualizados}`);
  console.log(`⚠️  No encontrados: ${noEncontrados}\n`);

  // Paso 2: Auto-generar para los que falten
  console.log('🔨 PASO 2: Auto-generando nombres para equipos faltantes\n');

  const correlatives = {
    'LPT': 82,
    'CEL': 106,
    'IMP': 12,
    'ACC': 7,
    'SCA': 1,
    'DES': 1,
    'MOU': 5
  };

  const equiposSinNombre = db.prepare(`
    SELECT id, tipo FROM equipos
    WHERE nombre IS NULL OR nombre = ''
    ORDER BY tipo, id
  `).all();

  console.log(`   Encontrados ${equiposSinNombre.length} equipos sin nombre\n`);

  for (const eq of equiposSinNombre) {
    let prefijo = 'EQ';
    if (eq.tipo === 'Celular') prefijo = 'CEL';
    else if (eq.tipo === 'Laptop') prefijo = 'LPT';
    else if (eq.tipo === 'Impresora') prefijo = 'IMP';
    else if (eq.tipo === 'Accesorio') prefijo = 'ACC';
    else if (eq.tipo === 'Escaner' || eq.tipo === 'ESCANER') prefijo = 'SCA';
    else if (eq.tipo === 'PC' || eq.tipo === 'Desktop') prefijo = 'DES';
    else if (eq.tipo === 'Mouse' || eq.tipo === 'MOUSE') prefijo = 'MOU';

    const numero = correlatives[prefijo] || 1;
    const nuevoNombre = `${prefijo}-${String(numero).padStart(3, '0')}`;

    db.prepare('UPDATE equipos SET nombre = ? WHERE id = ?').run(nuevoNombre, eq.id);
    console.log(`   ✅ ${eq.id} (${eq.tipo}) → ${nuevoNombre}`);

    correlatives[prefijo] = (correlatives[prefijo] || 0) + 1;
  }

  console.log();

  // Verificación final
  console.log('✅ VERIFICACIÓN FINAL\n');

  const total = db.prepare('SELECT COUNT(*) as c FROM equipos').get().c;
  const conNombre = db.prepare("SELECT COUNT(*) as c FROM equipos WHERE nombre IS NOT NULL AND nombre != ''").get().c;
  const sinNombre = total - conNombre;

  console.log(`Total equipos: ${total}`);
  console.log(`Con nombre: ${conNombre}`);
  console.log(`Sin nombre: ${sinNombre}\n`);

  // Resumen por prefijo
  const prefijos = ['LPT', 'CEL', 'IMP', 'ACC', 'SCA', 'DES', 'MOU'];
  console.log('📊 Equipos por prefijo:');
  for (const prefijo of prefijos) {
    const count = db.prepare(`SELECT COUNT(*) as c FROM equipos WHERE nombre LIKE ?`).get(prefijo + '%').c;
    if (count > 0) {
      console.log(`   ${prefijo}: ${count}`);
    }
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
  console.log('   4. Ve a Inventario\n');

} catch (err) {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
}
