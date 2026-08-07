import pool from '../db.js';

export async function getConfig(tenantId) {
  const [rows] = await pool.query(
    `SELECT logo_path FROM tenants WHERE id_tenant = ?`,
    [tenantId]
  );
  return rows[0] || {};
}

export async function setLogoPath(tenantId, logoPath) {
  await pool.query(
    `UPDATE tenants SET logo_path = ? WHERE id_tenant = ?`,
    [logoPath, tenantId]
  );
}
