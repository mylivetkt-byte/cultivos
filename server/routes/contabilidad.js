import express from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';

const router = express.Router();

// 1. Obtener Periodos Contables
router.get('/periodos', async (req, res) => {
  const tenantId = req.query.tenantId || 1;
  try {
    const [rows] = await getDb(req).query(`
      SELECT p.*
      FROM periodos_contables p
      WHERE p.id_tenant = ? OR ? = 'all'
      ORDER BY p.ano DESC, p.mes DESC
    `, [tenantId, tenantId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Obtener Comprobantes (Lotes) de un Periodo
router.get('/comprobantes/:id_periodo', async (req, res) => {
  try {
    const [rows] = await getDb(req).query(`
      SELECT c.*, tc.codigo as tipo_codigo, tc.nombre as tipo_nombre,
        (SELECT COALESCE(SUM(cd.debito), 0) FROM contab_detalles cd JOIN contab_documentos doc ON cd.id_documento = doc.id_documento WHERE doc.id_comprobante = c.id_comprobante) as total_debito,
        (SELECT COALESCE(SUM(cd.credito), 0) FROM contab_detalles cd JOIN contab_documentos doc ON cd.id_documento = doc.id_documento WHERE doc.id_comprobante = c.id_comprobante) as total_credito
      FROM contab_comprobantes c
      JOIN tipos_comprobantes tc ON c.id_tipo_comp = tc.id_tipo_comp
      WHERE c.id_periodo = ?
      ORDER BY c.id_comprobante DESC
    `, [req.params.id_periodo]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Crear Comprobante (Lote)
router.post('/comprobantes', async (req, res) => {
  const { id_tenant, id_periodo, id_tipo_comp, numero, descripcion } = req.body;
  try {
    const [result] = await getDb(req).query(`
      INSERT INTO contab_comprobantes (id_tenant, id_periodo, id_tipo_comp, numero, descripcion)
      VALUES (?, ?, ?, ?, ?)
    `, [id_tenant || 1, id_periodo, id_tipo_comp, numero, descripcion]);
    res.json({ id_comprobante: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Obtener Documentos de un Comprobante
router.get('/comprobantes/:id/documentos', async (req, res) => {
  try {
    const [rows] = await getDb(req).query(`
      SELECT d.*,
        td.codigo as tipo_codigo, td.nombre as tipo_nombre,
        t.documento as tercero_nit, t.nombre_completo as tercero_nombre,
        (SELECT COALESCE(SUM(cd.debito), 0) FROM contab_detalles cd WHERE cd.id_documento = d.id_documento) as total_debito,
        (SELECT COALESCE(SUM(cd.credito), 0) FROM contab_detalles cd WHERE cd.id_documento = d.id_documento) as total_credito
      FROM contab_documentos d
      JOIN tipos_documentos td ON d.id_tipo_doc = td.id_tipo_doc
      LEFT JOIN terceros t ON d.id_tercero = t.id_tercero
      WHERE d.id_comprobante = ?
      ORDER BY d.id_documento ASC
    `, [req.params.id]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Crear Documento
router.post('/comprobantes/:id/documentos', async (req, res) => {
  const id_comprobante = req.params.id;
  const { id_tenant, id_tipo_doc, numero_doc, fecha, concepto, id_tercero } = req.body;
  try {
    const [result] = await getDb(req).query(`
      INSERT INTO contab_documentos (id_tenant, id_comprobante, id_tipo_doc, numero_doc, fecha, concepto, id_tercero)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id_tenant || 1, id_comprobante, id_tipo_doc, numero_doc, fecha, concepto, id_tercero || null]);
    res.json({ id_documento: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Obtener Detalles de un Documento
router.get('/documentos/:id/detalles', async (req, res) => {
  try {
    const [rows] = await getDb(req).query(`
      SELECT cd.*, 
        pc.codigo as cuenta_codigo, pc.nombre as cuenta_nombre,
        cc.codigo as cc_codigo, cc.nombre as cc_nombre,
        t.documento as tercero_nit, t.nombre_completo as tercero_nombre
      FROM contab_detalles cd
      JOIN plan_contable pc ON cd.id_cuenta = pc.id_cuenta
      LEFT JOIN centros_costo cc ON cd.id_centro_costo = cc.id_centro_costo
      LEFT JOIN terceros t ON cd.id_tercero = t.id_tercero
      WHERE cd.id_documento = ?
      ORDER BY cd.id_detalle ASC
    `, [req.params.id]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Crear Detalle
router.post('/documentos/:id/detalles', async (req, res) => {
  const id_documento = req.params.id;
  const { id_cuenta, id_tercero, id_centro_costo, descripcion, valor_base, debito, credito } = req.body;
  try {
    const [result] = await getDb(req).query(`
      INSERT INTO contab_detalles (id_documento, id_cuenta, id_tercero, id_centro_costo, descripcion, valor_base, debito, credito)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id_documento, id_cuenta, id_tercero || null, id_centro_costo || null, descripcion, valor_base || 0, debito || 0, credito || 0]);
    res.json({ id_detalle: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 8. Eliminar Detalle
router.delete('/detalles/:id', async (req, res) => {
  try {
    await getDb(req).query(`DELETE FROM contab_detalles WHERE id_detalle = ?`, [req.params.id]);
    res.json({ message: 'Detalle eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 8.0 Actualizar Detalle (Cantidades/Montos)
router.put('/detalles/:id', async (req, res) => {
  const { debito, credito } = req.body;
  try {
    await getDb(req).query(`UPDATE contab_detalles SET debito = ?, credito = ? WHERE id_detalle = ?`, [debito || 0, credito || 0, req.params.id]);
    res.json({ message: 'Detalle actualizado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 8.1 Eliminar Documento Completo
router.delete('/documentos/:id', async (req, res) => {
  try {
    await getDb(req).query(`DELETE FROM contab_documentos WHERE id_documento = ?`, [req.params.id]);
    res.json({ message: 'Documento eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 8.2 Eliminar Comprobante (Vaciar Lote)
router.delete('/comprobantes/:id', async (req, res) => {
  try {
    await getDb(req).query(`DELETE FROM contab_comprobantes WHERE id_comprobante = ?`, [req.params.id]);
    res.json({ message: 'Comprobante eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 9. Catalogos
router.get('/catalogos', async (req, res) => {
  const tenantId = req.query.tenantId || 1;
  try {
    const [cuentas] = await getDb(req).query(`SELECT * FROM plan_contable WHERE (id_tenant = ? OR ? = 'all') AND activo = 1 ORDER BY codigo`, [tenantId, tenantId]);
    const [tipos] = await getDb(req).query(`SELECT * FROM tipos_comprobantes WHERE id_tenant = ? OR ? = 'all'`, [tenantId, tenantId]);
    const [tiposDoc] = await getDb(req).query(`SELECT * FROM tipos_documentos WHERE id_tenant = ? OR ? = 'all'`, [tenantId, tenantId]);
    const [centros] = await getDb(req).query(`SELECT * FROM centros_costo WHERE (id_tenant = ? OR ? = 'all') AND activo = 1`, [tenantId, tenantId]);
    const [terceros] = await getDb(req).query(`SELECT id_tercero, documento as numero_identificacion, nombre_completo as razon_social FROM terceros WHERE id_tenant = ? OR ? = 'all'`, [tenantId, tenantId]);
    const [fincas] = await getDb(req).query(`SELECT id_finca, codigo, nombre FROM fincas WHERE id_tenant = ? OR ? = 'all'`, [tenantId, tenantId]);
    const [plantillas] = await getDb(req).query(`SELECT * FROM contab_plantillas WHERE id_tenant = ? OR ? = 'all'`, [tenantId, tenantId]);
    res.json({ cuentas, tipos, tiposDoc, centros, terceros, fincas, plantillas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 10. SubEmpresas (Fincas)
router.get('/subempresas', async (req, res) => {
  const tenantId = req.query.tenantId || 1;
  try {
    const [rows] = await getDb(req).query(`SELECT id_finca, nombre FROM fincas WHERE id_tenant = ?`, [tenantId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 11. Plantillas Contables (Modelos)
router.get('/plantillas', async (req, res) => {
  const tenantId = req.query.tenantId || 1;
  try {
    const [plantillas] = await getDb(req).query(`SELECT * FROM contab_plantillas WHERE id_tenant = ? ORDER BY nombre`, [tenantId]);
    for (let p of plantillas) {
      const [detalles] = await getDb(req).query(`
        SELECT d.*, c.codigo, c.nombre as cuenta_nombre 
        FROM contab_plantillas_detalles d 
        JOIN plan_contable c ON d.id_cuenta = c.id_cuenta 
        WHERE d.id_plantilla = ?`, [p.id_plantilla]);
      p.detalles = detalles;
    }
    res.json(plantillas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/plantillas', async (req, res) => {
  const { id_tenant, nombre, id_tipo_doc_defecto, detalles } = req.body;
  const conn = await getDb(req).getConnection();
  try {
    await conn.beginTransaction();
    const [r1] = await conn.query(`INSERT INTO contab_plantillas (id_tenant, nombre, id_tipo_doc_defecto) VALUES (?, ?, ?)`, 
      [id_tenant, nombre, id_tipo_doc_defecto || null]);
    const id_plantilla = r1.insertId;
    
    if (detalles && detalles.length > 0) {
      const insertData = detalles.map(d => [id_plantilla, d.id_cuenta, d.naturaleza, d.concepto_defecto || '']);
      await conn.query(`INSERT INTO contab_plantillas_detalles (id_plantilla, id_cuenta, naturaleza, concepto_defecto) VALUES ?`, [insertData]);
    }
    await conn.commit();
    res.json({ success: true, id_plantilla });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

router.delete('/plantillas/:id', async (req, res) => {
  try {
    await getDb(req).query(`DELETE FROM contab_plantillas WHERE id_plantilla = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 11.1 Agregar Detalle a Plantilla
router.post('/plantillas/:id/detalles', async (req, res) => {
  const { id_cuenta, naturaleza, concepto_defecto } = req.body;
  try {
    const [result] = await getDb(req).query(
      `INSERT INTO contab_plantillas_detalles (id_plantilla, id_cuenta, naturaleza, concepto_defecto) VALUES (?, ?, ?, ?)`, 
      [req.params.id, id_cuenta, naturaleza, concepto_defecto || '']
    );
    res.json({ success: true, id_detalle_plantilla: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 11.2 Eliminar Detalle de Plantilla
router.delete('/plantillas_detalles/:id', async (req, res) => {
  try {
    await getDb(req).query(`DELETE FROM contab_plantillas_detalles WHERE id_detalle_plantilla = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 12. Aplicar Plantilla a un Documento
router.post('/documentos/:id/aplicar-plantilla', async (req, res) => {
  const id_documento = req.params.id;
  const { id_plantilla } = req.body;
  try {
    const [detalles] = await getDb(req).query(`SELECT * FROM contab_plantillas_detalles WHERE id_plantilla = ?`, [id_plantilla]);
    if (detalles.length === 0) return res.json({ success: true, message: 'Plantilla vacía' });

    const insertData = detalles.map(d => [
      id_documento, 
      d.id_cuenta, 
      null, // tercero
      null, // cc
      d.concepto_defecto || 'Asiento de Plantilla',
      0, // base
      d.naturaleza === 'Debito' ? 0 : 0, 
      d.naturaleza === 'Credito' ? 0 : 0
    ]);
    await getDb(req).query(`INSERT INTO contab_detalles (id_documento, id_cuenta, id_tercero, id_centro_costo, descripcion, valor_base, debito, credito) VALUES ?`, [insertData]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ====== ENDPOINTS PARA CONSULTAS (REPORTES DE SALDOS) ======

const buildDateOrPeriodFilter = (reqQuery) => {
  const { fecha_inicio, fecha_fin, id_periodo_inicio, id_periodo_fin, id_centro_costo, id_finca } = reqQuery;
  let filterSql = '';
  let params = [];
  
  if (id_periodo_inicio && id_periodo_fin) {
    filterSql += ' AND c.id_periodo BETWEEN ? AND ? ';
    params.push(id_periodo_inicio, id_periodo_fin);
  } else {
    filterSql += ' AND doc.fecha BETWEEN ? AND ? ';
    params.push(fecha_inicio || '2000-01-01', fecha_fin || '2099-12-31');
  }

  if (id_finca) {
    filterSql += ' AND d.id_centro_costo IN (SELECT id_centro_costo FROM centros_costo WHERE id_finca = ?) ';
    params.push(id_finca);
  }

  if (id_centro_costo) {
    filterSql += ' AND d.id_centro_costo = ? ';
    params.push(id_centro_costo);
  }
  
  return { filterSql, params };
};

// 1. Saldos de Cuentas
router.get('/consultas/saldos-cuentas', async (req, res) => {
  try {
    const { tenantId } = req.query;
    const { filterSql, params } = buildDateOrPeriodFilter(req.query);
    const [rows] = await getDb(req).query(`
      SELECT 
        p.codigo, p.nombre as cuenta_nombre,
        SUM(d.debito) as total_debito,
        SUM(d.credito) as total_credito,
        SUM(d.debito - d.credito) as saldo
      FROM contab_detalles d
      JOIN contab_documentos doc ON d.id_documento = doc.id_documento
      JOIN contab_comprobantes c ON doc.id_comprobante = c.id_comprobante
      JOIN plan_contable p ON d.id_cuenta = p.id_cuenta
      WHERE c.id_tenant = ? 
      ${filterSql}
      GROUP BY p.id_cuenta, p.codigo, p.nombre
      ORDER BY p.codigo
    `, [tenantId || 1, ...params]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Saldos de Terceros
router.get('/consultas/saldos-terceros', async (req, res) => {
  try {
    const { tenantId } = req.query;
    const { filterSql, params } = buildDateOrPeriodFilter(req.query);
    const [rows] = await getDb(req).query(`
      SELECT 
        t.documento as identificacion, t.nombre_completo as tercero_nombre,
        SUM(d.debito) as total_debito,
        SUM(d.credito) as total_credito,
        SUM(d.debito - d.credito) as saldo
      FROM contab_detalles d
      JOIN contab_documentos doc ON d.id_documento = doc.id_documento
      JOIN contab_comprobantes c ON doc.id_comprobante = c.id_comprobante
      JOIN terceros t ON d.id_tercero = t.id_tercero
      WHERE c.id_tenant = ? 
      ${filterSql}
      GROUP BY t.id_tercero, t.documento, t.nombre_completo
      ORDER BY t.nombre_completo
    `, [tenantId || 1, ...params]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Saldos de Centros de Costos
router.get('/consultas/saldos-centros-costos', async (req, res) => {
  try {
    const { tenantId } = req.query;
    const { filterSql, params } = buildDateOrPeriodFilter(req.query);
    const [rows] = await getDb(req).query(`
      SELECT 
        cc.codigo, cc.nombre as cc_nombre,
        SUM(d.debito) as total_debito,
        SUM(d.credito) as total_credito,
        SUM(d.debito - d.credito) as saldo
      FROM contab_detalles d
      JOIN contab_documentos doc ON d.id_documento = doc.id_documento
      JOIN contab_comprobantes c ON doc.id_comprobante = c.id_comprobante
      JOIN centros_costo cc ON d.id_centro_costo = cc.id_centro_costo
      WHERE c.id_tenant = ? 
      ${filterSql}
      GROUP BY cc.id_centro_costo, cc.codigo, cc.nombre
      ORDER BY cc.codigo
    `, [tenantId || 1, ...params]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Balance Cuentas y Terceros
router.get('/consultas/balance-cuentas-terceros', async (req, res) => {
  try {
    const { tenantId } = req.query;
    const { filterSql, params } = buildDateOrPeriodFilter(req.query);
    const [rows] = await getDb(req).query(`
      SELECT 
        p.codigo as cuenta_codigo, p.nombre as cuenta_nombre,
        t.documento as tercero_id, t.nombre_completo as tercero_nombre,
        SUM(d.debito) as total_debito,
        SUM(d.credito) as total_credito,
        SUM(d.debito - d.credito) as saldo
      FROM contab_detalles d
      JOIN contab_documentos doc ON d.id_documento = doc.id_documento
      JOIN contab_comprobantes c ON doc.id_comprobante = c.id_comprobante
      JOIN plan_contable p ON d.id_cuenta = p.id_cuenta
      LEFT JOIN terceros t ON d.id_tercero = t.id_tercero
      WHERE c.id_tenant = ? 
      ${filterSql}
      GROUP BY p.id_cuenta, p.codigo, p.nombre, t.id_tercero, t.documento, t.nombre_completo
      ORDER BY p.codigo, t.nombre_completo
    `, [tenantId || 1, ...params]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Balance Mensual (por Lapsos/Meses)
router.get('/consultas/balance-mensual', async (req, res) => {
  try {
    const { tenantId, anio, id_finca, id_centro_costo } = req.query;
    const targetAnio = anio || new Date().getFullYear();
    
    let filterSql = '';
    const params = [tenantId || 1, targetAnio];
    
    if (id_finca) {
      filterSql += ' AND d.id_centro_costo IN (SELECT id_centro_costo FROM centros_costo WHERE id_finca = ?) ';
      params.push(id_finca);
    }
    if (id_centro_costo) {
      filterSql += ' AND d.id_centro_costo = ? ';
      params.push(id_centro_costo);
    }

    const [rows] = await getDb(req).query(`
      SELECT 
        pc.mes,
        COALESCE(SUM(d.debito), 0) as total_debito,
        COALESCE(SUM(d.credito), 0) as total_credito
      FROM periodos_contables pc
      LEFT JOIN contab_comprobantes c ON pc.id_periodo = c.id_periodo AND c.id_tenant = ?
      LEFT JOIN contab_documentos doc ON c.id_comprobante = doc.id_comprobante
      LEFT JOIN contab_detalles d ON doc.id_documento = d.id_documento ${filterSql}
      WHERE pc.ano = ? AND pc.id_tenant = 1
      GROUP BY pc.mes
      ORDER BY pc.mes
    `, [tenantId || 1, ...params.slice(2), targetAnio]);

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

  // ====== REPORTES FINANCIEROS ======

  router.get('/reportes/balance-comprobacion', async (req, res) => {
    try {
      const { tenantId, id_periodo_inicio, id_periodo_fin, fecha_inicio, fecha_fin, id_finca } = req.query;
      
      let realFechaInicio = fecha_inicio || '2000-01-01';
      let realFechaFin = fecha_fin || '2099-12-31';

      if (id_periodo_inicio && id_periodo_fin) {
        const [pRows] = await getDb(req).query('SELECT fecha_inicio, fecha_fin FROM periodos_contables WHERE id_periodo IN (?, ?) ORDER BY fecha_inicio ASC', [id_periodo_inicio, id_periodo_fin]);
        if (pRows.length > 0) {
          realFechaInicio = pRows[0].fecha_inicio;
          realFechaFin = pRows[pRows.length - 1].fecha_fin; // En caso de que sean distintos
        }
      }

      let fincaFilter = '';
      const params = [realFechaInicio, realFechaInicio, realFechaFin, realFechaInicio, realFechaFin, tenantId || 1];
      
      if (id_finca) {
        fincaFilter = ' AND d.id_centro_costo IN (SELECT id_centro_costo FROM centros_costo WHERE id_finca = ?) ';
        params.push(id_finca);
      }

        const [rows] = await getDb(req).query(`
          SELECT 
            p.id_cuenta, p.codigo, p.nombre, p.nivel, p.naturaleza,
            t.id_tercero, t.documento as numero_identificacion, t.nombre_completo as razon_social,
            SUM(CASE WHEN doc.fecha < ? THEN d.debito - d.credito ELSE 0 END) as saldo_anterior_bruto,
            SUM(CASE WHEN doc.fecha >= ? AND doc.fecha <= ? THEN d.debito ELSE 0 END) as debitos_periodo,
            SUM(CASE WHEN doc.fecha >= ? AND doc.fecha <= ? THEN d.credito ELSE 0 END) as creditos_periodo
          FROM contab_detalles d
          JOIN contab_documentos doc ON d.id_documento = doc.id_documento
          JOIN contab_comprobantes c ON doc.id_comprobante = c.id_comprobante
          JOIN plan_contable p ON d.id_cuenta = p.id_cuenta
          LEFT JOIN terceros t ON d.id_tercero = t.id_tercero
          WHERE c.id_tenant = ? 
          ${fincaFilter}
          GROUP BY p.id_cuenta, p.codigo, p.nombre, p.nivel, p.naturaleza, t.id_tercero, t.documento, t.nombre_completo
          ORDER BY p.codigo, t.nombre_completo
        `, params);

      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/reportes/estado-resultados', async (req, res) => {
    try {
      const { tenantId } = req.query;
      const { filterSql, params } = buildDateOrPeriodFilter(req.query);

      const [rows] = await getDb(req).query(`
        SELECT 
          SUBSTRING(p.codigo, 1, 1) as clase,
          SUBSTRING(p.codigo, 1, 2) as grupo,
          p.codigo as cuenta_codigo,
          p.nombre as cuenta_nombre,
          SUM(d.debito) as total_debito,
          SUM(d.credito) as total_credito
        FROM contab_detalles d
        JOIN contab_documentos doc ON d.id_documento = doc.id_documento
        JOIN contab_comprobantes c ON doc.id_comprobante = c.id_comprobante
        JOIN plan_contable p ON d.id_cuenta = p.id_cuenta
        WHERE c.id_tenant = ? 
        AND (p.codigo LIKE '4%' OR p.codigo LIKE '5%' OR p.codigo LIKE '6%' OR p.codigo LIKE '7%')
        ${filterSql}
        GROUP BY p.codigo, p.nombre
        ORDER BY p.codigo
      `, [tenantId || 1, ...params]);

      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/reportes/balance-general', async (req, res) => {
    try {
      const { tenantId } = req.query;
      const { filterSql, params } = buildDateOrPeriodFilter(req.query);

      const [rows] = await getDb(req).query(`
        SELECT 
          SUBSTRING(p.codigo, 1, 1) as clase,
          SUBSTRING(p.codigo, 1, 2) as grupo,
          p.codigo as cuenta_codigo,
          p.nombre as cuenta_nombre,
          SUM(d.debito) as total_debito,
          SUM(d.credito) as total_credito
        FROM contab_detalles d
        JOIN contab_documentos doc ON d.id_documento = doc.id_documento
        JOIN contab_comprobantes c ON doc.id_comprobante = c.id_comprobante
        JOIN plan_contable p ON d.id_cuenta = p.id_cuenta
        WHERE c.id_tenant = ? 
        AND (p.codigo LIKE '1%' OR p.codigo LIKE '2%' OR p.codigo LIKE '3%')
        ${filterSql}
        GROUP BY p.codigo, p.nombre
        ORDER BY p.codigo
      `, [tenantId || 1, ...params]);

      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/reportes/balance-acumulado-lapsos', async (req, res) => {
    try {
      const { tenantId, id_periodo_inicio, id_periodo_fin, id_finca, id_centro_costo } = req.query;
      
      let realFechaInicio = '2000-01-01';
      let realFechaFin = '2099-12-31';

      if (id_periodo_inicio && id_periodo_fin) {
        const [pRows] = await getDb(req).query('SELECT fecha_inicio, fecha_fin FROM periodos_contables WHERE id_periodo IN (?, ?) ORDER BY fecha_inicio ASC', [id_periodo_inicio, id_periodo_fin]);
        if (pRows.length > 0) {
          realFechaInicio = pRows[0].fecha_inicio;
          realFechaFin = pRows[pRows.length - 1].fecha_fin;
        }
      }

      let filterSql = '';
      const params = [realFechaInicio, realFechaInicio, realFechaFin, tenantId || 1];
      
      if (id_finca) {
        filterSql += ' AND d.id_centro_costo IN (SELECT id_centro_costo FROM centros_costo WHERE id_finca = ?) ';
        params.push(id_finca);
      }

      if (id_centro_costo) {
        filterSql += ' AND d.id_centro_costo = ? ';
        params.push(id_centro_costo);
      }
      
      let accountFilterSql = '';
      if (req.query.tipo === 'estado_resultados') {
        accountFilterSql = " AND (p.codigo LIKE '4%' OR p.codigo LIKE '5%' OR p.codigo LIKE '6%' OR p.codigo LIKE '7%') ";
      }

      const [rows] = await getDb(req).query(`
        SELECT 
          p.codigo, p.nombre, p.nivel, p.naturaleza,
          SUM(CASE WHEN doc.fecha < ? THEN d.debito - d.credito ELSE 0 END) as saldo_anterior_bruto,
          DATE_FORMAT(doc.fecha, '%Y-%m') as mes_lapso,
          SUM(CASE WHEN doc.fecha >= ? AND doc.fecha <= ? THEN d.debito - d.credito ELSE 0 END) as movimiento_neto
        FROM contab_detalles d
        JOIN contab_documentos doc ON d.id_documento = doc.id_documento
        JOIN contab_comprobantes c ON doc.id_comprobante = c.id_comprobante
        JOIN plan_contable p ON d.id_cuenta = p.id_cuenta
        WHERE c.id_tenant = ? 
        ${filterSql}
        ${accountFilterSql}
        GROUP BY p.codigo, p.nombre, p.nivel, p.naturaleza, DATE_FORMAT(doc.fecha, '%Y-%m')
        ORDER BY p.codigo, mes_lapso
      `, params);

      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/reportes/libro-auxiliar', async (req, res) => {
    try {
      const { tenantId, fecha_inicio, fecha_fin, id_finca, cuenta_inicio, cuenta_fin, id_tercero, id_centro_costo } = req.query;
      const fInicio = fecha_inicio || '2000-01-01';
      const fFin = fecha_fin || '2099-12-31';

      let filterSql = '';
      const paramsAnt = [tenantId || 1, fInicio];
      const paramsMov = [tenantId || 1, fInicio, fFin];

      if (id_finca) {
        filterSql += ' AND d.id_centro_costo IN (SELECT id_centro_costo FROM centros_costo WHERE id_finca = ?) ';
        paramsAnt.push(id_finca);
        paramsMov.push(id_finca);
      }
      if (id_centro_costo) {
        filterSql += ' AND d.id_centro_costo = ? ';
        paramsAnt.push(id_centro_costo);
        paramsMov.push(id_centro_costo);
      }
      if (id_tercero) {
        filterSql += ' AND d.id_tercero = ? ';
        paramsAnt.push(id_tercero);
        paramsMov.push(id_tercero);
      }
      if (cuenta_inicio && cuenta_fin) {
        filterSql += ' AND p.codigo BETWEEN ? AND ? ';
        paramsAnt.push(cuenta_inicio, cuenta_fin);
        paramsMov.push(cuenta_inicio, cuenta_fin);
      }

      const [saldosAnteriores] = await getDb(req).query(`
        SELECT p.codigo, SUM(d.debito - d.credito) as saldo_anterior
        FROM contab_detalles d
        JOIN contab_documentos doc ON d.id_documento = doc.id_documento
        JOIN contab_comprobantes comp ON doc.id_comprobante = comp.id_comprobante
        JOIN plan_contable p ON d.id_cuenta = p.id_cuenta
        WHERE comp.id_tenant = ? AND doc.fecha < ? ${filterSql}
        GROUP BY p.codigo
      `, paramsAnt);

      const [movimientos] = await getDb(req).query(`
        SELECT 
          p.codigo, p.nombre as cuenta_nombre, p.naturaleza,
          doc.fecha, td.codigo as tipo_doc_codigo, doc.numero_doc,
          comp.numero as comprobante_numero,
          doc.concepto as documento_concepto, d.descripcion as detalle_descripcion,
          t.documento as tercero_nit, t.nombre_completo as tercero_nombre,
          cc.codigo as centro_costo_codigo, cc.nombre as centro_costo_nombre,
          d.debito, d.credito
        FROM contab_detalles d
        JOIN contab_documentos doc ON d.id_documento = doc.id_documento
        JOIN tipos_documentos td ON doc.id_tipo_doc = td.id_tipo_doc
        JOIN contab_comprobantes comp ON doc.id_comprobante = comp.id_comprobante
        JOIN plan_contable p ON d.id_cuenta = p.id_cuenta
        LEFT JOIN terceros t ON d.id_tercero = t.id_tercero
        LEFT JOIN centros_costo cc ON d.id_centro_costo = cc.id_centro_costo
        WHERE comp.id_tenant = ? AND doc.fecha BETWEEN ? AND ? ${filterSql}
        ORDER BY p.codigo ASC, doc.fecha ASC, doc.id_documento ASC
      `, paramsMov);

      res.json({ saldosAnteriores, movimientos });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/reportes/libro-diario', async (req, res) => {
    try {
      const { tenantId, fecha_inicio, fecha_fin, id_finca } = req.query;
      const fInicio = fecha_inicio || '2000-01-01';
      const fFin = fecha_fin || '2099-12-31';

      let filterSql = '';
      const params = [tenantId || 1, fInicio, fFin];

      if (id_finca) {
        filterSql += ' AND d.id_centro_costo IN (SELECT id_centro_costo FROM centros_costo WHERE id_finca = ?) ';
        params.push(id_finca);
      }

      const [movimientos] = await getDb(req).query(`
        SELECT 
          doc.fecha, comp.numero as comprobante_numero, tc.nombre as comprobante_tipo,
          p.codigo, p.nombre as cuenta_nombre,
          SUM(d.debito) as total_debito, SUM(d.credito) as total_credito
        FROM contab_detalles d
        JOIN contab_documentos doc ON d.id_documento = doc.id_documento
        JOIN contab_comprobantes comp ON doc.id_comprobante = comp.id_comprobante
        JOIN tipos_comprobantes tc ON comp.id_tipo_comp = tc.id_tipo_comp
        JOIN plan_contable p ON d.id_cuenta = p.id_cuenta
        WHERE comp.id_tenant = ? AND doc.fecha BETWEEN ? AND ? ${filterSql}
        GROUP BY doc.fecha, comp.numero, tc.nombre, p.codigo, p.nombre
        ORDER BY doc.fecha ASC, comp.numero ASC, p.codigo ASC
      `, params);

      res.json(movimientos);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/reportes/libro-mayor', async (req, res) => {
    try {
      const { tenantId, fecha_inicio, fecha_fin, id_finca } = req.query;
      const fInicio = fecha_inicio || '2000-01-01';
      const fFin = fecha_fin || '2099-12-31';

      let filterSql = '';
      const params = [fInicio, fInicio, fFin, fInicio, fFin, tenantId || 1];

      if (id_finca) {
        filterSql += ' AND d.id_centro_costo IN (SELECT id_centro_costo FROM centros_costo WHERE id_finca = ?) ';
        params.push(id_finca);
      }

      const [rows] = await getDb(req).query(`
        SELECT 
          p.codigo, p.nombre, p.nivel, p.naturaleza,
          SUM(CASE WHEN doc.fecha < ? THEN d.debito - d.credito ELSE 0 END) as saldo_anterior_bruto,
          SUM(CASE WHEN doc.fecha >= ? AND doc.fecha <= ? THEN d.debito ELSE 0 END) as total_debito,
          SUM(CASE WHEN doc.fecha >= ? AND doc.fecha <= ? THEN d.credito ELSE 0 END) as total_credito
        FROM contab_detalles d
        JOIN contab_documentos doc ON d.id_documento = doc.id_documento
        JOIN contab_comprobantes c ON doc.id_comprobante = c.id_comprobante
        JOIN plan_contable p ON d.id_cuenta = p.id_cuenta
        WHERE c.id_tenant = ? ${filterSql}
        GROUP BY p.codigo, p.nombre, p.nivel, p.naturaleza
        ORDER BY p.codigo
      `, params);

      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/reportes/libro-inventarios', async (req, res) => {
    try {
      const { tenantId, fecha_corte, id_finca } = req.query;
      const fCorte = fecha_corte || '2099-12-31';

      let filterSql = '';
      const params = [tenantId || 1, fCorte];

      if (id_finca) {
        filterSql += ' AND d.id_centro_costo IN (SELECT id_centro_costo FROM centros_costo WHERE id_finca = ?) ';
        params.push(id_finca);
      }

      const [rows] = await getDb(req).query(`
        SELECT 
          p.codigo, p.nombre, p.nivel, p.naturaleza,
          SUM(d.debito) as acumulado_debito,
          SUM(d.credito) as acumulado_credito,
          SUM(d.debito - d.credito) as saldo_final
        FROM contab_detalles d
        JOIN contab_documentos doc ON d.id_documento = doc.id_documento
        JOIN contab_comprobantes c ON doc.id_comprobante = c.id_comprobante
        JOIN plan_contable p ON d.id_cuenta = p.id_cuenta
        WHERE c.id_tenant = ? AND doc.fecha <= ?
          AND (p.codigo LIKE '1%' OR p.codigo LIKE '2%' OR p.codigo LIKE '3%') ${filterSql}
        GROUP BY p.codigo, p.nombre, p.nivel, p.naturaleza
        ORDER BY p.codigo
      `, params);

      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

export default router;
