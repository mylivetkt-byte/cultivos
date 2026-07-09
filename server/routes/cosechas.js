// routes/cosechas.js
import express from 'express';
import pool from '../db.js';


const router = express.Router();

// Helper to log audit actions
async function logAudit(db, cosechaId, action, userId, payload) {
  const sql = `INSERT INTO cosechas_auditoria (id_cosecha, action, user_id, payload) VALUES (?,?,?,?)`;
  await db.query(sql, [cosechaId, action, userId, JSON.stringify(payload)]);
}

// GET /api/cosechas - list harvests (optional filters)
router.get('/', async (req, res) => {
  const db = req.tenantPool || pool;
  const { parcelaId, cultivoId, fechaDesde, fechaHasta } = req.query;
  let sql = `SELECT * FROM cosechas`;
  const params = [];
  const conditions = [];
  if (parcelaId) { conditions.push('id_parcela = ?'); params.push(parcelaId); }
  if (cultivoId) { conditions.push('id_cultivo = ?'); params.push(cultivoId); }
  if (fechaDesde && fechaHasta) { conditions.push('fecha_cosecha BETWEEN ? AND ?'); params.push(fechaDesde, fechaHasta); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  try {
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error listing cosechas:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/cosechas/:id - get single harvest
router.get('/:id', async (req, res) => {
  const db = req.tenantPool || pool;
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM cosechas WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Cosecha no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching cosecha:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/cosechas - create new harvest
router.post('/', async (req, res) => {
  const db = req.tenantPool || pool;
  const { id_parcela, id_cultivo, codigoCosecha, fecha_cosecha, peso_total_kg } = req.body;
  const userId = req.user?.id || 0; // assuming auth middleware populates req.user
  if (!id_parcela || !id_cultivo || !codigoCosecha || !fecha_cosecha || !peso_total_kg) {
    return res.status(400).json({ error: 'Campos obligatorios faltantes' });
  }
  try {
    // Check uniqueness
    const [dup] = await db.query(
      `SELECT id FROM cosechas WHERE codigoCosecha = ? OR (id_parcela = ? AND fecha_cosecha = ?) LIMIT 1`,
      [codigoCosecha, id_parcela, fecha_cosecha]
    );
    if (dup.length) return res.status(409).json({ error: 'Código de cosecha o combinación parcela/fecha ya existe' });

    const insertSql = `INSERT INTO cosechas (id_parcela, id_cultivo, codigoCosecha, fecha_cosecha, peso_total_kg, created_by) VALUES (?,?,?,?,?,?)`;
    const [{ insertId }] = await db.query(insertSql, [id_parcela, id_cultivo, codigoCosecha, fecha_cosecha, peso_total_kg, userId]);
    await logAudit(db, insertId, 'INSERT', userId, { id_parcela, id_cultivo, codigoCosecha, fecha_cosecha, peso_total_kg });
    res.status(201).json({ id: insertId });
  } catch (err) {
    console.error('Error creating cosecha:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/cosechas/:id - update harvest
router.put('/:id', async (req, res) => {
  const db = req.tenantPool || pool;
  const { id } = req.params;
  const { id_parcela, id_cultivo, codigoCosecha, fecha_cosecha, peso_total_kg } = req.body;
  const userId = req.user?.id || 0;
  try {
    // Verify exists
    const [existing] = await db.query('SELECT * FROM cosechas WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ error: 'Cosecha no encontrada' });
    // Uniqueness checks if fields changed
    if (codigoCosecha || (id_parcela && fecha_cosecha)) {
      const [conflict] = await db.query(
        `SELECT id FROM cosechas WHERE id <> ? AND (codigoCosecha = ? OR (id_parcela = ? AND fecha_cosecha = ?)) LIMIT 1`,
        [id, codigoCosecha, id_parcela, fecha_cosecha]
      );
      if (conflict.length) return res.status(409).json({ error: 'Conflicto de unicidad en código o parcela/fecha' });
    }
    const fields = [];
    const values = [];
    if (id_parcela) { fields.push('id_parcela = ?'); values.push(id_parcela); }
    if (id_cultivo) { fields.push('id_cultivo = ?'); values.push(id_cultivo); }
    if (codigoCosecha) { fields.push('codigoCosecha = ?'); values.push(codigoCosecha); }
    if (fecha_cosecha) { fields.push('fecha_cosecha = ?'); values.push(fecha_cosecha); }
    if (peso_total_kg) { fields.push('peso_total_kg = ?'); values.push(peso_total_kg); }
    if (fields.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });
    const sql = `UPDATE cosechas SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    await db.query(sql, values);
    await logAudit(db, id, 'UPDATE', userId, req.body);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating cosecha:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/cosechas/:id - hard delete (could be soft if needed)
router.delete('/:id', async (req, res) => {
  const db = req.tenantPool || pool;
  const { id } = req.params;
  const userId = req.user?.id || 0;
  try {
    const [existing] = await db.query('SELECT * FROM cosechas WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ error: 'Cosecha no encontrada' });
    await db.query('DELETE FROM cosechas WHERE id = ?', [id]);
    await logAudit(db, id, 'DELETE', userId, {});
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting cosecha:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
