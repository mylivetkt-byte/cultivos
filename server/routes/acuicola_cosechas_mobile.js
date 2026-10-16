import express from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';

const router = express.Router();

// ENDPOINT PARA CREAR DATA DEMO
router.get('/seed', async (req, res) => {
  try {
    const db = getDb(req);
    const [estanques] = await db.query("SELECT * FROM acuicola_estanques WHERE id_tenant = 1 LIMIT 5");
    const [especies] = await db.query("SELECT * FROM acuicola_especies LIMIT 3");
    
    if(estanques.length === 0 || especies.length === 0) return res.json({ msg: 'Faltan estanques/especies' });

    const [siembrasExistentes] = await db.query("SELECT * FROM acuicola_siembras WHERE estado = 'Activo' AND id_tenant = 1");
    if (siembrasExistentes.length >= 3) return res.json({ msg: 'Ya existen siembras activas' });

    let inserted = 0;
    for (let i = 0; i < Math.min(4, estanques.length); i++) {
      const estanque = estanques[i];
      const especie = especies[i % especies.length];
      
      const q = `
        INSERT INTO acuicola_siembras 
        (id_tenant, id_estanque, id_especie_acui, fecha_siembra, cantidad_alevines, peso_promedio_ingreso_g, estado, notas)
        VALUES (1, ?, ?, DATE_SUB(NOW(), INTERVAL 180 DAY), ?, 5, 'Activo', 'Siembra demo de auditoría')
      `;
      const args = [estanque.id_estanque, especie.id_especie_acui, 5000 + (i * 1000)];
      await db.query(q, args);
      inserted++;
    }
    res.json({ msg: 'Seed completado', inserted });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// 1. Obtener lagos (siembras) listos para cosecha o campañas en progreso
router.get('/siembras-activas', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const [rows] = await getDb(req).query(`
      SELECT 
        s.id_siembra_acui, 
        s.id_estanque, 
        est.codigo as estanque_codigo, 
        est.id_finca,
        f.nombre as finca_nombre,
        s.id_especie_acui as id_especie, 
        e.nombre as especie_nombre,
        s.fecha_siembra,
        s.cantidad_alevines
      FROM acuicola_siembras s
      JOIN acuicola_estanques est ON s.id_estanque = est.id_estanque
      JOIN fincas f ON est.id_finca = f.id_finca
      JOIN acuicola_especies e ON s.id_especie_acui = e.id_especie_acui
      WHERE s.estado = 'Activo' AND (? IS NULL OR est.id_tenant = ?)
    `, [tenantId || null, tenantId || null]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener lotes en progreso
router.get('/lotes-progreso', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const [rows] = await getDb(req).query(`
      SELECT 
        l.*,
        est.codigo as estanque_codigo,
        e.nombre as especie_nombre
      FROM acuicola_lotes_cosecha l
      JOIN acuicola_estanques est ON l.id_estanque = est.id_estanque
      JOIN acuicola_especies e ON l.id_especie = e.id_especie_acui
      WHERE l.estado = 'En Progreso' AND (? IS NULL OR l.id_tenant = ?)
    `, [tenantId || null, tenantId || null]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Iniciar una nueva cosecha (Campaña)
router.post('/start', async (req, res) => {
  const { tenantId, id_finca, id_estanque, id_siembra_acui, id_especie } = req.body;
  try {
    const [result] = await getDb(req).query(`
      INSERT INTO acuicola_lotes_cosecha (id_tenant, id_finca, id_estanque, id_siembra_acui, id_especie, fecha_inicio, estado)
      VALUES (?, ?, ?, ?, ?, NOW(), 'En Progreso')
    `, [tenantId || 1, id_finca, id_estanque, id_siembra_acui, id_especie]);
    res.json({ id_lote_cosecha: result.insertId, message: 'Campaña iniciada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Registrar una pesada (Captura)
router.post('/:id/pesaje', async (req, res) => {
  const id_lote_cosecha = req.params.id;
  const { tenantId, peso_bruto_kg, peso_tara_kg, peso_neto_kg, promedio_talla_g, id_empleado_pesador, notas } = req.body;
  
  const con = await getDb(req).getConnection();
  try {
    await con.beginTransaction();
    
    await con.query(`
      INSERT INTO acuicola_capturas_pesajes (id_tenant, id_lote_cosecha, peso_bruto_kg, peso_tara_kg, peso_neto_kg, promedio_talla_g, fecha_captura, id_empleado_pesador, notas)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)
    `, [tenantId || 1, id_lote_cosecha, peso_bruto_kg, peso_tara_kg, peso_neto_kg, promedio_talla_g, id_empleado_pesador, notas]);

    // Actualizar total_capturado_kg
    await con.query(`
      UPDATE acuicola_lotes_cosecha 
      SET total_capturado_kg = (SELECT SUM(peso_neto_kg) FROM acuicola_capturas_pesajes WHERE id_lote_cosecha = ?)
      WHERE id_lote_cosecha = ?
    `, [id_lote_cosecha, id_lote_cosecha]);

    await con.commit();
    res.json({ message: 'Pesaje registrado exitosamente' });
  } catch (err) {
    await con.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    con.release();
  }
});

// 4. Obtener pesajes de un lote
router.get('/:id/pesajes', async (req, res) => {
  const id_lote_cosecha = req.params.id;
  try {
    const [rows] = await getDb(req).query(`
      SELECT p.*, e.nombre as empleado_nombre
      FROM acuicola_capturas_pesajes p
      LEFT JOIN rrhh_empleados e ON p.id_empleado_pesador = e.id_empleado
      WHERE p.id_lote_cosecha = ?
      ORDER BY p.fecha_captura DESC
    `, [id_lote_cosecha]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Finalizar cosecha
router.post('/:id/finalize', async (req, res) => {
  const id_lote_cosecha = req.params.id;
  
  const con = await getDb(req).getConnection();
  try {
    await con.beginTransaction();

    // 1. Marcar lote como cerrado
    await con.query(`
      UPDATE acuicola_lotes_cosecha 
      SET estado = 'Cerrado', fecha_cierre = NOW()
      WHERE id_lote_cosecha = ?
    `, [id_lote_cosecha]);

    // 2. Obtener datos del lote
    const [lotes] = await con.query('SELECT * FROM acuicola_lotes_cosecha WHERE id_lote_cosecha = ?', [id_lote_cosecha]);
    if (lotes.length === 0) throw new Error('Lote no encontrado');
    const lote = lotes[0];

    // 3. Marcar siembra como Cosechada
    await con.query(`
      UPDATE acuicola_siembras 
      SET estado = 'Cosechado'
      WHERE id_siembra_acui = ?
    `, [lote.id_siembra_acui]);

    // 4. Sumar inventario de pescado
    const [invRows] = await con.query(`SELECT id_inventario FROM acuicola_inventario_pescado WHERE id_especie = ? AND id_tenant = ?`, [lote.id_especie, lote.id_tenant]);
    
    if (invRows.length > 0) {
      await con.query(`
        UPDATE acuicola_inventario_pescado 
        SET saldo_actual_kg = saldo_actual_kg + ?
        WHERE id_inventario = ?
      `, [lote.total_capturado_kg, invRows[0].id_inventario]);
    } else {
      await con.query(`
        INSERT INTO acuicola_inventario_pescado (id_tenant, id_especie, saldo_actual_kg)
        VALUES (?, ?, ?)
      `, [lote.id_tenant, lote.id_especie, lote.total_capturado_kg]);
    }

    await con.commit();
    res.json({ message: 'Cosecha finalizada, inventario actualizado y siembra cerrada.' });
  } catch (err) {
    await con.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    con.release();
  }
});

export default router;
