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

  await conn.query(`CREATE TABLE IF NOT EXISTS costos_operacion (
    id_operacion INT AUTO_INCREMENT PRIMARY KEY,
    id_tenant INT NOT NULL,
    id_finca INT NULL,
    id_lote INT NOT NULL,
    concepto VARCHAR(100) NOT NULL,
    importe DECIMAL(12,2) NOT NULL,
    fecha DATE NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.query('SET FOREIGN_KEY_CHECKS=1');
  await conn.end();
  console.log('costos_operacion creada');
}

main().catch((e) => { console.error(e); process.exit(1); });
