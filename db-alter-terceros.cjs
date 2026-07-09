const mysql = require('mysql2/promise');
const fs = require('fs');

async function run() {
  const pool = mysql.createPool({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas', multipleStatements: true});
  
  try {
    console.log("Creando tablas genéricas...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gen_tipos_documento (
        codigo VARCHAR(10) PRIMARY KEY,
        descripcion VARCHAR(150) NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS gen_regimen_fiscal (
        codigo VARCHAR(50) PRIMARY KEY,
        descripcion VARCHAR(150) NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS gen_municipios (
        codigo_dane VARCHAR(10) PRIMARY KEY,
        departamento VARCHAR(100) NOT NULL,
        municipio VARCHAR(150) NOT NULL
      );
    `);

    console.log("Insertando Tipos de Documento...");
    await pool.query(`
      INSERT IGNORE INTO gen_tipos_documento (codigo, descripcion) VALUES
      ('CC', 'Cédula de Ciudadanía'),
      ('NIT', 'Número de Identificación Tributaria'),
      ('CE', 'Cédula de Extranjería'),
      ('TI', 'Tarjeta de Identidad'),
      ('TE', 'Tarjeta de Extranjería'),
      ('PAS', 'Pasaporte'),
      ('PEP', 'Permiso Especial de Permanencia'),
      ('PPT', 'Permiso de Protección Temporal'),
      ('NIT_OTRO_PAIS', 'NIT Otro País'),
      ('RC', 'Registro Civil');
    `);

    console.log("Insertando Regímenes Fiscales DIAN...");
    await pool.query(`
      INSERT IGNORE INTO gen_regimen_fiscal (codigo, descripcion) VALUES
      ('O-13', 'Gran Contribuyente'),
      ('O-15', 'Autorretenedor'),
      ('O-23', 'Agente de retención IVA'),
      ('O-47', 'Régimen Simple de Tributación - RST'),
      ('R-99-PN', 'No responsable');
    `);

    console.log("Alterando tabla terceros...");
    // 1. Drop existing constraints if they exist (we need to handle this carefully, but assuming no constraint exists for regimen_fiscal yet).
    // Let's modify columns safely.
    await pool.query(`SET FOREIGN_KEY_CHECKS=0;`);

    // Remove old tipo_tercero and add boolean flags
    try {
      await pool.query(`
        ALTER TABLE terceros 
        ADD COLUMN es_cliente BOOLEAN DEFAULT FALSE,
        ADD COLUMN es_proveedor BOOLEAN DEFAULT FALSE,
        ADD COLUMN es_empleado BOOLEAN DEFAULT FALSE,
        ADD COLUMN es_socio BOOLEAN DEFAULT FALSE,
        ADD COLUMN es_propietario BOOLEAN DEFAULT FALSE,
        ADD COLUMN es_otro BOOLEAN DEFAULT FALSE;
      `);
    } catch(e) {
      console.log("Boolean columns already exist or error: ", e.message);
    }

    // If there is existing data in tipo_tercero, migrate it to the boolean flags
    console.log("Migrando datos existentes a los booleanos...");
    try {
        await pool.query("UPDATE terceros SET es_cliente = 1 WHERE tipo_tercero = 'Cliente'");
        await pool.query("UPDATE terceros SET es_proveedor = 1 WHERE tipo_tercero = 'Proveedor'");
        await pool.query("UPDATE terceros SET es_empleado = 1 WHERE tipo_tercero = 'Empleado'");
        await pool.query("UPDATE terceros SET es_otro = 1 WHERE tipo_tercero = 'Otro'");
    } catch(e) {
        console.log("tipo_tercero column might already be dropped.");
    }

    // Now drop the old column if it exists
    try {
      await pool.query(`ALTER TABLE terceros DROP COLUMN tipo_tercero;`);
    } catch(e) {}

    // Alter tipo_documento from ENUM to VARCHAR
    await pool.query(`ALTER TABLE terceros MODIFY COLUMN tipo_documento VARCHAR(10);`);

    // Establish Foreign Keys for terceros
    // First ensure no orphaned data
    await pool.query(`UPDATE terceros SET tipo_documento = 'CC' WHERE tipo_documento IS NULL OR tipo_documento NOT IN (SELECT codigo FROM gen_tipos_documento);`);
    await pool.query(`UPDATE terceros SET regimen_fiscal = 'R-99-PN' WHERE regimen_fiscal IS NULL OR regimen_fiscal NOT IN (SELECT codigo FROM gen_regimen_fiscal);`);
    await pool.query(`UPDATE terceros SET codigo_municipio = NULL WHERE codigo_municipio NOT IN (SELECT codigo_dane FROM gen_municipios);`);

    // Add Foreign keys safely by dropping them if they exist first to avoid errors.
    // It's easier to just attempt adding and catch errors if they exist.
    try { await pool.query(`ALTER TABLE terceros ADD CONSTRAINT fk_tercero_tipo_doc FOREIGN KEY (tipo_documento) REFERENCES gen_tipos_documento(codigo);`); } catch(e) {}
    try { await pool.query(`ALTER TABLE terceros ADD CONSTRAINT fk_tercero_regimen FOREIGN KEY (regimen_fiscal) REFERENCES gen_regimen_fiscal(codigo);`); } catch(e) {}
    try { await pool.query(`ALTER TABLE terceros ADD CONSTRAINT fk_tercero_municipio FOREIGN KEY (codigo_municipio) REFERENCES gen_municipios(codigo_dane);`); } catch(e) {}

    await pool.query(`SET FOREIGN_KEY_CHECKS=1;`);
    console.log("Estructura de la base de datos actualizada.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}
run();
