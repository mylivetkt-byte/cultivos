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

async function getColumns(table) {
  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${table}\``);
  console.log(`Columns of ${table}:`);
  rows.forEach(col => {
    console.log(`- ${col.Field} (${col.Type})`);
  });
  await pool.end();
}

getColumns('rrhh_empleados').catch(console.error);