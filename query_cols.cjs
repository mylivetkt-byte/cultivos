const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  const [cols1] = await c.query('DESCRIBE movimientos_inventario');
  const [cols2] = await c.query('DESCRIBE inv_existencias');
  console.log('movimientos_inventario:', cols1.map(r => r.Field));
  console.log('inv_existencias:', cols2.map(r => r.Field));
  c.end();
}
run();
