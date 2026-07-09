import { Router } from 'express';

const router = Router();

router.get('/kpis', async (req, res) => {
  try {
    const db = req.tenantPool;
    const [[{ totalHectareas, totalLotes, totalSiembras }]] = await db.query(`
      SELECT 
        SUM(l.hectareas) as totalHectareas,
        COUNT(DISTINCT l.id_lote) as totalLotes,
        COUNT(DISTINCT s.id_siembra) as totalSiembras
      FROM lotes l
      LEFT JOIN siembras s ON l.id_lote = s.id_lote AND s.estado = 'Activo'
      WHERE l.activo = 1
    `);

    res.json({
      totalHectareas: Number(totalHectareas) || 0,
      totalLotes: Number(totalLotes) || 0,
      totalSiembras: Number(totalSiembras) || 0,
    });
  } catch (err) {
    console.error('Error in KPIs:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/distribucion', async (req, res) => {
  try {
    const db = req.tenantPool;
    const [rows] = await db.query(`
      SELECT 
        c.nombre as cultivo, 
        SUM(s.hectareas_sembradas) as hectareas
      FROM siembras s
      JOIN cultivos c ON s.id_cultivo = c.id_cultivo
      WHERE s.estado = 'Activo'
      GROUP BY c.nombre
      ORDER BY hectareas DESC
    `);
    
    res.json(rows.map(r => ({ cultivo: r.cultivo, hectareas: Number(r.hectareas) })));
  } catch (err) {
    console.error('Error in distribucion:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/produccion', async (req, res) => {
  try {
    const db = req.tenantPool;
    // Producción por mes en los ultimos 12 meses, agrupada por cultivo
    const [rows] = await db.query(`
      SELECT 
        DATE_FORMAT(c.fecha_cosecha, '%Y-%m') as mes,
        cu.nombre as cultivo,
        SUM(c.produccion_total_kg) as total_kg
      FROM cosechas c
      JOIN siembras s ON c.id_siembra = s.id_siembra
      JOIN cultivos cu ON s.id_cultivo = cu.id_cultivo
      WHERE c.fecha_cosecha >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY mes, cultivo
      ORDER BY mes ASC
    `);

    // Transform into a format good for Recharts
    const dataByMonth = {};
    const cultivosSet = new Set();

    rows.forEach(r => {
      if (!dataByMonth[r.mes]) dataByMonth[r.mes] = { mes: r.mes };
      dataByMonth[r.mes][r.cultivo] = (Number(r.total_kg) / 1000); // Toneladas
      cultivosSet.add(r.cultivo);
    });

    res.json({
      tendencia: Object.values(dataByMonth),
      cultivos: Array.from(cultivosSet)
    });
  } catch (err) {
    console.error('Error in produccion:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/avanzado', async (req, res) => {
  try {
    const db = req.tenantPool;
    
    // 1. Fenología (Radar Chart)
    const [fenologiaRows] = await db.query(`
      SELECT 
        e.nombre as etapa,
        AVG(fc.kc_coeficiente) as kc_promedio,
        AVG(fc.duracion_promedio_dias) as dias_promedio
      FROM fenologia_cultivo fc
      JOIN fenologia_etapas e ON fc.id_etapa = e.id_etapa
      GROUP BY e.nombre
    `);

    // 2. Proyección vs Real (Composed Chart)
    // We will just group by crop and return some dummy "estimado" to compare against real "produccion"
    const [produccionRows] = await db.query(`
      SELECT 
        cu.nombre as cultivo,
        SUM(c.produccion_total_kg) as real_kg,
        SUM(s.hectareas_sembradas) * 15000 as estimado_kg 
      FROM cosechas c
      JOIN siembras s ON c.id_siembra = s.id_siembra
      JOIN cultivos cu ON s.id_cultivo = cu.id_cultivo
      WHERE c.fecha_cosecha >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY cu.nombre
    `);

    // 3. Distribución por Zona Agroecológica
    const [zonasRows] = await db.query(`
      SELECT 
        ca.zona_agroecologica as zona,
        COUNT(ca.id_cultivo) as cantidad_cultivos
      FROM calendario_agricola ca
      GROUP BY ca.zona_agroecologica
    `);

    res.json({
      fenologia: fenologiaRows.map(r => ({
        etapa: r.etapa,
        Kc: Number(r.kc_promedio || 0),
        Dias: Number(r.dias_promedio || 0)
      })),
      proyeccion: produccionRows.map(r => ({
        cultivo: r.cultivo,
        Real: Number(r.real_kg) / 1000,
        Estimado: Number(r.estimado_kg) / 1000
      })),
      zonas: zonasRows.map(r => ({
        zona: r.zona || 'Sin Zona',
        cantidad: Number(r.cantidad_cultivos)
      }))
    });
  } catch (err) {
    console.error('Error in avanzado:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
