import pool from '../db.js';

async function analyzeAnomalies(loteId, metrics) {
  const ndvi = Number(metrics.ndvi);
  const ndmi = Number(metrics.ndmi);

  const alerts = [];
  if (!Number.isNaN(ndvi) && ndvi < 0.4) {
    alerts.push(['anomalia_vigor', 'ALTA', `Bajo NDVI detectado: ${ndvi.toFixed(2)}. Posible estrés hídrico o plaga.`]);
  }
  if (!Number.isNaN(ndmi) && ndmi < 0.3) {
    alerts.push(['estres_hidrico', 'MEDIA', `NDMI bajo detectado: ${ndmi.toFixed(2)}. Revisar riego.`]);
  }

  for (const [tipo, severidad, mensaje] of alerts) {
    await pool.query(
      `INSERT INTO alertas_sat (lote_id, tipo, severidad, mensaje)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE mensaje = VALUES(mensaje), fecha = NOW(), estado = 'ACTIVA'`,
      [loteId, tipo, severidad, mensaje]
    );
  }
}

export async function processSatelliteData() {
  console.log('Iniciando worker satelital desde BD...');
  try {
    const [lotes] = await pool.query('SELECT DISTINCT lote_id FROM sat_metrics');

    for (const lote of lotes) {
      const loteId = lote.lote_id;
      const [rows] = await pool.query(`
        SELECT lote_id, fecha, ndvi, ndmi, et0, temperatura
        FROM sat_metrics
        WHERE lote_id = ?
        ORDER BY fecha DESC, id DESC
        LIMIT 1
      `, [loteId]);

      if (rows.length === 0) continue;
      await analyzeAnomalies(loteId, rows[0]);
    }

    console.log('Worker satelital finalizado con éxito.');
  } catch (error) {
    console.error('Error en worker satelital:', error);
  }
}

if (process.argv[1]?.includes('satelliteWorker.js')) {
  processSatelliteData().then(() => process.exit(0));
}
