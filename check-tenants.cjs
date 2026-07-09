const mysql = require('mysql2/promise');

async function main() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '12345',
      database: 'sas_agricolas',
      port: 3307
    });
  } catch (e) {
    try {
      connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '12345',
        database: 'sas_agricolas',
        port: 3306
      });
    } catch (err) {
      console.error('Could not connect to database:', err);
      process.exit(1);
    }
  }

  try {
    const [tables] = await connection.query("SHOW TABLES;");
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log('All tables:', tableNames);

    const coreTables = ['tenants', 'usuarios', 'sedes', 'fincas', 'nucleos'];
    for (const tbl of coreTables) {
      if (tableNames.includes(tbl)) {
        console.log(`\n--- DESCRIBE ${tbl} ---`);
        const [cols] = await connection.query(`DESCRIBE \`${tbl}\`;`);
        console.log(cols.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key })));
      } else {
        console.log(`\nTable ${tbl} does not exist.`);
      }
    }
  } catch (err) {
    console.error('Error querying schema:', err);
  } finally {
    await connection.end();
  }
}

main();
