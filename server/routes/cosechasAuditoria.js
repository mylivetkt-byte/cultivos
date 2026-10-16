// routes/cosechasAuditoria.js
import express from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';

const router = express.Router();

// GET /api/cosechas/:cosechaId/auditoria - retrieve audit logs for a harvest
router.get('/:cosechaId/auditoria', async (req, res) => {
  const db = getDb(req);
  const { cosechaId } = req.params;
  const { action, userId, from, to } = req.query; // optional filters
  try {
    let sql = `SELECT * FROM cosechas_auditoria WHERE id_cosecha = ?`;
    const params = [cosechaId];
    if (action) { sql += ' AND action = ?'; params.push(action); }
    if (userId) { sql += ' AND user_id = ?'; params.push(userId); }
    if (from && to) { sql += ' AND timestamp BETWEEN ? AND ?'; params.push(from, to); }
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching cosechas auditoria:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
