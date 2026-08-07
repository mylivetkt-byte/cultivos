const mysql = require('mysql2/promise');

async function testQuery() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas'
  });

  try {
    const query = `
      SELECT c.*, f.nombre as finca_nombre, 
             GROUP_CONCAT(CONCAT(e.nombres, ' ', e.apellidos) SEPARATOR ', ') as empleados_nombres
      FROM rrhh_cuadrillas c 
      LEFT JOIN fincas f ON c.id_finca = f.id_finca 
      LEFT JOIN rrhh_empleados e ON c.id_cuadrilla = e.id_cuadrilla
      WHERE c.id_tenant = ? 
      GROUP BY c.id_cuadrilla
      ORDER BY c.estado ASC, c.nombre ASC
    `;
    const [rows] = await connection.query(query, [1]);
    console.log('Query result length:', rows.length);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

testQuery();
