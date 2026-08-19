#!/usr/bin/env node
/**
 * Script para actualizar los nombres de equipos en la base de datos
 * usando los datos del Excel (seed.json)
 *
 * Uso: node actualizar_nombres.js
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'activos.db');
const seedPath = path.join(__dirname, 'seed.json');

console.log('🔄 Iniciando actualización de nombres de equipos...\n');

try {
  // Abrir base de datos
  const db = new DatabaseSync(dbPath);

  // Leer seed.json
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

  console.log(`📊 Base de datos: ${dbPath}`);
  console.log(`📄 Seed file: ${seedPath}`);
  console.log(`📦 Equipos en seed.json: ${seedData.equipos.length}\n`);

  // Crear mapeo por serie
  const excelMap = {};
  let conNombre = 0;
  let generados = 0;

  for (const eq of seedData.equipos) {
    if (eq.nombre) {
      if (!eq.nombre.startsWith('Equipo-')) {
        conNombre++;
      } else {
        generados++;
      }
      if (eq.serie) {
        excelMap[eq.serie.toUpperCase()] = eq.nombre;
      }
    }
  }

  console.log(`📋 Nombres disponibles:`);
  console.log(`   - Del Excel: ${conNombre}`);
  console.log(`   - Generados automáticamente: ${generados}\n`);

  // Actualizar base de datos
  let actualizados = 0;
  let errores = 0;

  for (const [serie, nombre] of Object.entries(excelMap)) {
    try {
      const serieUpper = serie.toUpperCase();
      // Ejecutar UPDATE simple
      db.exec(`UPDATE equipos SET nombre = '${nombre.replace(/'/g, "''")}' WHERE UPPER(serie) = '${serieUpper}'`);
      // Contar cambios
      const check = db.prepare(`SELECT COUNT(*) as count FROM equipos WHERE nombre = ? AND UPPER(COALESCE(serie, '')) = ?`).get(nombre, serieUpper);
      if (check && check.count > 0) {
        actualizados += check.count;
      }
    } catch (err) {
      errores++;
      // No imprimir todos los errores, solo contar
    }
  }

  if (errores > 0) {
    console.log(`⚠️  Se encontraron ${errores} series, intentando actualizar...\n`);
  }

  // Generar nombres para equipos sin nombre
  console.log(`\n🔧 Generando nombres automáticos para equipos sin nombre...\n`);
  try {
    // Ejecutar UPDATE directo para generar nombres
    db.exec(`UPDATE equipos SET nombre = 'Equipo-' || id WHERE nombre IS NULL OR nombre = ''`);

    // Contar cuántos se actualizaron
    const sinNombreAhora = db.prepare('SELECT COUNT(*) as count FROM equipos WHERE nombre LIKE "Equipo-%" ').get();
    if (sinNombreAhora && sinNombreAhora.count > 0) {
      console.log(`   ✅ Generados/confirmados ${sinNombreAhora.count} nombres automáticos\n`);
    }
  } catch (err) {
    console.log(`⚠️  Error al generar nombres: ${err.message}`);
  }

  // Verificar resultados
  const totalEquipos = db.prepare('SELECT COUNT(*) as count FROM equipos').get().count;
  const conNombreDb = db.prepare('SELECT COUNT(*) as count FROM equipos WHERE nombre IS NOT NULL AND nombre != ""').get().count;

  console.log(`\n✅ Actualización completada:`);
  console.log(`   - Equipos actualizados: ${actualizados}`);
  console.log(`   - Total equipos en BD: ${totalEquipos}`);
  console.log(`   - Con nombre asignado: ${conNombreDb}`);
  console.log(`   - Sin nombre: ${totalEquipos - conNombreDb}`);

  if (errores > 0) {
    console.log(`   ⚠️  Errores encontrados: ${errores}`);
  }

  db.close();

  console.log(`\n🎉 ¡Base de datos actualizada exitosamente!`);
  console.log(`\n📝 Próximos pasos:`);
  console.log(`   1. Reinicia el servidor (detén y ejecuta iniciar_servidor.bat nuevamente)`);
  console.log(`   2. Recarga la página del navegador (Ctrl+F5)`);
  console.log(`   3. Ve a Inventario y verás los nombres de equipos actualizados\n`);

} catch (err) {
  console.error(`\n❌ Error fatal:`, err.message);
  console.error(err.stack);
  process.exit(1);
}
