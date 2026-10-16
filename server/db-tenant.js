import mysql from 'mysql2/promise';
import pool from './db.js';

const pools = new Map();

const DB_CONFIG = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_TENANT_LIMIT, 10) || 50,
  queueLimit: 0,
  connectTimeout: 5000,
};

export async function getTenantPool(dbName) {
  if (pools.has(dbName)) {
    return pools.get(dbName);
  }

  const tenantPool = mysql.createPool({
    ...DB_CONFIG,
    database: dbName,
  });

  // Verify connection works
  const conn = await tenantPool.getConnection();
  conn.release();

  pools.set(dbName, tenantPool);
  console.log(`[DB-Tenant] Pool created for: ${dbName}`);
  return tenantPool;
}

export async function getTenantPoolById(idTenant) {
  const [rows] = await pool.query(
    'SELECT db_name FROM tenants WHERE id_tenant = ?',
    [idTenant]
  );
  if (rows.length === 0) throw new Error(`Tenant ${idTenant} not found`);
  return getTenantPool(rows[0].db_name);
}

export async function createTenantDatabase(dbName) {
  // Create database
  await pool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  console.log(`[DB-Tenant] Database created: ${dbName}`);

  const tenantPool = await getTenantPool(dbName);
  return tenantPool;
}

export async function executeTenantQuery(dbName, sql, params = []) {
  const tenantPool = await getTenantPool(dbName);
  return tenantPool.query(sql, params);
}

export function invalidatePool(dbName) {
  const tenantPool = pools.get(dbName);
  if (tenantPool) {
    tenantPool.end().catch(() => {});
    pools.delete(dbName);
    console.log(`[DB-Tenant] Pool invalidated: ${dbName}`);
  }
}

export async function tenantDatabaseExists(dbName) {
  const [rows] = await pool.query(
    'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
    [dbName]
  );
  return rows.length > 0;
}
