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

async function run() {
  const conn = await pool.getConnection();
  try {
    // 1. finca 1 details
    const [fincaRows] = await conn.query('SELECT id_finca, nombre, hectareas_totales FROM fincas WHERE id_finca = 1');
    console.log('Finca 1:', fincaRows[0]);

    // 2. nucleos for finca 1
    const [nucleosRows] = await conn.query(`
      SELECT id_nucleo, nombre, hectareas 
      FROM nucleos 
      WHERE id_finca = 1
    `);
    console.log('Nucleos for finca 1:');
    nucleosRows.forEach(n => console.log(`  ${n.id_nucleo}: ${n.nombre} (${n.hectareas} ha)`));

    // 4. lotes for each nucleo
    console.log('Lotes por nucleo:');
    for (const n of nucleosRows) {
      const [lotesRows] = await conn.query(`
        SELECT COUNT(*) as cnt, SUM(l.hectareas) as total_ha
        FROM lotes l
        WHERE l.id_nucleo = ? AND l.estado = 'Activo'
        GROUP BY l.id_nucleo
      `, [n.id_nucleo]);
      const lotCount = loteRows?.[0]?.cnt;
      const totalHa = loteRows?.[0]?.total_ha;
      console.log(`  nucleo ${n.id_nucleo} (${n.nombre}): ${loteCount} lotes, ${totalHa.toFixed(2)} ha`);
    }

    // 5. total employees active in finca 1
    const [empRows] = await conn.query(`
      SELECT COUNT(*) as cnt 
      FROM rrhh_empleados 
      WHERE id_finca = 1 AND estado = 'Activo'
    `);
    console.log('Empleados activos en finca 1:', rows[0].cnt);
  } finally {
    await pool.end();
  }
}

run().catch(console.error);