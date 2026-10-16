const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: process.env.MYSQL_PORT || 3307,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sas_db'
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS catalogo_riegos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_catalogo INT NOT NULL,
        etapa_fenologica VARCHAR(255),
        requerimiento_hidrico_mm DECIMAL(10,2),
        frecuencia_dias INT,
        metodo_recomendado VARCHAR(255),
        FOREIGN KEY (id_catalogo) REFERENCES cultivos_catalogo(id_catalogo) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS catalogo_siembra_patrones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_catalogo INT NOT NULL,
        sistema_siembra VARCHAR(255),
        distancia_surcos_m DECIMAL(10,2),
        distancia_plantas_m DECIMAL(10,2),
        plantas_por_ha INT,
        instrucciones_especiales TEXT,
        FOREIGN KEY (id_catalogo) REFERENCES cultivos_catalogo(id_catalogo) ON DELETE CASCADE
      )
    `);

    console.log('Tables created successfully.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
