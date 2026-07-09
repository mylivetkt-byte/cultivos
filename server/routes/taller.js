import express from 'express';
const router = express.Router();
import pool from '../db.js'; // Asegúrate de que apunte a tu conexión MySQL

function getDb(req) {
  return req.tenantPool || pool;
}

// 1. Catálogo 360 de Máquinas
router.get('/maquinas', async (req, res) => {
  try {
    const { tenantId } = req.query;
    const sql = `
      SELECT m.*, f.nombre as finca_nombre
      FROM agroind_maquinaria_equipo m
      LEFT JOIN fincas f ON m.id_finca = f.id_finca
      WHERE f.id_tenant = ?
    `;
    const [rows] = await getDb(req).query(sql, [tenantId || 1]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Órdenes de Trabajo (OT)
router.get('/ordenes-trabajo', async (req, res) => {
  try {
    const { tenantId, id_maquina, startDate, endDate } = req.query;
    let sql = `
      SELECT ot.*, m.marca_modelo as maquina_nombre, m.placa, 
             e.nombres as mecanico_nombre, e.apellidos as mecanico_apellido, e.telefono as mecanico_telefono,
             (SELECT p.estado FROM inv_pedidos p WHERE p.tipo_origen = 'Taller_Maquinaria' AND p.id_origen = ot.id_orden_trabajo ORDER BY p.fecha_solicitud DESC, p.id_pedido DESC LIMIT 1) as estado_pedido_repuestos,
             (SELECT p.id_pedido FROM inv_pedidos p WHERE p.tipo_origen = 'Taller_Maquinaria' AND p.id_origen = ot.id_orden_trabajo ORDER BY p.fecha_solicitud DESC, p.id_pedido DESC LIMIT 1) as id_pedido_repuestos
      FROM ordenes_trabajo_mantenimiento ot
      LEFT JOIN agroind_maquinaria_equipo m ON ot.id_activo = m.id_maq_agro
      LEFT JOIN rrhh_empleados e ON ot.id_tecnico_asignado = e.id_empleado
      WHERE ot.id_tenant = ?
    `;
    const params = [tenantId || 1];

    if (id_maquina) {
      sql += ` AND ot.id_activo = ?`;
      params.push(id_maquina);
    }
    if (startDate && endDate) {
      sql += ` AND DATE(ot.fecha_creacion) >= ? AND DATE(ot.fecha_creacion) <= ?`;
      params.push(startDate, endDate);
    }
    sql += ` ORDER BY ot.fecha_creacion DESC LIMIT 200`;

    const [rows] = await getDb(req).query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2.5 Historial de Pedidos por Máquina
router.get('/pedidos-historial', async (req, res) => {
  try {
    const { tenantId, id_maquina, startDate, endDate } = req.query;
    
    let sql = `
      SELECT 
        pd.id_detalle, pd.cantidad_solicitada, pd.cantidad_aprobada,
        p.id_pedido, p.fecha_solicitud, p.estado as estado_pedido,
        i.codigo, i.nombre as insumo_nombre, i.unidad_medida,
        ot.numero_orden,
        m.marca_modelo as maquina_nombre, m.placa, m.id_maq_agro
      FROM inv_pedidos_detalle pd
      JOIN inv_pedidos p ON pd.id_pedido = p.id_pedido
      JOIN insumos i ON pd.id_insumo = i.id_insumo
      LEFT JOIN ordenes_trabajo_mantenimiento ot ON p.tipo_origen = 'Taller_Maquinaria' AND p.id_origen = ot.id_orden_trabajo
      LEFT JOIN agroind_maquinaria_equipo m ON ot.id_activo = m.id_maq_agro
      WHERE p.id_tenant = ?
    `;
    const params = [tenantId || 1];

    if (id_maquina) {
      sql += ` AND m.id_maq_agro = ?`;
      params.push(id_maquina);
    }
    
    if (startDate && endDate) {
      sql += ` AND DATE(p.fecha_solicitud) BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    sql += ` ORDER BY p.fecha_solicitud DESC, pd.id_detalle DESC LIMIT 500`;

    const [rows] = await getDb(req).query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/ordenes-trabajo', async (req, res) => {
  try {
    const tenantId = req.query.tenantId || 1;
    const { id_maquina, tipo_orden, id_mecanico_asignado, descripcion_problema } = req.body;
    
    // Generar un número de orden (e.g. OT-2026-XXXX)
    const orderNum = `OT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000) + 10000}`;
    
    const [result] = await getDb(req).query(`
      INSERT INTO ordenes_trabajo_mantenimiento 
      (id_tenant, numero_orden, id_activo, id_tecnico_asignado, tipo_orden, descripcion_problema, estado, fecha_creacion, id_usuario_solicitante)
      VALUES (?, ?, ?, ?, ?, ?, 'Programada', NOW(), 1)
    `, [tenantId, orderNum, id_maquina, id_mecanico_asignado, tipo_orden, descripcion_problema]);
    
    res.json({ success: true, id_orden_trabajo: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/ordenes-trabajo/:id', async (req, res) => {
  try {
    const { estado } = req.body;
    await getDb(req).query('UPDATE ordenes_trabajo_mantenimiento SET estado = ? WHERE id_orden_trabajo = ?', [estado, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/ordenes-trabajo/:id', async (req, res) => {
  try {
    await getDb(req).query('DELETE FROM ordenes_trabajo_mantenimiento WHERE id_orden_trabajo = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Seguimiento Diario de Mecánicos (El reporte del Jefe de Taller)
router.get('/seguimiento-mecanicos', async (req, res) => {
  try {
    const { tenantId, fecha } = req.query;
    const sql = `
      SELECT 
        e.id_empleado, e.nombres, e.apellidos,
        COUNT(ot.id_orden_trabajo) as ots_atendidas,
        SUM(ot.horas_trabajadas) as total_horas_labor,
        SUM(ot.costo_mano_obra) as costo_total_mo
      FROM rrhh_empleados e
      JOIN ordenes_trabajo_mantenimiento ot ON e.id_empleado = ot.id_tecnico_asignado
      WHERE ot.estado IN ('Completada', 'En_Ejecucion')
      GROUP BY e.id_empleado, e.nombres, e.apellidos
    `;
    // Nota: simplificado para el demo. En vida real se filtra por la fecha de labor exacta.
    const [rows] = await getDb(req).query(sql);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Telemetría y Combustible por Máquina
router.get('/kpis-maquina/:id', async (req, res) => {
  try {
    const maqId = req.params.id;
    const [telemetria] = await getDb(req).query(`SELECT * FROM taller_telemetria WHERE id_maq_agro = ? ORDER BY fecha_lectura DESC LIMIT 15`, [maqId]);
    const [combustible] = await getDb(req).query(`SELECT * FROM taller_combustible WHERE id_maq_agro = ? ORDER BY fecha DESC LIMIT 15`, [maqId]);
    const [checklists] = await getDb(req).query(`SELECT * FROM taller_checklist WHERE id_maq_agro = ? ORDER BY fecha DESC LIMIT 10`, [maqId]);

    res.json({ success: true, data: { telemetria, combustible, checklists } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// 5. Historial Combustible
router.get('/combustible', async (req, res) => {
  try {
    const { tenantId, id_maquina, startDate, endDate } = req.query;
    let sql = `
      SELECT c.*, m.marca_modelo as maquina_nombre, m.placa, 
             e.nombres as operario_nombre, e.apellidos as operario_apellido
      FROM taller_combustible c
      LEFT JOIN agroind_maquinaria_equipo m ON c.id_maq_agro = m.id_maq_agro
      LEFT JOIN rrhh_empleados e ON c.id_operario = e.id_empleado
      WHERE 1=1
    `;
    const params = [];
    if (id_maquina) {
      sql += ` AND c.id_maq_agro = ?`;
      params.push(id_maquina);
    }
    if (startDate && endDate) {
      sql += ` AND DATE(c.fecha) >= ? AND DATE(c.fecha) <= ?`;
      params.push(startDate, endDate);
    }
    sql += ` ORDER BY c.fecha DESC`;
    const [rows] = await getDb(req).query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Checklists Pre-operacionales
router.get('/checklists', async (req, res) => {
  try {
    const { tenantId, id_maquina, startDate, endDate } = req.query;
    let sql = `
      SELECT c.*, m.marca_modelo as maquina_nombre, m.placa, 
             e.nombres as operario_nombre, e.apellidos as operario_apellido
      FROM taller_checklist c
      LEFT JOIN agroind_maquinaria_equipo m ON c.id_maq_agro = m.id_maq_agro
      LEFT JOIN rrhh_empleados e ON c.id_operario = e.id_empleado
      WHERE 1=1
    `;
    const params = [];
    if (id_maquina) {
      sql += ` AND c.id_maq_agro = ?`;
      params.push(id_maquina);
    }
    if (startDate && endDate) {
      sql += ` AND DATE(c.fecha) >= ? AND DATE(c.fecha) <= ?`;
      params.push(startDate, endDate);
    }
    sql += ` ORDER BY c.fecha DESC`;
    const [rows] = await getDb(req).query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. CRUD Herramientas
router.get('/herramientas', async (req, res) => {
  try {
    const { tenantId } = req.query;
    const sql = `
      SELECT h.*, e.nombres as mecanico_nombre, e.apellidos as mecanico_apellido
      FROM taller_herramientas h
      LEFT JOIN rrhh_empleados e ON h.id_mecanico_asignado = e.id_empleado
      WHERE h.id_tenant = ?
    `;
    const [rows] = await getDb(req).query(sql, [tenantId || 1]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/herramientas', async (req, res) => {
  try {
    const { id_tenant, codigo, nombre, marca, estado, id_mecanico_asignado, costo, observaciones } = req.body;
    const [result] = await getDb(req).query(`
      INSERT INTO taller_herramientas (id_tenant, codigo, nombre, marca, estado, id_mecanico_asignado, fecha_adquisicion, costo, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, ?)
    `, [id_tenant || 1, codigo, nombre, marca, estado || 'Buena', id_mecanico_asignado || null, costo || 0, observaciones]);
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/herramientas/:id', async (req, res) => {
  try {
    const { codigo, nombre, marca, estado, id_mecanico_asignado, costo, observaciones } = req.body;
    await getDb(req).query(`
      UPDATE taller_herramientas 
      SET codigo=?, nombre=?, marca=?, estado=?, id_mecanico_asignado=?, costo=?, observaciones=?
      WHERE id_herramienta = ?
    `, [codigo, nombre, marca, estado, id_mecanico_asignado || null, costo, observaciones, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/herramientas/:id', async (req, res) => {
  try {
    await getDb(req).query(`DELETE FROM taller_herramientas WHERE id_herramienta = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/contactos', async (req, res) => {
    try {
        const { tenantId } = req.query;
        const [empleados] = await getDb(req).query(`
            SELECT id_empleado as id, CONCAT(nombres, ' ', IFNULL(apellidos, '')) as nombre, telefono, cargo, 'Mecánico Interno' as tipo 
            FROM rrhh_empleados 
            WHERE id_tenant = ?
        `, [tenantId]);
        const [terceros] = await getDb(req).query(`
            SELECT id_tercero as id, nombre_completo as nombre, telefono, 'Taller Externo / Proveedor' as tipo 
            FROM terceros 
            WHERE id_tenant = ? AND es_proveedor = 1 AND telefono IS NOT NULL AND telefono != ''
        `, [tenantId]);
        
        res.json({ success: true, data: [...empleados, ...terceros] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 8. Catálogo completo de Repuestos y sus existencias
router.get('/repuestos-catalogo', async (req, res) => {
  try {
    const { tenantId } = req.query;
    const sql = `
      SELECT i.id_insumo, i.codigo, i.nombre as insumo_nombre, i.unidad_medida,
             IFNULL(SUM(e.cantidad), 0) as cantidad,
             IFNULL(GROUP_CONCAT(DISTINCT b.nombre SEPARATOR ', '), 'Sin Asignar') as bodega_nombre
      FROM insumos i
      LEFT JOIN inv_grupos g ON i.id_grupo = g.id_grupo
      LEFT JOIN inv_existencias e ON i.id_insumo = e.id_insumo
      LEFT JOIN bod_bodegas b ON e.id_bodega = b.id_bodega
      WHERE (g.nombre LIKE '%Repuesto%' OR g.nombre LIKE '%Mantenimiento%')
        AND i.id_tenant = ?
      GROUP BY i.id_insumo, i.codigo, i.nombre, i.unidad_medida
    `;
    const [rows] = await getDb(req).query(sql, [tenantId || 1]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. Crear Pedido (Requisición) de Taller
router.post('/pedidos', async (req, res) => {
  const connection = await getDb(req).getConnection();
  try {
    await connection.beginTransaction();
    const { id_tenant, mecanico, id_maquina, tipo_mantenimiento, detalles, id_usuario } = req.body;

    // Buscar la bodega principal (provee) y bodega taller (solicita)
    // Para simplificar, buscaremos la bodega que diga "Taller" o la primera secundaria
    const [bps] = await connection.query('SELECT id_bodega FROM bod_bodegas WHERE id_tenant = ? AND es_principal = TRUE LIMIT 1', [id_tenant]);
    const id_bodega_provee = bps.length > 0 ? bps[0].id_bodega : null;

    const [bts] = await connection.query('SELECT id_bodega FROM bod_bodegas WHERE id_tenant = ? AND (nombre LIKE "%Taller%" OR es_principal = FALSE) LIMIT 1', [id_tenant]);
    const id_bodega_solicita = bts.length > 0 ? bts[0].id_bodega : (id_bodega_provee || 1);

    // Obtener nombre de la máquina si aplica
    let maquinaNombre = "N/A";
    if (id_maquina) {
      const [maqs] = await connection.query('SELECT marca_modelo, placa FROM agroind_maquinaria_equipo WHERE id_maq_agro = ?', [id_maquina]);
      if (maqs.length > 0) {
        maquinaNombre = `[${maqs[0].placa}] ${maqs[0].marca_modelo}`;
      }
    }

    const obsFormateada = `[Mantenimiento ${tipo_mantenimiento.toUpperCase()} | Máquina: ${maquinaNombre} | Solicitante: ${mecanico}] Requisición de Taller.`;

    const [pedRes] = await connection.query(`
      INSERT INTO inv_pedidos (id_tenant, id_bodega_solicita, id_bodega_provee, estado, observaciones, id_usuario_solicita)
      VALUES (?, ?, ?, 'Pendiente_Aprobacion', ?, ?)
    `, [id_tenant, id_bodega_solicita, id_bodega_provee, obsFormateada, id_usuario || 1]);
    
    const id_pedido = pedRes.insertId;

    for (const det of detalles) {
      await connection.query(`
        INSERT INTO inv_pedidos_detalle (id_pedido, id_insumo, cantidad_solicitada)
        VALUES (?, ?, ?)
      `, [id_pedido, det.id_insumo, det.cantidad]);
    }

    await connection.commit();
    res.json({ success: true, id_pedido, observaciones: obsFormateada });
  } catch (error) {
    await connection.rollback();
    console.error('Error generando pedido de taller:', error);
    res.status(500).json({ success: false, error: error.message || 'Error del servidor' });
  } finally {
    connection.release();
  }
});

// 10. CMMS Fase 1 - Obtener Rutinas de Mantenimiento por Máquina
router.get('/rutinas/:id_maquina', async (req, res) => {
  try {
    const { id_maquina } = req.params;
    
    // Obtener las rutinas de la máquina
    const [rutinas] = await getDb(req).query(`
      SELECT r.id_rutina, r.nombre_rutina, r.descripcion, r.frecuencia_horas
      FROM taller_rutinas r
      WHERE r.id_maq_agro = ?
    `, [id_maquina]);

    // Para cada rutina, obtener los insumos requeridos (Kits) y su stock actual
    for (let i = 0; i < rutinas.length; i++) {
      const rutina = rutinas[i];
      const [insumos] = await getDb(req).query(`
        SELECT 
          ri.id_insumo, 
          ins.codigo, 
          ins.nombre as insumo_nombre, 
          ri.cantidad_requerida,
          ins.unidad_medida,
          IFNULL((
            SELECT SUM(cantidad) 
            FROM inv_existencias 
            WHERE id_insumo = ri.id_insumo
          ), 0) as stock_actual
        FROM taller_rutinas_insumos ri
        JOIN insumos ins ON ri.id_insumo = ins.id_insumo
        WHERE ri.id_rutina = ?
      `, [rutina.id_rutina]);
      rutina.insumos = insumos;
    }

    res.json({ success: true, data: rutinas });
  } catch (error) {
    console.error('Error obteniendo rutinas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 11. CMMS Fase 1 - Registrar Horómetro
router.post('/horometros', async (req, res) => {
  try {
    const { id_maq_agro, fecha, lectura_horas, operador, notas } = req.body;
    
    await getDb(req).query(`
      INSERT INTO taller_registro_horometros (id_maq_agro, fecha, lectura_horas, operador, notas)
      VALUES (?, ?, ?, ?, ?)
    `, [id_maq_agro, fecha, lectura_horas, operador, notas]);

    // Actualizar también el horómetro actual en la tabla principal de máquinas
    await getDb(req).query(`
      UPDATE agroind_maquinaria_equipo 
      SET horometro_actual = ? 
      WHERE id_maq_agro = ? AND (horometro_actual < ? OR horometro_actual IS NULL)
    `, [lectura_horas, id_maq_agro, lectura_horas]);

    res.json({ success: true, message: 'Horómetro registrado correctamente' });
  } catch (error) {
    console.error('Error guardando horómetro:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
