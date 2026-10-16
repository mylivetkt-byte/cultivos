import express from 'express';
import * as turf from '@turf/turf';
import pool from '../db.js';
import { getDb } from '../utils/db.js';
import { logAudit } from '../utils/audit.js';

const router = express.Router();

/**
 * Función auxiliar para clasificar la textura según el triángulo textural USDA
 */
function calcularClaseTextural(arena, limo, arcilla) {
  if (arena == null || limo == null || arcilla == null) return null;
  const a = parseFloat(arena);
  const l = parseFloat(limo);
  const c = parseFloat(arcilla);

  if (c >= 40) {
    if (a >= 45) return 'Arcillo-Arenoso';
    if (l >= 40) return 'Arcillo-Limoso';
    return 'Arcilloso';
  }
  if (c >= 27 && c < 40) {
    if (a >= 20 && a <= 45 && l <= 45) return 'Franco-Arcilloso';
    if (a > 45) return 'Franco-Arcillo-Arenoso';
    return 'Franco-Arcillo-Limoso';
  }
  if (c < 27) {
    if (l + 1.5 * c < 15) return 'Arenoso';
    if (l + 2 * c >= 15 && a >= 70 && a <= 85) return 'Areno-Francoso';
    if (l >= 80 && c < 12) return 'Limoso';
    if (l >= 50 && c < 27) return 'Franco-Limoso';
    if (a >= 52 && c < 20) return 'Franco-Arenoso';
    return 'Franco';
  }
  return 'Franco';
}

/**
 * Generador de diagnóstico agronómico automático
 */
function generarInterpretacion(analisis) {
  const observaciones = [];
  const ph = parseFloat(analisis.ph);
  const mo = parseFloat(analisis.materia_organica_porc);
  const p = parseFloat(analisis.fosforo_ppm);
  const k = parseFloat(analisis.potasio_meq);
  const al = parseFloat(analisis.aluminio_meq);
  const cic = parseFloat(analisis.cic);
  const satBases = parseFloat(analisis.saturacion_bases_porc);
  const satAl = parseFloat(analisis.saturacion_aluminio_porc);

  if (!isNaN(ph)) {
    if (ph < 5.0) observaciones.push('🚨 Acidez extrema (pH < 5.0). Riesgo severo de toxicidad por Aluminio y bloqueo de Fósforo. Requiere encalado con Cal Dolomita o Agrícola.');
    else if (ph >= 5.0 && ph < 5.8) observaciones.push('⚠️ Suelo moderadamente ácido. Recomendado monitorear saturación de bases y aplicar fuentes de Calcio.');
    else if (ph >= 5.8 && ph <= 6.8) observaciones.push('✅ pH en rango óptimo para la gran mayoría de cultivos tropicales y transitorios.');
    else if (ph > 7.5) observaciones.push('⚠️ Suelo alcalino/calcáreo. Posible insolubilización de micronutrientes (Hierro, Zinc, Manganeso).');
  }

  if (!isNaN(p)) {
    if (p < 10) observaciones.push('📉 Fósforo disponible bajo (< 10 ppm). Requiere fertilización fosfatada de fondo (DAP, Roca Fosfórica).');
    else if (p >= 10 && p <= 25) observaciones.push('📊 Fósforo en nivel medio.');
    else if (p > 25) observaciones.push('✅ Fósforo disponible alto (> 25 ppm). Dosis de mantenimiento recomendada.');
  }

  if (!isNaN(k)) {
    if (k < 0.2) observaciones.push('📉 Potasio bajo (< 0.2 meq/100g). Afectará llenado de fruto y resistencia a sequía. Aplicar Cloruro o Sulfato de Potasio.');
    else if (k >= 0.2 && k <= 0.4) observaciones.push('📊 Nivel de Potasio adecuado.');
    else if (k > 0.4) observaciones.push('✅ Excelente reserva de Potasio.');
  }

  if (!isNaN(satAl) && satAl > 20) {
    observaciones.push(`🚨 Alta saturación de Aluminio (${satAl.toFixed(1)}%). Puede quemar ápices radiculares. Aplicar enmienda cálcica para neutralizar Al intercambiable.`);
  }

  if (!isNaN(mo)) {
    if (mo < 2.0) observaciones.push('🌱 Materia Orgánica baja (< 2.0%). Priorizar incorporación de compost, violes, bioles o rastrojos.');
    else if (mo >= 4.0) observaciones.push('✅ Buen contenido de Materia Orgánica (> 4.0%). Alta capacidad de retención de humedad.');
  }

  return observaciones.join('\n');
}

