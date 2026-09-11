const DatabaseFactory = require('./db-factory.js');

async function testUpdate() {
  try {
    process.env.MONGODB_URI = undefined;
    process.env.NODE_ENV = 'local';

    const db = await DatabaseFactory.init();

    console.log('\n1️⃣  ESTADO ANTES:');
    let record = await db.prepare(`
      SELECT nombre, dni FROM trabajadores
      WHERE LOWER(nombre) = LOWER('MARIA NATALY MONTERO SERNAQUE')
    `).all();
    console.log('  Registros encontrados:', record.length);
    record.forEach(r => console.log(`    - ${r.nombre} | DNI: "${r.dni}"`));

    console.log('\n2️⃣  EJECUTANDO UPDATE...');
    const result = await db.prepare(`
      UPDATE trabajadores
      SET dni = ?
      WHERE LOWER(nombre) = LOWER(?)
    `).run('77227447', 'MARIA NATALY MONTERO SERNAQUE');

    console.log('  Resultado UPDATE:', result);

    console.log('\n3️⃣  ESTADO DESPUÉS:');
    record = await db.prepare(`
      SELECT nombre, dni FROM trabajadores
      WHERE LOWER(nombre) = LOWER('MARIA NATALY MONTERO SERNAQUE')
    `).all();
    console.log('  Registros encontrados:', record.length);
    record.forEach(r => console.log(`    - ${r.nombre} | DNI: "${r.dni}"`));

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testUpdate();
