import pool from '../server/db.js';

(async () => {
  const [tables] = await pool.query(
    `SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`
  );
  
  const withoutTenant = [];
  const withTenant = [];
  
  for (const t of tables) {
    const tableName = t.TABLE_NAME;
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.columns WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tableName]
    );
    const colNames = cols.map(c => c.COLUMN_NAME);
    if (colNames.includes('id_tenant')) {
      withTenant.push(tableName);
    } else {
      withoutTenant.push({ tableName, columns: colNames });
    }
  }
  
  console.log('=== TABLAS CON id_tenant ===');
  console.log(withTenant.length);
  console.log(withTenant.join(', '));
  
  console.log('\n=== TABLAS SIN id_tenant ===');
  console.log(withoutTenant.length);
  for (const t of withoutTenant) {
    console.log(`\n${t.tableName}:`);
    console.log(t.columns.join(', '));
  }
  
  process.exit();
})();