// ==============================================================================
// 1. MALLAS DE MUESTREO (CRUD & GENERACIÓN GEOMÉTRICA)
// ==============================================================================

// GET /api/suelos/mallas
router.get('/mallas', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.query.tenantId || 1;
  const { fincaId, loteId, estado } = req.query;

  try {
    let sql = `
      SELECT m.*, f.nombre as finca_nombre, l.nombre as lote_nombre,
             COUNT(p.id_punto) as puntos_generados,
             SUM(CASE WHEN p.estado = 'Colectada' THEN 1 ELSE 0 END) as puntos_colectados,
             SUM(CASE WHEN p.estado = 'Analizada' THEN 1 ELSE 0 END) as puntos_analizados
      FROM suelo_mallas_muestreo m
      JOIN fincas f ON m.id_finca = f.id_finca
      JOIN lotes l ON m.id_lote = l.id_lote
      LEFT JOIN suelo_muestreo_puntos p ON m.id_malla = p.id_malla
      WHERE m.id_tenant = ?
    `;
    const params = [tenantId];

    if (fincaId) {
      sql += ' AND m.id_finca = ?';
      params.push(fincaId);
    }
    if (loteId) {
      sql += ' AND m.id_lote = ?';
      params.push(loteId);
    }
    if (estado) {
      sql += ' AND m.estado = ?';
      params.push(estado);
    }

    sql += ' GROUP BY m.id_malla ORDER BY m.fecha_creacion DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error listando mallas de muestreo:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/suelos/mallas (Crea la malla y genera automáticamente los puntos georreferenciados)
router.post('/mallas', async (req, res) => {
  const db = getDb(req);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const tenantId = req.user?.id_tenant || req.body.id_tenant || 1;
    const {
      id_finca,
      id_lote,
      codigo_malla,
      descripcion,
      tamano_cuadricula_m = 100,
      tipo_malla = 'Regular',
      fecha_plan,
      profundidad_cm = 30
    } = req.body;

    if (!id_finca || !id_lote || !codigo_malla || !fecha_plan) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (finca, lote, código, fecha).' });
    }

    // Regla de Unicidad: Código de malla único por tenant
    const [dup] = await conn.query(
      'SELECT id_malla FROM suelo_mallas_muestreo WHERE id_tenant = ? AND codigo_malla = ?',
      [tenantId, codigo_malla]
    );
    if (dup.length > 0) {
      return res.status(409).json({ error: `Ya existe una malla de muestreo con el código "${codigo_malla}".` });
    }

    // Obtener la geometría del lote para generar los puntos de muestreo en grilla
    const [loteRows] = await conn.query(
      'SELECT id_lote, nombre, ST_AsGeoJSON(geometria) as geojson, ST_AsGeoJSON(poligono_gps) as poligono_gps FROM lotes WHERE id_lote = ?',
      [id_lote]
    );

    let loteGeoJSON = null;
    if (loteRows.length > 0) {
      const rawGeo = loteRows[0].geometria ? loteRows[0].geometria : loteRows[0].poligono_gps;
      if (rawGeo) {
        try {
          loteGeoJSON = typeof rawGeo === 'string' ? JSON.parse(rawGeo) : rawGeo;
        } catch (e) {
          console.warn('No se pudo parsear geometría de lote:', e);
        }
      }
    }

    // Insertar la malla de muestreo
    const [mallaRes] = await conn.query(
      `INSERT INTO suelo_mallas_muestreo 
      (id_tenant, id_finca, id_lote, codigo_malla, descripcion, tamano_cuadricula_m, tipo_malla, total_puntos, fecha_plan, estado, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'Planificada', ?)`,
      [tenantId, id_finca, id_lote, codigo_malla, descripcion || null, tamano_cuadricula_m, tipo_malla, fecha_plan, req.user?.id || null]
    );

    const idMalla = mallaRes.insertId;
    const puntosGenerados = [];

    // Generar puntos espaciales usando Turf si hay geometría válida
    if (loteGeoJSON && loteGeoJSON.coordinates) {
      try {
        const polygon = turf.polygon(loteGeoJSON.coordinates);
        const bbox = turf.bbox(polygon);
        const cellSideKm = parseFloat(tamano_cuadricula_m) / 1000.0; // metros a km

        // Crear grilla de puntos dentro del bounding box
        const grid = turf.pointGrid(bbox, cellSideKm, { units: 'kilometers', mask: polygon });

        let puntoIdx = 1;
        for (const pt of grid.features) {
          const lng = pt.geometry.coordinates[0];
          const lat = pt.geometry.coordinates[1];
          const codPunto = `${codigo_malla}-P${String(puntoIdx).padStart(2, '0')}`;

          await conn.query(
            `INSERT INTO suelo_muestreo_puntos
            (id_tenant, id_malla, id_lote, codigo_punto, latitud, longitud, geometria_punto, profundidad_cm, estado)
            VALUES (?, ?, ?, ?, ?, ?, ST_GeomFromText(?, 4326), ?, 'Pendiente')`,
            [tenantId, idMalla, id_lote, codPunto, lat, lng, `POINT(${lng} ${lat})`, profundidad_cm]
          );

          puntosGenerados.push({ codigo_punto: codPunto, latitud: lat, longitud: lng });
          puntoIdx++;
        }
      } catch (errTurf) {
        console.error('Error generando puntos con Turf:', errTurf);
      }
    }

    // Actualizar total_puntos en la malla
    await conn.query('UPDATE suelo_mallas_muestreo SET total_puntos = ? WHERE id_malla = ?', [puntosGenerados.length, idMalla]);

    // Rastro de Auditoría
    await logAudit(conn, {
      id_tenant: tenantId,
      modulo: 'Suelos - Muestreo',
      accion: 'CREAR_MALLA',
      registro_id: idMalla,
      usuario: req.user?.username || 'Usuario',
      detalle: `Malla "${codigo_malla}" creada con ${puntosGenerados.length} puntos calculados por Turf.`
    });

    await conn.commit();

    res.status(201).json({
      success: true,
      message: `Malla "${codigo_malla}" creada exitosamente con ${puntosGenerados.length} puntos de muestreo georreferenciados.`,
      id_malla: idMalla,
      total_puntos: puntosGenerados.length,
      puntos: puntosGenerados
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error creando malla de muestreo:', err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// GET /api/suelos/mallas/:id/puntos
router.get('/mallas/:id/puntos', async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT p.*, a.id_analisis, a.numero_informe, a.ph, a.materia_organica_porc, a.fosforo_ppm, a.potasio_meq, a.textura_clase
       FROM suelo_muestreo_puntos p
       LEFT JOIN suelo_analisis_laboratorio a ON p.id_punto = a.id_punto
       WHERE p.id_malla = ?
       ORDER BY p.codigo_punto ASC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo puntos de la malla:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/suelos/puntos/:id (Actualizar recolección en campo del punto)
router.put('/puntos/:id', async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;
  const { estado, fecha_recoleccion, id_recolector, observaciones, submuestras_count } = req.body;

  try {
    await db.query(
      `UPDATE suelo_muestreo_puntos
       SET estado = COALESCE(?, estado),
           fecha_recoleccion = COALESCE(?, fecha_recoleccion),
           id_recolector = COALESCE(?, id_recolector),
           observaciones = COALESCE(?, observaciones),
           submuestras_count = COALESCE(?, submuestras_count)
       WHERE id_punto = ?`,
      [estado, fecha_recoleccion, id_recolector, observaciones, submuestras_count, id]
    );

    // Si todos los puntos están colectados, marcar la malla como En_Muestreo o Completada
    const [punto] = await db.query('SELECT id_malla FROM suelo_muestreo_puntos WHERE id_punto = ?', [id]);
    if (punto.length > 0) {
      const idMalla = punto[0].id_malla;
      const [pendientes] = await db.query(
        "SELECT COUNT(*) as count FROM suelo_muestreo_puntos WHERE id_malla = ? AND estado = 'Pendiente'",
        [idMalla]
      );
      if (pendientes[0].count === 0) {
        await db.query("UPDATE suelo_mallas_muestreo SET estado = 'En_Muestreo' WHERE id_malla = ?", [idMalla]);
      }
    }

    res.json({ success: true, message: 'Punto actualizado correctamente.' });
    await logAudit(db, {
      id_tenant: req.user?.id_tenant || 1,
      modulo: 'Suelos - Muestreo',
      accion: 'ACTUALIZAR_PUNTO',
      registro_id: id,
      usuario: req.user?.username || 'Usuario',
      detalle: `Punto actualizado a estado: ${estado || 'Colectado'}`
    });
  } catch (err) {
    console.error('Error actualizando punto:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/suelos/mallas/:id
router.delete('/mallas/:id', async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;
  try {
    await db.query('DELETE FROM suelo_mallas_muestreo WHERE id_malla = ?', [id]);
    await logAudit(db, {
      id_tenant: req.user?.id_tenant || 1,
      modulo: 'Suelos - Muestreo',
      accion: 'ELIMINAR_MALLA',
      registro_id: id,
      usuario: req.user?.username || 'Usuario',
      detalle: `Malla ID ${id} eliminada`
    });
    res.json({ success: true, message: 'Malla eliminada correctamente.' });
  } catch (err) {
    console.error('Error eliminando malla:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 2. ANÁLISIS DE LABORATORIO (CRUD & FÓRMULAS QUÍMICAS AGRONÓMICAS)
// ==============================================================================

// GET /api/suelos/analisis
router.get('/analisis', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.query.tenantId || 1;
  const { loteId, fincaId, laboratorio, fechaDesde, fechaHasta } = req.query;

  try {
    let sql = `
      SELECT a.*, p.codigo_punto, p.latitud, p.longitud, p.profundidad_cm,
             l.nombre as lote_nombre, f.nombre as finca_nombre, m.codigo_malla
      FROM suelo_analisis_laboratorio a
      JOIN suelo_mallas_muestreo m ON p.id_malla = m.id_malla
      JOIN fincas f ON m.id_finca = f.id_finca
      WHERE a.id_tenant = ?
    `;
    const params = [tenantId];

    if (loteId) {
      sql += ' AND a.id_lote = ?';
      params.push(loteId);
    }
    if (fincaId) {
      sql += ' AND m.id_finca = ?';
      params.push(fincaId);
    }
    if (laboratorio) {
      sql += ' AND a.laboratorio_nombre LIKE ?';
      params.push(`%${laboratorio}%`);
    }
    if (fechaDesde && fechaHasta) {
      sql += ' AND a.fecha_analisis BETWEEN ? AND ?';
      params.push(fechaDesde, fechaHasta);
    }

    sql += ' ORDER BY a.fecha_analisis DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error listando análisis de laboratorio:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/suelos/analisis (Registra resultado con cálculos automáticos de fertilidad)
router.post('/analisis', async (req, res) => {
  const db = getDb(req);
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const tenantId = req.user?.id_tenant || req.body.id_tenant || 1;
    const {
      id_punto,
      id_lote,
      numero_informe,
      laboratorio_nombre,
      fecha_muestreo,
      fecha_analisis,
      fecha_resultado,
      arena_porc,
      limo_porc,
      arcilla_porc,
      densidad_aparente,
      ph,
      ce_ds_m,
      materia_organica_porc,
      nitrogeno_total_porc,
      fosforo_ppm,
      potasio_meq,
      calcio_meq,
      magnesio_meq,
      sodio_meq,
      aluminio_meq,
      azufre_ppm,
      boro_ppm,
      zinc_ppm,
      hierro_ppm,
      manganeso_ppm,
      cobre_ppm,
      observaciones
    } = req.body;

    if (!id_punto || !numero_informe || !laboratorio_nombre || !fecha_analisis) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (punto, informe, laboratorio, fecha).' });
    }

    // Regla de Unicidad
    const [dup] = await conn.query(
      'SELECT id_analisis FROM suelo_analisis_laboratorio WHERE id_punto = ? AND numero_informe = ?',
      [id_punto, numero_informe]
    );
    if (dup.length > 0) {
      return res.status(409).json({ error: `El informe "${numero_informe}" ya fue registrado para este punto de muestreo.` });
    }

    // Cálculos Fisicoquímicos Automáticos
    const texturaClase = calcularClaseTextural(arena_porc, limo_porc, arcilla_porc);

    // Suma de bases: Ca + Mg + K + Na
    const ca = parseFloat(calcio_meq) || 0;
    const mg = parseFloat(magnesio_meq) || 0;
    const k = parseFloat(potasio_meq) || 0;
    const na = parseFloat(sodio_meq) || 0;
    const al = parseFloat(aluminio_meq) || 0;
    const sumaBases = ca + mg + k + na;

    // CICE = Suma de bases + Al intercambiable
    const cicCalculada = req.body.cic ? parseFloat(req.body.cic) : (sumaBases + al);
    const satBases = cicCalculada > 0 ? (sumaBases / cicCalculada) * 100 : 0;
    const satAluminio = cicCalculada > 0 ? (al / cicCalculada) * 100 : 0;

    const payloadCalculo = {
      ph,
      materia_organica_porc,
      fosforo_ppm,
      potasio_meq,
      aluminio_meq,
      cic: cicCalculada,
      saturacion_bases_porc: satBases,
      saturacion_aluminio_porc: satAluminio
    };

    const interpretacionIA = generarInterpretacion(payloadCalculo);

    // Insertar análisis
    const [resAnalisis] = await conn.query(
      `INSERT INTO suelo_analisis_laboratorio
      (id_tenant, id_punto, id_lote, numero_informe, laboratorio_nombre, fecha_muestreo, fecha_analisis, fecha_resultado,
       textura_clase, arena_porc, limo_porc, arcilla_porc, densidad_aparente,
       ph, ce_ds_m, materia_organica_porc, nitrogeno_total_porc, fosforo_ppm,
       potasio_meq, calcio_meq, magnesio_meq, sodio_meq, aluminio_meq, acidez_intercambiable,
       cic, saturacion_bases_porc, saturacion_aluminio_porc,
       azufre_ppm, boro_ppm, zinc_ppm, hierro_ppm, manganeso_ppm, cobre_ppm,
       observaciones, interpretacion_agronomica, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId, id_punto, id_lote, numero_informe, laboratorio_nombre, fecha_muestreo || null, fecha_analisis, fecha_resultado || null,
        texturaClase, arena_porc || null, limo_porc || null, arcilla_porc || null, densidad_aparente || null,
        ph || null, ce_ds_m || null, materia_organica_porc || null, nitrogeno_total_porc || null, fosforo_ppm || null,
        k || null, ca || null, mg || null, na || null, al || null, al || null,
        cicCalculada.toFixed(2), satBases.toFixed(2), satAluminio.toFixed(2),
        azufre_ppm || null, boro_ppm || null, zinc_ppm || null, hierro_ppm || null, manganeso_ppm || null, cobre_ppm || null,
        observaciones || null, interpretacionIA, req.user?.id || null
      ]
    );

    // Actualizar estado del punto a 'Analizada'
    await conn.query("UPDATE suelo_muestreo_puntos SET estado = 'Analizada' WHERE id_punto = ?", [id_punto]);

    // Rastro de Auditoría
    await logAudit(conn, {
      id_tenant: tenantId,
      modulo: 'Suelos - Laboratorio',
      accion: 'REGISTRAR_ANALISIS',
      registro_id: resAnalisis.insertId,
      usuario: req.user?.username || 'Usuario',
      detalle: `Análisis informe "${numero_informe}" registrado (Lab: ${laboratorio_nombre}, Textura: ${texturaClase || 'N/A'}, CICE: ${cicCalculada.toFixed(2)})`
    });

    await conn.commit();

    res.status(201).json({
      success: true,
      id_analisis: resAnalisis.insertId,
      textura_clase: texturaClase,
      cic: cicCalculada.toFixed(2),
      saturacion_bases_porc: satBases.toFixed(2),
      saturacion_aluminio_porc: satAluminio.toFixed(2),
      interpretacion: interpretacionIA
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error guardando análisis de suelo:', err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// GET /api/suelos/stats-lote/:id_lote (Consolidado de fertilidad por lote)
router.get('/stats-lote/:id_lote', async (req, res) => {
  const db = getDb(req);
  const { id_lote } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT 
        COUNT(a.id_analisis) as total_muestras,
        ROUND(AVG(a.ph), 2) as ph_promedio,
        ROUND(AVG(a.materia_organica_porc), 2) as mo_promedio,
        ROUND(AVG(a.fosforo_ppm), 2) as p_promedio,
        ROUND(AVG(a.potasio_meq), 3) as k_promedio,
        ROUND(AVG(a.calcio_meq), 3) as ca_promedio,
        ROUND(AVG(a.magnesio_meq), 3) as mg_promedio,
        ROUND(AVG(a.cic), 2) as cic_promedio,
        ROUND(AVG(a.saturacion_bases_porc), 2) as sat_bases_promedio,
        ROUND(AVG(a.saturacion_aluminio_porc), 2) as sat_aluminio_promedio,
        MAX(a.textura_clase) as textura_predominante
       FROM suelo_analisis_laboratorio a
       WHERE a.id_lote = ?`,
      [id_lote]
    );

    res.json(rows[0] || {});
  } catch (err) {
    console.error('Error obteniendo estadísticas de suelo del lote:', err);
    res.status(500).json({ error: err.message });
  }
});
// GET /api/suelos/catalogos/lotes (Listado de lotes con polígono para Leaflet)
router.get('/catalogos/lotes', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.query.tenantId || 1;
  const { fincaId } = req.query;

  try {
    let sql = `
      SELECT l.id_lote, l.codigo, l.nombre, l.hectareas, 
             ST_AsGeoJSON(l.poligono_gps) as geojson,
             n.id_finca, f.nombre as finca_nombre
      FROM lotes l
      JOIN nucleos n ON l.id_nucleo = n.id_nucleo
      JOIN fincas f ON n.id_finca = f.id_finca
      WHERE f.id_tenant = ?
    `;
    const params = [tenantId];

    if (fincaId) {
      sql += ' AND f.id_finca = ?';
      params.push(fincaId);
    }

    sql += ' ORDER BY l.nombre ASC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error listando lotes para catálogo de suelos:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
