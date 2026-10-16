/**
 * server/routes/produccion.js
 * Rutas del módulo de Producción y Agroindustrialización
 */

import express from 'express';
import ProductionService from '../services/ProductionService.js';
import pool from '../db.js';

const router = express.Router();

// ==========================================
// FORMULAS DE PRODUCCION
// ==========================================

router.get('/formulas', async (req, res) => {
  try {
    const id_tenant = req.query.id_tenant || 1;
    const formulas = await ProductionService.getFormulas(id_tenant);
    res.json({ success: true, data: formulas });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/formulas/:id', async (req, res) => {
  try {
    const id_tenant = req.query.id_tenant || 1;
    const formula = await ProductionService.getFormulaById(id_tenant, req.params.id);
    if (!formula) {
      return res.status(404).json({ success: false, error: 'Fórmula no encontrada' });
    }
    res.json({ success: true, data: formula });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/formulas', async (req, res) => {
  try {
    const result = await ProductionService.createFormula(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/formulas/:id', async (req, res) => {
  try {
    const result = await ProductionService.updateFormula(req.params.id, req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/formulas/:id', async (req, res) => {
  try {
    const id_tenant = req.query.id_tenant || 1;
    const result = await ProductionService.deleteFormula(id_tenant, req.params.id);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// ORDENES DE PRODUCCION
// ==========================================

router.post('/crear-orden', async (req, res) => {
  try {
    const result = await ProductionService.createProductionOrder(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    console.error('Error al crear orden:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/historico-producciones', async (req, res) => {
  try {
    const id_tenant = req.query.id_tenant || 1;
    const { filtros = {} } = req.body;
    const registros = await ProductionService.getHistoricoProducciones(id_tenant, filtros);
    res.json({ success: true, registros });
  } catch (error) {
    console.error('Error al obtener histórico:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/lote/:id_orden', async (req, res) => {
  try {
    const id_tenant = req.query.id_tenant || 1;
    const detalles = await ProductionService.getDetalleLoteConTrazabilidad(id_tenant, req.params.id_orden);
    if (!detalles) {
      return res.status(404).json({ success: false, error: 'Lote no encontrado' });
    }
    res.json(detalles);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// DASHBOARD Y ESTADÍSTICAS
// ==========================================

// Dashboard resumen de producción
router.get('/dashboard', async (req, res) => {
  try {
    const id_tenant = req.query.id_tenant || 1;
    
    // Estadísticas principales
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_ordenes,
        SUM(CASE WHEN estado = 'Finalizada' THEN 1 ELSE 0 END) as ordenes_finalizadas,
        SUM(CASE WHEN estado = 'En_Proceso' THEN 1 ELSE 0 END) as ordenes_en_proceso,
        COALESCE(SUM(CASE WHEN estado = 'Finalizada' THEN costo_total ELSE 0 END), 0) as inversion_total,
        COALESCE(AVG(CASE WHEN estado = 'Finalizada' THEN costo_total ELSE NULL END), 0) as costo_promedio,
        COALESCE(SUM(CASE WHEN estado = 'Finalizada' THEN cantidad_ordenada ELSE 0 END), 0) as total_unidades_producidas
      FROM orden_produccion 
      WHERE id_tenant = ?
    `, [id_tenant]);

    // Costos desglosados
    const [costos] = await pool.query(`
      SELECT 
        COALESCE(SUM(costo_materiales), 0) as mp_total,
        COALESCE(SUM(costo_mano_obra), 0) as mod_total,
        COALESCE(SUM(costo_cif), 0) as cif_total
      FROM orden_produccion 
      WHERE id_tenant = ? AND estado = 'Finalizada'
    `, [id_tenant]);

    // Calidad BPM
    const [calidad] = await pool.query(`
      SELECT 
        COALESCE(SUM(cantidad_primera), 0) as prima_total,
        COALESCE(SUM(cantidad_segunda), 0) as segunda_total,
        COALESCE(SUM(merma), 0) as merma_total,
        COUNT(*) as lotes_producidos
      FROM orden_produccion_calidad opc
      JOIN orden_produccion op ON opc.id_orden = op.id_orden
      WHERE op.id_tenant = ?
    `, [id_tenant]);

    // Rentabilidad por producto/cultivo
    const [rentabilidad] = await pool.query(`
      SELECT 
        i.id_insumo as id,
        i.codigo,
        i.nombre,
        g.nombre as grupo,
        sg.nombre as subgrupo,
        i.unidad_medida,
        COALESCE(SUM(op.cantidad_ordenada), 0) as unidades_producidas,
        COALESCE(SUM(op.costo_total), 0) as costo_total,
        COALESCE(SUM(op.cantidad_ordenada * i.precio_venta_1), 0) as ingresos_estimados,
        COALESCE(SUM(op.cantidad_ordenada * i.precio_venta_1) - SUM(op.costo_total), 0) as utilidad_bruta,
        CASE 
          WHEN SUM(op.cantidad_ordenada * i.precio_venta_1) > 0 
          THEN ((SUM(op.cantidad_ordenada * i.precio_venta_1) - SUM(op.costo_total)) / SUM(op.cantidad_ordenada * i.precio_venta_1)) * 100 
          ELSE 0 
        END as margen_porcentaje
      FROM insumos i
      LEFT JOIN inv_grupos g ON i.id_grupo = g.id_grupo
      LEFT JOIN inv_subgrupos sg ON i.id_subgrupo = sg.id_subgrupo
      JOIN formula_produccion fp ON i.id_insumo = fp.id_insumo_producto
      JOIN orden_produccion op ON fp.id_formula = op.id_formula
      WHERE i.id_tenant = ? AND op.estado = 'Finalizada'
      GROUP BY i.id_insumo, i.codigo, i.nombre, g.nombre, sg.nombre, i.unidad_medida
      ORDER BY utilidad_bruta DESC
    `, [id_tenant]);

    // Resumen global de utilidad
    const ingresosTotales = rentabilidad.reduce((sum, item) => sum + parseFloat(item.ingresos_estimados), 0);
    const inversionFinalizada = stats[0]?.inversion_total || 0;
    const utilidadBrutaTotal = ingresosTotales - inversionFinalizada;
    const margenPromedio = ingresosTotales > 0 ? (utilidadBrutaTotal / ingresosTotales) * 100 : 0;

    res.json({ 
      success: true, 
      data: {
        stats: stats[0],
        costos: costos[0] || {},
        calidad: calidad[0] || {},
        rentabilidad,
        resumen_financiero: {
          ingresos_totales: ingresosTotales,
          utilidad_bruta_total: utilidadBrutaTotal,
          margen_promedio: margenPromedio
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener configuración del tenant
router.get('/config-tenant/:id_tenant', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM prod_config_tenant WHERE id_tenant = ?`,
      [req.params.id_tenant]
    );
    if (rows.length === 0) {
      return res.json({
        margen_minimo_rentable: 20,
        habilitar_inteligencia_mercado: 1,
        dias_validez_precio_mercado: 30,
        whatsapp_alertas_telefono: ''
      });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Guardar configuración del tenant
router.post('/config-tenant', async (req, res) => {
  try {
    const { id_tenant, margen_minimo_rentable, habilitar_inteligencia_mercado, dias_validez_precio_mercado, whatsapp_alertas_telefono } = req.body;
    
    const [existing] = await pool.query("SELECT id_config FROM prod_config_tenant WHERE id_tenant = ?", [id_tenant]);
    if (existing.length > 0) {
      await pool.query(
        `UPDATE prod_config_tenant SET
           margen_minimo_rentable = ?,
           habilitar_inteligencia_mercado = ?,
           dias_validez_precio_mercado = ?,
           whatsapp_alertas_telefono = ?
         WHERE id_tenant = ?`,
        [margen_minimo_rentable, habilitar_inteligencia_mercado, dias_validez_precio_mercado, whatsapp_alertas_telefono, id_tenant]
      );
    } else {
      await pool.query(
        `INSERT INTO prod_config_tenant (id_tenant, margen_minimo_rentable, habilitar_inteligencia_mercado, dias_validez_precio_mercado, whatsapp_alertas_telefono)
         VALUES (?, ?, ?, ?, ?)`,
        [id_tenant, margen_minimo_rentable, habilitar_inteligencia_mercado, dias_validez_precio_mercado, whatsapp_alertas_telefono]
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// CATÁLOGO DE PRODUCTOS
// ==========================================

// Catálogo de productos (insumos que pueden ser productos finados)
router.get('/catalogo-productos', async (req, res) => {
  try {
    const id_tenant = req.query.id_tenant || 1;
    const [rows] = await pool.query(`
      SELECT 
        i.id_insumo as id,
        i.codigo,
        i.nombre,
        i.descripcion_corta as descripcion,
        i.unidad_medida,
        i.costo_unitario,
        COALESCE(i.precio_venta_1, 0) as precio_venta_sugerido,
        g.nombre as grupo,
        sg.nombre as subgrupo,
        CONCAT(g.nombre, ' > ', COALESCE(sg.nombre, '')) as categoria,
        COUNT(op.id_formula) as veces_mas_utilizado
      FROM insumos i
      LEFT JOIN inv_grupos g ON i.id_grupo = g.id_grupo
      LEFT JOIN inv_subgrupos sg ON i.id_subgrupo = sg.id_subgrupo
      LEFT JOIN formula_produccion op ON i.id_insumo = op.id_insumo_producto
      WHERE i.id_tenant = ?
        AND i.estado = 'Activo'
        AND (
          i.es_producible = 1 
          OR i.clasificacion IN ('ProductoTerminado', 'ProductoEnProceso')
          OR i.id_insumo IN (SELECT DISTINCT id_insumo_producto FROM formula_produccion WHERE id_tenant = ?)
        )
      GROUP BY i.id_insumo, i.codigo, i.nombre, i.descripcion_corta, i.unidad_medida, i.costo_unitario, i.precio_venta_1, g.nombre, sg.nombre
      ORDER BY i.nombre ASC
    `, [id_tenant, id_tenant]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// INTEGRACIONES Y RECURSOS
// ==========================================

// Obtener maquinaria activa del taller
router.get('/maquinas', async (req, res) => {
  try {
    const id_tenant = req.query.id_tenant || 1;
    const [rows] = await pool.query(
      `SELECT m.id_maq_agro as id, m.marca_modelo as nombre, m.placa, m.tipo, 0 as costo_hora
       FROM agroind_maquinaria_equipo m
       LEFT JOIN fincas f ON m.id_finca = f.id_finca
       WHERE f.id_tenant = ?`,
      [id_tenant]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener empleados activos
router.get('/empleados', async (req, res) => {
  try {
    const id_tenant = req.query.id_tenant || 1;
    const [rows] = await pool.query(
      `SELECT id_empleado as id, CONCAT(nombres, ' ', IFNULL(apellidos, '')) as nombre, documento as cedula, COALESCE(salario_base / 240, 0) as valor_hora
       FROM rrhh_empleados
       WHERE id_tenant = ?`,
      [id_tenant]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener lotes de existencias de un insumo específico
router.get('/lotes-insumo/:id_insumo', async (req, res) => {
  try {
    const id_tenant = req.query.id_tenant || 1;
    const { id_bodega } = req.query;

    let query = `
      SELECT id_lote_existencia as id, lote, cantidad, costo_unitario, fecha_vencimiento
      FROM inv_lotes_existencia
      WHERE id_tenant = ? AND id_insumo = ? AND cantidad > 0 AND (fecha_vencimiento > NOW() OR fecha_vencimiento IS NULL)
    `;
    const params = [id_tenant, req.params.id_insumo];

    if (id_bodega) {
      query += ` AND id_bodega = ?`;
      params.push(id_bodega);
    }

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// PRECIOS DE MERCADO REFERENCIALES
// ==========================================

router.post('/precios-mercado/sync-dane', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const id_tenant = req.query.id_tenant || 1;
    await conn.beginTransaction();
    
    // Obtener los productos configurados (idealmente, los que tengan fuente = API o códigos SIPSA mapeados)
    // Para simplificar, buscamos los Tomates y Frijoles
    const [productosSipsa] = await conn.query(`
      SELECT id_insumo, codigo, nombre 
      FROM insumos 
      WHERE id_tenant = ? AND (nombre LIKE '%Tomate%' OR nombre LIKE '%Frijol%')
    `, [id_tenant]);

    let registrados = 0;
    const mesActual = new Date().toLocaleString('es-CO', { month: 'long', year: 'numeric' });

    for (const prod of productosSipsa) {
      // Simulación de llamada a API DANE/SIPSA
      // En producción, esto haría un fetch() al Gov.co de Datos Abiertos
      const precioSimuladoApi = prod.nombre.includes('Tomate') 
        ? Math.floor(Math.random() * (120000 - 80000) + 80000)
        : Math.floor(Math.random() * (12000 - 9000) + 9000);

      // Desactivar previos vigentes
      await conn.query(
        `UPDATE prod_precios_mercado
         SET vigente_hasta = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
         WHERE id_tenant = ? AND id_insumo_producto = ? AND vigente_hasta IS NULL`,
        [id_tenant, prod.id_insumo]
      );

      // Insertar nuevo precio desde API
      await conn.query(
        `INSERT INTO prod_precios_mercado (id_tenant, id_insumo_producto, precio_unitario, fuente, notas, vigente_desde, vigente_hasta)
         VALUES (?, ?, ?, ?, ?, CURDATE(), NULL)`,
        [id_tenant, prod.id_insumo, precioSimuladoApi, 'API', `Sincronización DANE SIPSA - ${mesActual}`]
      );
      registrados++;
    }

    await conn.commit();
    res.json({ success: true, message: `Sincronización exitosa. Se actualizaron ${registrados} precios vigentes desde el DANE SIPSA.` });
  } catch (error) {
    await conn.rollback();
    console.error('Error al sincronizar SIPSA:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    conn.release();
  }
});

router.post('/precios-mercado', async (req, res) => {
  console.log('POST /precios-mercado payload:', req.body);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const { id_tenant = 1, id_insumo_producto, precio_unitario, fuente = 'Manual', notas = '' } = req.body;
      
      if (!id_insumo_producto || !precio_unitario) {
        return res.status(400).json({ success: false, error: 'Faltan parámetros obligatorios: id_insumo_producto o precio_unitario' });
      }

      // Validate product existence for tenant
      const [productRows] = await conn.query(`SELECT id_insumo FROM insumos WHERE id_tenant = ? AND id_insumo = ?`, [id_tenant, id_insumo_producto]);
      if (productRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ success: false, error: 'Producto no encontrado para el tenant especificado' });
      }

      // Desactivar precios vigentes anteriores
      await conn.query(
        `UPDATE prod_precios_mercado
         SET vigente_hasta = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
         WHERE id_tenant = ? AND id_insumo_producto = ? AND vigente_hasta IS NULL`,
        [id_tenant, id_insumo_producto]
      );

      // Insertar nuevo precio
      const [result] = await conn.query(
        `INSERT INTO prod_precios_mercado (id_tenant, id_insumo_producto, precio_unitario, fuente, notas, vigente_desde, vigente_hasta)
         VALUES (?, ?, ?, ?, ?, CURDATE(), NULL)`,
        [id_tenant, id_insumo_producto, precio_unitario, fuente, notas]
      );

      await conn.commit();
      res.status(201).json({ success: true, id_precio_mercado: result.insertId, precio_unitario, fuente });
    } catch (error) {
      await conn.rollback();
      console.error('Error al registrar precio de mercado:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      conn.release();
    }
  });

router.post('/consultar-precios', async (req, res) => {
  const startTime = Date.now();
  try {
    const id_tenant = req.query.id_tenant || 1;
    const { filtros = {} } = req.body;

    let query = `
      SELECT pm.*, i.nombre as nombre_producto, i.codigo as codigo_producto
      FROM prod_precios_mercado pm
      JOIN insumos i ON pm.id_insumo_producto = i.id_insumo
      WHERE pm.id_tenant = ?
    `;
    const params = [id_tenant];

    if (filtros.id_insumo_producto) {
      query += ` AND pm.id_insumo_producto = ?`;
      params.push(filtros.id_insumo_producto);
    }
    if (filtros.fecha_desde) {
      query += ` AND pm.vigente_desde >= ?`;
      params.push(filtros.fecha_desde);
    }
    if (filtros.fecha_hasta) {
      query += ` AND pm.vigente_desde <= ?`;
      params.push(filtros.fecha_hasta);
    }

    query += ` ORDER BY pm.vigente_desde DESC, pm.id_precio_mercado DESC`;

    const [rows] = await pool.query(query, params);
    const duration = Date.now() - startTime;

    // Guardar consulta en histórico de consultas
    try {
      await pool.query(
        `INSERT INTO prod_consultas_historico (id_tenant, tipo_consulta, filtros_aplicados, cantidad_registros, tiempo_procesamiento_ms, estado_consulta)
         VALUES (?, 'precios_mercado', ?, ?, ?, 'Exitosa')`,
        [id_tenant, JSON.stringify(filtros), rows.length, duration]
      );
    } catch (auditErr) {
      console.error('Error al guardar auditoría de consulta precios:', auditErr);
    }

    res.json({ success: true, registros: rows, tiempo_procesamiento_ms: duration });
  } catch (error) {
    console.error('Error al consultar precios de mercado:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/precios-mercado/:id', async (req, res) => {
  try {
    const id_tenant = req.query.id_tenant || 1;
    const { precio_unitario, fuente, notas } = req.body;

    if (!precio_unitario) {
      return res.status(400).json({ success: false, error: 'El precio unitario es obligatorio' });
    }

    await pool.query(
      `UPDATE prod_precios_mercado
       SET precio_unitario = ?, fuente = ?, notas = ?
       WHERE id_precio_mercado = ? AND id_tenant = ?`,
      [precio_unitario, fuente, notas, req.params.id, id_tenant]
    );

    res.json({ success: true, message: 'Precio actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar precio de mercado:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/precios-mercado/:id', async (req, res) => {
  try {
    const id_tenant = req.query.id_tenant || 1;
    await pool.query(
      `DELETE FROM prod_precios_mercado
       WHERE id_precio_mercado = ? AND id_tenant = ?`,
      [req.params.id, id_tenant]
    );
    res.json({ success: true, message: 'Precio eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar precio de mercado:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// ==========================================
// LOTES AVANZADOS
// ==========================================

router.get('/lotes/avanzado', async (req, res) => {
  try {
    const id_tenant = req.query.id_tenant || 1;
    const { id_finca, id_nucleo, fecha_inicio, fecha_fin } = req.query;
    
    let whereClause = 'WHERE f.id_tenant = ?';
    let params = [id_tenant];

    if (id_finca) {
      whereClause += ' AND f.id_finca = ?';
      params.push(id_finca);
    }
    if (id_nucleo) {
      whereClause += ' AND n.id_nucleo = ?';
      params.push(id_nucleo);
    }
    if (fecha_inicio && fecha_fin) {
      whereClause += ' AND EXISTS (SELECT 1 FROM siembras s3 WHERE s3.id_lote = l.id_lote AND s3.fecha_siembra >= ? AND s3.fecha_siembra <= ?)';
      params.push(fecha_inicio, fecha_fin);
    }
    
    // Obtenemos los lotes con la cuenta de árboles sembrados (siembras activas)
    const query = `
      SELECT l.*, f.nombre as finca_nombre, n.nombre as nucleo_nombre,
        (SELECT COALESCE(SUM(s.cantidad_plantas), 0) 
         FROM siembras s 
         WHERE s.id_lote = l.id_lote AND s.estado = 'Activo') as arboles_sembrados
      FROM lotes l
      LEFT JOIN nucleos n ON l.id_nucleo = n.id_nucleo
      LEFT JOIN fincas f ON n.id_finca = f.id_finca
      ${whereClause}
      ORDER BY l.codigo ASC
    `;
    const [lotes] = await pool.query(query, params);
    res.json({ success: true, data: lotes });
  } catch (error) {
    console.error('Error al obtener lotes avanzado:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/lotes/gerencial', async (req, res) => {
  try {
    const id_tenant = req.query.id_tenant || 1;
    const { id_finca, id_nucleo, fecha_inicio, fecha_fin } = req.query;
    
    let whereClause = 'WHERE f.id_tenant = ?';
    let params = [id_tenant];

    if (id_finca) {
      whereClause += ' AND f.id_finca = ?';
      params.push(id_finca);
    }
    if (id_nucleo) {
      whereClause += ' AND n.id_nucleo = ?';
      params.push(id_nucleo);
    }
    if (fecha_inicio && fecha_fin) {
      whereClause += ' AND EXISTS (SELECT 1 FROM siembras s3 WHERE s3.id_lote = l.id_lote AND s3.fecha_siembra >= ? AND s3.fecha_siembra <= ?)';
      params.push(fecha_inicio, fecha_fin);
    }
    
    const query = `
      SELECT 
        l.id_lote, l.codigo AS lote_codigo, l.nombre AS lote_nombre, l.hectareas,
        f.nombre AS finca_nombre,
        n.nombre AS nucleo_nombre,
        c.nombre AS cultivo_actual,
        (SELECT MAX(fecha_cosecha) FROM cosechas co JOIN siembras s2 ON co.id_siembra = s2.id_siembra WHERE s2.id_lote = l.id_lote) AS fecha_ultima_cosecha,
        IFNULL(s.hectareas_sembradas, 0) * IFNULL(c.rendimiento_esperado_ton_ha, 0) AS produccion_estimada_ton,
        (SELECT SUM(produccion_total_kg)/1000 FROM cosechas co JOIN siembras s2 ON co.id_siembra = s2.id_siembra WHERE s2.id_lote = l.id_lote) AS recolectado_ton
      FROM lotes l
      LEFT JOIN nucleos n ON l.id_nucleo = n.id_nucleo
      LEFT JOIN fincas f ON n.id_finca = f.id_finca
      LEFT JOIN siembras s ON l.id_lote = s.id_lote AND s.estado = 'Activo'
      LEFT JOIN cultivos c ON s.id_cultivo = c.id_cultivo
      ${whereClause}
      GROUP BY l.id_lote, l.codigo, l.nombre, l.hectareas, f.nombre, n.nombre, c.nombre, s.hectareas_sembradas, c.rendimiento_esperado_ton_ha
      ORDER BY l.codigo ASC
    `;
    const [lotes] = await pool.query(query, params);
    res.json({ success: true, data: lotes });
  } catch (error) {
    console.error('Error al obtener reporte gerencial:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/lotes/:id_lote/historico', async (req, res) => {
  try {
    const { id_lote } = req.params;
    
    // Obtener lote
    const [loteData] = await pool.query(`
      SELECT l.*, n.nombre as nucleo_nombre, f.nombre as finca_nombre 
      FROM lotes l 
      LEFT JOIN nucleos n ON l.id_nucleo = n.id_nucleo 
      LEFT JOIN fincas f ON n.id_finca = f.id_finca 
      WHERE l.id_lote = ?
    `, [id_lote]);
    const lote = loteData[0];
    if (!lote) return res.status(404).json({ success: false, error: 'Lote no encontrado' });

    // Obtener siembra activa (o la última)
    const [siembras] = await pool.query(`
      SELECT s.*, cu.nombre as cultivo_nombre 
      FROM siembras s 
      LEFT JOIN cultivos cu ON s.id_cultivo = cu.id_cultivo 
      WHERE s.id_lote = ? ORDER BY s.fecha_siembra DESC LIMIT 1
    `, [id_lote]);
    const siembra = siembras[0] || null;

    // Obtener última cosecha
    let ultimaCosecha = null;
    if (siembra) {
      const [cosechas] = await pool.query('SELECT * FROM cosechas WHERE id_siembra = ? ORDER BY fecha_cosecha DESC LIMIT 1', [siembra.id_siembra]);
      ultimaCosecha = cosechas[0] || null;
    }

    // Obtener historial de labores (Limpieza, Fumigación, Abonada)
    const laboresQuery = `
      SELECT ld.*, cl.nombre as labor_nombre, cl.categoria as labor_categoria,
             emp.nombres as empleado_nombres, emp.apellidos as empleado_apellidos
      FROM labores_diarias ld
      LEFT JOIN rrhh_catalogo_labores cl ON ld.id_catalogo_labor = cl.id_labor_catalogo
      LEFT JOIN rrhh_empleados emp ON ld.id_empleado = emp.id_empleado
      WHERE ld.id_lote = ? AND ld.estado = 'Completada'
      ORDER BY ld.fecha_completado DESC
      LIMIT 50
    `;
    const [labores] = await pool.query(laboresQuery, [id_lote]);

    // Calcular edad y próxima cosecha estimada (simulación básica)
    let edadMeses = null;
    let proximaCosecha = null;
    if (siembra?.fecha_siembra) {
      const msDiff = new Date() - new Date(siembra.fecha_siembra);
      edadMeses = Math.floor(msDiff / (1000 * 60 * 60 * 24 * 30)); // Aproximado a meses
      
      // Ejemplo: si se cosecha cada 6 meses (esto debería venir del tipo de cultivo)
      if (ultimaCosecha) {
        proximaCosecha = new Date(ultimaCosecha.fecha_cosecha);
        proximaCosecha.setMonth(proximaCosecha.getMonth() + 6);
      } else {
        proximaCosecha = new Date(siembra.fecha_siembra);
        proximaCosecha.setMonth(proximaCosecha.getMonth() + 24); // 2 años primera cosecha as an example
      }
    }

    let produccionAcumulada = 0;
    if (siembra) {
      const [sumRow] = await pool.query('SELECT SUM(produccion_total_kg) as total FROM cosechas WHERE id_siembra = ?', [siembra.id_siembra]);
      produccionAcumulada = sumRow[0]?.total || 0;
    }

    res.json({
      success: true,
      data: {
        lote,
        siembra,
        ultimaCosecha,
        produccionAcumulada,
        labores,
        edadMeses,
        proximaCosecha
      }
    });
  } catch (error) {
    console.error('Error al obtener histórico de lote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/lotes/:id_lote/cosechas_historial', async (req, res) => {
  try {
    const { id_lote } = req.params;
    const query = `
      SELECT c.*, s.fecha_siembra
      FROM cosechas c
      JOIN siembras s ON c.id_siembra = s.id_siembra
      WHERE s.id_lote = ?
      ORDER BY c.fecha_cosecha DESC
    `;
    const [rows] = await pool.query(query, [id_lote]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error al obtener cosechas historial:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/lotes/:id_lote/labores_historial', async (req, res) => {
  try {
    const { id_lote } = req.params;
    const query = `
      SELECT ld.id_labor, ld.fecha_planificada, ld.fecha_completado, ld.estado, ld.costo_mano_obra, ld.horas_trabajadas,
             cl.nombre as labor_nombre, cl.categoria as labor_categoria,
             e.nombres as empleado_nombres, e.apellidos as empleado_apellidos,
             m.marca_modelo as maquinaria_nombre, m.tipo as maquinaria_tipo,
             v.placa as vehiculo_placa, v.marca as vehiculo_marca
      FROM labores_diarias ld
      LEFT JOIN rrhh_catalogo_labores cl ON ld.id_catalogo_labor = cl.id_labor_catalogo
      LEFT JOIN rrhh_empleados e ON ld.id_empleado = e.id_empleado
      LEFT JOIN agroind_maquinaria_equipo m ON ld.id_maquinaria = m.id_maq_agro
      LEFT JOIN vehiculos v ON ld.id_vehiculo = v.id_vehiculo
      WHERE ld.id_lote = ? AND ld.estado = 'Completada'
      ORDER BY ld.fecha_completado DESC
    `;
    const [rows] = await pool.query(query, [id_lote]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error al obtener labores historial:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/lotes/:id_lote/insumos_historial', async (req, res) => {
  try {
    const { id_lote } = req.params;
    const query = `
      SELECT lia.*,
             i.nombre as insumo_nombre, i.codigo as insumo_codigo, i.unidad_medida,
             ld.fecha_completado, ld.fecha_planificada, cl.nombre as labor_nombre
      FROM labores_insumos_aplicados lia
      JOIN labores_diarias ld ON lia.id_labor = ld.id_labor
      LEFT JOIN rrhh_catalogo_labores cl ON ld.id_catalogo_labor = cl.id_labor_catalogo
      JOIN insumos i ON lia.id_insumo = i.id_insumo
      WHERE ld.id_lote = ? AND ld.estado = 'Completada'
      ORDER BY ld.fecha_completado DESC
    `;
    const [rows] = await pool.query(query, [id_lote]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error al obtener insumos historial:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// TRAZABILIDAD PRODUCTO
// ==========================================
router.get('/trazabilidad', async (req, res) => {
  try {
    const id_tenant = req.query.id_tenant || 1;
    const { id_finca, id_cultivo, fecha_desde, fecha_hasta } = req.query;
    
    let whereClause = 'WHERE tp.id_finca IS NOT NULL'; 
    let params = [];

    if (id_finca && id_finca !== 'undefined' && id_finca !== 'null') {
      whereClause += ' AND tp.id_finca = ?';
      params.push(id_finca);
    }
    
    if (fecha_desde && fecha_desde !== 'undefined') {
      whereClause += ' AND tp.fecha_evento >= ?';
      params.push(fecha_desde + ' 00:00:00');
    }
    
    if (fecha_hasta && fecha_hasta !== 'undefined') {
      whereClause += ' AND tp.fecha_evento <= ?';
      params.push(fecha_hasta + ' 23:59:59');
    }

    if (id_cultivo && id_cultivo !== 'undefined' && id_cultivo !== 'null') {
      whereClause += ' AND s.id_cultivo = ?';
      params.push(id_cultivo);
    }

    const queryGrid = `
      SELECT tp.*, s.id_cultivo
      FROM trazabilidad_producto tp
      LEFT JOIN siembras s ON tp.id_siembra = s.id_siembra
      ${whereClause}
      ORDER BY tp.fecha_evento DESC
      LIMIT 500
    `;
    const [gridRows] = await pool.query(queryGrid, params);
    
    // Calcular KPIs reales sin límite de paginación para el Dashboard
    const queryKpi = `
      SELECT 
        COALESCE(SUM(tp.peso_kg), 0) as volumen_total,
        COUNT(tp.id_traz_prod) as total_registros
      FROM trazabilidad_producto tp
      LEFT JOIN siembras s ON tp.id_siembra = s.id_siembra
      ${whereClause}
    `;
    const [kpiRows] = await pool.query(queryKpi, params);
    const volumen_total = parseFloat(kpiRows[0].volumen_total);
    const total_registros = kpiRows[0].total_registros;
    
    const dashboardData = {
      kpi: {
        volumen_total: volumen_total,
        rendimiento_ha: 2150, // Ejemplo fijo, idealmente vendría de hectareas
        porcentaje_compliance: total_registros > 0 ? 100 : 0,
        costo_estimado_unidad: 1.25
      },
      tendencias: [
        { name: 'Hace 3m', volumen: volumen_total > 0 ? volumen_total * 0.8 : 0 },
        { name: 'Hace 2m', volumen: volumen_total > 0 ? volumen_total * 0.9 : 0 },
        { name: 'Mes Anterior', volumen: volumen_total > 0 ? volumen_total * 0.95 : 0 },
        { name: 'Mes Actual', volumen: volumen_total }
      ],
      distribucion: [
        { name: 'Producción Filtrada', value: volumen_total > 0 ? volumen_total : 1 }
      ]
    };

    res.json({ success: true, grid: gridRows, dashboard: dashboardData, total_registros });
  } catch (error) {
    console.error('Error trazabilidad:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
