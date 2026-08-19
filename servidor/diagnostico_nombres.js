#!/usr/bin/env node
/**
 * DIAGNÓSTICO EXHAUSTIVO DEL PROBLEMA DE NOMBRES
 * Investiga por qué la columna nombre está vacía
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'activos.db');
const seedPath = path.join(__dirname, 'seed.json');

console.log('\n' + '='.repeat(80));
console.log('  DIAGNÓSTICO EXHAUSTIVO - PROBLEMA DE NOMBRES VACÍOS');
console.log('='.repeat(80) + '\n');

try {
  const db = new DatabaseSync(dbPath);

  // 1. VERIFICAR ESTRUCTURA DE LA TABLA
  console.log('1️⃣  VERIFICAR ESTRUCTURA DE LA TABLA EQUIPOS\n');
  const cols = db.prepare("PRAGMA table_info(equipos)").all();
  console.log('Columnas en tabla equipos:');
  for (const col of cols) {
    const marker = col.name === 'nombre' ? ' ← COLUMNA NOMBRE' : '';
    console.log(`   ${col.name.padEnd(20)} (${col.type})${marker}`);
  }
  console.log();

  // 2. VERIFICAR DATOS EN LA BD
  console.log('2️⃣  VERIFICAR DATOS EN LA BASE DE DATOS\n');

  const total = db.prepare('SELECT COUNT(*) as c FROM equipos').get().c;
  console.log(`Total de equipos: ${total}\n`);

  // Ver primeros 10 equipos
  console.log('Primeros 10 equipos (sin nombre):');
  const equipos = db.prepare(`
    SELECT id, serie, tipo, nombre FROM equipos LIMIT 10
  `).all();

  for (const eq of equipos) {
    console.log(`   ID: ${eq.id.padEnd(10)} | Serie: ${(eq.serie||'NULL').padEnd(20)} | Tipo: ${eq.tipo.padEnd(12)} | Nombre: "${eq.nombre||'NULL'}"`);
  }
  console.log();

  // 3. VERIFICAR SI HAY ALGÚN NOMBRE EN LA BD
  console.log('3️⃣  VERIFICAR SI EXISTEN NOMBRES EN LA BD\n');

  const conNombre = db.prepare("SELECT COUNT(*) as c FROM equipos WHERE nombre IS NOT NULL AND nombre != ''").get().c;
  const sinNombre = total - conNombre;

  console.log(`Equipos con nombre: ${conNombre}`);
  console.log(`Equipos sin nombre: ${sinNombre}\n`);

  if (conNombre > 0) {
    console.log('Ejemplos de equipos CON nombre:');
    const conNombres = db.prepare(`
      SELECT id, serie, nombre FROM equipos
      WHERE nombre IS NOT NULL AND nombre != ''
      LIMIT 5
    `).all();
    for (const eq of conNombres) {
      console.log(`   ${eq.id} → ${eq.nombre}`);
    }
    console.log();
  }

  // 4. VERIFICAR SEED.JSON
  console.log('4️⃣  VERIFICAR CONTENIDO DE SEED.JSON\n');

  if (fs.existsSync(seedPath)) {
    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    console.log(`Total equipos en seed.json: ${seed.equipos.length}\n`);

    console.log('Primeros 5 equipos del seed.json:');
    for (let i = 0; i < 5 && i < seed.equipos.length; i++) {
      const eq = seed.equipos[i];
      console.log(`   ID: ${eq.id.padEnd(10)} | Nombre: "${eq.nombre || 'NULL'}" | Serie: ${eq.serie || 'NULL'}`);
    }
    console.log();

    // Contar nombres en seed
    const seedConNombre = seed.equipos.filter(e => e.nombre && !e.nombre.startsWith('Equipo-')).length;
    console.log(`Equipos con nombre real en seed: ${seedConNombre}\n`);
  } else {
    console.log('❌ seed.json NO ENCONTRADO\n');
  }

  // 5. VERIFICAR EQUIPOS POR SERIE ESPECÍFICA
  console.log('5️⃣  PROBAR BÚSQUEDA POR SERIE (Ejemplo: PF547SVS = LPT-040)\n');

  const pruebaEquipo = db.prepare(`
    SELECT id, serie, tipo, nombre FROM equipos WHERE serie = ?
  `).get('PF547SVS');

  if (pruebaEquipo) {
    console.log('Equipo encontrado:');
    console.log(`   ID: ${pruebaEquipo.id}`);
    console.log(`   Serie: ${pruebaEquipo.serie}`);
    console.log(`   Tipo: ${pruebaEquipo.tipo}`);
    console.log(`   Nombre en BD: "${pruebaEquipo.nombre || 'NULL'}"`);
    console.log(`   ✅ Esperado: LPT-040\n`);
  } else {
    console.log('❌ Equipo con serie PF547SVS NO ENCONTRADO en BD\n');
  }

  // 6. VERIFICAR SI EL UPDATE FUNCIONARÍA
  console.log('6️⃣  PRUEBA DE UPDATE (sin confirmar)\n');

  // Hacer un test update en un equipo específico
  const testEquipo = db.prepare('SELECT id FROM equipos LIMIT 1').get();
  if (testEquipo) {
    console.log(`Intentando actualizar equipo: ${testEquipo.id}`);
    console.log(`Comando: UPDATE equipos SET nombre = 'TEST-001' WHERE id = '${testEquipo.id}'`);

    const stmt = db.prepare('UPDATE equipos SET nombre = ? WHERE id = ?');
    const result = stmt.run('TEST-001', testEquipo.id);

    console.log(`Filas afectadas: ${result.changes}`);

    if (result.changes > 0) {
      console.log('✅ UPDATE FUNCIONA CORRECTAMENTE\n');

      // Verificar que se guardó
      const verificado = db.prepare('SELECT nombre FROM equipos WHERE id = ?').get(testEquipo.id);
      console.log(`Valor guardado en BD: "${verificado.nombre}"\n`);

      // Revertir cambio
      db.prepare('UPDATE equipos SET nombre = NULL WHERE id = ?').run(testEquipo.id);
    } else {
      console.log('❌ UPDATE NO AFECTÓ NINGUNA FILA\n');
    }
  }

  db.close();

  console.log('=' .repeat(80));
  console.log('📋 RESUMEN DE DIAGNÓSTICO\n');
  console.log('Verificar:');
  console.log('  1. ¿Existe la columna nombre? (debería estar en PRAGMA)');
  console.log('  2. ¿Hay equipos en la BD?');
  console.log('  3. ¿Hay nombres en seed.json o están vacíos?');
  console.log('  4. ¿Se puede actualizar con UPDATE?');
  console.log('  5. ¿Las series coinciden entre lo que buscamos y lo que hay?\n');

} catch (err) {
  console.error('\n❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
}
