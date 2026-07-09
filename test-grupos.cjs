const mysql = require('mysql2/promise');
async function run() {
  const pool = mysql.createPool({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  const [res] = await pool.query('SHOW TABLES');
  const tables = res.map(r => Object.values(r)[0]);
  console.log(tables.filter(t => t.includes('grupo') || t.includes('categoria')));
  process.exit(0);
}
run();
