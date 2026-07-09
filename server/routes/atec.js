import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

router.get('/dashboard-stats', async (req, res) => {
  const { tenantId, fincaId } = req.query;
  const tid = tenantId || 1;
  const db = getDb(req);

  try {
    // 1. Total Capacitaciones
    const [capacitaciones] = await db.query(
      'SELECT COUNT(*) as count FROM atec_capacitaciones WHERE id_tenant = ?',
      [tid]
    );

    // 2. Total Visitas Técnicas (filtered by finca if provided)
    let visitasQuery = 'SELECT COUNT(*) as count FROM atec_visitas_tecnicas v';
    let visitasParams = [];
    if (fincaId) {
      visitasQuery += ' WHERE v.id_finca = ?';
      visitasParams.push(fincaId);
    } else {
      visitasQuery += ' JOIN fincas f ON v.id_finca = f.id_finca WHERE f.id_tenant = ?';
      visitasParams.push(tid);
    }
    const [visitas] = await db.query(visitasQuery, visitasParams);

    // 3. Recetario Stats (Aplicado vs Pendiente)
    const [recetasStats] = await db.query(`
      SELECT aplicado, COUNT(*) as count 
      FROM atec_recetario_enfermedades 
      WHERE id_tenant = ? 
      GROUP BY aplicado
    `, [tid]);

    const recetasAplicadas = recetasStats.find(r => r.aplicado === 1)?.count || 0;
    const recetasPendientes = recetasStats.find(r => r.aplicado === 0)?.count || 0;

    // 4. Top Enfermedades/Plagas
    const [topEnfermedades] = await db.query(`
      SELECT enfermedad_plaga_detectada as name, COUNT(*) as count 
      FROM atec_recetario_enfermedades 
      WHERE id_tenant = ?
      GROUP BY enfermedad_plaga_detectada 
      ORDER BY count DESC 
      LIMIT 5
    `, [tid]);

    // 5. Recomendaciones pendientes (Recent)
    const [recomendaciones] = await db.query(`
      SELECT r.id_recomendacion, r.descripcion_detallada, r.prioridad, r.estado_implementacion, v.fecha_visita, f.nombre as finca_nombre
      FROM atec_recomendaciones r
      JOIN atec_visitas_tecnicas v ON r.id_visita = v.id_visita
      JOIN fincas f ON v.id_finca = f.id_finca
      WHERE f.id_tenant = ? AND r.estado_implementacion != 'Implementada'
      ORDER BY v.fecha_visita DESC
      LIMIT 5
    `, [tid]);

    // 6. Evaluaciones de Capacitación Promedio
    const [promedioCap] = await db.query(`
      SELECT AVG(evaluacion_satisfaccion) as avg_rating 
      FROM atec_capacitaciones 
      WHERE id_tenant = ?
    `, [tid]);

    res.json({
      success: true,
      stats: {
        totalCapacitaciones: capacitaciones[0].count,
        totalVisitas: visitas[0].count,
        recetasAplicadas,
        recetasPendientes,
        avgCapacitacionRating: promedioCap[0].avg_rating || 0,
        topEnfermedades,
        recomendacionesPendientes: recomendaciones
      }
    });

  } catch (error) {
    console.error('Error fetching ATEC dashboard stats:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
