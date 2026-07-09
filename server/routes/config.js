import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// GET /api/configuracion/alertas?tenantId=X
router.get('/alertas', async (req, res) => {
  const { tenantId } = req.query;
  if (!tenantId) return res.status(400).json({ error: 'tenantId requerido' });

  try {
    const [rows] = await getDb(req).query(`
      SELECT modulo, requiere_pin, canal_notificacion, smtp_host, smtp_port, smtp_user, smtp_pass, whatsapp_key
      FROM cfg_notificaciones
      WHERE id_tenant = ?
    `, [tenantId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/config/logo-path - guarda la ruta del logo local
router.post('/logo-path', async (req, res) => {
  const { tenantId, logoPath } = req.body;
  if (!tenantId || !logoPath) return res.status(400).json({ error: 'tenantId y logoPath requeridos' });

  try {
    await getDb(req).query(`
      UPDATE cfg_tenants 
      SET logo_path = ? 
      WHERE id = ?
    `, [logoPath, tenantId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving logo path:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/configuracion/alertas
router.post('/alertas', async (req, res) => {
  const { tenantId, modulo, requiere_pin, canal_notificacion, smtp_host, smtp_port, smtp_user, smtp_pass, whatsapp_key } = req.body;
  if (!tenantId || !modulo) return res.status(400).json({ error: 'tenantId y modulo requeridos' });

  try {
    // Upsert logic (Insert or Update if exists)
    await getDb(req).query(`
      INSERT INTO cfg_notificaciones 
        (id_tenant, modulo, requiere_pin, canal_notificacion, smtp_host, smtp_port, smtp_user, smtp_pass, whatsapp_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        requiere_pin = VALUES(requiere_pin),
        canal_notificacion = VALUES(canal_notificacion),
        smtp_host = VALUES(smtp_host),
        smtp_port = VALUES(smtp_port),
        smtp_user = VALUES(smtp_user),
        smtp_pass = VALUES(smtp_pass),
        whatsapp_key = VALUES(whatsapp_key)
    `, [tenantId, modulo, requiere_pin, canal_notificacion, smtp_host, smtp_port, smtp_user, smtp_pass, whatsapp_key]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
