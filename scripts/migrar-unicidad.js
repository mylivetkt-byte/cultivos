// scripts/migrar-unicidad.js
import pool from '../server/db.js';   // pool ya configurado en el proyecto

// -------------------------------------------------------------------
// 1️⃣  Tabla de auditoría (creación si no existe)
async function crearAuditoria() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS unicidad_auditoria (
      id      INT AUTO_INCREMENT PRIMARY KEY,
      tabla   VARCHAR(255) NOT NULL,
      columna VARCHAR(255) NOT NULL,
      accion  ENUM('COMPROBADO','AGREGADO','ERROR') NOT NULL,
      detalle TEXT,
      fecha   DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);
}

// -------------------------------------------------------------------
// 2️⃣  Helper para registrar cada paso
async function registrar(tabla, columna, accion, detalle = null) {
  await pool.execute(
    `INSERT INTO unicidad_auditoria (tabla, columna, accion, detalle) VALUES (?,?,?,?)`,
    [tabla, columna, accion, detalle]
  );
}

// -------------------------------------------------------------------
// 3️⃣  Generador de la sentencia ALTER necesaria
function generarAlter(tabla, columnas, alcance) {
  const nombreIdx = `uq_${tabla}_${columnas.join('_')}`;
  if (alcance === 'global') {
    return `ALTER TABLE ${tabla} ADD CONSTRAINT ${nombreIdx} UNIQUE (${columnas.join(',')});`;
  }
  // alcance por tenant, por cliente o por finca
  let fk;
  if (alcance === 'por_tenant') fk = 'id_tenant';
  else if (alcance === 'por_cliente') fk = 'id_cliente';
  else fk = 'id_finca';
  return `ALTER TABLE ${tabla} ADD CONSTRAINT ${nombreIdx} UNIQUE (${fk}, ${columnas.join(',')});`;
}

// -------------------------------------------------------------------
// 4️⃣  Verificar y crear índices
async function aplicarRegla({ tabla, columna, alcance }) {
  // Verificar existencia de la tabla
  const [tbl] = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tabla]
  );
  if (!tbl.length) {
    await registrar(tabla, columna, 'ERROR', 'Tabla no encontrada');
    return;
  }

  // Obtener índices existentes
  const [indices] = await pool.query(
    `SELECT INDEX_NAME, NON_UNIQUE,
            GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columnas
     FROM information_schema.statistics
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     GROUP BY INDEX_NAME, NON_UNIQUE`,
    [tabla]
  );

  // Construir la lista de columnas que debería contener el UNIQUE
  let fk;
  if (alcance === 'por_tenant') fk = 'id_tenant';
  else if (alcance === 'por_cliente') fk = 'id_cliente';
  else fk = 'id_finca';
  const colsNecesarias = alcance === 'global'
    ? [columna]
    : [fk, columna];

  const indiceExiste = indices.find(i =>
    i.NON_UNIQUE === 0 &&               // solo únicos
    i.columnas.split(',').sort().join(',') === colsNecesarias.sort().join(',')
  );

  if (indiceExiste) {
    await registrar(tabla, columna, 'COMPROBADO', `Índice ${indiceExiste.INDEX_NAME} ya existe`);
    return;
  }

  // Crear el índice
  const alterSql = generarAlter(tabla, [columna], alcance);
  try {
    await pool.execute(alterSql);
    await registrar(tabla, columna, 'AGREGADO', `Ejecutado: ${alterSql}`);
  } catch (e) {
    await registrar(tabla, columna, 'ERROR', `Fallo al crear UNIQUE: ${e.message}`);
  }
}

// -------------------------------------------------------------------
// 5️⃣  Ejecutar todas las reglas
(async () => {
  try {
    await crearAuditoria();

    const reglas = [
      // Fincas (columna real: codigo ya tiene UNIQUE global; falta único por tenant en nombre)
      { tabla: 'fincas',   columna: 'nombre',      alcance: 'por_tenant' },
      // Núcleos (columna real: codigo, no codigoNucleo)
      { tabla: 'nucleos',  columna: 'codigo',      alcance: 'por_finca'   },
      { tabla: 'nucleos',  columna: 'nombre',      alcance: 'por_finca'   },
    ];

    for (const r of reglas) await aplicarRegla(r);

    console.log('✅ Migración de unicidad completada.');
    process.exit(0);
  } catch (err) {
    console.error('⚠️  Error inesperado:', err);
    process.exit(1);
  }
})();