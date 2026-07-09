import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

router.get('/dashboard-stats', async (req, res) => {
  const { tenantId, estacionId } = req.query;
  const tid = tenantId || 1;
  const db = getDb(req);

  try {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    let estacionFilter = '';
    let queryParams = [];

    if (estacionId) {
      estacionFilter = ' AND c.id_estacion = ? ';
      queryParams.push(estacionId);
    } else {
      estacionFilter = ' AND e.id_tenant = ? ';
      queryParams.push(tid);
    }

    // 1. Monthly Trends for Mixed Chart (Current Year)
    const [monthlyTrends] = await db.query(`
      SELECT 
        MONTH(c.fecha) as mes,
        SUM(c.precipitacion_mm) as precipitacion,
        AVG(c.temperatura_max) as temp_max,
        AVG(c.temperatura_min) as temp_min,
        AVG(c.temperatura_promedio) as temp_avg,
        AVG(c.evaporacion_mm) as evaporacion
      FROM datos_climaticos_diarios c
      JOIN estaciones_meteorologicas e ON c.id_estacion = e.id_estacion
      WHERE YEAR(c.fecha) = ? ${estacionFilter}
      GROUP BY MONTH(c.fecha)
      ORDER BY mes ASC
    `, [currentYear, ...queryParams]);

    // 2. Monthly Trends (Last Year) for Comparison
    const [lastYearTrends] = await db.query(`
      SELECT 
        MONTH(c.fecha) as mes,
        SUM(c.precipitacion_mm) as precipitacion_anterior
      FROM datos_climaticos_diarios c
      JOIN estaciones_meteorologicas e ON c.id_estacion = e.id_estacion
      WHERE YEAR(c.fecha) = ? ${estacionFilter}
      GROUP BY MONTH(c.fecha)
      ORDER BY mes ASC
    `, [lastYear, ...queryParams]);

    // Merge year over year data
    const mergedTrends = [];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    for (let i = 1; i <= 12; i++) {
      const currentMonthData = monthlyTrends.find(m => m.mes === i) || { precipitacion: 0, temp_max: 0, temp_min: 0, temp_avg: 0, evaporacion: 0 };
      const lastMonthData = lastYearTrends.find(m => m.mes === i) || { precipitacion_anterior: 0 };
      
      mergedTrends.push({
        mes: monthNames[i - 1],
        precipitacion: parseFloat(currentMonthData.precipitacion) || 0,
        precipitacion_anterior: parseFloat(lastMonthData.precipitacion_anterior) || 0,
        temp_max: parseFloat(currentMonthData.temp_max) || 0,
        temp_min: parseFloat(currentMonthData.temp_min) || 0,
        temp_avg: parseFloat(currentMonthData.temp_avg) || 0,
        evaporacion: parseFloat(currentMonthData.evaporacion) || 0
      });
    }

    // 3. KPIs YTD
    const [kpis] = await db.query(`
      SELECT 
        SUM(c.precipitacion_mm) as total_lluvia_ytd,
        AVG(c.temperatura_promedio) as avg_temp_ytd,
        AVG(c.radiacion_solar) as avg_radiacion_ytd
      FROM datos_climaticos_diarios c
      JOIN estaciones_meteorologicas e ON c.id_estacion = e.id_estacion
      WHERE YEAR(c.fecha) = ? ${estacionFilter}
    `, [currentYear, ...queryParams]);

    const [kpisAnterior] = await db.query(`
      SELECT SUM(c.precipitacion_mm) as total_lluvia_ytd
      FROM datos_climaticos_diarios c
      JOIN estaciones_meteorologicas e ON c.id_estacion = e.id_estacion
      WHERE YEAR(c.fecha) = ? ${estacionFilter}
    `, [lastYear, ...queryParams]);

    // 4. Consecutive days without rain
    const [recentDays] = await db.query(`
      SELECT c.fecha, c.precipitacion_mm
      FROM datos_climaticos_diarios c
      JOIN estaciones_meteorologicas e ON c.id_estacion = e.id_estacion
      WHERE 1=1 ${estacionFilter}
      ORDER BY c.fecha DESC
      LIMIT 60
    `, queryParams);

    let diasSecos = 0;
    for (let day of recentDays) {
      if (day.precipitacion_mm <= 0) {
        diasSecos++;
      } else {
        break;
      }
    }

    // Get Stations List for dropdown
    const [estaciones] = await db.query(`SELECT id_estacion, nombre FROM estaciones_meteorologicas WHERE id_tenant = ?`, [tid]);

    res.json({
      success: true,
      stats: {
        mergedTrends,
        kpis: {
          totalLluviaYtd: kpis[0].total_lluvia_ytd || 0,
          totalLluviaAnterior: kpisAnterior[0].total_lluvia_ytd || 0,
          avgTempYtd: kpis[0].avg_temp_ytd || 0,
          avgRadiacionYtd: kpis[0].avg_radiacion_ytd || 0,
          diasSecos
        },
        estaciones
      }
    });

  } catch (error) {
    console.error('Error fetching Clima dashboard stats:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
