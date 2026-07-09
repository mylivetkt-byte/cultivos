const mysql = require('mysql2/promise');
(async () => {
  const pool = await mysql.createConnection({
    host: 'localhost', port: 3307, user: 'root', password: '12345', database: 'sas_agricolas'
  });
  const [t] = await pool.query(`SHOW TABLES LIKE '%kardex%'`);
  console.log('Kardex tables:', t);
  const [t2] = await pool.query(`SHOW TABLES LIKE '%movimientos_inventario%'`);
  console.log('Movimientos tables:', t2);
  const [desc] = await pool.query(`DESCRIBE movimientos_inventario`);
  console.log('Movimientos Desc:', desc);
  process.exit(0);
})();
