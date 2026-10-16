import express from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';
import { logAudit } from '../utils/audit.js';

const router = express.Router();

// ==============================================================================
// 1. SECTORES HÍDRICOS (CRUD)
// ==============================================================================

// GET /api/riego-precision/sectores
router.get('/sectores', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.query.tenantId || 1;
  const { fincaId, loteId } = req.query;

  try {
    let sql = `
      SELECT s.*, f.nombre as finca_nombre, l.nombre as lote_nombre,
             (SELECT COUNT(*) FROM riego_programacion_precision WHERE id_sector = s.id_sector) as total_riegos_programados,
             (SELECT fecha_programada FROM riego_programacion_precision WHERE id_sector = s.id_sector AND estado = 'Ejecutado' ORDER BY fecha_programada DESC LIMIT 1) as ultimo_riego_fecha,
             (SELECT coeficiente_christiansen_cu FROM riego_evaluacion_uniformidad WHERE id_sector = s.id_sector ORDER BY fecha_ensayo DESC LIMIT 1) as ultimo_cu
      FROM riego_sectores_hidricos s
      JOIN fincas f ON s.id_finca = f.id_finca
      JOIN lotes l ON s.id_lote = l.id_lote
      WHERE s.id_tenant = ?
    `;
    const params = [tenantId];

    if (fincaId) {
      sql += ' AND s.id_finca = ?';
      params.push(fincaId);
    }
    if (loteId) {
      sql += ' AND s.id_lote = ?';
      params.push(loteId);
    }

    sql += ' ORDER BY s.nombre ASC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error listando sectores hídricos:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/riego-precision/sectores
router.post('/sectores', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.body.id_tenant || 1;
  const {
    id_finca,
    id_lote,
    codigo_sector,
    nombre,
    metodo_riego = 'Goteo',
    caudal_diseno_lps = 0,
    presion_trabajo_bar = 2.0,
    espaciamiento_emisores_m = 0.5,
    espaciamiento_lineas_m = 1.5,
    caudal_emisor_lph = 2.0,
    eficiencia_aplicacion_ea_porc = 90.0,
    area_sector_ha = 1.0,
    estado = 'Operativo'
  } = req.body;

  if (!id_finca || !id_lote || !codigo_sector || !nombre) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para registrar el sector.' });
  }

  try {
    // Unicidad
    const [dup] = await db.query(
      'SELECT id_sector FROM riego_sectores_hidricos WHERE id_tenant = ? AND codigo_sector = ?',
      [tenantId, codigo_sector]
    );
    if (dup.length > 0) {
      return res.status(409).json({ error: `El código de sector "${codigo_sector}" ya existe.` });
    }

    // Calcular Precipitación del Sistema (Pr en mm/h)
    // Pr (mm/h) = Caudal Emisor (L/h) / (Espaciamiento Emisores (m) * Espaciamiento Líneas (m))
    const espEmisores = parseFloat(espaciamiento_emisores_m) || 0.5;
    const espLineas = parseFloat(espaciamiento_lineas_m) || 1.5;
    const caudalEmisor = parseFloat(caudal_emisor_lph) || 2.0;
    const precipitacionMmH = +(caudalEmisor / (espEmisores * espLineas)).toFixed(2);

    const [resIns] = await db.query(`
      INSERT INTO riego_sectores_hidricos
      (id_tenant, id_finca, id_lote, codigo_sector, nombre, metodo_riego,
       caudal_diseno_lps, presion_trabajo_bar, espaciamiento_emisores_m, espaciamiento_lineas_m,
       caudal_emisor_lph, eficiencia_aplicacion_ea_porc, precipitacion_sistema_mm_h, area_sector_ha, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tenantId, id_finca, id_lote, codigo_sector, nombre, metodo_riego,
      caudal_diseno_lps, presion_trabajo_bar, espEmisores, espLineas,
      caudalEmisor, eficiencia_aplicacion_ea_porc, precipitacionMmH, area_sector_ha, estado
    ]);

    await logAudit(db, {
      id_tenant: tenantId,
      modulo: 'Riego de Precisión',
      accion: 'REGISTRAR_SECTOR',
      registro_id: resIns.insertId,
      usuario: req.user?.username || 'Usuario',
      detalle: `Sector hídrico "${codigo_sector}" (${nombre}, ${metodo_riego}, Pr: ${precipitacionMmH} mm/h) registrado en BD.`
    });

    res.status(201).json({
      success: true,
      id_sector: resIns.insertId,
      precipitacion_sistema_mm_h: precipitacionMmH,
      message: 'Sector hídrico registrado exitosamente en la base de datos.'
    });
  } catch (err) {
    console.error('Error registrando sector hídrico:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/riego-precision/sectores/:id
router.delete('/sectores/:id', async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;
  try {
    await db.query('DELETE FROM riego_sectores_hidricos WHERE id_sector = ?', [id]);
    await logAudit(db, {
      id_tenant: req.user?.id_tenant || 1,
      modulo: 'Riego de Precisión',
      accion: 'ELIMINAR_SECTOR',
      registro_id: id,
      usuario: req.user?.username || 'Usuario',
      detalle: `Sector hídrico ID ${id} eliminado.`
    });
    res.json({ success: true, message: 'Sector hídrico eliminado correctamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 2. CALCULADORA & PROGRAMACIÓN DE RIEGO FAO-56
// ==============================================================================

// POST /api/riego-precision/calcular-fao56
router.post('/calcular-fao56', (req, res) => {
  const {
    et0 = 4.5,
    kc = 1.0,
    precipitacion_efectiva = 0.0,
    eficiencia_riego_ea = 90.0,
    precipitacion_sistema_mm_h = 2.67,
    area_sector_ha = 1.0
  } = req.body;

  const et0Val = parseFloat(et0) || 0;
  const kcVal = parseFloat(kc) || 1.0;
  const peVal = parseFloat(precipitacion_efectiva) || 0;
  const eaVal = (parseFloat(eficiencia_riego_ea) || 90) / 100;
  const prVal = parseFloat(precipitacion_sistema_mm_h) || 2.67;
  const areaVal = parseFloat(area_sector_ha) || 1.0;

  // 1. Evapotranspiración del Cultivo (ETc = ET0 * Kc)
  const etc = +(et0Val * kcVal).toFixed(2);

  // 2. Lámina Neta a reponer (Ln = ETc - Pe)
  const laminaNeta = +Math.max(0, etc - peVal).toFixed(2);

  // 3. Lámina Bruta (Lb = Ln / Ea)
  const laminaBruta = +(eaVal > 0 ? laminaNeta / eaVal : laminaNeta).toFixed(2);

  // 4. Horas de Riego necesarias (t = Lb / Pr)
  const horasRiego = +(prVal > 0 ? laminaBruta / prVal : 0).toFixed(2);

  // 5. Volumen total en m3 (1 mm en 1 ha = 10 m3)
  const volumenM3 = +(laminaBruta * 10 * areaVal).toFixed(2);

  res.json({
    et0: et0Val,
    kc: kcVal,
    etc,
    precipitacion_efectiva: peVal,
    lamina_neta_mm: laminaNeta,
    lamina_bruta_mm: laminaBruta,
    horas_riego: horasRiego,
    volumen_total_m3: volumenM3
  });
});

// GET /api/riego-precision/programaciones
router.get('/programaciones', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.query.tenantId || 1;
  const { sectorId, fecha } = req.query;

  try {
    let sql = `
      SELECT p.*, s.nombre as sector_nombre, s.codigo_sector, s.metodo_riego,
             s.area_sector_ha, f.nombre as finca_nombre, l.nombre as lote_nombre
      FROM riego_programacion_precision p
      JOIN riego_sectores_hidricos s ON p.id_sector = s.id_sector
      JOIN fincas f ON s.id_finca = f.id_finca
      JOIN lotes l ON s.id_lote = l.id_lote
      WHERE p.id_tenant = ?
    `;
    const params = [tenantId];

    if (sectorId) {
      sql += ' AND p.id_sector = ?';
      params.push(sectorId);
    }
    if (fecha) {
      sql += ' AND p.fecha_programada = ?';
      params.push(fecha);
    }

    sql += ' ORDER BY p.fecha_programada DESC, p.creado_el DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error listando programaciones de riego:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/riego-precision/programaciones (Guarda el riego real en BD)
router.post('/programaciones', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.body.id_tenant || 1;
  const {
    id_sector,
    fecha_programada,
    et0_mm_dia,
    kc_cultivo,
    etc_mm_dia,
    precipitacion_efectiva_mm = 0,
    agotamiento_permitido_p = 0.50,
    lamina_neta_mm,
    lamina_bruta_mm,
    horas_riego_calculadas,
    volumen_total_m3,
    observaciones
  } = req.body;

  if (!id_sector || !fecha_programada || !horas_riego_calculadas) {
    return res.status(400).json({ error: 'Faltan parámetros indispensables para agendar la programación de riego.' });
  }

  try {
    const [resIns] = await db.query(`
      INSERT INTO riego_programacion_precision
      (id_tenant, id_sector, fecha_programada, et0_mm_dia, kc_cultivo, etc_mm_dia,
       precipitacion_efectiva_mm, agotamiento_permitido_p, lamina_neta_mm, lamina_bruta_mm,
       horas_riego_calculadas, volumen_total_m3, estado, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Programado', ?)
    `, [
      tenantId, id_sector, fecha_programada, et0_mm_dia, kc_cultivo, etc_mm_dia,
      precipitacion_efectiva_mm, agotamiento_permitido_p, lamina_neta_mm, lamina_bruta_mm,
      horas_riego_calculadas, volumen_total_m3, observaciones || null
    ]);

    await logAudit(db, {
      id_tenant: tenantId,
      modulo: 'Riego de Precisión',
      accion: 'PROGRAMAR_RIEGO',
      registro_id: resIns.insertId,
      usuario: req.user?.username || 'Agrónomo',
      detalle: `Riego programado para el sector ${id_sector} el ${fecha_programada} (${horas_riego_calculadas} horas, ${volumen_total_m3} m³).`
    });

    res.status(201).json({
      success: true,
      id_programacion: resIns.insertId,
      message: 'Programación de riego registrada exitosamente en base de datos.'
    });
  } catch (err) {
    console.error('Error guardando programación de riego:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/riego-precision/programaciones/:id/estado (Actualizar ejecución del riego)
router.put('/programaciones/:id/estado', async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;
  const { estado, ejecutado_por, observaciones } = req.body;

  try {
    const fechaEjecucion = estado === 'Ejecutado' ? new Date() : null;
    await db.query(`
      UPDATE riego_programacion_precision
      SET estado = ?,
          ejecutado_por = COALESCE(?, ejecutado_por),
          fecha_ejecucion = COALESCE(?, fecha_ejecucion),
          observaciones = COALESCE(?, observaciones)
      WHERE id_programacion = ?
    `, [estado, ejecutado_por, fechaEjecucion, observaciones, id]);

    await logAudit(db, {
      id_tenant: req.user?.id_tenant || 1,
      modulo: 'Riego de Precisión',
      accion: 'CAMBIAR_ESTADO_RIEGO',
      registro_id: id,
      usuario: req.user?.username || 'Operario',
      detalle: `Riego ID ${id} cambiado a estado "${estado}" (Responsable: ${ejecutado_por || 'N/A'})`
    });

    res.json({ success: true, message: `Riego marcado como ${estado}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 3. EVALUACIONES DE UNIFORMIDAD DE RIEGO (CHRISTIANSEN CU & DU)
// ==============================================================================

// GET /api/riego-precision/evaluaciones/:id_sector
router.get('/evaluaciones/:id_sector', async (req, res) => {
  const db = getDb(req);
  const { id_sector } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT * FROM riego_evaluacion_uniformidad WHERE id_sector = ? ORDER BY fecha_ensayo DESC',
      [id_sector]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/riego-precision/evaluaciones
router.post('/evaluaciones', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.body.id_tenant || 1;
  const {
    id_sector,
    fecha_ensayo,
    presion_cabezal_bar,
    presion_cola_bar,
    lecturas_volumen_ml, // Array de volúmenes en ml
    evaluador,
    observaciones
  } = req.body;

  if (!id_sector || !fecha_ensayo || !Array.isArray(lecturas_volumen_ml) || lecturas_volumen_ml.length < 4 || !evaluador) {
    return res.status(400).json({ error: 'Se requiere al menos 4 lecturas de pluviómetros y datos completos del ensayo.' });
  }

  try {
    const n = lecturas_volumen_ml.length;
    const nums = lecturas_volumen_ml.map(Number);
    const suma = nums.reduce((acc, v) => acc + v, 0);
    const media = suma / n;

    // Desviaciones absolutas
    const sumaDesv = nums.reduce((acc, v) => acc + Math.abs(v - media), 0);

    // Coeficiente de Christiansen CU (%) = 100 * (1 - sum(|Xi - media|) / (n * media))
    const cu = +(100 * (1 - (sumaDesv / (n * media)))).toFixed(2);

    // Uniformidad de Distribución DU (%) = 100 * (Media del 25% inferior / Media General)
    const ordenados = [...nums].sort((a, b) => a - b);
    const count25 = Math.max(1, Math.round(n * 0.25));
    const cuartilInferior = ordenados.slice(0, count25);
    const mediaCuartilInferior = cuartilInferior.reduce((acc, v) => acc + v, 0) / count25;
    const du = +(100 * (mediaCuartilInferior / media)).toFixed(2);

    // Diagnóstico agronómico automático
    let diagnostico = '';
    if (cu >= 90) {
      diagnostico = 'Excelente Uniformidad (Distribución Óptima)';
    } else if (cu >= 80) {
      diagnostico = 'Buena Uniformidad (Aceptable para producción comercial)';
    } else if (cu >= 70) {
      diagnostico = 'Regular (Revisar emboquillado, presión y filtración)';
    } else {
      diagnostico = 'Deficiente / Crítica (Pérdidas severas y desuniformidad radicular)';
    }

    const [resIns] = await db.query(`
      INSERT INTO riego_evaluacion_uniformidad
      (id_tenant, id_sector, fecha_ensayo, presion_cabezal_bar, presion_cola_bar,
       numero_pluviometros, lecturas_volumen_ml, coeficiente_christiansen_cu,
       uniformidad_distribucion_du, diagnostico, evaluador, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tenantId, id_sector, fecha_ensayo, presion_cabezal_bar || null, presion_cola_bar || null,
      n, JSON.stringify(nums), cu, du, diagnostico, evaluador, observaciones || null
    ]);

    await logAudit(db, {
      id_tenant: tenantId,
      modulo: 'Riego de Precisión',
      accion: 'EVALUAR_UNIFORMIDAD',
      registro_id: resIns.insertId,
      usuario: req.user?.username || evaluador,
      detalle: `Ensayo Christiansen en sector ${id_sector}: CU = ${cu}%, DU = ${du}% (${diagnostico})`
    });

    res.status(201).json({
      success: true,
      id_evaluacion: resIns.insertId,
      coeficiente_christiansen_cu: cu,
      uniformidad_distribucion_du: du,
      diagnostico,
      message: 'Evaluación de uniformidad guardada exitosamente en BD.'
    });
  } catch (err) {
    console.error('Error calculando uniformidad:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 4. EQUIPOS DE BOMBEO (CRUD & TELECONTROL)
// ==============================================================================

// GET /api/riego-precision/bombas
router.get('/bombas', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.query.tenantId || 1;
  const { fincaId } = req.query;

  try {
    let sql = `
      SELECT b.*, f.nombre as finca_nombre
      FROM riego_equipos_bombeo b
      JOIN fincas f ON b.id_finca = f.id_finca
      WHERE b.id_tenant = ?
    `;
    const params = [tenantId];
    if (fincaId) {
      sql += ' AND b.id_finca = ?';
      params.push(fincaId);
    }
    sql += ' ORDER BY b.nombre ASC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error listando bombas:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/riego-precision/bombas
router.post('/bombas', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.body.id_tenant || 1;
  const {
    id_finca,
    codigo_bomba,
    nombre,
    tipo_bomba = 'Centrifuga_Superficie',
    potencia_hp = 10,
    caudal_nominal_lps = 15,
    presion_nominal_bar = 4.0,
    fuente_energia = 'Red_Electrica',
    estado_operativo = 'Apagada',
    fecha_instalacion,
    ultimo_mantenimiento,
    telemetria_iot_id,
    notas
  } = req.body;

  if (!id_finca || !codigo_bomba || !nombre) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para registrar la bomba.' });
  }

  try {
    const [dup] = await db.query(
      'SELECT id_bomba FROM riego_equipos_bombeo WHERE id_tenant = ? AND codigo_bomba = ?',
      [tenantId, codigo_bomba]
    );
    if (dup.length > 0) {
      return res.status(409).json({ error: `La bomba con código "${codigo_bomba}" ya existe.` });
    }

    const [resIns] = await db.query(`
      INSERT INTO riego_equipos_bombeo
      (id_tenant, id_finca, codigo_bomba, nombre, tipo_bomba, potencia_hp, caudal_nominal_lps,
       presion_nominal_bar, fuente_energia, estado_operativo, fecha_instalacion, ultimo_mantenimiento,
       telemetria_iot_id, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tenantId, id_finca, codigo_bomba, nombre, tipo_bomba, potencia_hp, caudal_nominal_lps,
      presion_nominal_bar, fuente_energia, estado_operativo, fecha_instalacion || null,
      ultimo_mantenimiento || null, telemetria_iot_id || null, notas || null
    ]);

    await logAudit(db, {
      id_tenant: tenantId,
      modulo: 'Riego Automatizado',
      accion: 'CREAR_BOMBA',
      registro_id: resIns.insertId,
      usuario: req.user?.username || 'Sistema',
      detalle: `Bomba creada: ${nombre} (${codigo_bomba}) - ${potencia_hp} HP`
    });

    res.status(201).json({ id_bomba: resIns.insertId, message: 'Bomba registrada exitosamente.' });
  } catch (err) {
    console.error('Error creando bomba:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/riego-precision/bombas/:id/toggle (Encender / Apagar)
router.post('/bombas/:id/toggle', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.body.id_tenant || 1;
  const { id } = req.params;
  const { nuevo_estado, operado_por } = req.body;

  if (!nuevo_estado) {
    return res.status(400).json({ error: 'Se requiere nuevo_estado (En_Marcha / Apagada).' });
  }

  try {
    const [bomba] = await db.query(
      'SELECT * FROM riego_equipos_bombeo WHERE id_bomba = ? AND id_tenant = ?',
      [id, tenantId]
    );
    if (bomba.length === 0) return res.status(404).json({ error: 'Bomba no encontrada.' });

    await db.query(
      'UPDATE riego_equipos_bombeo SET estado_operativo = ? WHERE id_bomba = ? AND id_tenant = ?',
      [nuevo_estado, id, tenantId]
    );

    await logAudit(db, {
      id_tenant: tenantId,
      modulo: 'Riego Automatizado',
      accion: 'CONTROL_BOMBA',
      registro_id: id,
      usuario: req.user?.username || operado_por || 'Operario',
      detalle: `Cambio de estado en bomba "${bomba[0].nombre}": ${bomba[0].estado_operativo} -> ${nuevo_estado}`
    });

    res.json({ success: true, estado_operativo: nuevo_estado, message: `Bomba ${nuevo_estado.replace('_', ' ')}.` });
  } catch (err) {
    console.error('Error alternando bomba:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 5. VÁLVULAS SOLENOIDES (CRUD & TELECONTROL)
// ==============================================================================

// GET /api/riego-precision/valvulas
router.get('/valvulas', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.query.tenantId || 1;
  const { sectorId } = req.query;

  try {
    let sql = `
      SELECT v.*, s.nombre as sector_nombre, s.codigo_sector, f.nombre as finca_nombre, l.nombre as lote_nombre
      FROM riego_valvulas_solenoides v
      JOIN riego_sectores_hidricos s ON v.id_sector = s.id_sector
      JOIN fincas f ON s.id_finca = f.id_finca
      JOIN lotes l ON s.id_lote = l.id_lote
      WHERE v.id_tenant = ?
    `;
    const params = [tenantId];
    if (sectorId) {
      sql += ' AND v.id_sector = ?';
      params.push(sectorId);
    }
    sql += ' ORDER BY v.nombre ASC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error listando válvulas:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/riego-precision/valvulas
router.post('/valvulas', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.body.id_tenant || 1;
  const {
    id_sector,
    codigo_valvula,
    nombre,
    tipo_actuador = 'Solenoide_24VAC',
    diametro_pulgadas = 2.0,
    modo_control = 'Manual_Campo',
    estado_actual = 'Cerrada'
  } = req.body;

  if (!id_sector || !codigo_valvula || !nombre) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para registrar la válvula.' });
  }

  try {
    const [dup] = await db.query(
      'SELECT id_valvula FROM riego_valvulas_solenoides WHERE id_tenant = ? AND codigo_valvula = ?',
      [tenantId, codigo_valvula]
    );
    if (dup.length > 0) {
      return res.status(409).json({ error: `La válvula con código "${codigo_valvula}" ya existe.` });
    }

    const [resIns] = await db.query(`
      INSERT INTO riego_valvulas_solenoides
      (id_tenant, id_sector, codigo_valvula, nombre, tipo_actuador, diametro_pulgadas, modo_control, estado_actual)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [tenantId, id_sector, codigo_valvula, nombre, tipo_actuador, diametro_pulgadas, modo_control, estado_actual]);

    await logAudit(db, {
      id_tenant: tenantId,
      modulo: 'Riego Automatizado',
      accion: 'CREAR_VALVULA',
      registro_id: resIns.insertId,
      usuario: req.user?.username || 'Sistema',
      detalle: `Válvula solenoide creada: ${nombre} (${codigo_valvula})`
    });

    res.status(201).json({ id_valvula: resIns.insertId, message: 'Válvula registrada exitosamente.' });
  } catch (err) {
    console.error('Error creando válvula:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/riego-precision/valvulas/:id/toggle (Abrir / Cerrar)
router.post('/valvulas/:id/toggle', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.body.id_tenant || 1;
  const { id } = req.params;
  const { nuevo_estado, operado_por } = req.body;

  if (!nuevo_estado) {
    return res.status(400).json({ error: 'Se requiere nuevo_estado (Abierta / Cerrada).' });
  }

  try {
    const [valv] = await db.query(
      'SELECT * FROM riego_valvulas_solenoides WHERE id_valvula = ? AND id_tenant = ?',
      [id, tenantId]
    );
    if (valv.length === 0) return res.status(404).json({ error: 'Válvula no encontrada.' });

    const apertura = nuevo_estado === 'Abierta' ? 100.0 : 0.0;
    const nowField = nuevo_estado === 'Abierta' ? 'ultima_apertura' : 'ultimo_cierre';

    await db.query(`
      UPDATE riego_valvulas_solenoides
      SET estado_actual = ?, apertura_actual_porc = ?, ${nowField} = NOW(), operada_por = ?
      WHERE id_valvula = ? AND id_tenant = ?
    `, [nuevo_estado, apertura, operado_por || req.user?.username || 'Operario', id, tenantId]);

    await logAudit(db, {
      id_tenant: tenantId,
      modulo: 'Riego Automatizado',
      accion: 'CONTROL_VALVULA',
      registro_id: id,
      usuario: req.user?.username || operado_por || 'Operario',
      detalle: `Válvula "${valv[0].nombre}" cambio a ${nuevo_estado} por ${operado_por || 'Operario'}`
    });

    res.json({ success: true, estado_actual: nuevo_estado, message: `Válvula ${nuevo_estado}.` });
  } catch (err) {
    console.error('Error alternando válvula:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 6. TURNOS DE CAMPO (MODO CAMPESINO & ÓRDENES DE TRABAJO WHATSAPP)
// ==============================================================================

// GET /api/riego-precision/turnos
router.get('/turnos', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.query.tenantId || 1;
  const { fincaId, fecha, estado } = req.query;

  try {
    let sql = `
      SELECT t.*, f.nombre as finca_nombre, l.nombre as lote_nombre, s.nombre as sector_nombre, s.metodo_riego
      FROM riego_turnos_campo t
      JOIN fincas f ON t.id_finca = f.id_finca
      JOIN lotes l ON t.id_lote = l.id_lote
      JOIN riego_sectores_hidricos s ON t.id_sector = s.id_sector
      WHERE t.id_tenant = ?
    `;
    const params = [tenantId];
    if (fincaId) {
      sql += ' AND t.id_finca = ?';
      params.push(fincaId);
    }
    if (fecha) {
      sql += ' AND t.fecha_riego = ?';
      params.push(fecha);
    }
    if (estado) {
      sql += ' AND t.estado = ?';
      params.push(estado);
    }
    sql += ' ORDER BY t.fecha_riego DESC, t.hora_inicio_programada ASC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error listando turnos:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/riego-precision/turnos
router.post('/turnos', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.body.id_tenant || 1;
  const {
    id_finca,
    id_lote,
    id_sector,
    codigo_turno,
    responsable_nombre,
    responsable_telefono,
    fecha_riego,
    hora_inicio_programada,
    hora_fin_programada,
    duracion_minutos_estimada = 60,
    volumen_objetivo_m3 = 0,
    observaciones
  } = req.body;

  if (!id_finca || !id_lote || !id_sector || !codigo_turno || !responsable_nombre || !fecha_riego) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para programar el turno.' });
  }

  try {
    const [dup] = await db.query(
      'SELECT id_turno FROM riego_turnos_campo WHERE id_tenant = ? AND codigo_turno = ?',
      [tenantId, codigo_turno]
    );
    if (dup.length > 0) {
      return res.status(409).json({ error: `El turno con código "${codigo_turno}" ya existe.` });
    }

    const [resIns] = await db.query(`
      INSERT INTO riego_turnos_campo
      (id_tenant, id_finca, id_lote, id_sector, codigo_turno, responsable_nombre, responsable_telefono,
       fecha_riego, hora_inicio_programada, hora_fin_programada, duracion_minutos_estimada,
       volumen_objetivo_m3, estado, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?)
    `, [
      tenantId, id_finca, id_lote, id_sector, codigo_turno, responsable_nombre, responsable_telefono || null,
      fecha_riego, hora_inicio_programada || '06:00:00', hora_fin_programada || '08:00:00',
      duracion_minutos_estimada, volumen_objetivo_m3, observaciones || null
    ]);

    await logAudit(db, {
      id_tenant: tenantId,
      modulo: 'Riego Automatizado',
      accion: 'CREAR_TURNO_CAMPO',
      registro_id: resIns.insertId,
      usuario: req.user?.username || 'Sistema',
      detalle: `Turno ${codigo_turno} asignado a ${responsable_nombre} en sector ${id_sector}`
    });

    res.status(201).json({ id_turno: resIns.insertId, message: 'Turno de riego programado exitosamente.' });
  } catch (err) {
    console.error('Error creando turno:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/riego-precision/turnos/:id/accion (Iniciar, Completar, Cancelar)
router.post('/turnos/:id/accion', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.body.id_tenant || 1;
  const { id } = req.params;
  const { accion, confirmado_por, volumen_real_m3, observaciones } = req.body;

  try {
    const [turno] = await db.query(
      'SELECT * FROM riego_turnos_campo WHERE id_turno = ? AND id_tenant = ?',
      [id, tenantId]
    );
    if (turno.length === 0) return res.status(404).json({ error: 'Turno no encontrado.' });

    let nuevoEstado = turno[0].estado;
    let sqlUpdate = '';
    const paramsUpdate = [];

    if (accion === 'INICIAR') {
      nuevoEstado = 'En_Riego';
      sqlUpdate = 'UPDATE riego_turnos_campo SET estado = ?, hora_inicio_real = NOW(), confirmado_por = ? WHERE id_turno = ? AND id_tenant = ?';
      paramsUpdate.push(nuevoEstado, confirmado_por || 'Operario de Campo', id, tenantId);
    } else if (accion === 'COMPLETAR') {
      nuevoEstado = 'Completado';
      sqlUpdate = 'UPDATE riego_turnos_campo SET estado = ?, hora_fin_real = NOW(), volumen_real_m3 = ?, confirmado_por = ?, observaciones = COALESCE(?, observaciones) WHERE id_turno = ? AND id_tenant = ?';
      paramsUpdate.push(nuevoEstado, volumen_real_m3 || turno[0].volumen_objetivo_m3, confirmado_por || 'Operario de Campo', observaciones || null, id, tenantId);
    } else if (accion === 'CANCELAR') {
      nuevoEstado = 'Cancelado';
      sqlUpdate = 'UPDATE riego_turnos_campo SET estado = ?, observaciones = ? WHERE id_turno = ? AND id_tenant = ?';
      paramsUpdate.push(nuevoEstado, observaciones || 'Turno cancelado por usuario', id, tenantId);
    } else {
      return res.status(400).json({ error: 'Acción no válida (INICIAR, COMPLETAR, CANCELAR).' });
    }

    await db.query(sqlUpdate, paramsUpdate);

    await logAudit(db, {
      id_tenant: tenantId,
      modulo: 'Riego Modo Campesino',
      accion: `TURNO_${accion}`,
      registro_id: id,
      usuario: req.user?.username || confirmado_por || 'Operario',
      detalle: `Turno ${turno[0].codigo_turno} actualizado a ${nuevoEstado} por ${confirmado_por || 'Operario'}`
    });

    res.json({ success: true, estado: nuevoEstado, message: `Turno marcado como ${nuevoEstado}.` });
  } catch (err) {
    console.error('Error actualizando turno:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 7. FERTIRRIEGO (RECETAS & DOSIFICACIÓN)
// ==============================================================================

// GET /api/riego-precision/fertirriego
router.get('/fertirriego', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.query.tenantId || 1;
  const { sectorId } = req.query;

  try {
    let sql = `
      SELECT r.*, s.nombre as sector_nombre, s.codigo_sector
      FROM riego_fertirriego_recetas r
      JOIN riego_sectores_hidricos s ON r.id_sector = s.id_sector
      WHERE r.id_tenant = ?
    `;
    const params = [tenantId];
    if (sectorId) {
      sql += ' AND r.id_sector = ?';
      params.push(sectorId);
    }
    sql += ' ORDER BY r.nombre_receta ASC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error listando fertirriego:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/riego-precision/fertirriego
router.post('/fertirriego', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.body.id_tenant || 1;
  const {
    id_sector,
    nombre_receta,
    etapa_fenologica,
    ce_objetivo_ms_cm = 1.8,
    ph_objetivo = 5.8,
    tanque_a_formula,
    tanque_a_tasa_inyeccion_l_h = 50,
    tanque_b_formula,
    tanque_b_tasa_inyeccion_l_h = 50,
    acido_tipo = 'Acido Fosforico 85%'
  } = req.body;

  if (!id_sector || !nombre_receta) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para registrar la receta.' });
  }

  try {
    const [resIns] = await db.query(`
      INSERT INTO riego_fertirriego_recetas
      (id_tenant, id_sector, nombre_receta, etapa_fenologica, ce_objetivo_ms_cm, ph_objetivo,
       tanque_a_formula, tanque_a_tasa_inyeccion_l_h, tanque_b_formula, tanque_b_tasa_inyeccion_l_h, acido_tipo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tenantId, id_sector, nombre_receta, etapa_fenologica || null, ce_objetivo_ms_cm, ph_objetivo,
      tanque_a_formula || null, tanque_a_tasa_inyeccion_l_h, tanque_b_formula || null,
      tanque_b_tasa_inyeccion_l_h, acido_tipo
    ]);

    await logAudit(db, {
      id_tenant: tenantId,
      modulo: 'Fertirriego de Precisión',
      accion: 'CREAR_RECETA_FERTIRRIEGO',
      registro_id: resIns.insertId,
      usuario: req.user?.username || 'Agrónomo',
      detalle: `Receta creada: ${nombre_receta} (CE: ${ce_objetivo_ms_cm} mS/cm, pH: ${ph_objetivo})`
    });

    res.status(201).json({ id_receta: resIns.insertId, message: 'Receta de fertirriego guardada exitosamente.' });
  } catch (err) {
    console.error('Error creando receta de fertirriego:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 8. RESUMEN DE CAMPO MÓVIL (ALTA VELOCIDAD PARA CELULARES Y TABLETAS)
// ==============================================================================
router.get('/resumen-campo', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.query.tenantId || 1;
  const { fincaId } = req.query;

  try {
    // 1. Obtener sectores con último turno de hoy
    let sqlSectores = `
      SELECT s.id_sector, s.codigo_sector, s.nombre as sector_nombre, s.metodo_riego,
             f.id_finca, f.nombre as finca_nombre, l.id_lote, l.nombre as lote_nombre,
             (SELECT estado FROM riego_valvulas_solenoides WHERE id_sector = s.id_sector ORDER BY id_valvula ASC LIMIT 1) as estado_valvula,
             (SELECT estado FROM riego_turnos_campo WHERE id_sector = s.id_sector AND fecha_riego = CURDATE() ORDER BY id_turno DESC LIMIT 1) as estado_turno_hoy,
             (SELECT duracion_minutos_estimada FROM riego_turnos_campo WHERE id_sector = s.id_sector AND fecha_riego = CURDATE() ORDER BY id_turno DESC LIMIT 1) as minutos_riego_hoy,
             (SELECT hora_inicio_programada FROM riego_turnos_campo WHERE id_sector = s.id_sector AND fecha_riego = CURDATE() ORDER BY id_turno DESC LIMIT 1) as hora_inicio_hoy,
             (SELECT responsable_nombre FROM riego_turnos_campo WHERE id_sector = s.id_sector AND fecha_riego = CURDATE() ORDER BY id_turno DESC LIMIT 1) as regador_hoy,
             (SELECT id_turno FROM riego_turnos_campo WHERE id_sector = s.id_sector AND fecha_riego = CURDATE() ORDER BY id_turno DESC LIMIT 1) as id_turno_hoy
      FROM riego_sectores_hidricos s
      JOIN fincas f ON s.id_finca = f.id_finca
      JOIN lotes l ON s.id_lote = l.id_lote
      WHERE s.id_tenant = ?
    `;
    const params = [tenantId];
    if (fincaId) {
      sqlSectores += ' AND s.id_finca = ?';
      params.push(fincaId);
    }
    sqlSectores += ' ORDER BY s.nombre ASC';
    const [sectores] = await db.query(sqlSectores, params);

    // 2. Bombas en la finca
    let sqlBombas = 'SELECT * FROM riego_equipos_bombeo WHERE id_tenant = ?';
    const paramsB = [tenantId];
    if (fincaId) {
      sqlBombas += ' AND id_finca = ?';
      paramsB.push(fincaId);
    }
    const [bombas] = await db.query(sqlBombas, paramsB);

    res.json({
      timestamp: new Date().toISOString(),
      sectores,
      bombas,
      total_sectores: sectores.length,
      sectores_en_riego: sectores.filter(s => s.estado_turno_hoy === 'En_Riego' || s.estado_valvula === 'Abierta').length
    });
  } catch (err) {
    console.error('Error generando resumen móvil de campo:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 9. MOTOR ESTEQUIOMÉTRICO FERTIRRIEGO AGROPACCIOLI: BALANCE IÓNICO & TANQUES A Y B
// ==============================================================================

// POST /api/riego-precision/calcular-solucion-nutritiva
router.post('/calcular-solucion-nutritiva', async (req, res) => {
  try {
    const {
      objetivo_meq = {},
      agua_meq = {},
      acido_tipo = 'Acido_Fosforico_85',
      volumen_tanque_a_l = 1000,
      volumen_tanque_b_l = 1000,
      tasa_inyeccion_l_m3 = 10,
      volumen_riego_m3 = 100
    } = req.body;

    // 1. Aportes del agua
    const ca_agua = parseFloat(agua_meq.ca) || 0;
    const mg_agua = parseFloat(agua_meq.mg) || 0;
    const k_agua = parseFloat(agua_meq.k) || 0;
    const no3_agua = parseFloat(agua_meq.no3) || 0;
    const so4_agua = parseFloat(agua_meq.so4) || 0;
    const hco3_agua = parseFloat(agua_meq.hco3) || 0;
    const ce_agua = parseFloat(agua_meq.ce) || 0.4;

    // 2. Objetivos
    const ca_obj = parseFloat(objetivo_meq.ca) || 5.0;
    const mg_obj = parseFloat(objetivo_meq.mg) || 2.0;
    const k_obj = parseFloat(objetivo_meq.k) || 7.0;
    const p_obj = parseFloat(objetivo_meq.h2po4) || 1.5;
    const no3_obj = parseFloat(objetivo_meq.no3) || 12.0;
    const so4_obj = parseFloat(objetivo_meq.so4) || 2.5;
    const nh4_obj = parseFloat(objetivo_meq.nh4) || 0.8;

    // 3. Neutralización de Bicarbonatos (se deja reserva de 0.5 meq/L)
    const hco3_a_neutralizar = Math.max(0, hco3_agua - 0.5);
    let h2po4_acido = 0;
    let no3_acido = 0;
    let so4_acido = 0;
    let ml_acido_por_m3 = 0;

    if (acido_tipo === 'Acido_Fosforico_85') {
      h2po4_acido = hco3_a_neutralizar;
      // Densidad: 1.68 g/ml, pureza 85% -> 1 meq = 98 mg = 0.098 g / (1.68 * 0.85) = 0.0686 ml/L = 68.6 ml/m3
      ml_acido_por_m3 = +(hco3_a_neutralizar * 68.6).toFixed(1);
    } else if (acido_tipo === 'Acido_Nitrico_60') {
      no3_acido = hco3_a_neutralizar;
      // Densidad 1.38 g/ml, pureza 60% -> 1 meq = 63 mg / (1.38 * 0.60) = 0.076 ml/L = 76.0 ml/m3
      ml_acido_por_m3 = +(hco3_a_neutralizar * 76.0).toFixed(1);
    } else {
      so4_acido = hco3_a_neutralizar;
      // Ácido sulfúrico 98%
      ml_acido_por_m3 = +(hco3_a_neutralizar * 27.5).toFixed(1);
    }

    // 4. Necesidades netas
    const ca_neto = Math.max(0, ca_obj - ca_agua);
    const mg_neto = Math.max(0, mg_obj - mg_agua);
    const k_neto = Math.max(0, k_obj - k_agua);
    const p_neto = Math.max(0, p_obj - h2po4_acido);
    const so4_neto = Math.max(0, so4_obj - so4_agua - so4_acido);
    const no3_neto = Math.max(0, no3_obj - no3_agua - no3_acido);

    // 5. Deducción estequiométrica de sales comerciales en g/m3 (mg/L)
    // Nitrato de Calcio (15.5-0-0 + 19% Ca)
    const g_nitrato_calcio = +(ca_neto * 108.0).toFixed(1);
    const no3_de_ca = +(ca_neto * 1.08).toFixed(2);
    const nh4_de_ca = +(ca_neto * 0.09).toFixed(2);

    // Fosfato Monopotásico (MKP: 0-52-34)
    const g_mkp = +(p_neto * 136.1).toFixed(1);
    const k_de_mkp = +(p_neto * 1.0).toFixed(2);

    // Sulfato de Magnesio (16% MgO, 13% S)
    const g_sulfato_magnesio = +(mg_neto * 123.2).toFixed(1);
    const so4_de_mg = +(mg_neto * 1.0).toFixed(2);

    // Nitrato de Potasio (13-0-46)
    const k_restante = Math.max(0, k_neto - k_de_mkp);
    const no3_restante = Math.max(0, no3_neto - no3_de_ca);
    const meq_k_de_kno3 = Math.min(k_restante, no3_restante);
    const g_nitrato_potasio = +(meq_k_de_kno3 * 101.1).toFixed(1);

    // Sulfato de Potasio (0-0-50 + 18% S)
    const k_restante_final = Math.max(0, k_restante - meq_k_de_kno3);
    const g_sulfato_potasio = +(k_restante_final * 87.1).toFixed(1);

    // Hierro Quelatado EDDHA 6% (Tanque A)
    const g_quelato_hierro = 2.5;
    // Micronutrientes Mezcla Soluble (Tanque B)
    const g_micronutrientes = 1.5;

    // Factor de concentración para tanques de 1000L
    // Ej: tasa_inyeccion = 10 L/m3 -> factor = 1000 / 10 = 100
    const factorConcentracion = (volumen_tanque_a_l / tasa_inyeccion_l_m3);
    const vRiego = parseFloat(volumen_riego_m3) || 100;

    // Kilogramos por tanque de 1.000 L
    const kg_tanque_nitrato_calcio = +((g_nitrato_calcio * factorConcentracion) / 1000).toFixed(2);
    const kg_tanque_nitrato_potasio = +((g_nitrato_potasio * factorConcentracion) / 1000).toFixed(2);
    const kg_tanque_quelato_hierro = +((g_quelato_hierro * factorConcentracion) / 1000).toFixed(2);

    const kg_tanque_mkp = +((g_mkp * factorConcentracion) / 1000).toFixed(2);
    const kg_tanque_sulfato_magnesio = +((g_sulfato_magnesio * factorConcentracion) / 1000).toFixed(2);
    const kg_tanque_sulfato_potasio = +((g_sulfato_potasio * factorConcentracion) / 1000).toFixed(2);
    const kg_tanque_micros = +((g_micronutrientes * factorConcentracion) / 1000).toFixed(2);

    // Litros de ácido requeridos
    const litros_acido_por_tanque = +((ml_acido_por_m3 * factorConcentracion) / 1000).toFixed(2);
    const litros_acido_total_riego = +((ml_acido_por_m3 * vRiego) / 1000).toFixed(2);

    // Kilogramos totales para este riego específico
    const kg_totales_riego = {
      nitrato_calcio: +((g_nitrato_calcio * vRiego) / 1000).toFixed(2),
      nitrato_potasio: +((g_nitrato_potasio * vRiego) / 1000).toFixed(2),
      mkp: +((g_mkp * vRiego) / 1000).toFixed(2),
      sulfato_magnesio: +((g_sulfato_magnesio * vRiego) / 1000).toFixed(2),
      sulfato_potasio: +((g_sulfato_potasio * vRiego) / 1000).toFixed(2),
      quelato_hierro: +((g_quelato_hierro * vRiego) / 1000).toFixed(2),
      micronutrientes: +((g_micronutrientes * vRiego) / 1000).toFixed(2),
      litros_acido: litros_acido_total_riego
    };

    // CE Estimada final en mS/cm
    const sumaCationes = ca_obj + mg_obj + k_obj + nh4_obj;
    const ce_estimada = +((sumaCationes / 10) + (ce_agua * 0.15)).toFixed(2);
    const ph_estimado = 5.8;

    // 6. Generar Instrucción Simple para el Campesino / Bodeguero
    const instruccionesCampesino = {
      tanque_a: `💧 TANQUE A (Calcio & Nitratos):\n• Pesar y diluir ${kg_tanque_nitrato_calcio} kg de Nitrato de Calcio\n• Pesar y diluir ${kg_tanque_nitrato_potasio} kg de Nitrato de Potasio\n• Agregar ${kg_tanque_quelato_hierro} kg de Quelato de Hierro\n• Llenar con agua limpia hasta ${volumen_tanque_a_l} Litros y revolver bien.`,
      tanque_b: `🌿 TANQUE B (Fósforo, Magnesio & Sulfatos):\n• Pesar y diluir ${kg_tanque_mkp} kg de Fosfato Monopotásico (MKP)\n• Pesar y diluir ${kg_tanque_sulfato_magnesio} kg de Sulfato de Magnesio\n• Pesar y diluir ${kg_tanque_sulfato_potasio} kg de Sulfato de Potasio\n• Agregar ${kg_tanque_micros} kg de Micronutrientes\n• Llenar con agua limpia hasta ${volumen_tanque_b_l} Litros y revolver bien.`,
      acido: `⚠️ MANEJO DE ÁCIDO:\n• Dosificar ${litros_acido_por_tanque} Litros de ${acido_tipo.replace(/_/g, ' ')} para mantener pH en 5.8.`
    };

    res.json({
      success: true,
      ce_estimada_ms_cm: ce_estimada,
      ph_estimado: ph_estimado,
      sales_g_m3: {
        nitrato_calcio: g_nitrato_calcio,
        nitrato_potasio: g_nitrato_potasio,
        mkp: g_mkp,
        sulfato_magnesio: g_sulfato_magnesio,
        sulfato_potasio: g_sulfato_potasio,
        quelato_hierro: g_quelato_hierro,
        micronutrientes: g_micronutrientes
      },
      tanque_a_1000L: {
        nitrato_calcio_kg: kg_tanque_nitrato_calcio,
        nitrato_potasio_kg: kg_tanque_nitrato_potasio,
        quelato_hierro_kg: kg_tanque_quelato_hierro,
        volumen_l: volumen_tanque_a_l
      },
      tanque_b_1000L: {
        mkp_kg: kg_tanque_mkp,
        sulfato_magnesio_kg: kg_tanque_sulfato_magnesio,
        sulfato_potasio_kg: kg_tanque_sulfato_potasio,
        micronutrientes_kg: kg_tanque_micros,
        volumen_l: volumen_tanque_b_l
      },
      totales_riego_actual: kg_totales_riego,
      instrucciones_campesino: instruccionesCampesino
    });
  } catch (err) {
    console.error('Error calculando solución nutritiva:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/riego-precision/guardar-solucion-nutritiva
router.post('/guardar-solucion-nutritiva', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.body.id_tenant || 1;
  const {
    id_finca,
    id_sector,
    nombre_programa,
    cultivo_nombre,
    fase_fenologica,
    volumen_riego_m3 = 100,
    volumen_tanque_a_l = 1000,
    volumen_tanque_b_l = 1000,
    tasa_inyeccion_l_m3 = 10,
    ce_estimada_ms_cm,
    ph_estimado,
    requerimientos_meq,
    agua_aporte_meq,
    fertilizantes_calculados,
    tanque_a_instrucciones,
    tanque_b_instrucciones,
    acido_instrucciones
  } = req.body;

  if (!id_finca || !id_sector || !nombre_programa || !cultivo_nombre) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para guardar la solución nutritiva.' });
  }

  try {
    const [resIns] = await db.query(`
      INSERT INTO riego_soluciones_nutritivas_calculos
      (id_tenant, id_finca, id_sector, nombre_programa, cultivo_nombre, fase_fenologica,
       volumen_riego_m3, volumen_tanque_a_l, volumen_tanque_b_l, tasa_inyeccion_l_m3,
       ce_estimada_ms_cm, ph_estimado, requerimientos_meq_json, agua_aporte_meq_json,
       fertilizantes_calculados_json, tanque_a_instrucciones, tanque_b_instrucciones, acido_instrucciones, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tenantId, id_finca, id_sector, nombre_programa, cultivo_nombre, fase_fenologica || null,
      volumen_riego_m3, volumen_tanque_a_l, volumen_tanque_b_l, tasa_inyeccion_l_m3,
      ce_estimada_ms_cm, ph_estimado,
      JSON.stringify(requerimientos_meq || {}),
      JSON.stringify(agua_aporte_meq || {}),
      JSON.stringify(fertilizantes_calculados || {}),
      tanque_a_instrucciones, tanque_b_instrucciones, acido_instrucciones,
      req.user?.username || 'Agrónomo Especialista'
    ]);

    await logAudit(db, {
      id_tenant: tenantId,
      modulo: 'Fertirriego AgroPaccioli',
      accion: 'GUARDAR_SOLUCION_NUTRITIVA',
      registro_id: resIns.insertId,
      usuario: req.user?.username || 'Agrónomo',
      detalle: `Solución nutritiva guardada: "${nombre_programa}" para ${cultivo_nombre} (CE: ${ce_estimada_ms_cm} mS/cm)`
    });

    res.status(201).json({
      success: true,
      id_solucion: resIns.insertId,
      message: 'Solución nutritiva estequiométrica guardada exitosamente en BD.'
    });
  } catch (err) {
    console.error('Error guardando solución nutritiva:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/riego-precision/soluciones-nutritivas
router.get('/soluciones-nutritivas', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.query.tenantId || 1;
  const { fincaId, sectorId } = req.query;

  try {
    let sql = `
      SELECT s.*, f.nombre as finca_nombre, sec.nombre as sector_nombre, sec.codigo_sector
      FROM riego_soluciones_nutritivas_calculos s
      JOIN fincas f ON s.id_finca = f.id_finca
      JOIN riego_sectores_hidricos sec ON s.id_sector = sec.id_sector
      WHERE s.id_tenant = ?
    `;
    const params = [tenantId];
    if (fincaId) {
      sql += ' AND s.id_finca = ?';
      params.push(fincaId);
    }
    if (sectorId) {
      sql += ' AND s.id_sector = ?';
      params.push(sectorId);
    }
    sql += ' ORDER BY s.creado_el DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error listando soluciones nutritivas:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
