import express from 'express';
import db from '../db.js';
import { authMiddleware } from '../utils/auth.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user?.id_tenant || req.user?.tenant_id || 1;
    const [rows] = await db.query('SELECT * FROM fincas WHERE activo = 1 AND id_tenant = ?', [tenantId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching fincas:', error);
    res.status(500).json({ message: 'Error fetching fincas' });
  }
});

export default router;
