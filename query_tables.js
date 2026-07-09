import 'dotenv/config';
import pool from './server/db.js';
async function checkDB() {
  const tables = ['app_recetas', 'insumos', 'app_preparaciones_mezcla', 'app_produccion_organica', 'app_programacion', 'app_ejecucion', 'app_aplicaciones_diarias'];
  for (const table of tables) {
    try {
      const [rows] = await pool.query(`SELECT count(*) as c FROM ${table}`);
      console.log(`Table ${table} exists. Row count: ${rows[0].c}`);
    } catch(e) {
      console.log(`Table ${table} does NOT exist or error: ${e.message}`);
    }
  }
  process.exit(0);
}
checkDB();
