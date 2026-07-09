import pool from './server/db.js';

async function migrate() {
  try {
    await pool.query(`UPDATE rrhh_empleados e JOIN terceros t ON e.id_tercero = t.id_tercero SET e.documento = t.documento, e.nombres = t.nombre_completo, e.apellidos = ''`);
    console.log('Migrated data successfully');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

migrate();
