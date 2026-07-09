import express from 'express';
import pool from '../db.js';
import { runComplianceEngine } from '../cron/complianceEngine.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// Ejecutar el motor de compliance manualmente
router.post('/run-compliance', async (req, res) => {
  try {
    const tenantId = req.user ? req.user.tenantId : req.body.tenantId || 1; // Ajuste temporal si no hay user
    const result = await runComplianceEngine(tenantId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener datos para el Dashboard Gerencial
router.get('/dashboard', async (req, res) => {
  try {
    const tenantId = req.user ? req.user.tenantId : req.query.tenantId || 1;
    const fincaId = req.query.fincaId;

    let fincaCondition = '';
    let params = [tenantId];

    if (fincaId) {
      fincaCondition = ' AND id_finca = ? ';
      params.push(fincaId);
    }

    // 1. Estadísticas de Tareas (Completadas vs Pendientes)
    // Para simplificar, agrupamos por estado en gps_labores_asignaciones
    const [laboresStats] = await getDb(req).query(`
      SELECT estado, COUNT(*) as count 
      FROM gps_labores_asignaciones 
      WHERE id_tenant = ? 
      GROUP BY estado
    `, [tenantId]);

    // 2. Conteo de Empleados
    const [empleadosStats] = await getDb(req).query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'Activo' THEN 1 ELSE 0 END) as activos
      FROM empleados
      WHERE id_tenant = ? ${fincaCondition}
    `, params);

    // 3. Alertas Críticas Recientes
    const [alertasRecientes] = await getDb(req).query(`
      SELECT id_alerta, titulo, mensaje, prioridad, fecha_creacion
      FROM alertas
      WHERE id_tenant = ? AND leida = 0
      ORDER BY fecha_creacion DESC
      LIMIT 5
    `, [tenantId]);

    // Formatear stats
    const taskStats = laboresStats.map(r => ({ name: r.estado || 'Pendiente', value: r.count }));

    res.json({
      taskStats: taskStats.length > 0 ? taskStats : [{ name: 'Sin tareas', value: 1 }],
      employees: empleadosStats[0],
      alerts: alertasRecientes
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
