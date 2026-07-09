import express from 'express';
import pool from '../db.js';
import fetch from 'node-fetch'; // if we want to call the whatsapp endpoint internally or we can do it via http

const router = express.Router();

router.post('/ejecutar', async (req, res) => {
  const tenantId = req.tenantId;
  const { items, ubicacion, observaciones } = req.body;

  if (!tenantId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Faltan datos obligatorios o los items están vacíos' });
  }

  const db = req.tenantPool || pool;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    let totalCosto = 0;
    const suffix = Date.now().toString().slice(-4);
    
    // 1. Crear Documento de Salida de Inventario
    const [docSalida] = await connection.query(`
      INSERT INTO inv_documentos (id_tenant, id_tipo, consecutivo, fecha, estado, observaciones)
      VALUES (?, 2, ?, CURDATE(), 'Aplicado', ?)
    `, [tenantId, 'SAL-RECETA-' + suffix, observaciones || 'Salida por receta IA']);
    const idDocSalida = docSalida.insertId;

    // 2. Procesar cada item: Rebajar inventario y calcular costo
    for (const item of items) {
      const cantidadReq = parseFloat(item.cantidadRequerida);
      const idInsumo = item.id_insumo;

      // Obtener costo actual y stock
      const [insumoRows] = await connection.query(`SELECT costo_unitario, stock_actual, nombre FROM insumos WHERE id_insumo = ?`, [idInsumo]);
      if (insumoRows.length === 0) throw new Error(`Insumo ID ${idInsumo} no encontrado.`);
      
      const insumo = insumoRows[0];
      const costoUnitario = insumo.costo_unitario || 0;
      totalCosto += (costoUnitario * cantidadReq);

      // Rebajar stock en insumos
      await connection.query(`
        UPDATE insumos 
        SET stock_actual = stock_actual - ? 
        WHERE id_insumo = ?
      `, [cantidadReq, idInsumo]);

      // Registrar movimiento de salida
      await connection.query(`
        INSERT INTO movimientos_inventario (id_tenant, id_insumo, tipo_movimiento, cantidad, costo_unitario, fecha_movimiento, id_documento, id_bodega, observaciones, usuario_responsable) 
        VALUES (?, ?, 'SALIDA', ?, ?, NOW(), ?, 1, ?, 1)
      `, [tenantId, idInsumo, cantidadReq, costoUnitario, idDocSalida, 'Aplicación de receta en lote ' + (ubicacion?.lote || 'N/A')]);
    }

    // 3. Crear Comprobante Contable de Egreso
    const [compEgreso] = await connection.query(`
      INSERT INTO contab_comprobantes (id_tenant, id_periodo, id_tipo_comp, numero, descripcion, estado, fecha_creacion)
      VALUES (?, 1, 3, ?, 'Comprobante de Egreso - Consumo Receta IA', 'Abierto', CURDATE())
    `, [tenantId, 'CE-RECETA-' + suffix]);
    const idCompEgreso = compEgreso.insertId;

    const [docContabEgreso] = await connection.query(`
      INSERT INTO contab_documentos (id_tenant, id_comprobante, id_tipo_doc, numero_doc, fecha, concepto, estado)
      VALUES (?, ?, 3, ?, CURDATE(), 'Egreso por Consumo Receta', 'Aprobado')
    `, [tenantId, idCompEgreso, 'DOC-EGRESO-' + suffix]);
    const idDocContabEgreso = docContabEgreso.insertId;

    // Detalles contables (Cargar al Gasto, Abonar al Inventario)
    await connection.query(`
      INSERT INTO contab_detalles (id_documento, id_cuenta, descripcion, debito, credito)
      VALUES (?, 4, 'Gasto por Insumos Agrícolas - Lote ${ubicacion?.lote || 'N/A'}', ?, 0),
             (?, 1, 'Inventario General (Salida)', 0, ?)
    `, [idDocContabEgreso, totalCosto, idDocContabEgreso, totalCosto]);

    await connection.commit();

    // 4. Disparar notificaciones de WhatsApp (asíncrono, no bloqueante)
    setTimeout(async () => {
      try {
        const payload = {
          tenantId,
          type: 'RECIPE_EXECUTION',
          data: {
            ubicacion,
            itemsCount: items.length,
            costoTotal: totalCosto,
            comprobante: 'CE-RECETA-' + suffix
          }
        };
        // Call internal Whatsapp API
        await fetch('http://localhost:3002/api/whatsapp/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {})
          },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.error("Error al notificar por WhatsApp:", err);
      }
    }, 100);

    res.json({
      success: true,
      message: 'Receta procesada correctamente. Inventario rebajado y comprobante generado.',
      documentoSalida: 'SAL-RECETA-' + suffix,
      comprobanteContable: 'CE-RECETA-' + suffix
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error en /api/recetas/ejecutar:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

export default router;
