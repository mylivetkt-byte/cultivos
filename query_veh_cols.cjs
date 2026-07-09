const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  const [cols] = await c.query('DESCRIBE vehiculos');
  console.log('vehiculos columns:', cols.map(r => r.Field));
  c.end();
}
run();
