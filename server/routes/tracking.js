import express from 'express';
import pool from '../db.js';
import crypto from 'crypto';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// 1. Get all active GPS connections (real-time telemetry)
router.get('/connections', async (req, res) => {
  const { tenantId } = req.query;
  const tid = tenantId || 1; // Default fallback

  try {
    const [devices] = await getDb(req).query(`
      SELECT 
        d.id_dispositivo, d.tipo_entidad, d.id_entidad, d.identificador_gps,
        d.estado, d.ultima_conexion, 
        CAST(d.ultima_latitud AS DOUBLE) as lat,
        CAST(d.ultima_longitud AS DOUBLE) as lng,
        CAST(d.ultima_velocidad AS DOUBLE) as velocidad,
        d.ultima_direccion as direccion,
        CASE 
          WHEN d.tipo_entidad = 'Empleado' THEN (SELECT CONCAT(e.nombres, ' ', e.apellidos, ' (', rc.descripcion, ')') FROM rrhh_empleados e JOIN rrhh_cargos rc ON e.id_cargo = rc.id_cargo WHERE e.id_empleado = d.id_entidad)
          WHEN d.tipo_entidad = 'Vehiculo' THEN (SELECT CONCAT(placa, ' - ', tipo_vehiculo) FROM vehiculos WHERE id_vehiculo = d.id_entidad)
          WHEN d.tipo_entidad = 'Maquina' THEN (SELECT CONCAT(codigo, ' - ', nombre) FROM maquinaria WHERE id_maquinaria = d.id_entidad)
        END as nombre_entidad
      FROM gps_tracking_dispositivos d
      WHERE d.id_tenant = ?
    `, [tid]);

    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get active assignments and their geofences
router.get('/assignments', async (req, res) => {
  const { tenantId } = req.query;
  const tid = tenantId || 1;

  try {
    const [rows] = await getDb(req).query(`
      SELECT 
        a.id_asignacion, a.tipo_entidad, a.id_entidad, a.descripcion_labor,
        a.fecha_asignacion, a.estado, a.geofence_tipo, a.radio_metros, a.dentro_zona_actual,
        a.id_lote,
        ST_AsText(a.punto_gps) as punto_gps_wkt,
        ST_AsText(l.poligono_gps) as lote_poligono_wkt,
        l.nombre as lote_nombre,
        CASE 
          WHEN a.tipo_entidad = 'Empleado' THEN (SELECT CONCAT(nombres, ' ', apellidos) FROM rrhh_empleados WHERE id_empleado = a.id_entidad)
          WHEN a.tipo_entidad = 'Vehiculo' THEN (SELECT placa FROM vehiculos WHERE id_vehiculo = a.id_entidad)
          WHEN a.tipo_entidad = 'Maquina' THEN (SELECT nombre FROM maquinaria WHERE id_maquinaria = a.id_entidad)
        END as nombre_entidad
      FROM gps_labores_asignaciones a
      LEFT JOIN lotes l ON a.id_lote = l.id_lote
      WHERE a.id_tenant = ? AND a.estado IN ('En Progreso', 'Pendiente')
    `, [tid]);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Post telemetry ping from GPS devices or client simulation
router.post('/ping', async (req, res) => {
  let { identificador_gps, latitud, longitud, velocidad, direccion, session_token, deviceFingerprint } = req.body;

  if (!identificador_gps || latitud === undefined || longitud === undefined) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios: identificador_gps, latitud, longitud' });
  }

  const lat = parseFloat(latitud);
  const lng = parseFloat(longitud);
  const vel = parseFloat(velocidad || 0.0);
  const dir = parseInt(direccion || 0);

  try {
    let sessionEmployee = null;
    let sessionDeviceHash = null;
    if (session_token) {
      const [sessions] = await getDb(req).query(`
        SELECT a.id_empleado, a.device_hash, a.gps_identificador, a.session_expires, a.estado, e.id_tenant, e.estado AS estado_empleado
        FROM rrhh_gps_accesos a
        JOIN rrhh_empleados e ON a.id_empleado = e.id_empleado
        WHERE a.session_token = ? AND a.session_expires > NOW() AND a.estado = 'Activo'
        LIMIT 1
      `, [session_token]);

      if (sessions.length === 0) {
        return res.status(401).json({ error: 'Sesión GPS inválida o vencida.' });
      }

      sessionEmployee = sessions[0];
      sessionDeviceHash = sessionEmployee.device_hash;

      if (deviceFingerprint && sessionDeviceHash && sessionDeviceHash !== crypto.createHash('sha256').update(String(deviceFingerprint)).digest('hex').slice(0, 12)) {
        return res.status(403).json({ error: 'Dispositivo no coincide con la sesión autenticada.' });
      }

      if (!identificador_gps) {
        identificador_gps = sessionEmployee.gps_identificador;
      }
    }

    // Lookup device
    let [devices] = await getDb(req).query(
      'SELECT id_dispositivo, id_tenant, tipo_entidad, id_entidad FROM gps_tracking_dispositivos WHERE identificador_gps = ? AND estado = "Activo"',
      [identificador_gps]
    );

    if (devices.length === 0) {
      if (req.body.auto_register) {
        const autoTenantId = sessionEmployee?.id_tenant || req.body.tenantId || req.body.id_tenant || 1;
        const autoEntityId = sessionEmployee?.id_empleado || req.body.id_empleado || null;
        const insertRes = await getDb(req).query(
          'INSERT INTO gps_tracking_dispositivos (id_tenant, tipo_entidad, id_entidad, identificador_gps, estado, ultima_conexion, ultima_latitud, ultima_longitud, ultima_velocidad) VALUES (?, ?, ?, ?, "Activo", NOW(), ?, ?, ?)',
          [autoTenantId, req.body.tipo_entidad || 'Empleado', autoEntityId, identificador_gps, lat, lng, vel]
        );
        devices = [{
          id_dispositivo: insertRes[0].insertId,
          id_tenant: autoTenantId,
          tipo_entidad: req.body.tipo_entidad || 'Empleado',
          id_entidad: autoEntityId
        }];
      } else {
        return res.status(404).json({ error: `Dispositivo GPS con identificador "${identificador_gps}" no está registrado o está inactivo.` });
      }
    }

    const dev = devices[0];
    const devId = dev.id_dispositivo;
    const tenantId = dev.id_tenant;

    if (!dev.id_entidad && (req.body.id_empleado || sessionEmployee?.id_empleado)) {
      const effectiveEmployeeId = req.body.id_empleado || sessionEmployee.id_empleado;
      await getDb(req).query(
        'UPDATE gps_tracking_dispositivos SET id_entidad = ? WHERE id_dispositivo = ?',
        [effectiveEmployeeId, devId]
      );
      dev.id_entidad = effectiveEmployeeId;
    }

    // Check if there is an active assignment for this device entity
    const [assignments] = await getDb(req).query(`
      SELECT id_asignacion, geofence_tipo, id_lote, ST_AsText(punto_gps) as punto_gps_wkt, radio_metros
      FROM gps_labores_asignaciones
      WHERE id_tenant = ? AND tipo_entidad = ? AND id_entidad = ? AND estado = 'En Progreso'
      LIMIT 1
    `, [tenantId, dev.tipo_entidad, dev.id_entidad]);

    let dentroZona = 0;

    if (assignments.length > 0) {
      const ass = assignments[0];
      if (ass.geofence_tipo === 'Lote' && ass.id_lote) {
        // Query database to evaluate ST_Contains
        const [containCheck] = await getDb(req).query(`
          SELECT ST_Contains(poligono_gps, ST_GeomFromText(?)) as inside
          FROM lotes 
          WHERE id_lote = ? AND poligono_gps IS NOT NULL
        `, [`POINT(${lng} ${lat})`, ass.id_lote]);

        dentroZona = containCheck.length > 0 ? (containCheck[0].inside ? 1 : 0) : 0;
      } else if (ass.geofence_tipo === 'Punto' && ass.punto_gps_wkt) {
        // Evaluate distance in meters between POINT(lng lat) and punto_gps
        // We use ST_Distance_Sphere (MySQL 5.7.6+) for accurate meters distance
        const [distCheck] = await getDb(req).query(`
          SELECT ST_Distance_Sphere(punto_gps, ST_GeomFromText(?)) as distance
          FROM gps_labores_asignaciones
          WHERE id_asignacion = ?
        `, [`POINT(${lng} ${lat})`, ass.id_asignacion]);

        const distance = distCheck.length > 0 ? distCheck[0].distance : 999999;
        dentroZona = distance <= ass.radio_metros ? 1 : 0;
      }

      // Update assignment status
      await getDb(req).query(
        'UPDATE gps_labores_asignaciones SET dentro_zona_actual = ? WHERE id_asignacion = ?',
        [dentroZona, ass.id_asignacion]
      );
    }

    // Update last known position in devices table
    await getDb(req).query(`
      UPDATE gps_tracking_dispositivos 
      SET 
        ultima_conexion = NOW(),
        ultima_latitud = ?,
        ultima_longitud = ?,
        ultima_velocidad = ?,
        ultima_direccion = ?
      WHERE id_dispositivo = ?
    `, [lat, lng, vel, dir, devId]);

    // Insert into history log
    await getDb(req).query(`
      INSERT INTO gps_tracking_historial (id_tenant, id_dispositivo, fecha_hora, latitud, longitud, coordenadas_punto, velocidad, direccion, dentro_zona)
      VALUES (?, ?, NOW(), ?, ?, ST_GeomFromText(?), ?, ?, ?)
    `, [tenantId, devId, lat, lng, `POINT(${lng} ${lat})`, vel, dir, dentroZona]);

    res.json({
      success: true,
      identificador_gps,
      dentro_zona: dentroZona === 1,
      tipo_entidad: dev.tipo_entidad,
      id_entidad: dev.id_entidad,
      session_bound: !!session_token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get tracking trajectory history
router.get('/history/:idDispositivo', async (req, res) => {
  const devId = parseInt(req.params.idDispositivo);

  try {
    const [rows] = await getDb(req).query(`
      SELECT 
        id_log, fecha_hora, 
        CAST(latitud AS DOUBLE) as lat,
        CAST(longitud AS DOUBLE) as lng,
        CAST(velocidad AS DOUBLE) as velocidad,
        direccion, dentro_zona
      FROM gps_tracking_historial
      WHERE id_dispositivo = ?
      ORDER BY fecha_hora ASC
      LIMIT 100
    `, [devId]);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
