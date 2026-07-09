import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

// --- 1. ESTADO DE FLUJOS DE EFECTIVO ---
router.get('/flujo-efectivo', async (req, res) => {
  try {
    const { tenantId, anio } = req.query;
    
    // We aggregate cash flows based on account classifications (Direct Method approximation)
    // 1. Actividades de Operación
    // 2. Actividades de Inversión
    // 3. Actividades de Financiación

    const [movimientos] = await getDb(req).query(`
      SELECT 
        CASE 
          WHEN pc.codigo LIKE '4%' OR pc.codigo LIKE '13%' THEN 'Recaudos de Clientes'
          WHEN pc.codigo LIKE '5%' OR pc.codigo LIKE '6%' OR pc.codigo LIKE '23%' THEN 'Pagos a Proveedores y Empleados'
          WHEN pc.codigo LIKE '15%' THEN 'Compra/Venta de Propiedad, Planta y Equipo'
          WHEN pc.codigo LIKE '21%' THEN 'Préstamos Bancarios'
          WHEN pc.codigo LIKE '31%' THEN 'Aportes de Capital'
          ELSE 'Otros Movimientos de Efectivo'
        END as categoria,
        CASE
          WHEN pc.codigo LIKE '15%' THEN 'Inversión'
          WHEN pc.codigo LIKE '21%' OR pc.codigo LIKE '31%' THEN 'Financiación'
          ELSE 'Operación'
        END as tipo_actividad,
        SUM(cd.credito) as entradas, -- Cash coming in (debit to cash, credit to counterpart)
        SUM(cd.debito) as salidas -- Cash going out (credit to cash, debit to counterpart)
      FROM contab_detalles cd
      JOIN contab_documentos doc ON cd.id_documento = doc.id_documento
      JOIN contab_comprobantes comp ON doc.id_comprobante = comp.id_comprobante
      JOIN plan_contable pc ON cd.id_cuenta = pc.id_cuenta
      WHERE doc.id_tenant = ? AND YEAR(doc.fecha) = ?
        AND doc.id_documento IN (
          -- Find vouchers that involve Cash (11%)
          SELECT cd2.id_documento FROM contab_detalles cd2 
          JOIN plan_contable pc2 ON cd2.id_cuenta = pc2.id_cuenta 
          WHERE pc2.codigo LIKE '11%'
        )
        AND pc.codigo NOT LIKE '11%' -- Group by the counterpart
      GROUP BY categoria, tipo_actividad
    `, [tenantId || 1, anio || 2026]);

    const [saldoInicialRows] = await getDb(req).query(`
      SELECT SUM(cd.debito - cd.credito) as saldo
      FROM contab_detalles cd
      JOIN contab_documentos doc ON cd.id_documento = doc.id_documento
      JOIN contab_comprobantes comp ON doc.id_comprobante = comp.id_comprobante
      JOIN plan_contable pc ON cd.id_cuenta = pc.id_cuenta
      WHERE doc.id_tenant = ? AND YEAR(doc.fecha) < ? AND pc.codigo LIKE '11%'
    `, [tenantId || 1, anio || 2026]);

    const saldo_inicial = parseFloat(saldoInicialRows[0]?.saldo || 0);

    const flujo = {
      saldo_inicial: saldo_inicial,
      operacion: movimientos.filter(m => m.tipo_actividad === 'Operación').map(m => ({
        categoria: m.categoria,
        flujo_neto: parseFloat(m.entradas || 0) - parseFloat(m.salidas || 0)
      })),
      inversion: movimientos.filter(m => m.tipo_actividad === 'Inversión').map(m => ({
        categoria: m.categoria,
        flujo_neto: parseFloat(m.entradas || 0) - parseFloat(m.salidas || 0)
      })),
      financiacion: movimientos.filter(m => m.tipo_actividad === 'Financiación').map(m => ({
        categoria: m.categoria,
        flujo_neto: parseFloat(m.entradas || 0) - parseFloat(m.salidas || 0)
      }))
    };

    // Recalculate totals
    const sumNeto = (arr) => arr.reduce((acc, curr) => acc + curr.flujo_neto, 0);
    flujo.total_operacion = sumNeto(flujo.operacion);
    flujo.total_inversion = sumNeto(flujo.inversion);
    flujo.total_financiacion = sumNeto(flujo.financiacion);

    flujo.flujo_neto_periodo = flujo.total_operacion + flujo.total_inversion + flujo.total_financiacion;
    flujo.saldo_final = flujo.saldo_inicial + flujo.flujo_neto_periodo;

    res.json(flujo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- 2. ESTADO DE CAMBIOS EN EL PATRIMONIO ---
router.get('/cambios-patrimonio', async (req, res) => {
  try {
    const { tenantId, anio } = req.query;
    
    const [rows] = await getDb(req).query(`
      SELECT codigo, nombre, saldo_inicial, aumentos, disminuciones,
             saldo_inicial + aumentos - disminuciones AS saldo_final
      FROM estados_patrimonio_movimientos
      WHERE id_tenant = ? AND anio = ?
      ORDER BY codigo
    `, [tenantId || 1, anio || 2026]);

    const response = { anio: Number(anio || 2026), cuentas: rows };

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/kpis-gerenciales', async (req, res) => {
  try {
    const { tenantId, periodo } = req.query;
    const [rows] = await getDb(req).query(`
      SELECT periodo,
             liquidez_corriente AS liquidezCorriente,
             prueba_acida AS pruebaAcida,
             endeudamiento,
             margen_ebitda AS margenEBITDA,
             roe,
             roa,
             costo_hectarea_promedio AS costoHectareaPromedio,
             ingresos_totales AS ingresosTotales,
             costos_operativos AS costosOperativos,
             variacion_ingresos_pct AS variacionIngresosPct,
             variacion_ebitda_pct AS variacionEbitdaPct,
             variacion_costo_ha_pct AS variacionCostoHaPct,
             fuente
      FROM gerencia_kpis
      WHERE id_tenant = ? AND (? IS NULL OR periodo = ?)
      ORDER BY periodo DESC
      LIMIT 1
    `, [tenantId || 1, periodo || null, periodo || null]);

    res.json(rows[0] || null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
