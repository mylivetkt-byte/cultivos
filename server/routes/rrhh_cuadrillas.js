import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// 1. Obtener lista de cuadrillas
router.get('/', async (req, res) => {
  const tid = req.query.tenantId || 1;
  try {
    const query = `
      SELECT c.*, f.nombre as finca_nombre, 
             GROUP_CONCAT(CONCAT(e.nombres, ' ', e.apellidos) SEPARATOR ', ') as empleados_nombres
      FROM rrhh_cuadrillas c 
      LEFT JOIN fincas f ON c.id_finca = f.id_finca 
      LEFT JOIN rrhh_empleados e ON c.id_cuadrilla = e.id_cuadrilla
      WHERE c.id_tenant = ? 
      GROUP BY c.id_cuadrilla
      ORDER BY c.estado ASC, c.nombre ASC
    `;
    const [rows] = await getDb(req).query(query, [tid]);
    console.log(`[rrhh_cuadrillas] Retornando ${rows.length} cuadrillas para tenant ${tid}`);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching cuadrillas:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Crear nueva cuadrilla
router.post('/', async (req, res) => {
  const { tenantId, id_finca, nombre, tipo, estado } = req.body;
  const tid = tenantId || 1;
  try {
    const query = `
      INSERT INTO rrhh_cuadrillas (id_tenant, id_finca, nombre, tipo, estado)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await getDb(req).query(query, [tid, id_finca || null, nombre, tipo || 'Agricola', estado || 'Activa']);
    res.json({ success: true, id_cuadrilla: result.insertId });
  } catch (err) {
    console.error('Error creating cuadrilla:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Actualizar cuadrilla
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { id_finca, nombre, tipo, estado } = req.body;
  try {
    const query = `
      UPDATE rrhh_cuadrillas 
      SET id_finca = ?, nombre = ?, tipo = ?, estado = ?
      WHERE id_cuadrilla = ?
    `;
    await getDb(req).query(query, [id_finca || null, nombre, tipo, estado, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating cuadrilla:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Eliminar cuadrilla
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Check if it's being used by employees
    const [emps] = await getDb(req).query('SELECT id_empleado FROM rrhh_empleados WHERE id_cuadrilla = ?', [id]);
    if (emps.length > 0) {
      return res.status(400).json({ error: 'No se puede eliminar la cuadrilla porque tiene empleados asignados. Cambie su estado a Inactiva.' });
    }
    await getDb(req).query('DELETE FROM rrhh_cuadrillas WHERE id_cuadrilla = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting cuadrilla:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Obtener historial/récord operativo de las cuadrillas
router.get('/historial', async (req, res) => {
  console.log('[HISTORIAL] Req query:', req.query);
  const { tenantId, fecha_inicio, fecha_fin, id_cuadrilla, id_finca, id_lote, id_empleado } = req.query;
  const tid = tenantId || 1;
  try {
    let query = `
      SELECT 
        c.nombre AS cuadrilla_nombre,
        c.tipo AS cuadrilla_tipo,
        f.nombre AS finca_nombre,
        l.categoria,
        l.descripcion_labor,
        l.estado,
        l.fecha_planificada,
        l.fecha_completado,
        l.horas_trabajadas,
        l.cantidad_producida,
        lo.nombre AS lote_nombre,
        e.nombres AS empleado_nombre
      FROM labores_diarias l
      JOIN rrhh_empleados e ON l.id_empleado = e.id_empleado
      JOIN rrhh_cuadrillas c ON e.id_cuadrilla = c.id_cuadrilla
      LEFT JOIN fincas f ON c.id_finca = f.id_finca
      LEFT JOIN lotes lo ON l.id_lote = lo.id_lote
      WHERE l.id_tenant = ? AND l.estado IN ('Completada', 'Incumplida')
    `;
    const params = [tid];

    if (fecha_inicio) {
      query += " AND l.fecha_planificada >= ?";
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      query += " AND l.fecha_planificada <= ?";
      params.push(fecha_fin);
    }
    if (id_cuadrilla) {
      query += " AND c.id_cuadrilla = ?";
      params.push(id_cuadrilla);
    }
    if (id_finca) {
      query += " AND c.id_finca = ?";
      params.push(id_finca);
    }
    if (id_lote) {
      query += " AND l.id_lote = ?";
      params.push(id_lote);
    }
    if (id_empleado) {
      query += " AND l.id_empleado = ?";
      params.push(id_empleado);
    }

    query += " ORDER BY l.fecha_planificada DESC, c.nombre ASC";

    const [rows] = await getDb(req).query(query, params);
    console.log(`[HISTORIAL] Query returned ${rows.length} rows`);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching historial cuadrillas:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
