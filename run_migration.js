import 'dotenv/config';
import pool from './server/db.js';
import fs from 'fs';
const sql = fs.readFileSync('./server/migrations/20241020_aplicaciones.sql','utf8');
(async()=>{
  const conn = await pool.getConnection();
  try {
    await conn.query(sql);
    console.log('Migration executed');
  } catch(e){
    console.error('Migration error', e.message);
  } finally {
    await conn.release();
  }
})();
