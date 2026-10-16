import express from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';

const router = express.Router();

function tenantFilter(req, tableAlias = '') {
  const tenantId = req.query.tenantId || req.body.tenantId;
  const col = tableAlias ? `${tableAlias}.id_tenant` : 'id_tenant';
  return tenantId ? `WHERE ${col} = ${pool.escape(tenantId)}` : '';
}

function andTenantFilter(req, tableAlias = '') {
  const tenantId = req.query.tenantId || req.body.tenantId;
  const col = tableAlias ? `${tableAlias}.id_tenant` : 'id_tenant';
  return tenantId ? `AND ${col} = ${pool.escape(tenantId)}` : '';
}

// === 1. INVENTARIO ===
router.get('/inventario', async (req, res) => {
  try {
    let filter = tenantFilter(req);
    const { viveroId } = req.query;
    if (viveroId && viveroId !== 'Todos') {
      filter += ` AND id_vivero = ${pool.escape(viveroId)}`;
    }
    const [rows] = await getDb(req).query(`SELECT * FROM vivero_inventario ${filter} ORDER BY tipo, nombre`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching inventario' });
  }
});

router.post('/inventario', async (req, res) => {
  const { tenantId, tipo, nombre, proveedor, cantidad_disponible, unidad_medida, costo_unitario, id_vivero } = req.body;
  try {
    const [result] = await getDb(req).query(
      `INSERT INTO vivero_inventario (id_tenant, tipo, nombre, proveedor, cantidad_disponible, unidad_medida, costo_unitario, id_vivero) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, tipo, nombre, proveedor, cantidad_disponible, unidad_medida, costo_unitario, id_vivero || null]
    );
    res.json({ insertId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating item inventario' });
  }
});

// === 2. CAMADAS (Lotes de crecimiento) ===
router.get('/camadas', async (req, res) => {
  try {
    // Use 'c' alias to avoid ambiguous id_tenant when JOINing with vivero_inventario
    let filter = tenantFilter(req, 'c');
    const { viveroId } = req.query;
    if (viveroId && viveroId !== 'Todos') {
      filter += ` AND c.id_vivero = ${pool.escape(viveroId)}`;
    }
    const [rows] = await getDb(req).query(`
      SELECT c.*, i.nombre as nombre_semilla 
      FROM vivero_camadas c
      JOIN vivero_inventario i ON c.id_item_semilla = i.id_item
      ${filter}
      ORDER BY c.fecha_siembra_bandeja DESC
    `);
    
    // Calculate days since planted
    const enriched = rows.map(r => {
      const msDiff = new Date() - new Date(r.fecha_siembra_bandeja);
      const dias = Math.max(0, Math.floor(msDiff / (1000 * 60 * 60 * 24)));
      return { ...r, dias_crecimiento: dias };
    });
    
    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching camadas' });
  }
});

router.post('/camadas', async (req, res) => {
  const { tenantId, id_item_semilla, codigo_camada, fecha_siembra_bandeja, fecha_germinacion_esperada, cantidad_sembrada, ubicacion_vivero, id_vivero } = req.body;
  const connection = await getDb(req).getConnection();
  try {
    // Start transaction to also deduct seeds from inventory
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO vivero_camadas 
       (id_tenant, id_item_semilla, codigo_camada, fecha_siembra_bandeja, fecha_germinacion_esperada, cantidad_sembrada, cantidad_actual, ubicacion_vivero, id_vivero) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, id_item_semilla, codigo_camada, fecha_siembra_bandeja, fecha_germinacion_esperada, cantidad_sembrada, cantidad_sembrada, ubicacion_vivero, id_vivero || null]
    );

    // Deduct seeds (we assume 1 seed per plant for simplicity, though unit might be kg)
    await connection.query(
      `UPDATE vivero_inventario SET cantidad_disponible = cantidad_disponible - ? WHERE id_item = ?`,
      [cantidad_sembrada, id_item_semilla]
    );

    await connection.commit();
    res.json({ insertId: result.insertId });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error creating camada' });
  } finally {
    connection.release();
  }
});

// === 3. MOVIMIENTOS Y VENTAS (Integración Contable) ===
router.get('/movimientos', async (req, res) => {
  try {
    const { tenantId, fechaInicio, fechaFin, idSemilla, idEmpleado, viveroId } = req.query;
    
    let tF = tenantId ? 'WHERE m.id_tenant = ?' : 'WHERE 1=1';
    const params = tenantId ? [tenantId] : [];

    if (viveroId && viveroId !== 'Todos') {
      tF += ' AND (c.id_vivero = ? OR i.id_vivero = ?)';
      params.push(viveroId, viveroId);
    }

    if (fechaInicio && fechaFin) {
      tF += ' AND DATE(m.fecha) BETWEEN ? AND ?';
      params.push(fechaInicio, fechaFin);
    }
    
    if (idSemilla) {
      tF += ' AND c.id_item_semilla = ?';
      params.push(idSemilla);
    }

    if (idEmpleado) {
      tF += ' AND m.id_empleado_responsable = ?';
      params.push(idEmpleado);
    }

    // Si hay filtros de fecha, no limitamos tan agresivamente, asumimos que el usuario sabe lo que busca
    const limitClause = (fechaInicio && fechaFin) ? 'LIMIT 2000' : 'LIMIT 200';

    const [rows] = await getDb(req).query(`
      SELECT m.*,
             e.nombres AS empleado_nombres, e.apellidos AS empleado_apellidos, rc.descripcion AS empleado_cargo,
             c.codigo_camada, i.nombre AS nombre_semilla,
             l.descripcion_labor, l.estado AS labor_estado, l.fecha_completado AS labor_fecha_completado, l.costo_mano_obra AS labor_costo
      FROM vivero_movimientos m
      LEFT JOIN rrhh_empleados e ON m.id_empleado_responsable = e.id_empleado
       LEFT JOIN rrhh_cargos rc ON e.id_cargo = rc.id_cargo
      LEFT JOIN vivero_camadas c ON m.id_camada = c.id_camada
      LEFT JOIN vivero_inventario i ON c.id_item_semilla = i.id_item
      LEFT JOIN labores_diarias l ON l.id_tenant = m.id_tenant
        AND l.categoria IN ('Viveros', 'Semilleros')
        AND l.descripcion_labor LIKE CONCAT('%Vivero:%', m.tipo_movimiento, '%')
        AND DATE(l.fecha_planificada) = DATE(m.fecha)
        AND l.id_empleado = m.id_empleado_responsable
      ${tF}
      ORDER BY m.fecha ASC
      ${limitClause}
    `, params);

    res.json(rows);
  } catch (err) {
    console.error('API Error /movimientos:', err);
    res.status(500).json({ error: `Error interno de DB: ${err.message}` });
  }
});

router.post('/movimientos', async (req, res) => {
  const { tenantId, id_camada, id_item, tipo_movimiento, cantidad, id_empleado_responsable, observaciones, precio_venta_total, id_lote_destino } = req.body;
  const connection = await getDb(req).getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO vivero_movimientos 
       (id_tenant, id_camada, id_item, tipo_movimiento, cantidad, id_empleado_responsable, observaciones, precio_venta_total, id_lote_destino) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, id_camada, id_item, tipo_movimiento, cantidad, id_empleado_responsable, observaciones, precio_venta_total || 0, id_lote_destino || null]
    );

    // Deduct from inventory or camada
    if (id_camada) {
      await connection.query(`UPDATE vivero_camadas SET cantidad_actual = cantidad_actual - ? WHERE id_camada = ?`, [cantidad, id_camada]);
      // Update status if 0
      await connection.query(`UPDATE vivero_camadas SET estado = 'Agotada' WHERE id_camada = ? AND cantidad_actual <= 0`, [id_camada]);
    } else if (id_item) {
      const modifier = tipo_movimiento === 'Ingreso' ? '+' : '-';
      await connection.query(`UPDATE vivero_inventario SET cantidad_disponible = cantidad_disponible ${modifier} ? WHERE id_item = ?`, [cantidad, id_item]);
    }

    // Integración con Nómina: Crear registro en labores_diarias para seguimiento
    if (id_empleado_responsable) {
      const categoriaMap = {
        'Salida_Siembra': 'Cultivos',
        'Salida_Poda': 'Cultivos',
        'Salida_Resiembra': 'Cultivos',
        'Venta': 'Semilleros',
        'Obsequio': 'Semilleros',
        'Baja_Enfermedad': 'Cultivos',
        'Ingreso': 'Semilleros'
      };
      const categoria = categoriaMap[tipo_movimiento] || 'Semilleros';

      await connection.query(`
        INSERT INTO labores_diarias
        (id_tenant, categoria, descripcion_labor, fecha_planificada, id_empleado, estado, fecha_completado)
        VALUES (?, ?, ?, CURDATE(), ?, 'Completada', NOW())
      `, [
        tenantId,
        categoria,
        `Vivero: ${tipo_movimiento} - ${cantidad} und. ${observaciones || ''}`.trim(),
        id_empleado_responsable
      ]);
    }

    // Integración Contable: Si es una VENTA, generar asiento de ingreso
    if (tipo_movimiento === 'Venta' && precio_venta_total > 0) {
      const [ctaCaja] = await connection.query("SELECT id_cuenta FROM plan_contable WHERE codigo LIKE '11%' LIMIT 1"); // Caja/Bancos
      const idCuentaCaja = ctaCaja.length ? ctaCaja[0].id_cuenta : 1;
      
      const [ctaIngreso] = await connection.query("SELECT id_cuenta FROM plan_contable WHERE codigo LIKE '4%' LIMIT 1"); // Ingresos
      const idCuentaIngreso = ctaIngreso.length ? ctaIngreso[0].id_cuenta : 4;

      const [tipos] = await connection.query("SELECT id_tipo_comp FROM comprobantes_tipos WHERE nombre LIKE '%Ingreso%' LIMIT 1");
      const idTipo = tipos.length ? tipos[0].id_tipo_comp : 1;

      const [periodos] = await connection.query("SELECT id_periodo FROM periodos_contables WHERE estado = 'Abierto' LIMIT 1");
      const idPeriodo = periodos.length ? periodos[0].id_periodo : 1;

      const concepto = `Venta Vivero: ${observaciones || 'Plántulas/Insumos'}`;
      const descripcionComp = `Venta Vivero Automática: ${concepto.substring(0, 100)}`;
      
      const [insComp] = await connection.query(`
        INSERT INTO contab_comprobantes (id_tenant, id_periodo, id_tipo_comp, numero, descripcion, estado)
        VALUES (?, ?, ?, ?, ?, 'Contabilizado')
      `, [tenantId, idPeriodo, idTipo, `VTA-${result.insertId}`, descripcionComp]);

      const idComp = insComp.insertId;

      const [insDoc] = await connection.query(`
        INSERT INTO contab_documentos (id_tenant, id_comprobante, id_tipo_doc, numero_doc, fecha, concepto, estado, tabla_origen, id_origen)
        VALUES (?, ?, ?, ?, CURDATE(), ?, 'Contabilizado', 'vivero_salidas', ?)
      `, [tenantId, idComp, idTipo, `VTA-${result.insertId}`, concepto, result.insertId]);
      const idDoc = insDoc.insertId;

      await connection.query(`
        INSERT INTO contab_detalles (id_documento, id_cuenta, descripcion, valor_base, debito, credito)
        VALUES 
        (?, ?, 'Ingreso Caja/Bancos Vivero', 0, ?, 0),
        (?, ?, 'Ingreso por Venta Vivero', 0, 0, ?)
      `, [idDoc, idCuentaCaja, precio_venta_total, idDoc, idCuentaIngreso, precio_venta_total]);
    }

    await connection.commit();
    res.json({ success: true, insertId: result.insertId });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error en movimiento de vivero' });
  } finally {
    connection.release();
  }
});

// === 4. SEGUIMIENTO FITOSANITARIO (Vinculado a Labores) ===
router.post('/seguimiento', async (req, res) => {
  const { tenantId, id_camada, fecha_revision, porcentaje_afectacion, tipo_plaga_enfermedad, accion_tomada, id_empleado_revisor } = req.body;
  const connection = await getDb(req).getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO vivero_seguimiento_fitosanitario 
       (id_tenant, id_camada, fecha_revision, porcentaje_afectacion, tipo_plaga_enfermedad, accion_tomada, id_empleado_revisor) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, id_camada, fecha_revision, porcentaje_afectacion, tipo_plaga_enfermedad, accion_tomada, id_empleado_revisor]
    );

    // Create automatically a Labor for applying the "accion_tomada"
    if (accion_tomada) {
      await connection.query(`
        INSERT INTO labores_diarias (id_tenant, categoria, descripcion_labor, fecha_planificada, id_empleado, estado)
        VALUES (?, 'Semilleros', ?, CURDATE(), ?, 'Planificada')
      `, [tenantId, `Aplicar tratamiento: ${accion_tomada} (Enfermedad: ${tipo_plaga_enfermedad})`, id_empleado_revisor]);
    }

    await connection.commit();
    res.json({ insertId: result.insertId });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error registrando seguimiento' });
  } finally {
    connection.release();
  }
});

// === 5. FILTROS PARA VIVEROS ===
router.get('/filtros', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const tF = tenantId ? 'WHERE id_tenant = ?' : '';
    const tQ = tenantId ? [tenantId] : [];

    // Fincas que tienen viveros
    const [fincas] = await getDb(req).query(`
      SELECT DISTINCT f.id_finca, f.nombre
      FROM fincas f
      JOIN viveros v ON f.id_finca = v.id_finca
      ${tenantId ? 'WHERE f.id_tenant = ? AND v.id_tenant = ?' : ''}
    `, tenantId ? [tenantId, tenantId] : []);

    // Viveros
    const [viveros] = await getDb(req).query(`
      SELECT id_vivero, id_finca, nombre, codigo 
      FROM viveros 
      ${tF}
    `, tQ);

    // Tipos de Plantas/Semillas
    const [plantas] = await getDb(req).query(`
      SELECT id_item, nombre, tipo 
      FROM vivero_inventario 
      WHERE tipo IN ('Semilla', 'Planta') ${tenantId ? 'AND id_tenant = ?' : ''}
    `, tQ);

    // Lotes del tenant
    const [lotes] = await getDb(req).query(`
      SELECT l.id_lote, l.codigo, l.nombre, f.nombre as finca_nombre 
      FROM lotes l 
      JOIN nucleos n ON l.id_nucleo = n.id_nucleo 
      JOIN fincas f ON n.id_finca = f.id_finca 
      ${tenantId ? 'WHERE f.id_tenant = ? AND l.activo = 1' : 'WHERE l.activo = 1'}
      ORDER BY f.nombre, l.nombre
    `, tQ);

    res.json({ fincas, viveros, plantas, lotes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching vivero filtros' });
  }
});

// === 6. DASHBOARD GERENCIAL VIVERO ===
router.get('/dashboard', async (req, res) => {
  const { tenantId, id_finca, id_vivero, id_semilla, fecha_inicio, fecha_fin } = req.query;
  try {
    const params = [];
    let filterStr = tenantId ? 'id_tenant = ?' : '1=1';
    if (tenantId) params.push(tenantId);
    
    if (id_vivero) {
      filterStr += ' AND id_vivero = ?';
      params.push(id_vivero);
    } else if (id_finca) {
      // If a finca is selected but no specific vivero, filter by all viveros in that finca
      filterStr += ' AND id_vivero IN (SELECT id_vivero FROM viveros WHERE id_finca = ?)';
      params.push(id_finca);
    }

    if (fecha_inicio && fecha_fin) {
      // Movimientos will use this date filter
    }

    // 1. Destino de Plantas (Movimientos acumulados)
    let qDestinos = `SELECT tipo_movimiento as tipo, SUM(cantidad) as total FROM vivero_movimientos WHERE ${filterStr}`;
    const pDestinos = [...params];
    if (fecha_inicio && fecha_fin) {
      qDestinos += ' AND fecha BETWEEN ? AND ?';
      pDestinos.push(fecha_inicio, fecha_fin);
    }
    qDestinos += ' GROUP BY tipo_movimiento';
    
    const [destinos] = await getDb(req).query(qDestinos, pDestinos);

    // 2. Estado de Camadas Actuales (Con cálculo de edades)
    let qCamadas = `
      SELECT c.id_camada, c.estado, c.cantidad_actual, c.fecha_siembra_bandeja, 
             i.dias_germinacion, i.dias_listo_siembra,
             DATEDIFF(CURDATE(), c.fecha_siembra_bandeja) as dias_transcurridos
      FROM vivero_camadas c
      LEFT JOIN vivero_inventario i ON c.id_item_semilla = i.id_item
      WHERE ${filterStr.replace(/id_/g, 'c.id_').replace(/c\.id_finca/g, 'id_finca')}
    `;
    const pCamadas = [...params];
    if (id_semilla) {
      qCamadas += ' AND c.id_item_semilla = ?';
      pCamadas.push(id_semilla);
    }

    const [camadasRaw] = await getDb(req).query(qCamadas, pCamadas);
    
    // Process camadas to group by dynamically calculated state
    const estadosCamadasMap = {};
    const camadasTimeline = [];

    camadasRaw.forEach(c => {
      let estadoDinamico = c.estado; // Fallback to DB state
      const dias = c.dias_transcurridos || 0;
      const germinacion = c.dias_germinacion || 10; // Default 10 days
      const siembra = c.dias_listo_siembra || 30; // Default 30 days
      
      if (c.estado !== 'Agotada' && c.estado !== 'Perdida') {
        if (dias < germinacion) estadoDinamico = 'En Germinación';
        else if (dias >= germinacion && dias < siembra) estadoDinamico = 'Crecimiento';
        else if (dias >= siembra) estadoDinamico = 'Lista para Siembra';
      }

      estadosCamadasMap[estadoDinamico] = (estadosCamadasMap[estadoDinamico] || 0) + parseFloat(c.cantidad_actual || 0);
      
      camadasTimeline.push({
        id: c.id_camada,
        dias,
        estado: estadoDinamico,
        cantidad: parseFloat(c.cantidad_actual || 0)
      });
    });

    const estadosCamadas = Object.keys(estadosCamadasMap).map(k => ({
      estado: k,
      cantidad: estadosCamadasMap[k]
    }));

    // 3. Valorización Inventario (Stock actual vs Consumo)
    let qInventario = `
      SELECT id_item, tipo, nombre, cantidad_disponible, costo_unitario, (cantidad_disponible * costo_unitario) as valor_total
      FROM vivero_inventario
      WHERE ${filterStr}
    `;
    const pInventario = [...params];
    const [inventarioRaw] = await getDb(req).query(qInventario, pInventario);

    // Get Consumos and other movements to build the Kardex
    let qConsumo = `
      SELECT id_item, tipo_movimiento, SUM(cantidad) as cantidad_movimiento 
      FROM vivero_movimientos 
      WHERE tipo_movimiento IN ('Consumo', 'Salida_Siembra', 'Salida_Resiembra', 'Baja_Enfermedad') AND ${filterStr}
    `;
    const pConsumo = [...params];
    if (fecha_inicio && fecha_fin) {
      qConsumo += ' AND fecha BETWEEN ? AND ?';
      pConsumo.push(fecha_inicio, fecha_fin);
    }
    qConsumo += ' GROUP BY id_item, tipo_movimiento';
    const [consumosRaw] = await getDb(req).query(qConsumo, pConsumo);
    
    const consumosMap = {};
    consumosRaw.forEach(c => {
      if (!consumosMap[c.id_item]) {
        consumosMap[c.id_item] = { consumo: 0, siembra: 0, resiembra: 0, mortalidad: 0 };
      }
      const val = Number(c.cantidad_movimiento);
      if (c.tipo_movimiento === 'Consumo') consumosMap[c.id_item].consumo += val;
      if (c.tipo_movimiento === 'Salida_Siembra') consumosMap[c.id_item].siembra += val;
      if (c.tipo_movimiento === 'Salida_Resiembra') consumosMap[c.id_item].resiembra += val;
      if (c.tipo_movimiento === 'Baja_Enfermedad') consumosMap[c.id_item].mortalidad += val;
    });

    const kardex = inventarioRaw.map(i => {
      const movs = consumosMap[i.id_item] || { consumo: 0, siembra: 0, resiembra: 0, mortalidad: 0 };
      return {
        nombre: i.nombre,
        tipo: i.tipo,
        existencia: Number(i.cantidad_disponible),
        consumo: movs.consumo,
        siembra: movs.siembra,
        resiembra: movs.resiembra,
        mortalidad: movs.mortalidad,
        valor_total: Number(i.valor_total)
      };
    });

    // 4. Trazabilidad de Siembra en Lotes
    let qSiembrasLotes = `
      SELECT l.nombre as lote_nombre, i.nombre as planta_nombre, m.tipo_movimiento, SUM(m.cantidad) as cantidad_sembrada
      FROM vivero_movimientos m
      JOIN vivero_inventario i ON m.id_item = i.id_item
      JOIN lotes l ON m.id_lote_destino = l.id_lote
      WHERE m.tipo_movimiento IN ('Salida_Siembra', 'Salida_Resiembra') AND ${filterStr.replace(/id_vivero/g, 'm.id_vivero').replace(/id_tenant/g, 'm.id_tenant').replace(/m\.m\./g, 'm.')}
    `;
    const pSiembrasLotes = [...params];
    if (fecha_inicio && fecha_fin) {
      qSiembrasLotes += ' AND m.fecha BETWEEN ? AND ?';
      pSiembrasLotes.push(fecha_inicio, fecha_fin);
    }
    qSiembrasLotes += ' GROUP BY l.id_lote, i.id_item, m.tipo_movimiento';
    const [siembrasLotesRaw] = await getDb(req).query(qSiembrasLotes, pSiembrasLotes);

    // Pivot table for lotes (Siembra vs Resiembra)
    const lotesMap = {};
    siembrasLotesRaw.forEach(r => {
      const key = `${r.lote_nombre}_${r.planta_nombre}`;
      if (!lotesMap[key]) {
        lotesMap[key] = {
          lote: r.lote_nombre,
          planta: r.planta_nombre,
          siembra: 0,
          resiembra: 0
        };
      }
      if (r.tipo_movimiento === 'Salida_Siembra') lotesMap[key].siembra += Number(r.cantidad_sembrada);
      if (r.tipo_movimiento === 'Salida_Resiembra') lotesMap[key].resiembra += Number(r.cantidad_sembrada);
    });
    const siembrasPorLote = Object.values(lotesMap);


    // Group for pie chart
    const valorInventarioMap = {};
    inventarioRaw.forEach(i => {
      valorInventarioMap[i.tipo] = (valorInventarioMap[i.tipo] || 0) + Number(i.valor_total);
    });
    const valorInventario = Object.keys(valorInventarioMap).map(k => ({
      tipo: k,
      valor_total: valorInventarioMap[k]
    }));

    res.json({
      destinos,
      estadosCamadas,
      valorInventario,
      kardex,
      camadasTimeline,
      siembrasPorLote
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching vivero dashboard stats' });
  }
});
// === 6. SOLICITUD A BODEGA ===
router.get('/bodega/insumos', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const [insumos] = await getDb(req).query(`
      SELECT i.id_insumo, i.nombre, i.unidad_medida, b.nombre AS bodega_nombre, e.cantidad
      FROM insumos i
      LEFT JOIN inv_existencias e ON i.id_insumo = e.id_insumo
      LEFT JOIN bod_bodegas b ON e.id_bodega = b.id_bodega
      WHERE i.id_tenant = ?
      ORDER BY i.nombre
    `, [tenantId]);

    // Agrupar existencias por insumo
    const insumosMap = {};
    for (const row of insumos) {
      if (!insumosMap[row.id_insumo]) {
        insumosMap[row.id_insumo] = {
          id_insumo: row.id_insumo,
          nombre: row.nombre,
          unidad_medida: row.unidad_medida,
          stockTotal: 0,
          bodegas: []
        };
      }
      if (row.bodega_nombre && row.cantidad > 0) {
        insumosMap[row.id_insumo].stockTotal += Number(row.cantidad);
        insumosMap[row.id_insumo].bodegas.push({
          bodega: row.bodega_nombre,
          cantidad: row.cantidad
        });
      }
    }

    res.json(Object.values(insumosMap));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching insumos' });
  }
});

router.post('/bodega/pedido', async (req, res) => {
  const { tenantId, id_insumo, cantidad, id_empleado_solicitante, observaciones } = req.body;
  const connection = await getDb(req).getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(`
      INSERT INTO solicitudes_pedido (id_tenant, id_empleado_solicitante, area_solicitante, fecha_necesidad, estado, observaciones)
      VALUES (?, ?, 'Vivero', CURDATE(), 'Borrador', ?)
    `, [tenantId, id_empleado_solicitante, observaciones]);

    await connection.query(`
      INSERT INTO solicitudes_detalle (id_solicitud, id_insumo, cantidad_solicitada, observaciones)
      VALUES (?, ?, ?, 'Generado desde Vivero')
    `, [result.insertId, id_insumo, cantidad]);

    await connection.commit();
    res.json({ success: true, id_solicitud: result.insertId });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error creando pedido' });
  } finally {
    connection.release();
  }
});

export default router;
