// Helper centralizado de acceso a datos / política de tenant.
//
// Arquitectura multi-tenant: cada tenant tiene su propia base de datos.
// El middleware `tenantPoolMiddleware` (server/utils/auth.js) configura
// `req.tenantPool` apuntando a la DB del tenant autenticado.
//
// Este helper unifica el acceso: todos los routers deben usar `getDb(req)`
// en lugar de consultar `pool` directamente para datos de negocio. Solo los
// módulos globales/transversales (usuarios, tenants, permisos) deben usar el
// pool principal (`pool`).
import pool from '../db.js';

export function getDb(req) {
  return (req && req.tenantPool) || pool;
}

export { pool };

export default pool;