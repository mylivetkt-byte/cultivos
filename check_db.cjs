const mysql = require('mysql2/promise');
require('dotenv').config({path: '.env'});

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: process.env.MYSQL_PORT || 3307,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sas_agricolas'
    });

    const [cols] = await pool.query('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = "com_empresas_transportadoras"');
    console.log("COLUMNS:");
    console.log(cols);
    
    const [rows] = await pool.query('SELECT * FROM com_empresas_transportadoras');
    console.log("ROWS COUNT:", rows.length);
    console.log("ROWS DATA:");
    console.log(rows);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
