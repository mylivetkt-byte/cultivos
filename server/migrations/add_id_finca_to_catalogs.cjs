const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas'
  });

  const tablesToUpdate = [
    'empleados',
    'productos_cosecha',
    'insumos',
    'viveros',
    'maquinaria',
    'vehiculos',
    'agroind_maquinaria_equipo'
  ];

  try {
    for (let table of tablesToUpdate) {
      console.log(`Verificando tabla: ${table}`);
      try {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN id_finca INT DEFAULT NULL;`);
        console.log(`  ✓ Se agregó id_finca a ${table}`);
        
        // Try adding FK but don't crash if fincas doesn't exist or table has issues
        try {
          await pool.query(`ALTER TABLE ${table} ADD CONSTRAINT fk_${table}_finca FOREIGN KEY (id_finca) REFERENCES fincas(id_finca) ON DELETE CASCADE;`);
          console.log(`  ✓ Se agregó FK a ${table}`);
        } catch (fkErr) {
          console.log(`  ! No se pudo agregar FK en ${table}: ${fkErr.message}`);
        }
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`  - La tabla ${table} ya tiene la columna id_finca`);
        } else if (err.code === 'ER_NO_SUCH_TABLE') {
          console.log(`  - La tabla ${table} no existe, se omite`);
        } else {
          console.log(`  x Error en ${table}: ${err.message}`);
        }
      }
    }
  } finally {
    await pool.end();
  }
}

run();
