import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// ---------- Helper: simple numeric validation ----------
function validateNumber(value) {
  return typeof value === 'number' && !Number.isNaN(value);
}

// ---------- Mezclas químicas ----------
router.get('/mezclas', async (req, res) => {
  const tenantId = req.query.tenantId || 1;
  try {
    const [rows] = await getDb(req).query('SELECT * FROM app_preparaciones_mezcla WHERE id_tenant = ?', [tenantId]);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/mezclas', async (req, res) => {
  const { tenantId, id_receta, lote_id, producto, cantidad_litros, costo } = req.body;
  if (!validateNumber(tenantId) || !validateNumber(id_receta) || !validateNumber(lote_id) || !producto || !validateNumber(cantidad_litros) || !validateNumber(costo)) {
    return res.status(400).json({ error: 'Datos inválidos para crear mezcla' });
  }
  try {
    const [result] = await getDb(req).query(
      `INSERT INTO app_preparaciones_mezcla (id_tenant, id_receta, lote_id, producto, cantidad_litros, costo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tenantId, id_receta, lote_id, producto, cantidad_litros, costo]
    );
    res.json({ success: true, id: result.insertId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/mezclas/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { producto, cantidad_litros, costo } = req.body;
  if (!validateNumber(id) || !producto || !validateNumber(cantidad_litros) || !validateNumber(costo)) {
    return res.status(400).json({ error: 'Datos inválidos para actualizar mezcla' });
  }
  try {
    await getDb(req).query(
      `UPDATE app_preparaciones_mezcla SET producto = ?, cantidad_litros = ?, costo = ? WHERE id_preparacion = ?`,
      [producto, cantidad_litros, costo, id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/mezclas/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!validateNumber(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    await getDb(req).query('DELETE FROM app_preparaciones_mezcla WHERE id_preparacion = ?', [id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Producción orgánica ----------
router.get('/produccion', async (req, res) => {
  const tenantId = req.query.tenantId || 1;
  try {
    const [rows] = await getDb(req).query('SELECT * FROM app_produccion_organica WHERE id_tenant = ?', [tenantId]);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/produccion', async (req, res) => {
  const { tenantId, lote_id, producto, cantidad_litros, costo_materiales, costo_jornales } = req.body;
  if (!validateNumber(tenantId) || !validateNumber(lote_id) || !producto || !validateNumber(cantidad_litros) || !validateNumber(costo_materiales) || !validateNumber(costo_jornales)) {
    return res.status(400).json({ error: 'Datos inválidos para crear producción' });
  }
  try {
    const [result] = await getDb(req).query(
      `INSERT INTO app_produccion_organica (id_tenant, lote_id, producto, cantidad_litros, costo_materiales, costo_jornales)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tenantId, lote_id, producto, cantidad_litros, costo_materiales, costo_jornales]
    );
    res.json({ success: true, id: result.insertId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/produccion/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { producto, cantidad_litros, costo_materiales, costo_jornales } = req.body;
  if (!validateNumber(id) || !producto || !validateNumber(cantidad_litros) || !validateNumber(costo_materiales) || !validateNumber(costo_jornales)) {
    return res.status(400).json({ error: 'Datos inválidos para actualizar producción' });
  }
  try {
    await getDb(req).query(
      `UPDATE app_produccion_organica SET producto = ?, cantidad_litros = ?, costo_materiales = ?, costo_jornales = ? WHERE id_produccion = ?`,
      [producto, cantidad_litros, costo_materiales, costo_jornales, id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/produccion/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!validateNumber(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    await getDb(req).query('DELETE FROM app_produccion_organica WHERE id_produccion = ?', [id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
