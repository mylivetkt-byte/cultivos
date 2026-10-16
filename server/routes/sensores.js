import express from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';
import { logAudit } from '../utils/audit.js';

const router = express.Router();

// ==============================================================================
// 1. DISPOSITIVOS / SONDAS IOT (CRUD)
// ==============================================================================

// GET /api/sensores/dispositivos
router.get('/dispositivos', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.query.tenantId || 1;
  const { fincaId, loteId, tipo } = req.query;

  try {
    let sql = `
      SELECT s.*, f.nombre as finca_nombre, l.nombre as lote_nombre,
             (SELECT fecha_hora FROM sensores_telemetria_lecturas WHERE id_sensor = s.id_sensor ORDER BY fecha_hora DESC LIMIT 1) as ultima_lectura_fecha,
             (SELECT humedad_10cm FROM sensores_telemetria_lecturas WHERE id_sensor = s.id_sensor ORDER BY fecha_hora DESC LIMIT 1) as ultima_humedad_10cm,
             (SELECT humedad_30cm FROM sensores_telemetria_lecturas WHERE id_sensor = s.id_sensor ORDER BY fecha_hora DESC LIMIT 1) as ultima_humedad_30cm,
             (SELECT humedad_60cm FROM sensores_telemetria_lecturas WHERE id_sensor = s.id_sensor ORDER BY fecha_hora DESC LIMIT 1) as ultima_humedad_60cm,
             (SELECT temperatura_suelo_c FROM sensores_telemetria_lecturas WHERE id_sensor = s.id_sensor ORDER BY fecha_hora DESC LIMIT 1) as ultima_temp_suelo,
             (SELECT conductividad_electrica_ds_m FROM sensores_telemetria_lecturas WHERE id_sensor = s.id_sensor ORDER BY fecha_hora DESC LIMIT 1) as ultima_ce
      FROM sensores_dispositivos s
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
    if (tipo) {
      sql += ' AND s.tipo_sensor = ?';
      params.push(tipo);
    }

    sql += ' ORDER BY s.nombre ASC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error listando sensores:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sensores/dispositivos
router.post('/dispositivos', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.body.id_tenant || 1;
  const {
    id_finca,
    id_lote,
    codigo_sensor,
    nombre,
    tipo_sensor = 'Humedad_Multinivel',
    marca_modelo,
    numero_serie,
    latitud,
    longitud,
    profundidades_cm = '10,30,60',
    umbral_estres_humedad = 18.00,
    umbral_saturacion_humedad = 38.00,
    umbral_max_ce_ds_m = 2.00,
    estado = 'Activo',
    fecha_instalacion
  } = req.body;

  if (!id_finca || !id_lote || !codigo_sensor || !nombre || !latitud || !longitud || !fecha_instalacion) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para registrar el sensor.' });
  }

  try {
    // Unicidad por tenant
    const [dup] = await db.query(
      'SELECT id_sensor FROM sensores_dispositivos WHERE id_tenant = ? AND codigo_sensor = ?',
      [tenantId, codigo_sensor]
    );
    if (dup.length > 0) {
      return res.status(409).json({ error: `El código de sensor "${codigo_sensor}" ya existe.` });
    }

    const [resInsert] = await db.query(`
      INSERT INTO sensores_dispositivos
      (id_tenant, id_finca, id_lote, codigo_sensor, nombre, tipo_sensor, marca_modelo, numero_serie,
       latitud, longitud, geometria_punto, profundidades_cm, umbral_estres_humedad,
       umbral_saturacion_humedad, umbral_max_ce_ds_m, estado, fecha_instalacion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ST_GeomFromText(?, 4326), ?, ?, ?, ?, ?, ?)
    `, [
      tenantId, id_finca, id_lote, codigo_sensor, nombre, tipo_sensor, marca_modelo || null, numero_serie || null,
      latitud, longitud, `POINT(${longitud} ${latitud})`, profundidades_cm,
      umbral_estres_humedad, umbral_saturacion_humedad, umbral_max_ce_ds_m, estado, fecha_instalacion
    ]);

    await logAudit(db, {
      id_tenant: tenantId,
      modulo: 'Sensores IoT',
      accion: 'REGISTRAR_SENSOR',
      registro_id: resInsert.insertId,
      usuario: req.user?.username || 'Usuario',
      detalle: `Sensor ${codigo_sensor} ("${nombre}") registrado en Lote ID ${id_lote}`
    });

    res.status(201).json({
      success: true,
      id_sensor: resInsert.insertId,
      message: 'Sensor registrado exitosamente en la base de datos.'
    });
  } catch (err) {
    console.error('Error creando sensor:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sensores/dispositivos/:id
router.put('/dispositivos/:id', async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;
  const {
    nombre,
    tipo_sensor,
    marca_modelo,
    numero_serie,
    latitud,
    longitud,
    umbral_estres_humedad,
    umbral_saturacion_humedad,
    umbral_max_ce_ds_m,
    estado
  } = req.body;

  try {
    await db.query(`
      UPDATE sensores_dispositivos
      SET nombre = COALESCE(?, nombre),
          tipo_sensor = COALESCE(?, tipo_sensor),
          marca_modelo = COALESCE(?, marca_modelo),
          numero_serie = COALESCE(?, numero_serie),
          latitud = COALESCE(?, latitud),
          longitud = COALESCE(?, longitud),
          umbral_estres_humedad = COALESCE(?, umbral_estres_humedad),
          umbral_saturacion_humedad = COALESCE(?, umbral_saturacion_humedad),
          umbral_max_ce_ds_m = COALESCE(?, umbral_max_ce_ds_m),
          estado = COALESCE(?, estado)
      WHERE id_sensor = ?
    `, [
      nombre, tipo_sensor, marca_modelo, numero_serie, latitud, longitud,
      umbral_estres_humedad, umbral_saturacion_humedad, umbral_max_ce_ds_m, estado, id
    ]);

    await logAudit(db, {
      id_tenant: req.user?.id_tenant || 1,
      modulo: 'Sensores IoT',
      accion: 'ACTUALIZAR_SENSOR',
      registro_id: id,
      usuario: req.user?.username || 'Usuario',
      detalle: `Sensor ID ${id} actualizado`
    });

    res.json({ success: true, message: 'Sensor actualizado exitosamente.' });
  } catch (err) {
    console.error('Error actualizando sensor:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sensores/dispositivos/:id
router.delete('/dispositivos/:id', async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;
  try {
    await db.query('DELETE FROM sensores_dispositivos WHERE id_sensor = ?', [id]);
    await logAudit(db, {
      id_tenant: req.user?.id_tenant || 1,
      modulo: 'Sensores IoT',
      accion: 'ELIMINAR_SENSOR',
      registro_id: id,
      usuario: req.user?.username || 'Usuario',
      detalle: `Sensor ID ${id} eliminado`
    });
    res.json({ success: true, message: 'Sensor eliminado correctamente.' });
  } catch (err) {
    console.error('Error eliminando sensor:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 2. LECTURAS DE TELEMETRÍA (SERIES TEMPORALES & ALERTAS IOT)
// ==============================================================================

// GET /api/sensores/lecturas/:id_sensor
router.get('/lecturas/:id_sensor', async (req, res) => {
  const db = getDb(req);
  const { id_sensor } = req.params;
  const { limite = 100 } = req.query;

  try {
    const [rows] = await db.query(`
      SELECT l.*, DATE_FORMAT(l.fecha_hora, '%Y-%m-%d %H:%i') as fecha_formato
      FROM sensores_telemetria_lecturas l
      WHERE l.id_sensor = ?
      ORDER BY l.fecha_hora ASC
      LIMIT ?
    `, [id_sensor, parseInt(limite)]);
    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo lecturas de telemetría:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sensores/lecturas (Ingesta de datos de telemetría)
router.post('/lecturas', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.body.id_tenant || 1;
  const {
    id_sensor,
    fecha_hora = new Date(),
    bateria_pct,
    temperatura_suelo_c,
    humedad_10cm,
    humedad_30cm,
    humedad_60cm,
    conductividad_electrica_ds_m,
    ph_suelo
  } = req.body;

  if (!id_sensor || humedad_30cm === undefined) {
    return res.status(400).json({ error: 'Faltan parámetros de lectura obligatorios.' });
  }

  try {
    // Consultar umbrales del sensor para evaluar alertas
    const [sensorRows] = await db.query(
      'SELECT umbral_estres_humedad, umbral_max_ce_ds_m, nombre, codigo_sensor, id_lote FROM sensores_dispositivos WHERE id_sensor = ?',
      [id_sensor]
    );

    let alertaDisparada = 0;
    if (sensorRows.length > 0) {
      const s = sensorRows[0];
      const h30 = parseFloat(humedad_30cm);
      const ce = parseFloat(conductividad_electrica_ds_m);

      if (!isNaN(h30) && h30 < parseFloat(s.umbral_estres_humedad)) {
        alertaDisparada = 1;
      }
      if (!isNaN(ce) && ce > parseFloat(s.umbral_max_ce_ds_m)) {
        alertaDisparada = 1;
      }
    }

    const [resIns] = await db.query(`
      INSERT INTO sensores_telemetria_lecturas
      (id_tenant, id_sensor, fecha_hora, bateria_pct, temperatura_suelo_c, humedad_10cm,
       humedad_30cm, humedad_60cm, conductividad_electrica_ds_m, ph_suelo, alerta_disparada)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tenantId, id_sensor, fecha_hora, bateria_pct || null, temperatura_suelo_c || null,
      humedad_10cm || null, humedad_30cm || null, humedad_60cm || null,
      conductividad_electrica_ds_m || null, ph_suelo || null, alertaDisparada
    ]);

    // Actualizar nivel de batería en el sensor si viene en la lectura
    if (bateria_pct) {
      await db.query('UPDATE sensores_dispositivos SET bateria_pct = ? WHERE id_sensor = ?', [bateria_pct, id_sensor]);
    }

    res.status(201).json({
      success: true,
      id_lectura: resIns.insertId,
      alerta_disparada: alertaDisparada === 1
    });
  } catch (err) {
    console.error('Error insertando lectura de telemetría:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 3. CALIBRACIONES DE SONDAS
// ==============================================================================

// GET /api/sensores/calibraciones/:id_sensor
router.get('/calibraciones/:id_sensor', async (req, res) => {
  const db = getDb(req);
  const { id_sensor } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT * FROM sensores_calibraciones WHERE id_sensor = ? ORDER BY fecha_calibracion DESC',
      [id_sensor]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sensores/calibraciones
router.post('/calibraciones', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.body.id_tenant || 1;
  const {
    id_sensor,
    fecha_calibracion,
    tipo_suelo_calibrado,
    coeficiente_a,
    coeficiente_b,
    tecnico_responsable,
    observaciones
  } = req.body;

  if (!id_sensor || !fecha_calibracion || !tipo_suelo_calibrado || !tecnico_responsable) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para registrar la calibración.' });
  }

  try {
    const [resIns] = await db.query(`
      INSERT INTO sensores_calibraciones
      (id_tenant, id_sensor, fecha_calibracion, tipo_suelo_calibrado, coeficiente_a, coeficiente_b, tecnico_responsable, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tenantId, id_sensor, fecha_calibracion, tipo_suelo_calibrado,
      coeficiente_a || null, coeficiente_b || null, tecnico_responsable, observaciones || null
    ]);

    await logAudit(db, {
      id_tenant: tenantId,
      modulo: 'Sensores IoT',
      accion: 'CALIBRAR_SENSOR',
      registro_id: resIns.insertId,
      usuario: req.user?.username || 'Usuario',
      detalle: `Calibración de sonda ID ${id_sensor} en suelo ${tipo_suelo_calibrado} por ${tecnico_responsable}`
    });

    res.status(201).json({
      success: true,
      id_calibracion: resIns.insertId,
      message: 'Calibración guardada exitosamente en la base de datos.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
