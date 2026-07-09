import mysql from 'mysql2/promise';

async function seed() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '12345',
    port: 3307,
    database: 'sas_agricolas'
  });

  try {
    const [estanques] = await pool.query('SELECT * FROM acuicola_estanques WHERE id_tenant = 1 LIMIT 5');
    const [especies] = await pool.query('SELECT * FROM acuicola_especies LIMIT 3');
    
    if(estanques.length === 0 || especies.length === 0) {
        console.log('Faltan estanques o especies.');
        process.exit();
    }

    const [siembrasExistentes] = await pool.query("SELECT * FROM acuicola_siembras WHERE estado = 'Activo'");
    if (siembrasExistentes.length >= 3) {
      console.log('Ya existen siembras activas. No se insertarán más.');
      process.exit();
    }

    let inserted = 0;
    for (let i = 0; i < Math.min(4, estanques.length); i++) {
      const estanque = estanques[i];
      const especie = especies[i % especies.length];
      
      const q = `
        INSERT INTO acuicola_siembras 
        (id_estanque, id_especie_acui, fecha_siembra, cantidad_alevines, peso_promedio_ingreso_g, estado, notas)
        VALUES (?, ?, DATE_SUB(NOW(), INTERVAL 180 DAY), ?, 5, 'Activo', 'Siembra demo de auditoría')
      `;
      const args = [estanque.id_estanque, especie.id_especie_acui, 5000 + (i * 1000)];
      const [res] = await pool.query(q, args);
      console.log('Insertada siembra ID: ' + res.insertId + ' en estanque ' + estanque.codigo);
      inserted++;
    }
    console.log('Insertadas ' + inserted + ' siembras con exito.');
  } catch(e) {
      console.error(e);
  } finally {
      pool.end();
  }
}

seed();
