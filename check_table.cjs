const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas'
  });

  const [rows] = await connection.query('DESCRIBE rrhh_conceptos_nomina;');
  console.log('rrhh_conceptos_nomina:', rows);

  const [rows3] = await connection.query('DESCRIBE rrhh_empleados;');
  console.log('rrhh_empleados:', rows3);

  const [rows4] = await connection.query('DESCRIBE labores_diarias;');
  console.log('labores_diarias:', rows4);

  await connection.end();
}

run();
