import pool from '../db.js';

export async function getConfig(tenantId) {
  const [rows] = await pool.query(
    `SELECT logo_path FROM config_empresa WHERE id_tenant = ?`,
    [tenantId]
  );
  return rows[0] || {};
}

export async function setLogoPath(tenantId, logoPath) {
  await pool.query(
    `INSERT INTO config_empresa (id_tenant, logo_path)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE logo_path = VALUES(logo_path)`,
    [tenantId, logoPath]
  );
}
