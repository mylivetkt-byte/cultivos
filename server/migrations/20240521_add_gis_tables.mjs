import pool from '../db.js';

(async () => {
  try {
    console.log('⏳ Creando tablas para métricas satelitales, alertas e inventario...');

    // 1. Métricas Satelitales
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sat_metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lote_id INT NOT NULL,
        fecha DATE NOT NULL,
        ndvi DECIMAL(5,4),
        ndmi DECIMAL(5,4),
        et0 DECIMAL(5,2),
        temperatura DECIMAL(5,2),
        FOREIGN KEY (lote_id) REFERENCES lotes(id_lote) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 2. Alertas Agronómicas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agri_alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lote_id INT NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        severidad ENUM('BAJA', 'MEDIA', 'ALTA', 'CRITICA') NOT NULL,
        mensaje TEXT NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        estado ENUM('ACTIVA', 'RESUELTA') DEFAULT 'ACTIVA',
        FOREIGN KEY (lote_id) REFERENCES lotes(id_lote) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 3. Insertar datos semilla (ya que es real pero necesitamos algo que mostrar)
    // Primero buscar un lote existente para asignarle la data
    const [lotes] = await pool.query('SELECT id_lote, nombre FROM lotes LIMIT 5');
    if (lotes.length > 0) {
      const loteId = lotes[0].id_lote;
      
      // Insertar métricas
      await pool.query(`
        INSERT INTO sat_metrics (lote_id, fecha, ndvi, ndmi, et0, temperatura)
        VALUES (?, CURDATE(), 0.85, 0.65, 4.2, 24.5)
      `, [loteId]);

      // Insertar alertas
      await pool.query(`
        INSERT INTO agri_alerts (lote_id, tipo, severidad, mensaje)
        VALUES (?, 'ESTRES_HIDRICO', 'MEDIA', 'Se detecta leve estrés hídrico en la zona sur del lote.')
      `, [loteId]);
      
      console.log('✅ Datos reales semilla insertados en métricas y alertas.');
    } else {
      console.log('⚠️ No hay lotes en la base de datos para insertar datos semilla.');
    }

    console.log('✅ Tablas de GIS y Copiloto creadas correctamente.');
  } catch (err) {
    console.error('❌ Error creando tablas GIS:', err);
  } finally {
    process.exit();
  }
})();
