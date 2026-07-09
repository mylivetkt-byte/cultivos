// server/routes/nomina.js
// Express router for payroll (nómina) management

import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// Helper to extract tenantId from query/body
function getTenant(req) {
  return req.query.tenantId || req.body.tenantId;
}

/** ==================== EMPLEADOS ==================== */
router.get('/employees', async (req, res) => {
  // Alias for empleados endpoint (Spanish name)
  req.url = '/empleados' + req.url.slice(req.url.indexOf('?'));
  // Forward to existing handler
  const tenantId = getTenant(req);
  try {
    const [rows] = await getDb(req).query(`SELECT * FROM empleados ${tenantId ? `WHERE id_tenant = ?` : ''}`, tenantId ? [tenantId] : []);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching employees' });
  }
});
// Duplicate block removed

router.post('/empleados', async (req, res) => {
  const { nombre, tipo_contrato, cargo, salario_base, fecha_ingreso, fecha_fin, biometric_id, device_id, activo, tenantId } = req.body;
  try {
    const [result] = await getDb(req).query(
      `INSERT INTO empleados (nombre, tipo_contrato, cargo, salario_base, fecha_ingreso, fecha_fin, biometric_id, device_id, activo, id_tenant) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, tipo_contrato, cargo, salario_base, fecha_ingreso, fecha_fin, biometric_id, device_id, activo ?? true, tenantId]
    );
    res.json({ insertId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating empleado' });
  }
});

router.put('/empleados/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, tipo_contrato, cargo, salario_base, fecha_ingreso, fecha_fin, biometric_id, device_id, activo, tenantId } = req.body;
  try {
    const [result] = await getDb(req).query(
      `UPDATE empleados SET nombre = ?, tipo_contrato = ?, cargo = ?, salario_base = ?, fecha_ingreso = ?, fecha_fin = ?, biometric_id = ?, device_id = ?, activo = ?, id_tenant = ? WHERE id_empleado = ?`,
      [nombre, tipo_contrato, cargo, salario_base, fecha_ingreso, fecha_fin, biometric_id, device_id, activo, tenantId, id]
    );
    res.json({ affectedRows: result.affectedRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error updating empleado' });
  }
});

router.delete('/empleados/:id', async (req, res) => {
  const { id } = req.params;
  const tenantId = getTenant(req);
  try {
    const [result] = await getDb(req).query(`DELETE FROM empleados WHERE id_empleado = ? ${tenantId ? 'AND id_tenant = ?' : ''}`, tenantId ? [id, tenantId] : [id]);
    res.json({ affectedRows: result.affectedRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error deleting empleado' });
  }
});

/** ==================== CONTRATOS ==================== */
router.get('/contratos', async (req, res) => {
  const tenantId = getTenant(req);
  try {
    const [rows] = await getDb(req).query(`SELECT * FROM contratos ${tenantId ? 'WHERE id_tenant = ?' : ''}`, tenantId ? [tenantId] : []);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching contratos' });
  }
});

router.post('/contratos', async (req, res) => {
  const { id_empleado, fecha_inicio, fecha_fin, frecuencia_pago, modalidad, salario, tenantId } = req.body;
  try {
    const [result] = await getDb(req).query(
      `INSERT INTO contratos (id_empleado, fecha_inicio, fecha_fin, frecuencia_pago, modalidad, salario, id_tenant) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_empleado, fecha_inicio, fecha_fin, frecuencia_pago, modalidad, salario, tenantId]
    );
    res.json({ insertId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating contrato' });
  }
});

/** ==================== ASISTENCIA ==================== */
router.post('/asistencia', async (req, res) => {
  const { id_empleado, timestamp_entrada, timestamp_salida, latitud, longitud, metodo, tenantId } = req.body;
  try {
    const [result] = await getDb(req).query(
      `INSERT INTO asistencia (id_empleado, timestamp_entrada, timestamp_salida, latitud, longitud, metodo, id_tenant) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_empleado, timestamp_entrada, timestamp_salida, latitud, longitud, metodo, tenantId]
    );
    res.json({ insertId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error recording asistencia' });
  }
});

router.get('/asistencia', async (req, res) => {
  const tenantId = getTenant(req);
  const { id_empleado } = req.query;
  try {
    const [rows] = await getDb(req).query(
      `SELECT * FROM asistencia ${tenantId ? 'WHERE id_tenant = ?' : ''}${id_empleado ? (tenantId ? ' AND' : 'WHERE') + ' id_empleado = ?' : ''}`,
      tenantId ? (id_empleado ? [tenantId, id_empleado] : [tenantId]) : (id_empleado ? [id_empleado] : [])
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching asistencia' });
  }
});

/** ==================== PLANILLA GENERATION ==================== */
router.post('/planillas/generar-semana', async (req, res) => {
  const { anio, semana, tenantId } = req.body;
  const tid = tenantId || 1;
  
  if (!anio || !semana) {
    return res.status(400).json({ error: 'Faltan parámetros: anio, semana' });
  }

  try {
    // 1. Check if it already exists
    const [existing] = await getDb(req).query(
      'SELECT id_planilla FROM rrhh_planillas_semanales WHERE anio = ? AND semana_numero = ? AND id_tenant = ?',
      [anio, semana, tid]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'La planilla para esta semana ya ha sido generada.' });
    }

    // Calculate dates for the week
    const simpleDate = new Date(anio, 0, 1 + (semana - 1) * 7);
    const fechaInicio = simpleDate.toISOString().split('T')[0];
    const simpleEndDate = new Date(simpleDate);
    simpleEndDate.setDate(simpleEndDate.getDate() + 6);
    const fechaFin = simpleEndDate.toISOString().split('T')[0];

    // 2. Fetch all active employees for this tenant
    const [empleados] = await getDb(req).query('SELECT * FROM rrhh_empleados WHERE id_tenant = ? AND estado = "Activo"', [tid]);
    
    let totalSalarios = 0;
    let totalDeducciones = 0;
    let totalNeto = 0;
    const detalles = [];

    for (const emp of empleados) {
      // Simplified simulation: Assume they worked 7 days if no biometric data says otherwise
      // In a production app we would count distinct dates in rrhh_control_asistencia
      const salarioMensual = Number(emp.salario_base) || 1300000;
      const salarioSemanalBase = (salarioMensual / 30) * 7;
      
      // Deducciones de ley (4% salud, 4% pensión)
      const dedSalud = salarioSemanalBase * 0.04;
      const dedPension = salarioSemanalBase * 0.04;
      const neto = salarioSemanalBase - dedSalud - dedPension;

      totalSalarios += salarioSemanalBase;
      totalDeducciones += (dedSalud + dedPension);
      totalNeto += neto;

      detalles.push([
        emp.id_empleado,
        salarioSemanalBase,
        0, // extras
        0, // bonificaciones
        dedSalud,
        dedPension,
        neto
      ]);
    }

    // 3. Insert Master Planilla
    const [insMaster] = await getDb(req).query(`
      INSERT INTO rrhh_planillas_semanales 
      (id_tenant, semana_numero, anio, fecha_inicio, fecha_fin, total_salarios, total_deducciones, total_neto, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Borrador')
    `, [tid, semana, anio, fechaInicio, fechaFin, totalSalarios, totalDeducciones, totalNeto]);
    
    const newPlanillaId = insMaster.insertId;

    // 4. Insert Details
    if (detalles.length > 0) {
      const detailValues = detalles.map(d => [newPlanillaId, ...d]);
      await getDb(req).query(`
        INSERT INTO rrhh_nomina_detalle 
        (id_nomina, id_empleado, salario_base_devengado, horas_extras, bonificaciones, deduccion_salud, deduccion_pension, neto_a_pagar)
        VALUES ?
      `, [detailValues]);
    }

    res.json({ success: true, message: 'Planilla semanal generada exitosamente.', planillaId: newPlanillaId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generando planilla' });
  }
});

router.get('/planillas', async (req, res) => {
  const tenantId = getTenant(req) || 1;
  try {
    const [rows] = await getDb(req).query(
      `SELECT * FROM rrhh_planillas_semanales WHERE id_tenant = ? ORDER BY anio DESC, semana_numero DESC`,
      [tenantId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching planillas' });
  }
});

router.put('/planillas/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await getDb(req).query(`UPDATE rrhh_planillas_semanales SET estado = 'Aprobada' WHERE id_planilla = ?`, [id]);
    res.json({ affectedRows: result.affectedRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error approving planilla' });
  }
});

router.put('/planillas/:id/contabilizar', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Get Planilla details
    const [planillaRows] = await getDb(req).query('SELECT * FROM rrhh_planillas_semanales WHERE id_planilla = ?', [id]);
    if (planillaRows.length === 0) return res.status(404).json({ error: 'Planilla no encontrada' });
    const p = planillaRows[0];
    
    if (p.estado === 'Contabilizada') return res.status(400).json({ error: 'Ya está contabilizada' });

    // 2. Fetch necessary IDs for Accounting
    const [ctaGasto] = await getDb(req).query("SELECT id_cuenta FROM plan_contable WHERE codigo LIKE '5%' LIMIT 1");
    const idCuentaGasto = ctaGasto.length ? ctaGasto[0].id_cuenta : 1;

    const [ctaPasivo] = await getDb(req).query("SELECT id_cuenta FROM plan_contable WHERE codigo LIKE '2%' LIMIT 1");
    const idCuentaPasivo = ctaPasivo.length ? ctaPasivo[0].id_cuenta : 2;

    const [tipos] = await getDb(req).query("SELECT id_tipo_comp FROM comprobantes_tipos WHERE nombre LIKE '%Diario%' LIMIT 1");
    const idTipo = tipos.length ? tipos[0].id_tipo_comp : 1;

    const [periodos] = await getDb(req).query("SELECT id_periodo FROM periodos_contables WHERE estado = 'Abierto' LIMIT 1");
    const idPeriodo = periodos.length ? periodos[0].id_periodo : 1;

    const concepto = `Provisión Nómina Semanal ${p.semana_numero}-${p.anio}`;
    
    // 3. Create Comprobante
    const [insComp] = await getDb(req).query(`
      INSERT INTO comprobantes 
      (id_tenant, id_tipo_comp, id_periodo, consecutivo, fecha, concepto, total, estado)
      VALUES (?, ?, ?, ?, CURDATE(), ?, ?, 'Contabilizado')
    `, [p.id_tenant, idTipo, idPeriodo, `NOM-${id}`, concepto, p.total_salarios]);

    const idComp = insComp.insertId;

    // 4. Create Details (Débito a Gastos, Crédito a Pasivos/Bancos)
    await getDb(req).query(`
      INSERT INTO comprobantes_detalle (id_comprobante, id_cuenta, debito, credito, descripcion)
      VALUES 
      (?, ?, ?, 0, 'Gasto Salarios y Deducciones'),
      (?, ?, 0, ?, 'Obligación Nómina por Pagar')
    `, [idComp, idCuentaGasto, p.total_salarios, idComp, idCuentaPasivo, p.total_salarios]);

    // 5. Update Planilla State
    await getDb(req).query(`UPDATE rrhh_planillas_semanales SET estado = 'Contabilizada' WHERE id_planilla = ?`, [id]);

    res.json({ success: true, message: 'Planilla Contabilizada con éxito', id_comprobante: idComp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error contabilizando planilla' });
  }
});

router.put('/planillas/:id/pay', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await getDb(req).query(`UPDATE planilla SET estado = 'pagada' WHERE id_planilla = ?`, [id]);
    res.json({ affectedRows: result.affectedRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error marking planilla as paid' });
  }
});

/** ==================== EXPORT ==================== */
router.get('/planillas/:id/export', async (req, res) => {
  const { id } = req.params;
  const { format = 'json' } = req.query;
  try {
    const [planillaRows] = await getDb(req).query('SELECT * FROM planilla WHERE id_planilla = ?', [id]);
    if (!planillaRows.length) return res.status(404).json({ error: 'Planilla not found' });
    const planilla = planillaRows[0];
    const [detalleRows] = await getDb(req).query('SELECT * FROM planilla_detalle WHERE id_planilla = ?', [id]);
    if (format === 'json') {
      return res.json({ planilla, detalle: detalleRows });
    }
    // For CSV we quickly build a string (in a real app we'd stream)
    if (format === 'csv') {
      let csv = 'Concepto,Valor,Descripcion\n';
      detalleRows.forEach(d => {
        csv += `${d.id_concepto},${d.valor},${d.descripcion || ''}\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=planilla_${id}.csv`);
      return res.send(csv);
    }
    // PDF generation placeholder – return json with note
    return res.status(501).json({ error: 'PDF export not implemented yet' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error exporting planilla' });
  }
});

export default router;
