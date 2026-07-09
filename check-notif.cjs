const mysql = require('mysql2/promise');
(async () => {
  const pool = await mysql.createConnection({
    host: 'localhost', port: 3307, user: 'root', password: '12345', database: 'sas_agricolas'
  });
  const [t] = await pool.query(`SHOW TABLES LIKE '%notificaci%'`);
  console.log('Notificaciones tables:', t);
  const [t2] = await pool.query(`SHOW TABLES LIKE '%alerta%'`);
  console.log('Alertas tables:', t2);
  process.exit(0);
})();
