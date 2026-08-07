import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// Get all fincas as GeoJSON FeatureCollection
router.get('/fincas', async (req, res) => {
  try {
    const [rows] = await getDb(req).query('SELECT id_finca AS id, nombre, ST_AsGeoJSON(poligono_gps) AS geo FROM fincas');
    const features = rows.map(r => {
      // mysql2 auto-parses ST_AsGeoJSON into a JS object; handle both string and object
      let geometry = null;
      if (r.geo) {
        geometry = typeof r.geo === 'string' ? JSON.parse(r.geo) : r.geo;
      }
      return {
        type: 'Feature',
        geometry,
        properties: { id: r.id, nombre: r.nombre }
      };
    });
    res.json({ type: 'FeatureCollection', features });
  } catch (e) {
    console.error('Error in /fincas:', e);
    res.status(500).json({ error: 'Database error', details: e.message });
  }
});

// Get lotes for a specific finca
router.get('/lotes/:fincaId', async (req, res) => {
  const { fincaId } = req.params;
  try {
    // Buscar lotes de la finca: tanto los que están enlazados por nucleo como los que tienen id_finca directo
    const [rows] = await getDb(req).query(`
      SELECT 
        l.id_lote AS id,
        l.nombre,
        l.codigo,
        l.hectareas,
        l.cultivo_actual,
        n.nombre AS nucleo_nombre,
        ST_AsGeoJSON(l.poligono_gps) AS geo,
        CASE WHEN l.poligono_gps IS NOT NULL THEN 1 ELSE 0 END AS tiene_poligono
      FROM lotes l
      LEFT JOIN nucleos n ON l.id_nucleo = n.id_nucleo
      WHERE n.id_finca = ? OR l.id_finca = ?
      ORDER BY l.nombre ASC
    `, [fincaId, fincaId]);
    
    const features = rows.map(r => {
      let geometry = null;
      if (r.geo) {
        try {
          geometry = typeof r.geo === 'string' ? JSON.parse(r.geo) : r.geo;
        } catch (e) {
          console.warn('Error parsing geo for lote', r.id, e.message);
        }
      }
      return {
        type: 'Feature',
        geometry,
        properties: { 
          id: r.id, 
          nombre: r.nombre, 
          codigo: r.codigo,
          hectareas: r.hectareas,
          cultivo_actual: r.cultivo_actual,
          nucleo_nombre: r.nucleo_nombre,
          tiene_poligono: r.tiene_poligono
        }
      };
    });
    console.log(`[GIS] Finca ${fincaId}: ${features.length} lotes encontrados (${features.filter(f => f.geometry).length} con polígono)`);
    res.json({ type: 'FeatureCollection', features });
  } catch (e) {
    console.error('Error in /lotes:', e);
    res.status(500).json({ error: 'Database error', details: e.message });
  }
});


