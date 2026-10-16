import { Router } from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';
import { logAudit } from '../utils/audit.js';

const router = Router();

// ==========================================
// 1. CATÁLOGO DE MODELOS COMERCIALES
// ==========================================
router.get('/modelos', async (req, res) => {
  const db = getDb(req);
  try {
    const [rows] = await db.query(
      'SELECT * FROM modelos_drones_catalogo WHERE activo = 1 ORDER BY es_flagship DESC, marca ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. PILOTOS Y LICENCIAS AERONÁUTICAS (UAEAC / CAA)
// ==========================================
router.get('/pilotos', async (req, res) => {
  const db = getDb(req);
  try {
    const [rows] = await db.query(`
      SELECT p.*, e.nombres, e.apellidos, e.documento,
             CASE WHEN p.fecha_vencimiento_licencia < NOW() THEN 'Vencida' ELSE 'Vigente' END as estado_licencia
      FROM dron_licencias_pilotos p
      JOIN rrhh_empleados e ON p.empleado_id = e.id_empleado
      ORDER BY p.fecha_vencimiento_licencia DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. FLOTA DE EQUIPOS DRON (CRUD)
// ==========================================
router.get('/equipos', async (req, res) => {
  const db = getDb(req);
  const tenantId = req.user?.id_tenant || req.query.tenantId || 1;

  try {
    const [rows] = await db.query(`
      SELECT ed.*, m.codigo, m.nombre, m.estado_operativo, m.tenencia, m.id_finca, f.nombre as finca_nombre,
             c.marca, c.modelo, c.categoria as modelo_categoria, c.capacidad_liquido_litros, c.autonomia_minutos,
             (SELECT ROUND(AVG(salud_porcentaje), 1) FROM dron_baterias WHERE equipo_dron_id = ed.id) as salud_bateria_promedio,
             (SELECT COUNT(*) FROM dron_misiones WHERE equipo_dron_id = ed.id AND estado = 'completada') as total_misiones_completadas
      FROM equipos_dron ed
      JOIN maquinaria m ON ed.equipo_id = m.id_maquinaria
      JOIN modelos_drones_catalogo c ON ed.catalogo_modelo_id = c.id
      JOIN fincas f ON m.id_finca = f.id_finca
      WHERE m.id_tenant = ?
      ORDER BY ed.id DESC
    `, [tenantId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/equipos', async (req, res) => {
  const db = getDb(req);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const tenantId = req.user?.id_tenant || req.body.id_tenant || 1;
    const {
      id_finca, codigo, nombre, numero_serie,
      serial_number, catalogo_modelo_id, horas_vuelo_acumuladas
    } = req.body;

    if (!id_finca || !codigo || !nombre || !catalogo_modelo_id) {
      await conn.rollback();
      return res.status(400).json({ error: 'Faltan campos obligatorios para registrar el dron.' });
    }

    // 1. Insertar en maquinaria general
    const [maqRes] = await conn.query(
      `INSERT INTO maquinaria 
      (id_tenant, id_finca, codigo, nombre, numero_serie, categoria, tenencia, estado_operativo) 
      VALUES (?, ?, ?, ?, ?, 'DRON', 'PROPIO', 'Operativo')`,
      [tenantId, id_finca, codigo, nombre, numero_serie || serial_number || codigo]
    );

    const equipoId = maqRes.insertId;

    // 2. Insertar en equipos_dron
    const [dronRes] = await conn.query(
      `INSERT INTO equipos_dron 
      (equipo_id, serial_number, catalogo_modelo_id, horas_vuelo_acumuladas) 
      VALUES (?, ?, ?, ?)`,
      [equipoId, serial_number || numero_serie || codigo, catalogo_modelo_id, horas_vuelo_acumuladas || 0]
    );

    await logAudit(conn, {
      id_tenant: tenantId,
      modulo: 'Drones & AgTech',
      accion: 'REGISTRAR_DRON',
      registro_id: dronRes.insertId,
      usuario: req.user?.username || 'Administrador',
      detalle: `Dron ${codigo} ("${nombre}") registrado en flota`
    });

    await conn.commit();
    res.status(201).json({ success: true, equipo_id: equipoId, id_dron: dronRes.insertId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ==========================================
// 4. MISIONES DE VUELO (CRUD & VALIDACIONES REGLA 1 Y 2)
// ==========================================
router.get('/misiones', async (req, res) => {
  const db = getDb(req);
  try {
    const [rows] = await db.query(`
      SELECT dm.*, ed.serial_number, c.modelo as dron_modelo, c.marca as dron_marca, m.nombre as dron_nombre,
             CONCAT(e.nombres, ' ', e.apellidos) as piloto_nombre, p.numero_licencia,
             l.nombre as lote_nombre, f.nombre as finca_nombre
      FROM dron_misiones dm
      JOIN equipos_dron ed ON dm.equipo_dron_id = ed.id
      JOIN maquinaria m ON ed.equipo_id = m.id_maquinaria
      JOIN modelos_drones_catalogo c ON ed.catalogo_modelo_id = c.id
      JOIN dron_licencias_pilotos p ON dm.piloto_id = p.id
      JOIN rrhh_empleados e ON p.empleado_id = e.id_empleado
      LEFT JOIN lotes l ON dm.lote_id = l.id_lote
      LEFT JOIN nucleos n ON l.id_nucleo = n.id_nucleo
      LEFT JOIN fincas f ON n.id_finca = f.id_finca
      ORDER BY dm.fecha_programada DESC, dm.id DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/misiones', async (req, res) => {
  const db = getDb(req);
  try {
    const { 
      equipo_dron_id, piloto_id, lote_id, tipo = 'fumigacion', 
      fecha_programada, producto_aplicado, cantidad_aplicada_litros,
      altura_vuelo_m = 3.5, costo_mision = 0, observaciones 
    } = req.body;

    if (!equipo_dron_id || !piloto_id || !lote_id || !fecha_programada) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para programar la misión de vuelo.' });
    }

    // RN1: Verificar Licencia del Piloto
    const [licRows] = await db.query(
      `SELECT fecha_vencimiento_licencia FROM dron_licencias_pilotos WHERE id = ?`,
      [piloto_id]
    );
    if (!licRows.length) return res.status(400).json({ error: 'Piloto no encontrado o sin licencia aeronáutica registrada.' });
    
    const fechaVencimiento = new Date(licRows[0].fecha_vencimiento_licencia);
    const fechaProg = new Date(fecha_programada);
    if (fechaVencimiento < fechaProg) {
      return res.status(400).json({ error: 'Operación denegada: La licencia del piloto estará vencida para la fecha programada.' });
    }

    // RN1: Dron en misión activa o mantenimiento
    const [estadoRows] = await db.query(
      `SELECT m.estado_operativo, ed.id 
       FROM maquinaria m 
       JOIN equipos_dron ed ON m.id_maquinaria = ed.equipo_id 
       WHERE ed.id = ?`, [equipo_dron_id]
    );
    if (!estadoRows.length) return res.status(404).json({ error: 'Dron no encontrado en inventario.' });
    if (estadoRows[0].estado_operativo === 'En Mantenimiento') {
      return res.status(400).json({ error: 'Operación denegada: El dron se encuentra en mantenimiento preventivo/correctivo.' });
    }

    // Verificar si ya hay una misión 'en_curso' para este dron
    const [misionActiva] = await db.query(
      `SELECT id FROM dron_misiones WHERE equipo_dron_id = ? AND estado = 'en_curso'`,
      [equipo_dron_id]
    );
    if (misionActiva.length > 0) {
      return res.status(400).json({ error: 'El dron ya se encuentra volando en una misión activa.' });
    }

    // Insertar misión en base de datos
    const [insertRes] = await db.query(
      `INSERT INTO dron_misiones 
      (equipo_dron_id, piloto_id, lote_id, tipo, estado, fecha_programada, producto_aplicado,
       cantidad_aplicada_litros, altura_vuelo_m, costo_mision, fuente_datos, observaciones)
      VALUES (?, ?, ?, ?, 'programada', ?, ?, ?, ?, ?, 'AgroPacioli_Dron', ?)`,
      [
        equipo_dron_id, piloto_id, lote_id, tipo, fecha_programada,
        producto_aplicado || null, cantidad_aplicada_litros || null,
        altura_vuelo_m, costo_mision || 0, observaciones || null
      ]
    );

    await logAudit(db, {
      id_tenant: req.user?.id_tenant || 1,
      modulo: 'Drones & AgTech',
      accion: 'PROGRAMAR_MISION_AEREA',
      registro_id: insertRes.insertId,
      usuario: req.user?.username || 'Jefe de Vuelo',
      detalle: `Misión de ${tipo} programada para Dron #${equipo_dron_id} en Lote #${lote_id} el ${fecha_programada}`
    });

    res.status(201).json({ success: true, mision_id: insertRes.insertId, message: 'Misión aérea programada exitosamente en BD.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/misiones/:id/estado', async (req, res) => {
  const db = getDb(req);
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    let updateFields = 'estado = ?';
    let params = [estado];

    if (estado === 'en_curso') {
      updateFields += ', hora_inicio = NOW()';
    }

    await db.query(`UPDATE dron_misiones SET ${updateFields} WHERE id = ?`, [...params, id]);

    await logAudit(db, {
      id_tenant: req.user?.id_tenant || 1,
      modulo: 'Drones & AgTech',
      accion: 'CAMBIO_ESTADO_MISION',
      registro_id: id,
      usuario: req.user?.username || 'Piloto Dron',
      detalle: `Misión #${id} pasó a estado "${estado}"`
    });

    res.json({ success: true, message: `Estado actualizado a ${estado}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. CIERRE DE MISIÓN (Regla 2: Transaccional)
// ==========================================
router.post('/misiones/:id/cierre', async (req, res) => {
  const db = getDb(req);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;
    const { area_cubierta_ha = 0, duracion_minutos = 0, observaciones_cierre } = req.body;

    // Obtener info de la misión
    const [misRows] = await conn.query(`SELECT * FROM dron_misiones WHERE id = ?`, [id]);
    if (!misRows.length) throw new Error('Misión no encontrada');
    const mision = misRows[0];

    // Actualizar estado misión
    await conn.query(
      `UPDATE dron_misiones 
       SET estado = 'completada', hora_fin = NOW(), area_cubierta_ha = ?, duracion_minutos = ?,
           observaciones = CONCAT(COALESCE(observaciones, ''), '\n[CIERRE]: ', ?)
       WHERE id = ?`,
      [area_cubierta_ha, duracion_minutos, observaciones_cierre || 'Vuelo completado con éxito', id]
    );

    // Sumar horas de vuelo al equipo dron
    const horasVoladas = +((duracion_minutos || 0) / 60).toFixed(2);
    await conn.query(
      `UPDATE equipos_dron 
       SET horas_vuelo_acumuladas = horas_vuelo_acumuladas + ?,
           area_total_trabajada_ha = area_total_trabajada_ha + ? 
       WHERE id = ?`,
      [horasVoladas, area_cubierta_ha, mision.equipo_dron_id]
    );

    await logAudit(conn, {
      id_tenant: 1,
      modulo: 'Drones & AgTech',
      accion: 'CERRAR_MISION_AEREA',
      registro_id: id,
      usuario: req.user?.username || 'Piloto Dron',
      detalle: `Cierre de misión #${id}: ${area_cubierta_ha} ha cubiertas en ${duracion_minutos} min (${horasVoladas} h acumuladas al dron).`
    });

    await conn.commit();
    res.json({ success: true, message: 'Misión cerrada exitosamente y horas de vuelo registradas en BD.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ==========================================
// 6. GESTIÓN DE BATERÍAS DE DRONES
// ==========================================
router.get('/baterias', async (req, res) => {
  const db = getDb(req);
  try {
    const [rows] = await db.query(`
      SELECT b.*, ed.serial_number as dron_serial, m.nombre as dron_nombre, c.modelo as dron_modelo
      FROM dron_baterias b
      JOIN equipos_dron ed ON b.equipo_dron_id = ed.id
      JOIN maquinaria m ON ed.equipo_id = m.id_maquinaria
      JOIN modelos_drones_catalogo c ON ed.catalogo_modelo_id = c.id
      ORDER BY b.salud_porcentaje ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/baterias', async (req, res) => {
  const db = getDb(req);
  const { equipo_dron_id, serial, ciclos_carga = 0, salud_porcentaje = 100.00, estado = 'Disponible' } = req.body;

  if (!equipo_dron_id || !serial) {
    return res.status(400).json({ error: 'Falta dron asignado o serial de la batería.' });
  }

  try {
    const [insRes] = await db.query(`
      INSERT INTO dron_baterias (equipo_dron_id, serial, ciclos_carga, salud_porcentaje, estado)
      VALUES (?, ?, ?, ?, ?)
    `, [equipo_dron_id, serial, ciclos_carga, salud_porcentaje, estado]);

    await logAudit(db, {
      id_tenant: 1,
      modulo: 'Drones & AgTech',
      accion: 'REGISTRAR_BATERIA',
      registro_id: insRes.insertId,
      usuario: req.user?.username || 'Mecánico',
      detalle: `Batería LiPo serial ${serial} registrada para Dron ID ${equipo_dron_id}`
    });

    res.status(201).json({ success: true, id_bateria: insRes.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. REPORTES DE HORAS Y COSTOS
// ==========================================
router.get('/reportes/horas', async (req, res) => {
  const db = getDb(req);
  try {
    const [rows] = await db.query(`
      SELECT c.modelo, COALESCE(SUM(m.duracion_minutos) / 60, 0) as horas, COUNT(m.id) as total_misiones
      FROM modelos_drones_catalogo c
      LEFT JOIN equipos_dron ed ON ed.catalogo_modelo_id = c.id
      LEFT JOIN dron_misiones m ON m.equipo_dron_id = ed.id AND m.estado = 'completada'
      GROUP BY c.modelo
      ORDER BY horas DESC
    `);
    res.json({ data: rows });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

export default router;
