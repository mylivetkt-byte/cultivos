import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Middleware to inject tenant
router.use((req, res, next) => {
  req.tenantId = 1;
  next();
});

// GET /inventario
router.get('/inventario', async (req, res) => {
  try {
    const { id_finca, search } = req.query;
    let query = `
      SELECT i.*, f.nombre as finca_nombre 
      FROM ganado_herr_inventario i
      JOIN fincas f ON i.id_finca = f.id_finca
      WHERE i.id_tenant = ?
    `;
    const params = [req.tenantId];

    if (id_finca) {
      query += ` AND i.id_finca = ?`;
      params.push(id_finca);
    }

    if (search) {
      query += ` AND (i.codigo LIKE ? OR i.nombre LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY i.nombre ASC`;

    const [rows] = await pool.query(query, params);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /inventario
router.post('/inventario', async (req, res) => {
  try {
    const { id_finca, codigo, nombre, tipo, unidad_medida, cantidad_actual, costo_unitario, notas } = req.body;
    
    // Hash auditoria
    const strData = `${id_finca}-${codigo}-${nombre}-${cantidad_actual}`;
    const { hash_auditoria, firma_digital } = generateAudit(strData);

    const [result] = await pool.query(
      `INSERT INTO ganado_herr_inventario 
       (id_tenant, id_finca, codigo, nombre, tipo, unidad_medida, cantidad_actual, costo_unitario, notas, hash_auditoria, firma_digital) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.tenantId, id_finca, codigo, nombre, tipo, unidad_medida, cantidad_actual, costo_unitario, notas, hash_auditoria, firma_digital]
    );
    res.json({ message: 'Herramienta/Insumo creado correctamente.', id: result.insertId });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Ya existe una herramienta con ese código en esta finca.' });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

// GET /movimientos
router.get('/movimientos', async (req, res) => {
  try {
    const { id_finca, search, fecha_inicio, fecha_fin, tipo, herramienta, responsable } = req.query;
    let query = `
      SELECT m.*, i.codigo, i.nombre as herramienta_nombre, i.unidad_medida, i.tipo as categoria, f.nombre as finca_nombre
      FROM ganado_herr_movimientos m
      JOIN ganado_herr_inventario i ON m.id_herr_inv = i.id_herr_inv
      JOIN fincas f ON i.id_finca = f.id_finca
      WHERE i.id_tenant = ?
    `;
    const params = [req.tenantId];

    if (id_finca) { query += ` AND i.id_finca = ?`; params.push(id_finca); }
    if (tipo) { query += ` AND m.tipo_movimiento = ?`; params.push(tipo); }
    if (fecha_inicio && fecha_fin) { query += ` AND m.fecha BETWEEN ? AND ?`; params.push(fecha_inicio + ' 00:00:00', fecha_fin + ' 23:59:59'); }
    if (search) { query += ` AND (i.codigo LIKE ? OR i.nombre LIKE ? OR m.responsable LIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (herramienta) { query += ` AND (i.codigo LIKE ? OR i.nombre LIKE ?)`; params.push(`%${herramienta}%`, `%${herramienta}%`); }
    if (responsable) { query += ` AND m.responsable LIKE ?`; params.push(`%${responsable}%`); }

    query += ` ORDER BY m.fecha DESC`;

    const [rows] = await pool.query(query, params);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /movimiento (Crear entrada, salida, etc y actualizar stock)
router.post('/movimientos', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id_herr_inv, tipo_movimiento, fecha, cantidad, origen_destino, responsable, observaciones } = req.body;
    
    // Check current cost and calculate total
    const [inv] = await connection.query(`SELECT costo_unitario, cantidad_actual FROM ganado_herr_inventario WHERE id_herr_inv = ?`, [id_herr_inv]);
    if (inv.length === 0) throw new Error("Herramienta no encontrada");
    
    const costo_total = inv[0].costo_unitario * cantidad;
    
    await connection.query(
      `INSERT INTO ganado_herr_movimientos 
       (id_herr_inv, tipo_movimiento, fecha, cantidad, costo_total, origen_destino, responsable, observaciones) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_herr_inv, tipo_movimiento, fecha, cantidad, costo_total, origen_destino, responsable, observaciones]
    );

    // Update stock
    let stockModifier = 0;
    if (tipo_movimiento === 'Entrada') stockModifier = cantidad;
    else if (['Salida', 'Traslado', 'Prestamo', 'Baja_Daño'].includes(tipo_movimiento)) stockModifier = -cantidad;
    
    if (stockModifier !== 0) {
      await connection.query(`UPDATE ganado_herr_inventario SET cantidad_actual = cantidad_actual + ? WHERE id_herr_inv = ?`, [stockModifier, id_herr_inv]);
    }

    await connection.commit();
    res.json({ message: 'Movimiento registrado correctamente' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || 'Error interno del servidor' });
  } finally {
    connection.release();
  }
});

// DELETE /movimiento/:id (Revertir movimiento)
router.delete('/movimientos/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const id_movimiento = req.params.id;
    
    // Get mov
    const [movs] = await connection.query(`SELECT * FROM ganado_herr_movimientos WHERE id_movimiento = ?`, [id_movimiento]);
    if (movs.length === 0) throw new Error("Movimiento no encontrado");
    const mov = movs[0];
    if (mov.estado === 'Anulado') throw new Error("Movimiento ya fue anulado");
    
    // Reverse stock
    let stockModifier = 0;
    if (mov.tipo_movimiento === 'Entrada') stockModifier = -mov.cantidad; // Rever entrada -> resta
    else if (['Salida', 'Traslado', 'Prestamo', 'Baja_Daño'].includes(mov.tipo_movimiento)) stockModifier = mov.cantidad; // Rever salida -> suma
    
    if (stockModifier !== 0) {
      await connection.query(`UPDATE ganado_herr_inventario SET cantidad_actual = cantidad_actual + ? WHERE id_herr_inv = ?`, [stockModifier, mov.id_herr_inv]);
    }
    
    await connection.query(`UPDATE ganado_herr_movimientos SET estado = 'Anulado' WHERE id_movimiento = ?`, [id_movimiento]);

    await connection.commit();
    res.json({ message: 'Movimiento anulado y stock revertido' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || 'Error interno del servidor' });
  } finally {
    connection.release();
  }
});

// GET /pedidos
router.get('/pedidos', async (req, res) => {
  try {
    const { id_finca, responsable, herramienta, fecha_inicio, fecha_fin } = req.query;
    let query = `
      SELECT p.*, f.nombre as finca_nombre, b.nombre as bodega_destino_nombre 
      FROM ganado_herr_pedidos p
      JOIN fincas f ON p.id_finca = f.id_finca
      LEFT JOIN bod_bodegas b ON p.id_bodega_destino = b.id_bodega
      WHERE p.id_tenant = ?
    `;
    const params = [req.tenantId];
    if (id_finca) {
      query += ` AND p.id_finca = ?`;
      params.push(id_finca);
    }
    if (responsable) {
      query += ` AND p.solicitante LIKE ?`;
      params.push(`%${responsable}%`);
    }
    if (herramienta) {
      query += ` AND p.detalles_json LIKE ?`;
      params.push(`%${herramienta}%`);
    }
    if (fecha_inicio && fecha_fin) {
      query += ` AND p.fecha_pedido BETWEEN ? AND ?`;
      params.push(fecha_inicio + ' 00:00:00', fecha_fin + ' 23:59:59');
    }
    query += ` ORDER BY p.id_pedido DESC`;
    const [rows] = await pool.query(query, params);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /pedidos
router.post('/pedidos', async (req, res) => {
  try {
    const { id_finca, id_bodega_destino, fecha_pedido, solicitante, detalles } = req.body;
    await pool.query(
      `INSERT INTO ganado_herr_pedidos (id_tenant, id_finca, id_bodega_destino, fecha_pedido, solicitante, detalles_json) VALUES (?, ?, ?, ?, ?, ?)`,
      [req.tenantId, id_finca, id_bodega_destino || null, fecha_pedido, solicitante, JSON.stringify(detalles)]
    );
    res.json({ message: 'Pedido creado exitosamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /pedidos/:id/estado
router.put('/pedidos/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    await pool.query('UPDATE ganado_herr_pedidos SET estado = ? WHERE id_pedido = ? AND id_tenant = ?', [estado, req.params.id, req.tenantId]);
    res.json({ message: 'Estado actualizado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

export default router;
