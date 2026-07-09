const mysql = require('mysql2/promise');
(async () => {
  const pool = mysql.createPool({host: 'localhost', port: 3307, user: 'root', password: '12345', database: 'sas_agricolas'});
  const [cols] = await pool.query('SHOW COLUMNS FROM contab_comprobantes');
  console.log('contab_comprobantes:', cols.map(c=>c.Field).join(', '));
  const [cols2] = await pool.query('SHOW COLUMNS FROM contab_documentos');
  console.log('contab_documentos:', cols2.map(c=>c.Field).join(', '));
  const [cols3] = await pool.query('SHOW COLUMNS FROM contab_detalles');
  console.log('contab_detalles:', cols3.map(c=>c.Field).join(', '));
  const [cols4] = await pool.query('SHOW COLUMNS FROM fincas');
  console.log('fincas:', cols4.map(c=>c.Field).join(', '));
  process.exit();
})();
