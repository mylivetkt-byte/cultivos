import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

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
    const [rows] = await getDb(req).query(`SELECT * FROM vivero_inventario ${tenantFilter(req)} ORDER BY tipo, nombre`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching inventario' });
  }
});

router.post('/inventario', async (req, res) => {
  const { tenantId, tipo, nombre, proveedor, cantidad_disponible, unidad_medida, costo_unitario } = req.body;
  try {
    const [result] = await getDb(req).query(
      `INSERT INTO vivero_inventario (id_tenant, tipo, nombre, proveedor, cantidad_disponible, unidad_medida, costo_unitario) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, tipo, nombre, proveedor, cantidad_disponible, unidad_medida, costo_unitario]
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
    const [rows] = await getDb(req).query(`
      SELECT c.*, i.nombre as nombre_semilla 
      FROM vivero_camadas c
      JOIN vivero_inventario i ON c.id_item_semilla = i.id_item
      ${tenantFilter(req, 'c')}
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
  const { tenantId, id_item_semilla, codigo_camada, fecha_siembra_bandeja, fecha_germinacion_esperada, cantidad_sembrada, ubicacion_vivero } = req.body;
  try {
    // Start transaction to also deduct seeds from inventory
    await getDb(req).query('START TRANSACTION');

    const [result] = await getDb(req).query(
      `INSERT INTO vivero_camadas 
       (id_tenant, id_item_semilla, codigo_camada, fecha_siembra_bandeja, fecha_germinacion_esperada, cantidad_sembrada, cantidad_actual, ubicacion_vivero) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, id_item_semilla, codigo_camada, fecha_siembra_bandeja, fecha_germinacion_esperada, cantidad_sembrada, cantidad_sembrada, ubicacion_vivero]
    );

    // Deduct seeds (we assume 1 seed per plant for simplicity, though unit might be kg)
    await getDb(req).query(
      `UPDATE vivero_inventario SET cantidad_disponible = cantidad_disponible - ? WHERE id_item = ?`,
      [cantidad_sembrada, id_item_semilla]
    );

    await getDb(req).query('COMMIT');
    res.json({ insertId: result.insertId });
  } catch (err) {
    await getDb(req).query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error creating camada' });
  }
});

// === 3. MOVIMIENTOS Y VENTAS (Integración Contable) ===
router.get('/movimientos', async (req, res) => {
  try {
    const tenantId = req.query.tenantId;
    const tF = tenantId ? 'WHERE m.id_tenant = ?' : '';
    const params = tenantId ? [tenantId] : [];

    const [rows] = await getDb(req).query(`
      SELECT m.*,
             e.nombres AS empleado_nombres, e.apellidos AS empleado_apellidos, rc.descripcion AS empleado_cargo,
             c.codigo_camada, c.nombre_semilla,
             l.descripcion_labor, l.estado AS labor_estado, l.fecha_completado AS labor_fecha_completado
      FROM vivero_movimientos m
      LEFT JOIN rrhh_empleados e ON m.id_empleado_responsable = e.id_empleado
       LEFT JOIN rrhh_cargos rc ON e.id_cargo = rc.id_cargo
      LEFT JOIN vivero_camadas c ON m.id_camada = c.id_camada
      LEFT JOIN labores_diarias l ON l.id_tenant = m.id_tenant
        AND l.categoria IN ('Viveros', 'Semilleros')
        AND l.descripcion_labor LIKE CONCAT('%Vivero:%', m.tipo_movimiento, '%')
        AND DATE(l.fecha_planificada) = DATE(m.fecha)
        AND l.id_empleado = m.id_empleado_responsable
      ${tF}
      ORDER BY m.fecha DESC
      LIMIT 200
    `, params);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching movimientos' });
  }
});

router.post('/movimientos', async (req, res) => {
  const { tenantId, id_camada, id_item, tipo_movimiento, cantidad, id_empleado_responsable, observaciones, precio_venta_total } = req.body;
  try {
    await getDb(req).query('START TRANSACTION');

    const [result] = await getDb(req).query(
      `INSERT INTO vivero_movimientos 
       (id_tenant, id_camada, id_item, tipo_movimiento, cantidad, id_empleado_responsable, observaciones, precio_venta_total) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, id_camada, id_item, tipo_movimiento, cantidad, id_empleado_responsable, observaciones, precio_venta_total || 0]
    );

    // Deduct from inventory or camada
    if (id_camada) {
      await getDb(req).query(`UPDATE vivero_camadas SET cantidad_actual = cantidad_actual - ? WHERE id_camada = ?`, [cantidad, id_camada]);
      // Update status if 0
      await getDb(req).query(`UPDATE vivero_camadas SET estado = 'Agotada' WHERE id_camada = ? AND cantidad_actual <= 0`, [id_camada]);
    } else if (id_item) {
      const modifier = tipo_movimiento === 'Ingreso' ? '+' : '-';
      await getDb(req).query(`UPDATE vivero_inventario SET cantidad_disponible = cantidad_disponible ${modifier} ? WHERE id_item = ?`, [cantidad, id_item]);
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

      await getDb(req).query(`
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
      const [ctaCaja] = await getDb(req).query("SELECT id_cuenta FROM plan_contable WHERE codigo LIKE '11%' LIMIT 1"); // Caja/Bancos
      const idCuentaCaja = ctaCaja.length ? ctaCaja[0].id_cuenta : 1;
      
      const [ctaIngreso] = await getDb(req).query("SELECT id_cuenta FROM plan_contable WHERE codigo LIKE '4%' LIMIT 1"); // Ingresos
      const idCuentaIngreso = ctaIngreso.length ? ctaIngreso[0].id_cuenta : 4;

      const [tipos] = await getDb(req).query("SELECT id_tipo_comp FROM comprobantes_tipos WHERE nombre LIKE '%Ingreso%' LIMIT 1");
      const idTipo = tipos.length ? tipos[0].id_tipo_comp : 1;

      const [periodos] = await getDb(req).query("SELECT id_periodo FROM periodos_contables WHERE estado = 'Abierto' LIMIT 1");
      const idPeriodo = periodos.length ? periodos[0].id_periodo : 1;

      const concepto = `Venta Vivero: ${observaciones || 'Plántulas/Insumos'}`;
      
      const [insComp] = await getDb(req).query(`
        INSERT INTO comprobantes (id_tenant, id_tipo_comp, id_periodo, consecutivo, fecha, concepto, total, estado)
        VALUES (?, ?, ?, ?, CURDATE(), ?, ?, 'Contabilizado')
      `, [tenantId, idTipo, idPeriodo, `VTA-${result.insertId}`, concepto, precio_venta_total]);

      const idComp = insComp.insertId;

      await getDb(req).query(`
        INSERT INTO comprobantes_detalle (id_comprobante, id_cuenta, debito, credito, descripcion)
        VALUES 
        (?, ?, ?, 0, 'Ingreso Caja/Bancos Vivero'),
        (?, ?, 0, ?, 'Ingreso por Venta Vivero')
      `, [idComp, idCuentaCaja, precio_venta_total, idComp, idCuentaIngreso, precio_venta_total]);
    }

    await getDb(req).query('COMMIT');
    res.json({ success: true, insertId: result.insertId });
  } catch (err) {
    await getDb(req).query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error en movimiento de vivero' });
  }
});

// === 4. SEGUIMIENTO FITOSANITARIO (Vinculado a Labores) ===
router.post('/seguimiento', async (req, res) => {
  const { tenantId, id_camada, fecha_revision, porcentaje_afectacion, tipo_plaga_enfermedad, accion_tomada, id_empleado_revisor } = req.body;
  try {
    await getDb(req).query('START TRANSACTION');

    const [result] = await getDb(req).query(
      `INSERT INTO vivero_seguimiento_fitosanitario 
       (id_tenant, id_camada, fecha_revision, porcentaje_afectacion, tipo_plaga_enfermedad, accion_tomada, id_empleado_revisor) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, id_camada, fecha_revision, porcentaje_afectacion, tipo_plaga_enfermedad, accion_tomada, id_empleado_revisor]
    );

    // Create automatically a Labor for applying the "accion_tomada"
    if (accion_tomada) {
      await getDb(req).query(`
        INSERT INTO labores_diarias (id_tenant, categoria, descripcion_labor, fecha_planificada, id_empleado, estado)
        VALUES (?, 'Semilleros', ?, CURDATE(), ?, 'Planificada')
      `, [tenantId, `Aplicar tratamiento: ${accion_tomada} (Enfermedad: ${tipo_plaga_enfermedad})`, id_empleado_revisor]);
    }

    await getDb(req).query('COMMIT');
    res.json({ insertId: result.insertId });
  } catch (err) {
    await getDb(req).query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error registrando seguimiento' });
  }
});

// === 5. DASHBOARD GERENCIAL VIVERO ===
router.get('/dashboard', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const tQ = tenantId ? [tenantId] : [];
    const tF = tenantId ? 'WHERE id_tenant = ?' : '';

    // 1. Destino de Plantas (Movimientos acumulados)
    const [destinos] = await getDb(req).query(`
      SELECT tipo_movimiento as tipo, SUM(cantidad) as total
      FROM vivero_movimientos
      ${tF}
      GROUP BY tipo_movimiento
    `, tQ);

    // 2. Estado de Camadas Actuales
    const [estadosCamadas] = await getDb(req).query(`
      SELECT estado, SUM(cantidad_actual) as cantidad
      FROM vivero_camadas
      ${tF}
      GROUP BY estado
    `, tQ);

    // 3. Valorización Inventario (Cantidad * Costo)
    const [valorInventario] = await getDb(req).query(`
      SELECT tipo, SUM(cantidad_disponible * costo_unitario) as valor_total
      FROM vivero_inventario
      ${tF}
      GROUP BY tipo
    `, tQ);

    res.json({
      destinos,
      estadosCamadas,
      valorInventario
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching vivero dashboard stats' });
  }
});

export default router;
