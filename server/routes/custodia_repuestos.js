import express from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';

const router = express.Router();

// 1. Obtener la lista de deudores de repuestos
router.get('/deudas', async (req, res) => {
  const { tenantId, estado } = req.query; // estado: Pendiente, Entregado_Bodega, etc.
  if (!tenantId) return res.status(400).json({ error: 'Falta tenantId' });

  try {
    let sql = `
      SELECT rc.*, e.nombres, e.apellidos, e.documento, i.codigo as insumo_codigo, i.nombre as insumo_nombre
      FROM inv_repuestos_cambiados rc
      JOIN rrhh_empleados e ON rc.id_empleado = e.id_empleado
      JOIN insumos i ON rc.id_insumo = i.id_insumo
      WHERE rc.id_tenant = ?
    `;
    const params = [tenantId];

    if (estado && estado !== 'Todos') {
      sql += ` AND rc.estado_devolucion = ?`;
      params.push(estado);
    }

    sql += ` ORDER BY rc.fecha_entrega_pieza IS NULL DESC, rc.id_cambio DESC`;

    const [deudas] = await getDb(req).query(sql, params);
    res.json({ success: true, deudas });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Realizar Descargo (Recibir pieza vieja)
router.post('/:idCambio/descargar', async (req, res) => {
  const { idCambio } = req.params;
  const { id_usuario_recibe } = req.body;
  
  const conn = await getDb(req).getConnection();
  try {
    await conn.beginTransaction();

    // Actualizar estado a Entregado
    await conn.query(`
      UPDATE inv_repuestos_cambiados 
      SET pieza_vieja_entregada = 1, estado_devolucion = 'Entregado_Bodega', fecha_entrega_pieza = NOW(), id_usuario_recibe = ?
      WHERE id_cambio = ?
    `, [id_usuario_recibe, idCambio]);

    // Opcional: Generar Movimiento Kárdex hacia Bodega Chatarra
    // Buscamos la bodega de chatarra
    const [chatarraRows] = await conn.query("SELECT id_bodega FROM bod_bodegas WHERE nombre LIKE '%Chatarra%' LIMIT 1");
    if (chatarraRows.length > 0) {
      const idBodegaChatarra = chatarraRows[0].id_bodega;
      const [cambioData] = await conn.query('SELECT id_insumo FROM inv_repuestos_cambiados WHERE id_cambio = ?', [idCambio]);
      
      if (cambioData.length > 0) {
        const idInsumo = cambioData[0].id_insumo;
        // Check if exists in chatarra bodega
        const [exis] = await conn.query('SELECT * FROM inv_existencias WHERE id_bodega = ? AND id_insumo = ?', [idBodegaChatarra, idInsumo]);
        if (exis.length > 0) {
          await conn.query('UPDATE inv_existencias SET cantidad = cantidad + 1 WHERE id_bodega = ? AND id_insumo = ?', [idBodegaChatarra, idInsumo]);
        } else {
          await conn.query('INSERT INTO inv_existencias (id_bodega, id_insumo, cantidad, costo_promedio) VALUES (?, ?, 1, 0)', [idBodegaChatarra, idInsumo]);
        }
      }
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

// 3. Inventario Bodega Chatarra
router.get('/chatarra', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const [chatarraRows] = await getDb(req).query("SELECT id_bodega FROM bod_bodegas WHERE nombre LIKE '%Chatarra%' AND id_tenant = ? LIMIT 1", [tenantId]);
    if (chatarraRows.length === 0) return res.json({ success: true, inventario: [] });

    const idBodegaChatarra = chatarraRows[0].id_bodega;
    
    const [inventario] = await getDb(req).query(`
      SELECT e.cantidad, i.codigo, i.nombre, i.unidad_medida 
      FROM inv_existencias e
      JOIN insumos i ON e.id_insumo = i.id_insumo
      WHERE e.id_bodega = ? AND e.cantidad > 0
    `, [idBodegaChatarra]);

    res.json({ success: true, inventario });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
