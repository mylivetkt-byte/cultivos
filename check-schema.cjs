const mysql = require('mysql2/promise');
async function run() {
  const p = mysql.createPool({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  const tables = ['plan_contable', 'periodos_contables', 'tipos_comprobantes', 'inv_tipos_documento', 'gen_tipos_documento', 'comprobantes', 'comprobantes_detalle', 'centros_costo'];
  for(let t of tables) {
    try {
      const [rows] = await p.query(`DESCRIBE ${t}`);
      console.log(`\n--- ${t} ---`);
      console.table(rows);
    } catch(e) {
      console.log(`Table ${t} does not exist`);
    }
  }
  process.exit(0);
}
run();
