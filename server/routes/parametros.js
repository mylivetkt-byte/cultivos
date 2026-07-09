import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// ----------------------------------------------------
// 1. SUBEMPRESAS (FINCAS)
// ----------------------------------------------------
router.get('/subempresas', async (req, res) => {
  const tenantId = req.query.tenantId || 1;
  try {
    const [rows] = await getDb(req).query('SELECT * FROM fincas WHERE id_tenant = ? ORDER BY id_finca', [tenantId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/subempresas', async (req, res) => {
  const { id_tenant, codigo, nombre, hectareas_totales, activo } = req.body;
  try {
    // Verificar unicidad de código y nombre dentro del mismo tenant
    const [dup] = await getDb(req).query(
      'SELECT 1 FROM fincas WHERE id_tenant = ? AND (codigo = ? OR nombre = ?)',
      [id_tenant || 1, codigo, nombre]
    );
    if (dup.length) {
      return res.status(409).json({ error: 'Código o nombre de finca ya existe para este cliente' });
    }
    const [result] = await getDb(req).query(
      'INSERT INTO fincas (id_tenant, codigo, nombre, hectareas_totales, activo) VALUES (?, ?, ?, ?, ?)',
      [id_tenant || 1, codigo, nombre, hectareas_totales || 0, activo !== undefined ? activo : 1]
    );
    res.json({ id_finca: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


router.put('/subempresas/:id', async (req, res) => {
  const { codigo, nombre, hectareas_totales, activo } = req.body;
  try {
    await getDb(req).query('UPDATE fincas SET codigo=?, nombre=?, hectareas_totales=?, activo=? WHERE id_finca=?', [codigo, nombre, hectareas_totales, activo, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/subempresas/:id', async (req, res) => {
  try {
    await getDb(req).query('DELETE FROM fincas WHERE id_finca=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ----------------------------------------------------
// 2. LAPSOS (PERIODOS)
// ----------------------------------------------------
router.get('/periodos', async (req, res) => {
  try {
    const [rows] = await getDb(req).query("SELECT * FROM periodos_contables ORDER BY id_tenant, ano DESC, mes DESC");
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/periodos', async (req, res) => {
  const { id_tenant, ano, mes, fecha_inicio, fecha_fin, estado } = req.body;
  try {
    const [result] = await getDb(req).query('INSERT INTO periodos_contables (id_tenant, ano, mes, fecha_inicio, fecha_fin, estado) VALUES (?, ?, ?, ?, ?, ?)', [id_tenant, ano, mes, fecha_inicio, fecha_fin, estado || 'Abierto']);
    res.json({ id_periodo: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/periodos/:id', async (req, res) => {
  const { ano, mes, fecha_inicio, fecha_fin, estado } = req.body;
  try {
    await getDb(req).query('UPDATE periodos_contables SET ano=?, mes=?, fecha_inicio=?, fecha_fin=?, estado=? WHERE id_periodo=?', [ano, mes, fecha_inicio, fecha_fin, estado, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/periodos/:id', async (req, res) => {
  try {
    await getDb(req).query('DELETE FROM periodos_contables WHERE id_periodo=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ----------------------------------------------------
// 3. COMPROBANTES
// ----------------------------------------------------
router.get('/comprobantes', async (req, res) => {
  try {
    const [rows] = await getDb(req).query('SELECT * FROM tipos_comprobantes ORDER BY id_tenant, codigo');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/comprobantes', async (req, res) => {
  const { id_tenant, codigo, nombre } = req.body;
  try {
    const [result] = await getDb(req).query('INSERT INTO tipos_comprobantes (id_tenant, codigo, nombre) VALUES (?, ?, ?)', [id_tenant, codigo, nombre]);
    res.json({ id_tipo_comp: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/comprobantes/:id', async (req, res) => {
  const { codigo, nombre } = req.body;
  try {
    await getDb(req).query('UPDATE tipos_comprobantes SET codigo=?, nombre=? WHERE id_tipo_comp=?', [codigo, nombre, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/comprobantes/:id', async (req, res) => {
  try {
    await getDb(req).query('DELETE FROM tipos_comprobantes WHERE id_tipo_comp=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ----------------------------------------------------
// 4. TIPOS DE DOCUMENTOS
// ----------------------------------------------------
router.get('/tiposdoc', async (req, res) => {
  try {
    const [rows] = await getDb(req).query(`
      SELECT td.*, tc.codigo as comp_codigo 
      FROM tipos_documentos td 
      JOIN tipos_comprobantes tc ON td.id_tipo_comp = tc.id_tipo_comp 
      ORDER BY td.id_tenant, tc.codigo, td.codigo
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/tiposdoc', async (req, res) => {
  const { id_tenant, id_tipo_comp, codigo, nombre, consecutivo_actual, es_manual } = req.body;
  try {
    const [result] = await getDb(req).query('INSERT INTO tipos_documentos (id_tenant, id_tipo_comp, codigo, nombre, consecutivo_actual, es_manual) VALUES (?, ?, ?, ?, ?, ?)', [id_tenant, id_tipo_comp, codigo, nombre, consecutivo_actual || 1, es_manual ? 1 : 0]);
    res.json({ id_tipo_doc: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/tiposdoc/:id', async (req, res) => {
  const { id_tipo_comp, codigo, nombre, consecutivo_actual, es_manual } = req.body;
  try {
    await getDb(req).query('UPDATE tipos_documentos SET id_tipo_comp=?, codigo=?, nombre=?, consecutivo_actual=?, es_manual=? WHERE id_tipo_doc=?', [id_tipo_comp, codigo, nombre, consecutivo_actual, es_manual ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/tiposdoc/:id', async (req, res) => {
  try {
    await getDb(req).query('DELETE FROM tipos_documentos WHERE id_tipo_doc=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ----------------------------------------------------
// 5. CENTROS DE COSTO
// ----------------------------------------------------
router.get('/centros', async (req, res) => {
  try {
    const [rows] = await getDb(req).query('SELECT * FROM centros_costo ORDER BY id_tenant, codigo');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/centros', async (req, res) => {
  const { id_tenant, codigo, nombre, tipo, activo } = req.body;
  try {
    const [result] = await getDb(req).query('INSERT INTO centros_costo (id_tenant, codigo, nombre, tipo, activo) VALUES (?, ?, ?, ?, ?)', [id_tenant, codigo, nombre, tipo, activo !== undefined ? activo : 1]);
    res.json({ id_centro_costo: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/centros/:id', async (req, res) => {
  const { codigo, nombre, tipo, activo } = req.body;
  try {
    await getDb(req).query('UPDATE centros_costo SET codigo=?, nombre=?, tipo=?, activo=? WHERE id_centro_costo=?', [codigo, nombre, tipo, activo !== undefined ? activo : 1, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/centros/:id', async (req, res) => {
  try {
    await getDb(req).query('DELETE FROM centros_costo WHERE id_centro_costo=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ----------------------------------------------------
// 6. PLAN CONTABLE (PUC)
// ----------------------------------------------------
router.get('/puc', async (req, res) => {
  const tenantId = req.query.tenantId || 1;
  try {
    const [rows] = await getDb(req).query('SELECT * FROM plan_contable WHERE id_tenant = ? ORDER BY codigo', [tenantId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/puc', async (req, res) => {
  const { id_tenant, codigo, nombre, nivel, naturaleza, requiere_centro_costo, requiere_tercero, requiere_cxc, requiere_cxp, maneja_iva, maneja_retefuente, maneja_reteica, activo } = req.body;
  try {
    const [result] = await getDb(req).query(`
      INSERT INTO plan_contable (id_tenant, codigo, nombre, nivel, naturaleza, requiere_centro_costo, requiere_tercero, requiere_cxc, requiere_cxp, maneja_iva, maneja_retefuente, maneja_reteica, activo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id_tenant || 1, codigo, nombre, nivel, naturaleza, requiere_centro_costo?1:0, requiere_tercero?1:0, requiere_cxc?1:0, requiere_cxp?1:0, maneja_iva?1:0, maneja_retefuente?1:0, maneja_reteica?1:0, activo !== undefined ? activo : 1]);
    res.json({ id_cuenta: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/puc/:id', async (req, res) => {
  const { codigo, nombre, nivel, naturaleza, requiere_centro_costo, requiere_tercero, requiere_cxc, requiere_cxp, maneja_iva, maneja_retefuente, maneja_reteica, activo } = req.body;
  try {
    await getDb(req).query(`
      UPDATE plan_contable 
      SET codigo=?, nombre=?, nivel=?, naturaleza=?, requiere_centro_costo=?, requiere_tercero=?, requiere_cxc=?, requiere_cxp=?, maneja_iva=?, maneja_retefuente=?, maneja_reteica=?, activo=? 
      WHERE id_cuenta=?
    `, [codigo, nombre, nivel, naturaleza, requiere_centro_costo?1:0, requiere_tercero?1:0, requiere_cxc?1:0, requiere_cxp?1:0, maneja_iva?1:0, maneja_retefuente?1:0, maneja_reteica?1:0, activo !== undefined ? activo : 1, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/puc/:id', async (req, res) => {
  try {
    await getDb(req).query('DELETE FROM plan_contable WHERE id_cuenta=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ----------------------------------------------------
// 7. TERCEROS
// ----------------------------------------------------
router.get('/terceros', async (req, res) => {
  try {
    const [rows] = await getDb(req).query('SELECT * FROM terceros ORDER BY id_tenant, documento');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/terceros', async (req, res) => {
  const { id_tenant, documento, tipo_documento, dv, nombre_completo, razon_social, email, direccion, telefono, celular, tipo_tercero } = req.body;
  try {
    const [dup] = await getDb(req).query(
      'SELECT 1 FROM terceros WHERE id_tenant = ? AND documento = ?',
      [id_tenant, documento]
    );
    if (dup.length) {
      return res.status(409).json({ error: 'Documento ya existe para este cliente' });
    }
    const [result] = await getDb(req).query(
      'INSERT INTO terceros (id_tenant, tipo_documento, documento, dv, nombre_completo, razon_social, email, direccion, telefono, celular, tipo_tercero, es_proveedor_agricola, es_cliente) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)',
      [id_tenant, tipo_documento, documento, dv, nombre_completo, razon_social, email, direccion, telefono, celular, tipo_tercero]
    );
    res.json({ id_tercero: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/terceros/:id', async (req, res) => {
  const { tipo_documento, documento, dv, nombre_completo, razon_social, email, direccion, telefono, celular, tipo_tercero } = req.body;
  try {
    await getDb(req).query('UPDATE terceros SET tipo_documento=?, documento=?, dv=?, nombre_completo=?, razon_social=?, email=?, direccion=?, telefono=?, celular=?, tipo_tercero=? WHERE id_tercero=?', [tipo_documento, documento, dv, nombre_completo, razon_social, email, direccion, telefono, celular, tipo_tercero, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/terceros/:id', async (req, res) => {
  try {
    await getDb(req).query('DELETE FROM terceros WHERE id_tercero=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
