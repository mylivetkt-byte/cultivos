import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

router.get('/evento-bodega-salida', async (req, res) => {
  try {
    const { tenantId } = req.query;
    const [rows] = await getDb(req).query(`
      SELECT m.id_movimiento, m.id_tenant, m.id_bodega, m.id_lote, m.cantidad, m.costo_unitario,
             m.fecha_movimiento, COALESCE(i.nombre, CONCAT('Insumo ', m.id_insumo)) AS insumo,
             COALESCE(l.nombre, CONCAT('Lote ', l.id_lote)) AS lote
      FROM movimientos_inventario m
      LEFT JOIN insumos i ON m.id_insumo = i.id_insumo
      LEFT JOIN lotes l ON m.id_lote = l.id_lote
      WHERE m.tipo_movimiento = 'Salida' AND m.id_tenant = ?
      ORDER BY m.fecha_movimiento DESC, m.id_movimiento DESC
      LIMIT 1
    `, [tenantId || 1]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No hay salidas de bodega registradas para contabilizar.' });
    }

    const salida = rows[0];
    res.json({
      id_tenant: salida.id_tenant,
      codigo_evento: 'BODEGA_SALIDA',
      tabla_origen: 'movimientos_inventario',
      id_origen: String(salida.id_movimiento),
      fecha: salida.fecha_movimiento,
      concepto: `Consumo agricola ${salida.insumo} - ${salida.lote}`,
      id_centro_costo: salida.id_lote || null,
      valores: {
        total: Number(salida.cantidad || 0) * Number(salida.costo_unitario || 0)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// El motor de integración ERP recibe eventos operativos y genera la contabilidad
router.post('/contabilizar', async (req, res) => {
  const {
    id_tenant,
    codigo_evento,
    tabla_origen,
    id_origen,
    fecha,
    concepto,
    id_tercero,
    id_centro_costo,
    valores // Ej: { total: 50000, iva: 9500, subtotal: 40500 }
  } = req.body;

  let connection;
  try {
    connection = await getDb(req).getConnection();
    await connection.beginTransaction();

    // 1. Buscar la plantilla asociada al evento
    const [plantillas] = await connection.query(
      'SELECT id_plantilla, id_tipo_doc_defecto, nombre FROM contab_plantillas WHERE id_tenant = ? AND codigo_evento = ?',
      [id_tenant, codigo_evento]
    );

    if (plantillas.length === 0) {
      // Evento no mapeado: No es un error, simplemente no genera contabilidad automática
      await connection.rollback();
      return res.json({ status: 'ignored', message: `No hay plantilla configurada para el evento ${codigo_evento}` });
    }

    const plantilla = plantillas[0];

    // 2. Bloquear y obtener el siguiente consecutivo (Pessimistic Locking)
    const [tiposDoc] = await connection.query(
      'SELECT id_tipo_doc, codigo, consecutivo_actual FROM tipos_documentos WHERE id_tipo_doc = ? FOR UPDATE',
      [plantilla.id_tipo_doc_defecto]
    );

    if (tiposDoc.length === 0) {
      throw new Error(`Tipo de documento ${plantilla.id_tipo_doc_defecto} no existe`);
    }

    const tipoDoc = tiposDoc[0];
    const numero_doc = `${tipoDoc.codigo}-${tipoDoc.consecutivo_actual}`;

    // 3. Incrementar el consecutivo
    await connection.query(
      'UPDATE tipos_documentos SET consecutivo_actual = consecutivo_actual + 1 WHERE id_tipo_doc = ?',
      [tipoDoc.id_tipo_doc]
    );

    // Convert ISO string to MySQL datetime
    let mysqlFecha = new Date();
    if (fecha) {
      mysqlFecha = new Date(fecha);
    }
    const isoToMysql = mysqlFecha.toISOString().slice(0, 19).replace('T', ' ');

    // 4. Crear el Documento Contable (Cabecera)
    // El id_comprobante queda NULL hasta que se haga el cierre contable (opcional)
    const [resultDoc] = await connection.query(
      `INSERT INTO contab_documentos 
      (id_tenant, id_tipo_doc, numero_doc, fecha, concepto, id_tercero, estado, tabla_origen, id_origen) 
      VALUES (?, ?, ?, ?, ?, ?, 'Aprobado', ?, ?)`,
      [
        id_tenant,
        tipoDoc.id_tipo_doc,
        numero_doc,
        isoToMysql,
        concepto || plantilla.nombre,
        id_tercero || null,
        tabla_origen,
        id_origen
      ]
    );

    const id_documento = resultDoc.insertId;

    // 5. Crear los Detalles Contables usando la plantilla
    const [detallesPlantilla] = await connection.query(
      'SELECT id_cuenta, naturaleza, concepto_defecto, variable_valor FROM contab_plantillas_detalles WHERE id_plantilla = ?',
      [plantilla.id_plantilla]
    );

    for (const d of detallesPlantilla) {
      // Tomamos el valor de 'valores' según el nombre de la variable configurada en la plantilla
      const valorBase = valores[d.variable_valor] || 0;

      if (valorBase > 0) {
        const debito = d.naturaleza === 'Debito' ? valorBase : 0;
        const credito = d.naturaleza === 'Credito' ? valorBase : 0;

        await connection.query(
          `INSERT INTO contab_detalles 
          (id_documento, id_cuenta, id_tercero, id_centro_costo, descripcion, valor_base, debito, credito)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id_documento,
            d.id_cuenta,
            id_tercero || null,
            id_centro_costo || null,
            d.concepto_defecto || concepto,
            valorBase,
            debito,
            credito
          ]
        );
      }
    }

    await connection.commit();
    connection.release();

    res.json({
      status: 'success',
      message: 'Contabilización exitosa',
      data: {
        id_documento,
        numero_doc,
        asientos_generados: detallesPlantilla.length
      }
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error('Error ERP Bridge:', error);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// GET Integraciones recientes (Auditoría)
router.get('/log-integraciones', async (req, res) => {
  try {
    const { tenantId } = req.query;
    const [rows] = await getDb(req).query(`
      SELECT 
        d.id_documento,
        d.numero_doc,
        d.fecha,
        d.concepto,
        d.tabla_origen,
        d.id_origen,
        t.nombre as tipo_doc_nombre,
        (SELECT SUM(debito) FROM contab_detalles WHERE id_documento = d.id_documento) as total_debito
      FROM contab_documentos d
      JOIN tipos_documentos t ON d.id_tipo_doc = t.id_tipo_doc
      WHERE d.id_tenant = ? AND d.tabla_origen IS NOT NULL
      ORDER BY d.fecha_creacion DESC
      LIMIT 100
    `, [tenantId || 1]);

    res.json(rows);
  } catch(error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
