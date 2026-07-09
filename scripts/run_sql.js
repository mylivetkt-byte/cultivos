// run_sql.js
// Simple script to execute an SQL file using mysql2/promise.
// Usage: node scripts/run_sql.js <path-to-sql-file>

import fs from 'fs';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('Usage: node run_sql.js <sql-file>');
  process.exit(1);
}

const sqlPath = path.isAbsolute(sqlFile) ? sqlFile : path.join(__dirname, '..', sqlFile);

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: parseInt(process.env.MYSQL_PORT || '3307', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '12345',
      database: process.env.MYSQL_DATABASE || 'sas_agricolas',
      multipleStatements: true,
    });
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await connection.query(sql);
    console.log('✅ Migration applied:', sqlPath);
    await connection.end();
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
})();
