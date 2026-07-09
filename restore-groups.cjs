const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  await pool.query('TRUNCATE TABLE inv_grupos');
  await pool.query('TRUNCATE TABLE inv_subgrupos');
  
  // Recrear Grupos
  const grupos = [
    [1, 1, 'FERT', 'Fertilizantes', null],
    [2, 1, 'FITO', 'Fitosanitarios', null],
    [3, 1, 'HERR', 'Herramientas y Equipos', null],
    [4, 1, 'SEM', 'Semillas y Material Vegetal', null],
    [5, 1, 'COMB', 'Combustibles y Lubricantes', null],
    [6, 1, 'CONS', 'Materiales de Construcción', null],
    [13, 1, 'VET', 'Insumos Veterinarios', null],
    [14, 1, 'EMP', 'Empaques y Embalajes', null]
  ];
  
  for (const g of grupos) {
    await pool.query('INSERT INTO inv_grupos (id_grupo, id_tenant, codigo, nombre, descripcion) VALUES (?, ?, ?, ?, ?)', g);
  }
  
  // Recrear Subgrupos
  const subgrupos = [
    [1, 1, 1, 'FERT01', 'Fertilizantes Edáficos', null],
    [2, 1, 1, 'FERT02', 'Foliares', null],
    [3, 1, 1, 'FERT03', 'Herbicidas', null],
    [4, 1, 1, 'FERT04', 'Insecticidas', null],
    [5, 1, 1, 'FITO01', 'Fungicidas', null], // Before it was FERT05 but the code was FITO01... let's just make it FITO01.
    [6, 3, 1, 'HERR01', 'Manuales', null],
    [7, 3, 1, 'HERR02', 'Motorizadas', null],
    [8, 4, 1, 'SEM01', 'Certificadas', null],
    [9, 5, 1, 'COMB01', 'Diesel', null]
  ];
  
  for (const s of subgrupos) {
    await pool.query('INSERT INTO inv_subgrupos (id_subgrupo, id_grupo, id_tenant, codigo, nombre, descripcion) VALUES (?, ?, ?, ?, ?, ?)', s);
  }
  
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  
  console.log('Restaurados los grupos y subgrupos');
  process.exit(0);
}
run();
