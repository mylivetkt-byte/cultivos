// server/routes/parcelas.js
import express from 'express';
import pool from '../db.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const { fincaId, cultivoId, loteId } = req.query;
  const db = req.tenantPool;
  const filters = [];
  const params = [];
  if (fincaId) { filters.push('p.id_finca = ?'); params.push(fincaId); }
  if (cultivoId) { filters.push('p.id_cultivo = ?'); params.push(cultivoId); }
  if (loteId) { filters.push('p.id_lote = ?'); params.push(loteId); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [rows] = await db.query(`SELECT * FROM parcelas p ${where}`, params);
  res.json(rows);
});

export default router;
