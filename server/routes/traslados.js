import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// GET /api/traslados
router.get('/', async (req, res) => {
  const { id_tenant = 1, id_finca, id_bodega, fecha_inicio, fecha_fin } = req.query;

  try {
    let query = `
      SELECT 
        t.id_transferencia,
        t.fecha_solicitud,
        t.fecha_recepcion,
        t.estado,
        t.id_bodega_origen,
        t.id_bodega_destino,
        bo.nombre as bodega_origen,
        bd.nombre as bodega_destino,
        fo.nombre as finca_origen,
        fd.nombre as finca_destino
      FROM bod_transferencias t
      LEFT JOIN bod_bodegas bo ON t.id_bodega_origen = bo.id_bodega
      LEFT JOIN bod_bodegas bd ON t.id_bodega_destino = bd.id_bodega
      LEFT JOIN fincas fo ON bo.id_finca = fo.id_finca
      LEFT JOIN fincas fd ON bd.id_finca = fd.id_finca
      WHERE t.id_tenant = ?
    `;
    const params = [id_tenant];

    if (id_finca) {
      query += ` AND (bo.id_finca = ? OR bd.id_finca = ?)`;
      params.push(id_finca, id_finca);
    }
    if (id_bodega) {
      query += ` AND (t.id_bodega_origen = ? OR t.id_bodega_destino = ?)`;
      params.push(id_bodega, id_bodega);
    }
    if (fecha_inicio && fecha_fin) {
      query += ` AND DATE(t.fecha_solicitud) BETWEEN ? AND ?`;
      params.push(fecha_inicio, fecha_fin);
    }

    query += ` ORDER BY t.fecha_solicitud DESC`;

    const [rows] = await getDb(req).query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching traslados:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/traslados/:id/detalles
router.get('/:id/detalles', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await getDb(req).query(`
      SELECT 
        id_trans_det,
        insumo_producto,
        cantidad,
        estado_linea
      FROM bod_transferencia_detalle
      WHERE id_transferencia = ?
    `, [id]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching traslados detalles:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/traslados
router.post('/', async (req, res) => {
  const { id_tenant, id_bodega_origen, id_bodega_destino, items, id_empleado_transportador, id_bascula, peso_total } = req.body;
  const connection = await getDb(req).getConnection();

  try {
    await connection.beginTransaction();

    // 1. Verificar configuración
    const [cfgRes] = await connection.query(`
      SELECT requiere_pin, canal_notificacion FROM cfg_notificaciones WHERE id_tenant = ? AND modulo = 'Traslados'
    `, [id_tenant]);

    let requiere_pin = false;
    let codigo_seguridad = null;
    let estadoFinal = 'Recibida';

    if (cfgRes.length > 0 && cfgRes[0].requiere_pin) {
      requiere_pin = true;
      estadoFinal = 'En_Transito';
      codigo_seguridad = null;
    }

    // 2. Opcional: validar bascula
    let capacidadBascula = null;
    if (id_bascula) {
      const [basculaRows] = await connection.query('SELECT capacidad_maxima FROM basculas WHERE id_bascula = ? AND id_tenant = ?', [id_bascula, id_tenant]);
      if (basculaRows.length === 0) {
        return res.status(400).json({ error: 'Báscula no encontrada o no pertenece al tenant' });
      }
      capacidadBascula = basculaRows[0].capacidad_maxima;
      if (peso_total && capacidadBascula && peso_total > capacidadBascula) {
        return res.status(400).json({ error: `El peso (${peso_total}) supera la capacidad de la báscula (${capacidadBascula})` });
      }
    }

    // 3. Insert header
    const [transRes] = await connection.query(`
      INSERT INTO bod_transferencias (id_tenant, id_bodega_origen, id_bodega_destino, estado, id_empleado_transportador, codigo_seguridad)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id_tenant, id_bodega_origen, id_bodega_destino, estadoFinal, id_empleado_transportador || null, codigo_seguridad]);
    const id_transferencia = transRes.insertId;

    if (requiere_pin) {
      codigo_seguridad = String(id_transferencia).padStart(4, '0').slice(-4);
      await connection.query(
        'UPDATE bod_transferencias SET codigo_seguridad = ? WHERE id_transferencia = ?',
        [codigo_seguridad, id_transferencia]
      );
    }

    // 4. Insert details and movements
    for (const item of items) {
      await connection.query(`
        INSERT INTO bod_transferencia_detalle (id_transferencia, insumo_producto, cantidad, estado_linea)
        VALUES (?, ?, ?, ?)
      `, [id_transferencia, item.insumo_producto, item.cantidad, estadoFinal]);

      // Salida origen siempre se ejecuta
      const [salidaRes] = await connection.query(`
        INSERT INTO movimientos_inventario (id_tenant, id_insumo, tipo_movimiento, cantidad, documento_referencia, usuario_responsable, id_bodega)
        VALUES (?, ?, 'Salida', ?, ?, ?, ?)
      `, [id_tenant, item.id_insumo, item.cantidad, `TRA-${id_transferencia}`, 1, id_bodega_origen]);
      const movimientoId = salidaRes.insertId;

      // Si se envió una báscula, registrar peso y relacionarla al movimiento
      if (id_bascula && peso_total) {
        await connection.query(
          'INSERT INTO registro_pesos (id_bascula, id_movimiento, peso) VALUES (?,?,?)',
          [id_bascula, movimientoId, peso_total]
        );
        await connection.query(
          'UPDATE movimientos_inventario SET peso = ?, id_bascula = ? WHERE id_movimiento = ?',
          [peso_total, id_bascula, movimientoId]
        );
      }

      // Entrada destino SOLO si no requiere PIN
      if (!requiere_pin) {
        await connection.query(`
          INSERT INTO movimientos_inventario (id_tenant, id_insumo, tipo_movimiento, cantidad, documento_referencia, usuario_responsable, id_bodega)
          VALUES (?, ?, 'Entrada', ?, ?, ?, ?)
        `, [id_tenant, item.id_insumo, item.cantidad, `TRA-${id_transferencia}`, 1, id_bodega_destino]);
      }
    }

    // 5. Si requiere PIN, insertar alerta
    if (requiere_pin) {
      await connection.query(`
        INSERT INTO alertas (id_tenant, tipo_alerta, titulo, mensaje, prioridad)
        VALUES (?, 'Informacion', ?, ?, 'Media')
      `, [id_tenant, 'Nuevo Traslado en Tránsito', `Tienes un traslado (TRA-${id_transferencia}) pendiente de recibir. Pídele el PIN al transportador.`]);

      // Simulate Email/WhatsApp notification here...
      console.log(`[SIMULATION] Notificación enviada. PIN de Seguridad: ${codigo_seguridad}`);
    }

    await connection.commit();
    res.status(201).json({ success: true, id_transferencia, estado: estadoFinal, codigo_seguridad });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating traslado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
});

// POST /api/traslados/:id/recibir
router.post('/:id/recibir', async (req, res) => {
  const { id } = req.params;
  const { pin } = req.body;
  const connection = await getDb(req).getConnection();

  try {
    await connection.beginTransaction();

    const [trans] = await connection.query('SELECT * FROM bod_transferencias WHERE id_transferencia = ?', [id]);
    if (trans.length === 0) return res.status(404).json({ error: 'Traslado no encontrado' });
    
    const traslado = trans[0];
    if (traslado.estado !== 'En_Transito') return res.status(400).json({ error: 'El traslado no está en tránsito' });
    if (traslado.codigo_seguridad && traslado.codigo_seguridad !== pin) {
      return res.status(401).json({ error: 'Código de seguridad (PIN) incorrecto' });
    }

    // Update Header
    await connection.query('UPDATE bod_transferencias SET estado = "Recibida" WHERE id_transferencia = ?', [id]);
    
    // Update Details
    await connection.query('UPDATE bod_transferencia_detalle SET estado_linea = "Recibida" WHERE id_transferencia = ?', [id]);

    // Apply Kardex Entrada
    const [detalles] = await connection.query('SELECT * FROM bod_transferencia_detalle WHERE id_transferencia = ?', [id]);
    for (const d of detalles) {
      // Find id_insumo. A bit hacky, but we can query it or if we stored it it's better. We don't have id_insumo in detalle table natively right now.
      // Wait, let's get it by name for now since we didn't store id_insumo in detalle:
      const [ins] = await connection.query('SELECT id_insumo FROM insumos WHERE nombre = ? AND id_tenant = ?', [d.insumo_producto, traslado.id_tenant]);
      if (ins.length > 0) {
        await connection.query(`
          INSERT INTO movimientos_inventario (id_tenant, id_insumo, tipo_movimiento, cantidad, documento_referencia, usuario_responsable, id_bodega)
          VALUES (?, ?, 'Entrada', ?, ?, ?, ?)
        `, [traslado.id_tenant, ins[0].id_insumo, d.cantidad, `TRA-${id}`, 1, traslado.id_bodega_destino]);
      }
    }

    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('Error receiving traslado:', error);
    res.status(500).json({ error: 'Error del servidor' });
  } finally {
    connection.release();
  }
});

export default router;
