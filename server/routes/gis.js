import express from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';

const router = express.Router();

/**
 * Endpoint para validar si una coordenada GPS se encuentra dentro
 * del polígono de un lote específico utilizando ST_Contains.
 */
router.post('/validate-position', async (req, res) => {
  try {
    const { id_lote, latitud, longitud, id_empleado, id_tenant } = req.body;

    if (!id_lote || !latitud || !longitud || !id_tenant) {
      return res.status(400).json({ success: false, error: 'Faltan parámetros requeridos (id_lote, latitud, longitud, id_tenant)' });
    }

    // Usar ST_Contains para verificar si el punto está dentro del polígono del lote
    // ST_GeomFromText('POINT(lon lat)', 4326)
    const query = `
      SELECT id_lote, nombre,
             ST_Contains(geometria, ST_GeomFromText(?, 4326)) as is_inside
      FROM lotes
      WHERE id_lote = ? AND id_tenant = ?
    `;
    
    // MariaDB/MySQL format for Point is POINT(lon lat)
    const pointWKT = `POINT(${longitud} ${latitud})`;
    
    const [rows] = await pool.query(query, [pointWKT, id_lote, id_tenant]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Lote no encontrado o no pertenece al tenant' });
    }

    const isInside = !!rows[0].is_inside;

    // Registrar la posición en gps_empleados
    if (id_empleado) {
      const insertQuery = `
        INSERT INTO gps_empleados (id_tenant, id_empleado, latitud, longitud)
        VALUES (?, ?, ?, ?)
      `;
      await pool.query(insertQuery, [id_tenant, id_empleado, latitud, longitud]);
    }

    res.json({
      success: true,
      data: {
        id_lote: rows[0].id_lote,
        nombre: rows[0].nombre,
        is_inside: isInside
      }
    });

  } catch (error) {
    console.error('Error validating GIS position:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/metrics', (req, res) => {
  try {
    const { loteIds = [] } = req.body || {};
    // Retornar métricas simuladas (NDVI y NDMI) para que el frontend pueda pintar los lotes en el mapa
    const metrics = loteIds.map(id => ({
      lote_id: id,
      ndvi: (0.3 + Math.random() * 0.6).toFixed(2),
      ndmi: (0.2 + Math.random() * 0.5).toFixed(2)
    }));
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/alerts', (req, res) => {
  res.json([]);
});

router.post('/despachar', (req, res) => {
  res.json({ success: true, message: 'Orden generada' });
});

router.get('/economia/:id_finca', (req, res) => {
  res.json({
    roi: 15.4,
    ingresos_estimados: 12000000,
    costos_ejecutados: 8500000
  });
});

router.get('/test_fincas', async (req, res) => {
  try {
    const [rows] = await getDb(req).query('SELECT ST_AsGeoJSON(poligono_gps) as geojson FROM fincas WHERE id_tenant=1 AND poligono_gps IS NOT NULL LIMIT 1');
    res.json({ type: typeof rows[0].geojson, raw: rows[0].geojson });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/fincas', async (req, res) => {
  try {
    const tenantId = req.headers['tenant-id'] || 1;
    const query = `
      SELECT id_finca, nombre, hectareas_totales, ST_AsGeoJSON(poligono_gps) as geojson
      FROM fincas
      WHERE id_tenant = ? AND poligono_gps IS NOT NULL
    `;
    const [rows] = await getDb(req).query(query, [tenantId]);
    console.log("Fincas from DB:", rows.length);
    
    const features = rows.map(row => {
      let geometry = null;
      try { if (row.geojson) geometry = typeof row.geojson === 'string' ? JSON.parse(row.geojson) : row.geojson; } catch (e) { console.error('Error parsing geometry:', e); }
      
      return {
        type: 'Feature',
        properties: {
          id: row.id_finca,
          nombre: row.nombre,
          hectareas: row.hectareas_totales
        },
        geometry
      };
    }).filter(f => f.geometry);
    
    console.log("Mapped features count:", features.length);
    if (features.length > 0) console.log("First feature:", JSON.stringify(features[0]));
    
    res.json({ type: 'FeatureCollection', features });
  } catch (error) {
    console.error('Error fetching fincas:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/lotes/:id_finca', async (req, res) => {
  try {
    const { id_finca } = req.params;
    
    // FeatureCollection de GeoJSON
    const query = `
      SELECT 
        l.id_lote, 
        l.codigo, 
        l.nombre, 
        l.hectareas,
        c.nombre as cultivo_nombre,
        ST_AsGeoJSON(l.poligono_gps) as geojson
      FROM lotes l
      JOIN nucleos n ON l.id_nucleo = n.id_nucleo
      LEFT JOIN siembras s ON s.id_lote = l.id_lote AND s.estado = 'Activo'
      LEFT JOIN cultivos c ON s.id_cultivo = c.id_cultivo
      WHERE n.id_finca = ? AND l.poligono_gps IS NOT NULL
    `;
    
    const [rows] = await getDb(req).query(query, [id_finca]);
    console.log(`Lotes for Finca ${id_finca}: ${rows.length} rows found`);
    
    const features = rows.map(row => {
      let geometry = null;
      try {
        if (row.geojson) geometry = typeof row.geojson === 'string' ? JSON.parse(row.geojson) : row.geojson;
      } catch (e) { console.error('Error parsing geometry:', e); }
      
      return {
        type: 'Feature',
        properties: {
          id: row.id_lote,
          codigo: row.codigo,
          nombre: row.nombre,
          hectareas: row.hectareas,
          cultivo: row.cultivo_nombre || 'Sin Cultivo',
          tiene_poligono: geometry !== null
        },
        geometry
      };
    }).filter(f => f.geometry);
    
    res.json({
      type: 'FeatureCollection',
      features
    });
    
  } catch (error) {
    console.error('Error fetching lotes poligonos:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
