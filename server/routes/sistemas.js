import { Router } from 'express';
import bcrypt from 'bcrypt';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { getDb } from '../utils/db.js';
import { createTenantDatabase, getTenantPool, invalidatePool } from '../db-tenant.js';
import { requireRole } from '../utils/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// All sistemas routes require Super_Admin
router.use(requireRole('Super_Admin'));

// GET /api/sistemas/tenants - List all tenants
router.get('/tenants', async (req, res) => {
  try {
    const [rows] = await getDb(req).query(`
      SELECT t.*,
        (SELECT COUNT(*) FROM usuarios u WHERE u.id_tenant = t.id_tenant) as total_usuarios
      FROM tenants t
      ORDER BY t.fecha_creacion DESC
    `);
    res.json({ data: rows });
  } catch (err) {
    console.error('Error listing tenants:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sistemas/tenant/:id - Tenant detail
router.get('/tenant/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [tenants] = await getDb(req).query(
      'SELECT * FROM tenants WHERE id_tenant = ?',
      [id]
    );
    if (tenants.length === 0) {
      return res.status(404).json({ error: 'Tenant no encontrado' });
    }

    const tenant = tenants[0];

    // Get users
    const [users] = await getDb(req).query(
      'SELECT id_usuario, username, email, rol, activo, fecha_creacion FROM usuarios WHERE id_tenant = ?',
      [id]
    );

    // Get fincas count from tenant's own DB
    let fincasCount = 0;
    let lotesCount = 0;
    let hectareas = 0;
    try {
      const tenantPool = await getTenantPool(tenant.db_name);
      const [fCount] = await tenantPool.query('SELECT COUNT(*) as count FROM fincas');
      fincasCount = fCount[0].count;
      const [lCount] = await tenantPool.query('SELECT COUNT(*) as count, IFNULL(SUM(hectareas), 0) as total_ha FROM lotes');
      lotesCount = lCount[0].count;
      hectareas = parseFloat(lCount[0].total_ha) || 0;
    } catch (e) {
      // Tenant DB might not exist yet
    }

    res.json({
      data: {
        ...tenant,
        usuarios: users,
        stats: { fincas: fincasCount, lotes: lotesCount, hectareas }
      }
    });
  } catch (err) {
    console.error('Error getting tenant:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sistemas/tenant - Create tenant
router.post('/tenant', async (req, res) => {
  try {
    const {
      razon_social, nombre_comercial, nit, pais = 'Colombia',
      moneda_local = 'COP', huso_horario = 'America/Bogota',
      plan_suscripcion = 'Basic', limite_hectareas = 50, limite_usuarios = 3,
      admin_username, admin_email, admin_password,
      tipo_documento, dv, tipo_contribuyente, regimen_tributario,
      responsabilidades_fiscales, codigo_ciiu, direccion_fiscal,
      departamento_fiscal, municipio_fiscal, correo_facturacion, telefono_contacto
    } = req.body;

    if (!razon_social || !nombre_comercial || !nit) {
      return res.status(400).json({ error: 'Razón social, nombre comercial y NIT son requeridos' });
    }

    if (!admin_username || !admin_email || !admin_password) {
      return res.status(400).json({ error: 'Datos del administrador requeridos (username, email, password)' });
    }

    // Check NIT unique
    const [existing] = await getDb(req).query('SELECT id_tenant FROM tenants WHERE nit = ?', [nit]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Ya existe un tenant con ese NIT' });
    }

    // Check admin username unique
    const [existingUser] = await getDb(req).query('SELECT id_usuario FROM usuarios WHERE username = ? OR email = ?', [admin_username, admin_email]);
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Username o email del admin ya existe' });
    }

    // Generate db_name
    const [maxId] = await getDb(req).query('SELECT IFNULL(MAX(id_tenant), 0) + 1 as next_id FROM tenants');
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
        // Skip non-critical errors (e.g., duplicate key on re-run)
        if (!e.message.includes('Duplicate') && !e.message.includes('already exists')) {
          console.warn(`Schema warning: ${e.message}`);
        }
      }
    }

    // Insert tenant record
    const passwordHash = await bcrypt.hash(admin_password, 10);
    const [result] = await getDb(req).query(`
      INSERT INTO tenants (db_name, nit, razon_social, nombre_comercial, pais, moneda_local,
        huso_horario, plan_suscripcion, fecha_inicio_suscripcion, estado_suscripcion,
        limite_hectareas, limite_usuarios, activo, fecha_creacion,
        tipo_documento, dv, tipo_contribuyente, regimen_tributario,
        responsabilidades_fiscales, codigo_ciiu, direccion_fiscal,
        departamento_fiscal, municipio_fiscal, correo_facturacion, telefono_contacto)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'Pendiente', ?, ?, 1, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [dbName, nit, razon_social, nombre_comercial, pais, moneda_local,
        huso_horario, plan_suscripcion, limite_hectareas, limite_usuarios,
        tipo_documento, dv, tipo_contribuyente, regimen_tributario,
        responsabilidades_fiscales, codigo_ciiu, direccion_fiscal,
        departamento_fiscal, municipio_fiscal, correo_facturacion, telefono_contacto]);

    const idTenant = result.insertId;

    // Create admin user in main database
    await getDb(req).query(`
      INSERT INTO usuarios (username, email, password_hash, id_tenant, rol, activo, fecha_creacion)
      VALUES (?, ?, ?, ?, 'Super_Admin', 1, NOW())
    `, [admin_username, admin_email, passwordHash, idTenant]);

    res.status(201).json({
      success: true,
      message: 'Tenant creado exitosamente',
      data: {
        id_tenant: idTenant,
        db_name: dbName,
        razon_social,
        nit
      }
    });
  } catch (err) {
    console.error('Error creating tenant:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sistemas/tenant/:id - Update tenant
router.put('/tenant/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      razon_social, nombre_comercial, nit, pais, moneda_local,
      huso_horario, plan_suscripcion, limite_hectareas, limite_usuarios,
      tipo_documento, dv, tipo_contribuyente, regimen_tributario,
      responsabilidades_fiscales, codigo_ciiu, direccion_fiscal,
      departamento_fiscal, municipio_fiscal, correo_facturacion, telefono_contacto
    } = req.body;

    // Check NIT unique (excluding current)
    if (nit) {
      const [existing] = await getDb(req).query(
        'SELECT id_tenant FROM tenants WHERE nit = ? AND id_tenant != ?',
        [nit, id]
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Ya existe otro tenant con ese NIT' });
      }
    }

    await getDb(req).query(`
      UPDATE tenants SET
        razon_social = COALESCE(?, razon_social),
        nombre_comercial = COALESCE(?, nombre_comercial),
        nit = COALESCE(?, nit),
        pais = COALESCE(?, pais),
        moneda_local = COALESCE(?, moneda_local),
        huso_horario = COALESCE(?, huso_horario),
        plan_suscripcion = COALESCE(?, plan_suscripcion),
        limite_hectareas = COALESCE(?, limite_hectareas),
        limite_usuarios = COALESCE(?, limite_usuarios),
        tipo_documento = COALESCE(?, tipo_documento),
        dv = COALESCE(?, dv),
        tipo_contribuyente = COALESCE(?, tipo_contribuyente),
        regimen_tributario = COALESCE(?, regimen_tributario),
        responsabilidades_fiscales = COALESCE(?, responsabilidades_fiscales),
        codigo_ciiu = COALESCE(?, codigo_ciiu),
        direccion_fiscal = COALESCE(?, direccion_fiscal),
        departamento_fiscal = COALESCE(?, departamento_fiscal),
        municipio_fiscal = COALESCE(?, municipio_fiscal),
        correo_facturacion = COALESCE(?, correo_facturacion),
        telefono_contacto = COALESCE(?, telefono_contacto)
      WHERE id_tenant = ?
    `, [razon_social, nombre_comercial, nit, pais, moneda_local,
        huso_horario, plan_suscripcion, limite_hectareas, limite_usuarios,
        tipo_documento, dv, tipo_contribuyente, regimen_tributario,
        responsabilidades_fiscales, codigo_ciiu, direccion_fiscal,
        departamento_fiscal, municipio_fiscal, correo_facturacion, telefono_contacto, id]);

    res.json({ success: true, message: 'Tenant actualizado' });
  } catch (err) {
    console.error('Error updating tenant:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sistemas/tenant/:id/estado - Toggle tenant state
router.put('/tenant/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_suscripcion } = req.body;

    if (!['Activo', 'Pendiente', 'Vencido', 'Suspendido'].includes(estado_suscripcion)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const activo = estado_suscripcion === 'Activo' ? 1 : 0;
    await getDb(req).query(
      'UPDATE tenants SET estado_suscripcion = ?, activo = ? WHERE id_tenant = ?',
      [estado_suscripcion, activo, id]
    );

    res.json({ success: true, message: `Tenant ${estado_suscripcion}` });
  } catch (err) {
    console.error('Error changing tenant state:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sistemas/tenant/:id/reset-admin - Reset admin password
router.post('/tenant/:id/reset-admin', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_password } = req.body;

    if (!admin_password) {
      return res.status(400).json({ error: 'Nueva contraseña requerida' });
    }

    const [users] = await getDb(req).query(
      "SELECT id_usuario FROM usuarios WHERE id_tenant = ? AND rol = 'Super_Admin' LIMIT 1",
      [id]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'Admin no encontrado' });
    }

    const passwordHash = await bcrypt.hash(admin_password, 10);
    await getDb(req).query('UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?',
      [passwordHash, users[0].id_usuario]);

    res.json({ success: true, message: 'Contraseña del admin actualizada' });
  } catch (err) {
    console.error('Error resetting admin password:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sistemas/tenant/:id/resoluciones - List resolutions
router.get('/tenant/:id/resoluciones', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await getDb(req).query('SELECT * FROM dian_resoluciones WHERE id_tenant = ? ORDER BY created_at DESC', [id]);
    res.json({ data: rows });
  } catch (err) {
    console.error('Error fetching resoluciones:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sistemas/tenant/:id/resoluciones - Create resolution
router.post('/tenant/:id/resoluciones', async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_resolucion, numero_resolucion, prefijo, consecutivo_inicial, consecutivo_final, consecutivo_actual, fecha_inicial, fecha_vence, estado } = req.body;
    
    if (!tipo_resolucion || !numero_resolucion || !prefijo || !consecutivo_inicial || !consecutivo_final || !fecha_inicial || !fecha_vence) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para la resolución.' });
    }

    const currentActual = consecutivo_actual || consecutivo_inicial;
    const finalEstado = estado || 'Activa';

    if (finalEstado === 'Activa') {
      await getDb(req).query('UPDATE dian_resoluciones SET estado = ? WHERE id_tenant = ? AND tipo_resolucion = ? AND estado = ?', ['Inactiva', id, tipo_resolucion, 'Activa']);
    }
    
    const [result] = await getDb(req).query(`
      INSERT INTO dian_resoluciones (id_tenant, tipo_resolucion, numero_resolucion, prefijo, consecutivo_inicial, consecutivo_final, consecutivo_actual, fecha_inicial, fecha_vence, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, tipo_resolucion, numero_resolucion, prefijo, consecutivo_inicial, consecutivo_final, currentActual, fecha_inicial, fecha_vence, finalEstado]);
    
    res.status(201).json({ success: true, message: 'Resolución creada exitosamente', id_resolucion: result.insertId });
  } catch (err) {
    console.error('Error creating resolucion:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sistemas/tenant/:id/resoluciones/:idRes - Update resolution
router.put('/tenant/:id/resoluciones/:idRes', async (req, res) => {
  try {
    const { id, idRes } = req.params;
    const { tipo_resolucion, numero_resolucion, prefijo, consecutivo_inicial, consecutivo_final, consecutivo_actual, fecha_inicial, fecha_vence, estado } = req.body;
    
    if (estado === 'Activa') {
      const typeToUse = tipo_resolucion || (await getDb(req).query('SELECT tipo_resolucion FROM dian_resoluciones WHERE id_resolucion = ?', [idRes]))[0][0].tipo_resolucion;
      await getDb(req).query('UPDATE dian_resoluciones SET estado = ? WHERE id_tenant = ? AND tipo_resolucion = ? AND id_resolucion != ? AND estado = ?', ['Inactiva', id, typeToUse, idRes, 'Activa']);
    }

    await getDb(req).query(`
      UPDATE dian_resoluciones SET
        tipo_resolucion = COALESCE(?, tipo_resolucion),
        numero_resolucion = COALESCE(?, numero_resolucion),
        prefijo = COALESCE(?, prefijo),
        consecutivo_inicial = COALESCE(?, consecutivo_inicial),
        consecutivo_final = COALESCE(?, consecutivo_final),
        consecutivo_actual = COALESCE(?, consecutivo_actual),
        fecha_inicial = COALESCE(?, fecha_inicial),
        fecha_vence = COALESCE(?, fecha_vence),
        estado = COALESCE(?, estado)
      WHERE id_resolucion = ? AND id_tenant = ?
    `, [tipo_resolucion, numero_resolucion, prefijo, consecutivo_inicial, consecutivo_final, consecutivo_actual, fecha_inicial, fecha_vence, estado, idRes, id]);
    
    res.json({ success: true, message: 'Resolución actualizada' });
  } catch (err) {
    console.error('Error updating resolucion:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [tenants] = await getDb(req).query("SELECT COUNT(*) as total, SUM(activo = 1) as activos, SUM(estado_suscripcion = 'Pendiente') as pendientes FROM tenants");
    const [usuarios] = await getDb(req).query('SELECT COUNT(*) as total FROM usuarios');

    const [planes] = await getDb(req).query('SELECT plan_suscripcion, COUNT(*) as count FROM tenants GROUP BY plan_suscripcion');

    res.json({
      totalTenants: tenants[0].total,
      tenantsActivos: tenants[0].activos || 0,
      tenantsPendientes: tenants[0].pendientes || 0,
      totalUsuarios: usuarios[0].total,
      distribucionPlanes: Object.fromEntries(planes.map(p => [p.plan_suscripcion, p.count]))
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
