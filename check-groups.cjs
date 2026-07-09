const mysql = require('mysql2/promise');
async function run() {
  const pool = mysql.createPool({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  const [g] = await pool.query('DESCRIBE inv_grupos');
  const [s] = await pool.query('DESCRIBE inv_subgrupos');
  console.log('Grupos:', g.map(x=>x.Field));
  console.log('Subgrupos:', s.map(x=>x.Field));
  process.exit(0);
}
run();
