import express from 'express';
import pool from '../db.js';
import ContabilidadService from '../services/ContabilidadService.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// 1. Consulta Cruzada de Existencias
router.get('/existencias', async (req, res) => {
  try {
    const { tenantId, insumoId, bodegaId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'Falta tenantId' });

    let query = `
      SELECT e.id_existencia, e.id_bodega, b.nombre as bodega_nombre, b.es_principal,
             e.id_insumo, i.nombre as insumo_nombre, i.codigo, i.unidad_medida,
             e.cantidad, e.costo_promedio, e.fecha_ultima_actualizacion
      FROM inv_existencias e
      JOIN bod_bodegas b ON e.id_bodega = b.id_bodega
      JOIN insumos i ON e.id_insumo = i.id_insumo
      WHERE b.id_tenant = ?
    `;
    const params = [tenantId];

    if (insumoId) {
      query += ` AND e.id_insumo = ?`;
      params.push(insumoId);
    }
    if (bodegaId) {
      query += ` AND e.id_bodega = ?`;
      params.push(bodegaId);
    }

    const [rows] = await getDb(req).query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching existencias:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// 2. Tipos de Documentos
router.get('/tipos_documento', async (req, res) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'Falta tenantId' });

    const [rows] = await getDb(req).query('SELECT * FROM inv_tipos_documento WHERE id_tenant = ?', [tenantId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching tipos documento:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// 3. Crear/Procesar Documento
router.post('/documentos', async (req, res) => {
  const connection = await getDb(req).getConnection();
  try {
    await connection.beginTransaction();
    const { 
      id_tenant, id_tipo, id_bodega_origen, id_bodega_destino, 
      observaciones, id_usuario, detalles,
      peso_bascula_entrada, peso_bascula_salida, id_empleado_recibe, id_empleado_entrega, firma_recibe
    } = req.body;

    // Obtener información del tipo de documento
    const [tipos] = await connection.query('SELECT * FROM inv_tipos_documento WHERE id_tipo = ?', [id_tipo]);
    if (tipos.length === 0) throw new Error('Tipo de documento no encontrado');
    const tipo = tipos[0];

    // Generar consecutivo
    const consecutivo = `${tipo.codigo}-${tipo.consecutivo_actual.toString().padStart(5, '0')}`;
    await connection.query('UPDATE inv_tipos_documento SET consecutivo_actual = consecutivo_actual + 1 WHERE id_tipo = ?', [id_tipo]);

    // Insertar Documento
    const [docRes] = await connection.query(`
      INSERT INTO inv_documentos (
        id_tenant, id_tipo, consecutivo, id_bodega_origen, id_bodega_destino, 
        estado, observaciones, id_usuario_crea, 
        peso_bascula_entrada, peso_bascula_salida, id_empleado_recibe, id_empleado_entrega, firma_recibe
      )
      VALUES (?, ?, ?, ?, ?, 'Aplicado', ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_tenant, id_tipo, consecutivo, id_bodega_origen || null, id_bodega_destino || null, 
      observaciones || '', id_usuario || 1,
      peso_bascula_entrada || null, peso_bascula_salida || null, id_empleado_recibe || null, id_empleado_entrega || null, firma_recibe || null
    ]);
    
    const id_documento = docRes.insertId;

    // Procesar detalles y actualizar existencias
    for (const det of detalles) {
      let { id_insumo, cantidad, costo_unitario, id_unidad, id_maquinaria } = det;

      // Obtener Insumo para saber si es repuesto
      const [insData] = await connection.query(`
        SELECT i.*, g.nombre as categoria_tipo 
        FROM insumos i 
        LEFT JOIN inv_grupos g ON i.id_grupo = g.id_grupo 
        WHERE i.id_insumo = ?
      `, [id_insumo]);
      
      const insumo = insData[0];
      if (!insumo) throw new Error(`Insumo ID ${id_insumo} no encontrado`);

      // Conversión de Unidades
      if (id_unidad) {
        const [convs] = await connection.query('SELECT factor_multiplicador FROM inv_conversiones WHERE id_insumo = ? AND id_unidad_origen = ?', [id_insumo, id_unidad]);
        if (convs.length > 0) {
          cantidad = cantidad * parseFloat(convs[0].factor_multiplicador);
        }
      }

      if (tipo.naturaleza === 'Entrada') {
        // Entrada: Sumar a bodega destino
        if (!id_bodega_destino) throw new Error('Entrada requiere bodega destino');
        await connection.query(`
          INSERT INTO inv_existencias (id_bodega, id_insumo, cantidad, costo_promedio)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            costo_promedio = ((cantidad * costo_promedio) + (? * ?)) / (cantidad + ?),
            cantidad = cantidad + ?
        `, [id_bodega_destino, id_insumo, cantidad, costo_unitario || 0, cantidad, costo_unitario || 0, cantidad, cantidad]);

        await connection.query(`
          INSERT INTO movimientos_inventario (id_tenant, id_insumo, tipo_movimiento, cantidad, costo_unitario, documento_referencia, usuario_responsable, id_bodega, id_documento)
          VALUES (?, ?, 'Entrada', ?, ?, ?, ?, ?, ?)
        `, [id_tenant, id_insumo, cantidad, costo_unitario || 0, consecutivo, id_usuario || 1, id_bodega_destino, id_documento]);

      } else if (tipo.naturaleza === 'Salida') {
        // Salida: Restar a bodega origen
        if (!id_bodega_origen) throw new Error('Salida requiere bodega origen');
        const [exist] = await connection.query('SELECT cantidad FROM inv_existencias WHERE id_bodega = ? AND id_insumo = ?', [id_bodega_origen, id_insumo]);
        if (exist.length === 0 || exist[0].cantidad < cantidad) {
          throw new Error(`Stock insuficiente para el insumo ID ${id_insumo} en la bodega origen.`);
        }

        await connection.query('UPDATE inv_existencias SET cantidad = cantidad - ? WHERE id_bodega = ? AND id_insumo = ?', [cantidad, id_bodega_origen, id_insumo]);
        
        await connection.query(`
          INSERT INTO movimientos_inventario (id_tenant, id_insumo, tipo_movimiento, cantidad, documento_referencia, usuario_responsable, id_bodega, id_documento)
          VALUES (?, ?, 'Salida', ?, ?, ?, ?, ?)
        `, [id_tenant, id_insumo, cantidad, consecutivo, id_usuario || 1, id_bodega_origen, id_documento]);

      } else if (tipo.naturaleza === 'Transferencia') {
        // Transferencia: Restar origen, Sumar destino
        if (!id_bodega_origen || !id_bodega_destino) throw new Error('Transferencia requiere origen y destino');
        
        // Restar origen
        const [exist] = await connection.query('SELECT cantidad, costo_promedio FROM inv_existencias WHERE id_bodega = ? AND id_insumo = ?', [id_bodega_origen, id_insumo]);
        if (exist.length === 0 || exist[0].cantidad < cantidad) {
          throw new Error(`Stock insuficiente para el insumo ID ${id_insumo} en la bodega origen.`);
        }
        const costo = exist[0].costo_promedio;
        await connection.query('UPDATE inv_existencias SET cantidad = cantidad - ? WHERE id_bodega = ? AND id_insumo = ?', [cantidad, id_bodega_origen, id_insumo]);
        
        // Sumar destino
        await connection.query(`
          INSERT INTO inv_existencias (id_bodega, id_insumo, cantidad, costo_promedio)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            costo_promedio = ((cantidad * costo_promedio) + (? * ?)) / (cantidad + ?),
            cantidad = cantidad + ?
        `, [id_bodega_destino, id_insumo, cantidad, costo, cantidad, costo, cantidad, cantidad]);

        // Registrar movimientos
        await connection.query(`
          INSERT INTO movimientos_inventario (id_tenant, id_insumo, tipo_movimiento, cantidad, costo_unitario, documento_referencia, usuario_responsable, id_bodega, id_documento)
          VALUES (?, ?, 'Salida', ?, ?, ?, ?, ?, ?)
        `, [id_tenant, id_insumo, cantidad, costo, consecutivo, id_usuario || 1, id_bodega_origen, id_documento]);
        
        await connection.query(`
          INSERT INTO movimientos_inventario (id_tenant, id_insumo, tipo_movimiento, cantidad, costo_unitario, documento_referencia, usuario_responsable, id_bodega, id_documento)
          VALUES (?, ?, 'Entrada', ?, ?, ?, ?, ?, ?)
        `, [id_tenant, id_insumo, cantidad, costo, consecutivo, id_usuario || 1, id_bodega_destino, id_documento]);
      }

      // Lógica Inversa: Si es un Repuesto y es una Salida o Transferencia (sale de la bodega principal)
      if (insumo.categoria_tipo && insumo.categoria_tipo.toLowerCase().includes('repuesto') && (tipo.naturaleza === 'Salida' || tipo.naturaleza === 'Transferencia')) {
        if (!id_empleado_recibe) throw new Error('Se requiere especificar el Empleado que recibe el repuesto.');
        if (!id_maquinaria) throw new Error('Se requiere especificar la Maquinaria para el repuesto.');
        
        await connection.query(`
          INSERT INTO inv_repuestos_cambiados (id_tenant, id_documento_salida, id_insumo, id_maquinaria, id_empleado, pieza_vieja_entregada)
          VALUES (?, ?, ?, ?, ?, FALSE)
        `, [id_tenant, id_documento, id_insumo, id_maquinaria, id_empleado_recibe]);
      }
    }

    // === INTEGRACION CONTABLE ===
    try {
      let monto_total = 0;
      detalles.forEach(d => { monto_total += (d.cantidad * (d.costo_unitario || 0)); });
      
      const [bodegas] = await connection.query('SELECT id_finca FROM bod_bodegas WHERE id_bodega = ?', [id_bodega_origen || id_bodega_destino]);
      const id_finca = bodegas.length > 0 ? bodegas[0].id_finca : null;

      if (id_finca && monto_total > 0) {
        await ContabilidadService.generarComprobanteAutomatico({
          id_tenant,
          id_finca,
          modulo: 'INVENTARIO',
          id_tipo_documento: id_tipo,
          monto_total,
          concepto: observaciones || `Documento de Inventario ${consecutivo}`,
          fecha: new Date(),
          id_usuario: id_usuario || 1
        });
      }
    } catch (contabErr) {
      console.error('Error en Integracion Contable (no bloqueante):', contabErr);
    }
    // ============================

    await connection.commit();
    res.json({ success: true, consecutivo, id_documento });
  } catch (error) {
    await connection.rollback();
    console.error('Error procesando documento:', error);
    res.status(500).json({ error: error.message || 'Error del servidor' });
  } finally {
    connection.release();
  }
});

// 4. Listar Documentos
router.get('/documentos', async (req, res) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'Falta tenantId' });

    const [rows] = await getDb(req).query(`
      SELECT d.*, t.nombre as tipo_nombre, t.naturaleza, 
             bo.nombre as origen_nombre, bd.nombre as destino_nombre
      FROM inv_documentos d
      JOIN inv_tipos_documento t ON d.id_tipo = t.id_tipo
      LEFT JOIN bod_bodegas bo ON d.id_bodega_origen = bo.id_bodega
      LEFT JOIN bod_bodegas bd ON d.id_bodega_destino = bd.id_bodega
      WHERE d.id_tenant = ?
      ORDER BY d.fecha DESC LIMIT 100
    `, [tenantId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching documentos:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// 5. Listar Pedidos
router.get('/pedidos', async (req, res) => {
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'Falta tenantId' });

    const [rows] = await getDb(req).query(`
      SELECT p.*, bs.nombre as solicita_nombre, bp.nombre as provee_nombre
      FROM inv_pedidos p
      JOIN bod_bodegas bs ON p.id_bodega_solicita = bs.id_bodega
      LEFT JOIN bod_bodegas bp ON p.id_bodega_provee = bp.id_bodega
      WHERE p.id_tenant = ?
      ORDER BY p.fecha_solicitud DESC
    `, [tenantId]);

    // get details
    for (const row of rows) {
      const [det] = await getDb(req).query(`
        SELECT pd.*, i.nombre as insumo_nombre, i.codigo, i.unidad_medida
        FROM inv_pedidos_detalle pd
        JOIN insumos i ON pd.id_insumo = i.id_insumo
        WHERE pd.id_pedido = ?
      `, [row.id_pedido]);
      row.detalles = det;
    }

    res.json(rows);
  } catch (error) {
    console.error('Error fetching pedidos:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// 6. Generar Pedido Automático
router.post('/pedidos/auto', async (req, res) => {
  const connection = await getDb(req).getConnection();
  try {
    await connection.beginTransaction();
    const { id_tenant, id_bodega_solicita, id_insumo, cantidad_solicitada, observaciones, id_usuario } = req.body;

    // Buscar bodega principal para abastecer
    const [bps] = await connection.query('SELECT id_bodega FROM bod_bodegas WHERE id_tenant = ? AND es_principal = TRUE LIMIT 1', [id_tenant]);
    const id_bodega_provee = bps.length > 0 ? bps[0].id_bodega : null;

    const [pedRes] = await connection.query(`
      INSERT INTO inv_pedidos (id_tenant, id_bodega_solicita, id_bodega_provee, estado, observaciones, id_usuario_solicita)
      VALUES (?, ?, ?, 'Pendiente_Aprobacion', ?, ?)
    `, [id_tenant, id_bodega_solicita, id_bodega_provee, observaciones || 'Pedido Automático por Desabastecimiento', id_usuario || 1]);
    
    await connection.query(`
      INSERT INTO inv_pedidos_detalle (id_pedido, id_insumo, cantidad_solicitada)
      VALUES (?, ?, ?)
    `, [pedRes.insertId, id_insumo, cantidad_solicitada]);

    await connection.commit();
    res.json({ success: true, id_pedido: pedRes.insertId });
  } catch (error) {
    await connection.rollback();
    console.error('Error generando pedido:', error);
    res.status(500).json({ error: error.message || 'Error del servidor' });
  } finally {
    connection.release();
  }
});

// 7. Aprobar Pedido (Gerencia)
router.put('/pedidos/:id/aprobar', async (req, res) => {
  try {
    const id_pedido = req.params.id;
    const { id_usuario_aprueba, detalles } = req.body;

    // detalles es un array con { id_detalle, cantidad_aprobada }
    for (const det of detalles) {
      await getDb(req).query('UPDATE inv_pedidos_detalle SET cantidad_aprobada = ? WHERE id_detalle = ?', [det.cantidad_aprobada, det.id_detalle]);
    }

    await getDb(req).query(`
      UPDATE inv_pedidos 
      SET estado = 'Aprobado', fecha_aprobacion = CURRENT_TIMESTAMP, id_usuario_aprueba = ?
      WHERE id_pedido = ?
    `, [id_usuario_aprueba || 1, id_pedido]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error aprobando pedido:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// 8. Listar Unidades de Medida
router.get('/unidades', async (req, res) => {
  try {
    const { tenantId } = req.query;
    const [rows] = await getDb(req).query('SELECT * FROM inv_unidades_medida WHERE id_tenant = ?', [tenantId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching unidades' });
  }
});

// 9. Repuestos Usados (Logística Inversa)
router.get('/repuestos_usados', async (req, res) => {
  try {
    const { tenantId } = req.query;
    const [rows] = await getDb(req).query(`
      SELECT r.*, i.nombre as insumo_nombre, i.codigo, 
             CONCAT(e.nombres, ' ', e.apellidos) as empleado_nombre, m.marca_modelo as maquina_nombre,
             d.consecutivo, d.fecha as fecha_salida
      FROM inv_repuestos_cambiados r
      JOIN insumos i ON r.id_insumo = i.id_insumo
      JOIN rrhh_empleados e ON r.id_empleado = e.id_empleado
      JOIN agroind_maquinaria_equipo m ON r.id_maquinaria = m.id_maq_agro
      JOIN inv_documentos d ON r.id_documento_salida = d.id_documento
      WHERE r.id_tenant = ?
      ORDER BY r.pieza_vieja_entregada ASC, d.fecha DESC
    `, [tenantId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching repuestos usados' });
  }
});

router.put('/repuestos_usados/:id/entregar', async (req, res) => {
  try {
    const id = req.params.id;
    await getDb(req).query('UPDATE inv_repuestos_cambiados SET pieza_vieja_entregada = TRUE, fecha_entrega_pieza = CURRENT_TIMESTAMP WHERE id_cambio = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error updating repuesto' });
  }
});

export default router;
