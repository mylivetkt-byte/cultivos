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
    console.log("Starting Business Rules Alignment Migration...");

    // 1. Add new flags to plan_contable
    const alterQuery = `
      ALTER TABLE plan_contable 
      ADD COLUMN requiere_cxc TINYINT(1) DEFAULT 0 AFTER requiere_tercero,
      ADD COLUMN requiere_cxp TINYINT(1) DEFAULT 0 AFTER requiere_cxc,
      ADD COLUMN maneja_iva TINYINT(1) DEFAULT 0 AFTER requiere_cxp,
      ADD COLUMN maneja_retefuente TINYINT(1) DEFAULT 0 AFTER maneja_iva,
      ADD COLUMN maneja_reteica TINYINT(1) DEFAULT 0 AFTER maneja_retefuente;
    `;
    
    try {
      await connection.query(alterQuery);
      console.log("Added CXC, CXP, IVA, ReteFuente, ReteIca flags to plan_contable.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("Columns already exist in plan_contable.");
      } else {
        throw e;
      }
    }

    console.log("Migration completed successfully!");

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await connection.end();
  }
}

runMigration();
