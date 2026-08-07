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
      SELECT c.*, f.nombre as finca_nombre 
      FROM rrhh_cuadrillas c 
      LEFT JOIN fincas f ON c.id_finca = f.id_finca 
      WHERE c.id_tenant = ? 
      ORDER BY c.estado ASC, c.nombre ASC
    `;
    const [rows] = await connection.query(query, [1]);
    console.log('Query result:', rows.length, 'rows');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

testQuery();
