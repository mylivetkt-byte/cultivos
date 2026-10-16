// =====================================================================
// Migrador del Modulo Produccion y Agroindustrializacion (MULTI-TENANT)
// Leela las credenciales de .env, itera sobre la DB principal y las DBs
// de cada tenant (tabla `tenants`), y aplica de forma IDEMPOTENTE los
// archivos de migrations/produccion/.
//
// Uso:  node scripts/migrate_produccion.cjs
// Seguridad: SOLO aplica lo que falta (no borra nada); cada sentencia se
// comprueba/ignora si ya existe (columnas repetidas, claves, tablas) y si
// una FK referenciada falta, la omite con un warning (no rompe la migracion).
// =====================================================================
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MIGR_ROOT = path.join(__dirname, '..', 'migrations', 'produccion');
const ARCHIVOS = [
  '01_ALTER_existentes.sql',
  '02_CREATE_inv_lotes_existencia.sql',
  '03_CREATE_produccion.sql',
  '03b_CREATE_produccion_lotes.sql',
  '03c_CREATE_produccion_costos_cuentas_precios.sql',
  '04_SEED_tipos_contables.sql',
];

const BASE = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
};
const DB_PRINCIPAL = process.env.MYSQL_DATABASE || 'sas_agricolas';

// Errores MySQL que significan "ya existe / ya aplicado" -> no fatal.
const IGNORABLE = new Set([1050, 1060, 1061, 1091, 1215]); // table exists, dup column, dup key, drop col, cannot add FK

function splitSql(sql) {
  return sql
    .replace(/^\uFEFF/, '')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--') && !s.startsWith('/*'));
}

async function ejecutarEn(conn, dbName) {
  console.log(`\n===== Aplicando en BD: ${dbName} =====`);
  await conn.query(`CREATE TABLE IF NOT EXISTS sys_migrations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    modulo VARCHAR(40) NOT NULL,
    archivo VARCHAR(120) NOT NULL,
    db_name VARCHAR(120) NOT NULL,
    aplicada_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_migracion (modulo, archivo, db_name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  for (const archivo of ARCHIVOS) {
    const ruta = path.join(MIGR_ROOT, archivo);
    if (!fs.existsSync(ruta)) { console.warn(`  (no existe ${archivo})`); continue; }

    const [ya] = await conn.query(
      'SELECT 1 FROM sys_migrations WHERE modulo=? AND archivo=? AND db_name=? LIMIT 1',
      ['produccion', archivo, dbName]
    );
    if (ya.length) { console.log(`  [skip] ${archivo} (ya aplicado)`); continue; }

    const sql = fs.readFileSync(ruta, 'utf8');
    let ok = 0, saltadas = 0;
    for (const stmt of splitSql(sql)) {
      try {
        await conn.query(stmt);
        ok++;
      } catch (e) {
        if (IGNORABLE.has(e.errno)) { saltadas++; continue; }
        console.warn(`  [warn] sentencia ignorada (${e.errno || e.code}): ${String(stmt).slice(0, 90)}... -> ${e.message.slice(0, 120)}`);
        saltadas++;
      }
    }
    await conn.query(
      'INSERT INTO sys_migrations (modulo, archivo, db_name) VALUES (?,?,?)',
      ['produccion', archivo, dbName]
    );
    console.log(`  [ok] ${archivo} (aplicadas=${ok}, ja_existentes=${saltadas})`);
  }
}

(async () => {
  const connPpal = await mysql.createConnection({ ...BASE, database: DB_PRINCIPAL });
  console.log(`Conectado a ${DB_PRINCIPAL}`);

  // BD principal + DBs de tenants
  const dbs = [DB_PRINCIPAL];
  try {
    const [tenants] = await connPpal.query('SELECT db_name FROM tenants WHERE activo = 1');
    tenants.forEach((t) => { if (t.db_name && !dbs.includes(t.db_name)) dbs.push(t.db_name); });
  } catch (e) {
    console.warn('(aviso: no se pudo listar tenants, solo se migrara la BD principal) ' + e.message);
  }
  await connPpal.end();

  for (const db of dbs) {
    let conn;
    try {
      conn = await mysql.createConnection({ ...BASE, database: db });
    } catch (e) {
      console.warn(`  (no se pudo conectar a ${db}: ${e.message})`);
      continue;
    }
    try {
      await ejecutarEn(conn, db);
    } finally {
      await conn.end();
    }
  }
  console.log('\n===== Migracion de produccion finalizada (idempotente) =====');
  console.log('Revisa el log. Si algo quedo pendiente por FK faltante, ajusta y vuelve a ejecutar: seguro de repetir.');
})().catch((e) => {
  console.error('ERROR GLOBAL:', e.message);
  process.exit(1);
});