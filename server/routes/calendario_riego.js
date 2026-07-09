// server/routes/calendario_riego.js
import express from 'express';
const router = express.Router();

// Get irrigation schedule for a parcel, optional day filter
router.get('/', async (req, res) => {
  const { parcelaId, diaSemana } = req.query;
  const db = req.tenantPool;
  if (!parcelaId) {
    return res.status(400).json({ error: 'parcelaId query param required' });
  }
  let sql = 'SELECT * FROM calendario_riego WHERE id_parcela = ?';
  const params = [parcelaId];
  if (diaSemana) {
    sql += ' AND dia_semana = ?';
    params.push(diaSemana);
  }
  const [rows] = await db.query(sql, params);
  res.json(rows);
});

export default router;
