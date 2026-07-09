import pool from '../server/db.js';

async function getTablesWithTenant() {
  const [tables] = await pool.query(
    `SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE()`
  );
  const result = [];
  for (const t of tables) {
    const tableName = t.TABLE_NAME;
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.columns WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tableName]
    );
    const colNames = cols.map(c => c.COLUMN_NAME);
    if (colNames.includes('id_tenant')) {
      result.push({ tableName, columns: colNames });
    }
  }
  return result;
}

async function addUniqueIfMissing(tableName, column, tenantCol = 'id_tenant') {
  // Check if unique index already exists on (tenantCol, column)
  const [idx] = await pool.query(
    `SELECT INDEX_NAME FROM information_schema.statistics
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND NON_UNIQUE = 0
     GROUP BY INDEX_NAME
     HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) = ?`,
    [tableName, [tenantCol, column].join(',')]
  );
  if (idx.length) {
    console.log(`✅ ${tableName}: UNIQUE (${tenantCol}, ${column}) already exists`);
    return;
  }
  // Check if column exists
  const [col] = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, column]
  );
  if (!col.length) {
    console.log(`⚠️ ${tableName}: column ${column} not found`);
    return;
  }
  const indexName = `uq_${tableName}_${column}_tenant`;
  const sql = `ALTER TABLE \`${tableName}\` ADD CONSTRAINT \`${indexName}\` UNIQUE (\`${tenantCol}\`, \`${column}\`);`;
  try {
    await pool.execute(sql);
    console.log(`✅ ${tableName}: Added UNIQUE (${tenantCol}, ${column})`);
  } catch (e) {
    console.error(`❌ ${tableName}: Failed to add UNIQUE (${tenantCol}, ${column}):`, e.message);
  }
}

(async () => {
  try {
    const tables = await getTablesWithTenant();
    console.log(`Found ${tables.length} tables with id_tenant`);
    
    for (const { tableName, columns } of tables) {
      // Common unique-per-tenant columns
      const candidates = ['codigo', 'nombre', 'placa', 'documento', 'nit', 'email', 'username', 'codigo_tenant'];
      for (const col of candidates) {
        if (columns.includes(col)) {
          await addUniqueIfMissing(tableName, col);
        }
      }
      // Also check for columns starting with 'codigo_' or 'nombre_'
      for (const col of columns) {
        if ((col.startsWith('codigo_') || col.startsWith('nombre_')) && !candidates.includes(col)) {
          await addUniqueIfMissing(tableName, col);
        }
      }
    }
    console.log('Done');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();