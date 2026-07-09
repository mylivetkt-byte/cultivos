import express from 'express';
import pool from '../db.js';

const router = express.Router();

function getDb(req) {
  return req.tenantPool || pool;
}

router.get('/dashboard', async (req, res) => {
  try {
    const { tenantId, anio, mes, fechaDesde, fechaHasta, id_finca, id_lote } = req.query;
    const tid = tenantId || 1;
    const year = Number(anio || new Date().getFullYear());
    
    // Filtros de fecha base
    let dateFilter = `YEAR(doc.fecha) = ${year}`;
    if (fechaDesde && fechaHasta) {
        dateFilter = `doc.fecha BETWEEN '${fechaDesde}' AND '${fechaHasta}'`;
    }

    // 1. Plata Gastada (Salidas Reales)
    // Cuentas de gastos (5) o Costos (7) o pasivos pagados, pero simplificado a los egresos reales.
    const [gastos] = await getDb(req).query(`
      SELECT ROUND(SUM(cd.debito - cd.credito), 0) AS total
      FROM contab_detalles cd
      JOIN contab_documentos doc ON cd.id_documento = doc.id_documento
      JOIN plan_contable pc ON cd.id_cuenta = pc.id_cuenta
      WHERE doc.id_tenant = ? AND ${dateFilter}
      AND (pc.codigo LIKE '5%' OR pc.codigo LIKE '7%')
    `, [tid]);

    // 2. Plata Enterrada (Inversión en Cultivos Activos / Siembras)
    // Suma de los costos de producción de las siembras que están en estado 'Activo'
    let sqlSiembras = `SELECT ROUND(SUM(cantidad_plantas * 1500), 0) as total FROM siembras WHERE id_tenant = ? AND estado = 'Activo'`;
    if (id_finca) sqlSiembras += ` AND id_lote IN (SELECT id_lote FROM lotes WHERE id_finca = ${getDb(req).escape(id_finca)})`;
    if (id_lote) sqlSiembras += ` AND id_lote = ${getDb(req).escape(id_lote)}`;
    const [enterrada] = await getDb(req).query(sqlSiembras, [tid]);

    // 3. Ventas Reales (Ingresos)
    const [ventas] = await getDb(req).query(`
      SELECT ROUND(SUM(cd.credito - cd.debito), 0) AS total
      FROM contab_detalles cd
      JOIN contab_documentos doc ON cd.id_documento = doc.id_documento
      JOIN plan_contable pc ON cd.id_cuenta = pc.id_cuenta
      WHERE doc.id_tenant = ? AND ${dateFilter}
      AND pc.codigo LIKE '4%'
    `, [tid]);

    // 4. Proyección de Cosecha
    // Hectareas activas * 20 toneladas * $500.000 (Mock calculation for demonstration)
    let sqlHectareas = `SELECT COALESCE(SUM(l.hectareas), 0) as total FROM siembras s JOIN lotes l ON s.id_lote = l.id_lote WHERE s.id_tenant = ? AND s.estado = 'Activo'`;
    if (id_finca) sqlHectareas += ` AND l.id_finca = ${getDb(req).escape(id_finca)}`;
    if (id_lote) sqlHectareas += ` AND l.id_lote = ${getDb(req).escape(id_lote)}`;
    const [hectareas] = await getDb(req).query(sqlHectareas, [tid]);
    const totalHectareas = hectareas[0]?.total || 0;
    const proyeccion = totalHectareas * 20 * 500000; // 20 ton/ha * 500k COP/ton

    // Datos para las gráficas
    const [flujoMensual] = await getDb(req).query(`
      SELECT DATE_FORMAT(doc.fecha, '%Y-%m') AS periodo,
             ROUND(SUM(CASE WHEN pc.codigo LIKE '4%' THEN cd.credito - cd.debito ELSE 0 END), 0) AS ingresos,
             ROUND(SUM(CASE WHEN pc.codigo LIKE '5%' OR pc.codigo LIKE '7%' THEN cd.debito - cd.credito ELSE 0 END), 0) AS egresos
      FROM contab_detalles cd
      JOIN contab_documentos doc ON cd.id_documento = doc.id_documento
      JOIN plan_contable pc ON cd.id_cuenta = pc.id_cuenta
      WHERE doc.id_tenant = ? AND ${dateFilter}
      GROUP BY DATE_FORMAT(doc.fecha, '%Y-%m')
      ORDER BY periodo ASC
      LIMIT 12
    `, [tid]);

    const [gastosCategorias] = await getDb(req).query(`
      SELECT CASE
               WHEN pc.codigo LIKE '72%' THEN 'Nómina de Campo'
               WHEN pc.codigo LIKE '73%' THEN 'Insumos y Abonos'
               WHEN pc.codigo LIKE '61%' THEN 'Mantenimiento'
               WHEN pc.codigo LIKE '51%' THEN 'Servicios y Adm.'
               ELSE 'Otros Gastos'
             END AS name,
             ROUND(SUM(cd.debito - cd.credito), 0) AS value
      FROM contab_detalles cd
      JOIN contab_documentos doc ON cd.id_documento = doc.id_documento
      JOIN plan_contable pc ON cd.id_cuenta = pc.id_cuenta
      WHERE doc.id_tenant = ? AND ${dateFilter} AND (pc.codigo LIKE '5%' OR pc.codigo LIKE '7%')
      GROUP BY name
      ORDER BY value DESC
      LIMIT 8
    `, [tid]);

    res.json({
      resumen: {
        plataGastada: Number(gastos[0]?.total || 0),
        plataEnterrada: Number(enterrada[0]?.total || 0),
        ventasReales: Number(ventas[0]?.total || 0),
        proyeccionCosecha: proyeccion
      },
      flujoMensual,
      gastosCategorias
    });
  } catch (error) {
    console.error('Error en dashboard agro:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- 1. TABLERO DE COSTOS DE PRODUCCIÓN ---
router.get('/costos-produccion', async (req, res) => {
  try {
    const { tenantId, id_finca, id_lote, periodo } = req.query;
    
    let sql = `
      SELECT 
        cp.id_costo_prod,
        cp.periodo,
        f.nombre as finca_nombre,
        l.nombre as lote_nombre,
        l.hectareas,
        c.nombre as cultivo_nombre,
        cp.costo_mano_obra,
        cp.costo_insumos,
        cp.costo_maquinaria,
        cp.costo_riego,
        cp.costo_indirecto,
        cp.costo_total,
        (cp.costo_total / l.hectareas) as costo_por_hectarea
      FROM costos_produccion cp
      LEFT JOIN fincas f ON cp.id_finca = f.id_finca
      LEFT JOIN lotes l ON cp.id_lote = l.id_lote
      LEFT JOIN cultivos c ON cp.id_cultivo = c.id_cultivo
      WHERE cp.id_tenant = ?
    `;
    const params = [tenantId || 1];

    if (id_finca) {
      sql += ' AND cp.id_finca = ?';
      params.push(id_finca);
    }
    if (id_lote) {
      sql += ' AND cp.id_lote = ?';
      params.push(id_lote);
    }
    if (periodo) {
      sql += ' AND cp.periodo = ?';
      params.push(periodo);
    }

    sql += ' ORDER BY cp.periodo DESC, f.nombre, l.nombre';

    const [rows] = await getDb(req).query(sql, params);

    // Optional: fetch budgets to compare
    const [budgets] = await getDb(req).query(`
      SELECT anio, sum(monto_presupuestado) as total_ppto, sum(monto_ejecutado) as total_ejecutado
      FROM fin_presupuestos
      WHERE id_tenant = ?
      GROUP BY anio
    `, [tenantId || 1]);

    res.json({
      costos: rows,
      resumen_presupuesto: budgets
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- 2. ACTIVOS BIOLÓGICOS (NIC 41) ---
router.get('/activos-biologicos', async (req, res) => {
  try {
    const { tenantId, periodo } = req.query;
    
    // We get active siembras (crops in field) as biological assets
    let sql = `
      SELECT 
        s.id_siembra,
        l.nombre as lote_nombre,
        c.nombre as cultivo_nombre,
        s.fecha_siembra,
        s.estado,
        s.cantidad_plantas as plantas_vivas,
        DATEDIFF(CURRENT_DATE, s.fecha_siembra) as dias_crecimiento,
        -- Accumulated Cost based on lot and crop (Mock summation logic)
        COALESCE((SELECT SUM(costo_total) FROM costos_produccion WHERE id_lote = s.id_lote), s.cantidad_plantas * 1500) as costo_acumulado,
        -- Last valuation
        v.id_valoracion,
        v.valor_razonable_estimado as ultimo_valor_razonable,
        v.deterioro,
        v.periodo as periodo_valoracion,
        v.contabilizado
      FROM siembras s
      LEFT JOIN lotes l ON s.id_lote = l.id_lote
      LEFT JOIN cultivos c ON s.id_cultivo = c.id_cultivo
      LEFT JOIN fin_activos_biologicos_valoracion v ON v.id_siembra = s.id_siembra AND v.periodo = ?
      WHERE s.id_tenant = ? AND s.estado = 'Activo'
    `;
    const params = [periodo || '2026-05', tenantId || 1];

    const [rows] = await getDb(req).query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/activos-biologicos/valorar', async (req, res) => {
  try {
    const { id_siembra, tenantId, periodo, costo_acumulado, valor_razonable, deterioro, observaciones } = req.body;
    
    // Check if it already exists
    const [exist] = await getDb(req).query("SELECT id_valoracion FROM fin_activos_biologicos_valoracion WHERE id_siembra = ? AND periodo = ?", [id_siembra, periodo]);
    
    if (exist.length > 0) {
      await getDb(req).query(`
        UPDATE fin_activos_biologicos_valoracion 
        SET valor_razonable_estimado = ?, deterioro = ?, observaciones = ?, costo_acumulado_historico = ?
        WHERE id_valoracion = ?
      `, [valor_razonable, deterioro, observaciones, costo_acumulado, exist[0].id_valoracion]);
    } else {
      await getDb(req).query(`
        INSERT INTO fin_activos_biologicos_valoracion (id_tenant, id_siembra, periodo, costo_acumulado_historico, valor_razonable_estimado, deterioro, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [tenantId || 1, id_siembra, periodo, costo_acumulado, valor_razonable, deterioro, observaciones]);
    }

    res.json({ success: true, message: "Valoración registrada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
