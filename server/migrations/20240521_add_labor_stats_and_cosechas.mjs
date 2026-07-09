// Migration: add labor_stats and cosechas tables if they don't exist
import pool from '../db.js';

(async () => {
  try {
    // labor_stats: tipo de labor y porcentaje (se calculará dinámicamente, pero la tabla permite inserciones manuales)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS labor_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        categoria VARCHAR(100) NOT NULL,
        cnt INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // cosechas: registro de cosechas por lote y fecha
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cosechas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_lote INT NOT NULL,
        fecha DATE NOT NULL,
        cantidad DECIMAL(12,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_lote) REFERENCES lotes(id_lote) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB;
    `);

    console.log('✅ Migración completada. Tablas labor_stats y cosechas están listas.');
  } catch (err) {
    console.error('❌ Error en migración:', err);
  } finally {
    process.exit();
  }
})();
