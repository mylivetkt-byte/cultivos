// scripts/migrate_purchase_flow.cjs
// Migration script to add tables/columns for the new purchase flow.
// Run with: node scripts/migrate_purchase_flow.cjs

const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3307,
    user: process.env.MYSQL_USER || 'sas_user',
    password: process.env.MYSQL_PASSWORD || 'sas_pass',
    database: process.env.MYSQL_DATABASE || 'sas_agricolas',
    multipleStatements: true,
  });

  const queries = [
    // Ensure email and telefono columns exist
    `ALTER TABLE empleados ADD COLUMN email VARCHAR(255) NOT NULL AFTER finca`,
    `ALTER TABLE empleados ADD COLUMN telefono VARCHAR(20) NOT NULL AFTER email`,
    
    // Add check constraint (ignore if exists)
    `ALTER TABLE empleados ADD CONSTRAINT chk_email CHECK (email LIKE '%@%')`,
    
    // cotizaciones table
    `CREATE TABLE IF NOT EXISTS cotizaciones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      solicitud_id INT NOT NULL,
      proveedor_id INT NOT NULL,
      precio_total DECIMAL(12,2) NOT NULL,
      antiguedad_dias INT NOT NULL,
      criterio ENUM('MEJOR_PRECIO','SIGUIENTE_PRECIO','MAYOR_ANTIGUEDAD') NOT NULL,
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE,
      FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
    )`,
    
    // cotizacion_items table
    `CREATE TABLE IF NOT EXISTS cotizacion_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cotizacion_id INT NOT NULL,
      producto_id INT NOT NULL,
      cantidad INT NOT NULL,
      precio_unitario DECIMAL(12,2) NOT NULL,
      FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )`,
    
    // modify ordenes table
    `ALTER TABLE ordenes ADD COLUMN solicitud_id INT NULL AFTER id`,
    `ALTER TABLE ordenes ADD COLUMN pdf_path VARCHAR(255) NULL AFTER estado`,
    `ALTER TABLE ordenes ADD COLUMN notificado BOOL DEFAULT FALSE AFTER pdf_path`,
    `ALTER TABLE ordenes ADD COLUMN reintentos INT DEFAULT 0 AFTER notificado`
  ];

  // Helper to run queries safely, ignoring duplicate column/key errors (errno 1060, 1061)
  async function safeQuery(sql) {
    try {
      await connection.query(sql);
    } catch (err) {
      if (err.errno === 1060 || err.errno === 1061) {
        console.warn('Duplicate column/key ignored:', err.sqlMessage);
      } else if (err.errno === 1067 && err.sqlMessage.includes('CHECK')) {
        console.warn('Check constraint may already exist or unsupported:', err.sqlMessage);
      } else {
        throw err;
      }
    }
  }

  try {
    for (const q of queries) {
      // Use safeQuery for ALTER statements, regular query for CREATE
      if (q.trim().startsWith('ALTER')) {
        await safeQuery(q);
      } else {
        await connection.query(q);
      }
    }
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await connection.end();
  }
})();
