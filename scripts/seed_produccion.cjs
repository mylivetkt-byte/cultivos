/**
 * seed_produccion.js
 * Script de seed para pruebas del módulo de Producción
 * Crear: recetas, órdenes, lotes y precios de mercado
 */

import { pool } from './db.js';

async function seedProductionData() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const id_tenant = 1; // Ajustar según necesidad

    console.log('🌱 Iniciando seed del módulo de Producción...\n');

    // ========================================
    // 1. CREAR PRODUCTOS TERMINADOS (insumos)
    // ========================================
    console.log('📦 Creando productos terminados...');

    const productosTerminados = [
      { nombre: 'Queso Fresco', codigo: 'PT-QUESO-FRESCO' },
      { nombre: 'Quesillo', codigo: 'PT-QUESILLO' },
      { nombre: 'Yogur Natural', codigo: 'PT-YOGUR-NAT' },
      { nombre: 'Suero de Leche', codigo: 'PT-SUERO' },
    ];

    const productosIds = [];
    for (const prod of productosTerminados) {
      const [result] = await conn.query(
        `INSERT INTO insumos (id_tenant, codigo, nombre, id_grupo, tipo_insumo, unidad_medida, precio_unitario, activo)
         SELECT ?, ?, ?, id_grupo, 'PT', 'kg', 35000, 1
         FROM inv_grupos WHERE id_tenant = ? AND nombre = 'Productos Terminados'
         LIMIT 1`,
        [id_tenant, prod.codigo, prod.nombre, id_tenant]
      );
      if (result.affectedRows > 0) {
        productosIds.push(result.insertId);
        console.log(`  ✅ ${prod.nombre} (ID: ${result.insertId})`);
      }
    }

    // ========================================
    // 2. CREAR RECETAS MAESTRAS
    // ========================================
    console.log('\n📋 Creando recetas maestras...');

    const [bodegaResult] = await conn.query(
      `SELECT id_bodega FROM bodegas WHERE id_tenant = ? LIMIT 1`,
      [id_tenant]
    );
    const id_bodega = bodegaResult[0]?.id_bodega || 1;

    const [fincaResult] = await conn.query(
      `SELECT id_finca FROM fincas WHERE id_tenant = ? LIMIT 1`,
      [id_tenant]
    );
    const id_finca = fincaResult[0]?.id_finca || 1;

    // Receta 1: Queso Fresco
    const [receta1] = await conn.query(
      `INSERT INTO prod_recetas (
        id_tenant, codigo, nombre, descripcion, id_insumo_producto,
        unidad_medida, version_actual, rendimiento_esperado, id_bodega_destino,
        cif_modo, cif_valor, estado, creado_el
      ) VALUES (?, 'REC-QF-001', 'Queso Fresco Artesanal', 'Receta tradicional de queso fresco', ?, 'kg', 1, 100, ?, 'Porcentaje', 10, 'Activa', NOW())`,
      [id_tenant, productosIds[0], id_bodega]
    );

    const idReceta1 = receta1.insertId;
    console.log(`  ✅ Queso Fresco (ID: ${idReceta1})`);

    // ========================================
    // 3. CREAR COMPONENTES DE RECETA
    // ========================================
    console.log('\n🧪 Creando componentes de receta...');

    // Obtener insumos de materia prima (Leche)
    const [insumosMP] = await conn.query(
      `SELECT id_insumo FROM insumos WHERE id_tenant = ? AND tipo_insumo = 'MP' LIMIT 3`,
      [id_tenant]
    );

    if (insumosMP.length > 0) {
      // Componente 1: Leche (120 litros por 100kg de queso)
      await conn.query(
        `INSERT INTO prod_receta_componentes (
          id_tenant, id_receta, version, id_insumo, cantidad_por_unidad,
          unidad_medida, costo_estandar, factor_merma, orden
        ) VALUES (?, ?, 1, ?, 1.2, 'L', 15000, 0.05, 1)`,
        [id_tenant, idReceta1, insumosMP[0].id_insumo]
      );
      console.log(`  ✅ Componente: Leche (120L por 100kg PT)`);

      if (insumosMP.length > 1) {
        // Componente 2: Cuajo
        await conn.query(
          `INSERT INTO prod_receta_componentes (
            id_tenant, id_receta, version, id_insumo, cantidad_por_unidad,
            unidad_medida, costo_estandar, factor_merma, orden
          ) VALUES (?, ?, 1, ?, 0.1, 'g', 500, 0, 2)`,
          [id_tenant, idReceta1, insumosMP[1].id_insumo]
        );
        console.log(`  ✅ Componente: Cuajo (0.1g por kg PT)`);
      }
    }

    // ========================================
    // 4. CREAR ÓRDENES DE PRODUCCIÓN (para pruebas)
    // ========================================
    console.log('\n📦 Creando órdenes de producción...');

    // Obtener lotes de MP disponibles
    const [lotesMP] = await conn.query(
      `SELECT id_lote, codigo_lote, cantidad, costo_unitario
       FROM inv_lotes_existencia WHERE id_tenant = ? AND cantidad > 0 LIMIT 2`,
      [id_tenant]
    );

    if (lotesMP.length > 0) {
      // Crear snapshot de fórmula
      const formulaSnapshot = {
        version: 1,
        id_receta: idReceta1,
        nombre_receta: 'Queso Fresco Artesanal',
        cantidad_ordenada: 100,
        unidad_medida: 'kg',
        componentes: [
          {
            id_insumo: insumosMP[0]?.id_insumo,
            cantidad_por_unidad: 1.2,
            unidad_medida: 'L',
            costo_estandar: 15000,
            factor_merma: 0.05,
            cantidad_total_con_merma: 126
          }
        ],
        cif_modo: 'Porcentaje',
        cif_valor: 10,
        fecha_snapshot: new Date().toISOString()
      };

      const [ordenResult] = await conn.query(
        `INSERT INTO prod_ordenes (
          id_tenant, codigo_orden, id_receta, version_receta, id_insumo_producto,
          cantidad_ordenada, unidad_medida, id_bodega_origen, id_bodega_destino,
          id_finca, fecha_orden, estado, formula_snapshot, costo_mano_obra,
          costo_materiales, costo_cif, costo_total, creado_el
        ) VALUES (?, ?, ?, 1, ?, 100, 'kg', ?, ?, ?, NOW(), 'Finalizada',
                  ?, 50000, 1800000, 185000, 2035000, NOW())`,
        [
          id_tenant,
          `ORD-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(5, '0')}`,
          idReceta1,
          productosIds[0],
          id_bodega,
          id_bodega,
          id_finca,
          JSON.stringify(formulaSnapshot)
        ]
      );

      const idOrden = ordenResult.insertId;
      console.log(`  ✅ Orden de Producción creada (ID: ${idOrden})`);

      // ========================================
      // 5. CREAR LOTES DE PRODUCTO TERMINADO
      // ========================================
      console.log('\n📦 Creando lotes de producto terminado...');

      const lotCode = `LOT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
      const qrHash = require('crypto')
        .createHash('sha256')
        .update(`${lotCode}-${id_tenant}-${Date.now()}`)
        .digest('hex');

      const [loteResult] = await conn.query(
        `INSERT INTO prod_lotes (
          id_tenant, id_orden, id_insumo, lot_code, cantidad, cantidad_disponible,
          unidad_medida, costo_unitario, fecha_produccion, expiration_date,
          qr_code_hash, id_bodega, estado, creado_el
        ) VALUES (?, ?, ?, ?, 100, 100, 'kg', 20350, NOW(), DATE_ADD(NOW(), INTERVAL 180 DAY),
                  ?, ?, 'Disponible', NOW())`,
        [
          id_tenant,
          idOrden,
          productosIds[0],
          lotCode,
          qrHash,
          id_bodega
        ]
      );

      console.log(`  ✅ Lote de PT creado: ${lotCode}`);

      // ========================================
      // 6. CREAR ANÁLISIS DE RENTABILIDAD
      // ========================================
      console.log('\n📊 Creando análisis de rentabilidad...');

      const rentabilidad = {
        cantidad: 100,
        costo_total: 2035000,
        costo_unitario: 20350,
        precio_unitario: 35000,
        precio_total: 3500000,
        margen_unitario: 14650,
        margen_total: 1465000,
        pct_margen: 41.86,
        estado: 'Rentable'
      };

      await conn.query(
        `INSERT INTO prod_analisis_rentabilidad (
          id_tenant, id_orden, id_insumo_producto, cantidad_producida,
          unidad_medida, costo_total_produccion, costo_unitario,
          precio_mercado_unitario, margen_bruto_unitario, margen_bruto_total,
          pct_margen_bruto, estado_rentabilidad, analisis_json, creado_el
        ) VALUES (?, ?, ?, 100, 'kg', 2035000, 20350, 35000, 14650, 1465000, 41.86, 'Rentable', ?, NOW())`,
        [
          id_tenant,
          idOrden,
          productosIds[0],
          JSON.stringify(rentabilidad)
        ]
      );

      console.log(`  ✅ Análisis de rentabilidad: 41.86% (Rentable)`);
    }

    // ========================================
    // 7. CREAR PRECIOS DE MERCADO
    // ========================================
    console.log('\n💰 Creando precios de mercado...');

    for (const [idx, productoId] of productosIds.entries()) {
      const precios = [35000, 28000, 18000, 12000];
      await conn.query(
        `INSERT INTO prod_precios_mercado (
          id_tenant, id_insumo_producto, precio_unitario, moneda, fuente,
          vigente_desde, vigente_hasta, creado_el
        ) VALUES (?, ?, ?, 'COP', 'Manual', NOW(), NULL, NOW())`,
        [id_tenant, productoId, precios[idx] || 30000]
      );
      console.log(`  ✅ Precio mercado: $${precios[idx] || 30000}/unidad`);
    }

    // ========================================
    // 8. CREAR CONFIGURACIÓN DEL TENANT
    // ========================================
    console.log('\n⚙️ Creando configuración del tenant...');

    await conn.query(
      `INSERT INTO prod_config_tenant (
        id_tenant, margen_minimo_rentable, habilitar_inteligencia_mercado,
        dias_validez_precio_mercado, autofinalizar_sin_consumo, actualizado_el
      ) VALUES (?, 20, 1, 30, 0, NOW())
      ON DUPLICATE KEY UPDATE
        margen_minimo_rentable = 20,
        habilitar_inteligencia_mercado = 1,
        dias_validez_precio_mercado = 30,
        actualizado_el = NOW()`,
      [id_tenant]
    );

    console.log(`  ✅ Config: Margen mínimo 20%, Inteligencia de Mercado activa`);

    await conn.commit();

    console.log('\n✅ ✅ ✅ SEED COMPLETADO EXITOSAMENTE ✅ ✅ ✅\n');
    console.log('📊 Resumen:');
    console.log(`  • Productos Terminados: ${productosIds.length}`);
    console.log(`  • Recetas Maestras: 1`);
    console.log(`  • Órdenes de Producción: 1`);
    console.log(`  • Lotes de PT: 1`);
    console.log(`  • Precios de Mercado: ${productosIds.length}`);
    console.log(`  • Tenant: ${id_tenant}`);
    console.log('\n🚀 Próximos pasos:');
    console.log('  1. npm run dev:server');
    console.log('  2. POST /api/produccion/crear-orden');
    console.log('  3. POST /api/produccion/historico-producciones');
    console.log('\n');

  } catch (error) {
    await conn.rollback();
    console.error('❌ Error en seed:', error);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

// Ejecutar seed
seedProductionData().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
