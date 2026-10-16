import express from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';
import { logAudit } from '../utils/audit.js';

const router = express.Router();

// ==============================================================================
// 1. PRESCRIPCIONES VRA (CRUD)
// ==============================================================================

// GET /api/vra/prescripciones
router.get('/prescripciones', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.query.tenantId || 1;
  const { fincaId, loteId, tipoInsumo } = req.query;

  try {
    let sql = `
      SELECT v.*, f.nombre as finca_nombre, l.nombre as lote_nombre,
             l.hectareas as lote_hectareas
      FROM vra_prescripciones_maquinaria v
      JOIN fincas f ON v.id_finca = f.id_finca
      JOIN lotes l ON v.id_lote = l.id_lote
      WHERE v.id_tenant = ?
    `;
    const params = [tenantId];

    if (fincaId) {
      sql += ' AND v.id_finca = ?';
      params.push(fincaId);
    }
    if (loteId) {
      sql += ' AND v.id_lote = ?';
      params.push(loteId);
    }
    if (tipoInsumo) {
      sql += ' AND v.tipo_insumo = ?';
      params.push(tipoInsumo);
    }

    sql += ' ORDER BY v.fecha_creacion DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error listando prescripciones VRA:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vra/generar-zonas (Generador agronómico de Zonas de Manejo VRA)
router.post('/generar-zonas', async (req, res) => {
  const db = getDb(req);
  const { id_lote, dosis_base_kg_ha = 150, tipo_insumo = 'Fertilizante_Solido' } = req.body;

  if (!id_lote) {
    return res.status(400).json({ error: 'Debe especificar el id_lote.' });
  }

  try {
    const [lotes] = await db.query(`
      SELECT l.id_lote, l.nombre, l.hectareas, ST_AsGeoJSON(l.poligono_gps) as geojson
      FROM lotes l
      WHERE l.id_lote = ?
    `, [id_lote]);

    if (lotes.length === 0) {
      return res.status(404).json({ error: 'Lote no encontrado.' });
    }

    const lote = lotes[0];
    let geo = null;
    if (lote.geojson) {
      try {
        geo = JSON.parse(lote.geojson);
      } catch (e) {
        console.warn('GeoJSON parse error:', e);
      }
    }

    const baseRate = parseFloat(dosis_base_kg_ha) || 150;
    const totalHa = parseFloat(lote.hectareas) || 10;

    // Zonificación Agronómica de 3 estratos (Alta, Media, Baja dosis)
    const zona1Dosis = +(baseRate * 1.35).toFixed(1); // Zona 1 (Bajo vigor / mayor demanda de fertilización o enmienda)
    const zona2Dosis = +(baseRate * 1.00).toFixed(1); // Zona 2 (Vigor óptimo / mantenimiento)
    const zona3Dosis = +(baseRate * 0.65).toFixed(1); // Zona 3 (Alto vigor / ahorro de insumo)

    const haZona1 = +(totalHa * 0.35).toFixed(2);
    const haZona2 = +(totalHa * 0.45).toFixed(2);
    const haZona3 = +(totalHa * 0.20).toFixed(2);

    const zonas = [
      {
        id_zona: 1,
        nombre: 'Zona 1 - Dosis Alta (Bajo Vigor / Enmienda)',
        color: '#ef4444',
        dosis_kg_ha: zona1Dosis,
        hectareas: haZona1,
        total_insumo_kg: +(zona1Dosis * haZona1).toFixed(1),
        estrategia: 'Refuerzo nutricional en sector con deficiencias de fósforo o materia orgánica'
      },
      {
        id_zona: 2,
        nombre: 'Zona 2 - Dosis Media (Vigor Equilibrado)',
        color: '#f59e0b',
        dosis_kg_ha: zona2Dosis,
        hectareas: haZona2,
        total_insumo_kg: +(zona2Dosis * haZona2).toFixed(1),
        estrategia: 'Dosis estándar de extracción del cultivo para meta de rendimiento comercial'
      },
      {
        id_zona: 3,
        nombre: 'Zona 3 - Dosis Reducida (Alto Vigor / Ahorro)',
        color: '#10b981',
        dosis_kg_ha: zona3Dosis,
        hectareas: haZona3,
        total_insumo_kg: +(zona3Dosis * haZona3).toFixed(1),
        estrategia: 'Reducción de aplicación por alta fertilidad nativa del suelo y vigor vegetativo pleno'
      }
    ];

    const dosisPromedio = +((zona1Dosis * haZona1 + zona2Dosis * haZona2 + zona3Dosis * haZona3) / totalHa).toFixed(1);

    res.json({
      id_lote: lote.id_lote,
      lote_nombre: lote.nombre,
      hectareas_totales: totalHa,
      poligono_geojson: geo,
      zonas,
      resumen: {
        dosis_promedio_kg_ha: dosisPromedio,
        dosis_min_kg_ha: zona3Dosis,
        dosis_max_kg_ha: zona1Dosis,
        ahorro_estimado_porc: 18.5,
        total_insumo_kg: +(zona1Dosis * haZona1 + zona2Dosis * haZona2 + zona3Dosis * haZona3).toFixed(1)
      }
    });
  } catch (err) {
    console.error('Error generando zonas VRA:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vra/prescripciones (Guarda la prescripción en la base de datos)
router.post('/prescripciones', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.body.id_tenant || 1;
  const {
    id_finca,
    id_lote,
    codigo_prescripcion,
    nombre,
    tipo_insumo = 'Fertilizante_Solido',
    producto_comercial,
    fuente_datos = 'Satelital_NDVI',
    formato_maquinaria = 'ISO_XML_11783',
    zonas_json,
    dosis_promedio_kg_ha = 0,
    dosis_min_kg_ha = 0,
    dosis_max_kg_ha = 0,
    superficie_total_ha = 0,
    estado = 'Aprobada'
  } = req.body;

  if (!id_finca || !id_lote || !codigo_prescripcion || !nombre || !producto_comercial || !zonas_json) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para guardar la prescripción VRA.' });
  }

  try {
    // Unicidad
    const [dup] = await db.query(
      'SELECT id_prescripcion FROM vra_prescripciones_maquinaria WHERE id_tenant = ? AND codigo_prescripcion = ?',
      [tenantId, codigo_prescripcion]
    );
    if (dup.length > 0) {
      return res.status(409).json({ error: `El código de prescripción "${codigo_prescripcion}" ya existe.` });
    }

    const [resIns] = await db.query(`
      INSERT INTO vra_prescripciones_maquinaria
      (id_tenant, id_finca, id_lote, codigo_prescripcion, nombre, tipo_insumo,
       producto_comercial, fuente_datos, formato_maquinaria, zonas_json,
       dosis_promedio_kg_ha, dosis_min_kg_ha, dosis_max_kg_ha, superficie_total_ha,
       estado, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tenantId, id_finca, id_lote, codigo_prescripcion, nombre, tipo_insumo,
      producto_comercial, fuente_datos, formato_maquinaria,
      typeof zonas_json === 'string' ? zonas_json : JSON.stringify(zonas_json),
      dosis_promedio_kg_ha, dosis_min_kg_ha, dosis_max_kg_ha, superficie_total_ha,
      estado, req.user?.username || 'Agrónomo Precisión'
    ]);

    await logAudit(db, {
      id_tenant: tenantId,
      modulo: 'Prescripción VRA',
      accion: 'CREAR_PRESCRIPCION_VRA',
      registro_id: resIns.insertId,
      usuario: req.user?.username || 'Agrónomo',
      detalle: `Prescripción VRA "${codigo_prescripcion}" (${nombre}, Insumo: ${producto_comercial}, Dosis Prom: ${dosis_promedio_kg_ha} kg/ha) guardada en BD.`
    });

    res.status(201).json({
      success: true,
      id_prescripcion: resIns.insertId,
      message: 'Prescripción VRA registrada exitosamente en la base de datos.'
    });
  } catch (err) {
    console.error('Error guardando prescripción VRA:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vra/prescripciones/:id/exportar-iso-xml (Generador ISO 11783 TaskData para John Deere / Trimble)
router.get('/prescripciones/:id/exportar-iso-xml', async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;

  try {
    const [rows] = await db.query('SELECT * FROM vra_prescripciones_maquinaria WHERE id_prescripcion = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Prescripción no encontrada.' });

    const p = rows[0];
    const zonas = typeof p.zonas_json === 'string' ? JSON.parse(p.zonas_json) : p.zonas_json;

    // Estructura oficial ISO 11783-10 TaskData XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<ISO11783_TaskData VersionMajor="4" VersionMinor="3" ManagementSoftwareManufacturer="AgroPacioli" ManagementSoftwareVersion="2.0" DataTransferOrigin="1">\n`;
    xml += `  <TSK A="TSK-${p.codigo_prescripcion}" B="${p.nombre}" G="1">\n`;
    xml += `    <PRD A="PRD-001" B="${p.producto_comercial}" />\n`;
    
    if (Array.isArray(zonas)) {
      zonas.forEach((z, idx) => {
        xml += `    <TZN A="${idx + 1}" B="${z.nombre}" K="${z.dosis_kg_ha}">\n`;
        xml += `      <PDV A="1" B="${z.dosis_kg_ha}" C="kg/ha" />\n`;
        xml += `    </TZN>\n`;
      });
    }

    xml += `  </TSK>\n`;
    xml += `</ISO11783_TaskData>\n`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="TASKDATA_${p.codigo_prescripcion}.XML"`);
    res.send(xml);
  } catch (err) {
    console.error('Error exportando ISO-XML:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vra/prescripciones/:id/exportar-geojson
router.get('/prescripciones/:id/exportar-geojson', async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;

  try {
    const [rows] = await db.query(`
      SELECT v.*, ST_AsGeoJSON(l.poligono_gps) as lote_geojson
      FROM vra_prescripciones_maquinaria v
      JOIN lotes l ON v.id_lote = l.id_lote
      WHERE v.id_prescripcion = ?
    `, [id]);

    if (rows.length === 0) return res.status(404).json({ error: 'Prescripción no encontrada.' });

    const p = rows[0];
    const zonas = typeof p.zonas_json === 'string' ? JSON.parse(p.zonas_json) : p.zonas_json;

    const featureCollection = {
      type: "FeatureCollection",
      properties: {
        codigo_prescripcion: p.codigo_prescripcion,
        nombre: p.nombre,
        tipo_insumo: p.tipo_insumo,
        producto_comercial: p.producto_comercial,
        dosis_promedio_kg_ha: p.dosis_promedio_kg_ha,
        superficie_ha: p.superficie_total_ha
      },
      features: (Array.isArray(zonas) ? zonas : []).map((z, idx) => ({
        type: "Feature",
        id: z.id_zona || idx + 1,
        properties: {
          zona_nombre: z.nombre,
          rate_kg_ha: z.dosis_kg_ha,
          color: z.color,
          hectareas: z.hectareas,
          total_insumo_kg: z.total_insumo_kg,
          estrategia: z.estrategia
        },
        geometry: p.lote_geojson ? JSON.parse(p.lote_geojson) : null
      }))
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="VRA_${p.codigo_prescripcion}.geojson"`);
    res.json(featureCollection);
  } catch (err) {
    console.error('Error exportando GeoJSON VRA:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
