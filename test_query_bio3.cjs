require('dotenv').config();
const pool = require('./server/db.js').default;
async function run() {
  try {
    const [rows] = await pool.query('SELECT id_insumo, codigo, nombre, origen FROM insumos WHERE nombre LIKE "%melaza%" OR nombre LIKE "%organic%" OR nombre LIKE "%biol%"');
    console.log(rows);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
