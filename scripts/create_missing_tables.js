import mysql from 'mysql2/promise';
import 'dotenv/config';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT) || 3307,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'sas_agricolas',
});

async function createMissingTables() {
  const conn = await pool.getConnection();

  // 1️⃣ Tabla `inv_documentos_detalle` (si no existe)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS inv_documentos_detalle (
      id_detalle INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      id_documento INT NOT NULL,
      id_insumo INT NOT NULL,
      cantidad DECIMAL(14,4) NOT NULL,
      costo_unitario DECIMAL(14,4) NOT NULL,
      lote VARCHAR(60) NOT NULL,
      fecha_vencimiento DATE NULL,
      PRIMARY KEY (id_detalle),
      KEY idx_detalle_doc (id_documento),
      KEY idx_detalle_insumo (id_insumo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Detalle de documentos de inventario';
  `);

  // 2️⃣ Tabla `tenants` (si no existe)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      db_name VARCHAR(120) NOT NULL,
      nombre_comercial VARCHAR(120),
      activo BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('✅ Tablas creadas/verificadas si ya existen');
  await conn.end();
}

createMissingTables().catch(err => {
  console.error('❌ Error al crear tablas:', err.message);
  process.exit(1);
});