import mysql from 'mysql2/promise';

const DB = {
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '12345',
  database: 'sas_agricolas',
};

async function main() {
  const conn = await mysql.createConnection(DB);
  await conn.query('SET FOREIGN_KEY_CHECKS=0');

  await conn.query(`CREATE TABLE IF NOT EXISTS app_preparaciones_mezcla (
    id_preparacion INT AUTO_INCREMENT PRIMARY KEY,
    id_tenant INT NOT NULL,
    id_receta INT NOT NULL,
    lote_id INT NOT NULL,
    fecha_preparacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    producto VARCHAR(100) NOT NULL,
    cantidad_litros DECIMAL(10,2) NOT NULL,
    costo DECIMAL(12,2) NOT NULL,
    INDEX idx_tenant_receta (id_tenant, id_receta)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.query(`CREATE TABLE IF NOT EXISTS app_produccion_organica (
    id_produccion INT AUTO_INCREMENT PRIMARY KEY,
    id_tenant INT NOT NULL,
    lote_id INT NOT NULL,
    fecha_produccion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    producto VARCHAR(100) NOT NULL,
    cantidad_litros DECIMAL(10,2) NOT NULL,
    costo_materiales DECIMAL(12,2) NOT NULL,
    costo_jornales DECIMAL(12,2) NOT NULL,
    INDEX idx_tenant_lote (id_tenant, lote_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.query('SET FOREIGN_KEY_CHECKS=1');
  await conn.end();
  console.log('tablas creadas');
}

main().catch((e) => { console.error(e); process.exit(1); });
