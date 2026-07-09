const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  const [tables] = await c.query('SHOW TABLES');
  const tableNames = tables.map(r => Object.values(r)[0]);
  const vehiculosTables = tableNames.filter(t => t.includes('vehiculo') || t.includes('transporte') || t.includes('maq'));
  console.log('Tables:', vehiculosTables);
  c.end();
}
run();
