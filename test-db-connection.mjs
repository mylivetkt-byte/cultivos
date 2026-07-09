// test-db-connection.mjs
import pool from './server/db.js';

(async () => {
  try {
    const [rows] = await pool.query('SELECT 1 AS test');
    console.log('✅ DB connection successful:', rows);
  } catch (err) {
    console.error('❌ DB connection failed:', err.message);
  } finally {
    await pool.end();
  }
})();
