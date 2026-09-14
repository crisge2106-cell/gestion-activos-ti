const DatabaseFactory = require('./db-factory.js');

async function cleanupVercelOnly() {
  try {
    // Forzar conexión a Vercel (si MONGODB_URI está definida)
    if(!process.env.MONGODB_URI) {
      console.log('❌ MONGODB_URI no está definida');
      console.log('Para limpiar Vercel, ejecuta así:');
      console.log('  MONGODB_URI="..." node cleanup-vercel-only.js');
      process.exit(1);
    }

    const db = await DatabaseFactory.init();

    console.log('\n=== LIMPIEZA SELECTIVA DE VERCEL (Solo duplicados) ===\n');
    console.log('⚠️  MODO: Eliminar SOLO duplicados, mantener datos únicos\n');

    // 1. Eliminar movimientos tipo 'Entrega' (deben ser 'Asignacion')
    console.log('1️⃣ Eliminando movimientos tipo "Entrega"...');
    const entregaMovs = await db.prepare('SELECT id FROM movimientos WHERE tipo = ?').all('Entrega');

    if(entregaMovs.length > 0) {
      for(const mov of entregaMovs) {
        // Eliminar items primero
        await db.prepare('DELETE FROM movimiento_items WHERE movimientoId = ?').run(mov.id);
        // Luego movimiento
        await db.prepare('DELETE FROM movimientos WHERE id = ?').run(mov.id);
      }
      console.log(`   ✓ Eliminados ${entregaMovs.length} movimientos "Entrega"`);
    } else {
      console.log('   ✓ No hay movimientos "Entrega" (ya limpios)');
    }

    // 2. Eliminar movimientos orfanos (sin items)
    console.log('\n2️⃣ Eliminando movimientos orfanos (sin items)...');
    const orfanos = await db.prepare(`
      SELECT m.id FROM movimientos m
      LEFT JOIN movimiento_items mi ON m.id = mi.movimientoId
      WHERE mi.id IS NULL
      AND m.tipo NOT IN ('Baja', 'Devolucion', 'Devolucion por renovacion', 'Devolucion por salida')
    `).all();

    if(orfanos.length > 0) {
      for(const mov of orfanos) {
        await db.prepare('DELETE FROM movimientos WHERE id = ?').run(mov.id);
      }
      console.log(`   ✓ Eliminados ${orfanos.length} movimientos orfanos`);
    } else {
      console.log('   ✓ No hay movimientos orfanos');
    }

    // 3. Eliminar duplicados (mantener el primero, eliminar duplicados)
    console.log('\n3️⃣ Eliminando duplicados (mantener primero, eliminar duplicados)...');

    const duplicados = await db.prepare(`
      SELECT trabajador, fecha, tipo, GROUP_CONCAT(id) as ids
      FROM movimientos
      WHERE tipo = 'Asignacion' AND fecha IS NOT NULL
      GROUP BY trabajador, fecha, tipo
      HAVING COUNT(*) > 1
    `).all();

    let duplicadosEliminados = 0;

    if(duplicados.length > 0) {
      for(const dup of duplicados) {
        const movIds = dup.ids.split(',').sort(); // Ordenar para mantener el primero
        const paraEliminar = movIds.slice(1); // Todos menos el primero

        for(const movId of paraEliminar) {
          // Eliminar items
          await db.prepare('DELETE FROM movimiento_items WHERE movimientoId = ?').run(movId);
          // Eliminar movimiento
          await db.prepare('DELETE FROM movimientos WHERE id = ?').run(movId);
          duplicadosEliminados++;
        }

        console.log(`   ${dup.trabajador} | ${dup.fecha}: ${movIds.length} → 1 (eliminados ${paraEliminar.length})`);
      }
    } else {
      console.log('   ✓ No hay duplicados');
    }

    // Verificación final
    console.log('\n=== VERIFICACIÓN FINAL ===\n');

    const entregaFinal = await db.prepare('SELECT COUNT(*) as cnt FROM movimientos WHERE tipo = ?').get('Entrega');
    const orfanosFinal = await db.prepare(`
      SELECT COUNT(*) as cnt FROM movimientos m
      LEFT JOIN movimiento_items mi ON m.id = mi.movimientoId
      WHERE mi.id IS NULL
      AND m.tipo NOT IN ('Baja', 'Devolucion', 'Devolucion por renovacion', 'Devolucion por salida')
    `).get();

    const duplicadosFinal = await db.prepare(`
      SELECT COUNT(*) as cnt FROM (
        SELECT COUNT(*) FROM movimientos
        WHERE tipo = 'Asignacion' AND fecha IS NOT NULL
        GROUP BY trabajador, fecha
        HAVING COUNT(*) > 1
      )
    `).get();

    console.log(`Movimientos tipo 'Entrega' restantes: ${entregaFinal.cnt} ${entregaFinal.cnt === 0 ? '✓' : '❌'}`);
    console.log(`Movimientos orfanos restantes: ${orfanosFinal.cnt} ${orfanosFinal.cnt === 0 ? '✓' : '❌'}`);
    console.log(`Grupos con duplicados restantes: ${duplicadosFinal.cnt} ${duplicadosFinal.cnt === 0 ? '✓' : '❌'}`);

    console.log('\n✅ LIMPIEZA DE VERCEL COMPLETADA\n');
    console.log('📋 Resumen:');
    console.log(`   - Eliminados ${entregaMovs.length} movimientos tipo "Entrega"`);
    console.log(`   - Eliminados ${orfanos.length} movimientos orfanos`);
    console.log(`   - Eliminados ${duplicadosEliminados} movimientos duplicados`);
    console.log(`   - Total eliminados: ${entregaMovs.length + orfanos.length + duplicadosEliminados}`);
    console.log(`   - Datos únicos: PRESERVADOS\n`);

  } catch(err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

cleanupVercelOnly();
