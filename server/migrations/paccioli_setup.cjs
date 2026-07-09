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
    console.log("Starting Paccioli Structure Migration...");

    await connection.query(`DROP TABLE IF EXISTS contab_detalles;`);
    await connection.query(`DROP TABLE IF EXISTS contab_documentos;`);
    await connection.query(`DROP TABLE IF EXISTS contab_comprobantes;`);
    await connection.query(`DROP TABLE IF EXISTS comprobantes_detalle;`);
    await connection.query(`DROP TABLE IF EXISTS comprobantes;`);

    // 1. Create contab_comprobantes (Lotes)
    await connection.query(`
      CREATE TABLE contab_comprobantes (
        id_comprobante BIGINT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        id_periodo INT NOT NULL,
        id_tipo_comp INT NOT NULL,
        numero VARCHAR(20) NOT NULL, -- Ej: 201910EG01
        descripcion VARCHAR(200),
        estado ENUM('Abierto', 'Cerrado', 'Anulado') DEFAULT 'Abierto',
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create contab_documentos (Documentos)
    await connection.query(`
      CREATE TABLE contab_documentos (
        id_documento BIGINT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        id_comprobante BIGINT NOT NULL,
        tipo_doc VARCHAR(10) NOT NULL, -- Ej: CR, EG
        numero_doc VARCHAR(20) NOT NULL,
        fecha DATE NOT NULL,
        concepto VARCHAR(300),
        id_tercero INT,
        estado ENUM('Borrador', 'Aprobado', 'Anulado') DEFAULT 'Borrador',
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_comprobante) REFERENCES contab_comprobantes(id_comprobante) ON DELETE CASCADE
      );
    `);

    // 3. Create contab_detalles
    await connection.query(`
      CREATE TABLE contab_detalles (
        id_detalle BIGINT AUTO_INCREMENT PRIMARY KEY,
        id_documento BIGINT NOT NULL,
        id_cuenta INT NOT NULL,
        id_tercero INT,
        id_centro_costo INT,
        descripcion VARCHAR(300),
        valor_base DECIMAL(15,2) DEFAULT 0,
        debito DECIMAL(15,2) DEFAULT 0,
        credito DECIMAL(15,2) DEFAULT 0,
        FOREIGN KEY (id_documento) REFERENCES contab_documentos(id_documento) ON DELETE CASCADE
      );
    `);

    console.log("Migration completed successfully!");

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await connection.end();
  }
}

runMigration();
