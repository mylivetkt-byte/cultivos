import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/dashboard', async (req, res) => {
  try {
    const tenantId = req.headers['tenant-id'] || 1;

    // 1. Distribución de Hectáreas por Cultivo
    const [hectareasPorCultivo] = await pool.query(`
      SELECT c.nombre, SUM(s.hectareas_sembradas) as total_ha, c.tipo
      FROM siembras s
      JOIN cultivos c ON s.id_cultivo = c.id_cultivo
      WHERE s.estado = 'Activo'
      GROUP BY c.nombre, c.tipo
      ORDER BY total_ha DESC
    `);

    // 2. Cultivos Asociados (Intercropping)
    const [asociaciones] = await pool.query(`
      SELECT cp.nombre as principal, cc.nombre as companero, a.beneficio_mutuo
      FROM asociacion_cultivos a
      JOIN cultivos cp ON a.id_cultivo_principal = cp.id_cultivo
      JOIN cultivos cc ON a.id_cultivo_companero = cc.id_cultivo
    `);

    // 3. Actividad Laboral (Últimos 30 días)
    const [actividadLaboral] = await pool.query(`
      SELECT ld.fecha_ejecucion as fecha, COUNT(*) as cantidad_labores
      FROM labores_diarias ld
      WHERE ld.fecha_ejecucion >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY ld.fecha_ejecucion
      ORDER BY ld.fecha_ejecucion
    `);

    // 4. Top Maquinaria Utilizada
    const [topMaquinaria] = await pool.query(`
      SELECT m.tipo, m.placa, COUNT(ld.id_labor_diaria) as usos
      FROM labores_diarias ld
      JOIN agroind_maquinaria_equipo m ON ld.id_maquinaria = m.id_maq_agro
      WHERE ld.id_maquinaria IS NOT NULL
      GROUP BY m.id_maq_agro
      ORDER BY usos DESC
      LIMIT 5
    `);

    // 5. Insumos Aplicados
    const [insumos] = await pool.query(`
      SELECT producto_comercial, SUM(dosis_ha) as dosis_total
      FROM registro_aplicaciones
      GROUP BY producto_comercial
      ORDER BY dosis_total DESC
      LIMIT 5
    `);

    // 6. Alertas Sanitarias (Enfermedades Recientes)
    const [alertasSanitarias] = await pool.query(`
      SELECT e.nombre_comun, e.gravedad, e.agente_causal
      FROM enfermedades e
      WHERE e.gravedad IN ('Alta', 'Critica')
      LIMIT 5
    `);

    res.json({
      hectareasPorCultivo,
      asociaciones,
      actividadLaboral,
      topMaquinaria,
      insumos,
      alertasSanitarias
    });

  } catch (error) {
    console.error('Error fetching cultivos dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error fetching cultivos dashboard' });
  }
});

export default router;
