const mysql = require('mysql2/promise');

async function main() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost', user: 'root', password: '12345', database: 'sas_agricolas', port: 3307
    });
  } catch (e) {
    try {
      connection = await mysql.createConnection({
        host: 'localhost', user: 'root', password: '12345', database: 'sas_agricolas', port: 3306
      });
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  }

  try {
    const [tables] = await connection.query("SHOW TABLES;");
    const tableNames = tables.map(t => Object.values(t)[0]);

    const targetTables = [
      'bod_bodegas', 'insumos', 'cosechas', 'cultivos', 'sistemas_riego',
      'riegos_ejecutados', 'plagas_cultivo', 'analisis_suelos', 'rrhh_empleados'
    ];

    for (const tbl of targetTables) {
      if (tableNames.includes(tbl)) {
        console.log(`\n=== Table: ${tbl} ===`);
        const [cols] = await connection.query(`DESCRIBE \`${tbl}\`;`);
        const columns = cols.map(c => ({ Field: c.Field, Type: c.Type }));
        console.log(columns);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

main();
