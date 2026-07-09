const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas'
  });

  try {
    console.log('Agregando campos a la tabla empleados...');
    const queries = [
      "ALTER TABLE empleados ADD COLUMN documento_identidad VARCHAR(50) DEFAULT NULL;",
      "ALTER TABLE empleados ADD COLUMN nombres VARCHAR(100) DEFAULT NULL;",
      "ALTER TABLE empleados ADD COLUMN apellidos VARCHAR(100) DEFAULT NULL;",
      "ALTER TABLE empleados ADD COLUMN fecha_nacimiento DATE DEFAULT NULL;",
      "ALTER TABLE empleados ADD COLUMN sexo ENUM('Masculino', 'Femenino', 'Otro') DEFAULT NULL;",
      "ALTER TABLE empleados ADD COLUMN direccion_residencia VARCHAR(255) DEFAULT NULL;",
      "ALTER TABLE empleados ADD COLUMN telefonos VARCHAR(100) DEFAULT NULL;",
      "ALTER TABLE empleados ADD COLUMN correo_electronico VARCHAR(100) DEFAULT NULL;",
      "ALTER TABLE empleados ADD COLUMN fotografia LONGTEXT DEFAULT NULL;",
      "ALTER TABLE empleados ADD COLUMN estudios VARCHAR(255) DEFAULT NULL;",
      "ALTER TABLE empleados ADD COLUMN especialidad_agricola VARCHAR(255) DEFAULT NULL;"
    ];

    for (let q of queries) {
      try {
        await pool.query(q);
        console.log('Ejecutado:', q.split('ADD COLUMN ')[1]);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log('El campo ya existe:', q.split('ADD COLUMN ')[1].split(' ')[0]);
        } else {
          throw e;
        }
      }
    }

    // Also try adding them to rrhh_empleados just in case, since there are two tables
    console.log('Agregando campos a la tabla rrhh_empleados (por si acaso)...');
    const queriesRrhh = [
      "ALTER TABLE rrhh_empleados ADD COLUMN fecha_nacimiento DATE DEFAULT NULL;",
      "ALTER TABLE rrhh_empleados ADD COLUMN sexo ENUM('Masculino', 'Femenino', 'Otro') DEFAULT NULL;",
      "ALTER TABLE rrhh_empleados ADD COLUMN direccion_residencia VARCHAR(255) DEFAULT NULL;",
      "ALTER TABLE rrhh_empleados ADD COLUMN telefonos VARCHAR(100) DEFAULT NULL;",
      "ALTER TABLE rrhh_empleados ADD COLUMN correo_electronico VARCHAR(100) DEFAULT NULL;",
      "ALTER TABLE rrhh_empleados ADD COLUMN fotografia LONGTEXT DEFAULT NULL;",
      "ALTER TABLE rrhh_empleados ADD COLUMN estudios VARCHAR(255) DEFAULT NULL;",
      "ALTER TABLE rrhh_empleados ADD COLUMN especialidad_agricola VARCHAR(255) DEFAULT NULL;"
    ];

    for (let q of queriesRrhh) {
      try {
        await pool.query(q);
        console.log('Ejecutado en rrhh_empleados:', q.split('ADD COLUMN ')[1]);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          // Ya existe
        } else {
          throw e;
        }
      }
    }

    console.log('Listo.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
