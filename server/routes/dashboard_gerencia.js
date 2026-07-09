import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// Helper para fecha en formato YYYY-MM
const getLastMonths = (count) => {
  const months = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
};

// 1. Cultivos Timeline (Fecha Inicio / Fecha Cosecha)
router.get('/cultivos-timeline', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const [timelineData] = await getDb(req).query(`
      SELECT c.nombre AS cultivo,
             DATE_FORMAT(s.fecha_siembra, '%Y-%m-%d') AS fecha_inicio,
             DATE_FORMAT(DATE_ADD(s.fecha_siembra, INTERVAL COALESCE(c.ciclo_dias, 365) DAY), '%Y-%m-%d') AS fecha_cosecha,
             LEAST(100, GREATEST(0, ROUND(
               TIMESTAMPDIFF(DAY, s.fecha_siembra, CURDATE()) / NULLIF(COALESCE(c.ciclo_dias, 365), 0) * 100
             ))) AS progreso
      FROM siembras s
      JOIN cultivos c ON s.id_cultivo = c.id_cultivo
      WHERE s.estado = 'Activo' AND (? IS NULL OR s.id_tenant = ?)
      ORDER BY s.fecha_siembra DESC
      LIMIT 5
    `, [tenantId || null, tenantId || null]);

    res.json(timelineData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Estado Fitosanitario (Salud)
router.get('/lotes-salud', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const [rows] = await getDb(req).query(`
      SELECT estado_salud, COUNT(*) as cantidad 
      FROM siembra_arboles 
      ${tenantId ? 'WHERE id_tenant = ?' : ''}
      GROUP BY estado_salud
    `, tenantId ? [tenantId] : []);

    let sanos = 0, enfermos = 0, tratamiento = 0;
    rows.forEach(r => {
      if (r.estado_salud === 'Sano') sanos = r.cantidad;
      else if (r.estado_salud === 'Enfermo') enfermos = r.cantidad;
      else if (r.estado_salud === 'Tratamiento') tratamiento = r.cantidad;
    });

    res.json([
      { name: 'Sanos / Productivos', value: sanos, color: '#10b981' }, // Verde
      { name: 'En Tratamiento', value: tratamiento, color: '#f59e0b' }, // Naranja
      { name: 'Plagas / Enfermedades', value: enfermos, color: '#ef4444' } // Rojo
    ]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Comparativo de Cosechas por Ciclo
router.get('/cosechas-ciclo', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const [data] = await getDb(req).query(`
      SELECT DATE_FORMAT(c.fecha_cosecha, '%Y-%m') AS mes,
             ROUND(SUM(c.rendimiento_estimado_ha * c.hectareas_cosechadas), 0) AS proyectado_kg,
             ROUND(SUM(c.produccion_total_kg), 0) AS real_kg
      FROM cosechas c
      JOIN siembras s ON c.id_siembra = s.id_siembra
      WHERE (? IS NULL OR s.id_tenant = ?)
      GROUP BY DATE_FORMAT(c.fecha_cosecha, '%Y-%m')
      ORDER BY mes DESC
      LIMIT 6
    `, [tenantId || null, tenantId || null]);

    res.json(data.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Producción de Abonos Orgánicos
router.get('/abonos-produccion', async (req, res) => {
  try {
    const { tenantId } = req.query;
    const [data] = await getDb(req).query(`
      SELECT periodo AS mes, compost_ton, humus_ton, biol_lt
      FROM gerencia_abonos_produccion
      WHERE id_tenant = ?
      ORDER BY periodo DESC
      LIMIT 6
    `, [tenantId || 1]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Comparativo Siembras e Inventario de Semillas
router.get('/siembras-inventario', async (req, res) => {
  try {
    const { tenantId } = req.query;
    const [data] = await getDb(req).query(`
      SELECT categoria, valor
      FROM gerencia_semillas_inventario
      WHERE id_tenant = ?
      ORDER BY orden ASC
    `, [tenantId || 1]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Ganado - Censo Demográfico
router.get('/ganado-stats', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const [censo] = await getDb(req).query(`
      SELECT 
        SUM(CASE WHEN sexo = 'Macho' AND TIMESTAMPDIFF(MONTH, fecha_nacimiento, CURDATE()) >= 12 THEN 1 ELSE 0 END) as machos,
        SUM(CASE WHEN sexo = 'Hembra' AND TIMESTAMPDIFF(MONTH, fecha_nacimiento, CURDATE()) >= 12 THEN 1 ELSE 0 END) as hembras,
        SUM(CASE WHEN TIMESTAMPDIFF(MONTH, fecha_nacimiento, CURDATE()) < 12 THEN 1 ELSE 0 END) as terneros
      FROM ganado_animales
      WHERE estado = 'Activo'
    `);
    
    const data = censo[0] || { machos: 0, hembras: 0, terneros: 0 };
    res.json([
      { name: 'Machos (Ceba)', value: Number(data.machos) || 0, color: '#3b82f6' },
      { name: 'Hembras (Cría)', value: Number(data.hembras) || 0, color: '#ec4899' },
      { name: 'Terneros', value: Number(data.terneros) || 0, color: '#f59e0b' }
    ]);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Acuícola - Biomasa por Especie
router.get('/acuicola-stats', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const [lotes] = await getDb(req).query(`
      SELECT 
        est.codigo as lago, 
        SUM(s.cantidad_alevines - COALESCE((SELECT SUM(cantidad_muertes) FROM acuicola_novedades WHERE id_siembra_acui = s.id_siembra_acui), 0)) as peces_vivos,
        SUM((s.cantidad_alevines - COALESCE((SELECT SUM(cantidad_muertes) FROM acuicola_novedades WHERE id_siembra_acui = s.id_siembra_acui), 0)) * COALESCE((SELECT peso_promedio_g FROM acuicola_muestreos WHERE id_siembra_acui = s.id_siembra_acui ORDER BY fecha DESC LIMIT 1), s.peso_promedio_inicial_g, 10) / 1000) as biomasa_actual_kg
      FROM acuicola_siembras s
      JOIN acuicola_estanques est ON s.id_estanque = est.id_estanque
      WHERE s.estado = 'Activo'
      GROUP BY est.codigo
    `);
    
    res.json(lotes.map(l => ({
      lago: l.lago,
      peces_vivos: Number(l.peces_vivos) || 0,
      biomasa_actual_kg: Number(l.biomasa_actual_kg) || 0
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
