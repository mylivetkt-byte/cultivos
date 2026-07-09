const mysql = require('mysql2/promise');
(async () => {
  const pool = await mysql.createConnection({
    host: 'localhost', port: 3307, user: 'root', password: '12345', database: 'sas_agricolas'
  });
  const [docDet] = await pool.query(`SHOW TABLES LIKE '%doc%'`);
  console.log('Doc tables:', docDet);
  const [desc] = await pool.query(`DESCRIBE inv_documentos`);
  console.log('Doc Desc:', desc);
  const [desc2] = await pool.query(`DESCRIBE movimientos_inventario`);
  console.log('Mov Desc:', desc2);
  process.exit(0);
})();
