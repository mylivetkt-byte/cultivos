const fetch = require('node-fetch');
const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  
  try {
    console.log("Descargando municipios...");
    const res = await fetch('https://raw.githubusercontent.com/marcovega/colombia-json/master/colombia.json');
    const data = await res.json();
    
    let values = [];
    let deptCounter = 1;
    for (const d of data) {
      let deptoCod = String(deptCounter).padStart(2, '0');
      let muniCounter = 1;
      for (const city of d.ciudades) {
        let cityCod = String(muniCounter).padStart(3, '0');
        let daneCode = deptoCod + cityCod;
        values.push([daneCode, d.departamento, city]);
        muniCounter++;
      }
      deptCounter++;
    }
    
    if (values.length > 0) {
      await pool.query('SET FOREIGN_KEY_CHECKS = 0');
      await pool.query('TRUNCATE TABLE gen_municipios');
      const chunkSize = 100;
      for (let i = 0; i < values.length; i += chunkSize) {
        const chunk = values.slice(i, i + chunkSize);
        await pool.query('INSERT IGNORE INTO gen_municipios (codigo_dane, departamento, municipio) VALUES ?', [chunk]);
      }
      await pool.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log(`Se guardaron ${values.length} municipios exitosamente.`);
    } else {
      console.log("No se encontraron datos válidos.");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}
run();
