// server/routes/fenologia_cultivo.js
import express from 'express';
const router = express.Router();

// Get phenology stages for a specific cultivo
router.get('/', async (req, res) => {
  const { cultivoId } = req.query;
  const db = req.tenantPool;
  if (!cultivoId) {
    return res.status(400).json({ error: 'cultivoId query param required' });
  }
  const [rows] = await db.query(
    'SELECT * FROM fenologia_cultivo WHERE id_cultivo = ?',
    [cultivoId]
  );
  res.json(rows);
});

export default router;
