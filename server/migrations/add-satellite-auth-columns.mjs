import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '12345',
  database: 'sas_agricolas',
  connectTimeout: 5000,
};

async function runMigration() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('[Migration] Conectado a la base de datos.');

    // MySQL does not support IF NOT EXISTS for ADD COLUMN,
    // so we check information_schema first for each column.
    const columnsToAdd = [
      { name: 'email', definition: "VARCHAR(255) DEFAULT NULL" },
      { name: 'token_type', definition: "VARCHAR(10) DEFAULT 'mock'" },
      { name: 'access_token', definition: "TEXT DEFAULT NULL" },
      { name: 'access_token_expires', definition: "DATETIME DEFAULT NULL" },
    ];

    for (const col of columnsToAdd) {
      const [rows] = await connection.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sat_api_conexiones' AND COLUMN_NAME = ?`,
        [config.database, col.name]
      );

      if (rows.length === 0) {
        const sql = `ALTER TABLE sat_api_conexiones ADD COLUMN ${col.name} ${col.definition}`;
        await connection.query(sql);
        console.log(`[Migration] Columna '${col.name}' agregada exitosamente.`);
      } else {
        console.log(`[Migration] Columna '${col.name}' ya existe, omitiendo.`);
      }
    }

    console.log('[Migration] Migración completada exitosamente.');
  } catch (err) {
    console.error('[Migration] Error durante la migración:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runMigration();
