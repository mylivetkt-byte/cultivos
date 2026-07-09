import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// 1. Obtener lista de pedidos con filtros
router.get('/', async (req, res) => {
  const { tenantId, fechaInicio, fechaFin, estado, tipoOrigen } = req.query;
  if (!tenantId) return res.status(400).json({ error: 'Falta tenantId' });

  try {
    let sql = `
      SELECT p.*, b.nombre as bodega_provee, 
        (SELECT COUNT(*) FROM inv_pedidos_detalle d WHERE d.id_pedido = p.id_pedido) as total_items
      FROM inv_pedidos p
      LEFT JOIN bod_bodegas b ON p.id_bodega_provee = b.id_bodega
      WHERE p.id_tenant = ?
    `;
    const params = [tenantId];

    if (estado && estado !== 'Todos') {
      sql += ` AND p.estado = ?`;
      params.push(estado);
    }
    if (tipoOrigen && tipoOrigen !== 'Todas') {
      sql += ` AND p.tipo_origen = ?`;
      params.push(tipoOrigen);
    }
    if (fechaInicio && fechaFin) {
      sql += ` AND DATE(p.fecha_solicitud) BETWEEN ? AND ?`;
      params.push(fechaInicio, fechaFin);
    }

    sql += ` ORDER BY p.fecha_solicitud DESC`;

    const [pedidos] = await getDb(req).query(sql, params);
    res.json({ success: true, pedidos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Obtener detalle de un pedido
router.get('/:id/detalles', async (req, res) => {
  const { id } = req.params;
  try {
    const [detalles] = await getDb(req).query(`
      SELECT d.*, i.codigo, i.nombre, i.unidad_medida, i.imagen_url
      FROM inv_pedidos_detalle d
      JOIN insumos i ON d.id_insumo = i.id_insumo
      WHERE d.id_pedido = ?
    `, [id]);
    res.json({ success: true, detalles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Crear nuevo pedido (Requisición)
router.post('/', async (req, res) => {
  const { tenantId, id_bodega_provee, tipo_origen, id_origen, nombre_solicitante, observaciones, items, fecha_requerida } = req.body;
  
  const conn = await getDb(req).getConnection();
  try {
    await conn.beginTransaction();

    const [resHeader] = await conn.query(`
      INSERT INTO inv_pedidos (id_tenant, id_bodega_provee, tipo_origen, id_origen, nombre_solicitante, observaciones, estado, fecha_requerida)
      VALUES (?, ?, ?, ?, ?, ?, 'Pendiente_Aprobacion', ?)
    `, [tenantId, id_bodega_provee, tipo_origen, id_origen || null, nombre_solicitante, observaciones, fecha_requerida]);
    
    const idPedido = resHeader.insertId;

    if (items && items.length > 0) {
      const valores = items.map(item => [idPedido, item.id_insumo, item.cantidad_solicitada]);
      await conn.query(`
        INSERT INTO inv_pedidos_detalle (id_pedido, id_insumo, cantidad_solicitada)
        VALUES ?
      `, [valores]);
    }

    await conn.commit();
    res.json({ success: true, id_pedido: idPedido });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// 4. Autorizar o Rechazar pedido
router.put('/:id/autorizar', async (req, res) => {
  const { id } = req.params;
  const { estado, id_autorizador, nombre_autorizador, items_aprobados } = req.body;
  // estado must be 'Aprobado' or 'Rechazado'

  const conn = await getDb(req).getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(`
      UPDATE inv_pedidos 
      SET estado = ?, id_usuario_aprueba = ?, nombre_autorizador = ?, fecha_aprobacion = NOW()
      WHERE id_pedido = ?
    `, [estado, id_autorizador, nombre_autorizador, id]);

    if (estado === 'Aprobado' && items_aprobados && items_aprobados.length > 0) {
      for (let item of items_aprobados) {
        await conn.query(`
          UPDATE inv_pedidos_detalle 
          SET cantidad_aprobada = ? 
          WHERE id_detalle = ?
        `, [item.cantidad_aprobada, item.id_detalle]);
      }
    } else if (estado === 'Rechazado') {
      await conn.query(`UPDATE inv_pedidos_detalle SET cantidad_aprobada = 0 WHERE id_pedido = ?`, [id]);
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// 5. Obtener lista de autorizadores (para validar si un usuario puede aprobar)
router.get('/autorizadores', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const [auths] = await getDb(req).query(`
      SELECT a.*, e.nombres, e.apellidos 
      FROM inv_autorizadores_pedidos a
      JOIN rrhh_empleados e ON a.id_empleado = e.id_empleado
      WHERE a.id_tenant = ? AND a.activo = 1
    `, [tenantId]);
    res.json({ success: true, autorizadores: auths });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
