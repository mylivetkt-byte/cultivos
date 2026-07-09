// server/routes/calendario_agricola.js
import express from 'express';
const router = express.Router();

// Get calendar activities for a specific cultivo, optional date range
router.get('/', async (req, res) => {
  const { cultivoId, startDate, endDate } = req.query;
  const db = req.tenantPool;
  if (!cultivoId) {
    return res.status(400).json({ error: 'cultivoId query param required' });
  }
  let sql = 'SELECT * FROM calendario_agricola WHERE id_cultivo = ?';
  const params = [cultivoId];
  if (startDate) {
    sql += ' AND fecha_inicio >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND fecha_fin <= ?';
    params.push(endDate);
  }
  const [rows] = await db.query(sql, params);
  res.json(rows);
});

export default router;
