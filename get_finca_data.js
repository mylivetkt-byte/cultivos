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
  const [rows] = await pool.query('SELECT * FROM fincas WHERE id_finca = 1');
  console.log('Finca 1 rows:', rows);
  const [cols] = await pool.query('SHOW COLUMNS FROM fincas');
  console.log('Finca columns:');
  cols.forEach(c => console.log(`- ${c.Field} (${c.Type})`));
  await pool.end();
}

run().catch(console.error);