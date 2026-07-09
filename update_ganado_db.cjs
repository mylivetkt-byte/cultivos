const mysql = require('mysql2/promise');

async function run() {
  const c = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas'
  });

  try {
    await c.query('ALTER TABLE ganado_animales ADD COLUMN id_potrero INT NULL, ADD COLUMN collar_gps_id VARCHAR(100) NULL');
    console.log('ganado_animales alterada.');
  } catch(e) {
    console.log('Columna ya existe o error:', e.message);
  }

  try {
    await c.query(`CREATE TABLE IF NOT EXISTS ganado_labores_potrero (
      id_labor INT AUTO_INCREMENT PRIMARY KEY,
      id_potrero INT NOT NULL,
      labor VARCHAR(100) NOT NULL,
      insumo_aplicado VARCHAR(150),
      cantidad DECIMAL(10,2),
      fecha DATE NOT NULL,
      responsable VARCHAR(100)
    )`);
    console.log('Tabla ganado_labores_potrero creada.');
  } catch(e) {
    console.log(e);
  }

  c.end();
}

run();
