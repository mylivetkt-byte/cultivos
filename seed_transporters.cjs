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
