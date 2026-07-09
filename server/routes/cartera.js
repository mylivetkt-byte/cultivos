import express from 'express';
import pool from '../db.js';
import ContabilidadService from '../services/ContabilidadService.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// GET /api/cartera/estado-cuenta/:id_tercero
router.get('/estado-cuenta/:id_tercero', async (req, res) => {
  const { id_tercero } = req.params;
  const { id_tenant } = req.query;
  
  if (!id_tenant) return res.status(400).json({ error: 'Falta id_tenant' });

  try {
    const [rows] = await getDb(req).query(`
      SELECT 
        tipo_operacion, 
        referencia, 
        fecha, 
        cargo, 
        abono, 
        estado, 
        tipo_cartera 
      FROM vw_estado_cuenta 
      WHERE id_tercero = ? AND id_tenant = ?
      ORDER BY fecha ASC
    `, [id_tercero, id_tenant]);

    // Calculate running balance
    let saldo = 0;
    const historial = rows.map(r => {
      // Si es CxC: cargo suma al saldo (lo que me deben), abono resta.
      // Si es CxP: cargo suma al saldo (lo que yo debo), abono resta.
      // Para mostrar un saldo general, los separamos por tipo, pero en el detalle cronológico
      // mostramos el efecto neto según la naturaleza.
      saldo += Number(r.cargo) - Number(r.abono);
      return {
        ...r,
        saldo_acumulado: saldo
      };
    });

    // Get Tercero Stats
    const [terceroData] = await getDb(req).query(`
      SELECT cupo_credito, dias_plazo, contacto, telefono_contacto
      FROM terceros WHERE id_tercero = ?
    `, [id_tercero]);

    const stats = terceroData[0] || {};
    
    // Find last payment and last invoice
    stats.ultimo_pago_fecha = null;
    stats.ultimo_pago_monto = null;
    stats.ultima_factura_fecha = null;
    stats.ultima_factura_monto = null;

    for (let i = historial.length - 1; i >= 0; i--) {
      const h = historial[i];
      if (!stats.ultimo_pago_fecha && (h.tipo_operacion === 'Pago Recibido' || h.tipo_operacion === 'Pago Emitido')) {
        stats.ultimo_pago_fecha = h.fecha;
        stats.ultimo_pago_monto = h.abono;
      }
      if (!stats.ultima_factura_fecha && (h.tipo_operacion === 'Factura Venta' || h.tipo_operacion === 'Factura Compra')) {
        stats.ultima_factura_fecha = h.fecha;
        stats.ultima_factura_monto = h.cargo;
      }
    }

    res.json({ historial, stats });
  } catch (error) {
    console.error("Error fetching estado de cuenta:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/cartera/pendientes/:tipo/:id_tercero
router.get('/pendientes/:tipo/:id_tercero', async (req, res) => {
  const { tipo, id_tercero } = req.params; // tipo = 'CxC' o 'CxP'
  const { id_tenant } = req.query;
  
  if (!id_tenant) return res.status(400).json({ error: 'Falta id_tenant' });

  try {
    let rows = [];
    if (tipo === 'CxC') {
      [rows] = await getDb(req).query(`
        SELECT c.id_cxc as id_cartera, dc.numero_documento, dc.fecha_emision, c.saldo_pendiente, c.estado
        FROM cartera_cxc c
        JOIN documentos_comerciales dc ON c.id_documento = dc.id_documento
        WHERE dc.id_tercero = ? AND dc.id_tenant = ? AND c.saldo_pendiente > 0
        ORDER BY dc.fecha_emision ASC
      `, [id_tercero, id_tenant]);
    } else if (tipo === 'CxP') {
      [rows] = await getDb(req).query(`
        SELECT c.id_cxp as id_cartera, dc.numero_documento, dc.fecha_emision, c.saldo_pendiente, c.estado
        FROM cartera_cxp c
        JOIN documentos_comerciales dc ON c.id_documento = dc.id_documento
        WHERE dc.id_tercero = ? AND dc.id_tenant = ? AND c.saldo_pendiente > 0
        ORDER BY dc.fecha_emision ASC
      `, [id_tercero, id_tenant]);
    } else {
      return res.status(400).json({ error: 'Tipo inválido. Use CxC o CxP' });
    }

    res.json(rows);
  } catch (error) {
    console.error("Error fetching pendientes:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/cartera/abono
router.post('/abono', async (req, res) => {
  const { id_tenant, id_finca, id_tercero, tipo, id_cartera, monto, forma_pago, referencia, observaciones, fecha, id_usuario } = req.body;
  
  if (!id_tenant || !id_cartera || !monto || !tipo) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos' });
  }

  const connection = await getDb(req).getConnection();
  try {
    await connection.beginTransaction();

    let saldoRestante = monto;

    if (tipo === 'CxC') {
      // 1. Insert abono
      await connection.query(`
        INSERT INTO abonos_cxc (id_cxc, fecha_abono, valor_abono, forma_pago, referencia, observaciones)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id_cartera, fecha, monto, forma_pago, referencia, observaciones]);

      // 2. Update saldo
      await connection.query(`
        UPDATE cartera_cxc 
        SET saldo_pendiente = saldo_pendiente - ?, 
            estado = IF(saldo_pendiente - ? <= 0, 'Cobrada', 'Vigente')
        WHERE id_cxc = ?
      `, [monto, monto, id_cartera]);

      // 3. Update doc status if totally paid
      await connection.query(`
        UPDATE documentos_comerciales dc
        JOIN cartera_cxc c ON c.id_documento = dc.id_documento
        SET dc.estado = IF(c.saldo_pendiente <= 0, 'Pagado_Total', 'Pagado_Parcial')
        WHERE c.id_cxc = ?
      `, [id_cartera]);

    } else if (tipo === 'CxP') {
      // 1. Insert abono
      await connection.query(`
        INSERT INTO fin_abonos_cxp (id_cxp, fecha_abono, valor_abono, forma_pago)
        VALUES (?, ?, ?, ?)
      `, [id_cartera, fecha, monto, forma_pago]);

      // 2. Update saldo
      await connection.query(`
        UPDATE cartera_cxp 
        SET saldo_pendiente = saldo_pendiente - ?, 
            estado = IF(saldo_pendiente - ? <= 0, 'Pagada', 'Vigente')
        WHERE id_cxp = ?
      `, [monto, monto, id_cartera]);

      // 3. Update doc status if totally paid
      await connection.query(`
        UPDATE documentos_comerciales dc
        JOIN cartera_cxp c ON c.id_documento = dc.id_documento
        SET dc.estado = IF(c.saldo_pendiente <= 0, 'Pagado_Total', 'Pagado_Parcial')
        WHERE c.id_cxp = ?
      `, [id_cartera]);
    }

    await connection.commit();

    // Integración Contable Automática
    if (id_finca) {
      // Usamos un tipo de documento 'genérico' en la configuración (ej. id=99 para abonos, o podemos hacer que el frontend lo mande)
      // Por defecto, mandaremos id_tipo_documento = 99 como convención para "Abono CxC" o "Abono CxP"
      const id_tipo_doc_abono = tipo === 'CxC' ? 991 : 992; // 991: Recibo Caja, 992: Comp Egreso
      
      await ContabilidadService.generarComprobanteAutomatico({
        id_tenant,
        id_finca,
        modulo: 'Cartera',
        id_tipo_documento: id_tipo_doc_abono, 
        monto_total: monto,
        concepto: `Abono a ${tipo} de Tercero ID ${id_tercero} ref: ${referencia}`,
        fecha: fecha,
        id_usuario: id_usuario
      }).catch(err => {
        console.error("Warning: Contabilidad falló, pero el abono se registró.", err.message);
      });
    }

    res.json({ success: true, message: 'Abono registrado correctamente' });
  } catch (error) {
    await connection.rollback();
    console.error("Error registrando abono:", error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/cartera/dashboard
router.get('/dashboard', async (req, res) => {
  const { id_tenant } = req.query;
  if (!id_tenant) return res.status(400).json({ error: 'Falta id_tenant' });

  try {
    const [rows] = await getDb(req).query(`
      SELECT 
        'CxC' as tipo_cartera,
        c.id_cxc as id_cartera,
        dc.numero_documento,
        dc.fecha_emision,
        c.saldo_pendiente,
        t.nombre_completo,
        t.documento,
        t.contacto,
        t.telefono_contacto,
        IFNULL(NULLIF(dc.plazo_dias, 0), t.dias_plazo) as plazo,
        DATEDIFF(NOW(), DATE_ADD(dc.fecha_emision, INTERVAL IFNULL(NULLIF(dc.plazo_dias, 0), t.dias_plazo) DAY)) as dias_vencidos
      FROM cartera_cxc c
      JOIN documentos_comerciales dc ON c.id_documento = dc.id_documento
      JOIN terceros t ON dc.id_tercero = t.id_tercero
      WHERE dc.id_tenant = ? AND c.saldo_pendiente > 0
      
      UNION ALL
      
      SELECT 
        'CxP' as tipo_cartera,
        c.id_cxp as id_cartera,
        dc.numero_documento,
        dc.fecha_emision,
        c.saldo_pendiente,
        t.nombre_completo,
        t.documento,
        t.contacto,
        t.telefono_contacto,
        IFNULL(NULLIF(dc.plazo_dias, 0), t.dias_plazo) as plazo,
        DATEDIFF(NOW(), DATE_ADD(dc.fecha_emision, INTERVAL IFNULL(NULLIF(dc.plazo_dias, 0), t.dias_plazo) DAY)) as dias_vencidos
      FROM cartera_cxp c
      JOIN documentos_comerciales dc ON c.id_documento = dc.id_documento
      JOIN terceros t ON dc.id_tercero = t.id_tercero
      WHERE dc.id_tenant = ? AND c.saldo_pendiente > 0
    `, [id_tenant, id_tenant]);

    let dashboard = {
      resumen: { cxc_total: 0, cxp_total: 0 },
      vencimientos_cxc: { 'Al día': 0, '1-30 días': 0, '31-60 días': 0, '61-90 días': 0, '+90 días': 0 },
      vencimientos_cxp: { 'Al día': 0, '1-30 días': 0, '31-60 días': 0, '61-90 días': 0, '+90 días': 0 },
      top_deudores: [],
      alertas: []
    };

    let deudoresMap = {};

    rows.forEach(r => {
      const saldo = Number(r.saldo_pendiente);
      const dv = r.dias_vencidos;
      let rango = 'Al día';
      if (dv > 0 && dv <= 30) rango = '1-30 días';
      else if (dv > 30 && dv <= 60) rango = '31-60 días';
      else if (dv > 60 && dv <= 90) rango = '61-90 días';
      else if (dv > 90) rango = '+90 días';

      if (r.tipo_cartera === 'CxC') {
        dashboard.resumen.cxc_total += saldo;
        dashboard.vencimientos_cxc[rango] += saldo;
        
        // Top Deudores (Solo CxC)
        if (!deudoresMap[r.documento]) {
          deudoresMap[r.documento] = { nombre: r.nombre_completo, saldo_total: 0, documento: r.documento, contacto: r.contacto, telefono: r.telefono_contacto };
        }
        deudoresMap[r.documento].saldo_total += saldo;

        // Alertas: Si venció o vence en <= 3 días
        if (dv >= -3) {
          dashboard.alertas.push({...r, rango});
        }
      } else {
        dashboard.resumen.cxp_total += saldo;
        dashboard.vencimientos_cxp[rango] += saldo;
      }
    });

    dashboard.top_deudores = Object.values(deudoresMap).sort((a,b) => b.saldo_total - a.saldo_total).slice(0, 5);
    // Sort alerts by days overdue descending
    dashboard.alertas.sort((a,b) => b.dias_vencidos - a.dias_vencidos);

    res.json(dashboard);
  } catch (error) {
    console.error("Error fetching cartera dashboard:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/cartera/prestamo
router.post('/prestamo', async (req, res) => {
  const { id_tenant, id_finca, id_tercero, monto, cuotas, concepto, fecha, id_usuario } = req.body;
  
  if (!id_tenant || !id_tercero || !monto) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos' });
  }

  const connection = await getDb(req).getConnection();
  try {
    await connection.beginTransaction();

    // 1. Crear Documento Comercial (Préstamo)
    const [resDoc] = await connection.query(`
      INSERT INTO documentos_comerciales 
      (id_tenant, id_tercero, numero_documento, fecha_emision, total, subtotal, estado, tipo_pago, plazo_dias, usuario_creacion, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, 'Emitido', 'Credito', ?, ?, ?)
    `, [
      id_tenant, 
      id_tercero, 
      `PREST-${Date.now().toString().slice(-6)}`, 
      fecha, 
      monto, 
      monto, 
      (cuotas || 1) * 30, // Estimación de días de plazo según cuotas
      id_usuario || 1, 
      concepto || 'Préstamo/Adelanto a empleado/contratista'
    ]);

    const id_documento = resDoc.insertId;

    // Fetch the newly generated document number
    const [docs] = await connection.query(`SELECT numero_documento FROM documentos_comerciales WHERE id_documento = ?`, [id_documento]);
    const numero_documento = docs[0].numero_documento;

    // 2. Crear Cartera CxC (Cuenta por Cobrar)
    const [resCxc] = await connection.query(`
      INSERT INTO cartera_cxc (id_documento, saldo_pendiente, estado)
      VALUES (?, ?, 'Vigente')
    `, [id_documento, monto]);

    await connection.commit();

    // 3. Contabilización Automática (Egreso de Caja/Bancos, Ingreso a CxC Trabajadores)
    if (id_finca) {
      await ContabilidadService.generarComprobanteAutomatico({
        id_tenant,
        id_finca,
        modulo: 'Cartera',
        id_tipo_documento: 993, // Código arbitrario para "Desembolso Préstamo"
        monto_total: monto,
        concepto: concepto || `Desembolso Préstamo ${numero_documento}`,
        fecha: fecha,
        id_usuario: id_usuario || 1
      }).catch(err => {
        console.error("Warning: Contabilidad falló, pero el préstamo se registró.", err.message);
      });
    }

    res.json({ success: true, message: 'Préstamo registrado exitosamente', prestamo: { id_documento, numero_documento, monto, cuotas, concepto, fecha } });
  } catch (error) {
    await connection.rollback();
    console.error("Error registrando préstamo:", error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

export default router;
