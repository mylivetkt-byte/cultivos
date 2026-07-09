import express from 'express';
const router = express.Router();

router.get('/stats', async (req, res) => {
  try {
    const db = req.tenantPool;
    if (!db) return res.status(500).json({ error: 'Tenant pool not found' });

    // 1. Get Top Buyers (by total USD)
    const [topCompradores] = await db.query(`
      SELECT c.nombre, SUM(v.total_usd) as total_compras, SUM(v.toneladas) as total_volumen
      FROM com_ventas_historial v
      JOIN com_empresas_compradoras c ON v.id_comprador = c.id
      GROUP BY c.id, c.nombre
      ORDER BY total_compras DESC
      LIMIT 5
    `);

    // 2. Get Top Transporters (by volume)
    const [topTransportadoras] = await db.query(`
      SELECT t.nombre, SUM(v.toneladas) as total_transportado
      FROM com_ventas_historial v
      JOIN com_empresas_transportadoras t ON v.id_transportadora = t.id
      GROUP BY t.id, t.nombre
      ORDER BY total_transportado DESC
      LIMIT 5
    `);

    // 3. Get Price History (Market vs Sales)
    // We get monthly aggregated averages for the last 6 months
    const [precios] = await db.query(`
      SELECT 
        DATE_FORMAT(fecha, '%Y-%m') as mes,
        producto,
        AVG(precio_usd) as precio_mercado_avg,
        AVG(trm) as trm_avg
      FROM com_precios_mercado
      GROUP BY mes, producto
      ORDER BY mes ASC
    `);

    const [ventasPrecios] = await db.query(`
      SELECT 
        DATE_FORMAT(fecha, '%Y-%m') as mes,
        producto,
        AVG(precio_tonelada_usd) as precio_venta_avg,
        SUM(total_usd) as ingresos_usd
      FROM com_ventas_historial
      GROUP BY mes, producto
      ORDER BY mes ASC
    `);

    // Merge history into a neat timeline
    const timelineMap = {};
    precios.forEach(p => {
      const key = `${p.mes}_${p.producto}`;
      if (!timelineMap[key]) timelineMap[key] = { mes: p.mes, producto: p.producto, mercado: Number(p.precio_mercado_avg).toFixed(2), trm: Number(p.trm_avg).toFixed(2), venta: 0, ingresos: 0 };
    });
    
    ventasPrecios.forEach(v => {
      const key = `${v.mes}_${v.producto}`;
      if (timelineMap[key]) {
        timelineMap[key].venta = Number(v.precio_venta_avg).toFixed(2);
        timelineMap[key].ingresos = Number(v.ingresos_usd).toFixed(2);
      }
    });

    const timeline = Object.values(timelineMap);

    // 4. Global KPIs
    const [kpis] = await db.query(`
      SELECT 
        SUM(total_usd) as total_ventas_usd,
        SUM(toneladas) as volumen_total
      FROM com_ventas_historial
    `);

    // 5. Current USD TRM
    const [latestTrm] = await db.query(`
      SELECT trm, fecha FROM com_precios_mercado ORDER BY fecha DESC LIMIT 1
    `);

    res.json({
      topCompradores,
      topTransportadoras,
      timeline,
      kpis: {
        totalVentasUSD: kpis[0].total_ventas_usd || 0,
        volumenTotal: kpis[0].volumen_total || 0,
        trmActual: latestTrm.length > 0 ? latestTrm[0].trm : 0
      }
    });
  } catch (err) {
    console.error('Error fetching comercializacion stats:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/ventas', async (req, res) => {
  try {
    const db = req.tenantPool;
    const [rows] = await db.query(`
      SELECT v.*, c.nombre as comprador, t.nombre as transportadora
      FROM com_ventas_historial v
      JOIN com_empresas_compradoras c ON v.id_comprador = c.id
      JOIN com_empresas_transportadoras t ON v.id_transportadora = t.id
      ORDER BY v.fecha DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
