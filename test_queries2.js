import mysql from 'mysql2/promise';

async function testQueries() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '12345',
    port: 3307,
    database: 'sas_agricolas'
  });

  try {
    const [rows] = await pool.query(`
      SELECT s.id_siembra_acui, s.id_estanque, est.codigo as estanque_codigo, est.id_finca, f.nombre as finca_nombre, s.id_especie_acui as id_especie, e.nombre as especie_nombre, s.fecha_siembra, s.cantidad_alevines 
      FROM acuicola_siembras s 
      JOIN acuicola_estanques est ON s.id_estanque = est.id_estanque 
      JOIN fincas f ON est.id_finca = f.id_finca 
      JOIN acuicola_especies e ON s.id_especie_acui = e.id_especie_acui 
      WHERE s.estado = 'Activo' AND (? IS NULL OR est.id_tenant = ?)
    `, [1, 1]);
    console.log('SIEMBRAS SUCCESS', rows.length);
  } catch(e) {
    console.error('SIEMBRAS ERROR:', e);
  }
  
  try {
    const [lotes] = await pool.query(`
      SELECT l.*, est.codigo as estanque_codigo, e.nombre as especie_nombre 
      FROM acuicola_lotes_cosecha l 
      JOIN acuicola_estanques est ON l.id_estanque = est.id_estanque 
      JOIN acuicola_especies e ON l.id_especie = e.id_especie_acui 
      WHERE l.estado = 'En Progreso' AND (? IS NULL OR l.id_tenant = ?)
    `, [1, 1]);
    console.log('LOTES SUCCESS', lotes.length);
  } catch(e) {
    console.error('LOTES ERROR:', e);
  }
  
  process.exit();
}

testQueries();
