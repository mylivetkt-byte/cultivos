const mysql = require('mysql2/promise');
async function run() {
  const pool = mysql.createPool({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  try {
    await pool.query('ALTER TABLE insumos ADD CONSTRAINT fk_insumo_grupo FOREIGN KEY (id_grupo) REFERENCES inv_grupos(id_grupo) ON DELETE SET NULL');
  } catch(e) { console.log(e.message); }
  try {
    await pool.query('ALTER TABLE insumos ADD CONSTRAINT fk_insumo_subgrupo FOREIGN KEY (id_subgrupo) REFERENCES inv_subgrupos(id_subgrupo) ON DELETE SET NULL');
  } catch(e) { console.log(e.message); }
  console.log('FKs added');
  process.exit(0);
}
run();
