import mysql from 'C:/sas-app/node_modules/mysql2/promise.js';

(async () => {
  const config = {
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas'
  };
  const conn = await mysql.createConnection(config);
  console.log('✅ Connected to DB');

  // rrhh_conceptos_nomina -> add column valor
  await conn.query(`ALTER TABLE rrhh_conceptos_nomina ADD COLUMN IF NOT EXISTS valor DECIMAL(12,2) DEFAULT 0`);

  // rrhh_planillas_consolidadas -> add column fecha
  await conn.query(`ALTER TABLE rrhh_planillas_consolidadas ADD COLUMN IF NOT EXISTS fecha DATE`);

  // rrhh_planillas_detalle -> add columns id_concepto, monto
  await conn.query(`ALTER TABLE rrhh_planillas_detalle ADD COLUMN IF NOT EXISTS id_concepto INT`);
  await conn.query(`ALTER TABLE rrhh_planillas_detalle ADD COLUMN IF NOT EXISTS monto DECIMAL(12,2) DEFAULT 0`);

  // rrhh_control_asistencia -> add primary key id_control
  await conn.query(`ALTER TABLE rrhh_control_asistencia ADD COLUMN IF NOT EXISTS id_control INT AUTO_INCREMENT PRIMARY KEY`);

  console.log('✅ Missing columns added / verified');
  await conn.end();
})();
