const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: process.env.MYSQL_PORT || 3307,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sas_agricolas'
    });

    console.log("Modifying cultivos_catalogo...");
    
    // Add columns to cultivos_catalogo
    const alterQuery = `
      ALTER TABLE cultivos_catalogo
      ADD COLUMN especie_biologica VARCHAR(255) AFTER familia_botanica,
      ADD COLUMN imagen_url VARCHAR(500),
      ADD COLUMN resumen_cientifico_api TEXT,
      ADD COLUMN distancia_siembra_m DECIMAL(10,2),
      ADD COLUMN densidad_ha INT,
      ADD COLUMN dias_ciclo INT
    `;
    
    try {
      await pool.query(alterQuery);
      console.log("Added columns to cultivos_catalogo");
    } catch (e) {
      if(e.code === 'ER_DUP_FIELDNAME') {
         console.log("Columns already exist, skipping ALTER.");
      } else {
         throw e;
      }
    }

    // 1. Enfermedades
    await pool.query(`
      CREATE TABLE IF NOT EXISTS catalogo_enfermedades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_catalogo INT NOT NULL,
        nombre_enfermedad VARCHAR(255) NOT NULL,
        sintomas TEXT,
        nivel_riesgo ENUM('Bajo', 'Medio', 'Alto', 'Crítico') DEFAULT 'Medio',
        FOREIGN KEY (id_catalogo) REFERENCES cultivos_catalogo(id_catalogo) ON DELETE CASCADE
      )
    `);

    // 2. Plagas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS catalogo_plagas_cultivo (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_catalogo INT NOT NULL,
        nombre_plaga VARCHAR(255) NOT NULL,
        etapa_ataque VARCHAR(255),
        umbral_dano VARCHAR(255),
        FOREIGN KEY (id_catalogo) REFERENCES cultivos_catalogo(id_catalogo) ON DELETE CASCADE
      )
    `);

    // 3. Abonos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS catalogo_abonos_formulas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_catalogo INT NOT NULL,
        fase_aplicacion VARCHAR(255) NOT NULL,
        dosis_npk VARCHAR(255),
        cantidad_por_planta_gr DECIMAL(10,2),
        FOREIGN KEY (id_catalogo) REFERENCES cultivos_catalogo(id_catalogo) ON DELETE CASCADE
      )
    `);

    // 4. Fumigaciones
    await pool.query(`
      CREATE TABLE IF NOT EXISTS catalogo_fumigacion_formulas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_catalogo INT NOT NULL,
        ingrediente_activo VARCHAR(255) NOT NULL,
        dosis_cc_litro DECIMAL(10,2),
        frecuencia_dias INT,
        FOREIGN KEY (id_catalogo) REFERENCES cultivos_catalogo(id_catalogo) ON DELETE CASCADE
      )
    `);

    // 5. Semillas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS catalogo_semillas_variedades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_catalogo INT NOT NULL,
        nombre_variedad VARCHAR(255) NOT NULL,
        proveedor VARCHAR(255),
        tolerancia VARCHAR(255),
        FOREIGN KEY (id_catalogo) REFERENCES cultivos_catalogo(id_catalogo) ON DELETE CASCADE
      )
    `);

    console.log('Database schema successfully updated for Super Catalog.');
    process.exit(0);
  } catch (err) {
    console.error('Error migrating DB:', err);
    process.exit(1);
  }
})();
