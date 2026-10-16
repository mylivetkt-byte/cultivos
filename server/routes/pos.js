import { Router } from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';
import ContabilidadService from '../services/ContabilidadService.js';
import bcrypt from 'bcrypt';

const router = Router();

// GET /api/pos/trm-dia
router.get('/trm-dia', (req, res) => {
  // Returns TRM for conversion (COP per USD)
  res.json({ success: true, trm: 4120.00 });
});

// GET /api/pos/productos
router.get('/productos', async (req, res) => {
  const { tenantId, bodegaId } = req.query;
  const tId = tenantId ? parseInt(tenantId, 10) : 1;
  const bId = bodegaId ? parseInt(bodegaId, 10) : null;

  try {
    // 1. Fetch insumos with overall stock
    let sql = `
      SELECT i.id_insumo, i.codigo, i.nombre, i.unidad_medida, i.costo_unitario, i.stock_actual,
             COALESCE(e.cantidad, 0) as stock_bodega, e.costo_promedio, i.es_venta, i.actualiza_inventario, i.tipo_item, i.aplica_iva, i.porcentaje_iva, i.descuento_porcentaje,
             i.precio_venta_1, i.precio_venta_2, i.precio_venta_3
      FROM insumos i
      LEFT JOIN inv_existencias e ON i.id_insumo = e.id_insumo ${bId ? 'AND e.id_bodega = ?' : ''}
      WHERE i.id_tenant = ? AND i.estado = 'Activo' AND i.es_venta = 1
    `;
    const params = bId ? [bId, tId] : [tId];
    const [insumos] = await getDb(req).query(sql, params);

    // 2. Fetch lotes stock per product if bodega is selected
    let lotes = [];
    if (bId) {
      const [loteRows] = await getDb(req).query(
        `SELECT id_lote_existencia, id_insumo, lote, fecha_vencimiento, cantidad, costo_unitario 
         FROM inv_lotes_existencia 
         WHERE id_tenant = ? AND id_bodega = ? AND estado IN ('Disponible', 'Parcial') AND cantidad > 0`,
        [tId, bId]
      );
      lotes = loteRows;
    }

    res.json({ success: true, insumos, lotes });
  } catch (error) {
    console.error('Error fetching POS products:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pos/arqueo/estado/:id_usuario
router.get('/arqueo/estado/:id_usuario', async (req, res) => {
  const { id_usuario } = req.params;
  const { tenantId } = req.query;
  const tId = tenantId ? parseInt(tenantId, 10) : 1;

  try {
    const [rows] = await getDb(req).query(
      `SELECT * FROM pos_arqueos WHERE id_tenant = ? AND id_usuario = ? AND estado = 'Abierta' LIMIT 1`,
      [tId, id_usuario]
    );
    res.json({ success: true, arqueo: rows[0] || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pos/arqueo/apertura
router.post('/arqueo/apertura', async (req, res) => {
  const { tenantId, id_usuario, saldo_inicial, id_caja, turno, id_finca, clave_cajero } = req.body;
  const tId = tenantId ? parseInt(tenantId, 10) : 1;

  try {
    const conn = await getDb(req).getConnection();
    
    // Validate Clave if provided
    if (clave_cajero) {
      const [cajaRow] = await conn.query('SELECT clave_cajero FROM pos_cajas WHERE id_caja = ? AND id_tenant = ?', [id_caja, tId]);
      if (cajaRow.length === 0) {
        conn.release();
        return res.status(404).json({ error: 'Caja no encontrada.' });
      }
      const isMatch = await bcrypt.compare(clave_cajero, cajaRow[0].clave_cajero);
      if (!isMatch && clave_cajero !== 'ADMIN123' && clave_cajero !== '1234') { // Fallbacks for testing
        conn.release();
        return res.status(401).json({ error: 'Clave de acceso incorrecta.' });
      }
    }

    const [existing] = await conn.query(
      `SELECT id_arqueo FROM pos_arqueos WHERE id_tenant = ? AND id_usuario = ? AND estado = 'Abierta' LIMIT 1`,
      [tId, id_usuario]
    );
    if (existing.length > 0) {
      conn.release();
      return res.status(400).json({ error: 'Ya tienes un turno o arqueo de caja abierto.' });
    }

    let id_bodega = 1;
    if (id_caja) {
      const [caja] = await conn.query(`SELECT id_bodega FROM pos_cajas WHERE id_caja = ?`, [id_caja]);
      if (caja.length > 0) id_bodega = caja[0].id_bodega;
    }

    const [result] = await conn.query(
      `INSERT INTO pos_arqueos (id_tenant, id_finca, id_usuario, id_caja, id_bodega, turno, fecha_apertura, saldo_inicial, estado)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, 'Abierta')`,
      [tId, id_finca || null, id_usuario, id_caja || null, id_bodega, turno || 'General', saldo_inicial || 0.00]
    );

    conn.release();
    res.json({ success: true, id_arqueo: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pos/arqueo/cierre
router.post('/arqueo/cierre', async (req, res) => {
  const { id_arqueo, saldo_final_real, ventas_efectivo, ventas_credito, ventas_bancos, ventas_td, ventas_tc, ventas_nequi, ventas_otros, ingresos_adicionales, egresos_caja } = req.body;

  try {
    const [arqueos] = await getDb(req).query(
      `SELECT * FROM pos_arqueos WHERE id_arqueo = ? AND estado = 'Abierta'`,
      [id_arqueo]
    );
    if (arqueos.length === 0) {
      return res.status(404).json({ error: 'Arqueo no encontrado o ya cerrado.' });
    }
    const arq = arqueos[0];

    // Calculate system balance: saldo_inicial + cash sales (sales paid in cash since fecha_apertura)
    const [sales] = await getDb(req).query(
      `SELECT COALESCE(SUM(total), 0) as total_ventas_efectivo
       FROM documentos_comerciales
       WHERE id_tenant = ? AND usuario_creacion = ? 
         AND fecha_creacion >= ? AND tipo_pago = 'Contado' AND estado != 'Anulado'`,
      [arq.id_tenant, arq.id_usuario, arq.fecha_apertura]
    );
    const totalEfectivoVentas = Number(sales[0]?.total_ventas_efectivo || 0);

    // Calculate total retiros parciales
    const [retiros] = await getDb(req).query(
      `SELECT COALESCE(SUM(monto), 0) as total_retiros FROM pos_retiros_caja WHERE id_arqueo = ?`,
      [id_arqueo]
    );
    const totalRetiros = Number(retiros[0]?.total_retiros || 0);

    const ingAdicionales = Number(ingresos_adicionales || 0);
    const egrCaja = Number(egresos_caja || 0) + totalRetiros;
    const saldoFinalSistema = Number(arq.saldo_inicial) + totalEfectivoVentas + ingAdicionales - egrCaja;
    const finalReal = Number(saldo_final_real || 0);
    const diferencia = finalReal - saldoFinalSistema;

    await getDb(req).query(
      `UPDATE pos_arqueos 
       SET fecha_cierre = NOW(), saldo_final_sistema = ?, saldo_final_real = ?, diferencia = ?, estado = 'Cerrada',
           ventas_efectivo = ?, ventas_credito = ?, ventas_bancos = ?, ventas_td = ?, ventas_tc = ?, ventas_nequi = ?, ventas_otros = ?,
           ingresos_adicionales = ?, egresos_caja = ?
       WHERE id_arqueo = ?`,
      [saldoFinalSistema, finalReal, diferencia, ventas_efectivo || 0, ventas_credito || 0, ventas_bancos || 0, ventas_td || 0, ventas_tc || 0, ventas_nequi || 0, ventas_otros || 0, ingAdicionales, egrCaja, id_arqueo]
    );

    res.json({
      success: true,
      arqueo: {
        id_arqueo,
        saldo_inicial: arq.saldo_inicial,
        total_ventas_efectivo: totalEfectivoVentas,
        saldo_final_sistema: saldoFinalSistema,
        saldo_final_real: finalReal,
        diferencia
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pos/retiros/arqueo/:id_arqueo
router.get('/retiros/arqueo/:id_arqueo', async (req, res) => {
  const { id_arqueo } = req.params;
  try {
    const [retiros] = await getDb(req).query(
      `SELECT r.*, u.username as supervisor 
       FROM pos_retiros_caja r
       LEFT JOIN usuarios u ON r.id_usuario_autoriza = u.id_usuario
       WHERE r.id_arqueo = ?
       ORDER BY r.fecha_retiro DESC`,
      [id_arqueo]
    );
    res.json({ success: true, retiros });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pos/retiro
router.post('/retiro', async (req, res) => {
  const { id_arqueo, monto, observaciones, clave_supervisor } = req.body;
  if (!monto || monto <= 0) {
    return res.status(400).json({ error: 'El monto debe ser mayor a cero.' });
  }

  try {
    const conn = await getDb(req).getConnection();
    
    // Validate supervisor key
    const [usuarios] = await conn.query('SELECT id_usuario FROM usuarios WHERE role = ? LIMIT 1', ['admin']);
    const id_usuario_autoriza = usuarios[0]?.id_usuario || 1;
    // En una implementación real, se validaría el hash bcrypt de la clave del supervisor, 
    // pero como el usuario requirió simplificar esto al 'ADMIN123' o la clave del cajero supervisor
    // Validaremos un string duro o una consulta si corresponde.
    if (clave_supervisor !== 'ADMIN123' && clave_supervisor !== '1234') {
       conn.release();
       return res.status(401).json({ error: 'Clave de supervisor incorrecta.' });
    }

    const [result] = await conn.query(
      'INSERT INTO pos_retiros_caja (id_arqueo, id_usuario_autoriza, monto, observaciones) VALUES (?, ?, ?, ?)',
      [id_arqueo, id_usuario_autoriza, monto, observaciones || 'Retiro parcial (Sangría)']
    );
    
    conn.release();
    res.json({ success: true, id_retiro: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pos/arqueo/:id_arqueo/resumen
router.get('/arqueo/:id_arqueo/resumen', async (req, res) => {
  const { id_arqueo } = req.params;
  try {
    const conn = await getDb(req).getConnection();
    const [arqueo] = await conn.query('SELECT * FROM pos_arqueos WHERE id_arqueo = ?', [id_arqueo]);
    if (!arqueo.length) {
      conn.release();
      return res.status(404).json({ error: 'Arqueo no encontrado' });
    }

    const [sales] = await conn.query(
      `SELECT 
         COUNT(id_documento) as total_facturas,
         SUM(total) as total_ventas,
         SUM(CASE WHEN tipo_pago = 'Contado' THEN total ELSE 0 END) as ventas_efectivo,
         SUM(CASE WHEN tipo_pago = 'Credito' THEN total ELSE 0 END) as ventas_credito,
         SUM(CASE WHEN tipo_pago = 'Transferencia Bancaria' THEN total ELSE 0 END) as ventas_bancos,
         SUM(CASE WHEN tipo_pago = 'Tarjeta Debito' THEN total ELSE 0 END) as ventas_td,
         SUM(CASE WHEN tipo_pago = 'Tarjeta Credito' THEN total ELSE 0 END) as ventas_tc,
         SUM(CASE WHEN tipo_pago = 'Nequi' THEN total ELSE 0 END) as ventas_nequi
       FROM documentos_comerciales WHERE id_arqueo = ? AND estado != 'Anulado'`,
      [id_arqueo]
    );

    const [retiros] = await conn.query('SELECT SUM(monto) as total_retiros FROM pos_retiros_caja WHERE id_arqueo = ?', [id_arqueo]);
    conn.release();

    res.json({
      success: true,
      resumen: {
        ...arqueo[0],
        total_facturas: sales[0].total_facturas || 0,
        total_ventas: sales[0].total_ventas || 0,
        ventas_efectivo: sales[0].ventas_efectivo || 0,
        ventas_credito: sales[0].ventas_credito || 0,
        ventas_bancos: sales[0].ventas_bancos || 0,
        ventas_td: sales[0].ventas_td || 0,
        ventas_tc: sales[0].ventas_tc || 0,
        ventas_nequi: sales[0].ventas_nequi || 0,
        total_retiros: retiros[0].total_retiros || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pos/venta
router.post('/venta', async (req, res) => {
  const {
    id_tenant,
    id_finca,
    id_tercero,
    tipo_pago,
    moneda,
    tasa_trm,
    incoterm,
    doc_transporte,
    flete_tipo,
    subtotal,
    descuento_total,
    iva_total,
    total,
    items,
    usuario_creacion,
    observaciones,
    id_bodega,
    pagos,
    id_caja,
    id_arqueo
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'La venta debe contener al menos un producto.' });
  }

  const conn = await getDb(req).getConnection();
  try {
    await conn.beginTransaction();

    // 1. Generate consecutive number based on POS Resolution
    let consecutivo = `FV-POS-${Date.now().toString().slice(-6)}`;
    let id_resolucion = null;

    if (id_caja) {
      const [caja] = await conn.query('SELECT id_resolucion FROM pos_cajas WHERE id_caja = ?', [id_caja]);
      if (caja.length > 0 && caja[0].id_resolucion) {
        id_resolucion = caja[0].id_resolucion;
        
        // Fetch Resolution Data
        const [resRows] = await conn.query('SELECT prefijo, consecutivo_actual, consecutivo_inicial FROM dian_resoluciones WHERE id_resolucion = ? FOR UPDATE', [id_resolucion]);
        if (resRows.length > 0) {
          const resolucion = resRows[0];
          const siguiente = (resolucion.consecutivo_actual || resolucion.consecutivo_inicial || 0) + 1;
          
          consecutivo = `${resolucion.prefijo || ''}${siguiente}`;
          
          // Update Resolution
          await conn.query('UPDATE dian_resoluciones SET consecutivo_actual = ? WHERE id_resolucion = ?', [siguiente, id_resolucion]);
        }
      }
    }

    // 2. Insert into documentos_comerciales (factura de venta header)
    const [docRes] = await conn.query(
      `INSERT INTO documentos_comerciales 
        (id_tenant, id_tercero, numero_documento, fecha_emision, fecha_vencimiento, subtotal, descuento_total, iva_total, total, estado, tipo_pago, plazo_dias, usuario_creacion, id_caja, id_arqueo, observaciones, moneda, tasa_trm, incoterm, doc_transporte, flete_tipo)
       VALUES (?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?, ?, ?, ?, 'Emitido', ?, 30, ?, ?, ?, ?, ?, ?, ?, ?, ? )`,
      [
        id_tenant || 1,
        id_tercero,
        consecutivo,
        subtotal || 0,
        descuento_total || 0,
        iva_total || 0,
        total || 0,
        tipo_pago || 'Contado',
        usuario_creacion || 1,
        id_caja || null,
        id_arqueo || null,
        observaciones || 'Venta registrada desde Punto de Venta (POS)',
        moneda || 'COP',
        tasa_trm || 1.0000,
        incoterm || null,
        doc_transporte || null,
        flete_tipo || 'Comprador'
      ]
    );

    const id_documento = docRes.insertId;

    // 3. Process each item (insert lines, deduct stock, update lotes, write movements)
    for (const item of items) {
      // 3a. Insert detail line
      await conn.query(
        `INSERT INTO documentos_comerciales_detalle 
          (id_documento, id_insumo, id_lote, cantidad, precio_unitario, descuento, iva_porcentaje, iva_valor, tara, peso_neto)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ? )`,
        [
          id_documento,
          item.id_insumo,
          item.id_lote || null,
          item.cantidad,
          item.precio_unitario,
          item.descuento || 0.00,
          item.iva_porcentaje || 0.00,
          item.iva_valor || 0.00,
          item.tara || 0.00,
          item.peso_neto || item.cantidad
        ]
      );

      // Check if item updates inventory
      const actualizaInv = (item.actualiza_inventario === 1 || item.actualiza_inventario === true || item.actualiza_inventario === '1');

      if (actualizaInv) {
        // 3b. Update stock in general insumos
        await conn.query(
          `UPDATE insumos SET stock_actual = COALESCE(stock_actual, 0) - ? WHERE id_insumo = ?`,
          [item.cantidad, item.id_insumo]
        );

        // 3c. Update stock in warehouse inv_existencias
        if (id_bodega) {
          await conn.query(
            `UPDATE inv_existencias SET cantidad = cantidad - ? WHERE id_bodega = ? AND id_insumo = ?`,
            [item.cantidad, id_bodega, item.id_insumo]
          );
        }

        // 3d. Update inv_lotes_existencia if a specific lot was picked
        if (item.id_lote) {
          await conn.query(
            `UPDATE inv_lotes_existencia 
             SET cantidad = cantidad - ?,
                 estado = IF(cantidad - ? <= 0, 'Agotado', 'Parcial')
             WHERE id_lote_existencia = ?`,
            [item.cantidad, item.cantidad, item.id_lote]
          );
        }

        // 3e. Insert inventory movement log
        await conn.query(
          `INSERT INTO movimientos_inventario
            (id_tenant, id_insumo, tipo_movimiento, cantidad, costo_unitario, documento_referencia, usuario_responsable, observaciones, id_bodega, id_documento)
           VALUES (?, ?, 'Salida', ?, ?, ?, ?, ?, ?, ?)`,
          [
            id_tenant || 1,
            item.id_insumo,
            item.cantidad,
            item.precio_unitario,
            consecutivo,
            usuario_creacion || 1,
            `Salida por venta POS ${consecutivo}`,
            id_bodega || null,
            id_documento
          ]
        );
      }
    }

    // 3.5. Insert payments (Split Tender)
    if (pagos && Array.isArray(pagos) && pagos.length > 0) {
      for (const p of pagos) {
        await conn.query(
          `INSERT INTO documentos_comerciales_pagos (id_documento, tipo_pago, monto, referencia) VALUES (?, ?, ?, ?)`,
          [id_documento, p.tipo_pago, p.monto, p.referencia || null]
        );
      }
    } else {
      // Fallback for older clients
      await conn.query(
        `INSERT INTO documentos_comerciales_pagos (id_documento, tipo_pago, monto, referencia) VALUES (?, ?, ?, ?)`,
        [id_documento, tipo_pago || 'Contado', total, null]
      );
    }

    // 4. Automatic CXC Cartera posting if Credit or Mixto
    const isCredit = (tipo_pago === 'Credito' || tipo_pago === 'Mixto' || tipo_pago === 'Pago Efectivo y Nequi') || (pagos && pagos.some(p => p.tipo_pago === 'Credito'));
    if (isCredit) {
      const saldoPendiente = pagos ? pagos.filter(p => p.tipo_pago === 'Credito').reduce((sum, p) => sum + Number(p.monto), 0) : total;
      if (saldoPendiente > 0) {
        await conn.query(
          `INSERT INTO cartera_cxc (id_documento, saldo_pendiente, estado) VALUES (?, ?, 'Vigente')`,
          [id_documento, saldoPendiente]
        );
      }
    }

    // 5. Automatic Accounting posting if finca is configured
    if (id_finca) {
      await ContabilidadService.generarComprobanteAutomatico({
        id_tenant: id_tenant || 1,
        id_finca,
        modulo: 'Ventas',
        id_tipo_documento: 994, // 994: Factura de Venta POS / Comercialización
        monto_total: total,
        concepto: `Venta POS ${consecutivo} a Tercero ${id_tercero}`,
        fecha: new Date(),
        id_usuario: usuario_creacion || 1,
        connection: conn
      });
    }

    await conn.commit();

    // 6. Integración DianBox (Mock o Real)
    let dianResponseData = null;
    if (req.body.enviar_dian) {
      const [tenantConfig] = await conn.query('SELECT dianbox_api_key, dianbox_environment, dianbox_active, nit, razon_social FROM tenants WHERE id_tenant = ?', [id_tenant || 1]);
      if (tenantConfig.length > 0 && tenantConfig[0].dianbox_active) {
        try {
          const t = tenantConfig[0];
          const [terceroData] = await conn.query('SELECT * FROM terceros WHERE id_tercero = ?', [id_tercero]);
          const cliente = terceroData[0];
          
          const dianPayload = {
            emisor: { nit: t.nit, razon_social: t.razon_social, prefijo: 'SETT' },
            cliente: { documento: cliente.documento, nombre: cliente.nombre_completo || cliente.nombre_comercial, email: cliente.email },
            items,
            totales: { subtotal, iva: iva_total, total }
          };
          
          // Llamada HTTP interna/externa a DianBox Mock con TIMEOUT (Evitar SPOF)
          const dianUrl = `http://127.0.0.1:${process.env.PORT || 3002}/api/dianbox/emitir`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos máximo

          let fetchRes;
          try {
            fetchRes = await fetch(dianUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t.dianbox_api_key}` },
              body: JSON.stringify(dianPayload),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
          } catch (fetchErr) {
            clearTimeout(timeoutId);
            throw new Error(fetchErr.name === 'AbortError' ? 'Timeout: La DIAN tardó demasiado en responder.' : fetchErr.message);
          }

          const dianJson = await fetchRes.json();
          
          if (dianJson.success) {
            dianResponseData = {
              cufe: dianJson.cufe,
              qr: dianJson.qr_code,
              pdf_url: dianJson.pdf_url,
              xml_url: dianJson.xml_url,
              status: dianJson.status
            };
            await conn.query(`UPDATE documentos_comerciales SET dian_cufe=?, dian_qr=?, dian_pdf_url=?, dian_xml_url=?, dian_status=?, dian_payload_json=? WHERE id_documento=?`,
              [dianJson.cufe, dianJson.qr_code, dianJson.pdf_url, dianJson.xml_url, dianJson.status, JSON.stringify(dianPayload), id_documento]);
          } else {
            dianResponseData = { error: dianJson.error, status: 'Rechazado' };
            await conn.query(`UPDATE documentos_comerciales SET dian_error_msg=?, dian_status='Rechazado', dian_payload_json=? WHERE id_documento=?`, [dianJson.error, JSON.stringify(dianPayload), id_documento]);
          }
        } catch (e) {
           console.error("DianBox Integration Error:", e);
           dianResponseData = { error: 'Error de conexión con proveedor tecnológico', status: 'Rechazado' };
           await conn.query(`UPDATE documentos_comerciales SET dian_error_msg=?, dian_status='Error Conexion', dian_payload_json=? WHERE id_documento=?`, [e.message, JSON.stringify(dianPayload), id_documento]);
        }
      }
    }

    res.json({ success: true, id_documento, consecutivo, total, dian: dianResponseData, numero_documento: consecutivo });
  } catch (error) {
    await conn.rollback();
    console.error('Error executing POS sale:', error);
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

// ==========================================
// OFFLINE DIAN ENDPOINTS
// ==========================================

// GET /api/pos/ventas/dian-pendientes
router.get('/ventas/dian-pendientes', async (req, res) => {
  const tId = req.user.tenantId || 1;
  try {
    const [pendientes] = await getDb(req).query(`
      SELECT d.id_documento, d.numero_documento, d.fecha_emision, d.total, 
             d.dian_status, d.dian_error_msg, d.dian_retry_count, d.fecha_envio_dian,
             d.dian_payload_json,
             t.nombre_completo, t.documento AS nit_cliente, t.id_tercero
      FROM documentos_comerciales d
      LEFT JOIN terceros t ON d.id_tercero = t.id_tercero
      WHERE d.id_tenant = ? 
        AND d.dian_status IN ('Error Conexion', 'Pendiente Reintento', 'Rechazado')
      ORDER BY d.fecha_emision DESC
    `, [tId]);
    res.json(pendientes);
  } catch (error) {
    console.error('Error fetching pendientes DIAN:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pos/ventas/dian-reintentar-lote
router.post('/ventas/dian-reintentar-lote', async (req, res) => {
  try {
    const dianRetryCron = (await import('../services/dianRetryCron.js')).default;
    dianRetryCron.run(); 
    res.json({ success: true, message: 'Reintento en lote iniciado en segundo plano.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/pos/ventas/:id/corregir-dian
router.put('/ventas/:id/corregir-dian', async (req, res) => {
  const { id } = req.params;
  const { id_tercero } = req.body;
  const conn = await getDb(req).getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE documentos_comerciales SET id_tercero = ?, fecha_emision = NOW(), dian_status = ?, dian_error_msg = NULL WHERE id_documento = ?', [id_tercero, 'Pendiente Reintento', id]);
    
    // Disparar cron de inmediato para probar (opcional, o dejar al cron normal)
    const dianRetryCron = (await import('../services/dianRetryCron.js')).default;
    setTimeout(() => dianRetryCron.run(), 2000);

    await conn.commit();
    res.json({ success: true });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

// GET /api/pos/ventas/historial
router.get('/ventas/historial', async (req, res) => {
  const { tenantId, desde, hasta, cliente } = req.query;
  const tId = tenantId ? parseInt(tenantId, 10) : 1;

  try {
    let sql = `
      SELECT dc.id_documento, dc.numero_documento, dc.fecha_emision, dc.subtotal, dc.iva_total, dc.total,
             dc.tipo_pago, dc.estado, dc.moneda, dc.observaciones,
             dc.id_tercero, t.nombre_completo as nombre_cliente, t.documento as doc_cliente
      FROM documentos_comerciales dc
      LEFT JOIN terceros t ON dc.id_tercero = t.id_tercero
      WHERE dc.id_tenant = ?
    `;
    const params = [tId];

    if (desde) {
      sql += ` AND dc.fecha_emision >= ?`;
      params.push(desde);
    }
    if (hasta) {
      sql += ` AND dc.fecha_emision <= ?`;
      params.push(hasta);
    }
    if (cliente) {
      sql += ` AND (t.nombre_completo LIKE ? OR t.documento LIKE ?)`;
      params.push(`%${cliente}%`, `%${cliente}%`);
    }

    sql += ` ORDER BY dc.fecha_emision DESC, dc.id_documento DESC LIMIT 200`;

    const [rows] = await getDb(req).query(sql, params);
    res.json({ success: true, ventas: rows });
  } catch (error) {
    console.error('Error fetching POS ventas historial:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pos/ventas/:id/detalle
router.get('/ventas/:id/detalle', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await getDb(req).query(`
      SELECT d.*, i.nombre as nombre_producto, i.codigo as codigo_producto
      FROM documentos_comerciales_detalle d
      LEFT JOIN insumos i ON d.id_insumo = i.id_insumo
      WHERE d.id_documento = ?
      ORDER BY d.id_detalle_doc ASC
    `, [id]);

    res.json({ success: true, detalles: rows });
  } catch (error) {
    console.error('Error fetching venta detalle:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pos/arqueo/historial
router.get('/arqueo/historial', async (req, res) => {
  const { tenantId, id_usuario } = req.query;
  const tId = tenantId ? parseInt(tenantId, 10) : 1;

  try {
    let sql = `SELECT * FROM pos_arqueos WHERE id_tenant = ?`;
    const params = [tId];

    if (id_usuario) {
      sql += ` AND id_usuario = ?`;
      params.push(id_usuario);
    }

    sql += ` ORDER BY fecha_apertura DESC LIMIT 50`;

    const [rows] = await getDb(req).query(sql, params);
    res.json({ success: true, arqueos: rows });
  } catch (error) {
    console.error('Error fetching arqueo historial:', error);
    res.status(500).json({ error: error.message });
  }
});



// ============================================
// BÁSCULAS & CAJAS (POS EXTENDED)
// ============================================

// GET /api/pos/modelos-basculas
router.get('/modelos-basculas', async (req, res) => {
  try {
    const [rows] = await getDb(req).query('SELECT * FROM pos_modelos_basculas');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pos/basculas
router.get('/basculas', async (req, res) => {
  const { tenantId } = req.query;
  const tId = tenantId ? parseInt(tenantId, 10) : 1;
  try {
    const [rows] = await getDb(req).query(`
      SELECT b.*, m.marca, m.modelo as modelo_nombre 
      FROM basculas b
      LEFT JOIN pos_modelos_basculas m ON b.id_modelo = m.id_modelo
      WHERE b.id_tenant = ?
    `, [tId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pos/basculas
router.post('/basculas', async (req, res) => {
  const { tenantId, id_modelo, nombre, codigo, tipo_conexion, puerto_com, activa } = req.body;
  const tId = tenantId ? parseInt(tenantId, 10) : 1;
  try {
    let final_baud_rate = 9600, final_data_bits = 8, final_paridad = 'none', final_stop_bits = 1;
    let final_protocolo = 'serial', final_modo = 'Continuo', final_cmd = '', final_ini = 0, final_lon = 8;
    
    if (id_modelo) {
      const [mods] = await getDb(req).query('SELECT * FROM pos_modelos_basculas WHERE id_modelo = ?', [id_modelo]);
      if (mods.length > 0) {
        const m = mods[0];
        final_baud_rate = m.baud_rate; final_data_bits = m.data_bits; final_paridad = m.paridad;
        final_stop_bits = m.stop_bits; final_protocolo = m.protocolo; final_modo = m.modo_lectura;
        final_cmd = m.comando_peticion; final_ini = m.inicio_lectura; final_lon = m.longitud_lectura;
      }
    }

    const [result] = await getDb(req).query(`
      INSERT INTO basculas (id_tenant, id_modelo, nombre, codigo, tipo_conexion, puerto_com, activa,
        baud_rate, data_bits, paridad, stop_bits, protocolo, modo_lectura, comando_peticion, inicio_lectura, longitud_lectura)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [tId, id_modelo || null, nombre, codigo, tipo_conexion, puerto_com, activa ? 1 : 0, 
        final_baud_rate, final_data_bits, final_paridad, final_stop_bits, final_protocolo, final_modo, final_cmd, final_ini, final_lon]);
    
    res.json({ success: true, id_bascula: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/pos/basculas/:id
router.put('/basculas/:id', async (req, res) => {
  const { nombre, tipo_conexion, puerto_com, activa } = req.body;
  try {
    await getDb(req).query(`
      UPDATE basculas SET nombre = ?, tipo_conexion = ?, puerto_com = ?, activa = ? WHERE id_bascula = ?
    `, [nombre, tipo_conexion, puerto_com, activa ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/pos/basculas/:id
router.delete('/basculas/:id', async (req, res) => {
  try {
    await getDb(req).query('DELETE FROM basculas WHERE id_bascula = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pos/cajas
router.get('/cajas', async (req, res) => {
  const { tenantId } = req.query;
  const tId = tenantId ? parseInt(tenantId, 10) : 1;
  try {
    const [rows] = await getDb(req).query(`
      SELECT c.*, b.nombre as bascula_nombre, u.nombres as cajero_nombre, u.apellidos as cajero_apellidos
      FROM pos_cajas c
      LEFT JOIN basculas b ON c.id_bascula = b.id_bascula
      LEFT JOIN usuarios u ON c.id_cajero = u.id_usuario
      WHERE c.id_tenant = ?
    `, [tId]);
    
    // Remove hash before sending to client
    const safeRows = rows.map(r => {
      const { clave_cajero, ...rest } = r;
      return rest;
    });
    
    console.log('[DEBUG] /api/pos/cajas -> enviando', safeRows.length, 'cajas. Tenant:', tId);
    res.json({ success: true, data: safeRows });
  } catch (error) {
    console.error('[DEBUG] /api/pos/cajas error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pos/cajas
router.post('/cajas', async (req, res) => {
  const { tenantId, id_bodega, nombre, id_bascula, impresora, lector_codigo_barras, segunda_pantalla, activa, consecutivo, id_cajero, clave_cajero, cambiar_clave } = req.body;
  const tId = tenantId ? parseInt(tenantId, 10) : 1;
  try {
    let hash = null;
    if (clave_cajero) {
      hash = await bcrypt.hash(clave_cajero, 10);
    }
    const [result] = await getDb(req).query(`
      INSERT INTO pos_cajas (id_tenant, id_bodega, nombre, id_bascula, impresora, lector_codigo_barras, segunda_pantalla, activa, consecutivo, id_cajero, clave_cajero, cambiar_clave)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [tId, id_bodega || 1, nombre, id_bascula || null, impresora || null, lector_codigo_barras || null, segunda_pantalla ? 1 : 0, activa ? 1 : 0, consecutivo || null, id_cajero || null, hash, cambiar_clave ? 1 : 0]);
    res.json({ success: true, id_caja: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/pos/cajas/:id
router.put('/cajas/:id', async (req, res) => {
  const { nombre, id_bascula, impresora, lector_codigo_barras, dispositivo_pago, segunda_pantalla, activa, consecutivo, id_cajero, clave_cajero, cambiar_clave, id_resolucion } = req.body;
  console.log('PUT /cajas/:id', req.params.id, req.body);
  try {
    const db = getDb(req);
    let hash = null;
    let query = `UPDATE pos_cajas SET nombre = ?, id_bascula = ?, impresora = ?, lector_codigo_barras = ?, dispositivo_pago = ?, segunda_pantalla = ?, activa = ?, consecutivo = ?, id_cajero = ?, cambiar_clave = ?, id_resolucion = ?`;
    let params = [nombre, id_bascula || null, impresora || null, lector_codigo_barras || null, dispositivo_pago || null, segunda_pantalla ? 1 : 0, activa ? 1 : 0, consecutivo || null, id_cajero || null, cambiar_clave ? 1 : 0, id_resolucion || null];

    if (clave_cajero) {
      hash = await bcrypt.hash(clave_cajero, 10);
      query += `, clave_cajero = ?`;
      params.push(hash);
    }
    
    query += ` WHERE id_caja = ?`;
    params.push(req.params.id);

    await db.query(query, params);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/pos/cajas/:id
router.delete('/cajas/:id', async (req, res) => {
  try {
    await getDb(req).query('DELETE FROM pos_cajas WHERE id_caja = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pos/cajas/:id/desbloquear
router.post('/cajas/:id/desbloquear', async (req, res) => {
  try {
    console.log(`[DEBUG] Attempting to unlock caja ${req.params.id}`);
    const [result] = await getDb(req).query('UPDATE pos_cajas SET intentos_fallidos = 0, bloqueada = 0 WHERE id_caja = ?', [req.params.id]);
    console.log(`[DEBUG] Unlock result:`, result);
    res.json({ success: true, message: 'Caja desbloqueada correctamente' });
  } catch (error) {
    console.error(`[DEBUG] Unlock error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pos/caja/auth
router.post('/caja/auth', async (req, res) => {
  const { id_caja, clave_cajero } = req.body;
  if (!id_caja || !clave_cajero) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }
  try {
    const [cajas] = await getDb(req).query('SELECT clave_cajero, cambiar_clave, intentos_fallidos, bloqueada FROM pos_cajas WHERE id_caja = ?', [id_caja]);
    if (cajas.length === 0) return res.status(404).json({ error: 'Caja no encontrada' });
    
    if (cajas[0].bloqueada === 1) {
      return res.status(403).json({ error: 'Caja bloqueada por demasiados intentos fallidos. Contacte al administrador.' });
    }

    const hash = cajas[0].clave_cajero;
    if (!hash) return res.status(401).json({ error: 'La caja no tiene clave configurada' });

    const match = await bcrypt.compare(clave_cajero, hash);
    if (!match) {
      const intentos = (cajas[0].intentos_fallidos || 0) + 1;
      if (intentos >= 3) {
        await getDb(req).query('UPDATE pos_cajas SET intentos_fallidos = ?, bloqueada = 1 WHERE id_caja = ?', [intentos, id_caja]);
        return res.status(403).json({ error: 'Caja bloqueada por demasiados intentos fallidos. Contacte al administrador.' });
      } else {
        await getDb(req).query('UPDATE pos_cajas SET intentos_fallidos = ? WHERE id_caja = ?', [intentos, id_caja]);
        return res.status(401).json({ error: `Clave incorrecta. Intentos restantes: ${3 - intentos}` });
      }
    }

    await getDb(req).query('UPDATE pos_cajas SET intentos_fallidos = 0 WHERE id_caja = ?', [id_caja]);
    res.json({ success: true, cambiar_clave: cajas[0].cambiar_clave === 1 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pos/caja/change-password
router.post('/caja/change-password', async (req, res) => {
  const { id_caja, clave_actual, nueva_clave } = req.body;
  if (!id_caja || !clave_actual || !nueva_clave) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }
  try {
    const db = getDb(req);
    const [cajas] = await db.query('SELECT clave_cajero FROM pos_cajas WHERE id_caja = ?', [id_caja]);
    if (cajas.length === 0) return res.status(404).json({ error: 'Caja no encontrada' });
    
    const match = await bcrypt.compare(clave_actual, cajas[0].clave_cajero);
    if (!match) return res.status(401).json({ error: 'La clave actual es incorrecta' });

    const newHash = await bcrypt.hash(nueva_clave, 10);
    await db.query('UPDATE pos_cajas SET clave_cajero = ?, cambiar_clave = 0 WHERE id_caja = ?', [newHash, id_caja]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pos/historico-cajeros
router.get('/historico-cajeros', async (req, res) => {
  const { tenantId, fechaDesde, fechaHasta, id_bodega, id_usuario, id_caja } = req.query;
  const tId = tenantId ? parseInt(tenantId, 10) : 1;
  try {
    let sql = `
      SELECT a.*, 
             u.username as cajero_nombre,
             c.nombre as caja_nombre,
             bo.nombre as bodega_nombre
      FROM pos_arqueos a
      JOIN usuarios u ON a.id_usuario = u.id_usuario
      LEFT JOIN pos_cajas c ON a.id_caja = c.id_caja
      LEFT JOIN bodegas bo ON a.id_bodega = bo.id_bodega
      WHERE a.id_tenant = ?
    `;
    const params = [tId];
    
    if (fechaDesde && fechaHasta) {
      sql += ` AND DATE(a.fecha_apertura) BETWEEN ? AND ?`;
      params.push(fechaDesde, fechaHasta);
    }
    if (id_bodega) { sql += ` AND a.id_bodega = ?`; params.push(id_bodega); }
    if (id_usuario) { sql += ` AND a.id_usuario = ?`; params.push(id_usuario); }
    if (id_caja) { sql += ` AND a.id_caja = ?`; params.push(id_caja); }
    
    sql += ' ORDER BY a.fecha_apertura DESC LIMIT 100';
    
    const [rows] = await getDb(req).query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// ============================================
// BÁSCULAS & CAJAS (POS EXTENDED)
// ============================================

// GET /api/pos/modelos-basculas
router.get('/modelos-basculas', async (req, res) => {
  try {
    const [rows] = await getDb(req).query('SELECT * FROM pos_modelos_basculas');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pos/basculas
router.get('/basculas', async (req, res) => {
  const { tenantId } = req.query;
  const tId = tenantId ? parseInt(tenantId, 10) : 1;
  try {
    const [rows] = await getDb(req).query(`
      SELECT b.*, m.marca, m.modelo as modelo_nombre 
      FROM basculas b
      LEFT JOIN pos_modelos_basculas m ON b.id_modelo = m.id_modelo
      WHERE b.id_tenant = ?
    `, [tId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pos/basculas
router.post('/basculas', async (req, res) => {
  const { tenantId, id_modelo, nombre, codigo, tipo_conexion, puerto_com, activa } = req.body;
  const tId = tenantId ? parseInt(tenantId, 10) : 1;
  try {
    let final_baud_rate = 9600, final_data_bits = 8, final_paridad = 'none', final_stop_bits = 1;
    let final_protocolo = 'serial', final_modo = 'Continuo', final_cmd = '', final_ini = 0, final_lon = 8;
    
    if (id_modelo) {
      const [mods] = await getDb(req).query('SELECT * FROM pos_modelos_basculas WHERE id_modelo = ?', [id_modelo]);
      if (mods.length > 0) {
        const m = mods[0];
        final_baud_rate = m.baud_rate; final_data_bits = m.data_bits; final_paridad = m.paridad;
        final_stop_bits = m.stop_bits; final_protocolo = m.protocolo; final_modo = m.modo_lectura;
        final_cmd = m.comando_peticion; final_ini = m.inicio_lectura; final_lon = m.longitud_lectura;
      }
    }

    const [result] = await getDb(req).query(`
      INSERT INTO basculas (id_tenant, id_modelo, nombre, codigo, tipo_conexion, puerto_com, activa,
        baud_rate, data_bits, paridad, stop_bits, protocolo, modo_lectura, comando_peticion, inicio_lectura, longitud_lectura)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [tId, id_modelo || null, nombre, codigo, tipo_conexion, puerto_com, activa ? 1 : 0, 
        final_baud_rate, final_data_bits, final_paridad, final_stop_bits, final_protocolo, final_modo, final_cmd, final_ini, final_lon]);
    
    res.json({ success: true, id_bascula: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/pos/basculas/:id
router.put('/basculas/:id', async (req, res) => {
  const { nombre, tipo_conexion, puerto_com, activa } = req.body;
  try {
    await getDb(req).query(`
      UPDATE basculas SET nombre = ?, tipo_conexion = ?, puerto_com = ?, activa = ? WHERE id_bascula = ?
    `, [nombre, tipo_conexion, puerto_com, activa ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/pos/basculas/:id
router.delete('/basculas/:id', async (req, res) => {
  try {
    await getDb(req).query('DELETE FROM basculas WHERE id_bascula = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pos/cajas
router.get('/cajas', async (req, res) => {
  const { tenantId } = req.query;
  const tId = tenantId ? parseInt(tenantId, 10) : 1;
  try {
    const [rows] = await getDb(req).query(`
      SELECT c.*, b.nombre as bascula_nombre 
      FROM pos_cajas c
      LEFT JOIN basculas b ON c.id_bascula = b.id_bascula
      WHERE c.id_tenant = ?
    `, [tId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pos/cajas
router.post('/cajas', async (req, res) => {
  const { tenantId, id_bodega, nombre, id_bascula, impresora, lector_codigo_barras, dispositivo_pago, segunda_pantalla, activa, id_resolucion } = req.body;
  const tId = tenantId ? parseInt(tenantId, 10) : 1;
  try {
    const [result] = await getDb(req).query(`
      INSERT INTO pos_cajas (id_tenant, id_bodega, nombre, id_bascula, impresora, lector_codigo_barras, dispositivo_pago, segunda_pantalla, activa, id_resolucion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [tId, id_bodega || 1, nombre, id_bascula || null, impresora || null, lector_codigo_barras || null, dispositivo_pago || null, segunda_pantalla ? 1 : 0, activa ? 1 : 0, id_resolucion || null]);
    res.json({ success: true, id_caja: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/pos/cajas/:id
router.put('/cajas/:id', async (req, res) => {
  const { nombre, id_bascula, impresora, lector_codigo_barras, segunda_pantalla, activa } = req.body;
  try {
    await getDb(req).query(`
      UPDATE pos_cajas SET nombre = ?, id_bascula = ?, impresora = ?, lector_codigo_barras = ?, segunda_pantalla = ?, activa = ?
      WHERE id_caja = ?
    `, [nombre, id_bascula || null, impresora || null, lector_codigo_barras || null, segunda_pantalla ? 1 : 0, activa ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/pos/cajas/:id
router.delete('/cajas/:id', async (req, res) => {
  try {
    await getDb(req).query('DELETE FROM pos_cajas WHERE id_caja = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pos/historico-cajeros
router.get('/historico-cajeros', async (req, res) => {
  const { tenantId, fechaDesde, fechaHasta, id_bodega, id_usuario, id_caja } = req.query;
  const tId = tenantId ? parseInt(tenantId, 10) : 1;
  try {
    let sql = `
      SELECT a.*, 
             u.username as cajero_nombre,
             c.nombre as caja_nombre,
             bo.nombre as bodega_nombre
      FROM pos_arqueos a
      JOIN usuarios u ON a.id_usuario = u.id_usuario
      LEFT JOIN pos_cajas c ON a.id_caja = c.id_caja
      LEFT JOIN bodegas bo ON a.id_bodega = bo.id_bodega
      WHERE a.id_tenant = ?
    `;
    const params = [tId];
    
    if (fechaDesde && fechaHasta) {
      sql += ` AND DATE(a.fecha_apertura) BETWEEN ? AND ?`;
      params.push(fechaDesde, fechaHasta);
    }
    if (id_bodega) { sql += ` AND a.id_bodega = ?`; params.push(id_bodega); }
    if (id_usuario) { sql += ` AND a.id_usuario = ?`; params.push(id_usuario); }
    if (id_caja) { sql += ` AND a.id_caja = ?`; params.push(id_caja); }
    
    sql += ' ORDER BY a.fecha_apertura DESC LIMIT 100';
    
    const [rows] = await getDb(req).query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CARTERA POS
// ============================================

// GET /api/pos/cartera/:id_cliente
router.get('/cartera/:id_cliente', async (req, res) => {
  const { id_cliente } = req.params;
  const { tenantId } = req.query;
  const tId = tenantId ? parseInt(tenantId, 10) : 1;
  try {
    const [rows] = await getDb(req).query(`
      SELECT c.id_cxc, c.saldo_pendiente, c.estado, 
             d.numero_documento, d.fecha_emision, d.fecha_vencimiento, d.total as total_factura,
             DATEDIFF(CURDATE(), d.fecha_vencimiento) as dias_mora
      FROM cartera_cxc c
      JOIN documentos_comerciales d ON c.id_documento = d.id_documento
      WHERE d.id_tercero = ? AND d.id_tenant = ? AND c.saldo_pendiente > 0
      ORDER BY d.fecha_emision ASC
    `, [id_cliente, tId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pos/cartera/abono
router.post('/cartera/abono', async (req, res) => {
  const { tenantId, id_tercero, id_usuario, monto, tipo_pago, referencia } = req.body;
  const tId = tenantId ? parseInt(tenantId, 10) : 1;
  
  const conn = await getDb(req).getConnection();
  try {
    await conn.beginTransaction();

    // 1. Get open invoices for client (FIFO)
    const [facturas] = await conn.query(`
      SELECT c.id_cxc, c.saldo_pendiente, d.id_documento
      FROM cartera_cxc c
      JOIN documentos_comerciales d ON c.id_documento = d.id_documento
      WHERE d.id_tercero = ? AND d.id_tenant = ? AND c.saldo_pendiente > 0
      ORDER BY d.fecha_emision ASC
    `, [id_tercero, tId]);

    if (facturas.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'El cliente no tiene facturas con saldo pendiente.' });
    }

    let montoRestante = parseFloat(monto);

    // 2. Generate RC consecutive
    const consecutivo = `RC-POS-${Date.now().toString().slice(-6)}`;
    
    // 3. Create Recibo de Caja Header
    const [rcRes] = await conn.query(`
      INSERT INTO tesoreria_ingresos 
      (id_tenant, id_tercero, numero_recibo, fecha, monto_total, id_usuario, observaciones)
      VALUES (?, ?, ?, CURDATE(), ?, ?, ?)
    `, [tId, id_tercero, consecutivo, montoRestante, id_usuario, `Recaudo Cartera POS - Pago en ${tipo_pago}`]);

    const id_ingreso = rcRes.insertId;

    // 4. Distribute monto over invoices (FIFO)
    for (const fac of facturas) {
      if (montoRestante <= 0) break;

      const aAbonar = Math.min(montoRestante, fac.saldo_pendiente);
      montoRestante -= aAbonar;

      // Deduct from CXC
      await conn.query(`
        UPDATE cartera_cxc 
        SET saldo_pendiente = saldo_pendiente - ?, 
            estado = CASE WHEN (saldo_pendiente - ?) <= 0 THEN 'Pagado' ELSE 'Vigente' END
        WHERE id_cxc = ?
      `, [aAbonar, aAbonar, fac.id_cxc]);

      // Insert Abono record (linking RC to Factura)
      // Usaremos un UPDATE directo a documentos_comerciales_pagos ya que cartera_cxc_abonos no existe
      await conn.query(`
        INSERT INTO documentos_comerciales_pagos (id_documento, tipo_pago, monto, referencia) 
        VALUES (?, ?, ?, ?)
      `, [fac.id_documento, tipo_pago, aAbonar, `Abono ${consecutivo}`]);
    }

    // 5. Automatic Accounting for Recibo de Caja
    await ContabilidadService.generarComprobanteAutomatico({
      id_tenant: tId,
      modulo: 'Tesoreria_Ingresos',
      id_tipo_documento: 993, // RC
      monto_total: monto,
      concepto: `Recaudo Cartera POS ${consecutivo}`,
      fecha: new Date(),
      id_usuario: id_usuario || 1,
      connection: conn
    });

    await conn.commit();

    res.json({ success: true, consecutivo });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

export default router;

