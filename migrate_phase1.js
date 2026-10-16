import pool from './server/db.js';

async function migratePhase1() {
  console.log('Starting Phase 1 Migration...');

  try {
    // 1. Modificar tabla `cultivos`
    console.log('Modifying `cultivos` table...');
    try {
        await pool.query(`ALTER TABLE cultivos ADD COLUMN altitud_min INT`);
    } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }
    
    try {
        await pool.query(`ALTER TABLE cultivos ADD COLUMN altitud_max INT`);
    } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }
    
    try {
        await pool.query(`ALTER TABLE cultivos ADD COLUMN ph_suelo DECIMAL(4,2)`);
    } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }
    
    try {
        await pool.query(`ALTER TABLE cultivos ADD COLUMN orientacion_surcos VARCHAR(100)`);
    } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }

    // 2. Crear tabla `whatsapp_webhook_flujos`
    console.log('Creating `whatsapp_webhook_flujos` table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_webhook_flujos (
        id_flujo INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        telefono VARCHAR(20) NOT NULL,
        estado_conversacion VARCHAR(50) NOT NULL DEFAULT 'INICIO',
        contexto JSON,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 3. Crear tabla `dian_facturacion_eventos`
    console.log('Creating `dian_facturacion_eventos` table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dian_facturacion_eventos (
        id_evento INT AUTO_INCREMENT PRIMARY KEY,
        id_factura INT NOT NULL,
        id_tenant INT NOT NULL,
        cufe VARCHAR(255),
        qr_data TEXT,
        estado_dian VARCHAR(50),
        xml_enviado TEXT,
        fecha_evento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Crear tablas `gps_vehiculos` y `gps_empleados`
    console.log('Creating GPS tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gps_vehiculos (
        id_gps INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        id_vehiculo INT NOT NULL,
        latitud DECIMAL(10,8) NOT NULL,
        longitud DECIMAL(11,8) NOT NULL,
        velocidad DECIMAL(5,2),
        nivel_bateria INT,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gps_empleados (
        id_gps INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        id_empleado INT NOT NULL,
        latitud DECIMAL(10,8) NOT NULL,
        longitud DECIMAL(11,8) NOT NULL,
        id_dispositivo VARCHAR(100),
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Crear tabla `asientos_contables`
    console.log('Creating `asientos_contables` table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS asientos_contables (
        id_asiento INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        fecha_asiento DATE NOT NULL,
        descripcion VARCHAR(255) NOT NULL,
        documento_referencia VARCHAR(100),
        modulo_origen VARCHAR(50),
        total_debito DECIMAL(15,2) DEFAULT 0,
        total_credito DECIMAL(15,2) DEFAULT 0,
        estado VARCHAR(20) DEFAULT 'Activo',
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Phase 1 Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migratePhase1();
