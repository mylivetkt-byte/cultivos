import express from 'express';
import { getConfig, setLogoPath } from '../models/configEmpresa.js';

const router = express.Router();

// GET logo path for the current tenant (uses auth middleware to set req.tenantId)
router.get('/', async (req, res) => {
  const tenantId = req.tenantId || req.query.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'tenantId requerido' });
  try {
    const config = await getConfig(tenantId);
    res.json({ logo_path: config.logo_path || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST to set logo path
router.post('/', async (req, res) => {
  const tenantId = req.tenantId || req.body.tenantId;
  const { logoPath } = req.body;
  if (!tenantId || !logoPath) return res.status(400).json({ error: 'tenantId y logoPath requeridos' });
  try {
    await setLogoPath(tenantId, logoPath);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
