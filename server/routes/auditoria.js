import express from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';

const router = express.Router();

// --- 1. CONTROL DE CONSECUTIVOS ---
router.get('/control-consecutivos', async (req, res) => {
  try {
    const { tenantId, fecha_inicio, fecha_fin, id_tipo_doc } = req.query;
    
    let filterSql = 'WHERE doc.id_tenant = ?';
    const params = [tenantId || 1];

    if (fecha_inicio) {
      filterSql += ' AND doc.fecha >= ?';
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      filterSql += ' AND doc.fecha <= ?';
      params.push(fecha_fin);
    }
    if (id_tipo_doc) {
      filterSql += ' AND doc.id_tipo_doc = ?';
      params.push(id_tipo_doc);
    }

    const [documentos] = await getDb(req).query(`
      SELECT doc.numero_doc, td.nombre as tipo_doc_nombre, doc.fecha, doc.estado
      FROM contab_documentos doc
      JOIN tipos_documentos td ON doc.id_tipo_doc = td.id_tipo_doc
      ${filterSql}
      ORDER BY td.nombre ASC, doc.numero_doc ASC
    `, params);

    // Analyze gaps per document type
    const grouped = {};
    documentos.forEach(d => {
      if (!grouped[d.tipo_doc_nombre]) grouped[d.tipo_doc_nombre] = [];
      grouped[d.tipo_doc_nombre].push(d);
    });

    const results = [];

    for (const [tipo, docs] of Object.entries(grouped)) {
      const parsed = docs.map(d => {
        const match = d.numero_doc.match(/^(.*?)(\d+)$/);
        if (match) {
          return { 
            prefix: match[1], 
            num: parseInt(match[2], 10), 
            original: d.numero_doc,
            fecha: d.fecha,
            estado: d.estado
          };
        }
        return null;
      }).filter(x => x !== null);

      const byPrefix = {};
      parsed.forEach(p => {
        if (!byPrefix[p.prefix]) byPrefix[p.prefix] = [];
        byPrefix[p.prefix].push(p);
      });

      const gaps = [];
      for (const prefix in byPrefix) {
        const items = byPrefix[prefix].sort((a,b) => a.num - b.num);
        for (let i = 0; i < items.length - 1; i++) {
          let current = items[i].num;
          let next = items[i+1].num;
          if (next > current + 1) {
            for (let j = current + 1; j < next; j++) {
              gaps.push({
                missing_number: `${prefix}${j.toString().padStart(items[i].original.replace(prefix, '').length, '0')}`,
                between: `${items[i].original} y ${items[i+1].original}`
              });
            }
          }
        }
      }

      results.push({
        tipo_documento: tipo,
        total_evaluados: docs.length,
        huecos_encontrados: gaps.length,
        detalle_huecos: gaps
      });
    }

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- 2. RASTRO DE AUDITORÍA (LOGS) ---
router.get('/rastro-auditoria', async (req, res) => {
  try {
    const { tenantId, fecha_inicio, fecha_fin, modulo } = req.query;
    
    let filterSql = 'WHERE id_tenant = ?';
    const params = [tenantId || 1];

    if (fecha_inicio) {
      filterSql += ' AND DATE(fecha) >= ?';
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      filterSql += ' AND DATE(fecha) <= ?';
      params.push(fecha_fin);
    }
    if (modulo) {
      filterSql += ' AND modulo = ?';
      params.push(modulo);
    }

    const [logs] = await getDb(req).query(`
      SELECT * FROM sys_audit_logs
      ${filterSql}
      ORDER BY fecha DESC
    `, params);

    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- 3. CONCILIACIÓN BANCARIA ---
router.get('/conciliacion/extracto', async (req, res) => {
  try {
    const { tenantId, id_cuenta_bancaria, mes } = req.query; // mes formato 'YYYY-MM'
    
    let sql = 'SELECT * FROM fin_extractos_bancarios WHERE id_tenant = ?';
    const params = [tenantId || 1];

    if (id_cuenta_bancaria) {
      sql += ' AND id_cuenta_bancaria = ?';
      params.push(id_cuenta_bancaria);
    }
    if (mes) {
      sql += " AND DATE_FORMAT(fecha, '%Y-%m') = ?";
      params.push(mes);
    }

    sql += ' ORDER BY fecha ASC';

    const [rows] = await getDb(req).query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/conciliacion/libros', async (req, res) => {
  try {
    const { tenantId, mes } = req.query;
    
    // Asume cuentas de bancos inician con 1110 o 1120
    let sql = `
      SELECT 
        cd.id_detalle,
        cd.id_cuenta,
        pc.codigo as cuenta_codigo,
        pc.nombre as cuenta_nombre,
        cd.debito,
        cd.credito,
        doc.fecha,
        doc.numero_doc,
        doc.concepto
      FROM contab_detalles cd
      JOIN contab_documentos doc ON cd.id_documento = doc.id_documento
      JOIN plan_contable pc ON cd.id_cuenta = pc.id_cuenta
      WHERE doc.id_tenant = ? AND (pc.codigo LIKE '1110%' OR pc.codigo LIKE '1120%')
    `;
    const params = [tenantId || 1];

    if (mes) {
      sql += " AND DATE_FORMAT(doc.fecha, '%Y-%m') = ?";
      params.push(mes);
    }

    // Filter out already reconciled details
    sql += ` AND cd.id_detalle NOT IN (SELECT id_detalle_contable FROM fin_extractos_bancarios WHERE id_detalle_contable IS NOT NULL)`;

    sql += ' ORDER BY doc.fecha ASC';

    const [rows] = await getDb(req).query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/conciliacion/conciliar', async (req, res) => {
  try {
    const { pares } = req.body; // Array of { id_extracto, id_detalle_contable }
    if (!pares || !Array.isArray(pares)) return res.status(400).json({ error: "pares array required" });

    for (const par of pares) {
      await getDb(req).query(
        "UPDATE fin_extractos_bancarios SET id_detalle_contable = ?, estado_conciliacion = 'Conciliado' WHERE id_extracto = ?",
        [par.id_detalle_contable, par.id_extracto]
      );
      // Optional: Audit log
      await getDb(req).query(`
        INSERT INTO sys_audit_logs (id_tenant, modulo, accion, registro_id, usuario, detalle) 
        VALUES (1, 'Bancos', 'Conciliación', ?, 'Sistema', 'Extracto conciliado con libro')
      `, [`Extracto ${par.id_extracto}`]);
    }

    res.json({ success: true, message: `${pares.length} movimientos conciliados correctamente.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
