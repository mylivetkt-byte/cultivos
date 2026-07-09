const mysql = require('mysql2/promise');
(async () => {
  const pool = await mysql.createConnection({
    host: 'localhost', port: 3307, user: 'root', password: '12345', database: 'sas_agricolas'
  });
  try {
    await pool.query(`ALTER TABLE unidades_medida COMMENT = 'Inv Unidades'`);
    console.log('Updated unidades_medida');
  } catch (e) {
    console.log('Error', e.message);
  }
  process.exit(0);
})();
