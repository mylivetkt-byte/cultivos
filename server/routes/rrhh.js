import express from 'express';
import pool from '../db.js';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

let gpsSecuritySchemaReady = null;

function hashSecret(value) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(value), salt, 120000, 64, 'sha512').toString('hex');
  return `pbkdf2$120000$${salt}$${hash}`;
}

function verifySecret(value, stored) {
  if (!value || !stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  const salt = parts[2];
  const hash = parts[3];
  const derived = crypto.pbkdf2Sync(String(value), salt, iterations, 64, 'sha512').toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(derived, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function shortFingerprint(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 12);
}

function buildGpsIdentifier(employeeId, deviceHash) {
  return `GPS_EMP_${employeeId}_${shortFingerprint(deviceHash)}`;
}

function randomSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function ensureGpsSecuritySchema() {
  if (!gpsSecuritySchemaReady) {
    gpsSecuritySchemaReady = (async () => {
      await getDb(req).query(`
        CREATE TABLE IF NOT EXISTS rrhh_gps_accesos (
          id_acceso BIGINT AUTO_INCREMENT PRIMARY KEY,
          id_tenant INT NOT NULL,
          id_empleado INT NOT NULL,
          documento VARCHAR(60) DEFAULT NULL,
          pin_hash VARCHAR(255) NOT NULL,
        device_hash VARCHAR(255) DEFAULT NULL,
        gps_identificador VARCHAR(80) DEFAULT NULL,
        device_name VARCHAR(255) DEFAULT NULL,
        selfie_base64 LONGTEXT DEFAULT NULL,
        selfie_taken_at DATETIME DEFAULT NULL,
        session_token VARCHAR(128) DEFAULT NULL,
        session_expires DATETIME DEFAULT NULL,
        last_login DATETIME DEFAULT NULL,
        last_seen DATETIME DEFAULT NULL,
          failed_attempts INT DEFAULT 0,
          locked_until DATETIME DEFAULT NULL,
          estado ENUM('Activo', 'Bloqueado') DEFAULT 'Activo',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY ux_rrhh_gps_empleado (id_empleado),
          UNIQUE KEY ux_rrhh_gps_token (session_token)
        )
      `);

      const migrationStatements = [
        'ALTER TABLE rrhh_gps_accesos ADD COLUMN selfie_base64 LONGTEXT DEFAULT NULL',
        'ALTER TABLE rrhh_gps_accesos ADD COLUMN selfie_taken_at DATETIME DEFAULT NULL',
        'ALTER TABLE rrhh_gps_accesos ADD COLUMN session_token VARCHAR(128) DEFAULT NULL',
        'ALTER TABLE rrhh_gps_accesos ADD COLUMN session_expires DATETIME DEFAULT NULL',
        'ALTER TABLE rrhh_gps_accesos ADD COLUMN last_login DATETIME DEFAULT NULL',
        'ALTER TABLE rrhh_gps_accesos ADD COLUMN last_seen DATETIME DEFAULT NULL',
        'ALTER TABLE rrhh_gps_accesos ADD COLUMN failed_attempts INT DEFAULT 0',
        'ALTER TABLE rrhh_gps_accesos ADD COLUMN locked_until DATETIME DEFAULT NULL',
        'ALTER TABLE rrhh_gps_accesos ADD COLUMN device_hash VARCHAR(255) DEFAULT NULL',
        'ALTER TABLE rrhh_gps_accesos ADD COLUMN gps_identificador VARCHAR(80) DEFAULT NULL',
        'ALTER TABLE rrhh_gps_accesos ADD COLUMN device_name VARCHAR(255) DEFAULT NULL'
      ];

      for (const stmt of migrationStatements) {
        try {
          await getDb(req).query(stmt);
        } catch (err) {
          if (!String(err.message || '').includes('Duplicate column name')) {
            throw err;
          }
        }
      }
    })();
  }
  return gpsSecuritySchemaReady;
}

// Obtener todos los empleados
router.get('/empleados', async (req, res) => {
  const { tenantId, fincaId } = req.query;
  try {
    let query = `
      SELECT e.*, t.nombre_completo as t_nombres, t.documento as t_documento 
      FROM rrhh_empleados e 
      LEFT JOIN terceros t ON e.id_tercero = t.id_tercero 
      WHERE 1=1
    `;
    let params = [];
    if (tenantId) { query += ' AND e.id_tenant = ?'; params.push(tenantId); }
    if (fincaId) { query += ' AND e.id_finca = ?'; params.push(fincaId); }
    query += ' ORDER BY e.nombres ASC, e.apellidos ASC';
    
    const [rows] = await getDb(req).query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Simulador de Reloj Biométrico (Huella/Iris)
router.post('/biometria/simular', async (req, res) => {
  const { id_empleado, device_id } = req.body;
  if (!id_empleado) return res.status(400).json({ error: 'id_empleado es requerido' });
  
  try {
    // 1. Revisar último acceso de hoy
    const [lastAccess] = await getDb(req).query(`
      SELECT * FROM rrhh_accesos_biometricos 
      WHERE id_empleado = ? AND DATE(timestamp_marcacion) = CURDATE()
      ORDER BY timestamp_marcacion DESC LIMIT 1
    `, [id_empleado]);

    let tipo_marcacion = 'Entrada';
    if (lastAccess.length > 0 && lastAccess[0].tipo_marcacion === 'Entrada') {
      tipo_marcacion = 'Salida'; // Si la última fue entrada, ahora sale
    }

    // 2. Insertar nuevo acceso
    await getDb(req).query(`
      INSERT INTO rrhh_accesos_biometricos (id_empleado, tipo_marcacion, metodo, timestamp_marcacion, device_id)
      VALUES (?, ?, 'Huella', NOW(), ?)
    `, [id_empleado, tipo_marcacion, device_id || 'Simulador-Web-01']);

    // 3. Opcional: También registrar en rrhh_control_asistencia (si es entrada, crear, si es salida, actualizar)
    if (tipo_marcacion === 'Entrada') {
        await getDb(req).query(`
            INSERT INTO rrhh_control_asistencia (id_empleado, fecha, hora_entrada)
            VALUES (?, CURDATE(), CURTIME())
        `, [id_empleado]);
    } else {
        await getDb(req).query(`
            UPDATE rrhh_control_asistencia 
            SET hora_salida = CURTIME()
            WHERE id_empleado = ? AND fecha = CURDATE()
        `, [id_empleado]);
    }

    res.json({ success: true, tipo_marcacion, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Dashboard RRHH: Obtener KPIs
router.get('/kpis', async (req, res) => {
  const { tenantId } = req.query;
  const tid = tenantId || 1;
  try {
    const [emp] = await getDb(req).query(`SELECT COUNT(*) as total_empleados FROM rrhh_empleados WHERE id_tenant = ? AND estado = 'Activo'`, [tid]);
    const [maq] = await getDb(req).query(`SELECT COUNT(*) as total_maquinas FROM maquinaria WHERE id_tenant = ? AND activo = 1`, [tid]);
    const [veh] = await getDb(req).query(`SELECT COUNT(*) as total_vehiculos FROM vehiculos WHERE id_tenant = ?`, [tid]);
    
    // Distribución por Cargos
    const [cargos] = await getDb(req).query(`
        SELECT rc.descripcion AS cargo, COUNT(*) as cantidad 
        FROM rrhh_empleados e 
        JOIN rrhh_cargos rc ON e.id_cargo = rc.id_cargo 
        WHERE e.id_tenant = ? AND e.estado = 'Activo' 
        GROUP BY rc.descripcion 
        ORDER BY cantidad DESC LIMIT 5
      `, [tid]);

    // Costos Operativos por Contratistas vs Nómina Directa (Simulados del ERP)
    const [costos] = await getDb(req).query(`
      SELECT 'Nómina Directa' as tipo, SUM(debito) as costo 
      FROM contab_detalles d
      JOIN contab_documentos c ON d.id_documento = c.id_documento
      WHERE d.id_cuenta IN (SELECT id_cuenta FROM plan_contable WHERE codigo LIKE '72%') AND c.id_tenant = ?
      UNION
      SELECT 'Contratistas', SUM(debito) as costo 
      FROM contab_detalles d
      JOIN contab_documentos c ON d.id_documento = c.id_documento
      WHERE d.id_cuenta IN (SELECT id_cuenta FROM plan_contable WHERE codigo LIKE '73%') AND c.id_tenant = ?
    `, [tid, tid]);

    res.json({
      headcount: emp[0].total_empleados,
      maquinas: maq[0].total_maquinas,
      vehiculos: veh[0].total_vehiculos,
      cargos,
      costos
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Auditoría: Costos por Lote vs Nómina
router.get('/auditoria-costos', async (req, res) => {
  const { tenantId, periodoAnio, periodoMes, quincena, idFinca, fechaInicio: customFechaInicio, fechaFin: customFechaFin } = req.query;
  const tid = tenantId || 1;
  const pAnio = periodoAnio || new Date().getFullYear();
  const pMes = periodoMes || (new Date().getMonth() + 1);
  const pQuin = quincena || 'Primera';

  try {
    // 1. Fechas
    let fechaInicio, fechaFin;
    if (customFechaInicio && customFechaFin) {
      fechaInicio = customFechaInicio;
      fechaFin = customFechaFin;
    } else {
      const diaInicio = pQuin === 'Primera' ? 1 : 16;
      const diaFin = pQuin === 'Primera' ? 15 : 31;
      fechaInicio = `${pAnio}-${String(pMes).padStart(2, '0')}-${String(diaInicio).padStart(2, '0')}`;
      fechaFin = `${pAnio}-${String(pMes).padStart(2, '0')}-${String(diaFin).padStart(2, '0')}`;
    }

    // Filtros de finca
    let fincaJoin = '';
    let fincaWhere = '';
    const paramsTraz = [pAnio, pMes, pQuin, fechaInicio, fechaFin, tid];
    const paramsLotes = [tid, fechaInicio, fechaFin];
    
    if (idFinca && idFinca !== 'Todas' && idFinca !== 'undefined') {
      fincaJoin = 'LEFT JOIN lotes l ON ld.id_lote = l.id_lote';
      fincaWhere = 'AND l.id_finca = ?';
      paramsTraz.push(idFinca);
      paramsLotes.push(idFinca);
    } else {
      fincaJoin = 'LEFT JOIN lotes l ON ld.id_lote = l.id_lote';
    }

    const [trazabilidad] = await getDb(req).query(`
      SELECT 
        e.id_empleado,
        COALESCE(e.nombres, t.nombre_completo) as nombres,
        e.apellidos as apellidos,
        COALESCE(nd.total_devengos, nd.salario_base_devengado + COALESCE(nd.bonificaciones, 0)) as nomina_devengada,
        SUM(COALESCE(ld.costo_mano_obra, 0)) as costo_reportado_labores,
        COUNT(ld.id_labor) as cantidad_labores
      FROM rrhh_empleados e
      LEFT JOIN terceros t ON e.id_tercero = t.id_tercero
      LEFT JOIN rrhh_nomina_quincena nq ON nq.id_tenant = e.id_tenant AND nq.periodo_anio = ? AND nq.periodo_mes = ? AND nq.quincena = ?
      LEFT JOIN rrhh_nomina_detalle nd ON nd.id_nomina = nq.id_nomina AND nd.id_empleado = e.id_empleado
      LEFT JOIN labores_diarias ld ON ld.id_empleado = e.id_empleado AND ld.fecha_planificada BETWEEN ? AND ? AND ld.estado = 'Completada'
      ${fincaJoin}
      WHERE e.id_tenant = ? AND (nd.id_nomina_detalle IS NOT NULL OR ld.id_labor IS NOT NULL) ${fincaWhere}
      GROUP BY e.id_empleado, e.nombres, t.nombre_completo, e.apellidos, nd.total_devengos, nd.salario_base_devengado, nd.bonificaciones
    `, paramsTraz);

    const [lotes] = await getDb(req).query(`
      SELECT 
        COALESCE(l.nombre, CONCAT('Lote ', ld.id_lote)) as lote,
        SUM(COALESCE(ld.costo_mano_obra, 0)) as costo_total,
        COUNT(ld.id_labor) as labores_ejecutadas
      FROM labores_diarias ld
      ${fincaJoin}
      WHERE ld.id_tenant = ? AND ld.fecha_planificada BETWEEN ? AND ? AND ld.estado = 'Completada' ${fincaWhere}
      GROUP BY ld.id_lote, l.nombre
    `, paramsLotes);

    const totalLabores = trazabilidad.reduce((acc, emp) => acc + Number(emp.costo_reportado_labores || 0), 0);
    const totalDevengado = trazabilidad.reduce((acc, emp) => acc + Number(emp.nomina_devengada || 0), 0);
    
    res.json({
      kpis: {
        totalNomina: totalDevengado,
        totalLabores: totalLabores,
        variacion: totalDevengado - totalLabores
      },
      trazabilidad,
      lotes,
      periodo: { pAnio, pMes, pQuin }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Contabilizar Nómina
router.post('/contabilizar-nomina', async (req, res) => {
  const { tenantId, pAnio, pMes, pQuin, totalNomina, totalLabores, variacion } = req.body;
  const tid = tenantId || 1;
  const pool = getDb(req);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Obtener consecutivo
    const [tipoDoc] = await conn.query('SELECT consecutivo_actual FROM tipos_documentos WHERE id_tipo_doc = 8 AND id_tenant = ? FOR UPDATE', [tid]);
    let consecutivo = 1;
    if (tipoDoc.length > 0) {
      consecutivo = tipoDoc[0].consecutivo_actual + 1;
      await conn.query('UPDATE tipos_documentos SET consecutivo_actual = ? WHERE id_tipo_doc = 8 AND id_tenant = ?', [consecutivo, tid]);
    }
    const numeroDoc = 'CNM-' + String(consecutivo).padStart(4, '0');

    // 2. Insertar Encabezado
    const [docResult] = await conn.query(`
      INSERT INTO contab_documentos (id_tenant, id_tipo_doc, numero_doc, fecha, concepto, estado, tabla_origen, id_origen)
      VALUES (?, 8, ?, CURDATE(), ?, 'Aprobado', 'rrhh_nomina_quincena', ?)
    `, [tid, numeroDoc, `Causación Nómina ${pQuin} ${pAnio}-${pMes}`, `${pAnio}-${pMes}-${pQuin}`]);
    
    const idDocumento = docResult.insertId;

    // 3. Insertar Detalles (Costo, Gasto, Pasivo)
    // Para auditoría, el Costo 7105 (ID 77)
    // El Pasivo 2505 (ID 102)
    const detalles = [];
    
    // Costo (Labores) -> Débito
    if (totalLabores > 0) {
      detalles.push([
        idDocumento,
        77, // 7105
        null, // tercero
        null, // cc
        'Mano de Obra (Labores)',
        0, // valor_base
        totalLabores, // debito
        0 // credito
      ]);
    }

    // Variación (Tiempo ocioso/Gasto) -> Débito
    if (variacion > 0) {
      // 510515 (ID 122) para tiempo ocioso
      detalles.push([
        idDocumento,
        122, // 510515
        null,
        null,
        'Tiempo Ocioso / Gasto Nómina',
        0,
        variacion,
        0
      ]);
    }

    // Pasivo (Nómina Total) -> Crédito
    if (totalNomina > 0) {
      detalles.push([
        idDocumento,
        102, // 2505
        null,
        null,
        'Salarios por Pagar',
        0,
        0,
        totalNomina // credito
      ]);
    }

    if (detalles.length > 0) {
      await conn.query(`
        INSERT INTO contab_detalles (id_documento, id_cuenta, id_tercero, id_centro_costo, descripcion, valor_base, debito, credito)
        VALUES ?
      `, [detalles]);
    }

    await conn.commit();
    res.json({ success: true, message: 'Nómina contabilizada con éxito', documento: numeroDoc });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Historial de Labores
router.get('/labores-historial', async (req, res) => {
  const { tenantId } = req.query;
  const tid = tenantId || 1;
  try {
    const [labores] = await getDb(req).query(`
      SELECT
        DATE_FORMAT(ld.fecha_planificada, '%Y-%m-%d') AS fecha,
        COALESCE(t.nombre_completo, CONCAT_WS(' ', e.nombres, e.apellidos), 'Sin empleado asignado') AS empleado,
        COALESCE(rc.descripcion, 'Sin cargo') AS cargo,
        ld.descripcion_labor AS labor,
        COALESCE(l.nombre, CONCAT('Lote ', l.id_lote), 'Sin lote') AS lote,
        ROUND(COALESCE(e.salario_base, 0) / 30, 0) AS costo_estimado,
        CASE
          WHEN ld.estado = 'Completada' THEN 8
          WHEN ld.estado = 'En Progreso' THEN 4
          ELSE 0
        END AS horas
      FROM labores_diarias ld
        LEFT JOIN rrhh_empleados e ON ld.id_empleado = e.id_empleado
        LEFT JOIN rrhh_cargos rc ON e.id_cargo = rc.id_cargo
      LEFT JOIN terceros t ON e.id_tercero = t.id_tercero
      LEFT JOIN lotes l ON ld.id_lote = l.id_lote
      WHERE ld.id_tenant = ?
      ORDER BY ld.fecha_planificada DESC, ld.id_labor DESC
      LIMIT 50
    `, [tid]);

    res.json(labores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Registro inicial del móvil del empleado
router.post('/gps/register', async (req, res) => {
  const { tenantId, documento, pin, deviceFingerprint, deviceName, selfieBase64 } = req.body;
  const tid = tenantId || 1;

  if (!documento || !pin || !deviceFingerprint || !selfieBase64) {
    return res.status(400).json({ error: 'documento, pin, deviceFingerprint y selfieBase64 son requeridos' });
  }

  try {
    await ensureGpsSecuritySchema();
    const [empleados] = await getDb(req).query(`
      SELECT e.id_empleado, e.id_tenant, e.nombres, e.apellidos, rc.descripcion AS cargo, e.estado, COALESCE(t.documento, e.device_id, e.biometric_id) AS documento
      FROM rrhh_empleados e
      LEFT JOIN rrhh_cargos rc ON e.id_cargo = rc.id_cargo
      FROM rrhh_empleados e
      LEFT JOIN terceros t ON e.id_tercero = t.id_tercero
      WHERE e.id_tenant = ? AND (t.documento = ? OR e.device_id = ? OR e.biometric_id = ?)
      LIMIT 1
    `, [tid, documento, documento, documento]);

    if (empleados.length === 0) {
      return res.status(404).json({ error: 'No existe un empleado activo con ese documento en el tenant seleccionado.' });
    }

    const emp = empleados[0];
    const pinHash = hashSecret(pin);
    const deviceHash = shortFingerprint(deviceFingerprint);
    const gpsIdentifier = buildGpsIdentifier(emp.id_empleado, deviceFingerprint);
    const sessionToken = randomSessionToken();
    const sessionExpires = new Date(Date.now() + 8 * 60 * 60 * 1000);

    await getDb(req).query(`
      INSERT INTO rrhh_gps_accesos (
        id_tenant, id_empleado, documento, pin_hash, device_hash, gps_identificador, device_name,
        selfie_base64, selfie_taken_at, session_token, session_expires, last_login, last_seen, failed_attempts, locked_until, estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, NOW(), NOW(), 0, NULL, 'Activo')
      ON DUPLICATE KEY UPDATE
        documento = VALUES(documento),
        pin_hash = VALUES(pin_hash),
        device_hash = VALUES(device_hash),
        gps_identificador = VALUES(gps_identificador),
        device_name = VALUES(device_name),
        selfie_base64 = VALUES(selfie_base64),
        selfie_taken_at = NOW(),
        session_token = VALUES(session_token),
        session_expires = VALUES(session_expires),
        last_login = NOW(),
        last_seen = NOW(),
        estado = 'Activo',
        failed_attempts = 0,
        locked_until = NULL
    `, [emp.id_tenant || tid, emp.id_empleado, documento, pinHash, deviceHash, gpsIdentifier, deviceName || null, selfieBase64, sessionToken, sessionExpires]);

    await getDb(req).query(`
      UPDATE rrhh_empleados
      SET device_id = ?
      WHERE id_empleado = ?
    `, [gpsIdentifier, emp.id_empleado]);

    res.json({
      success: true,
      session_token: sessionToken,
      session_expires: sessionExpires.toISOString(),
      id_empleado: emp.id_empleado,
      gps_identificador: gpsIdentifier,
      selfie_taken_at: new Date().toISOString(),
      empleado: {
        id_empleado: emp.id_empleado,
        nombres: emp.nombres || null,
        apellidos: emp.apellidos || null,
        cargo: emp.cargo || null,
        estado: emp.estado || 'Activo'
      },
      message: 'Acceso registrado con éxito. Ya puede iniciar sesión desde este dispositivo.'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Inicio de sesión del móvil del empleado
router.post('/gps/login', async (req, res) => {
  const { tenantId, documento, pin, deviceFingerprint, deviceName, selfieBase64 } = req.body;
  const tid = tenantId || 1;

  if (!documento || !pin || !deviceFingerprint || !selfieBase64) {
    return res.status(400).json({ error: 'documento, pin, deviceFingerprint y selfieBase64 son requeridos' });
  }

  try {
    await ensureGpsSecuritySchema();
    const [rows] = await getDb(req).query(`
      SELECT a.*, e.nombres, e.apellidos, rc.descripcion AS cargo, e.estado AS estado_empleado
      FROM rrhh_gps_accesos a
      JOIN rrhh_empleados e ON a.id_empleado = e.id_empleado
      LEFT JOIN rrhh_cargos rc ON e.id_cargo = rc.id_cargo
      FROM rrhh_gps_accesos a
      JOIN rrhh_empleados e ON a.id_empleado = e.id_empleado
      LEFT JOIN terceros t ON e.id_tercero = t.id_tercero
      WHERE a.id_tenant = ? AND (a.documento = ? OR t.documento = ?)
      LIMIT 1
    `, [tid, documento, documento]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No existe un acceso registrado para ese documento. Primero debe registrarse.' });
    }

    const acc = rows[0];
    if (acc.estado === 'Bloqueado') {
      return res.status(403).json({ error: 'El acceso está bloqueado.' });
    }

    if (acc.locked_until && new Date(acc.locked_until).getTime() > Date.now()) {
      return res.status(423).json({ error: 'El acceso está temporalmente bloqueado por intentos fallidos.' });
    }

    if (!verifySecret(pin, acc.pin_hash)) {
      const failedAttempts = Number(acc.failed_attempts || 0) + 1;
      const lockUntil = failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await getDb(req).query(`
        UPDATE rrhh_gps_accesos
        SET failed_attempts = ?, locked_until = ?, estado = ?
        WHERE id_acceso = ?
      `, [failedAttempts, lockUntil, lockUntil ? 'Bloqueado' : 'Activo', acc.id_acceso]);
      return res.status(401).json({ error: 'PIN incorrecto.' });
    }

    const deviceHash = shortFingerprint(deviceFingerprint);
    if (acc.device_hash && acc.device_hash !== deviceHash) {
      return res.status(403).json({
        error: 'Este acceso ya está vinculado a otro dispositivo. Para evitar suplantación no se permite iniciar sesión desde un teléfono distinto.'
      });
    }

    const selfieTakenAt = new Date();

    const sessionToken = randomSessionToken();
    const sessionExpires = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const gpsIdentifier = acc.gps_identificador || buildGpsIdentifier(acc.id_empleado, deviceFingerprint);

    await getDb(req).query(`
      UPDATE rrhh_gps_accesos
      SET
        documento = ?,
        device_hash = ?,
        gps_identificador = ?,
        device_name = ?,
        selfie_base64 = ?,
        selfie_taken_at = ?,
        session_token = ?,
        session_expires = ?,
        last_login = NOW(),
        last_seen = NOW(),
        failed_attempts = 0,
        locked_until = NULL,
        estado = 'Activo'
      WHERE id_acceso = ?
    `, [documento, deviceHash, gpsIdentifier, deviceName || acc.device_name || null, selfieBase64, selfieTakenAt, sessionToken, sessionExpires, acc.id_acceso]);

    await getDb(req).query(`
      UPDATE rrhh_empleados
      SET device_id = ?
      WHERE id_empleado = ?
    `, [gpsIdentifier, acc.id_empleado]);

    res.json({
      success: true,
      session_token: sessionToken,
      session_expires: sessionExpires.toISOString(),
      gps_identificador: gpsIdentifier,
      selfie_taken_at: selfieTakenAt.toISOString(),
      empleado: {
        id_empleado: acc.id_empleado,
        nombres: acc.nombres,
        apellidos: acc.apellidos,
        cargo: acc.cargo,
        estado: acc.estado_empleado
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/gps/session', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.query.session_token;
  if (!token) return res.status(401).json({ error: 'session_token requerido' });

  try {
    await ensureGpsSecuritySchema();
    const [rows] = await getDb(req).query(`
      SELECT a.*, e.nombres, e.apellidos, rc.descripcion AS cargo, e.estado AS estado_empleado
      FROM rrhh_gps_accesos a
      JOIN rrhh_empleados e ON a.id_empleado = e.id_empleado
      LEFT JOIN rrhh_cargos rc ON e.id_cargo = rc.id_cargo
      FROM rrhh_gps_accesos a
      JOIN rrhh_empleados e ON a.id_empleado = e.id_empleado
      WHERE a.session_token = ? AND a.session_expires > NOW() AND a.estado = 'Activo'
      LIMIT 1
    `, [token]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Sesión inválida o vencida.' });
    }

    const acc = rows[0];
    await getDb(req).query('UPDATE rrhh_gps_accesos SET last_seen = NOW() WHERE id_acceso = ?', [acc.id_acceso]);

    res.json({
      success: true,
      empleado: {
        id_empleado: acc.id_empleado,
        nombres: acc.nombres,
        apellidos: acc.apellidos,
        cargo: acc.cargo,
        estado: acc.estado_empleado
      },
      gps_identificador: acc.gps_identificador,
      session_expires: acc.session_expires,
      device_name: acc.device_name,
      selfie_taken_at: acc.selfie_taken_at
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/gps/logout', async (req, res) => {
  const { session_token } = req.body;
  if (!session_token) return res.status(400).json({ error: 'session_token requerido' });

  try {
    await ensureGpsSecuritySchema();
    await getDb(req).query(`
      UPDATE rrhh_gps_accesos
      SET session_token = NULL, session_expires = NULL
      WHERE session_token = ?
    `, [session_token]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/gps/selfie', async (req, res) => {
  const { session_token, selfieBase64 } = req.body;
  if (!session_token || !selfieBase64) {
    return res.status(400).json({ error: 'session_token y selfieBase64 son requeridos' });
  }

  try {
    await ensureGpsSecuritySchema();
    const [rows] = await getDb(req).query(`
      SELECT id_acceso, id_empleado
      FROM rrhh_gps_accesos
      WHERE session_token = ? AND session_expires > NOW() AND estado = 'Activo'
      LIMIT 1
    `, [session_token]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Sesión inválida o vencida.' });
    }

    const selfieTakenAt = new Date();
    await getDb(req).query(`
      UPDATE rrhh_gps_accesos
      SET selfie_base64 = ?, selfie_taken_at = ?, last_seen = NOW()
      WHERE id_acceso = ?
    `, [selfieBase64, selfieTakenAt, rows[0].id_acceso]);

    res.json({ success: true, selfie_taken_at: selfieTakenAt.toISOString(), id_empleado: rows[0].id_empleado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Ubicacion real de personal con GPS activo o ultimo ping registrado
router.get('/ubicacion/personal', async (req, res) => {
  const { tenantId, fincaId } = req.query;
  const tid = tenantId || 1;

  try {
    let empQuery = `
      SELECT
        e.id_empleado,
        e.nombres,
        e.apellidos,
        rc.descripcion AS cargo,
        e.area_asignada,
        e.estado AS estado_empleado,
        e.device_id,
        e.id_finca,
        f.nombre AS finca_nombre,
        t.nombre_completo,
        t.documento,
        t.telefono
      FROM rrhh_empleados e
      LEFT JOIN terceros t ON e.id_tercero = t.id_tercero
      LEFT JOIN fincas f ON e.id_finca = f.id_finca
      WHERE e.id_tenant = ?
    `;
    const empParams = [tid];
    if (fincaId) {
      empQuery += ' AND e.id_finca = ?';
      empParams.push(fincaId);
    }
    empQuery += ' AND e.estado = "Activo" ORDER BY e.nombres ASC, e.apellidos ASC';

    const [empleados] = await getDb(req).query(empQuery, empParams);

    const [dispositivos] = await getDb(req).query(`
      SELECT
        d.id_dispositivo,
        d.id_entidad,
        d.identificador_gps,
        d.estado AS gps_estado,
        d.ultima_conexion,
        CAST(d.ultima_latitud AS DOUBLE) AS lat,
        CAST(d.ultima_longitud AS DOUBLE) AS lng,
        CAST(d.ultima_velocidad AS DOUBLE) AS velocidad,
        d.ultima_direccion AS direccion
      FROM gps_tracking_dispositivos d
      WHERE d.id_tenant = ? AND d.tipo_entidad = 'Empleado'
    `, [tid]);

    const [authRows] = await getDb(req).query(`
      SELECT
        id_empleado,
        device_name,
        last_login,
        last_seen,
        session_expires,
        CASE WHEN session_token IS NOT NULL AND session_expires > NOW() AND estado = 'Activo' THEN 1 ELSE 0 END AS sesion_activa
      FROM rrhh_gps_accesos
      WHERE id_tenant = ?
    `, [tid]);

    const authMap = new Map(authRows.map((row) => [row.id_empleado, row]));

    const deviceMap = new Map();
    dispositivos.forEach((d) => {
      if (d.id_entidad) deviceMap.set(`id:${d.id_entidad}`, d);
      if (d.identificador_gps) deviceMap.set(`gps:${d.identificador_gps}`, d);
    });

    const rows = empleados.map((e) => {
      const linkedDevice = deviceMap.get(`id:${e.id_empleado}`) || (e.device_id ? deviceMap.get(`gps:${e.device_id}`) : null);
      const auth = authMap.get(e.id_empleado) || null;
      const ultimaConexion = linkedDevice?.ultima_conexion ? new Date(linkedDevice.ultima_conexion) : null;
      const minutosUltimaConexion = ultimaConexion
        ? Math.max(0, Math.floor((Date.now() - ultimaConexion.getTime()) / 60000))
        : null;

      let estadoGps = 'Sin dispositivo';
      if (linkedDevice) {
        if (!linkedDevice.ultima_conexion) {
          estadoGps = 'Sin señal';
        } else if (minutosUltimaConexion <= 5) {
          estadoGps = 'En línea';
        } else if (minutosUltimaConexion <= 20) {
          estadoGps = 'Reciente';
        } else {
          estadoGps = 'Offline';
        }
      }

      return {
        ...e,
        id_dispositivo: linkedDevice?.id_dispositivo || null,
        identificador_gps: linkedDevice?.identificador_gps || e.device_id || null,
        gps_estado: linkedDevice?.gps_estado || null,
        ultima_conexion: linkedDevice?.ultima_conexion || null,
        lat: linkedDevice?.lat ?? null,
        lng: linkedDevice?.lng ?? null,
        velocidad: linkedDevice?.velocidad ?? 0,
        direccion: linkedDevice?.direccion ?? 0,
        device_name: auth?.device_name || null,
        last_login: auth?.last_login || null,
        last_seen: auth?.last_seen || null,
        session_expires: auth?.session_expires || null,
        sesion_activa: auth?.sesion_activa || 0,
        minutos_ultima_conexion: minutosUltimaConexion,
        estado_seguimiento: estadoGps,
        tiene_ubicacion: linkedDevice?.lat !== null && linkedDevice?.lng !== null && linkedDevice?.lat !== undefined && linkedDevice?.lng !== undefined
      };
    });

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Historial GPS por empleado
router.get('/ubicacion/historial/:idEmpleado', async (req, res) => {
  const { tenantId } = req.query;
  const tid = tenantId || 1;
  const idEmpleado = parseInt(req.params.idEmpleado, 10);

  try {
    const [devRows] = await getDb(req).query(`
      SELECT id_dispositivo
      FROM gps_tracking_dispositivos
      WHERE id_tenant = ? AND tipo_entidad = 'Empleado' AND (id_entidad = ? OR identificador_gps = (
        SELECT device_id FROM rrhh_empleados WHERE id_empleado = ? LIMIT 1
      ))
      ORDER BY ultima_conexion DESC
      LIMIT 1
    `, [tid, idEmpleado, idEmpleado]);

    if (devRows.length === 0) {
      return res.json([]);
    }

    const [rows] = await getDb(req).query(`
      SELECT
        id_log,
        fecha_hora,
        CAST(latitud AS DOUBLE) AS lat,
        CAST(longitud AS DOUBLE) AS lng,
        CAST(velocidad AS DOUBLE) AS velocidad,
        direccion,
        dentro_zona
      FROM gps_tracking_historial
      WHERE id_dispositivo = ?
      ORDER BY fecha_hora ASC
      LIMIT 200
    `, [devRows[0].id_dispositivo]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener Conceptos de Nómina
router.get('/conceptos', async (req, res) => {
  try {
    const [rows] = await getDb(req).query('SELECT * FROM rrhh_conceptos_nomina ORDER BY tipo DESC, nombre ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener Planillas Consolidadas con Detalles
router.get('/planillas', async (req, res) => {
  console.log("==> GET /planillas CALLED WITH QUERY:", req.query);
  const { tenantId, fincaId, ciclo, empleadoId } = req.query;
  const tid = tenantId || 1;
  try {
    let query = `
      SELECT p.*, f.nombre as finca_nombre 
      FROM rrhh_planillas_consolidadas p
      LEFT JOIN fincas f ON p.id_finca = f.id_finca
      WHERE p.id_tenant = ?
    `;
    let params = [tid];

    if (fincaId) { query += ' AND p.id_finca = ?'; params.push(fincaId); }
    if (ciclo) { query += ' AND p.ciclo = ?'; params.push(ciclo); }

    const [planillas] = await getDb(req).query(query, params);

    // Fetch details for each planilla
    for (let p of planillas) {
      let detQuery = `
        SELECT d.*, t.nombre_completo, t.documento, rc.descripcion
        FROM rrhh_planillas_detalle d
        JOIN rrhh_empleados e ON d.id_empleado = e.id_empleado
        JOIN terceros t ON e.id_tercero = t.id_tercero
        WHERE d.id_planilla = ?
      `;
      let detParams = [p.id_planilla];

      if (empleadoId) { 
        detQuery += ' AND d.id_empleado = ?'; 
        detParams.push(empleadoId); 
      }

      const [detalles] = await getDb(req).query(detQuery, detParams);
      p.detalles = detalles;
    }

    // Si filtró por empleado, remueve planillas que quedaron sin detalles para ese empleado
    const filteredPlanillas = empleadoId ? planillas.filter(p => p.detalles.length > 0) : planillas;

    res.json(filteredPlanillas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener Hojas de Vida
router.get('/hojas-vida', async (req, res) => {
  const { tenantId } = req.query;
  try {
    const [rows] = await getDb(req).query(`
      SELECT h.*, rc.descripcion, f.nombre as finca_nombre, t.nombre_completo, t.documento, t.telefono, t.email
      FROM rrhh_hojas_vida h
      JOIN rrhh_empleados e ON h.id_empleado = e.id_empleado
      JOIN terceros t ON e.id_tercero = t.id_tercero
      LEFT JOIN fincas f ON e.id_finca = f.id_finca
      WHERE e.id_tenant = ?
    `, [tenantId || 1]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener Permisos
router.get('/permisos', async (req, res) => {
  const { tenantId, fincaId, empleadoId, fechaDesde, fechaHasta } = req.query;
  try {
    let sql = `
      SELECT p.*, t.nombre_completo, rc.descripcion AS cargo, f.nombre AS finca_nombre
      FROM rrhh_permisos p
      JOIN rrhh_empleados e ON p.id_empleado = e.id_empleado
      JOIN terceros t ON e.id_tercero = t.id_tercero
      LEFT JOIN rrhh_cargos rc ON e.id_cargo = rc.id_cargo
      LEFT JOIN fincas f ON e.id_finca = f.id_finca
      WHERE e.id_tenant = ?
    `;
    const params = [tenantId || 1];

    if (fincaId && fincaId !== 'Todas') {
      sql += ` AND f.id_finca = ?`;
      params.push(fincaId);
    }
    if (empleadoId) {
      sql += ` AND p.id_empleado = ?`;
      params.push(empleadoId);
    }
    if (fechaDesde) {
      sql += ` AND p.fecha_inicio >= ?`;
      params.push(fechaDesde);
    }
    if (fechaHasta) {
      sql += ` AND p.fecha_fin <= ?`;
      params.push(fechaHasta);
    }

    sql += ` ORDER BY p.fecha_inicio DESC`;
    
    const [rows] = await getDb(req).query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Crear Permiso (POST)
router.post('/permisos', async (req, res) => {
  const { tenantId, permiso } = req.body;
  if (!permiso) return res.status(400).json({ error: 'Permiso data required' });
  try {
    const fields = Object.keys(permiso);
    const placeholders = fields.map(() => '?').join(', ');
    const values = fields.map(f => permiso[f]);
    const sql = `INSERT INTO rrhh_permisos (${fields.join(', ')}) VALUES (${placeholders})`;
    const [result] = await getDb(req).query(sql, values);
    const newId = result.insertId;

    // WHATSAPP INTEGRATION: Notify immediate manager
    let whatsapp_sent = false;
    let manager_phone = null;
    let manager_name = null;
    try {
      const [jefeInfo] = await getDb(req).query(`
        SELECT tj.telefono, tj.nombre_completo AS jefe_nombre, t.nombre_completo AS emp_nombre
        FROM rrhh_empleados e
        JOIN rrhh_empleados j ON e.id_jefe = j.id_empleado
        JOIN terceros tj ON j.id_tercero = tj.id_tercero
        JOIN terceros t ON e.id_tercero = t.id_tercero
        WHERE e.id_empleado = ?
      `, [permiso.id_empleado]);

      if (jefeInfo.length > 0 && jefeInfo[0].telefono) {
        manager_phone = jefeInfo[0].telefono;
        manager_name = jefeInfo[0].jefe_nombre;
        const msg = `Hola ${manager_name}, el empleado ${jefeInfo[0].emp_nombre} ha solicitado un permiso tipo "${permiso.tipo_permiso}" desde ${permiso.fecha_inicio} hasta ${permiso.fecha_fin}.`;
        console.log(`[WHATSAPP API SIMULADA] Enviando mensaje a Jefe (${manager_phone}): ${msg}`);
        whatsapp_sent = true;
      }
    } catch (waErr) {
      console.error('Error fetching manager for WhatsApp:', waErr);
    }

    res.json({ success: true, id_permiso: newId, whatsapp_sent, manager_phone });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener Contratos Maestros con detalle de asignaciones
router.get('/contratos', async (req, res) => {
  const { tenantId, fincaId } = req.query;
  const tid = tenantId || 1;
  try {
    let query = `
      SELECT c.*, f.nombre as finca_nombre,
        l.nombre as lote_nombre,
        t.nombre_completo as responsable_nombre,
        td.nombre_completo as director_nombre,
        (SELECT COUNT(*) FROM rrhh_contratos_empleados ce WHERE ce.id_contrato = c.id_contrato AND ce.estado='Asignado') as num_empleados
      FROM rrhh_contratos_obra c
      LEFT JOIN fincas f ON c.id_finca = f.id_finca
      LEFT JOIN lotes l ON c.id_lote = l.id_lote
      LEFT JOIN rrhh_empleados e ON c.id_responsable = e.id_empleado
      LEFT JOIN terceros t ON e.id_tercero = t.id_tercero
      LEFT JOIN rrhh_empleados ed ON c.id_director = ed.id_empleado
      LEFT JOIN terceros td ON ed.id_tercero = td.id_tercero
      WHERE c.id_tenant = ? AND c.estado != 'Eliminado'
    `;
    let params = [tid];
    if (fincaId && fincaId !== 'Todas') { query += ' AND c.id_finca = ?'; params.push(fincaId); }
    if (req.query.responsableId) { query += ' AND c.id_responsable = ?'; params.push(req.query.responsableId); }
    if (req.query.categoria && req.query.categoria !== 'Todas') { query += ' AND c.categoria = ?'; params.push(req.query.categoria); }
    if (req.query.estado && req.query.estado !== 'Todos') { query += ' AND c.estado = ?'; params.push(req.query.estado); }
    if (req.query.fechaDesde) { query += ' AND c.fecha_inicio >= ?'; params.push(req.query.fechaDesde); }
    if (req.query.fechaHasta) { query += ' AND c.fecha_inicio <= ?'; params.push(req.query.fechaHasta); }

    query += ' ORDER BY c.fecha_inicio DESC';

    const [contratos] = await getDb(req).query(query, params);

    // Obtener empleados asignados
    for (let c of contratos) {
      const [empleados] = await getDb(req).query(`
        SELECT ce.*, t.nombre_completo, rc.descripcion AS cargo, t.documento
        FROM rrhh_contratos_empleados ce
        JOIN rrhh_empleados e ON ce.id_empleado = e.id_empleado
        JOIN terceros t ON e.id_tercero = t.id_tercero
        LEFT JOIN rrhh_cargos rc ON e.id_cargo = rc.id_cargo
        WHERE ce.id_contrato = ?
      `, [c.id_contrato]);
      c.empleados = empleados;
    }

    res.json(contratos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Crear nuevo contrato (POST)
router.post('/contratos', async (req, res) => {
  const { tenantId, finca_id, id_lote, ubicacion_detalle, id_responsable, id_director, nombre_obra, categoria, fecha_inicio, fecha_fin, valor_total, observaciones } = req.body;
  const tid = tenantId || 1;
  try {
    const [result] = await getDb(req).query(`
      INSERT INTO rrhh_contratos_obra 
      (id_tenant, id_finca, id_lote, ubicacion_detalle, id_responsable, id_director, nombre_obra, categoria, fecha_inicio, fecha_fin, valor_total, total_abonado, saldo_pendiente, observaciones, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'Activo')
    `, [tid, finca_id || null, id_lote || null, ubicacion_detalle || null, id_responsable || null, id_director || null, nombre_obra, categoria, fecha_inicio || new Date().toISOString().split('T')[0], fecha_fin || null, valor_total || 0, valor_total || 0, observaciones || null]);
    res.json({ success: true, id_contrato: result.insertId });
  } catch (err) {
    console.error('Error creating contrato:', err);
    res.status(500).json({ error: err.message });
  }
});

// Modificar contrato (PUT)
router.put('/contratos/:id', async (req, res) => {
  const { id } = req.params;
  const { finca_id, id_lote, ubicacion_detalle, id_responsable, id_director, nombre_obra, categoria, fecha_inicio, fecha_fin, valor_total, observaciones, estado } = req.body;
  try {
    // Calculamos el nuevo saldo pendiente asumiendo que ya hay algo abonado
    // Se requiere traer el total abonado primero
    const [curr] = await getDb(req).query('SELECT total_abonado FROM rrhh_contratos_obra WHERE id_contrato = ?', [id]);
    if(curr.length === 0) return res.status(404).json({ error: 'Not found' });
    const abonado = Number(curr[0].total_abonado);
    const saldo = (valor_total || 0) - abonado;

    await getDb(req).query(`
      UPDATE rrhh_contratos_obra 
      SET id_finca=?, id_lote=?, ubicacion_detalle=?, id_responsable=?, id_director=?, nombre_obra=?, categoria=?, fecha_inicio=?, fecha_fin=?, valor_total=?, saldo_pendiente=?, observaciones=?, estado=?
      WHERE id_contrato = ?
    `, [finca_id || null, id_lote || null, ubicacion_detalle || null, id_responsable || null, id_director || null, nombre_obra, categoria, fecha_inicio, fecha_fin || null, valor_total || 0, saldo, observaciones || null, estado || 'Activo', id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating contrato:', err);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar contrato lógico (DELETE)
router.delete('/contratos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await getDb(req).query(`UPDATE rrhh_contratos_obra SET estado='Eliminado' WHERE id_contrato = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting contrato:', err);
    res.status(500).json({ error: err.message });
  }
});

// Listar pagos de un contrato
router.get('/contratos/:id/pagos', async (req, res) => {
  const { id } = req.params;
  try {
    const [pagos] = await getDb(req).query(`
      SELECT * FROM rrhh_contratos_pagos 
      WHERE id_contrato = ? 
      ORDER BY fecha_pago DESC, created_at DESC
    `, [id]);
    res.json(pagos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Registrar pago a contrato y asiento contable
router.post('/contratos/pagos', async (req, res) => {
  const { tenantId, id_contrato, fecha_pago, monto, tipo_pago, observaciones } = req.body;
  const tid = tenantId || 1;
  const connection = await getDb(req).getConnection();
  try {
    await connection.beginTransaction();

    // 1. Validar contrato
    const [contratos] = await connection.query('SELECT * FROM rrhh_contratos_obra WHERE id_contrato = ?', [id_contrato]);
    if (contratos.length === 0) throw new Error('Contrato no encontrado');
    const contrato = contratos[0];

    // 2. Insertar Pago
    const [resultPago] = await connection.query(`
      INSERT INTO rrhh_contratos_pagos (id_contrato, fecha_pago, monto, tipo_pago, observaciones)
      VALUES (?, ?, ?, ?, ?)
    `, [id_contrato, fecha_pago, monto, tipo_pago, observaciones]);
    const idPago = resultPago.insertId;

    // 3. Actualizar Saldos del Contrato
    const nuevoAbonado = Number(contrato.total_abonado) + Number(monto);
    const nuevoSaldo = Number(contrato.valor_total) - nuevoAbonado;
    let nuevoEstado = contrato.estado;
    if (nuevoSaldo <= 0 && tipo_pago === 'Liquidacion Final') {
      nuevoEstado = 'Liquidado';
    }
    
    await connection.query(`
      UPDATE rrhh_contratos_obra 
      SET total_abonado = ?, saldo_pendiente = ?, estado = ?
      WHERE id_contrato = ?
    `, [nuevoAbonado, nuevoSaldo, nuevoEstado, id_contrato]);

    // 4. Crear Asiento Contable (Comprobante de Egreso)
    const suffix = Date.now().toString().slice(-4);
    const glosa = `Pago (${tipo_pago}) a Contrato #${id_contrato} - ${contrato.nombre_obra}`;
    
    const [compEgreso] = await connection.query(`
      INSERT INTO contab_comprobantes (id_tenant, id_periodo, id_tipo_comp, numero, descripcion, estado, fecha_creacion)
      VALUES (?, 1, 3, ?, ?, 'Abierto', CURDATE())
    `, [tid, 'CE-CONTRATO-' + suffix, glosa]);
    const idCompEgreso = compEgreso.insertId;

    const [docContabEgreso] = await connection.query(`
      INSERT INTO contab_documentos (id_tenant, id_comprobante, id_tipo_doc, numero_doc, fecha, concepto, estado)
      VALUES (?, ?, 3, ?, CURDATE(), ?, 'Aprobado')
    `, [tid, idCompEgreso, 'DOC-EGRESO-CONTRATO-' + suffix, glosa]);
    const idDocContabEgreso = docContabEgreso.insertId;

    // Vincular asiento al pago (usaremos id_asiento para guardar el id del comprobante)
    await connection.query('UPDATE rrhh_contratos_pagos SET id_asiento = ? WHERE id_pago = ?', [idCompEgreso, idPago]);

    // 5. Detalles del Asiento
    // Gasto operativo al DEBE (cuenta de gastos, asumimos id 4)
    // Caja/Bancos al HABER (cuenta de bancos, asumimos id 1)
    await connection.query(`
      INSERT INTO contab_detalles (id_documento, id_cuenta, descripcion, debito, credito)
      VALUES (?, 4, ?, ?, 0),
             (?, 1, ?, 0, ?)
    `, [idDocContabEgreso, 'Gasto Operativo - ' + glosa, monto, 
        idDocContabEgreso, 'Salida Bancos - ' + glosa, monto]);

    await connection.commit();
    res.json({ success: true, idPago, idAsiento: idCompEgreso, nuevoAbonado, nuevoSaldo });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Pre-Liquidación Automática de Nómina
router.get('/pre-liquidacion', async (req, res) => {
  const { tenantId, fincaId, ciclo, fecha_inicio, fecha_fin } = req.query;
  const tid = tenantId || 1;
  
  try {
    let empQuery = `
      SELECT e.id_empleado, t.nombre_completo, t.documento, rc.descripcion, e.salario_base, rc.nombre as cargo_nombre
      FROM rrhh_empleados e
      JOIN terceros t ON e.id_tercero = t.id_tercero
      LEFT JOIN rrhh_cargos rc ON e.id_cargo = rc.id_cargo
      WHERE e.id_tenant = ? AND e.estado = 'Activo'
    `;
    let empParams = [tid];
    if (fincaId) { empQuery += ' AND e.id_finca = ?'; empParams.push(fincaId); }
    
    const [empleados] = await getDb(req).query(empQuery, empParams);

    // Obtener vacaciones activas
    const [vacaciones] = await getDb(req).query(`
      SELECT id_empleado FROM rrhh_vacaciones_programacion
      WHERE estado = 'En Curso' OR (estado = 'Programada' AND fecha_inicio <= ? AND fecha_fin >= ?)
    `, [fecha_fin || new Date(), fecha_inicio || new Date()]);
    const empsEnVacaciones = new Set(vacaciones.map(v => v.id_empleado));

    const resultados = [];

    for (let emp of empleados) {
      if (empsEnVacaciones.has(emp.id_empleado)) {
        continue; // Omite si está de vacaciones
      }

      let dias_trabajados = 0;
      let total_devengos = 0;
      let total_deducciones = 0;
      let detalle_calculos = [];
      let es_contrato = false;
      let id_contrato = null;

      if (ciclo === 'Contratos') {
        const [contratos] = await getDb(req).query(`
          SELECT c.id_contrato, c.nombre_obra, c.saldo_pendiente, c.valor_total
          FROM rrhh_contratos_obra c
          JOIN rrhh_contratos_empleados ce ON c.id_contrato = ce.id_contrato
          WHERE ce.id_empleado = ? AND c.estado = 'Activo'
          LIMIT 1
        `, [emp.id_empleado]);

        if (contratos.length > 0) {
          es_contrato = true;
          id_contrato = contratos[0].id_contrato;
          dias_trabajados = 15;
          const pago_avance = Math.round(Number(contratos[0].valor_total) * 0.20);
          total_devengos = pago_avance;
          detalle_calculos.push(`Avance de Obra: ${contratos[0].nombre_obra} (20%) - $${pago_avance}`);
        } else {
          continue; 
        }
      } else if (ciclo === 'Liquidacion') {
        dias_trabajados = 360; // Simulación: Año completo
        const sueldo = Number(emp.salario_base);
        const prima = Math.round(sueldo / 2); // Medio sueldo
        const cesantias = sueldo; // 1 mes por año
        const intereses = Math.round(cesantias * 0.12);
        const vacacionesLiq = Math.round(sueldo / 2);

        total_devengos = prima + cesantias + intereses + vacacionesLiq;
        detalle_calculos.push(`Cesantías - $${cesantias}`);
        detalle_calculos.push(`Prima - $${prima}`);
        detalle_calculos.push(`Intereses a las Cesantías - $${intereses}`);
        detalle_calculos.push(`Vacaciones no disfrutadas - $${vacacionesLiq}`);
      } else {
        dias_trabajados = ciclo === 'Semanal' ? 7 : (ciclo === 'Quincenal' ? 15 : 30);
        total_devengos = Math.round((Number(emp.salario_base) / 30) * dias_trabajados);
        detalle_calculos.push(`Salario Base Proporcional (${dias_trabajados} días)`);
        
        total_deducciones = Math.round(total_devengos * 0.08);
        detalle_calculos.push(`Deducción Salud y Pensión (8%) - $${total_deducciones}`);
        
        if (emp.bono_productividad && Number(emp.bono_productividad) > 0) {
          const bono = Number(emp.bono_productividad);
          total_devengos += bono;
          detalle_calculos.push(`Bono Productividad - $${bono}`);
        }

        // Buscar labores de campo completadas y no liquidadas en la quincena
        const [laboresCampo] = await getDb(req).query(`
          SELECT l.*, c.tarifa_base, c.unidad_medida, c.nombre as labor_catalogo_nombre
          FROM labores_diarias l
          LEFT JOIN rrhh_catalogo_labores c ON l.id_catalogo_labor = c.id_labor_catalogo
          WHERE l.id_empleado = ? 
            AND l.estado = 'Completada' 
            AND l.id_planilla IS NULL
            AND DATE(l.fecha_completado) >= ? AND DATE(l.fecha_completado) <= ?
        `, [emp.id_empleado, fecha_inicio || '1900-01-01', fecha_fin || '2100-01-01']);

        let pago_labores = 0;
        for (const labor of laboresCampo) {
          let monto_labor = 0;
          // Si no tiene tarifa en catálogo, asumimos 0 para que Recursos Humanos le asigne
          let tarifa = Number(labor.tarifa_base || 0); 
          let unidad = labor.unidad_medida || 'Jornal';
          
          if (labor.horas_trabajadas > 0) {
            if (unidad === 'Hora') {
              monto_labor = tarifa * Number(labor.horas_trabajadas);
            } else if (unidad === 'Jornal') {
              monto_labor = (tarifa / 8) * Number(labor.horas_trabajadas);
            } else {
              monto_labor = tarifa * Number(labor.horas_trabajadas);
            }
          } else if (labor.cantidad_producida > 0) {
            monto_labor = tarifa * Number(labor.cantidad_producida);
          } else {
            // Si no hay horas ni destajo, se asume pago completo base
            monto_labor = tarifa;
          }

          pago_labores += monto_labor;
          const desc = labor.labor_catalogo_nombre || labor.descripcion_labor || 'Labor sin nombre';
          detalle_calculos.push(`Campo: ${desc} ${labor.horas_trabajadas ? '('+labor.horas_trabajadas+' h)' : (labor.cantidad_producida ? '('+labor.cantidad_producida+' u)' : '')} - $${Math.round(monto_labor)}`);
        }
        
        total_devengos += Math.round(pago_labores);
      }

      resultados.push({
        id_empleado: emp.id_empleado,
        documento: emp.documento,
        nombre_completo: emp.nombre_completo,
        cargo: emp.cargo,
        salario_base: emp.salario_base,
        dias_trabajados,
        total_devengos,
        total_deducciones,
        neto_pagar: total_devengos - total_deducciones,
        detalle_calculos,
        es_contrato,
        id_contrato
      });
    }

    res.json(resultados);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
// Obtener historial de planillas (nóminas)
router.get('/historial-nominas', async (req, res) => {
  const { tenantId, ciclo } = req.query;
  const tid = tenantId || 1;
  let q = `
    SELECT p.*, f.nombre as finca_nombre 
    FROM rrhh_planillas_consolidadas p
    LEFT JOIN fincas f ON p.id_finca = f.id_finca
    WHERE p.id_tenant = ?
  `;
  const params = [tid];
  if (ciclo) {
    q += ' AND p.ciclo = ?';
    params.push(ciclo);
  }
  q += ' ORDER BY p.fecha_inicio DESC';
  
  try {
    const [rows] = await getDb(req).query(q, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Detalles de una planilla histórica
router.get('/historial-nominas/:id/detalles', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await getDb(req).query(`
      SELECT d.*, e.documento, COALESCE(e.nombres, t.nombre_completo) as nombre_completo, e.salario_base
      FROM rrhh_planillas_detalle d
      JOIN rrhh_empleados e ON d.id_empleado = e.id_empleado
      JOIN terceros t ON e.id_tercero = t.id_tercero
      WHERE d.id_planilla = ?
    `, [id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Desprendibles PDF
router.get('/historial-nominas/:id/desprendibles-pdf', async (req, res) => {
  const { id } = req.params;
  try {
    const [cabecera] = await getDb(req).query('SELECT * FROM rrhh_planillas_consolidadas WHERE id_planilla = ?', [id]);
    const planilla = cabecera[0] || {};

    const [detalles] = await getDb(req).query(`
      SELECT d.*, e.documento, COALESCE(e.nombres, t.nombre_completo) as nombre_completo, e.salario_base, t.documento as cc
      FROM rrhh_planillas_detalle d
      JOIN rrhh_empleados e ON d.id_empleado = e.id_empleado
      JOIN terceros t ON e.id_tercero = t.id_tercero
      WHERE d.id_planilla = ?
    `, [id]);

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Desprendibles_Planilla_${id}.pdf`);
    doc.pipe(res);

    detalles.forEach((d, i) => {
      // 2 comprobantes por página (par/impar)
      if (i % 2 === 0 && i > 0) doc.addPage();
      
      const startY = (i % 2 === 0) ? 40 : doc.page.height / 2 + 20;

      // Línea de corte si es el segundo de la página
      if (i % 2 !== 0) {
        doc.lineWidth(1).dash(5, { space: 5 }).moveTo(40, doc.page.height / 2).lineTo(doc.page.width - 40, doc.page.height / 2).stroke();
        doc.undash(); // Restaurar línea sólida
        doc.fontSize(8).text('---- ✂️ RECORTAR AQUÍ ----', doc.page.width / 2 - 60, doc.page.height / 2 - 5, { align: 'left' });
      }

      doc.y = startY;
      doc.fontSize(16).text('Comprobante de Pago de Nómina', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Empresa: SAS Agrícolas`);
      doc.text(`Planilla No: ${id}`);
      
      const fi = new Date(planilla.fecha_inicio);
      const ff = new Date(planilla.fecha_fin);
      const strFi = fi.toISOString().split('T')[0];
      const strFf = ff.toISOString().split('T')[0];
      const mesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

      function getWeekNumber(d) {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay()||7));
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
        return Math.ceil(( ( (date - yearStart) / 86400000) + 1)/7);
      }

      if (planilla.ciclo === 'Semanal') {
        const semana = getWeekNumber(ff);
        doc.text(`Nómina Semanal - Semana #${semana} (${strFi} al ${strFf})`);
      } else if (planilla.ciclo === 'Quincenal') {
        const mes = ff.getMonth();
        const quincenaDelAño = (mes * 2) + (ff.getDate() <= 15 ? 1 : 2);
        const quincenaDelMes = ff.getDate() <= 15 ? '1ra' : '2da';
        doc.text(`Nómina Quincenal - Quincena #${quincenaDelAño} del Año (${quincenaDelMes} de ${mesNombres[mes]})`);
        doc.text(`Periodo: ${strFi} al ${strFf}`);
      } else if (planilla.ciclo === 'Mensual') {
        const mes = ff.getMonth();
        doc.text(`Nómina Mensual - Mes #${mes + 1} (${mesNombres[mes]} ${ff.getFullYear()})`);
        doc.text(`Periodo: ${strFi} al ${strFf}`);
      } else {
        doc.text(`Nómina ${planilla.ciclo || 'General'} (${strFi} al ${strFf})`);
      }
      
      doc.moveDown(0.5);
      doc.text(`Empleado: ${d.nombre_completo}`);
      doc.text(`Documento: ${d.cc}`);
      doc.text(`Días Trabajados: ${d.dias_trabajados}`);
      doc.moveDown(0.5);
      doc.text(`Total Devengado: $${Number(d.total_devengos).toLocaleString()}`);
      doc.text(`Total Deducido: $${Number(d.total_deducciones).toLocaleString()}`);
      doc.fontSize(12).font('Helvetica-Bold').text(`Neto Pagado: $${Number(d.neto_pagar).toLocaleString()}`);
      doc.moveDown(1.5);
      doc.fontSize(8).font('Helvetica').text('___________________________________');
      doc.text('Firma del Empleado');
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Reporte Bancario PDF
router.get('/historial-nominas/:id/reporte-bancario-pdf', async (req, res) => {
  const { id } = req.params;
  try {
    const [detalles] = await getDb(req).query(`
      SELECT d.*, e.documento, COALESCE(e.nombres, t.nombre_completo) as nombre_completo, e.cuenta_bancaria, e.banco
      FROM rrhh_planillas_detalle d
      JOIN rrhh_empleados e ON d.id_empleado = e.id_empleado
      JOIN terceros t ON e.id_tercero = t.id_tercero
      WHERE d.id_planilla = ?
    `, [id]);

    const doc = new PDFDocument({ 
      margin: 40,
      userPassword: 'Bancolombia2026', // Contraseña para abrir
      ownerPassword: 'Bancolombia2026' // Contraseña de propietario
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Reporte_Bancario_Planilla_${id}.pdf`);
    doc.pipe(res);

    // Encabezado Corporativo
    doc.fontSize(24).font('Helvetica-Bold').text('SAS AGRÍCOLAS S.A.', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('NIT: 900.123.456-7', { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(18).text('Autorización de Dispersión Bancaria', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Planilla de Nómina No: ${id}`);
    doc.moveDown();

    let total = 0;
    detalles.forEach(d => {
      doc.fontSize(10).text(`${d.nombre_completo} - ${d.banco || 'Bancolombia'} Cta: ${d.cuenta_bancaria || 'Sin Cuenta Registrada'} - $${Number(d.neto_pagar).toLocaleString()}`);
      total += Number(d.neto_pagar);
    });

    doc.moveDown();
    doc.fontSize(14).font('Helvetica-Bold').text(`Gran Total a Dispersar: $${total.toLocaleString()}`);
    doc.moveDown(4);
    doc.fontSize(10).font('Helvetica').text('___________________________________');
    doc.text('Firma Gerencia / Autorización');

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Sábana de Nómina Maestra PDF
router.get('/historial-nominas/:id/planilla-maestra-pdf', async (req, res) => {
  const { id } = req.params;
  try {
    const [cabecera] = await getDb(req).query('SELECT * FROM rrhh_planillas_consolidadas WHERE id_planilla = ?', [id]);
    const planilla = cabecera[0] || {};

    const [detalles] = await getDb(req).query(`
      SELECT d.*, e.documento, COALESCE(e.nombres, t.nombre_completo) as nombre_completo, e.salario_base, t.documento as cc
      FROM rrhh_planillas_detalle d
      JOIN rrhh_empleados e ON d.id_empleado = e.id_empleado
      JOIN terceros t ON e.id_tercero = t.id_tercero
      WHERE d.id_planilla = ?
    `, [id]);

    // Usar tamaño LEGAL en apaisado para máximo espacio
    const doc = new PDFDocument({ margin: 20, size: 'LEGAL', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Sabana_Nomina_Planilla_${id}.pdf`);
    doc.pipe(res);

    // Encabezado Corporativo
    doc.fontSize(22).font('Helvetica-Bold').text('SAS AGRÍCOLAS S.A.', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('SISTEMA INTEGRADO DE NÓMINA Y COSTOS', { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(14).font('Helvetica-Bold').text(`SÁBANA DE NÓMINA GENERAL - PLANILLA #${id}`, { align: 'center' });
    
    const fi = new Date(planilla.fecha_inicio);
    const ff = new Date(planilla.fecha_fin);
    const strFi = fi.toISOString().split('T')[0];
    const strFf = ff.toISOString().split('T')[0];
    const mesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    function getWeekNumber(d) {
      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay()||7));
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
      return Math.ceil(( ( (date - yearStart) / 86400000) + 1)/7);
    }

    doc.fontSize(11).font('Helvetica');
    if (planilla.ciclo === 'Semanal') {
      const semana = getWeekNumber(ff);
      doc.text(`Semana Año: #${semana}  |  Periodo: ${strFi} al ${strFf}`, { align: 'center' });
    } else if (planilla.ciclo === 'Quincenal') {
      const mes = ff.getMonth();
      const quincenaDelAño = (mes * 2) + (ff.getDate() <= 15 ? 1 : 2);
      const quincenaDelMes = ff.getDate() <= 15 ? '1ra' : '2da';
      doc.text(`Quincena #${quincenaDelAño} del Año (${quincenaDelMes} de ${mesNombres[mes]})  |  Periodo: ${strFi} al ${strFf}`, { align: 'center' });
    } else if (planilla.ciclo === 'Mensual') {
      const mes = ff.getMonth();
      doc.text(`Mes #${mes + 1} (${mesNombres[mes]} ${ff.getFullYear()})  |  Periodo: ${strFi} al ${strFf}`, { align: 'center' });
    } else {
      doc.text(`Periodo: ${strFi} al ${strFf}`, { align: 'center' });
    }
    
    doc.moveDown(1.5);

    // Configuración de columnas (Ancho total LEGAL landscape: 1008, márgenes 20 -> ancho útil 968)
    // Doc(90), Empleado(220), Salario(90), Días(50), Devengos(100), Deducciones(100), Neto(110), Firma(200)
    const cols = [
      { x: 20, w: 80, name: 'Cédula', align: 'left' },
      { x: 100, w: 200, name: 'Trabajador', align: 'left' },
      { x: 300, w: 90, name: 'Sueldo Base', align: 'right' },
      { x: 390, w: 50, name: 'Días', align: 'center' },
      { x: 440, w: 100, name: '+ Devengado / Labores', align: 'right' },
      { x: 540, w: 100, name: '- Deducciones', align: 'right' },
      { x: 640, w: 120, name: '= Neto Pagado', align: 'right' },
      { x: 760, w: 200, name: 'Firma de Conformidad', align: 'center' }
    ];

    // Fondo gris para encabezado de tabla
    const tableTop = doc.y;
    doc.rect(20, tableTop - 5, 968, 25).fill('#e2e8f0');
    doc.fillColor('#1e293b');

    // Imprimir Títulos de Columnas
    doc.fontSize(9).font('Helvetica-Bold');
    cols.forEach(c => {
      doc.text(c.name, c.x, tableTop, { width: c.w, align: c.align });
    });
    
    let currentY = tableTop + 25;
    let totalDevengos = 0;
    let totalDeducciones = 0;
    let totalNeto = 0;
    
    doc.font('Helvetica');
    
    detalles.forEach((d, i) => {
      if (currentY > 550) { // Si pasa el alto de la hoja legal apaisada
        doc.addPage();
        currentY = 40;
        doc.rect(20, currentY - 5, 968, 25).fill('#e2e8f0');
        doc.fillColor('#1e293b').font('Helvetica-Bold');
        cols.forEach(c => doc.text(c.name, c.x, currentY, { width: c.w, align: c.align }));
        currentY += 25;
        doc.font('Helvetica');
      }

      // Dibujar fondo alternado para facilitar lectura
      if (i % 2 === 0) {
        doc.rect(20, currentY - 5, 968, 20).fill('#f8fafc');
        doc.fillColor('#334155');
      } else {
        doc.fillColor('#334155');
      }

      // Datos de fila
      doc.text(d.cc, cols[0].x, currentY, { width: cols[0].w, align: cols[0].align });
      doc.text(d.nombre_completo.substring(0, 35), cols[1].x, currentY, { width: cols[1].w, align: cols[1].align });
      doc.text(`$${Number(d.salario_base || 0).toLocaleString()}`, cols[2].x, currentY, { width: cols[2].w, align: cols[2].align });
      doc.text(d.dias_trabajados.toString(), cols[3].x, currentY, { width: cols[3].w, align: cols[3].align });
      doc.text(`$${Number(d.total_devengos).toLocaleString()}`, cols[4].x, currentY, { width: cols[4].w, align: cols[4].align });
      doc.text(`$${Number(d.total_deducciones).toLocaleString()}`, cols[5].x, currentY, { width: cols[5].w, align: cols[5].align });
      
      doc.font('Helvetica-Bold').fillColor('#10b981'); // Verde para el neto
      doc.text(`$${Number(d.neto_pagar).toLocaleString()}`, cols[6].x, currentY, { width: cols[6].w, align: cols[6].align });
      
      doc.font('Helvetica').fillColor('#94a3b8');
      doc.text('_____________________________', cols[7].x, currentY, { width: cols[7].w, align: cols[7].align });
      
      totalDevengos += Number(d.total_devengos);
      totalDeducciones += Number(d.total_deducciones);
      totalNeto += Number(d.neto_pagar);
      
      currentY += 20;
    });

    // Fila de Totales Generales
    currentY += 10;
    doc.rect(20, currentY - 5, 968, 30).fill('#1e293b'); // Fondo oscuro
    doc.fillColor('#ffffff').font('Helvetica-Bold');
    doc.text('TOTALES GENERALES PLANILLA', cols[1].x, currentY, { width: cols[1].w, align: 'right' });
    doc.text(`$${totalDevengos.toLocaleString()}`, cols[4].x, currentY, { width: cols[4].w, align: cols[4].align });
    doc.text(`$${totalDeducciones.toLocaleString()}`, cols[5].x, currentY, { width: cols[5].w, align: cols[5].align });
    doc.text(`$${totalNeto.toLocaleString()}`, cols[6].x, currentY, { width: cols[6].w, align: cols[6].align });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// WhatsApp
router.post('/historial-nominas/:id/whatsapp', async (req, res) => {
  // Lógica mockeada de WhatsApp para la demo
  setTimeout(() => {
    res.json({ success: true, message: 'Notificaciones enviadas.' });
  }, 1000);
});

// Guardar/Generar Planilla
router.post('/generar', async (req, res) => {
  const { tenantId, fincaId, ciclo, fecha_inicio, fecha_fin, detalles } = req.body;
  const connection = await getDb(req).getConnection();
  try {
    await connection.beginTransaction();

    let total_devengado = 0;
    let total_deducido = 0;
    let total_neto = 0;
    let abonos_por_contrato = {};

    detalles.forEach(d => {
      total_devengado += Number(d.total_devengos);
      total_deducido += Number(d.total_deducciones);
      total_neto += Number(d.neto_pagar);
      
      if (d.id_contrato) {
        if (!abonos_por_contrato[d.id_contrato]) abonos_por_contrato[d.id_contrato] = 0;
        abonos_por_contrato[d.id_contrato] += Number(d.neto_pagar);
      }
    });

    const [resPlanilla] = await connection.query(`
      INSERT INTO rrhh_planillas_consolidadas 
      (id_tenant, id_finca, ciclo, fecha_inicio, fecha_fin, total_devengado, total_deducido, total_neto, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Aprobada')
    `, [tenantId, fincaId || null, ciclo, fecha_inicio, fecha_fin, total_devengado, total_deducido, total_neto]);
    
    const idPlanilla = resPlanilla.insertId;

    for (let d of detalles) {
      await connection.query(`
        INSERT INTO rrhh_planillas_detalle 
        (id_planilla, id_empleado, dias_trabajados, salario_base, total_devengos, total_deducciones, neto_pagar)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [idPlanilla, d.id_empleado, d.dias_trabajados, d.salario_base, d.total_devengos, d.total_deducciones, d.neto_pagar]);

      // Prevenir doble pago y asignar costo real a la labor
      const [labores_a_pagar] = await connection.query(`
          SELECT l.id_labor, l.horas_trabajadas, l.cantidad_producida, c.tarifa_base, c.unidad_medida
          FROM labores_diarias l
          LEFT JOIN rrhh_catalogo_labores c ON l.id_catalogo_labor = c.id_labor_catalogo
          WHERE l.id_empleado = ? 
            AND l.estado = 'Completada' 
            AND l.id_planilla IS NULL
            AND DATE(l.fecha_completado) >= ? AND DATE(l.fecha_completado) <= ?
      `, [d.id_empleado, fecha_inicio || '1900-01-01', fecha_fin || '2100-01-01']);

      for (const labor of labores_a_pagar) {
          let monto_labor = 0;
          let tarifa = Number(labor.tarifa_base || 0); 
          let unidad = labor.unidad_medida || 'Jornal';
          
          if (labor.horas_trabajadas > 0) {
            if (unidad === 'Hora') monto_labor = tarifa * Number(labor.horas_trabajadas);
            else if (unidad === 'Jornal') monto_labor = (tarifa / 8) * Number(labor.horas_trabajadas);
            else monto_labor = tarifa * Number(labor.horas_trabajadas);
          } else if (labor.cantidad_producida > 0) {
            monto_labor = tarifa * Number(labor.cantidad_producida);
          } else {
            monto_labor = tarifa;
          }

          await connection.query(`
            UPDATE labores_diarias 
            SET id_planilla = ?, costo_mano_obra = ? 
            WHERE id_labor = ?
          `, [idPlanilla, monto_labor, labor.id_labor]);
      }

      // Si es Liquidación Definitiva, retirar empleado
      if (ciclo === 'Liquidacion') {
        await connection.query(`UPDATE rrhh_empleados SET estado = 'Inactivo' WHERE id_empleado = ?`, [d.id_empleado]);
      }
    }

    for (const [id_contrato, abono] of Object.entries(abonos_por_contrato)) {
      await connection.query(`
        UPDATE rrhh_contratos_obra 
        SET total_abonado = total_abonado + ?,
            saldo_pendiente = valor_total - (total_abonado)
        WHERE id_contrato = ?
      `, [abono, id_contrato]);
    }

    await connection.commit();
    res.json({ success: true, id_planilla: idPlanilla, message: 'Planilla generada y guardada.' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Contabilizar Planilla (Cierre)
router.post('/planillas/:id/contabilizar', async (req, res) => {
  const { id } = req.params;
  const connection = await getDb(req).getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener datos de la planilla
    const [planillas] = await connection.query('SELECT * FROM rrhh_planillas_consolidadas WHERE id_planilla = ? AND estado != "Contabilizada"', [id]);
    if (planillas.length === 0) throw new Error('Planilla no existe o ya está contabilizada.');
    const p = planillas[0];

    // 2. Buscar plantilla contable según ciclo
    let tipoPlantilla = p.ciclo; 
    if (tipoPlantilla === 'Semanal') tipoPlantilla = 'Quincenal'; // Mapeo temporal para usar la misma
    const [tpls] = await connection.query('SELECT id_plantilla FROM rrhh_plantillas_contables WHERE id_tenant = ? AND tipo_planilla = ?', [p.id_tenant, tipoPlantilla]);
    if (tpls.length === 0) throw new Error(`No existe plantilla contable PUC para el ciclo: ${tipoPlantilla}`);

    // 3. Crear encabezado documento contable
    const [resDoc] = await connection.query(`
      INSERT INTO contab_documentos (id_tenant, id_tipo_doc, numero_doc, fecha, concepto, estado, tabla_origen, id_origen)
      VALUES (?, 1, ?, ?, ?, 'Aprobado', 'rrhh_planillas_consolidadas', ?)
    `, [p.id_tenant, `NOM-${p.id_planilla}`, new Date(), `Causación Nómina Ciclo ${p.ciclo} Planilla #${p.id_planilla}`, p.id_planilla]);
    
    const idDoc = resDoc.insertId;

    // 4. Leer cuentas de la plantilla contable
    const [detallesTpl] = await connection.query(`
      SELECT d.*, c.codigo FROM rrhh_plantillas_contables_detalles d
      JOIN plan_contable c ON d.id_cuenta = c.id_cuenta
      WHERE d.id_plantilla = ?
    `, [tpls[0].id_plantilla]);

    // 5. Mapeo simplificado y registro contable
    for (let dt of detallesTpl) {
      let monto = 0;
      if (dt.concepto === 'Salud' || dt.concepto === 'Pension') monto = Math.round(Number(p.total_deducido) / 2);
      else if (dt.concepto === 'Sueldos por Pagar') monto = Number(p.total_neto);
      else monto = Number(p.total_devengado); // Para simplificar, arrojamos total devengos a Salarios o Avance o Liquidación

      if (monto > 0) {
        await connection.query(`
          INSERT INTO contab_detalles (id_documento, id_cuenta, id_tercero, descripcion, debito, credito)
          VALUES (?, ?, NULL, ?, ?, ?)
        `, [idDoc, dt.id_cuenta, `Registro Nómina ${p.ciclo}`, 
            dt.naturaleza === 'Debito' ? monto : 0, 
            dt.naturaleza === 'Credito' ? monto : 0]);
      }
    }

    // 6. Cambiar estado
    await connection.query('UPDATE rrhh_planillas_consolidadas SET estado = "Contabilizada" WHERE id_planilla = ?', [id]);

    await connection.commit();
    res.json({ success: true, message: `Planilla contabilizada exitosamente (Asiento #${idDoc})` });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Programación de Vacaciones
router.get('/vacaciones', async (req, res) => {
  const { tenantId, empleadoId, fechaDesde, fechaHasta } = req.query;
  try {
    let sql = `
      SELECT v.*, t.nombre_completo, rc.descripcion AS cargo, f.nombre AS finca_nombre
      FROM rrhh_vacaciones_programacion v
      JOIN rrhh_empleados e ON v.id_empleado = e.id_empleado
      JOIN terceros t ON e.id_tercero = t.id_tercero
      LEFT JOIN rrhh_cargos rc ON e.id_cargo = rc.id_cargo
      LEFT JOIN fincas f ON e.id_finca = f.id_finca
      WHERE e.id_tenant = ?
    `;
    const params = [tenantId || 1];

    if (empleadoId) {
      sql += ` AND v.id_empleado = ?`;
      params.push(empleadoId);
    }
    if (fechaDesde) {
      sql += ` AND v.fecha_inicio >= ?`;
      params.push(fechaDesde);
    }
    if (fechaHasta) {
      sql += ` AND v.fecha_fin <= ?`;
      params.push(fechaHasta);
    }

    sql += ` ORDER BY v.fecha_inicio DESC`;
    
    const [rows] = await getDb(req).query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Crear Programación de Vacaciones (POST)
router.post('/vacaciones', async (req, res) => {
  const { tenantId, vacacion } = req.body;
  if (!vacacion) return res.status(400).json({ error: 'Vacacion data required' });
  try {
    const fields = Object.keys(vacacion);
    const placeholders = fields.map(() => '?').join(', ');
    const values = fields.map(f => vacacion[f]);
    const sql = `INSERT INTO rrhh_vacaciones_programacion (${fields.join(', ')}) VALUES (${placeholders})`;
    const [result] = await getDb(req).query(sql, values);
    res.json({ success: true, id_vacacion: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener planillas pendientes de pago (Contabilizadas) o ya Pagadas
router.get('/pagos', async (req, res) => {
  const { tenantId, fincaId, estado } = req.query;
  const tid = tenantId || 1;
  try {
    let query = `
      SELECT p.*, f.nombre as finca_nombre 
      FROM rrhh_planillas_consolidadas p
      LEFT JOIN fincas f ON p.id_finca = f.id_finca
      WHERE p.id_tenant = ? AND p.estado IN ('Contabilizada', 'Pagada')
    `;
    let params = [tid];
    if (fincaId) { query += ' AND p.id_finca = ?'; params.push(fincaId); }
    if (estado) { query += ' AND p.estado = ?'; params.push(estado); }

    const [planillas] = await getDb(req).query(query, params);
    
    // Obtener número de empleados por planilla para resumen
    for(let p of planillas) {
      const [empCount] = await getDb(req).query(`SELECT COUNT(*) as cant FROM rrhh_planillas_detalle WHERE id_planilla = ?`, [p.id_planilla]);
      p.num_empleados = empCount[0].cant;
    }

    res.json(planillas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ejecutar Pago de Planilla (Genera Comprobante Egreso)
router.post('/pagos/:id/ejecutar', async (req, res) => {
  const { id } = req.params;
  const { cuenta_origen_id } = req.body; // id de la cuenta de Banco o Caja
  
  const connection = await getDb(req).getConnection();
  try {
    await connection.beginTransaction();

    const [planillas] = await connection.query('SELECT * FROM rrhh_planillas_consolidadas WHERE id_planilla = ? AND estado = "Contabilizada"', [id]);
    if (planillas.length === 0) throw new Error('Planilla no válida para pago (debe estar Contabilizada).');
    const p = planillas[0];

    // Buscar si existe el documento de causación original
    const [docs] = await connection.query('SELECT id_documento FROM contab_documentos WHERE numero_doc = ?', [`NOM-${id}`]);
    const docRelacionado = docs[0]?.id_documento || null;

    // Crear Egreso
    const [resDoc] = await connection.query(`
      INSERT INTO contab_documentos (id_tenant, id_tipo_doc, numero_doc, fecha, concepto, estado, tabla_origen, id_origen)
      VALUES (?, 2, ?, ?, ?, 'Aprobado', 'rrhh_planillas_consolidadas', ?)
    `, [p.id_tenant, `EGR-NOM-${id}`, new Date(), `Pago Nómina #${id}`, id]);
    const idEgreso = resDoc.insertId;

    // Obtener id de cuenta 250505 (Salarios por pagar)
    const [ctaPorPagar] = await connection.query('SELECT id_cuenta FROM plan_contable WHERE codigo = "250505" LIMIT 1');
    const idCtaPorPagar = ctaPorPagar[0].id_cuenta;

    // Detalle 1: Debito a Pasivo (Salarios por pagar disminuye)
    await connection.query(`
      INSERT INTO contab_detalles (id_documento, id_cuenta, descripcion, debito, credito)
      VALUES (?, ?, ?, ?, ?)
    `, [idEgreso, idCtaPorPagar, `Cancelación Nómina #${id}`, p.total_neto, 0]);

    // Detalle 2: Credito a Banco/Caja (Activo disminuye)
    await connection.query(`
      INSERT INTO contab_detalles (id_documento, id_cuenta, descripcion, debito, credito)
      VALUES (?, ?, ?, ?, ?)
    `, [idEgreso, cuenta_origen_id, `Giro Nómina #${id}`, 0, p.total_neto]);

    // Cambiar estado a Pagada
    await connection.query('UPDATE rrhh_planillas_consolidadas SET estado = "Pagada" WHERE id_planilla = ?', [id]);

    await connection.commit();
    res.json({ success: true, message: `Pago registrado exitosamente (Egreso #${idEgreso})` });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Generar Archivo Plano Banco (Ejemplo PAB Bancolombia)
router.get('/pagos/:id/archivo-banco', async (req, res) => {
  const { id } = req.params;
  try {
    const [detalles] = await getDb(req).query(`
      SELECT d.neto_pagar, t.documento, t.nombre_completo, t.banco, t.tipo_cuenta, t.numero_cuenta
      FROM rrhh_planillas_detalle d
      JOIN rrhh_empleados e ON d.id_empleado = e.id_empleado
      JOIN terceros t ON e.id_tercero = t.id_tercero
      WHERE d.id_planilla = ?
    `, [id]);

    if (detalles.length === 0) throw new Error('Planilla vacía o no encontrada.');

    // Construir estructura básica de archivo plano (Columnas separadas por comas para facilidad)
    let csvData = 'TIPO_DOCUMENTO,DOCUMENTO,NOMBRE_BENEFICIARIO,BANCO,TIPO_CUENTA,NUMERO_CUENTA,VALOR\n';
    
    for(let d of detalles) {
      const tipoCta = d.tipo_cuenta === 'Ahorros' ? 'S' : 'D'; // S=Savings, D=Checking
      const banco = d.banco || 'Bancolombia';
      const cta = d.numero_cuenta || '0000000000';
      csvData += `CC,${d.documento},${d.nombre_completo},${banco},${tipoCta},${cta},${d.neto_pagar}\n`;
    }

    res.setHeader('Content-disposition', `attachment; filename=PAB_Nomina_${id}.csv`);
    res.set('Content-Type', 'text/csv');
    res.status(200).send(csvData);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// MÓDULO: CATÁLOGO CENTRAL DE LABORES
// ==========================================

// Obtener todas las labores (con filtro opcional por categoría)
router.get('/catalogo-labores', async (req, res) => {
  const { tenantId, categoria } = req.query;
  const tid = tenantId || 1;
  try {
    let query = 'SELECT * FROM rrhh_catalogo_labores WHERE id_tenant = ?';
    const params = [tid];
    if (categoria) {
      query += ' AND categoria = ?';
      params.push(categoria);
    }
    query += ' ORDER BY categoria, nombre';
    const [rows] = await getDb(req).query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching catalogo labores:', err);
    res.status(500).json({ error: err.message });
  }
});

// Crear nueva labor
router.post('/catalogo-labores', async (req, res) => {
  const { tenantId, codigo, nombre, categoria, unidad_medida, tarifa_base, estado } = req.body;
  const tid = tenantId || 1;
  try {
    const [result] = await getDb(req).query(`
      INSERT INTO rrhh_catalogo_labores (id_tenant, codigo, nombre, categoria, unidad_medida, tarifa_base, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [tid, codigo, nombre, categoria, unidad_medida || 'Jornal', tarifa_base || 0, estado || 'Activo']);
    res.json({ success: true, id_labor_catalogo: result.insertId });
  } catch (err) {
    console.error('Error creating labor:', err);
    res.status(500).json({ error: err.message });
  }
});

// Actualizar labor
router.put('/catalogo-labores/:id', async (req, res) => {
  const { id } = req.params;
  const { codigo, nombre, categoria, unidad_medida, tarifa_base, estado } = req.body;
  try {
    await getDb(req).query(`
      UPDATE rrhh_catalogo_labores
      SET codigo=?, nombre=?, categoria=?, unidad_medida=?, tarifa_base=?, estado=?
      WHERE id_labor_catalogo = ?
    `, [codigo, nombre, categoria, unidad_medida, tarifa_base, estado, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating labor:', err);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar labor (físico o lógico si se prefiere, aquí hacemos físico por ser catálogo, o cambiar estado si hay FKs)
router.delete('/catalogo-labores/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Es más seguro hacer un borrado lógico en catálogos
    await getDb(req).query('UPDATE rrhh_catalogo_labores SET estado="Inactivo" WHERE id_labor_catalogo = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting labor:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// MÓDULO: PLANILLAS MANUALES
// ==========================================

router.get('/planillas-manuales', async (req, res) => {
  const { tenantId, fincaId } = req.query;
  const tid = tenantId || 1;
  try {
    let query = `
      SELECT p.*, f.nombre as finca_nombre,
        (SELECT COUNT(*) FROM rrhh_planillas_manuales_detalle d WHERE d.id_planilla = p.id_planilla) as num_detalles,
        (SELECT SUM(total) FROM rrhh_planillas_manuales_detalle d WHERE d.id_planilla = p.id_planilla) as total_planilla
      FROM rrhh_planillas_manuales p
      LEFT JOIN fincas f ON p.id_finca = f.id_finca
      WHERE p.id_tenant = ?
    `;
    const params = [tid];
    if (fincaId) {
      query += ' AND p.id_finca = ?';
      params.push(fincaId);
    }
    query += ' ORDER BY p.id_planilla DESC';
    const [rows] = await getDb(req).query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/planillas-manuales', async (req, res) => {
  const { tenantId, id_finca, tipo_planilla, fecha_inicio, fecha_fin } = req.body;
  const tid = tenantId || 1;
  try {
    // Compute week number if Semanal
    let num_semana = null;
    if (tipo_planilla === 'Semanal') {
      const date = new Date(fecha_inicio);
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
      num_semana = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }

    const [result] = await getDb(req).query(`
      INSERT INTO rrhh_planillas_manuales (id_tenant, id_finca, tipo_planilla, numero_semana, fecha_inicio, fecha_fin, estado)
      VALUES (?, ?, ?, ?, ?, ?, 'Abierta')
    `, [tid, id_finca || null, tipo_planilla, num_semana, fecha_inicio, fecha_fin]);
    res.json({ success: true, id_planilla: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/planillas-manuales/:id', async (req, res) => {
  const { id } = req.params;
  const { id_finca, tipo_planilla, fecha_inicio, fecha_fin, estado } = req.body;
  try {
    let num_semana = null;
    if (tipo_planilla === 'Semanal') {
      const date = new Date(fecha_inicio);
      num_semana = Math.ceil(((date - new Date(date.getFullYear(), 0, 1)) / 86400000 + new Date(date.getFullYear(), 0, 1).getDay() + 1) / 7);
    }
    await getDb(req).query(`
      UPDATE rrhh_planillas_manuales
      SET id_finca=?, tipo_planilla=?, numero_semana=?, fecha_inicio=?, fecha_fin=?, estado=?
      WHERE id_planilla = ? AND estado != 'Cerrada'
    `, [id_finca || null, tipo_planilla, num_semana, fecha_inicio, fecha_fin, estado || 'Abierta', id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/planillas-manuales/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await getDb(req).query('DELETE FROM rrhh_planillas_manuales WHERE id_planilla = ? AND estado = "Abierta"', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/planillas-manuales/:id/cerrar', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Lock the planilla
    await getDb(req).query('UPDATE rrhh_planillas_manuales SET estado="Cerrada", contabilizado=1 WHERE id_planilla = ?', [id]);
    
    // Aquí iría la lógica de integración con contabilidad buscando en rrhh_plantillas_contables
    // Simulado para este requerimiento:
    console.log(`Planilla ${id} cerrada y enviada a contabilidad.`);

    res.json({ success: true, message: 'Planilla cerrada y contabilizada.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Detalles de la Planilla Manual
router.get('/planillas-manuales/:id/detalles', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await getDb(req).query(`
      SELECT d.*, c.nombre as labor_nombre, c.codigo as labor_codigo, c.unidad_medida,
             e.nombres as emp_nombre, e.salario_base
      FROM rrhh_planillas_manuales_detalle d
      LEFT JOIN rrhh_catalogo_labores c ON d.id_labor_catalogo = c.id_labor_catalogo
      LEFT JOIN rrhh_empleados e ON d.id_empleado = e.id_empleado
      WHERE d.id_planilla = ?
    `, [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/planillas-manuales/:id/detalles', async (req, res) => {
  const { id } = req.params;
  const { id_empleado, id_maquinaria, id_labor_catalogo, fecha_labor, cantidad, tarifa } = req.body;
  const total = Number(cantidad) * Number(tarifa);
  try {
    const [result] = await getDb(req).query(`
      INSERT INTO rrhh_planillas_manuales_detalle (id_planilla, id_empleado, id_maquinaria, id_labor_catalogo, fecha_labor, cantidad, tarifa, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, id_empleado || null, id_maquinaria || null, id_labor_catalogo, fecha_labor, cantidad, tarifa, total]);
    res.json({ success: true, id_detalle: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/planillas-manuales/detalles/:idDetalle', async (req, res) => {
  const { idDetalle } = req.params;
  try {
    await getDb(req).query('DELETE FROM rrhh_planillas_manuales_detalle WHERE id_detalle = ?', [idDetalle]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// MÓDULO: CONFIGURACIÓN - DISTRIBUCIÓN CONTABLE
// ==========================================

router.get('/plantillas-contables', async (req, res) => {
  const { tenantId } = req.query;
  const tid = tenantId || 1;
  try {
    const [rows] = await getDb(req).query('SELECT * FROM rrhh_plantillas_contables WHERE id_tenant = ?', [tid]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/plantillas-contables', async (req, res) => {
  const { tenantId, tipo_planilla, descripcion, id_comprobante, cuenta_debito, cuenta_credito } = req.body;
  const tid = tenantId || 1;
  try {
    const [result] = await getDb(req).query(`
      INSERT INTO rrhh_plantillas_contables (id_tenant, tipo_planilla, descripcion, id_comprobante, cuenta_debito, cuenta_credito)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [tid, tipo_planilla, descripcion, id_comprobante || 3, cuenta_debito || '510506', cuenta_credito || '250505']);
    res.json({ success: true, id_plantilla: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/plantillas-contables/:id', async (req, res) => {
  const { id } = req.params;
  const { tipo_planilla, descripcion, id_comprobante, cuenta_debito, cuenta_credito } = req.body;
  try {
    await getDb(req).query(`
      UPDATE rrhh_plantillas_contables
      SET tipo_planilla=?, descripcion=?, id_comprobante=?, cuenta_debito=?, cuenta_credito=?
      WHERE id_plantilla=?
    `, [tipo_planilla, descripcion, id_comprobante, cuenta_debito, cuenta_credito, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/plantillas-contables/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await getDb(req).query('DELETE FROM rrhh_plantillas_contables_detalles WHERE id_plantilla = ?', [id]);
    await getDb(req).query('DELETE FROM rrhh_plantillas_contables WHERE id_plantilla = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
