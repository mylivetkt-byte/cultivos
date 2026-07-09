const mysql = require('mysql2/promise');

async function runMigration() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas'
  });

  try {
    console.log('Agregando cuadrilla_nombre a empleados...');
    try {
      await pool.query('ALTER TABLE empleados ADD COLUMN cuadrilla_nombre VARCHAR(255) DEFAULT NULL;');
      console.log('OK - cuadrilla_nombre');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('cuadrilla_nombre ya existe');
      else throw e;
    }

    console.log('Agregando evidencia_foto y firma_digital a labores_diarias...');
    try {
      await pool.query('ALTER TABLE labores_diarias ADD COLUMN evidencia_foto LONGTEXT DEFAULT NULL;');
      console.log('OK - evidencia_foto');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('evidencia_foto ya existe');
      else throw e;
    }

    try {
      await pool.query('ALTER TABLE labores_diarias ADD COLUMN firma_digital LONGTEXT DEFAULT NULL;');
      console.log('OK - firma_digital');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('firma_digital ya existe');
      else throw e;
    }

    console.log('Migración completada exitosamente.');
  } catch (err) {
    console.error('Error durante la migración:', err);
  } finally {
    await pool.end();
  }
}

runMigration();
