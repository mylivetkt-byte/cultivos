import pool from '../db.js';

class DianRetryCron {
  constructor() {
    this.intervalId = null;
    this.intervalMs = 5 * 60 * 1000; // 5 minutos
  }

  start() {
    console.log('[DIAN Retry Cron] Iniciando servicio de retransmisión...');
    this.intervalId = setInterval(() => this.run(), this.intervalMs);
    // Ejecutar una vez al inicio (opcional)
    setTimeout(() => this.run(), 10000); 
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[DIAN Retry Cron] Detenido.');
    }
  }

  async run() {
    console.log('[DIAN Retry Cron] Revisando facturas pendientes de emisión...');
    let conn;
    try {
      conn = await pool.getConnection();
      
      // 1. Obtener tenants que manejan facturación electrónica
      const [tenants] = await conn.query('SELECT id_tenant, dianbox_api_key, dianbox_active, nit, razon_social FROM tenants WHERE dianbox_active = 1');
      
      for (const t of tenants) {
        // 2. Buscar facturas de este tenant que fallaron por red o están pendientes
        const [facturas] = await conn.query(`
          SELECT id_documento, id_tercero, subtotal, iva_total, total, numero_documento 
          FROM documentos_comerciales 
          WHERE id_tenant = ? AND (dian_status = 'Error Conexion' OR dian_status = 'Pendiente Reintento')
        `, [t.id_tenant]);

        for (const doc of facturas) {
          await this.reintentarFactura(conn, t, doc);
        }
      }
    } catch (e) {
      console.error('[DIAN Retry Cron] Error al ejecutar cron:', e);
    } finally {
      if (conn) conn.release();
    }
  }

  async reintentarFactura(conn, tenantConfig, doc) {
    try {
      // Incrementar contador de intentos
      await conn.query('UPDATE documentos_comerciales SET dian_retry_count = dian_retry_count + 1 WHERE id_documento = ?', [doc.id_documento]);
      
      const [terceroData] = await conn.query('SELECT * FROM terceros WHERE id_tercero = ?', [doc.id_tercero]);
      const cliente = terceroData[0];
      
      const [items] = await conn.query('SELECT * FROM documentos_comerciales_detalle WHERE id_documento = ?', [doc.id_documento]);
      
      const dianPayload = {
        emisor: { nit: tenantConfig.nit, razon_social: tenantConfig.razon_social, prefijo: 'SETT' },
        cliente: { documento: cliente.documento, nombre: cliente.nombre_completo || cliente.nombre_comercial, email: cliente.email },
        items: items.map(i => ({
          producto: i.concepto,
          cantidad: i.cantidad,
          precio_unitario: i.valor_unitario,
          iva_porcentaje: i.impuesto_porcentaje,
          subtotal: i.valor_total
        })),
        totales: { subtotal: doc.subtotal, iva: doc.iva_total, total: doc.total }
      };
      
      const dianUrl = `http://127.0.0.1:${process.env.PORT || 3002}/api/dianbox/emitir`;
      const fetchRes = await fetch(dianUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tenantConfig.dianbox_api_key}` },
        body: JSON.stringify(dianPayload)
      });
      
      const dianJson = await fetchRes.json();
      
      if (dianJson.success) {
        console.log(`[DIAN Retry Cron] Factura ${doc.id_documento} emitida con éxito.`);
        await conn.query(`UPDATE documentos_comerciales SET dian_cufe=?, dian_qr=?, dian_pdf_url=?, dian_xml_url=?, dian_status=?, fecha_envio_dian=NOW(), dian_error_msg=NULL, dian_payload_json=? WHERE id_documento=?`,
          [dianJson.cufe, dianJson.qr_code, dianJson.pdf_url, dianJson.xml_url, dianJson.status, JSON.stringify(dianPayload), doc.id_documento]);
      } else {
        console.warn(`[DIAN Retry Cron] Factura ${doc.id_documento} rechazada de nuevo.`);
        await conn.query(`UPDATE documentos_comerciales SET dian_error_msg=?, dian_status='Rechazado', fecha_envio_dian=NOW(), dian_payload_json=? WHERE id_documento=?`, [dianJson.error, JSON.stringify(dianPayload), doc.id_documento]);
      }
    } catch (e) {
      console.error(`[DIAN Retry Cron] Error reintentando factura ${doc.id_documento}:`, e);
      await conn.query(`UPDATE documentos_comerciales SET dian_error_msg=?, dian_status='Error Conexion', fecha_envio_dian=NOW(), dian_payload_json=? WHERE id_documento=?`, [e.message, JSON.stringify(dianPayload), doc.id_documento]);
    }
  }
}

export default new DianRetryCron();
