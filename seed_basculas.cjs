// seed_basculas.cjs – crea tabla basculas y carga datos comunes en Colombia
const mysql = require('mysql2/promise');

async function seedBasculas() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas'
  });
  try {
    console.log('Creando tabla basculas si no existe...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS basculas (
        id_bascula INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        codigo VARCHAR(50) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        ubicacion VARCHAR(150),
        capacidad_maxima DECIMAL(15,2),
        activa TINYINT(1) DEFAULT 1
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Inserción de básculas más usadas en Colombia (ejemplo)
    const basculas = [
      // [codigo, nombre, ubicacion, capacidad_maxima, activa]
      ['MTXPR', 'Mettler Toledo XPR', 'Bodega Central Insumos', 5000, 1],
      ['B861', 'Bizerba 861', 'Bodega Finca El Paraíso', 3500, 1],
      ['NIR500', 'Nir 500', 'Bodega de Cosecha', 2000, 1],
      ['SQX', 'Sartorius Quintix', 'Laboratorio de Control', 1000, 1],
      ['OHD', 'Ohaus Defender', 'Almacén General', 1500, 1]
    ];

    // Elimina duplicados antes de insertar
    await conn.query('DELETE FROM basculas');
    for (const [codigo, nombre, ubicacion, capacidad, activa] of basculas) {
      await conn.query(
        `INSERT INTO basculas (id_tenant, codigo, nombre, ubicacion, capacidad_maxima, activa) VALUES (1, ?, ?, ?, ?, ?)`,
        [codigo, nombre, ubicacion, capacidad, activa]
      );
    }
    console.log('Básculas cargadas exitosamente.');
  } catch (err) {
    console.error('Error al seed basculas:', err);
  } finally {
    await conn.end();
  }
}

seedBasculas();
