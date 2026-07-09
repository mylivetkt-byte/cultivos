const mysql = require('mysql2/promise');
(async () => {
  const pool = await mysql.createConnection({
    host: 'localhost', port: 3307, user: 'root', password: '12345', database: 'sas_agricolas'
  });
  const [fincas] = await pool.query(`SELECT * FROM fincas`);
  console.log('Fincas:', fincas);
  const [bodegas] = await pool.query(`SELECT * FROM bod_bodegas`);
  console.log('Bodegas:', bodegas);
  const [insumos] = await pool.query(`SELECT * FROM insumos LIMIT 3`);
  console.log('Insumos:', insumos);
  process.exit(0);
})();
