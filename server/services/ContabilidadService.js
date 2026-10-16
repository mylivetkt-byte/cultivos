import pool from '../db.js';

class ContabilidadService {
  
  /**
   * Genera un comprobante contable automático basado en la configuración de distribución de la finca
   */
  static async generarComprobanteAutomatico(params) {
    const { 
      id_tenant, 
      id_finca, 
      modulo, 
      id_tipo_documento, 
      monto_total, 
      concepto, 
      fecha, 
      id_usuario,
      connection // injected transaction connection
    } = params;

    const db = connection || pool;
    if (!connection) {
      console.warn(`[ContabilidadService] WARNING: No connection provided for transaction! Using pool.`);
    }

    if (!id_finca) {
      console.log(`[ContabilidadService] Saltando generación: Falta id_finca.`);
      return;
    }

    try {
      // 1. Check if there is a distribution configured for this module, doc type and finca
      const [configs] = await db.query(`
        SELECT id_tipo_comp, cuenta_debito, cuenta_credito 
        FROM con_distribucion_documentos 
        WHERE id_tenant = ? AND id_finca = ? AND modulo = ? AND id_tipo_documento = ? AND activo = 1
      `, [id_tenant, id_finca, modulo, id_tipo_documento]);

      if (configs.length === 0) {
        console.log(`[ContabilidadService] No hay distribución configurada para Finca ${id_finca}, Modulo ${modulo}, TipoDoc ${id_tipo_documento}`);
        return;
      }

      const { id_tipo_comp, cuenta_debito, cuenta_credito } = configs[0];

      if (!cuenta_debito || !cuenta_credito) {
        console.log(`[ContabilidadService] Configuración incompleta (faltan cuentas) para Finca ${id_finca}, Modulo ${modulo}.`);
        return;
      }

      // 2. Find the active accounting period (periodo contable)
      const inputDate = new Date(fecha || Date.now());
      const ano = inputDate.getFullYear();
      const mes = inputDate.getMonth() + 1;

      const [periodos] = await db.query(`
        SELECT id_periodo FROM periodos_contables 
        WHERE id_tenant = ? AND ano = ? AND mes = ? AND estado = 'Abierto'
      `, [id_tenant, ano, mes]);

      let id_periodo;
      if (periodos.length > 0) {
        id_periodo = periodos[0].id_periodo;
      } else {
        console.log(`[ContabilidadService] No hay periodo abierto para ${ano}-${mes}. Creando uno nuevo...`);
        // Optionally auto-create the period if it doesn't exist
        const firstDay = new Date(ano, mes - 1, 1).toISOString().split('T')[0];
        const lastDay = new Date(ano, mes, 0).toISOString().split('T')[0];
        
        const [resultPeriodo] = await db.query(`
          INSERT INTO periodos_contables (id_tenant, ano, mes, fecha_inicio, fecha_fin, estado)
          VALUES (?, ?, ?, ?, ?, 'Abierto')
        `, [id_tenant, ano, mes, firstDay, lastDay]);
        
        id_periodo = resultPeriodo.insertId;
      }

      // 3. Get next consecutivo from tipo_comprobante
      const [tipoComp] = await db.query(`SELECT codigo, consecutivo_actual FROM tipos_comprobantes WHERE id_tipo_comp = ? FOR UPDATE`, [id_tipo_comp]);
      if (tipoComp.length === 0) return;
      
      const consecutivoInt = tipoComp[0].consecutivo_actual;
      const prefijo = tipoComp[0].codigo;
      const consecutivo = `${prefijo}-${consecutivoInt.toString().padStart(6, '0')}`;

      // Update consecutivo
      await db.query(`UPDATE tipos_comprobantes SET consecutivo_actual = consecutivo_actual + 1 WHERE id_tipo_comp = ?`, [id_tipo_comp]);

      // 4. Create Comprobante (Lote)
      const fechaStr = inputDate.toISOString().split('T')[0];
      const descripcionComp = `Comprobante Automático: ${concepto.substring(0, 100)}`;
      
      const [resComp] = await db.query(`
        INSERT INTO contab_comprobantes (id_tenant, id_periodo, id_tipo_comp, numero, descripcion, estado)
        VALUES (?, ?, ?, ?, ?, 'Contabilizado')
      `, [id_tenant, id_periodo, id_tipo_comp, consecutivo, descripcionComp]);
      const id_comprobante = resComp.insertId;

      // 5. Create Documento
      const [resDoc] = await db.query(`
        INSERT INTO contab_documentos (id_tenant, id_comprobante, id_tipo_doc, numero_doc, fecha, concepto, estado, tabla_origen, id_origen)
        VALUES (?, ?, ?, ?, ?, ?, 'Contabilizado', ?, ?)
      `, [id_tenant, id_comprobante, id_tipo_documento || id_tipo_comp, consecutivo, fechaStr, concepto, modulo, null]);
      const id_documento = resDoc.insertId;

      // 6. Create Detalles (Débito y Crédito)
      await db.query(`
        INSERT INTO contab_detalles (id_documento, id_cuenta, descripcion, valor_base, debito, credito)
        VALUES (?, ?, ?, 0, ?, 0)
      `, [id_documento, cuenta_debito, concepto, monto_total]);

      await db.query(`
        INSERT INTO contab_detalles (id_documento, id_cuenta, descripcion, valor_base, debito, credito)
        VALUES (?, ?, ?, 0, 0, ?)
      `, [id_documento, cuenta_credito, concepto, monto_total]);

      console.log(`[ContabilidadService] Comprobante ${consecutivo} generado exitosamente por valor de ${monto_total}.`);
      return id_comprobante;

    } catch (error) {
      console.error("[ContabilidadService] Error generando comprobante automático:", error);
      throw error;
    }
  }

}

export default ContabilidadService;
