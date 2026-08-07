const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  const [cols1] = await c.query('DESCRIBE tenants');
  const [cols2] = await c.query('DESCRIBE fincas');
  console.log('--- TENANTS ---');
  console.log(cols1.map(r => `${r.Field} (${r.Type})`).join('\n'));
  console.log('\n--- FINCAS ---');
  console.log(cols2.map(r => `${r.Field} (${r.Type})`).join('\n'));
  c.end();
}
run();
