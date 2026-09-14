const DatabaseFactory = require('./db-factory.js');
const https = require('https');

async function checkUserInVercel() {
  try {
    // Necesita MONGODB_URI de Vercel
    if (!process.env.MONGODB_URI) {
      console.log('❌ MONGODB_URI no está definida');
      console.log('Para usar este script en LOCAL contra Vercel, necesitarías el connection string de MongoDB');
      console.log('\nAlternativa: Crear un endpoint en el servidor para consultar');
      return;
    }

    const db = await DatabaseFactory.init();

    const nombre = 'ANDRE MANTA BARRERA';
    console.log(`\n🔍 Buscando usuario: "${nombre}"\n`);

    const user = await db.prepare('SELECT * FROM trabajadores WHERE LOWER(nombre) = LOWER(?)').get(nombre);

    if (user) {
      console.log('✓ ENCONTRADO:');
      console.log(`  Nombre: ${user.nombre}`);
      console.log(`  ID: ${user.id}`);
      console.log(`  DNI: ${user.dni || '(sin DNI)'}`);
      console.log(`  Área: ${user.area || '(sin área)'}`);
      console.log(`  Sede: ${user.sede || '(sin sede)'}`);
      console.log(`  Activo: ${user.activo ? 'Sí' : 'No'}`);
    } else {
      console.log('✗ NO ENCONTRADO');
    }

    // Buscar similares
    console.log('\n🔍 Buscando usuarios similares con "ANDRE" en el nombre...');
    const similares = await db.prepare('SELECT * FROM trabajadores WHERE nombre LIKE ? ORDER BY nombre LIMIT 10').all('%ANDRE%');

    if (similares.length > 0) {
      console.log(`\n✓ Encontrados ${similares.length} usuarios:\n`);
      similares.forEach((u, i) => {
        console.log(`${i+1}. ${u.nombre}`);
        console.log(`   ID: ${u.id}, DNI: ${u.dni || '(sin DNI)'}`);
      });
    } else {
      console.log('No se encontraron similares');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkUserInVercel();
