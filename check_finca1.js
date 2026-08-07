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
  const db = await pool.getConnection();
  try {
    // 1. Finca 1 details
    const [fincaRows] = await db.query('SELECT id_finca, nombre, hectareas_totales FROM fincas WHERE id_finca = 1');
    console.log('Finca 1:', fincaRows[0]);

    // 2. Nucleos for finca 1
    const [nucleosRows] = await db.query(`
      SELECT id_nucleo, nombre, hectareas 
      FROM nucleos 
      WHERE id_finca = 1
    `);
    console.log('Nucleos for finca 1:');
    nucleosRows.forEach(n => console.log(`${n.id_nucleo}: ${n.nombre} (${n.hectareas} ha)`));

    // 3. Lotes for each nucleo
    console.log('Lotes por nucleo:');
    for (const n of nucleosRows) {
      const [lotesRows] = await db.query(`
        SELECT COUNT(*) as cnt, SUM(l.hectareas) as total_ha
        FROM lotes l
        WHERE l.id_nucleo = ? AND l.estado = 'Activo'
        GROUP BY l.id_nucleo
      `, [n.id_nucleo]);
      console.log(`  nucleo ${n.id_nucleo} (${n.nombre}): ${lotesRows[0].cnt} lotes, ${lotesRows[0].total_ha.toFixed(2)} ha`);
    }

    // 4. Empleados activos en finca 1
    const [empleados] = await db.query(`
      SELECT COUNT(*) as cnt 
      FROM rrhh_empleados 
      WHERE id_finca = 1 AND estado = 'Activo'
    `);
    console.log('Empleados activos en finca 1:', rows[0].cnt);
  } finally {
    await db.release();
  }
}

run().catch(console.error);