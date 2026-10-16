import { Router } from 'express';
import { getDb } from '../utils/db.js';
import ContabilidadService from '../services/ContabilidadService.js';

const router = Router();

// POST /api/notas-credito
// Crea una nueva nota de crédito a partir de una factura existente
router.post('/', async (req, res) => {
  const { 
    id_tenant, 
    id_documento_referencia, 
    motivo_referencia, 
    items, 
    usuario_creacion 
  } = req.body;

  if (!id_documento_referencia || !items || items.length === 0) {
    return res.status(400).json({ error: 'Faltan datos requeridos o ítems para la nota de crédito.' });
  }

  const conn = await getDb(req).getConnection();
  try {
    await conn.beginTransaction();

    // 1. Obtener la factura original
    const [facturas] = await conn.query(
      `SELECT * FROM documentos_comerciales WHERE id_documento = ? AND id_tenant = ?`,
      [id_documento_referencia, id_tenant || 1]
    );

    if (facturas.length === 0) {
      throw new Error('Factura original no encontrada.');
    }
    const factura = facturas[0];

    // 2. Calcular totales de la nota de crédito
    let subtotal = 0;
    let iva_total = 0;
    let total = 0;
    
    for (const item of items) {
      const lineTotal = item.cantidad * item.precio_unitario;
      const lineIva = lineTotal * (item.iva_porcentaje / 100);
      subtotal += lineTotal;
      iva_total += lineIva;
      total += lineTotal + lineIva;
    }

    // 3. Crear el documento de Nota de Crédito (usando negativo o simplemente como tipo Nota_Credito)
    // Buscamos un tipo de documento para nota de crédito
    const [tiposDoc] = await conn.query(
      `SELECT id_tipo_doc FROM tipos_documentos WHERE codigo = 'NC' AND id_tenant = ? LIMIT 1`,
      [id_tenant || 1]
    );
    const id_tipo_doc = tiposDoc.length > 0 ? tiposDoc[0].id_tipo_doc : null;

    const consecutivo = `NC-${Date.now().toString().slice(-6)}`;

    const [docRes] = await conn.query(
      `INSERT INTO documentos_comerciales 
        (id_tenant, id_tipo_doc, id_tercero, numero_documento, fecha_emision, subtotal, iva_total, total, estado, tipo_pago, usuario_creacion, id_documento_referencia, motivo_referencia, moneda, tasa_trm)
       VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?, 'Emitido', ?, ?, ?, ?, ?, ?)`,
      [
        id_tenant || 1,
        id_tipo_doc,
        factura.id_tercero,
        consecutivo,
        subtotal,
        iva_total,
        total,
        factura.tipo_pago,
        usuario_creacion || 1,
        id_documento_referencia,
        motivo_referencia || 'Devolución',
        factura.moneda,
        factura.tasa_trm
      ]
    );

    const id_nota_credito = docRes.insertId;

    // 4. Insertar detalle y revertir inventario
    for (const item of items) {
      await conn.query(
        `INSERT INTO documentos_comerciales_detalle 
          (id_documento, id_insumo, id_lote, cantidad, precio_unitario, iva_porcentaje, iva_valor, peso_neto)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_nota_credito,
          item.id_insumo,
          item.id_lote || null,
          item.cantidad,
          item.precio_unitario,
          item.iva_porcentaje || 0.00,
          (item.cantidad * item.precio_unitario) * ((item.iva_porcentaje || 0) / 100),
          item.cantidad
        ]
      );

      // Revertir inventario general (entrada)
      await conn.query(
        `UPDATE insumos SET stock_actual = COALESCE(stock_actual, 0) + ? WHERE id_insumo = ?`,
        [item.cantidad, item.id_insumo]
      );

      // Log de movimiento de entrada por devolución
      await conn.query(
        `INSERT INTO movimientos_inventario
          (id_tenant, id_insumo, tipo_movimiento, cantidad, costo_unitario, documento_referencia, usuario_responsable, observaciones, id_documento)
         VALUES (?, ?, 'Entrada', ?, ?, ?, ?, ?, ?)`,
        [
          id_tenant || 1,
          item.id_insumo,
          item.cantidad,
          item.precio_unitario,
          consecutivo,
          usuario_creacion || 1,
          `Entrada por devolución NC ${consecutivo}`,
          id_nota_credito
        ]
      );
    }

    // 5. Ajustar saldo de Cartera (CxC)
    // Si la factura original era a crédito, reducimos el saldo pendiente
    const [cartera] = await conn.query(
      `SELECT * FROM cartera_cxc WHERE id_documento = ? AND estado = 'Vigente'`,
      [id_documento_referencia]
    );

    if (cartera.length > 0) {
      const cxc = cartera[0];
      const nuevoSaldo = Math.max(0, cxc.saldo_pendiente - total);
      const estado = nuevoSaldo <= 0 ? 'Pagado' : 'Vigente';
      
      await conn.query(
        `UPDATE cartera_cxc SET saldo_pendiente = ?, estado = ? WHERE id_cxc = ?`,
        [nuevoSaldo, estado, cxc.id_cxc]
      );

      // Registrar el abono simulado por la NC
      await conn.query(
        `INSERT INTO cartera_cxc_abonos (id_cxc, fecha_abono, valor_abono, forma_pago, id_usuario)
         VALUES (?, CURDATE(), ?, 'Nota_Credito', ?)`,
        [cxc.id_cxc, total, usuario_creacion || 1]
      );
    }

    // 6. Contabilidad (generamos comprobante automático, debe ser atómico)
    await ContabilidadService.generarComprobanteAutomatico({
      id_tenant: id_tenant || 1,
      id_finca: 1, // Por simplicidad, asumiendo finca 1 o parametrizar
      modulo: 'Ventas_Devolucion',
      id_tipo_documento: 995, // Supuesto ID para devoluciones
      monto_total: total,
      concepto: `Nota Crédito ${consecutivo} a Factura ${factura.numero_documento}`,
      fecha: new Date(),
      id_usuario: usuario_creacion || 1,
      connection: conn
    });

    await conn.commit();
    res.json({ success: true, id_nota_credito, consecutivo, total });

  } catch (error) {
    await conn.rollback();
    console.error('Error al generar Nota de Crédito:', error);
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
});

// GET /api/notas-credito/factura/:id_factura
// Obtiene todas las notas de crédito de una factura
router.get('/factura/:id_factura', async (req, res) => {
  try {
    const [notas] = await getDb(req).query(
      `SELECT * FROM documentos_comerciales 
       WHERE id_documento_referencia = ? AND estado != 'Anulado'`,
      [req.params.id_factura]
    );
    res.json({ success: true, notas });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
