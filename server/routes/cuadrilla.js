import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// 1. Obtener lista de cuadrillas
router.get('/list', async (req, res) => {
  const { tenantId } = req.query;
  try {
    let query = "SELECT DISTINCT cuadrilla_nombre FROM rrhh_empleados WHERE cuadrilla_nombre IS NOT NULL AND cuadrilla_nombre != ''";
    const params = [];
    if (tenantId) {
      query += " AND id_tenant = ?";
      params.push(tenantId);
    }
    const [rows] = await getDb(req).query(query, params);
    res.json(rows.map(r => r.cuadrilla_nombre));
  } catch (err) {
    console.error('Error fetching cuadrillas:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Obtener las labores de hoy para una cuadrilla específica
router.get('/labores-hoy', async (req, res) => {
  const { tenantId, cuadrilla } = req.query;
  try {
    let query = `
      SELECT 
        l.id_labor, l.id_tenant, l.categoria, l.descripcion_labor, 
        l.fecha_planificada, l.estado, l.cumplimiento_observaciones,
        l.evidencia_foto, l.firma_digital,
        e.nombres AS empleado_nombre, e.cuadrilla_nombre,
        lo.nombre AS lote_nombre,
        m.nombre AS maquinaria_nombre
      FROM labores_diarias l
      LEFT JOIN rrhh_empleados e ON l.id_empleado = e.id_empleado
      LEFT JOIN lotes lo ON l.id_lote = lo.id_lote
      LEFT JOIN maquinaria m ON l.id_maquinaria = m.id_maquinaria
      WHERE l.fecha_planificada <= CURDATE() 
        AND (l.estado = 'Planificada' OR l.estado = 'En Progreso' OR l.fecha_completado >= CURDATE())
    `;
    const params = [];

    if (tenantId) {
      query += " AND l.id_tenant = ?";
      params.push(tenantId);
    }
    if (cuadrilla) {
      query += " AND e.cuadrilla_nombre = ?";
      params.push(cuadrilla);
    }

    query += " ORDER BY l.fecha_planificada ASC, l.categoria ASC";

    const [rows] = await getDb(req).query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching labores hoy:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Certificar una labor (Completar o Incumplir)
router.post('/certificar/:id', async (req, res) => {
  const { id } = req.params;
  const { estado, observaciones, evidencia_foto, firma_digital, evaluado_por, horas_trabajadas, cantidad_producida } = req.body;

  if (!estado || !['Completada', 'Incumplida'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido. Debe ser Completada o Incumplida.' });
  }

  try {
    const query = `
      UPDATE labores_diarias 
      SET 
        estado = ?, 
        cumplimiento_observaciones = ?, 
        evidencia_foto = ?, 
        firma_digital = ?, 
        evaluado_por = ?, 
        horas_trabajadas = ?,
        cantidad_producida = ?,
        fecha_completado = NOW() 
      WHERE id_labor = ?
    `;
    
    const [result] = await getDb(req).query(query, [
      estado,
      observaciones || null,
      evidencia_foto || null,
      firma_digital || null,
      evaluado_por || 'Jefe de Cuadrilla',
      horas_trabajadas || null,
      cantidad_producida || null,
      id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Labor no encontrada.' });
    }

    res.json({ success: true, message: 'Labor certificada con éxito.' });
  } catch (err) {
    console.error('Error certificando labor:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Obtener recursos (Empleados, Lotes, Maquinaria) para asignar tareas
router.get('/recursos', async (req, res) => {
  const { tenantId, cuadrilla } = req.query;
  const tid = tenantId || 1;
  try {
    let empQuery = "SELECT id_empleado, nombres AS nombre FROM rrhh_empleados WHERE id_tenant = ?";
    const empParams = [tid];
    if (cuadrilla) {
      empQuery += " AND cuadrilla_nombre = ?";
      empParams.push(cuadrilla);
    }
    const [empleados] = await getDb(req).query(empQuery, empParams);
    
    const [lotes] = await getDb(req).query("SELECT id_lote, nombre FROM lotes");
    const [maquinaria] = await getDb(req).query("SELECT id_maquinaria, nombre FROM maquinaria");

    res.json({ empleados, lotes, maquinaria });
  } catch (err) {
    console.error('Error fetching recursos:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Crear una nueva asignación de labor (soporta múltiples empleados)
router.post('/asignar', async (req, res) => {
  const { tenantId, categoria, descripcion_labor, fecha_planificada, empleadosIds, id_lote, id_maquinaria } = req.body;
  const tid = tenantId || 1;

  if (!empleadosIds || !Array.isArray(empleadosIds) || empleadosIds.length === 0) {
    return res.status(400).json({ error: 'Debe seleccionar al menos un empleado.' });
  }

  try {
    const values = empleadosIds.map(empId => [
      tid,
      categoria,
      descripcion_labor,
      fecha_planificada || new Date().toISOString().split('T')[0],
      empId,
      id_lote || null,
      id_maquinaria || null,
      'Planificada'
    ]);

    const query = `
      INSERT INTO labores_diarias 
      (id_tenant, categoria, descripcion_labor, fecha_planificada, id_empleado, id_lote, id_maquinaria, estado) 
      VALUES ?
    `;

    await getDb(req).query(query, [values]);
    res.json({ success: true, message: 'Labores asignadas con éxito.' });
  } catch (err) {
    console.error('Error asignando labor:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Obtener labores asignadas para un empleado específico (App Empleado)
router.get('/mis-labores', async (req, res) => {
  const { empleadoId } = req.query;
  if (!empleadoId) {
    return res.status(400).json({ error: 'empleadoId es requerido' });
  }

  try {
    const query = `
      SELECT 
        l.id_labor, l.categoria, l.descripcion_labor, 
        l.fecha_planificada, l.estado, l.cumplimiento_observaciones,
        lo.nombre AS lote_nombre,
        m.nombre AS maquinaria_nombre,
        f.nombre AS finca_nombre
      FROM labores_diarias l
      LEFT JOIN lotes lo ON l.id_lote = lo.id_lote
      LEFT JOIN nucleos n ON lo.id_nucleo = n.id_nucleo
      LEFT JOIN fincas f ON n.id_finca = f.id_finca
      LEFT JOIN maquinaria m ON l.id_maquinaria = m.id_maquinaria
      WHERE l.id_empleado = ? AND l.fecha_planificada = CURDATE()
      ORDER BY l.estado DESC, l.categoria ASC
    `;
    const [rows] = await getDb(req).query(query, [empleadoId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching mis labores:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
