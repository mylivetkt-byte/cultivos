const mysql = require('mysql2/promise');

async function migrate() {
  const c = await mysql.createConnection({host:'localhost',port:3307,user:'root',password:'12345',database:'sas_agricolas'});
  try {
    const addColumn = async (table, definition) => {
      try {
        await c.query(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
        console.log(`Added column to ${table}: ${definition.split(' ')[0]}`);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column already exists: ${definition.split(' ')[0]}`);
        } else {
          throw e;
        }
      }
    };

    console.log('Migrating tenants table...');
    await addColumn('tenants', "tipo_documento ENUM('NIT','CC','CE','Pasaporte') DEFAULT 'NIT' AFTER codigo_tenant");
    await addColumn('tenants', "dv VARCHAR(1) AFTER nit");
    await addColumn('tenants', "tipo_contribuyente ENUM('Persona Jurídica','Persona Natural') DEFAULT 'Persona Jurídica' AFTER dv");
    await addColumn('tenants', "regimen_tributario VARCHAR(50) AFTER tipo_contribuyente");
    await addColumn('tenants', "responsabilidades_fiscales VARCHAR(100) AFTER regimen_tributario");
    await addColumn('tenants', "codigo_ciiu VARCHAR(10) AFTER responsabilidades_fiscales");
    await addColumn('tenants', "direccion_fiscal VARCHAR(255) AFTER huso_horario");
    await addColumn('tenants', "departamento_fiscal VARCHAR(100) AFTER direccion_fiscal");
    await addColumn('tenants', "municipio_fiscal VARCHAR(100) AFTER departamento_fiscal");
    await addColumn('tenants', "correo_facturacion VARCHAR(150) AFTER municipio_fiscal");
    await addColumn('tenants', "telefono_contacto VARCHAR(50) AFTER correo_facturacion");

    console.log('Migrating fincas table...');
    await addColumn('fincas', "centro_gps POINT AFTER poligono_gps");
    await addColumn('fincas', "departamento VARCHAR(100) AFTER altitud_promedio");

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await c.end();
  }
}

migrate();
