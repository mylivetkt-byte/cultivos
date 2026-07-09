const mysql = require('mysql2/promise');
(async () => {
  const pool = mysql.createPool({host: 'localhost', port: 3307, user: 'root', password: '12345', database: 'sas_agricolas'});
  const [cols] = await pool.query('SHOW COLUMNS FROM lotes');
  console.log('lotes:', cols.map(c=>c.Field).join(', '));
  process.exit();
})();
