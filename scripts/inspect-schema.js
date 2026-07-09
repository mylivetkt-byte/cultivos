import pool from '../server/db.js';

(async () => {
  // Get all tables
  const [tables] = await pool.query(
    `SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE()`
  );
  
  for (const t of tables) {
    const tableName = t.TABLE_NAME;
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_KEY, EXTRA
       FROM information_schema.columns
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tableName]
    );
    
    // Check if table has tenant column
    const hasTenant = cols.some(c => 
      c.COLUMN_NAME === 'id_tenant' || 
      c.COLUMN_NAME === 'tenant_id' || 
      c.COLUMN_NAME === 'id_cliente' ||
      c.COLUMN_NAME === 'cliente_id'
    );
    
    if (hasTenant) {
      console.log('\n===', tableName, '===');
      console.table(cols.map(c => ({
        column: c.COLUMN_NAME,
        type: c.COLUMN_TYPE,
        key: c.COLUMN_KEY,
        extra: c.EXTRA
      })));
    }
  }
  process.exit();
})();