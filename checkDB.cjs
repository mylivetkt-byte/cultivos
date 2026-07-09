const db = require('./server/db.js');
async function checkDB() {
  const tables = ['app_recetas', 'insumos', 'app_preparaciones_mezcla', 'app_produccion_organica', 'app_programacion', 'app_ejecucion'];
  for (const table of tables) {
    try {
      const [rows] = await db.query(`SELECT count(*) as c FROM ${table}`);
      console.log(`Table ${table} exists. Row count: ${rows[0].c}`);
    } catch(e) {
      console.log(`Table ${table} does NOT exist or error: ${e.message}`);
    }
  }
  process.exit(0);
}
checkDB();
