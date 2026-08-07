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
  // Get finca 1
  const [fincaRows] = await pool.query('SELECT * FROM fincas WHERE id_finca = 1');
  console.log('Finca 1:', fincaRows[0]);

  // Get nucleos for finca 1
  const [nucleosRows] = await pool.query(`
    SELECT id_nucleo, codigo, nombre, hectareas
    FROM nucleos
    WHERE id_finca = 1
  `);
  console.log('Nucleos for finca 1:');
  nucleosRows.forEach(n => console.log(`${n.id_nucleo}: ${n.nombre} (${n.hectareas} ha)`));

  // Get lotes belonging to those nucleos (active only)
  const [lotesRows] = await pool.query(`
    SELECT l.id_lote, l.codigo, l.nombre, l.hectareas, l.estado
    FROM lotes l
    JOIN nucleos n ON l.id_nucleo = n.id_nucleo
    WHERE n.id_finca = 1 AND l.estado = 'Activo'
    ORDER BY l.id_lote
  `);
  console.log('Lotes for finca 1 (active):');
  lotesRows.forEach(l => console.log(`${l.id_lote}: ${l.nombre} (${l.hectareas} ha) [${l.codigo}]`));
  await pool.end();
}

run().catch(console.error);