// Get real metrics for a batch of lotes
router.post('/metrics', async (req, res) => {
  const { loteIds } = req.body;
  if (!loteIds || !Array.isArray(loteIds) || loteIds.length === 0) {
    return res.json([]);
  }
  
  try {
    // Get the latest metric for each lote
    const query = `
      SELECT m.lote_id, m.ndvi, m.ndmi, m.et0, m.temperatura 
      FROM sat_metrics m
      INNER JOIN (
          SELECT lote_id, MAX(fecha) as max_fecha
          FROM sat_metrics
          GROUP BY lote_id
      ) latest ON m.lote_id = latest.lote_id AND m.fecha = latest.max_fecha
      WHERE m.lote_id IN (?)
    `;
    const [rows] = await getDb(req).query(query, [loteIds]);
    res.json(rows);
  } catch (e) {
    console.error('Error in /metrics:', e);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get latest real metric for a single lote
router.get('/metrics/:loteId', async (req, res) => {
  const { loteId } = req.params;
  try {
    const [rows] = await getDb(req).query(`
      SELECT lote_id, fecha, ndvi, ndmi, et0, temperatura
      FROM sat_metrics
      WHERE lote_id = ?
      ORDER BY fecha DESC, id DESC
      LIMIT 1
    `, [loteId]);
    res.json(rows[0] || {});
  } catch (e) {
    console.error('Error in /metrics/:loteId:', e);
    res.status(500).json({ error: 'Database error', details: e.message });
  }
});

// Get real metric history for a single lote
router.get('/metrics/:loteId/history', async (req, res) => {
  const { loteId } = req.params;
  try {
    const [rows] = await getDb(req).query(`
      SELECT DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha, ndvi, ndmi, et0, temperatura
      FROM sat_metrics
      WHERE lote_id = ?
      ORDER BY fecha ASC, id ASC
      LIMIT 12
    `, [loteId]);
    res.json(rows);
  } catch (e) {
    console.error('Error in /metrics/:loteId/history:', e);
    res.status(500).json({ error: 'Database error', details: e.message });
  }
});

// Get real alerts
router.get('/alerts', async (req, res) => {
  try {
    const [rows] = await getDb(req).query(`
      SELECT a.id, a.lote_id, l.nombre as lote_nombre, a.tipo, a.severidad, a.mensaje, a.fecha 
      FROM agri_alerts a
      JOIN lotes l ON a.lote_id = l.id_lote
      WHERE a.estado = 'ACTIVA'
      ORDER BY 
        CASE severidad 
          WHEN 'CRITICA' THEN 1 
          WHEN 'ALTA' THEN 2 
          WHEN 'MEDIA' THEN 3 
          ELSE 4 
        END, a.fecha DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (e) {
    console.error('Error in /alerts:', e);
    res.status(500).json({ error: 'Database error' });
  }
});

// Debug endpoint to view raw fincas rows
router.get('/fincas_debug', async (req, res) => {
  try {
    const [rows] = await getDb(req).query('SELECT * FROM fincas');
    console.log('🔍 Debug fincas rows:', rows);
    res.json(rows);
  } catch (e) {
    console.error('Error in /fincas_debug:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/gis/despachar
router.post('/despachar', async (req, res) => {
  const { id_lote, descripcion_labor, vehiculo, categoria = 'Cultivos' } = req.body;
  if (!id_lote || !descripcion_labor) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  try {
    const query = `
      INSERT INTO labores_diarias (id_tenant, categoria, descripcion_labor, fecha_planificada, id_lote, estado)
      VALUES (?, ?, ?, CURDATE(), ?, 'Planificada')
    `;
    const [result] = await getDb(req).query(query, [1, categoria, descripcion_labor, id_lote]);
    res.json({ success: true, insertId: result.insertId });
  } catch (err) {
    console.error('Error insertando despacho:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gis/economia/:fincaId
router.get('/economia/:fincaId', async (req, res) => {
  const { fincaId } = req.params;
  try {
    const query = `
      SELECT id_lote, 
             SUM(costo_total) as costo_acumulado,
             SUM(costo_mano_obra) as costo_mano_obra,
             SUM(costo_insumos) as costo_insumos
      FROM costos_produccion
      WHERE id_finca = ?
      GROUP BY id_lote
    `;
    const [rows] = await getDb(req).query(query, [fincaId]);
    res.json(rows);
  } catch (err) {
    console.error('Error calculando economia:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gis/detect-lote
router.post('/detect-lote', async (req, res) => {
  const { lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: 'Lat and Lng are required' });
  try {
    const query = `
      SELECT id_lote, nombre, ST_Distance_Sphere(ST_GeomFromText(?), ST_Centroid(poligono_gps)) as dist
      FROM lotes
      WHERE activo = 1 AND poligono_gps IS NOT NULL
      ORDER BY dist ASC
      LIMIT 1
    `;
    const [rows] = await getDb(req).query(query, [`POINT(${lng} ${lat})`]);
    res.json(rows[0] || null);
  } catch (e) {
    console.error('Error detecting lote:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
