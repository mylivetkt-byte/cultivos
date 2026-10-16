import express from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';

const router = express.Router();

// 1. Endpoint: Saldos de Violes (Stock de Violes)
router.get('/saldos-violes', async (req, res) => {
  const { tenantId = 1 } = req.query;
  try {
    const [rows] = await getDb(req).query(`
      SELECT 
        i.id_insumo,
        i.codigo,
        i.nombre as producto,
        i.unidad_medida,
        i.stock_actual,
        i.costo_unitario,
        (i.stock_actual * i.costo_unitario) as costo_total
      FROM insumos i
      WHERE i.id_tenant = ? AND (
        i.origen = 'Produccion Propia' OR 
        LOWER(i.nombre) LIKE '%viol%' OR 
        LOWER(i.nombre) LIKE '%biol%' OR 
        i.id_insumo IN (SELECT DISTINCT id_insumo FROM app_produccion_organica WHERE id_insumo IS NOT NULL)
      )
    `, [tenantId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in /saldos-violes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Endpoint: Movimientos Materias Primas
router.get('/movimientos-materias-primas', async (req, res) => {
  const { tenantId = 1, startDate, endDate } = req.query;
  try {
    let dateFilter = '';
    const params = [tenantId];
    if (startDate && endDate) {
      dateFilter = 'AND DATE(m.fecha_movimiento) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const [rows] = await getDb(req).query(`
      SELECT 
        m.id_movimiento,
        m.fecha_movimiento,
        m.tipo_movimiento,
        m.cantidad,
        m.costo_unitario,
        (m.cantidad * m.costo_unitario) as costo_total,
        m.observaciones,
        i.nombre as insumo,
        i.codigo,
        i.unidad_medida,
        m.usuario_responsable as responsable
      FROM movimientos_inventario m
      JOIN insumos i ON m.id_insumo = i.id_insumo
      WHERE m.id_tenant = ? 
      AND i.id_insumo IN (SELECT DISTINCT id_insumo FROM app_produccion_organica_detalles)
      ${dateFilter}
      ORDER BY m.fecha_movimiento DESC
    `, params);
    
    // For those without Empleados link, we might want to link users table too.
    // Let's modify to fallback to just user string if needed, or join users table.
    // Wait, the column is \`usuario_responsable\` which maps to users table, not empleados in most cases, let's fix that.
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in /movimientos-materias-primas:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Endpoint: Movimientos Violes
router.get('/movimientos-violes', async (req, res) => {
  const { tenantId = 1, startDate, endDate } = req.query;
  try {
    let dateFilter = '';
    const params = [tenantId];
    if (startDate && endDate) {
      dateFilter = 'AND DATE(m.fecha_movimiento) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const [rows] = await getDb(req).query(`
      SELECT 
        m.id_movimiento,
        m.fecha_movimiento,
        m.tipo_movimiento,
        m.cantidad,
        m.costo_unitario,
        (m.cantidad * m.costo_unitario) as costo_total,
        m.observaciones,
        i.nombre as producto,
        i.codigo,
        i.unidad_medida,
        m.usuario_responsable
      FROM movimientos_inventario m
      JOIN insumos i ON m.id_insumo = i.id_insumo
      WHERE m.id_tenant = ? 
      AND (
        i.origen = 'Produccion Propia' OR 
        LOWER(i.nombre) LIKE '%viol%' OR 
        LOWER(i.nombre) LIKE '%biol%' OR 
        i.id_insumo IN (SELECT DISTINCT id_insumo FROM app_produccion_organica WHERE id_insumo IS NOT NULL)
      )
      ${dateFilter}
      ORDER BY m.fecha_movimiento DESC
    `, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in /movimientos-violes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Endpoint: Producción Historial y Detalles
router.get('/produccion', async (req, res) => {
  const { tenantId = 1, startDate, endDate } = req.query;
  try {
    let dateFilter = '';
    const params = [tenantId];
    if (startDate && endDate) {
      dateFilter = 'AND DATE(p.fecha_produccion) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // Main production rows
    const [produccion] = await getDb(req).query(`
      SELECT 
        p.id_produccion,
        p.fecha_produccion,
        p.cantidad_litros,
        p.costo_materiales,
        p.costo_jornales,
        (p.costo_materiales + p.costo_jornales) as costo_total,
        COALESCE(i.nombre, p.producto) as producto_nombre,
        i.codigo as producto_codigo,
        i.unidad_medida,
        l.nombre as nombre_lote
      FROM app_produccion_organica p
      LEFT JOIN insumos i ON p.id_insumo = i.id_insumo
      LEFT JOIN lotes l ON p.lote_id = l.id_lote
      WHERE p.id_tenant = ?
      ${dateFilter}
      ORDER BY p.fecha_produccion DESC
    `, params);

    // If there's production, get their details
    if (produccion.length > 0) {
      const prodIds = produccion.map(p => p.id_produccion);
      const [detalles] = await getDb(req).query(`
        SELECT 
          d.id_produccion,
          d.cantidad,
          d.costo_unitario,
          d.costo_total,
          i.nombre as insumo_nombre,
          i.codigo as insumo_codigo,
          i.unidad_medida
        FROM app_produccion_organica_detalles d
        JOIN insumos i ON d.id_insumo = i.id_insumo
        WHERE d.id_produccion IN (?)
      `, [prodIds]);

      // Merge detalles into produccion
      const detallesMap = {};
      detalles.forEach(d => {
        if (!detallesMap[d.id_produccion]) detallesMap[d.id_produccion] = [];
        detallesMap[d.id_produccion].push(d);
      });

      produccion.forEach(p => {
        p.detalles = detallesMap[p.id_produccion] || [];
      });
    }

    res.json({ success: true, data: produccion });
  } catch (error) {
    console.error('Error in /produccion:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
