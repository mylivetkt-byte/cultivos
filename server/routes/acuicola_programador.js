import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.use((req, res, next) => {
  req.tenantId = 1;
  next();
});

// Alevinos Inventario
router.get('/alevinos', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.*, e.nombre as especie_nombre 
      FROM acuicola_alevinos_inventario a
      JOIN acuicola_especies e ON a.id_especie = e.id_especie_acui
      WHERE a.id_tenant = ?
      ORDER BY a.fecha_recepcion DESC
    `, [req.tenantId]);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/alevinos', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id_especie, fecha_recepcion, proveedor, cantidad_recibida, peso_promedio_g, costo_lote } = req.body;
    
    const [result] = await connection.query(`
      INSERT INTO acuicola_alevinos_inventario 
      (id_tenant, id_especie, fecha_recepcion, proveedor, cantidad_recibida, cantidad_disponible, peso_promedio_g, costo_lote)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [req.tenantId, id_especie, fecha_recepcion, proveedor, cantidad_recibida, cantidad_recibida, peso_promedio_g, costo_lote]);

    // Contabilidad Integracion: Asiento contable
    const fecha = new Date().toISOString().split('T')[0];
    const descripcion = `Compra de semilla de alevinos (Prov: ${proveedor}, Cantidad: ${cantidad_recibida})`;
    
    // Create comprobante
    const [comp] = await connection.query(`
      INSERT INTO contab_comprobantes (id_tenant, fecha, tipo_documento, consecutivo, concepto, estado)
      VALUES (?, ?, 'CE', 'ALV-001', ?, 'Aprobado')
    `, [req.tenantId, fecha, descripcion]);
    
    const id_comprobante = comp.insertId;

    // Detalles (Activo Biologico vs Bancos/CxP)
    await connection.query(`
      INSERT INTO contab_detalles (id_comprobante, id_cuenta, tercero, descripcion, debito, credito)
      VALUES 
      (?, (SELECT id_cuenta FROM plan_contable WHERE codigo = '1413' LIMIT 1), ?, 'Ingreso Activo Biologico (Alevinos)', ?, 0),
      (?, (SELECT id_cuenta FROM plan_contable WHERE codigo = '1110' LIMIT 1), ?, 'Pago Proveedor Alevinos', 0, ?)
    `, [id_comprobante, proveedor, costo_lote, id_comprobante, proveedor, costo_lote]);

    await connection.commit();
    res.json({ message: 'Lote de alevinos ingresado correctamente con integración contable.', id: result.insertId });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
});

// Programador
router.get('/programacion', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, e.codigo as estanque_codigo, f.nombre as finca_nombre
      FROM acuicola_programacion_estanques p
      JOIN acuicola_estanques e ON p.id_estanque = e.id_estanque
      JOIN fincas f ON e.id_finca = f.id_finca
      WHERE p.id_tenant = ?
      ORDER BY p.fecha_programada ASC
    `, [req.tenantId]);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/programacion', async (req, res) => {
  try {
    const { id_estanque, tipo_actividad, fecha_programada, notas } = req.body;
    await pool.query(`
      INSERT INTO acuicola_programacion_estanques (id_tenant, id_estanque, tipo_actividad, fecha_programada, notas)
      VALUES (?, ?, ?, ?, ?)
    `, [req.tenantId, id_estanque, tipo_actividad, fecha_programada, notas]);
    res.json({ message: 'Actividad programada correctamente.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/programacion/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    await pool.query('UPDATE acuicola_programacion_estanques SET estado = ? WHERE id_programacion = ? AND id_tenant = ?', [estado, req.params.id, req.tenantId]);
    res.json({ message: 'Estado actualizado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Siembras (Inventario en Engorde por Lago)
router.get('/siembras', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.*, 
        DATEDIFF(CURDATE(), s.fecha_siembra) as dias_cultivo,
        e.codigo as estanque_codigo, 
        f.nombre as finca_nombre,
        esp.nombre as especie_nombre
      FROM acuicola_siembras s
      JOIN acuicola_estanques e ON s.id_estanque = e.id_estanque
      JOIN fincas f ON e.id_finca = f.id_finca
      JOIN acuicola_especies esp ON s.id_especie_acui = esp.id_especie_acui
      WHERE f.id_tenant = ?
      ORDER BY s.fecha_siembra DESC
    `, [req.tenantId]);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
