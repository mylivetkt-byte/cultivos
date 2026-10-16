import express from 'express';
import wellknown from 'wellknown';
import pool from '../db.js';
import { getDb } from '../utils/db.js';

// Helper to convert WKT string to GeoJSON, returns null if conversion fails
function wktToGeoJSON(wkt) {
  try {
    return wellknown.parse(wkt);
  } catch (e) {
    console.error('WKT parse error:', e);
    return null;
  }
}
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getLoteIndicadoresReales } from '../utils/satelliteData.js';

const router = express.Router();

// 1. Obtener jerarquía: Clientes -> Fincas -> Lotes
router.get('/jerarquia', async (req, res) => {
  try {
    // Para simplificar, agrupamos fincas y lotes
    // En una BD real, 'fincas' tiene id_tenant o id_cliente, y 'lotes' tiene id_nucleo que viene de finca.
    // Vamos a buscar todas las fincas y sus lotes correspondientes, asumiendo tenant 1 por defecto si no hay auth
    
    // Obtenemos fincas
    const [fincas] = await getDb(req).query(
      "SELECT id_finca, nombre, poligono_gps, ST_AsText(poligono_gps) as poligono_wkt FROM fincas WHERE activo = 1"
    );

    // Obtenemos nucleos (las fincas se dividen en nucleos, y los nucleos en lotes)
    const [nucleos] = await getDb(req).query(
      "SELECT id_nucleo, id_finca, nombre FROM nucleos WHERE activo = 1"
    );

    // Obtenemos lotes
    const [lotes] = await getDb(req).query(
      "SELECT id_lote, id_nucleo, nombre, hectareas, ST_AsText(poligono_gps) as poligono_wkt, tipo_suelo, estado FROM lotes WHERE activo = 1"
    );

    // Agrupación en memoria
  const fincasMap = fincas.map(f => {
    // Convert finca polygon WKT to GeoJSON
    const fincaGeo = wktToGeoJSON(f.poligono_wkt);
    const nucleosOfFinca = nucleos.filter(n => n.id_finca === f.id_finca);
    const nucleoIds = nucleosOfFinca.map(n => n.id_nucleo);
    // Find lotes belonging to any nucleo of this finca and convert their geometry
    const lotesOfFinca = lotes.filter(l => nucleoIds.includes(l.id_nucleo)).map(l => ({
      ...l,
      poligono_geojson: wktToGeoJSON(l.poligono_wkt)
    }));
    return {
      ...f,
      poligono_geojson: fincaGeo,
      lotes: lotesOfFinca
    };
  });

    res.json(fincasMap);
  } catch (err) {
    console.error('Error fetching jerarquia:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Obtener indicadores de un lote (real data)
router.get('/lote/:id/indicadores', async (req, res) => {
  const { id } = req.params;
  try {
    const data = await getLoteIndicadoresReales(id);
    res.json(data);
  } catch (err) {
    console.error('Error fetching indicadores reales:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Obtener configuración de IA
router.get('/ai-config', async (req, res) => {
  try {
    const [rows] = await getDb(req).query("SELECT active, api_key IS NOT NULL AND api_key <> '' AS has_api_key FROM sys_ai_config WHERE provider = 'gemini' LIMIT 1");
    if (rows.length) {
      res.json({ configured: Boolean(rows[0].has_api_key), active: rows[0].active });
    } else {
      res.json({ configured: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Guardar configuración de IA
router.post('/ai-config', async (req, res) => {
  const { api_key } = req.body;
  if (!api_key) return res.status(400).json({ error: 'API Key es requerida' });
  try {
    const [rows] = await getDb(req).query("SELECT id FROM sys_ai_config WHERE provider = 'gemini'");
    if (rows.length) {
      await getDb(req).query("UPDATE sys_ai_config SET api_key = ? WHERE provider = 'gemini'", [api_key]);
    } else {
      await getDb(req).query("INSERT INTO sys_ai_config (provider, api_key) VALUES ('gemini', ?)", [api_key]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Asistente IA - Recomendaciones
router.post('/ai-recomendaciones', async (req, res) => {
  const { lote, indicadores } = req.body;
  
  try {
    const [config] = await getDb(req).query("SELECT api_key FROM sys_ai_config WHERE provider = 'gemini' AND active = 1 LIMIT 1");
    if (!config.length || !config[0].api_key) {
      return res.status(400).json({ error: 'La API Key de Gemini no está configurada.' });
    }

    const genAI = new GoogleGenerativeAI(config[0].api_key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });

// Extract fields with fallback values
    const ndviVal = indicadores.ndvi?.valor ?? 'N/A';
    const ndviEstado = indicadores.ndvi?.estado ?? '';
    const humedadVal = indicadores.humedad_suelo?.valor ?? 'N/A';
    const humedadEstado = indicadores.humedad_suelo?.estado ?? '';
    const tempVal = indicadores.estresTierra?.temperaturaC ?? 'N/A';
    const tempEstado = indicadores.estresTierra?.estado ?? '';
    const plagasStr = indicadores.plagas?.map(p => `${p.tipo} (${p.riesgo})`).join(', ') ?? '';
    const climaTemp = indicadores.climaReal?.temp ?? 'N/A';
    const climaCond = indicadores.climaReal?.condicion ?? '';

    const prompt = `
Eres un Ingeniero Agrónomo experto en teledetección satelital.
He analizado el lote "${lote.nombre}" (Suelo: ${lote.tipo_suelo}, ${lote.hectareas} ha) usando imágenes de satélite (Sentinel-1/2).
Los indicadores actuales son:
- NDVI: ${ndviVal} (${ndviEstado})
- Humedad del Suelo: ${humedadVal}% (${humedadEstado})
- Temperatura del suelo: ${tempVal}°C (${tempEstado})
- Riesgo de Plagas: ${plagasStr}
- Clima local: ${climaTemp}°C, ${climaCond}

Proporciona un diagnóstico breve y profesional, seguido de 3 a 5 medidas exactas, correctivas o preventivas que debo tomar en campo. Usa un tono directo, técnico pero fácil de leer. Devuelve el resultado en Markdown, sin saludar, directamente al punto.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ recomendacion_markdown: text });

  } catch (err) {
    console.error('Error con Gemini AI:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
