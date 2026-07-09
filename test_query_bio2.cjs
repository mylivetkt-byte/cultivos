require('dotenv').config();
const pool = require('./server/db.js').default;
async function run() {
  const [rows] = await pool.query('SELECT id_insumo, codigo, nombre, origen, tipo_insumo FROM insumos WHERE nombre LIKE "%viol%"');
  console.log('violes:', rows);
  process.exit(0);
}
run();
