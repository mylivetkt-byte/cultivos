import mysql from 'mysql2/promise';
import 'dotenv/config';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'sas_agricolas',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  connectTimeout: 10000,
});

async function runAnalysis() {
  const [rows] = await pool.query(`
    SELECT 
      f.id_finca,
      f.nombre,
      f.hectareas_totales AS finca_hectareas,
      COUNT(l.id_lote) AS total_lotes,
      COALESCE(SUM(l.hectareas),0) AS total_lotes_hectareas,
      COUNT(e.id_empleado) AS total_trabajadores
    FROM fincas f
    LEFT JOIN nucleos n ON n.id_finca = f.id_finca
    LEFT JOIN lotes l ON l.id_nucleo = n.id_nucleo AND l.estado = 'Activo'
    LEFT JOIN rrhh_empleados e ON e.id_finca = f.id_finca AND e.estado = 'Activo'
    GROUP BY f.id_finca, f.nombre, f.hectareas_totales
    ORDER BY f.id_finca;
  `);
  
  // Add computed metrics
  const result = rows.map(r => {
    const totalLots = r.total_lotes || 0;
    const totalLotArea = r.total_lotes_hectareas || 0;
    const avgLotSize = totalLots > 0 ? parseFloat(totalLotArea) / totalLots : 0;
    const workersPerLot = totalLots > 0 ? r.total_trabajadores / totalLots : 0;
    return {
      id_finca: r.id_finca,
      nombre: r.nombre,
      finca_hectareas: parseFloat(r.finca_hectareas),
      total_lotes: totalLots,
      total_lotes_hectareas: parseFloat(totalLotArea),
      avg_lot_size_ha: avgLotSize.toFixed(2),
      workers_per_lot: workersPerLot.toFixed(2),
      total_trabajadores: r.total_trabajadores
    };
  });

  console.table(result);
  await pool.end();
}

runAnalysis().catch(console.error);