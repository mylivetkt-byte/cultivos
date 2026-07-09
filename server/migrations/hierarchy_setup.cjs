const mysql = require('mysql2/promise');

async function runMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas',
    multipleStatements: true
  });

  try {
    console.log("Starting 4-Level Hierarchy Migration...");

    // 1. Create tipos_documentos table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tipos_documentos (
        id_tipo_doc INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        id_tipo_comp INT NOT NULL,
        codigo VARCHAR(10) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        consecutivo_actual INT DEFAULT 1,
        es_manual TINYINT(1) DEFAULT 0,
        FOREIGN KEY (id_tipo_comp) REFERENCES tipos_comprobantes(id_tipo_comp) ON DELETE CASCADE
      );
    `);

    // We will drop es_manual and consecutivo_actual from tipos_comprobantes
    try {
      await connection.query(`ALTER TABLE tipos_comprobantes DROP COLUMN es_manual;`);
      await connection.query(`ALTER TABLE tipos_comprobantes DROP COLUMN consecutivo_actual;`);
    } catch (e) {
      console.log("Columns already dropped or didn't exist.");
    }

    // 2. Clear old test data since schema changes drastically
    await connection.query(`SET FOREIGN_KEY_CHECKS = 0;`);
    await connection.query(`TRUNCATE TABLE contab_detalles;`);
    await connection.query(`TRUNCATE TABLE contab_documentos;`);
    await connection.query(`TRUNCATE TABLE contab_comprobantes;`);
    await connection.query(`TRUNCATE TABLE tipos_documentos;`);
    await connection.query(`SET FOREIGN_KEY_CHECKS = 1;`);

    // Modify contab_documentos to reference id_tipo_doc instead of tipo_doc string
    try {
      await connection.query(`ALTER TABLE contab_documentos DROP COLUMN tipo_doc;`);
      await connection.query(`ALTER TABLE contab_documentos ADD COLUMN id_tipo_doc INT NOT NULL AFTER id_comprobante;`);
      await connection.query(`ALTER TABLE contab_documentos ADD FOREIGN KEY (id_tipo_doc) REFERENCES tipos_documentos(id_tipo_doc);`);
    } catch (e) {
      console.log("Column modification might have been done.");
    }

    // Seed some basic data
    // Tipos de Comprobantes (Already exist from previous seeds: IG, EG, etc.)
    // Let's make sure they exist and get their IDs.
    const [tipos_comp] = await connection.query(`SELECT id_tipo_comp, codigo FROM tipos_comprobantes WHERE id_tenant = 1`);
    
    let id_eg = null, id_ig = null;
    tipos_comp.forEach(tc => {
      if (tc.codigo === 'EG') id_eg = tc.id_tipo_comp;
      if (tc.codigo === 'IG') id_ig = tc.id_tipo_comp;
    });

    if (id_eg) {
      await connection.query(`INSERT INTO tipos_documentos (id_tenant, id_tipo_comp, codigo, nombre, consecutivo_actual, es_manual) VALUES 
        (1, ?, 'CE', 'Comprobante de Egreso', 1, 0),
        (1, ?, 'FC', 'Factura de Compra', 1, 1)
      `, [id_eg, id_eg]);
    }

    if (id_ig) {
      await connection.query(`INSERT INTO tipos_documentos (id_tenant, id_tipo_comp, codigo, nombre, consecutivo_actual, es_manual) VALUES 
        (1, ?, 'RC', 'Recibo de Caja', 1, 0)
      `, [id_ig]);
    }

    console.log("Migration completed successfully!");

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await connection.end();
  }
}

runMigration();
