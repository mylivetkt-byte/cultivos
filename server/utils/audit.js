/**
 * Helper para registrar trazas en sys_audit_logs
 */
export async function logAudit(db, {
  id_tenant = 1,
  modulo = 'Agricultura de Precisión',
  accion = 'CREAR',
  registro_id = '',
  usuario = 'Sistema',
  detalle = ''
}) {
  try {
    const regId = String(registro_id || '');
    const user = String(usuario || 'Sistema');
    const details = typeof detalle === 'object' ? JSON.stringify(detalle) : String(detalle || '');

    await db.query(`
      INSERT INTO sys_audit_logs (id_tenant, modulo, accion, registro_id, usuario, detalle)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id_tenant, modulo, accion, regId, user, details]);
  } catch (err) {
    console.error('[AUDIT ERROR] No se pudo guardar rastro de auditoría:', err.message);
  }
}
