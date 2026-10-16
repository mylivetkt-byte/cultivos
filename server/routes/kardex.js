import express from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';

const router = express.Router();

router.get('/kardex/:insumoId', async (req, res) => {
  const { insumoId } = req.params;
  const { tenantId, bodegaId, fechaInicio, fechaFin } = req.query;
  
  if (!tenantId) return res.status(400).json({ error: 'Falta tenantId' });

  try {
    // Info del insumo
    const [insumo] = await getDb(req).query('SELECT * FROM insumos WHERE id_insumo = ? AND id_tenant = ?', [insumoId, tenantId]);
    if (insumo.length === 0) return res.status(404).json({ error: 'Insumo no encontrado' });

    // Movimientos
    let q = `
      SELECT d.id_documento, d.fecha_documento, td.nombre as tipo_documento, td.naturaleza,
             dd.cantidad, dd.costo_unitario, b.nombre as bodega, d.persona_reclama, d.id_maquina, d.estado
      FROM inv_documentos d
      JOIN inv_tipos_documento td ON d.id_tipo_documento = td.id_tipo
      JOIN inv_documentos_detalle dd ON d.id_documento = dd.id_documento
      JOIN bodegas b ON d.id_bodega = b.id_bodega
      WHERE dd.id_insumo = ? AND d.id_tenant = ? AND d.estado != 'Anulado'
    `;
    const params = [insumoId, tenantId];

    if (bodegaId) {
      q += ' AND d.id_bodega = ?';
      params.push(bodegaId);
    }
    if (fechaInicio && fechaFin) {
      q += ' AND DATE(d.fecha_documento) BETWEEN ? AND ?';
      params.push(fechaInicio, fechaFin);
    }

    q += ' ORDER BY d.fecha_documento ASC, d.id_documento ASC';

    const [movimientos] = await getDb(req).query(q, params);

    // Saldo actual por bodega
    let saldoQuery = `
      SELECT b.nombre as bodega, e.stock_actual, e.estanteria, e.nivel
      FROM inv_existencias e
      JOIN bodegas b ON e.id_bodega = b.id_bodega
      WHERE e.id_insumo = ? AND e.id_tenant = ?
    `;
    const [saldos] = await getDb(req).query(saldoQuery, [insumoId, tenantId]);

    res.json({
      success: true,
      insumo: insumo[0],
      saldos,
      movimientos
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/salida', async (req, res) => {
  const { tenantId, bodegaId, insumoId, cantidad, persona_reclama, id_maquina } = req.body;
  if (!tenantId || !bodegaId || !insumoId || !cantidad || !persona_reclama) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const conn = await getDb(req).getConnection();
  try {
    await conn.beginTransaction();

    // Obtener costo unitario promedio
    const [existencias] = await conn.query('SELECT stock_actual, costo_unitario FROM inv_existencias WHERE id_bodega = ? AND id_insumo = ?', [bodegaId, insumoId]);
    if (existencias.length === 0 || existencias[0].stock_actual < cantidad) {
      throw new Error('Stock insuficiente');
    }
    const costoUnitario = existencias[0].costo_unitario || 0;

    // Buscar tipo de documento "Salida por Consumo"
    let [td] = await conn.query("SELECT id_tipo FROM inv_tipos_documento WHERE naturaleza = 'Salida' AND id_tenant = ? LIMIT 1", [tenantId]);
    if (td.length === 0) {
      await conn.query("INSERT INTO inv_tipos_documento (id_tenant, codigo, nombre, naturaleza) VALUES (?, 'SAL', 'Salida Almacén', 'Salida')", [tenantId]);
      [td] = await conn.query("SELECT id_tipo FROM inv_tipos_documento WHERE naturaleza = 'Salida' AND id_tenant = ? LIMIT 1", [tenantId]);
    }
    const idTipoDoc = td[0].id_tipo;

    // Crear Documento
    const [docResult] = await conn.query(`
      INSERT INTO inv_documentos (id_tenant, id_bodega, id_tipo_documento, fecha_documento, estado, persona_reclama, id_maquina)
      VALUES (?, ?, ?, CURDATE(), 'Confirmado', ?, ?)
    `, [tenantId, bodegaId, idTipoDoc, persona_reclama, id_maquina || null]);
    const idDoc = docResult.insertId;

    // Crear Detalle
    await conn.query(`
      INSERT INTO inv_documentos_detalle (id_documento, id_insumo, cantidad, costo_unitario, subtotal)
      VALUES (?, ?, ?, ?, ?)
    `, [idDoc, insumoId, cantidad, costoUnitario, cantidad * costoUnitario]);

    // Descontar inventario
    await conn.query(`
      UPDATE inv_existencias 
      SET stock_actual = stock_actual - ? 
      WHERE id_bodega = ? AND id_insumo = ?
    `, [cantidad, bodegaId, insumoId]);

    await conn.commit();
    res.json({ success: true, id_documento: idDoc });

  } catch (err) {
    await conn.rollback();
    console.error("Error en salida:", err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.get('/movimientos/avanzados', async (req, res) => {
  const { tenantId, fincaId, bodegaId, insumoId, empleadoId, vehiculoId, maquinaId, loteId, fechaInicio, fechaFin } = req.query;
  
  if (!tenantId) return res.status(400).json({ error: 'Falta tenantId' });

  try {
    let q = `
      SELECT 
        m.id_movimiento, m.tipo_movimiento, m.cantidad, m.costo_unitario, m.fecha_movimiento, m.documento_referencia,
        i.nombre as insumo, i.codigo as insumo_codigo, i.unidad_medida,
        b.nombre as bodega, f.nombre as finca,
        e.nombres as emp_nombres, e.apellidos as emp_apellidos,
        v.placa as vehiculo_placa,
        mq.nombre as maquina_nombre,
        l.nombre as lote_nombre
      FROM movimientos_inventario m
      LEFT JOIN insumos i ON m.id_insumo = i.id_insumo
      LEFT JOIN bodegas b ON m.id_bodega = b.id_bodega
      LEFT JOIN fincas f ON b.id_finca = f.id_finca
      LEFT JOIN rrhh_empleados e ON m.id_empleado = e.id_empleado
      LEFT JOIN vehiculos v ON m.id_vehiculo = v.id_vehiculo
      LEFT JOIN maquinaria mq ON m.id_maquina = mq.id_maquina
      LEFT JOIN lotes l ON m.id_lote = l.id_lote
      WHERE m.id_tenant = ?
    `;
    const params = [tenantId];

    if (fincaId) { q += ' AND f.id_finca = ?'; params.push(fincaId); }
    if (bodegaId) { q += ' AND m.id_bodega = ?'; params.push(bodegaId); }
    if (insumoId) { q += ' AND m.id_insumo = ?'; params.push(insumoId); }
    if (empleadoId) { q += ' AND m.id_empleado = ?'; params.push(empleadoId); }
    if (vehiculoId) { q += ' AND m.id_vehiculo = ?'; params.push(vehiculoId); }
    if (maquinaId) { q += ' AND m.id_maquina = ?'; params.push(maquinaId); }
    if (loteId) { q += ' AND m.id_lote = ?'; params.push(loteId); }
    if (fechaInicio && fechaFin) { 
      q += ' AND DATE(m.fecha_movimiento) BETWEEN ? AND ?'; 
      params.push(fechaInicio, fechaFin); 
    }

    q += ' ORDER BY m.fecha_movimiento DESC LIMIT 1000';

    const [rows] = await getDb(req).query(q, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching advanced movs:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
