import { Router } from 'express';
import bcrypt from 'bcrypt';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { createTenantDatabase } from '../db-tenant.js';
import { generateToken, authenticateUser, getUserWithTenant, getUserPermissions, verifyToken } from '../utils/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const user = await authenticateUser(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generateToken({
      id_usuario: user.id_usuario,
      username: user.username,
      id_tenant: user.id_tenant,
      rol: user.rol,
      tenant_nombre: user.tenant_nombre,
      db_name: user.db_name,
      permisos: user.permisos
    });

    res.json({
      success: true,
      token,
      user: {
        id_usuario: user.id_usuario,
        username: user.username,
        id_tenant: user.id_tenant,
        tenant_nombre: user.tenant_nombre,
        rol: user.rol,
        db_name: user.db_name,
        permisos: user.permisos
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const token = authHeader.substring(7);

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const user = await getUserWithTenant(decoded.id_usuario);
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      user: {
        id_usuario: user.id_usuario,
        username: user.username,
        email: user.email,
        id_tenant: user.id_tenant,
        tenant_nombre: user.tenant_nombre,
        tenant_nit: user.tenant_nit,
        rol: user.rol,
        db_name: user.db_name,
        permisos: user.permisos
      }
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/permissions', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const token = authHeader.substring(7);
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'sas-agricolas-secret-key-change-in-production';
    const decoded = jwt.verify(token, JWT_SECRET);

    const permisos = await getUserPermissions(decoded.rol);
    res.json({ permisos });
  } catch (err) {
    console.error('Get permissions error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, id_tenant } = req.body;

    if (!username || !email || !password || !id_tenant) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const [existing] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Usuario o email ya existe' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO usuarios (username, email, password_hash, id_tenant, rol, activo) VALUES (?, ?, ?, ?, ?, 1)',
      [username, email, passwordHash, id_tenant, 'Operario']
    );

    const user = await getUserWithTenant(result.insertId);
    const token = generateToken({
      id_usuario: user.id_usuario,
      username: user.username,
      id_tenant: user.id_tenant,
      rol: user.rol,
      tenant_nombre: user.tenant_nombre,
      db_name: user.db_name,
      permisos: user.permisos
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id_usuario: user.id_usuario,
        username: user.username,
        id_tenant: user.id_tenant,
        tenant_nombre: user.tenant_nombre,
        rol: user.rol,
        db_name: user.db_name,
        permisos: user.permisos
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/register-tenant - Self-register new tenant
router.post('/register-tenant', async (req, res) => {
  try {
    const {
      razon_social, nombre_comercial, nit, pais = 'Colombia',
      moneda_local = 'COP', huso_horario = 'America/Bogota',
      admin_username, admin_email, admin_password
    } = req.body;

    if (!razon_social || !nombre_comercial || !nit) {
      return res.status(400).json({ error: 'Razón social, nombre comercial y NIT son requeridos' });
    }

    if (!admin_username || !admin_email || !admin_password) {
      return res.status(400).json({ error: 'Datos del administrador requeridos' });
    }

    // Check NIT unique
    const [existing] = await pool.query('SELECT id_tenant FROM tenants WHERE nit = ?', [nit]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Ya existe una empresa con ese NIT' });
    }

    // Check admin username unique
    const [existingUser] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE username = ? OR email = ?',
      [admin_username, admin_email]
    );
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Username o email ya existe' });
    }

    // Generate db_name
    const [maxId] = await pool.query('SELECT IFNULL(MAX(id_tenant), 0) + 1 as next_id FROM tenants');
    const nextId = maxId[0].next_id;
    const dbName = `sas_tenant_${nextId}`;

    // Create database with schema
    const tenantPool = await createTenantDatabase(dbName);

    // Load and execute tenant schema
    const schemaPath = join(__dirname, '..', 'templates', 'tenant-schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf8');
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      try {
        await tenantPool.query(stmt);
      } catch (e) {
        if (!e.message.includes('Duplicate') && !e.message.includes('already exists')) {
          console.warn(`Schema warning: ${e.message}`);
        }
      }
    }

    // Insert tenant record (Pendiente until Super_Admin activates)
    const passwordHash = await bcrypt.hash(admin_password, 10);
    const [result] = await pool.query(`
      INSERT INTO tenants (db_name, nit, razon_social, nombre_comercial, pais, moneda_local,
        huso_horario, plan_suscripcion, fecha_inicio_suscripcion, estado_suscripcion,
        limite_hectareas, limite_usuarios, activo, fecha_creacion)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Basic', CURDATE(), 'Pendiente', 50, 3, 1, NOW())
    `, [dbName, nit, razon_social, nombre_comercial, pais, moneda_local, huso_horario]);

    const idTenant = result.insertId;

    // Create admin user
    await pool.query(`
      INSERT INTO usuarios (username, email, password_hash, id_tenant, rol, activo, fecha_creacion)
      VALUES (?, ?, ?, ?, 'Super_Admin', 1, NOW())
    `, [admin_username, admin_email, passwordHash, idTenant]);

    res.status(201).json({
      success: true,
      message: 'Empresa creada exitosamente. Espere activación del administrador del sistema.',
      data: {
        id_tenant: idTenant,
        razon_social,
        nit
      }
    });
  } catch (err) {
    console.error('Register tenant error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const token = authHeader.substring(7);
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'sas-agricolas-secret-key-change-in-production';
    const decoded = jwt.verify(token, JWT_SECRET);

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseña actual y nueva requeridas' });
    }

    const [rows] = await pool.query(
      'SELECT password_hash FROM usuarios WHERE id_usuario = ?',
      [decoded.id_usuario]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?',
      [newHash, decoded.id_usuario]
    );

    res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
