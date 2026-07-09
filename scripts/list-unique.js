import pool from '../server/db.js';
(async () => {
  const tables = ['fincas', 'nucleos'];
  for (const t of tables) {
    const [idx] = await pool.query(
      `SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns
       FROM information_schema.statistics
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND NON_UNIQUE = 0
       GROUP BY INDEX_NAME`,
      [t]
    );
    console.log('\n===', t, '===');
    console.table(idx);
  }
  process.exit();
})();