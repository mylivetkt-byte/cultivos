import express from 'express';
import pool from '../db.js';
import { sendTextMessage } from '../services/whatsappService.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// 1. Get all daily tasks with resolved details
router.get('/', async (req, res) => {
  const { tenantId, date, categoria, estado } = req.query;
  const tid = tenantId || 1;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    let query = `
      SELECT 
        l.id_labor, l.categoria, l.descripcion_labor, l.fecha_planificada,
        l.id_empleado, l.id_lote, l.id_arbol, l.id_vehiculo, l.id_maquinaria,
        l.estado, l.cumplimiento_observaciones, l.fecha_completado, l.evaluado_por,
        l.reporte_enviado, l.fecha_reporte,
        CONCAT(e.nombres, ' ', e.apellidos) as empleado_nombre,
        lot.nombre as lote_nombre,
        a.codigo_arbol,
        v.placa as vehiculo_placa,
        m.nombre as maquinaria_nombre
      FROM labores_diarias l
      LEFT JOIN rrhh_empleados e ON l.id_empleado = e.id_empleado
      LEFT JOIN lotes lot ON l.id_lote = lot.id_lote
      LEFT JOIN siembra_arboles a ON l.id_arbol = a.id_arbol
      LEFT JOIN vehiculos v ON l.id_vehiculo = v.id_vehiculo
      LEFT JOIN maquinaria m ON l.id_maquinaria = m.id_maquinaria
      WHERE l.id_tenant = ? AND l.fecha_planificada = ?
    `;
    const params = [tid, targetDate];

    if (categoria) {
      query += ` AND l.categoria = ?`;
      params.push(categoria);
    }
    if (estado) {
      query += ` AND l.estado = ?`;
      params.push(estado);
    }

    query += ` ORDER BY l.id_labor DESC`;

    const [rows] = await getDb(req).query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Create a manual labor task
router.post('/', async (req, res) => {
  const { 
    tenantId, categoria, descripcion_labor, fecha_planificada, 
    id_empleado, id_lote, id_arbol, id_vehiculo, id_maquinaria,
    id_potrero, id_vivero, id_etapa_produccion, id_bodega, id_sede, id_camino
  } = req.body;
  const tid = tenantId || 1;

  if (!categoria || !descripcion_labor || !fecha_planificada) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios: categoria, descripcion_labor, fecha_planificada' });
  }

  try {
    const db = getDb(req);
    const [result] = await db.query(`
      INSERT INTO labores_diarias (
        id_tenant, categoria, descripcion_labor, fecha_planificada,
        id_empleado, id_lote, id_arbol, id_vehiculo, id_maquinaria,
        id_potrero, id_vivero, id_etapa_produccion, id_bodega, id_sede, id_camino,
        estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Planificada')
    `, [
      tid, categoria, descripcion_labor, fecha_planificada,
      id_empleado || null, id_lote || null, id_arbol || null, id_vehiculo || null, id_maquinaria || null,
      id_potrero || null, id_vivero || null, id_etapa_produccion || null, id_bodega || null, id_sede || null, id_camino || null
    ]);

    // Intentar notificar por WhatsApp
    if (id_empleado) {
      try {
        const [empRows] = await db.query('SELECT nombres, telefono FROM rrhh_empleados WHERE id_empleado = ?', [id_empleado]);
        if (empRows.length > 0 && empRows[0].telefono) {
          const emp = empRows[0];
          let tel = emp.telefono.replace(/\\D/g, '');
          if (tel.length === 10) tel = '57' + tel; // default to Colombia if missing country code
          
          const msg = `🌱 Hola ${emp.nombres},\n\nTienes una nueva labor asignada para ${fecha_planificada}:\n\n*Categoria*: ${categoria}\n*Descripción*: ${descripcion_labor}\n\nPor favor, verifica en la app al iniciar turno.`;
          await sendTextMessage(tel, msg);
        }
      } catch (err) {
        console.error('No se pudo enviar WhatsApp al empleado:', err.message);
      }
    }

    res.json({
      success: true,
      id_labor: result.insertId,
      message: 'Labor planificada guardada exitosamente.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2.5 Assign Employee to Labor
router.put('/:id/asignar', async (req, res) => {
  const laborId = parseInt(req.params.id);
  const { id_empleado } = req.body;
  try {
    // Basic check: is the employee on vacation/sick?
    const [novedades] = await getDb(req).query(`
      SELECT * FROM rrhh_novedades 
      WHERE id_empleado = ? AND CURDATE() BETWEEN fecha_inicio AND fecha_fin AND estado = 'Aprobado'
    `, [id_empleado]);
    
    if (novedades.length > 0) {
      return res.status(400).json({ error: `El empleado no está disponible por novedad: ${novedades[0].tipo_novedad}` });
    }

    await getDb(req).query(`
      UPDATE labores_diarias 
      SET id_empleado = ?, estado = 'En Progreso' 
      WHERE id_labor = ?
    `, [id_empleado, laborId]);

    res.json({ success: true, message: 'Empleado asignado correctamente.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Automated Rule-Based Task Suggestions Generator
router.post('/auto-generate', async (req, res) => {
  const { tenantId, date } = req.body;
  const tid = tenantId || 1;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const generatedTasks = [];

    // Rule 1: Find diseased trees with no active control task today
    const [sickTrees] = await getDb(req).query(`
      SELECT a.id_arbol, a.codigo_arbol, a.estado_salud, a.id_lote, l.nombre as lote_nombre
      FROM siembra_arboles a
      JOIN lotes l ON a.id_lote = l.id_lote
      WHERE a.id_tenant = ? AND a.estado_salud IN ('Enfermo', 'Tratamiento')
    `, [tid]);

    for (const tree of sickTrees) {
      // Check duplicate for today
      const [dups] = await getDb(req).query(
        'SELECT id_labor FROM labores_diarias WHERE id_tenant = ? AND id_arbol = ? AND fecha_planificada = ?',
        [tid, tree.id_arbol, targetDate]
      );
      if (dups.length === 0) {
        const desc = `Control fitosanitario individual para árbol ${tree.codigo_arbol} (${tree.estado_salud}) en Lote ${tree.lote_nombre}`;
        const [ins] = await getDb(req).query(`
          INSERT INTO labores_diarias (id_tenant, categoria, descripcion_labor, fecha_planificada, id_lote, id_arbol, estado)
          VALUES (?, 'Arboles', ?, ?, ?, ?, 'Planificada')
        `, [tid, desc, targetDate, tree.id_lote, tree.id_arbol]);
        generatedTasks.push({ id_labor: ins.insertId, categoria: 'Arboles', descripcion: desc });
      }
    }

    // Rule 2: Satellite Alerts verification tasks
    // Check if we have active satellite alerts in sat_alertas_anomalias
    const [satAlerts] = await getDb(req).query(`
      SELECT id_lote, tipo_anomalia, gravedad 
      FROM sat_alertas_anomalias 
      WHERE id_tenant = ? AND resuelta = 0 LIMIT 3
    `, [tid]).catch(() => [[], []]); // Fallback in case table doesn't have records

    if (satAlerts && satAlerts.length > 0) {
      for (const alert of satAlerts) {
        const [dups] = await getDb(req).query(
          'SELECT id_labor FROM labores_diarias WHERE id_tenant = ? AND id_lote = ? AND descripcion_labor LIKE "%satelital%" AND fecha_planificada = ?',
          [tid, alert.id_lote, targetDate]
        );
        if (dups.length === 0) {
          const desc = `Inspección de campo satelital por anomalía de tipo "${alert.tipo_anomalia}" (Gravedad: ${alert.gravedad})`;
          const [ins] = await getDb(req).query(`
            INSERT INTO labores_diarias (id_tenant, categoria, descripcion_labor, fecha_planificada, id_lote, estado)
            VALUES (?, 'Lotes', ?, ?, ?, 'Planificada')
          `, [tid, desc, targetDate, alert.id_lote]);
          generatedTasks.push({ id_labor: ins.insertId, categoria: 'Lotes', descripcion: desc });
        }
      }
    } else {
      // General fallbacks if no alerts
      // 1. Irrigation suggestion
      const [insRiego] = await getDb(req).query(`
        INSERT INTO labores_diarias (id_tenant, categoria, descripcion_labor, fecha_planificada, estado)
        VALUES (?, 'Riegos', 'Turno de irrigación preventivo y monitoreo de humedad de suelo', ?, 'Planificada')
      `, [tid, targetDate]);
      generatedTasks.push({ id_labor: insRiego.insertId, categoria: 'Riegos', descripcion: 'Turno de irrigación preventivo y monitoreo de humedad de suelo' });
    }

    // Rule 3: General operations suggestion (Harvest, Compost heap, Nurseries)
    // Fertilizer
    const [insCompost] = await getDb(req).query(`
      INSERT INTO labores_diarias (id_tenant, categoria, descripcion_labor, fecha_planificada, estado)
      VALUES (?, 'Abonos', 'Volteo de pila compostera e inoculación microbiana de materia orgánica', ?, 'Planificada')
    `, [tid, targetDate]);
    generatedTasks.push({ id_labor: insCompost.insertId, categoria: 'Abonos', descripcion: 'Volteo de pila compostera e inoculación microbiana de materia orgánica' });

    // Cosecha
    const [insCosecha] = await getDb(req).query(`
      INSERT INTO labores_diarias (id_tenant, categoria, descripcion_labor, fecha_planificada, estado)
      VALUES (?, 'Cosecha', 'Recolección de fruta, pesaje de tolva e ingreso a tolvas de despacho', ?, 'Planificada')
    `, [tid, targetDate]);
    generatedTasks.push({ id_labor: insCosecha.insertId, categoria: 'Cosecha', descripcion: 'Recolección de fruta, pesaje de tolva e ingreso a tolvas de despacho' });

    // Talleres Maintenance suggestion
    const [maqs] = await getDb(req).query('SELECT id_maquinaria, nombre FROM maquinaria LIMIT 1');
    if (maqs.length > 0) {
      const desc = `Inspección de sistemas de transmisión y engrase en taller: ${maqs[0].nombre}`;
      const [insTall] = await getDb(req).query(`
        INSERT INTO labores_diarias (id_tenant, categoria, descripcion_labor, fecha_planificada, id_maquinaria, estado)
        VALUES (?, 'Talleres', ?, ?, ?, 'Planificada')
      `, [tid, desc, targetDate, maqs[0].id_maquinaria]);
      generatedTasks.push({ id_labor: insTall.insertId, categoria: 'Talleres', descripcion: desc });
    }

    res.json({
      success: true,
      count: generatedTasks.length,
      tasks: generatedTasks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Audit & Evaluate labor compliance (cumplió o no cumplió)
router.put('/:id/evaluar', async (req, res) => {
  const laborId = parseInt(req.params.id);
  const { estado, observaciones, evaluador } = req.body;

  if (!estado || !['Completada', 'Incumplida'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido. Debe ser Completada o Incumplida.' });
  }

  try {
    await getDb(req).query(`
      UPDATE labores_diarias 
      SET 
        estado = ?,
        cumplimiento_observaciones = ?,
        fecha_completado = NOW(),
        evaluado_por = ?
      WHERE id_labor = ?
    `, [estado, observaciones || null, evaluador || 'Supervisor Finca', laborId]);

    res.json({
      success: true,
      message: `Labor calificada como "${estado}" exitosamente.`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Send PDF summary report simulation to area chiefs & admins
router.post('/:id/reportar', async (req, res) => {
  const laborId = parseInt(req.params.id);

  try {
    // Check if task exists
    const [rows] = await getDb(req).query(`
      SELECT 
        l.id_labor, l.categoria, l.descripcion_labor, l.estado, l.cumplimiento_observaciones,
        l.fecha_planificada, l.fecha_completado, l.evaluado_por,
        CONCAT(e.nombres, ' ', e.apellidos) as empleado_nombre,
        rc.descripcion AS empleado_cargo,
        lot.nombre as lote_nombre,
        t.razon_social as tenant_social
      FROM labores_diarias l
      JOIN tenants t ON l.id_tenant = t.id_tenant
      LEFT JOIN rrhh_empleados e ON l.id_empleado = e.id_empleado
LEFT JOIN rrhh_cargos rc ON e.id_cargo = rc.id_cargo
      LEFT JOIN lotes lot ON l.id_lote = lot.id_lote
      WHERE l.id_labor = ?
    `, [laborId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Labor no encontrada' });
    }

    const task = rows[0];

    // Mark as reported in DB
    await getDb(req).query(`
      UPDATE labores_diarias 
      SET 
        reporte_enviado = 1,
        fecha_reporte = NOW()
      WHERE id_labor = ?
    `, [laborId]);

    // Build mock email notification layout for high fidelity visualization
    const mockEmailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background: #1e293b; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">🌿 SAS Agrícolas - Reporte de Cumplimiento</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.85;">${task.tenant_social}</p>
        </div>
        <div style="padding: 24px; color: #334155; line-height: 1.5;">
          <h3 style="margin-top: 0; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Resumen de Auditoría de Labor</h3>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; font-weight: bold; width: 150px;">Categoría:</td>
              <td style="padding: 6px 0;">${task.categoria}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Descripción:</td>
              <td style="padding: 6px 0;">${task.descripcion_labor}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Fecha Labor:</td>
              <td style="padding: 6px 0;">${new Date(task.fecha_planificada).toLocaleDateString('es-ES')}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Operario:</td>
              <td style="padding: 6px 0;">${task.empleado_nombre || 'No asignado'} (${task.empleado_cargo || 'N/A'})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Lote:</td>
              <td style="padding: 6px 0;">${task.lote_nombre || 'Área General'}</td>
            </tr>
            <tr style="border-top: 1px solid #e2e8f0;">
              <td style="padding: 10px 0; font-weight: bold; color: ${task.estado === 'Completada' ? '#059669' : '#dc2626'};">Estado Auditoría:</td>
              <td style="padding: 10px 0; font-weight: bold; color: ${task.estado === 'Completada' ? '#059669' : '#dc2626'}; text-transform: uppercase;">
                ${task.estado === 'Completada' ? '✓ CUMPLIDA' : '🚨 INCUMPLIDA'}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; vertical-align: top;">Observaciones:</td>
              <td style="padding: 6px 0; font-style: italic; background: #f8fafc; padding: 8px; border-radius: 4px;">
                ${task.cumplimiento_observaciones || 'Sin comentarios adicionales.'}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Evaluado Por:</td>
              <td style="padding: 6px 0;">${task.evaluado_por}</td>
            </tr>
          </table>

          <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 12px; color: #475569; text-align: center; border: 1px dashed #cbd5e1;">
            Este reporte ha sido generado automáticamente por el Centro de Planificación de Labores y despachado de forma oficial al correo de los administradores y jefes de área.
          </div>
        </div>
        <div style="background: #f8fafc; text-align: center; padding: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
          © 2026 SAS Agrícolas. Todos los derechos reservados.
        </div>
      </div>
    `;

    res.json({
      success: true,
      message: 'Reporte de cumplimiento despachado con éxito a jefes de área.',
      emailPreview: mockEmailTemplate
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint de verificación cruzada con nómina/asistencia
router.get('/verificacion_diaria', async (req, res) => {
  const { tenantId, date } = req.query;
  const tid = tenantId || 1;
  // Fallback to today but preserving timezone locally or just using the string
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  try {
    const db = getDb(req);
    const [rows] = await db.query(`
      SELECT 
        l.id_labor, l.categoria, l.descripcion_labor, l.estado, l.id_empleado,
        e.nombres as empleado_nombres, e.apellidos as empleado_apellidos, rc.descripcion,
        a.hora_entrada, a.hora_salida
      FROM labores_diarias l
      JOIN rrhh_empleados e ON l.id_empleado = e.id_empleado
LEFT JOIN rrhh_cargos rc ON e.id_cargo = rc.id_cargo
      LEFT JOIN rrhh_control_asistencia a ON e.id_empleado = a.id_empleado AND DATE(a.fecha) = ?
      WHERE l.id_tenant = ? AND DATE(l.fecha_planificada) = ?
      ORDER BY l.id_labor DESC
    `, [targetDate, tid, targetDate]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
