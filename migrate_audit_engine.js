import pool from './server/db.js';

async function migrateAuditEngine() {
  console.log('Starting Audit Engine Migration...');

  try {
    // FASE 1: Rastro de Auditoría
    console.log('Creating `rastro_auditoria` table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rastro_auditoria (
        id_rastro INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        id_usuario INT,
        modulo VARCHAR(50) NOT NULL,
        accion VARCHAR(20) NOT NULL,
        entidad VARCHAR(50) NOT NULL,
        entidad_id INT,
        json_old JSON,
        json_new JSON,
        ip_address VARCHAR(45),
        user_agent VARCHAR(255),
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tenant_modulo (id_tenant, modulo)
      )
    `);

    // FASE 2: Base Contable y Saldos de Apertura
    console.log('Creating `periodos_contables` table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS periodos_contables (
        id_periodo INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        anio INT NOT NULL,
        mes INT NOT NULL,
        estado VARCHAR(20) DEFAULT 'Abierto', -- Abierto, Cerrado, Bloqueado
        fecha_cierre TIMESTAMP NULL,
        cerrado_por INT,
        UNIQUE KEY uk_tenant_periodo (id_tenant, anio, mes)
      )
    `);

    console.log('Creating `saldos_iniciales_cuenta` table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saldos_iniciales_cuenta (
        id_saldo INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        id_cuenta INT NOT NULL,
        id_periodo INT NOT NULL,
        saldo_debito DECIMAL(15,2) DEFAULT 0,
        saldo_credito DECIMAL(15,2) DEFAULT 0,
        saldo_neto DECIMAL(15,2) DEFAULT 0,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_tenant_cuenta_periodo (id_tenant, id_cuenta, id_periodo)
      )
    `);

    console.log('Creating `contab_detalles` table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contab_detalles (
        id_detalle INT AUTO_INCREMENT PRIMARY KEY,
        id_asiento INT NOT NULL,
        id_tenant INT NOT NULL,
        id_cuenta INT NOT NULL,
        id_centro_costo INT NULL,
        debito DECIMAL(15,2) DEFAULT 0,
        credito DECIMAL(15,2) DEFAULT 0,
        descripcion VARCHAR(255),
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_asiento (id_asiento),
        INDEX idx_cuenta_tenant (id_tenant, id_cuenta)
      )
    `);

    console.log('Audit Engine Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migrateAuditEngine();
