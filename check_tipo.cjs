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

    const [cols] = await pool.query("SHOW COLUMNS FROM cultivos LIKE 'tipo'");
    console.log(cols);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
