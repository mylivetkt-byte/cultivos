import { Router } from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';

const router = Router();

// Helper to safely parse tenant ID
const getTenantId = (val) => {
  if (!val || val === 'null' || val === 'undefined') return 1;
  return parseInt(val, 10) || 1;
};

// Buscar insumos por nombre o código
router.get('/insumos/search', async (req, res) => {
  try {
    const { q } = req.query;
    const tenantId = getTenantId(req.query.tenantId);
    if (!q) return res.json([]);
    const likeQ = `%${q}%`;
    const [rows] = await getDb(req).query(
      `SELECT id_insumo, codigo, nombre, unidad_medida, costo_unitario 
       FROM insumos 
       WHERE id_tenant = ? AND (nombre LIKE ? OR codigo LIKE ?) AND estado = 'Activo'
       LIMIT 20`,
      [tenantId, likeQ, likeQ]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error buscando insumos:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener área del empleado
router.get('/empleado-area/:id', async (req, res) => {
  try {
    const [rows] = await getDb(req).query(
      `SELECT area_asignada FROM rrhh_empleados WHERE id_empleado = ?`,
      [req.params.id]
    );
    res.json({ area: rows[0]?.area_asignada || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Guardar solicitud maestro-detalle
router.post('/solicitud', async (req, res) => {
  const { id_finca, id_empleado_solicitante, area_solicitante, prioridad, fecha_necesidad, observaciones, items } = req.body;
  const tenantId = getTenantId(req.body.tenantId);
  
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Debe agregar al menos un insumo al pedido.' });
  }

  const conn = await getDb(req).getConnection();
  try {
    await conn.beginTransaction();

    // Insert header
    const [headerRes] = await conn.query(
      `INSERT INTO solicitudes_pedido 
        (id_tenant, id_finca, id_empleado_solicitante, area_solicitante, prioridad, fecha_necesidad, observaciones, estado) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Borrador')`,
      [tenantId, id_finca || null, id_empleado_solicitante, area_solicitante, prioridad || 'Normal', fecha_necesidad || null, observaciones || null]
    );
    const id_solicitud = headerRes.insertId;

    // Insert details
    for (const item of items) {
      await conn.query(
        `INSERT INTO solicitudes_detalle 
          (id_solicitud, id_insumo, cantidad_solicitada, costo_unitario_estimado, observaciones) 
         VALUES (?, ?, ?, ?, ?)`,
        [id_solicitud, item.id_insumo, item.cantidad, item.costo_unitario, item.observaciones || null]
      );
    }

    await conn.commit();
    res.json({ success: true, id_solicitud });
  } catch (err) {
    await conn.rollback();
    console.error('Error guardando solicitud:', err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Obtener todas las solicitudes (para validador)
router.get('/solicitudes', async (req, res) => {
  const tenantId = getTenantId(req.query.tenantId);
  try {
    const [rows] = await getDb(req).query(`
      SELECT s.*, 
             CONCAT(e.nombres, ' ', e.apellidos) AS empleado_nombre
      FROM solicitudes_pedido s
      LEFT JOIN rrhh_empleados e ON s.id_empleado_solicitante = e.id_empleado
      WHERE s.id_tenant = ?
      ORDER BY s.fecha_solicitud DESC
      LIMIT 100
    `, [tenantId]);

    // get detalles
    for (const r of rows) {
      const [detalles] = await getDb(req).query(`
        SELECT d.*, i.codigo, i.nombre, i.unidad_medida
        FROM solicitudes_detalle d
        JOIN insumos i ON d.id_insumo = i.id_insumo
        WHERE d.id_solicitud = ?
      `, [r.id_solicitud]);
      r.detalles = detalles;
    }
    res.json(rows);
  } catch (err) {
    console.error('Error fetching solicitudes:', err);
    res.status(500).json({ error: err.message });
  }
});


// --- Endpoints restaurados ---

// GET /api/compras/analisis?id_insumo=X
router.get('/analisis', async (req, res) => {
  const { id_insumo, id_tenant } = req.query;
  if (!id_insumo) return res.status(400).json({ error: 'Falta id_insumo' });
  try {
    const [rows] = await getDb(req).query(`
      SELECT 
        oc.fecha_emision as fecha,
        t.nombre_completo as proveedor,
        t.documento as nit_proveedor,
        t.id_tercero as id_proveedor,
        od.precio_unitario,
        od.cantidad_pedida,
        oc.numero_orden
      FROM ordenes_compra_detalle od
      JOIN ordenes_compra oc ON od.id_orden_compra = oc.id_orden_compra
      JOIN terceros t ON oc.id_proveedor = t.id_tercero
      WHERE od.id_insumo = ? AND oc.id_tenant = ?
      ORDER BY oc.fecha_emision DESC
      LIMIT 50
    `, [id_insumo, id_tenant || 1]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/compras/dashboard-stats
router.get('/dashboard-stats', async (req, res) => {
  const { year } = req.query;
  const tenantId = getTenantId(req.query.tenantId);
  const currentYear = year || new Date().getFullYear();
  try {
    // KPIs
    const [kpis] = await getDb(req).query(`
      SELECT 
        COUNT(id_orden_compra) as total_ordenes,
        SUM(CASE WHEN estado = 'Emitida' THEN 1 ELSE 0 END) as emitidas,
        SUM(CASE WHEN estado = 'Parcial' THEN 1 ELSE 0 END) as parciales,
        SUM(CASE WHEN estado = 'Recibida_Total' THEN 1 ELSE 0 END) as recibidas,
        SUM(total) as costo_total
      FROM ordenes_compra 
      WHERE id_tenant = ? AND YEAR(fecha_emision) = ? AND estado != 'Cancelada'
    `, [tenantId, currentYear]);

    // Monthly Trends
    const [monthly] = await getDb(req).query(`
      SELECT 
        DATE_FORMAT(fecha_emision, '%Y-%m') as month,
        SUM(total) as total
      FROM ordenes_compra
      WHERE id_tenant = ? AND YEAR(fecha_emision) = ? AND estado != 'Cancelada'
      GROUP BY month
      ORDER BY month ASC
    `, [tenantId, currentYear]);

    // Top Products
    const [topProducts] = await getDb(req).query(`
      SELECT 
        i.nombre as name,
        SUM(od.cantidad_pedida) as quantity,
        SUM(od.cantidad_pedida * od.precio_unitario) as total_cost
      FROM ordenes_compra_detalle od
      JOIN ordenes_compra oc ON od.id_orden_compra = oc.id_orden_compra
      JOIN insumos i ON od.id_insumo = i.id_insumo
      WHERE oc.id_tenant = ? AND YEAR(oc.fecha_emision) = ? AND oc.estado != 'Cancelada'
      GROUP BY i.id_insumo, i.nombre
      ORDER BY quantity DESC
      LIMIT 10
    `, [tenantId, currentYear]);

    // Top Suppliers
    const [topSuppliers] = await getDb(req).query(`
      SELECT 
        t.nombre_completo as name,
        COUNT(oc.id_orden_compra) as order_count,
        SUM(oc.total) as total_spent
      FROM ordenes_compra oc
      JOIN terceros t ON oc.id_proveedor = t.id_tercero
      WHERE oc.id_tenant = ? AND YEAR(oc.fecha_emision) = ? AND oc.estado != 'Cancelada'
      GROUP BY t.id_tercero, t.nombre_completo
      ORDER BY total_spent DESC
      LIMIT 5
    `, [tenantId, currentYear]);

    res.json({
      success: true,
      kpis: kpis[0],
      monthly,
      topProducts,
      topSuppliers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/compras/orden
router.post('/orden', async (req, res) => {
  const { id_tenant, id_proveedor, fecha_entrega_esperada, detalles, id_usuario } = req.body;
  const connection = await getDb(req).getConnection();
  try {
    await connection.beginTransaction();
    const numero_orden = `OC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    let subtotal = 0;
    for (const d of detalles) subtotal += (d.cantidad * d.precio);
    const [resOc] = await connection.query(`
      INSERT INTO ordenes_compra (id_tenant, id_proveedor, numero_orden, fecha_emision, fecha_entrega_esperada, subtotal, total, estado, usuario_creacion)
      VALUES (?, ?, ?, CURDATE(), ?, ?, ?, 'Emitida', ?)
    `, [id_tenant || 1, id_proveedor, numero_orden, fecha_entrega_esperada || null, subtotal, subtotal, id_usuario || null]);
    const id_orden = resOc.insertId;
    for (const d of detalles) {
      await connection.query(`INSERT INTO ordenes_compra_detalle (id_orden_compra, id_insumo, cantidad_pedida, precio_unitario) VALUES (?, ?, ?, ?)`, [id_orden, d.id_insumo, d.cantidad, d.precio]);
    }
    await connection.commit();
    res.json({ success: true, numero_orden, id_orden_compra: id_orden });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/compras/ordenes-pendientes-recepcion — Órdenes pendientes con info de proveedor y solicitante
router.get('/ordenes-pendientes-recepcion', async (req, res) => {
  const { startDate, endDate, producto, proveedor } = req.query;
  const tenantId = getTenantId(req.query.id_tenant);
  try {
    let sql = `
      SELECT o.id_orden_compra, o.numero_orden, o.fecha_emision, o.fecha_entrega_esperada,
             o.subtotal, o.iva, o.total, o.estado,
             MAX(t.nombre_completo) AS proveedor, MAX(t.documento) AS nit_proveedor, MAX(t.telefono) AS telefono_proveedor,
             MAX(u.username) AS usuario_creador, MAX(u.nombres) AS nombres_creador, MAX(u.apellidos) AS apellidos_creador,
             MAX(s.id_solicitud) AS numero_solicitud, MAX(s.prioridad) AS prioridad, MAX(s.fecha_necesidad) AS fecha_necesidad,
             MAX(e.nombres) AS empleado_solicitante, MAX(e.apellidos) AS apellido_solicitante, MAX(s.area_solicitante) AS area_solicitante
      FROM ordenes_compra o
      JOIN terceros t ON o.id_proveedor = t.id_tercero
      LEFT JOIN usuarios u ON o.usuario_creador = u.id_usuario
      LEFT JOIN ordenes_compra_detalle od ON od.id_orden_compra = o.id_orden_compra
      LEFT JOIN solicitudes_detalle sd ON sd.id_detalle_solicitud = od.id_detalle_solicitud
      LEFT JOIN solicitudes_pedido s ON s.id_solicitud = sd.id_solicitud
      LEFT JOIN rrhh_empleados e ON s.id_empleado_solicitante = e.id_empleado
      LEFT JOIN insumos i ON od.id_insumo = i.id_insumo
      WHERE o.id_tenant = ? AND o.estado IN ('Emitida','Confirmada','Parcial')
    `;
    const params = [tenantId];
    console.log('[COMPRAS PENDIENTES RECEPCION] tenantId received:', req.query.id_tenant, 'parsed to:', tenantId);

    if (startDate && endDate) {
      sql += ` AND o.fecha_emision BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }
    if (proveedor) {
      sql += ` AND (t.documento LIKE ? OR t.nombre_completo LIKE ?)`;
      params.push(`%${proveedor}%`, `%${proveedor}%`);
    }
    if (producto) {
      sql += ` AND (i.codigo LIKE ? OR i.nombre LIKE ?)`;
      params.push(`%${producto}%`, `%${producto}%`);
    }

    sql += ` GROUP BY o.id_orden_compra ORDER BY o.fecha_emision DESC`;

    const [rows] = await getDb(req).query(sql, params);
    console.log('[COMPRAS PENDIENTES RECEPCION] Rows found:', rows.length);

    for (const r of rows) {
      const [det] = await getDb(req).query(`
        SELECT od.id_detalle, od.id_insumo, i.nombre AS insumo_nombre, i.codigo AS insumo_codigo,
               i.unidad_medida, od.cantidad_pedida, od.cantidad_recibida, od.precio_unitario,
               ROUND(od.cantidad_pedida - od.cantidad_recibida, 2) AS pendiente
        FROM ordenes_compra_detalle od
        JOIN insumos i ON od.id_insumo = i.id_insumo
        WHERE od.id_orden_compra = ?
      `, [r.id_orden_compra]);
      r.detalles = det;
    }
    res.json(rows);
  } catch (err) {
    console.error('Error fetching ordenes pendientes recepcion:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compras/ordenes-pendientes — legacy endpoint
router.get('/ordenes-pendientes', async (req, res) => {
  const { id_tenant } = req.query;
  try {
    const [rows] = await getDb(req).query(`
      SELECT o.id_orden_compra, o.numero_orden, o.fecha_emision, o.total, o.estado,
             t.nombre_completo AS proveedor
      FROM ordenes_compra o
      JOIN terceros t ON o.id_proveedor = t.id_tercero
      WHERE o.id_tenant = ? AND o.estado IN ('Emitida','Confirmada','Parcial')
      ORDER BY o.fecha_emision DESC
    `, [id_tenant || 1]);
    for (const r of rows) {
      const [det] = await getDb(req).query(`
        SELECT od.id_detalle, od.id_insumo, i.nombre, i.codigo, i.unidad_medida,
               od.cantidad_pedida, od.cantidad_recibida, od.precio_unitario
        FROM ordenes_compra_detalle od
        JOIN insumos i ON od.id_insumo = i.id_insumo
        WHERE od.id_orden_compra = ?
      `, [r.id_orden_compra]);
      r.detalles = det;
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/compras/recepciones — Crear recepción usando inv_documentos + movimientos_inventario + inv_existencias
router.post('/recepciones', async (req, res) => {
  const {
    id_tenant, id_orden_compra, id_bodega_destino, id_usuario_recibe, id_empleado_recibe,
    conductor_nombre, conductor_cedula, placa_vehiculo,
    numero_guias_remision, numero_documento_proveedor, observaciones_generales, detalles
  } = req.body;

  if (!detalles || detalles.length === 0) {
    return res.status(400).json({ error: 'Debe agregar al menos un ítem a la recepción.' });
  }

  const conn = await getDb(req).getConnection();
  try {
    await conn.beginTransaction();

    // 1. Get type ENT (Entrada de Inventario)
    const [tipos] = await conn.query(`SELECT * FROM inv_tipos_documento WHERE codigo = 'ENT' AND id_tenant = ?`, [id_tenant || 1]);
    if (tipos.length === 0) throw new Error('Tipo de documento ENT no encontrado');
    const tipo = tipos[0];

    // 2. Generate consecutive
    const consecutivo = `ENT-${tipo.consecutivo_actual.toString().padStart(5, '0')}`;
    await conn.query('UPDATE inv_tipos_documento SET consecutivo_actual = consecutivo_actual + 1 WHERE id_tipo = ?', [tipo.id_tipo]);

    // 3. Get proveedor from orden
    const [ordenRow] = await conn.query(`SELECT id_proveedor FROM ordenes_compra WHERE id_orden_compra = ?`, [id_orden_compra]);
    const id_proveedor = ordenRow[0]?.id_proveedor;

    // 4. Build observations with delivery info
    const obsParts = [];
    if (conductor_nombre) obsParts.push(`Conductor: ${conductor_nombre}`);
    if (conductor_cedula) obsParts.push(`Cedula: ${conductor_cedula}`);
    if (placa_vehiculo) obsParts.push(`Placa: ${placa_vehiculo}`);
    if (numero_guias_remision) obsParts.push(`Guia: ${numero_guias_remision}`);
    if (numero_documento_proveedor) obsParts.push(`Doc Proveedor: ${numero_documento_proveedor}`);
    if (observaciones_generales) obsParts.push(observaciones_generales);
    const observaciones = obsParts.join(' | ');

    // 5. Create inv_documentos (Entrada)
    const [docRes] = await conn.query(`
      INSERT INTO inv_documentos
        (id_tenant, id_tipo, consecutivo, id_bodega_destino, estado, observaciones,
         id_usuario_crea, id_empleado_recibe, persona_reclama)
      VALUES (?, ?, ?, ?, 'Aplicado', ?, ?, ?, ?)
    `, [
      id_tenant || 1, tipo.id_tipo, consecutivo, id_bodega_destino || null,
      observaciones, id_usuario_recibe || 1, id_empleado_recibe || null,
      conductor_nombre || null
    ]);
    const id_documento = docRes.insertId;

    // 6. Process each item
    let costo_total = 0;
    let allComplete = true;

    for (const d of detalles) {
      const costo_item = d.cantidad_recibida * d.precio_unitario;
      costo_total += costo_item;

      // 6a. Update orden_compra_detalle.cantidad_recibida
      await conn.query(
        `UPDATE ordenes_compra_detalle SET cantidad_recibida = cantidad_recibida + ? WHERE id_detalle = ?`,
        [d.cantidad_recibida, d.id_detalle_orden]
      );

      // 6b. Update insumos.stock_actual
      await conn.query(
        `UPDATE insumos SET stock_actual = COALESCE(stock_actual, 0) + ? WHERE id_insumo = ?`,
        [d.cantidad_recibida, d.id_insumo]
      );

      // 6c. Update inv_existencias (per-warehouse stock with weighted average cost)
      await conn.query(`
        INSERT INTO inv_existencias (id_bodega, id_insumo, cantidad, costo_promedio)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          costo_promedio = ((cantidad * costo_promedio) + (? * ?)) / (cantidad + ?),
          cantidad = cantidad + ?
      `, [
        id_bodega_destino, d.id_insumo, d.cantidad_recibida, d.precio_unitario || 0,
        d.cantidad_recibida, d.precio_unitario || 0, d.cantidad_recibida, d.cantidad_recibida
      ]);

      // 6d. Create movimientos_inventario (kardex entry)
      await conn.query(`
        INSERT INTO movimientos_inventario
          (id_tenant, id_insumo, tipo_movimiento, cantidad, costo_unitario,
           documento_referencia, usuario_responsable, id_bodega, id_documento, id_empleado, observaciones)
        VALUES (?, ?, 'Entrada', ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id_tenant || 1, d.id_insumo, d.cantidad_recibida, d.precio_unitario || 0,
        consecutivo, id_usuario_recibe || 1, id_bodega_destino, id_documento,
        id_empleado_recibe || null, d.observaciones_item || null
      ]);

      // 6e. Check if order is complete
      const [check] = await conn.query(
        `SELECT cantidad_pedida, cantidad_recibida FROM ordenes_compra_detalle WHERE id_detalle = ?`,
        [d.id_detalle_orden]
      );
      if (check[0] && check[0].cantidad_recibida < check[0].cantidad_pedida) {
        allComplete = false;
      }
    }

    // 7. Update orden_compra estado
    await conn.query(
      `UPDATE ordenes_compra SET estado = ? WHERE id_orden_compra = ?`,
      [allComplete ? 'Recibida_Total' : 'Parcial', id_orden_compra]
    );

    await conn.commit();
    res.json({ success: true, id_documento, consecutivo });
  } catch (err) {
    await conn.rollback();
    console.error('Error creando recepción:', err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// GET /api/compras/recepciones — Listar documentos de tipo Entrada
router.get('/recepciones', async (req, res) => {
  const { estado } = req.query;
  const tenantId = getTenantId(req.query.id_tenant);
  try {
    let sql = `
      SELECT d.*, t.codigo AS tipo_codigo, t.nombre AS tipo_nombre,
             u.username AS usuario_crea_nombre,
             CONCAT(e.nombres, ' ', e.apellidos) AS empleado_recibe_nombre,
             b.nombre AS bodega_destino_nombre
      FROM inv_documentos d
      JOIN inv_tipos_documento t ON d.id_tipo = t.id_tipo
      JOIN usuarios u ON d.id_usuario_crea = u.id_usuario
      LEFT JOIN rrhh_empleados e ON d.id_empleado_recibe = e.id_empleado
      LEFT JOIN bod_bodegas b ON d.id_bodega_destino = b.id_bodega
      WHERE d.id_tenant = ? AND t.codigo = 'ENT'
    `;
    const params = [tenantId];
    if (estado) {
      sql += ` AND d.estado = ?`;
      params.push(estado);
    }
    sql += ` ORDER BY d.fecha DESC LIMIT 100`;

    const [rows] = await getDb(req).query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compras/recepciones/:id — Detalle de un documento de entrada
router.get('/recepciones/:id', async (req, res) => {
  const { id } = req.params;
  const tenantId = getTenantId(req.query.id_tenant);
  try {
    const [header] = await getDb(req).query(`
      SELECT d.*, t.codigo AS tipo_codigo, t.nombre AS tipo_nombre,
             u.username AS usuario_crea_nombre,
             CONCAT(e.nombres, ' ', e.apellidos) AS empleado_recibe_nombre,
             b.nombre AS bodega_destino_nombre
      FROM inv_documentos d
      JOIN inv_tipos_documento t ON d.id_tipo = t.id_tipo
      JOIN usuarios u ON d.id_usuario_crea = u.id_usuario
      LEFT JOIN rrhh_empleados e ON d.id_empleado_recibe = e.id_empleado
      LEFT JOIN bod_bodegas b ON d.id_bodega_destino = b.id_bodega
      WHERE d.id_documento = ? AND d.id_tenant = ?
    `, [id, tenantId]);

    if (!header.length) return res.status(404).json({ error: 'Documento no encontrado' });

    const [movimientos] = await getDb(req).query(`
      SELECT m.*, i.nombre AS insumo_nombre, i.codigo AS insumo_codigo, i.unidad_medida
      FROM movimientos_inventario m
      JOIN insumos i ON m.id_insumo = i.id_insumo
      WHERE m.id_documento = ?
    `, [id]);

    res.json({ ...header[0], movimientos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compras/solicitudes
router.get('/solicitudes', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const [rows] = await getDb(req).query(`SELECT s.*, \'Empleado\' as empleado_nombre FROM solicitudes_pedido s WHERE s.id_tenant = ? ORDER BY s.fecha_solicitud DESC`, [tenantId || 1]);
    for (const r of rows) {
      const [det] = await getDb(req).query(`SELECT d.*, i.nombre, i.codigo, i.unidad_medida FROM solicitudes_detalle d JOIN insumos i ON d.id_insumo = i.id_insumo WHERE d.id_solicitud = ?`, [r.id_solicitud]);
      r.detalles = det;
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});


export default router;
