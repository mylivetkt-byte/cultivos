import mysql from 'mysql2/promise';
async function fix() {
  const pool = mysql.createPool({ host: '127.0.0.1', port: 3307, user: 'root', password: '12345', database: 'sas_agricolas' });
  await pool.query("UPDATE tenants SET db_name = 'sas_agricolas' WHERE id_tenant = 1");
  console.log('Fixed tenant db_name');
  process.exit(0);
}
fix();
