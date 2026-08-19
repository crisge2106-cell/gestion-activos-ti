#!/usr/bin/env node
/**
 * DIAGNÓSTICO COMPLETO
 * Identifica exactamente qué está pasando en la BD
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'activos.db');
const seedPath = path.join(__dirname, 'seed.json');

console.log('\n' + '='.repeat(70));
console.log('  DIAGNÓSTICO COMPLETO DEL PROBLEMA');
console.log('='.repeat(70) + '\n');

try {
  // =========================================================================
  // 1. Leer con DatabaseSync (lo que usa el servidor)
  // =========================================================================
  console.log('🔍 1. LECTURA CON DatabaseSync (node:sqlite)\n');

  const db = new DatabaseSync(dbPath);

  const result1 = db.prepare(`
    SELECT id, tipo, nombre FROM equipos
    WHERE id IN ('EQ-0001', 'EQ-0002', 'EQ-0003', 'EQ-0040', 'EQ-0048')
    ORDER BY id
  `).all();

  console.log('Resultados:');
  for (const eq of result1) {
    console.log(`   ${eq.id.padEnd(10)} (${eq.tipo.padEnd(12)}) → "${eq.nombre}"`);
    if (eq.nombre) {
      console.log(`      Longitud: ${eq.nombre.length} caracteres`);
      console.log(`      Bytes: ${Buffer.from(eq.nombre).toString('hex')}`);
    }
  }
  console.log();

  // =========================================================================
  // 2. Estadísticas de nombres
  // =========================================================================
  console.log('📊 2. ESTADÍSTICAS DE NOMBRES EN BD\n');

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(nombre) as con_nombre,
      SUM(LENGTH(nombre)) as longitud_total,
      MAX(LENGTH(nombre)) as longitud_max,
      MIN(LENGTH(nombre)) as longitud_min
    FROM equipos
  `).get();

  console.log(`Total equipos: ${stats.total}`);
  console.log(`Con nombre: ${stats.con_nombre}`);
  console.log(`Longitud promedio: ${(stats.longitud_total / stats.con_nombre).toFixed(1)} caracteres`);
  console.log(`Longitud máxima: ${stats.longitud_max} caracteres`);
  console.log(`Longitud mínima: ${stats.longitud_min} caracteres`);
  console.log();

  // =========================================================================
  // 3. Contar patrones de nombres
  // =========================================================================
  console.log('🔢 3. PATRONES DE NOMBRES\n');

  const patrones = [
    ['LPT-0%', 'LPT con 4 dígitos (LPT-0001)'],
    ['LPT-%', 'LPT con cualquier dígito'],
    ['CEL-0%', 'CEL con 4 dígitos (CEL-0001)'],
    ['CEL-%', 'CEL con cualquier dígito'],
    ['Equipo-%', 'Nombres genéricos'],
    ['EQP%', 'Nombres con prefijo EQP'],
  ];

  for (const [pattern, desc] of patrones) {
    const count = db.prepare(`SELECT COUNT(*) as c FROM equipos WHERE nombre LIKE ?`).get(pattern).c;
    console.log(`   ${desc.padEnd(40)}: ${count}`);
  }
  console.log();

  // =========================================================================
  // 4. Leer seed.json
  // =========================================================================
  console.log('📄 4. REVISIÓN DE seed.json\n');

  if (!fs.existsSync(seedPath)) {
    console.log('❌ seed.json no encontrado');
  } else {
    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    console.log(`Total equipos en seed: ${seed.equipos.length}`);

    // Mostrar primeros 5 nombres del seed
    console.log('\nPrimeros 5 nombres en seed.json:');
    for (let i = 0; i < 5 && i < seed.equipos.length; i++) {
      const eq = seed.equipos[i];
      console.log(`   ${eq.id.padEnd(10)} → "${eq.nombre}"`);
    }

    // Mostrar estadísticas del seed
    const conNombre = seed.equipos.filter(e => e.nombre).length;
    console.log(`\nEquipos con nombre en seed: ${conNombre}/${seed.equipos.length}`);

    if (conNombre > 0) {
      const nombres = seed.equipos.map(e => e.nombre).filter(n => n);
      const prefijos = {};
      for (const nombre of nombres) {
        const pref = nombre.split('-')[0];
        prefijos[pref] = (prefijos[pref] || 0) + 1;
      }

      console.log('\nPrefijos en seed.json:');
      for (const [pref, count] of Object.entries(prefijos).sort()) {
        console.log(`   ${pref}: ${count}`);
      }
    }
  }
  console.log();

  // =========================================================================
  // 5. Comparar BD vs seed.json
  // =========================================================================
  console.log('🔄 5. COMPARACIÓN BD vs seed.json\n');

  if (fs.existsSync(seedPath)) {
    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

    // Tomar 5 equipos aleatorios
    const muestra = [];
    for (let i = 0; i < Math.min(5, seed.equipos.length); i++) {
      muestra.push(seed.equipos[i]);
    }

    console.log('Comparando 5 equipos del seed:\n');
    for (const eqSeed of muestra) {
      const eqBD = db.prepare(`SELECT nombre FROM equipos WHERE id = ?`).get(eqSeed.id);
      const nameBD = eqBD ? eqBD.nombre : 'NO ENCONTRADO';
      const match = eqSeed.nombre === nameBD ? '✅' : '❌';

      console.log(`${match} ${eqSeed.id}`);
      console.log(`   Seed:  "${eqSeed.nombre}"`);
      console.log(`   BD:    "${nameBD}"`);
      console.log();
    }
  }

  // =========================================================================
  // 6. Información de la tabla
  // =========================================================================
  console.log('📋 6. ESTRUCTURA DE LA TABLA equipos\n');

  const cols = db.prepare("PRAGMA table_info(equipos)").all();
  for (const col of cols) {
    if (col.name === 'nombre') {
      console.log(`COLUMNA "nombre":`);
      console.log(`   Tipo: ${col.type}`);
      console.log(`   NotNull: ${col.notnull}`);
      console.log(`   Default: ${col.dflt_value}`);
      console.log();
    }
  }

  // =========================================================================
  // RESUMEN
  // =========================================================================
  console.log('=' .repeat(70));
  console.log('📌 RESUMEN DEL PROBLEMA');
  console.log('=' .repeat(70) + '\n');

  const bdTotal = db.prepare('SELECT COUNT(*) as c FROM equipos').get().c;
  const bdConNombre = db.prepare("SELECT COUNT(*) as c FROM equipos WHERE nombre IS NOT NULL").get().c;
  const bdLpt = db.prepare("SELECT COUNT(*) as c FROM equipos WHERE nombre LIKE 'LPT-%'").get().c;

  console.log(`Total equipos en BD: ${bdTotal}`);
  console.log(`Con nombre en BD: ${bdConNombre}`);
  console.log(`Con prefijo LPT- en BD: ${bdLpt}`);
  console.log();

  if (fs.existsSync(seedPath)) {
    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    console.log(`Total equipos en seed: ${seed.equipos.length}`);
    console.log(`Con nombre en seed: ${seed.equipos.filter(e => e.nombre).length}`);
  }

  console.log();
  console.log('=' .repeat(70));

  db.close();

} catch (err) {
  console.error('\n❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
}
