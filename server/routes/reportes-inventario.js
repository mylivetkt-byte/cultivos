import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

router.get('/saldos', async (req, res) => {
  const { tenantId, fincaId, bodegaId, fechaCorte, buscarProducto } = req.query;
  
  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'Falta tenantId' });
  }

  try {
    let sql = `
      SELECT 
          b.id_finca,
          f.nombre AS finca_nombre,
          m.id_bodega,
          b.nombre AS bodega_nombre,
          m.id_insumo,
          i.codigo,
          i.nombre AS insumo_nombre,
          SUM(CASE WHEN m.tipo_movimiento = 'Entrada' THEN m.cantidad ELSE 0 END) - 
          SUM(CASE WHEN m.tipo_movimiento = 'Salida' THEN m.cantidad ELSE 0 END) AS saldo,
          MAX(m.fecha_movimiento) AS ultimo_movimiento
      FROM movimientos_inventario m
      JOIN bod_bodegas b ON m.id_bodega = b.id_bodega
      LEFT JOIN fincas f ON b.id_finca = f.id_finca
      JOIN insumos i ON m.id_insumo = i.id_insumo
      WHERE m.id_tenant = ?
    `;
    const params = [tenantId];

    if (fechaCorte) {
      // Ajustamos la hora al final del día si solo viene la fecha
      sql += ` AND m.fecha_movimiento <= ?`;
      params.push(`${fechaCorte} 23:59:59`);
    }

    if (fincaId && fincaId !== 'null' && fincaId !== 'Todas') {
      sql += ` AND b.id_finca = ?`;
      params.push(fincaId);
    }

    if (bodegaId && bodegaId !== 'null' && bodegaId !== 'Todas') {
      sql += ` AND m.id_bodega = ?`;
      params.push(bodegaId);
    }

    if (buscarProducto) {
      sql += ` AND (i.codigo LIKE ? OR i.nombre LIKE ?)`;
      params.push(`%${buscarProducto}%`, `%${buscarProducto}%`);
    }

    sql += `
      GROUP BY b.id_finca, f.nombre, m.id_bodega, b.nombre, m.id_insumo, i.codigo, i.nombre
      HAVING saldo <> 0
      ORDER BY f.nombre, b.nombre, i.nombre
    `;

    const [rows] = await getDb(req).query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error obteniendo saldos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/movimientos', async (req, res) => {
  const { tenantId, fincaId, bodegaId, buscarProducto, empleadoId, vehiculoId, maquinaId, loteId, viveroId, tipoMovimiento } = req.query;
  
  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'Falta tenantId' });
  }

  try {
    let sql = `
      SELECT 
          m.id_movimiento,
          m.fecha_movimiento,
          m.tipo_movimiento,
          m.cantidad,
          m.costo_unitario,
          m.observaciones,
          m.usuario_responsable,
          b.nombre AS bodega_nombre,
          f.nombre AS finca_nombre,
          i.codigo,
          i.nombre AS insumo_nombre,
          CONCAT(e.nombres, ' ', e.apellidos) AS empleado_nombre,
          v.placa AS vehiculo_placa,
          ma.marca_modelo AS maquina_nombre,
          l.nombre AS lote_nombre,
          vi.nombre AS vivero_nombre,
          CASE
            WHEN m.observaciones LIKE '%Traslado%' THEN m.observaciones
            WHEN m.tipo_movimiento = 'Entrada' THEN CONCAT('Bodega: ', b.nombre)
            WHEN m.id_empleado IS NOT NULL THEN CONCAT('Empleado: ', e.nombres, ' ', e.apellidos)
            WHEN m.id_vehiculo IS NOT NULL THEN CONCAT('Vehículo: ', v.placa)
            WHEN m.id_maquina IS NOT NULL THEN CONCAT('Máquina: ', ma.marca_modelo)
            WHEN m.id_lote IS NOT NULL THEN CONCAT('Lote: ', l.nombre)
            WHEN m.id_semillero IS NOT NULL THEN CONCAT('Vivero: ', vi.nombre)
            ELSE 'No especificado'
          END AS destino
      FROM movimientos_inventario m
      LEFT JOIN bod_bodegas b ON m.id_bodega = b.id_bodega
      LEFT JOIN fincas f ON b.id_finca = f.id_finca
      LEFT JOIN insumos i ON m.id_insumo = i.id_insumo
      LEFT JOIN rrhh_empleados e ON m.id_empleado = e.id_empleado
      LEFT JOIN vehiculos v ON m.id_vehiculo = v.id_vehiculo
      LEFT JOIN agroind_maquinaria_equipo ma ON m.id_maquina = ma.id_maq_agro
      LEFT JOIN lotes l ON m.id_lote = l.id_lote
      LEFT JOIN viveros vi ON m.id_semillero = vi.id_vivero
      WHERE m.id_tenant = ?
    `;
    const params = [tenantId];

    if (fincaId && fincaId !== 'null' && fincaId !== 'Todas') {
      sql += ` AND b.id_finca = ?`;
      params.push(fincaId);
    }
    if (bodegaId && bodegaId !== 'null' && bodegaId !== 'Todas') {
      sql += ` AND m.id_bodega = ?`;
      params.push(bodegaId);
    }
    if (empleadoId && empleadoId !== 'null' && empleadoId !== 'Todos') {
      sql += ` AND m.id_empleado = ?`;
      params.push(empleadoId);
    }
    if (vehiculoId && vehiculoId !== 'null' && vehiculoId !== 'Todos') {
      sql += ` AND m.id_vehiculo = ?`;
      params.push(vehiculoId);
    }
    if (maquinaId && maquinaId !== 'null' && maquinaId !== 'Todas') {
      sql += ` AND m.id_maquina = ?`;
      params.push(maquinaId);
    }
    if (loteId && loteId !== 'null' && loteId !== 'Todos') {
      sql += ` AND m.id_lote = ?`;
      params.push(loteId);
    }
    if (viveroId && viveroId !== 'null' && viveroId !== 'Todos') {
      sql += ` AND m.id_semillero = ?`;
      params.push(viveroId);
    }
    if (tipoMovimiento && tipoMovimiento !== 'null' && tipoMovimiento !== 'Todos') {
      if (tipoMovimiento === 'Traslado') {
        sql += ` AND m.observaciones LIKE '%Traslado%'`;
      } else {
        sql += ` AND m.tipo_movimiento = ?`;
        params.push(tipoMovimiento);
      }
    }
    if (buscarProducto) {
      sql += ` AND (i.codigo LIKE ? OR i.nombre LIKE ?)`;
      params.push(`%${buscarProducto}%`, `%${buscarProducto}%`);
    }

    sql += ` ORDER BY f.nombre ASC, m.fecha_movimiento ASC, m.tipo_movimiento ASC LIMIT 1000`;

    const [rows] = await getDb(req).query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error obteniendo movimientos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
