import express from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';
import { logAudit } from '../utils/audit.js';

const router = express.Router();

// ==============================================================================
// 1. MAPAS DE RENDIMIENTO & PUNTOS DE COSECHA (CRUD)
// ==============================================================================

// GET /api/rendimiento/mapas
router.get('/mapas', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.query.tenantId || 1;
  const { fincaId, loteId } = req.query;

  try {
    let sql = `
      SELECT m.*, f.nombre as finca_nombre, l.nombre as lote_nombre
      FROM rendimiento_mapas_cosecha m
      JOIN fincas f ON m.id_finca = f.id_finca
      JOIN lotes l ON m.id_lote = l.id_lote
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

    sql += ' ORDER BY m.fecha_cosecha DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error listando mapas de rendimiento:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rendimiento/mapas/:id/puntos
router.get('/mapas/:id/puntos', async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;

  try {
    const [rows] = await db.query(`
      SELECT id_punto, id_mapa, latitud, longitud, rendimiento_kg_ha, humedad_pct, velocidad_kmh
      FROM rendimiento_puntos_detalle
      WHERE id_mapa = ?
      LIMIT 1000
    `, [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rendimiento/mapas
router.post('/mapas', async (req, res) => {
  const conn = await pool.getConnection();
  const tenantId = req.user?.id_tenant || req.body.id_tenant || 1;
  const {
    id_finca,
    id_lote,
    codigo_mapa,
    nombre_cosecha,
    cultivo,
    fecha_cosecha,
    archivo_origen_tipo = 'Monitor_Cosechadora',
    humedad_grano_promedio_porc = 14.0,
    puntos = [] // Array de { latitud, longitud, rendimiento_kg_ha, humedad_pct, velocidad_kmh }
  } = req.body;

  if (!id_finca || !id_lote || !codigo_mapa || !nombre_cosecha || !cultivo || !fecha_cosecha) {
    conn.release();
    return res.status(400).json({ error: 'Faltan campos obligatorios para registrar el mapa de cosecha.' });
  }

  try {
    await conn.beginTransaction();

    // Unicidad
    const [dup] = await conn.query(
      'SELECT id_mapa FROM rendimiento_mapas_cosecha WHERE id_tenant = ? AND codigo_mapa = ?',
      [tenantId, codigo_mapa]
    );
    if (dup.length > 0) {
      await conn.rollback();
      conn.release();
      return res.status(409).json({ error: `El código de mapa "${codigo_mapa}" ya existe.` });
    }

    // Calcular estadísticas
    let promTonHa = 0;
    let minTonHa = 0;
    let maxTonHa = 0;

    if (Array.isArray(puntos) && puntos.length > 0) {
      const tonVals = puntos.map(p => (parseFloat(p.rendimiento_kg_ha) || 0) / 1000);
      const sum = tonVals.reduce((acc, v) => acc + v, 0);
      promTonHa = +(sum / tonVals.length).toFixed(2);
      minTonHa = +Math.min(...tonVals).toFixed(2);
      maxTonHa = +Math.max(...tonVals).toFixed(2);
    } else if (req.body.rendimiento_promedio_ton_ha) {
      promTonHa = parseFloat(req.body.rendimiento_promedio_ton_ha) || 0;
      minTonHa = parseFloat(req.body.rendimiento_min_ton_ha) || (promTonHa * 0.7);
      maxTonHa = parseFloat(req.body.rendimiento_max_ton_ha) || (promTonHa * 1.3);
    }

    const [resMapa] = await conn.query(`
      INSERT INTO rendimiento_mapas_cosecha
      (id_tenant, id_finca, id_lote, codigo_mapa, nombre_cosecha, cultivo,
       fecha_cosecha, total_puntos_muestreados, rendimiento_promedio_ton_ha,
       rendimiento_min_ton_ha, rendimiento_max_ton_ha, humedad_grano_promedio_porc,
       archivo_origen_tipo, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tenantId, id_finca, id_lote, codigo_mapa, nombre_cosecha, cultivo,
      fecha_cosecha, puntos.length, promTonHa, minTonHa, maxTonHa,
      humedad_grano_promedio_porc, archivo_origen_tipo, req.user?.username || 'Agrónomo Precisión'
    ]);

    const idMapa = resMapa.insertId;

    // Insertar puntos georreferenciados si vienen en el payload
    if (Array.isArray(puntos) && puntos.length > 0) {
      for (const pt of puntos) {
        if (pt.latitud && pt.longitud && pt.rendimiento_kg_ha != null) {
          await conn.query(`
            INSERT INTO rendimiento_puntos_detalle
            (id_mapa, latitud, longitud, geometria_punto, rendimiento_kg_ha, humedad_pct, velocidad_kmh)
            VALUES (?, ?, ?, ST_GeomFromText(?, 4326), ?, ?, ?)
          `, [
            idMapa, pt.latitud, pt.longitud, `POINT(${pt.longitud} ${pt.latitud})`,
            pt.rendimiento_kg_ha, pt.humedad_pct || null, pt.velocidad_kmh || null
          ]);
        }
      }
    }

    await logAudit(conn, {
      id_tenant: tenantId,
      modulo: 'Mapas de Rendimiento',
      accion: 'REGISTRAR_MAPA_COSECHA',
      registro_id: idMapa,
      usuario: req.user?.username || 'Usuario',
      detalle: `Mapa "${codigo_mapa}" (${nombre_cosecha}, ${promTonHa} ton/ha, ${puntos.length} puntos) registrado en BD.`
    });

    await conn.commit();

    res.status(201).json({
      success: true,
      id_mapa: idMapa,
      rendimiento_promedio_ton_ha: promTonHa,
      total_puntos: puntos.length,
      message: 'Mapa de rendimiento guardado exitosamente en la base de datos.'
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error guardando mapa de rendimiento:', err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// DELETE /api/rendimiento/mapas/:id
router.delete('/mapas/:id', async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;
  try {
    await db.query('DELETE FROM rendimiento_mapas_cosecha WHERE id_mapa = ?', [id]);
    await logAudit(db, {
      id_tenant: req.user?.id_tenant || 1,
      modulo: 'Mapas de Rendimiento',
      accion: 'ELIMINAR_MAPA',
      registro_id: id,
      usuario: req.user?.username || 'Usuario',
      detalle: `Mapa de cosecha ID ${id} eliminado.`
    });
    res.json({ success: true, message: 'Mapa eliminado correctamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 2. STRIP TRIALS (ENSAYOS EN FRANJAS) & EVALUACIÓN RETORNO ROI
// ==============================================================================

// GET /api/rendimiento/strip-trials
router.get('/strip-trials', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.query.tenantId || 1;
  const { fincaId, loteId } = req.query;

  try {
    let sql = `
      SELECT t.*, f.nombre as finca_nombre, l.nombre as lote_nombre
      FROM rendimiento_strip_trials_roi t
      JOIN fincas f ON t.id_finca = f.id_finca
      JOIN lotes l ON t.id_lote = l.id_lote
      WHERE t.id_tenant = ?
    `;
    const params = [tenantId];

    if (fincaId) {
      sql += ' AND t.id_finca = ?';
      params.push(fincaId);
    }
    if (loteId) {
      sql += ' AND t.id_lote = ?';
      params.push(loteId);
    }

    sql += ' ORDER BY t.fecha_evaluacion DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error listando strip trials:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rendimiento/strip-trials (Cálculo y guardado de ROI de Precisión)
router.post('/strip-trials', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.body.id_tenant || 1;
  const {
    id_finca,
    id_lote,
    codigo_ensayo,
    nombre,
    tratamiento_control = 'Dosis Fija Convencional',
    tratamiento_vra = 'Dosis Variable VRA',
    costo_insumo_control_ha = 0,
    costo_insumo_vra_ha = 0,
    rendimiento_control_ton_ha = 0,
    rendimiento_vra_ton_ha = 0,
    precio_venta_tonelada = 0,
    fecha_evaluacion,
    evaluador,
    observaciones
  } = req.body;

  if (!id_finca || !id_lote || !codigo_ensayo || !nombre || !fecha_evaluacion || !evaluador) {
    return res.status(400).json({ error: 'Faltan campos requeridos para registrar el strip trial.' });
  }

  try {
    // Unicidad
    const [dup] = await db.query(
      'SELECT id_ensayo FROM rendimiento_strip_trials_roi WHERE id_tenant = ? AND codigo_ensayo = ?',
      [tenantId, codigo_ensayo]
    );
    if (dup.length > 0) {
      return res.status(409).json({ error: `El código de ensayo "${codigo_ensayo}" ya existe.` });
    }

    // Cálculos ROI
    const cCtrl = parseFloat(costo_insumo_control_ha) || 0;
    const cVra = parseFloat(costo_insumo_vra_ha) || 0;
    const rCtrl = parseFloat(rendimiento_control_ton_ha) || 0;
    const rVra = parseFloat(rendimiento_vra_ton_ha) || 0;
    const precio = parseFloat(precio_venta_tonelada) || 0;

    // 1. Ahorro de Insumo por ha = Costo Control - Costo VRA
    const ahorroInsumos = +(cCtrl - cVra).toFixed(2);

    // 2. Delta de Rendimiento = Rendimiento VRA - Rendimiento Control
    const deltaRend = +(rVra - rCtrl).toFixed(2);

    // 3. Ingreso Adicional por mayor rendimiento
    const ingresoAdicional = +(deltaRend * precio).toFixed(2);

    // 4. Beneficio Económico / ROI Neto Total por Hectárea
    const roiNeto = +(ahorroInsumos + ingresoAdicional).toFixed(2);

    const [resIns] = await db.query(`
      INSERT INTO rendimiento_strip_trials_roi
      (id_tenant, id_finca, id_lote, codigo_ensayo, nombre, tratamiento_control, tratamiento_vra,
       costo_insumo_control_ha, costo_insumo_vra_ha, rendimiento_control_ton_ha, rendimiento_vra_ton_ha,
       precio_venta_tonelada, ahorro_insumos_ha, ingreso_adicional_ha, roi_neto_ha,
       fecha_evaluacion, evaluador, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tenantId, id_finca, id_lote, codigo_ensayo, nombre, tratamiento_control, tratamiento_vra,
      cCtrl, cVra, rCtrl, rVra, precio, ahorroInsumos, ingresoAdicional, roiNeto,
      fecha_evaluacion, evaluador, observaciones || null
    ]);

    await logAudit(db, {
      id_tenant: tenantId,
      modulo: 'Evaluación ROI Rendimiento',
      accion: 'REGISTRAR_STRIP_TRIAL',
      registro_id: resIns.insertId,
      usuario: req.user?.username || evaluador,
      detalle: `Strip Trial "${codigo_ensayo}": ROI Neto = $${roiNeto}/ha (Ahorro insumos: $${ahorroInsumos}, Ingreso adicional: $${ingresoAdicional})`
    });

    res.status(201).json({
      success: true,
      id_ensayo: resIns.insertId,
      ahorro_insumos_ha: ahorroInsumos,
      ingreso_adicional_ha: ingresoAdicional,
      roi_neto_ha: roiNeto,
      message: 'Strip trial y retorno ROI guardado exitosamente en base de datos.'
    });
  } catch (err) {
    console.error('Error guardando strip trial:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
