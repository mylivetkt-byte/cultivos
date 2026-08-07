const mysql = require('mysql2/promise');

async function run() {
  try {
    console.log('Fetching municipalities from gdxc-w37w...');
    const response = await fetch('https://www.datos.gov.co/resource/gdxc-w37w.json?$limit=5000');
    const json = await response.json();
    console.log(`Fetched ${json.length} municipalities`);
    
    if (Array.isArray(json) && json.length > 0) {
      console.log('Sample record:', json[0]);
      
      const c = await mysql.createConnection({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
      await c.query('TRUNCATE TABLE sys_municipios_dian');
      
      let inserted = 0;
      for (const item of json) {
        // Field names might vary, trying common ones
        const depto = item.dpto || item.departamento;
        const mun = item.nom_mpio || item.municipio;
        const codDane = item.cod_mpio || item.c_digo_dane_del_municipio || '';
        
        if (depto && mun) {
          await c.query('INSERT IGNORE INTO sys_municipios_dian (codigo_dane, departamento, municipio, activo) VALUES (?, ?, ?, 1)', [codDane, depto.toUpperCase(), mun.toUpperCase()]);
          inserted++;
        }
      }
      
      console.log(`Inserted ${inserted} municipalities`);
      c.end();
    } else {
      console.error('Response is not an array or is empty:', json);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
