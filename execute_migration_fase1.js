import 'dotenv/config';
import pool from './server/db.js';
import fs from 'fs';

const sqlPath = './server/migrations/20261016_fase1_suelos_muestreo.sql';
const sql = fs.readFileSync(sqlPath, 'utf8');

(async () => {
  const conn = await pool.getConnection();
  try {
    console.log('Running migration Fase 1...');
    // Split statements by semicolon and run each
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      await conn.query(stmt);
    }
    console.log('✅ Migración Fase 1 ejecutada exitosamente.');
  } catch (err) {
    console.error('❌ Error ejecutando migración:', err);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
})();
