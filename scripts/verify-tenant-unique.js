import pool from '../server/db.js';

(async () => {
  const [tables] = await pool.query(
    `SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`
  );
  for (const t of tables) {
    const tableName = t.TABLE_NAME;
    const [idx] = await pool.query(
      `SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns
       FROM information_schema.statistics
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND NON_UNIQUE = 0
       GROUP BY INDEX_NAME`,
      [tableName]
    );
    const tenantIndexes = idx.filter(i => i.columns.includes('id_tenant'));
    if (tenantIndexes.length) {
      console.log(`\n=== ${tableName} ===`);
      console.table(tenantIndexes);
    }
  }
  process.exit();
})();