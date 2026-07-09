const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  const [t] = await c.query("SHOW TABLES LIKE '%ganado%'");
  console.log('Ganado:', t.map(x => Object.values(x)[0]));
  const [t2] = await c.query("SHOW TABLES LIKE '%vent%'");
  console.log('Ventas:', t2.map(x => Object.values(x)[0]));
  const [t3] = await c.query("SHOW TABLES LIKE '%compr%'");
  console.log('Compras:', t3.map(x => Object.values(x)[0]));
  const [t4] = await c.query("SHOW TABLES LIKE '%lech%'");
  console.log('Leche:', t4.map(x => Object.values(x)[0]));
  c.end();
}
run();
