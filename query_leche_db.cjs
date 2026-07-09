const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  const [t] = await c.query("SHOW COLUMNS FROM ganado_produccion_leche");
  console.log('ganado_produccion_leche:', t.map(x => x.Field));
  c.end();
}
run();
