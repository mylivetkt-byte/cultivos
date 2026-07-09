import mysql from 'mysql2/promise';

async function run() {
  const pool = mysql.createPool({host:'localhost', port:3307, user:'root', password:'12345', database:'sas_agricolas'});
  const [rows] = await pool.query('SHOW TABLES');
  console.log(rows.map(r => Object.values(r)[0]).join(', '));
  process.exit(0);
}
run();
