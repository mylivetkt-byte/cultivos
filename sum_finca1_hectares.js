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
  const [rows] = await pool.query(`
    SELECT SUM(l.hectareas) AS total_hectares
    FROM lotes l
    JOIN nucleos n ON l.id_nucleo = n.id_nucleo
    WHERE n.id_finca = 1
  `);
  console.log('Total hectares for finca 1:', rows[0].total_hectares);
  await pool.end();
}

run().catch(console.error);