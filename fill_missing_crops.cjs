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

    // Update Mucuna Bracteata (ID 8)
    await pool.query(`
      UPDATE cultivos 
      SET 
        tipo = 'Leguminosa', 
        temperatura_optima_min = '22.0', 
        temperatura_optima_max = '32.0', 
        precipitacion_optima_mm = '2000.00',
        altitud_optima_min = '0.00',
        altitud_optima_max = '1500.00',
        ph_optimo_min = '4.5',
        ph_optimo_max = '7.5'
      WHERE id_cultivo = 8
    `);

    // Update Mucuna pruriens (ID 44)
    await pool.query(`
      UPDATE cultivos 
      SET 
        tipo = 'Leguminosa', 
        temperatura_optima_min = '15.0', 
        temperatura_optima_max = '30.0', 
        precipitacion_optima_mm = '1500.00',
        altitud_optima_min = '0.00',
        altitud_optima_max = '1500.00',
        ph_optimo_min = '5.0',
        ph_optimo_max = '7.5'
      WHERE id_cultivo = 44
    `);

    console.log('Missing data filled successfully.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
