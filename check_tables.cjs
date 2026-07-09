const mysql = require('mysql2/promise');
async function check() {
  const c = await mysql.createConnection({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  const [tables] = await c.query("SHOW TABLES");
  const list = tables.map(t=>Object.values(t)[0]);
  console.log("Semilleros:", list.filter(t=>t.includes('semille')));
  console.log("Produccion:", list.filter(t=>t.includes('produc')));
  c.end();
}
check();
