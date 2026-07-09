// scripts/migrate-water.js
import pool from '../server/db.js';

const createTableSql = `
CREATE TABLE IF NOT EXISTS water_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_finca INT NOT NULL,
  id_lote INT,
  id_semillero INT,
  water_option ENUM('suministro','calidad','riego','reciclado','lagos','algibes') NOT NULL,
  nivel VARCHAR(50) NULL,           -- solo para lagos/algibes
  capacidad VARCHAR(50) NULL,       -- solo para lagos/algibes
  ubicacion VARCHAR(255) NULL,      -- solo para lagos/algibes
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id_finca, water_option, fecha_inicio, fecha_fin)
) ENGINE=InnoDB;
`;

async function migrate() {
  try {
    const conn = await pool.getConnection();
    await conn.query(createTableSql);
    console.log('✅ Tabla water_records creada o ya existente');
    conn.release();
  } catch (err) {
    console.error('❌ Error creando tabla water_records:', err);
    process.exit(1);
  }
}

migrate();
