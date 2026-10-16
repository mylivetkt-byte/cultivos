const mysql = require('mysql2/promise');
require('dotenv').config({path: '.env'});

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: process.env.MYSQL_PORT || 3307,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sas_agricolas'
    });

    try {
      await pool.query('ALTER TABLE com_empresas_transportadoras ADD COLUMN telefono VARCHAR(50) DEFAULT NULL');
      await pool.query('ALTER TABLE com_empresas_transportadoras ADD COLUMN ciudad_base VARCHAR(100) DEFAULT NULL');
      await pool.query('ALTER TABLE com_empresas_transportadoras ADD COLUMN registro_nacional_carga VARCHAR(100) DEFAULT NULL');
      await pool.query('ALTER TABLE com_empresas_transportadoras ADD COLUMN calificacion_estrellas DECIMAL(2,1) DEFAULT 5.0');
      await pool.query('ALTER TABLE com_empresas_transportadoras ADD COLUMN precio_tonelada_promedio DECIMAL(10,2) DEFAULT NULL');
      await pool.query('ALTER TABLE com_empresas_transportadoras ADD COLUMN capacidad_toneladas DECIMAL(10,2) DEFAULT NULL');
      await pool.query('ALTER TABLE com_empresas_transportadoras ADD COLUMN especialidad VARCHAR(100) DEFAULT "Multiproposito"');
      await pool.query('ALTER TABLE com_empresas_transportadoras ADD COLUMN tiene_whatsapp TINYINT(1) DEFAULT 0');
      console.log('Columns added successfully');
    } catch(e) {
      if(e.code === 'ER_DUP_FIELDNAME') {
        console.log('Columns already exist, continuing to insert...');
      } else {
        throw e;
      }
    }

    // Truncate and insert the 3 specialized transporters
    await pool.query('TRUNCATE TABLE com_empresas_transportadoras');

    const sql = `
      INSERT INTO com_empresas_transportadoras 
      (nombre, nit, tipo_vehiculos, activo, telefono, ciudad_base, registro_nacional_carga, calificacion_estrellas, precio_tonelada_promedio, capacidad_toneladas, especialidad, tiene_whatsapp) 
      VALUES 
      ('Logística CosechaFácil S.A.S.', '900.888.777-1', 'Tractomulas', 1, '+573001234567', 'Villavicencio', '44589-MT', 5.0, 55000.00, 35.0, 'Agricola', 1),
      ('Transportes AgroAndina', '800.111.222-3', 'Turbos NPR', 1, '+573109876543', 'Acacías', '12903-MT', 4.0, 80000.00, 5.0, 'Agricola', 1),
      ('Fletes Rápidos (Independiente)', 'CC 1.123.456.789', 'Camionetas Platón', 1, '+573204567890', 'Cumaral', 'Rut Persona Natural', 3.0, 120000.00, 1.5, 'Agricola', 1)
    `;
    await pool.query(sql);
    console.log('Data seeded successfully');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
