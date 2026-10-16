// Inspeccion de esquema (SOLO LECTURA) para revisar el diseno del modulo
// Produccion y Agroindustrializacion. NO modifica nada.
// Uso:  node scripts/inspect_schema.cjs
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const TARGETS = [
  'lotes',
  'cultivos',
  'siembras',
  'fincas',
];

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'sas_agricolas',
  });
  const db = (await conn.query('SELECT DATABASE() AS db'))[0][0].db;
  console.log(`==== Esquema de BD: ${db} (SOLO LECTURA) ====`);

  for (const t of TARGETS) {
    try {
      const [cols] = await conn.query(`SHOW COLUMNS FROM \`${t}\``);
      console.log(`\n### ${t}`);
      console.log('Campo | Tipo | Nulo | Key | Def');
      cols.forEach((c) => console.log(`${c.Field} | ${c.Type} | ${c.Null} | ${c.Key} | ${c.Default}`));
    } catch (e) {
      console.log(`\n### ${t} -> NO EXISTE: ${e.message}`);
    }
  }

  // Relaciones (FK) de interes
  try {
    const [fks] = await conn.query(
      `SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
         AND TABLE_NAME IN ('fincas','insumos','inv_documentos_detalle','movimientos_inventario','contab_detalles')
       ORDER BY TABLE_NAME, COLUMN_NAME`,
      [db]
    );
    if (fks.length) {
      console.log('\n### Relaciones(FK) de interes:');
      fks.forEach((f) => console.log(`  ${f.TABLE_NAME}.${f.COLUMN_NAME} -> ${f.REFERENCED_TABLE_NAME}.${f.REFERENCED_COLUMN_NAME}`));
    }
  } catch (e) {
    console.log('\n### (no se pudieron leer FKs) ' + e.message);
  }

  // Tenants (para saber en que DBs se deben aplicar las migraciones)
  try {
    const [tenants] = await conn.query('SELECT id, db_name, nombre_comercial FROM tenants LIMIT 50');
    if (tenants.length) {
      console.log('\n### Tenants (DBs objetivo de migracion):');
      tenants.forEach((t) => console.log(`  id=${t.id}  db=${t.db_name}  ${t.nombre_comercial || ''}`));
    }
  } catch (e) {
    console.log('\n### (tabla tenants no disponible en esta BD) ' + e.message);
  }

  await conn.end();
  console.log('\n==== Fin (no se modifico nada) ====');
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});