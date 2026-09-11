const fs = require('fs');
const path = require('path');
const https = require('https');

async function importToVercel() {
  try {
    const filePath = path.join(__dirname, 'export-backup.json');

    if (!fs.existsSync(filePath)) {
      console.error('❌ No se encontró export-backup.json. Ejecuta primero: node export-for-import.js');
      process.exit(1);
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(data);

    console.log('\n📤 IMPORTANDO A VERCEL...\n');
    console.log(`Equipos: ${jsonData.equipos.length}`);
    console.log(`Trabajadores: ${jsonData.trabajadores.length}`);
    console.log(`Movimientos: ${jsonData.movimientos.length}`);
    console.log(`Movimiento items: ${jsonData.movimiento_items.length}`);

    // Realizar POST a Vercel
    const vercelUrl = 'https://gestion-activos-ti.vercel.app/api/admin/import-data';

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 30000
    };

    console.log(`\n🔗 Enviando a: ${vercelUrl}`);
    console.log('⏳ Por favor espera...\n');

    await new Promise((resolve, reject) => {
      const req = https.request(vercelUrl, options, (res) => {
        let responseData = '';

        res.on('data', chunk => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(responseData);

            if (res.statusCode === 200 || res.statusCode === 201) {
              console.log('✅ IMPORTACIÓN EXITOSA!\n');
              console.log('Respuesta:', response);
            } else {
              console.log(`⚠️ Respuesta (${res.statusCode}):`, response);
            }
            resolve();
          } catch (e) {
            console.log(`Respuesta raw (${res.statusCode}):`, responseData.substring(0, 200));
            resolve();
          }
        });
      });

      req.on('error', (err) => {
        console.error('❌ Error en solicitud:', err.message);
        reject(err);
      });

      req.on('timeout', () => {
        console.error('❌ Timeout (30s). Vercel está tardío. Intenta manualmente.');
        req.destroy();
        resolve();
      });

      req.write(data);
      req.end();
    });

    console.log('\n✅ COMPLETADO - Vercel debería estar restaurado con todos los datos.\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

importToVercel();
