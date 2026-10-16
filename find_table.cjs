const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: process.env.MYSQL_PORT || 3307,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sas_agricolas'
    });

    const [tables] = await pool.query("SHOW TABLES LIKE '%catalogo%'");
    console.log('Tables:', tables);

    // Get columns for any table that matches
    for (const row of tables) {
      const tableName = Object.values(row)[0];
      const [cols] = await pool.query(`SHOW COLUMNS FROM ${tableName}`);
      console.log(`Columns for ${tableName}:`, cols.map(c => c.Field).join(', '));
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
