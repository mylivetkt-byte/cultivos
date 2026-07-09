import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { getTenantPool } from '../db-tenant.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sas-agricolas-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    // Log error for debugging auth failures
    console.error('⚠️ verifyToken error:', err.message);
    return null;
  }
}

export async function getUserPermissions(rol) {
  const [rows] = await pool.query(
    'SELECT modulo, puede_leer, puede_escribir, puede_eliminar, puede_exportar FROM sys_permisos_modulos WHERE rol = ?',
    [rol]
  );
  return rows;
}

export async function getUserWithTenant(userId) {
  const [rows] = await pool.query(`
    SELECT u.id_usuario, u.username, u.email, u.id_tenant, u.rol, u.activo,
           t.nombre_comercial as tenant_nombre, t.nit as tenant_nit, t.db_name
    FROM usuarios u
    JOIN tenants t ON u.id_tenant = t.id_tenant
    WHERE u.id_usuario = ? AND u.activo = 1 AND t.activo = 1
  `, [userId]);
  if (rows.length === 0) return null;
  const user = rows[0];
  user.permisos = await getUserPermissions(user.rol);
  return user;
}

export async function authenticateUser(username, password) {
  const [rows] = await pool.query(`
    SELECT u.id_usuario, u.username, u.password_hash, u.id_tenant, u.rol, u.activo,
           t.nombre_comercial as tenant_nombre, t.activo as tenant_activo, t.db_name
    FROM usuarios u
    JOIN tenants t ON u.id_tenant = t.id_tenant
    WHERE (u.username = ? OR u.email = ?) AND u.activo = 1
  `, [username, username]);

  if (rows.length === 0) return null;

  const user = rows[0];

  if (!user.tenant_activo) return null;

  if (!user.password_hash) return null;

  const bcrypt = await import('bcrypt');
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  const permisos = await getUserPermissions(user.rol);

  return {
    id_usuario: user.id_usuario,
    username: user.username,
    id_tenant: user.id_tenant,
    rol: user.rol,
    tenant_nombre: user.tenant_nombre,
    db_name: user.db_name,
    permisos
  };
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorización requerido' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  req.user = decoded;
  req.tenantId = decoded.id_tenant;
  req.dbName = decoded.db_name;
  next();
}

export async function tenantPoolMiddleware(req, res, next) {
  if (!req.dbName) {
    req.tenantPool = pool;
    return next();
  }

  try {
    req.tenantPool = await getTenantPool(req.dbName);
    next();
  } catch (err) {
    console.error('Error connecting to tenant DB:', err);
    res.status(503).json({ error: 'No se pudo conectar a la base de datos del cliente' });
  }
}

export function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
      req.tenantId = decoded.id_tenant;
      req.dbName = decoded.db_name;
    }
  }
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }
    next();
  };
}

export function requirePermission(modulo, accion) {
  return (req, res, next) => {
    if (!req.user || !req.user.permisos) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const permiso = req.user.permisos.find(p => p.modulo === modulo || p.modulo === 'Todos');
    if (!permiso) {
      return res.status(403).json({ error: `No tiene acceso al módulo: ${modulo}` });
    }

    const permisoMap = { leer: 'puede_leer', escribir: 'puede_escribir', eliminar: 'puede_eliminar', exportar: 'puede_exportar' };
    const campo = permisoMap[accion];
    if (campo && !permiso[campo]) {
      return res.status(403).json({ error: `No tiene permiso de ${accion} en: ${modulo}` });
    }

    next();
  };
}
