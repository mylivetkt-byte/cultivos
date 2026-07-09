import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}
/**
 * GET /api/aplicaciones/reportes?tenantId=1&fincaId=23
 * Reporte consolidado de costos por lote.
 */
router.get('/reportes', async (req, res) => {
  const tenantId = req.query.tenantId || 1;
  const fincaId = req.query.fincaId;
  try {
    // Costos de insumos (tabla costos_produccion)
    const [insumoRows] = await getDb(req).query(`
      SELECT id_lote,
             SUM(costo_insumos) AS total_insumos
      FROM costos_produccion
      WHERE id_tenant = ?
      ${fincaId ? 'AND id_finca = ?' : ''}
      GROUP BY id_lote
    `, fincaId ? [tenantId, fincaId] : [tenantId]);

    // Costos operacionales
    const [operRows] = await getDb(req).query(`
      SELECT id_lote,
             SUM(importe) AS total_oper
      FROM costos_operacion
      WHERE id_tenant = ?
      ${fincaId ? 'AND id_finca = ?' : ''}
      GROUP BY id_lote
    `, fincaId ? [tenantId, fincaId] : [tenantId]);

    // Costos de producción orgánica
    const [orgRows] = await getDb(req).query(`
      SELECT lote_id AS id_lote,
             SUM(costo_materiales + costo_jornales) AS total_org
      FROM app_produccion_organica
      WHERE id_tenant = ?
      ${fincaId ? 'AND lote_id IN (SELECT id_lote FROM lotes WHERE id_finca = ?)' : ''}
      GROUP BY lote_id
    `, fincaId ? [tenantId, fincaId] : [tenantId]);

    const report = {};
    insumoRows.forEach(r => {
      if (!report[r.id_lote]) report[r.id_lote] = { loteId: r.id_lote };
      report[r.id_lote].insumos = Number(r.total_insumos);
    });
    operRows.forEach(r => {
      if (!report[r.id_lote]) report[r.id_lote] = { loteId: r.id_lote };
      report[r.id_lote].operacion = Number(r.total_oper);
    });
    orgRows.forEach(r => {
      if (!report[r.id_lote]) report[r.id_lote] = { loteId: r.id_lote };
      report[r.id_lote].organico = Number(r.total_org);
    });

    const data = Object.values(report).map(r => ({
      loteId: r.loteId,
      insumos: r.insumos || 0,
      operacion: r.operacion || 0,
      organico: r.organico || 0,
      total: (r.insumos || 0) + (r.operacion || 0) + (r.organico || 0)
    }));

    res.json({ success: true, report: data });
  } catch (e) {
    console.error('Error en reporte avanzado', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
