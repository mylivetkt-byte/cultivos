const mysql = require('C:/sas-app/node_modules/mysql2/promise');

(async () => {
  const config = {
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas',
  };
  const conn = await mysql.createConnection(config);
  console.log('✅ Connected to DB');

  // rrhh_permisos - add columns email and tipo_permiso if they don't exist
  // Add missing columns to rrhh_permisos if they do not exist
  const [emailExists] = await conn.query(`SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${config.database}' AND TABLE_NAME = 'rrhh_permisos' AND COLUMN_NAME = 'email'`);
  if (!emailExists[0].cnt) {
    await conn.query(`ALTER TABLE rrhh_permisos ADD COLUMN email VARCHAR(255) DEFAULT NULL`);
  }
  const [tipoExists] = await conn.query(`SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${config.database}' AND TABLE_NAME = 'rrhh_permisos' AND COLUMN_NAME = 'tipo_permiso'`);
  if (!tipoExists[0].cnt) {
    await conn.query(`ALTER TABLE rrhh_permisos ADD COLUMN tipo_permiso VARCHAR(50) DEFAULT NULL`);
  }

  console.log('✅ Missing columns added / verified for rrhh_permisos');
  await conn.end();
})();
