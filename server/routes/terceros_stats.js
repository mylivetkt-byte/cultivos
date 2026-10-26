import express from 'express';
import pool from '../db.js';
import { getDb } from '../utils/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { id_tenant, tenantId } = req.query;
  const tId = id_tenant || tenantId || req.user?.id_tenant || 1;
  try {
    const [terceros] = await getDb(req).query(`
      SELECT * FROM terceros WHERE id_tenant = ? AND activo = 1 ORDER BY nombre_completo ASC
    `, [tId]);
    res.json(terceros);
  } catch (error) {
    console.error('Error fetching terceros:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/all', async (req, res) => {
  const { id_tenant } = req.query;
  try {
    const [terceros] = await getDb(req).query(`
      SELECT t.id_tercero, t.documento, t.nombre_completo, t.tipo_tercero, t.contacto, t.telefono_contacto, t.cupo_credito, t.dias_plazo,
             COALESCE(SUM(v.cargo) - SUM(v.abono), 0) as saldo_actual
      FROM terceros t
      LEFT JOIN vw_estado_cuenta v ON t.id_tercero = v.id_tercero AND v.id_tenant = t.id_tenant
      WHERE t.id_tenant = ? AND t.activo = 1
      GROUP BY t.id_tercero
    `, [id_tenant || 1]);
    
    // For each we fetch the last payment and last purchase
    for (let t of terceros) {
      // Last payment (abono > 0)
      const [lastPay] = await getDb(req).query(`
        SELECT fecha, abono FROM vw_estado_cuenta 
        WHERE id_tercero = ? AND abono > 0 
        ORDER BY fecha DESC LIMIT 1
      `, [t.id_tercero]);
      t.ultimo_pago = lastPay.length > 0 ? lastPay[0] : null;

      // Last purchase/sale (cargo > 0 and it's a Factura)
      const [lastOp] = await getDb(req).query(`
        SELECT fecha, cargo, tipo_operacion FROM vw_estado_cuenta 
        WHERE id_tercero = ? AND cargo > 0 AND tipo_operacion LIKE 'Factura%'
        ORDER BY fecha DESC LIMIT 1
      `, [t.id_tercero]);
      t.ultima_operacion = lastOp.length > 0 ? lastOp[0] : null;
    }

    res.json({ success: true, data: terceros });
  } catch (error) {
    console.error('Error stats terceros:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { id_tenant } = req.query;
  try {
    const [terceros] = await getDb(req).query(`
      SELECT t.*, COALESCE(SUM(v.cargo) - SUM(v.abono), 0) as saldo_actual
      FROM terceros t
      LEFT JOIN vw_estado_cuenta v ON t.id_tercero = v.id_tercero AND v.id_tenant = t.id_tenant
      WHERE t.id_tercero = ? AND t.id_tenant = ?
      GROUP BY t.id_tercero
    `, [id, id_tenant || 1]);

    if (terceros.length === 0) return res.status(404).json({ error: 'Tercero no encontrado' });
    const tercero = terceros[0];

    const [historial] = await getDb(req).query(`
      SELECT * FROM vw_estado_cuenta 
      WHERE id_tercero = ? AND id_tenant = ?
      ORDER BY fecha DESC
    `, [id, id_tenant || 1]);

    tercero.historial = historial;

    res.json({ success: true, data: tercero });
  } catch (error) {
    console.error('Error perfil tercero:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
