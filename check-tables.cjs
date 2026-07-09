const mysql = require('mysql2/promise');
(async () => {
  const pool = await mysql.createConnection({
    host: 'localhost', port: 3307, user: 'root', password: '12345', database: 'sas_agricolas'
  });
  const [t] = await pool.query(`SHOW TABLES LIKE '%pedidos%'`);
  console.log('Pedidos:', t);
  const [t2] = await pool.query(`SHOW TABLES LIKE '%repuestos%'`);
  console.log('Repuestos:', t2);
  process.exit(0);
})();
