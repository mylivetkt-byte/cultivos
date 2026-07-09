require('dotenv/config');
const mysql = require('mysql2/promise');

async function migrate() {
  const c = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'sas_agricolas'
  });

  console.log('Iniciando migracion de reglas de unicidad...');

  try {
    await c.query(`
      CREATE TABLE IF NOT EXISTS sys_unicidad_reglas (
        id_regla BIGINT AUTO_INCREMENT PRIMARY KEY,
        codigo_regla VARCHAR(80) NOT NULL,
        modulo VARCHAR(80) NOT NULL,
        tabla VARCHAR(80) NOT NULL,
        columnas_unicas LONGTEXT NOT NULL,
        columnas_ambito LONGTEXT DEFAULT NULL,
        alcance ENUM('global', 'tenant', 'tenant_finca', 'tenant_nucleo', 'custom') NOT NULL DEFAULT 'global',
        mensaje_error VARCHAR(255) NOT NULL,
        descripcion TEXT DEFAULT NULL,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY ux_sys_unicidad_codigo (codigo_regla),
        KEY ix_sys_unicidad_tabla (tabla),
        KEY ix_sys_unicidad_activo (activo)
      )
    `);

    const seeds = [
      {
        codigo_regla: 'RRHH_EMPLEADOS_DOCUMENTO',
        modulo: 'RRHH',
        tabla: 'rrhh_empleados',
        columnas_unicas: JSON.stringify(['documento']),
        columnas_ambito: JSON.stringify([]),
        alcance: 'global',
        mensaje_error: 'La cédula ya existe para otro empleado.',
        descripcion: 'Evita duplicar empleados por documento.'
      },
      {
        codigo_regla: 'TERCEROS_DOCUMENTO',
        modulo: 'CRM',
        tabla: 'terceros',
        columnas_unicas: JSON.stringify(['documento']),
        columnas_ambito: JSON.stringify([]),
        alcance: 'global',
        mensaje_error: 'El documento ya existe en terceros.',
        descripcion: 'Evita duplicar terceros por documento.'
      },
      {
        codigo_regla: 'COMER_CLIENTES_CODIGO_GLOBAL',
        modulo: 'Comercializacion',
        tabla: 'comer_clientes',
        columnas_unicas: JSON.stringify(['codigoCliente']),
        columnas_ambito: JSON.stringify([]),
        alcance: 'global',
        mensaje_error: 'El codigo del cliente ya existe.',
        descripcion: 'Evita repetir codigoCliente entre clientes.'
      },
      {
        codigo_regla: 'COMER_CLIENTES_CIF_GLOBAL',
        modulo: 'Comercializacion',
        tabla: 'comer_clientes',
        columnas_unicas: JSON.stringify(['cif']),
        columnas_ambito: JSON.stringify([]),
        alcance: 'global',
        mensaje_error: 'El CIF ya existe para otro cliente.',
        descripcion: 'Evita repetir CIF entre clientes.'
      },
      {
        codigo_regla: 'COMER_CLIENTES_RFC_GLOBAL',
        modulo: 'Comercializacion',
        tabla: 'comer_clientes',
        columnas_unicas: JSON.stringify(['rfc']),
        columnas_ambito: JSON.stringify([]),
        alcance: 'global',
        mensaje_error: 'El RFC ya existe para otro cliente.',
        descripcion: 'Evita repetir RFC entre clientes.'
      },
      {
        codigo_regla: 'FINCAS_CODIGO_TENANT',
        modulo: 'Geografia',
        tabla: 'fincas',
        columnas_unicas: JSON.stringify(['codigo']),
        columnas_ambito: JSON.stringify(['id_tenant']),
        alcance: 'tenant',
        mensaje_error: 'El codigo de la finca ya existe para este cliente.',
        descripcion: 'Evita repetir codigos de finca dentro del mismo cliente.'
      },
      {
        codigo_regla: 'FINCAS_NOMBRE_TENANT',
        modulo: 'Geografia',
        tabla: 'fincas',
        columnas_unicas: JSON.stringify(['nombre']),
        columnas_ambito: JSON.stringify(['id_tenant']),
        alcance: 'tenant',
        mensaje_error: 'El nombre de la finca ya existe para este cliente.',
        descripcion: 'Evita repetir nombres de finca dentro del mismo cliente.'
      },
      {
        codigo_regla: 'NUCLEOS_CODIGO_FINCA',
        modulo: 'Geografia',
        tabla: 'nucleos',
        columnas_unicas: JSON.stringify(['codigo']),
        columnas_ambito: JSON.stringify(['id_finca']),
        alcance: 'tenant_finca',
        mensaje_error: 'El codigo del nucleo ya existe en esta finca.',
        descripcion: 'Evita repetir codigos de nucleo dentro de la misma finca.'
      },
      {
        codigo_regla: 'NUCLEOS_NOMBRE_FINCA',
        modulo: 'Geografia',
        tabla: 'nucleos',
        columnas_unicas: JSON.stringify(['nombre']),
        columnas_ambito: JSON.stringify(['id_finca']),
        alcance: 'tenant_finca',
        mensaje_error: 'El nombre del nucleo ya existe en esta finca.',
        descripcion: 'Evita repetir nombres de nucleo dentro de la misma finca.'
      },
      {
        codigo_regla: 'INSUMOS_CODIGO_TENANT',
        modulo: 'Inventario',
        tabla: 'insumos',
        columnas_unicas: JSON.stringify(['codigo']),
        columnas_ambito: JSON.stringify(['id_tenant']),
        alcance: 'tenant',
        mensaje_error: 'El código del insumo ya existe para este cliente.',
        descripcion: 'Evita repetir códigos de insumos por tenant.'
      },
      {
        codigo_regla: 'LOTES_CODIGO_NUCLEO',
        modulo: 'Geografía',
        tabla: 'lotes',
        columnas_unicas: JSON.stringify(['codigo']),
        columnas_ambito: JSON.stringify(['id_nucleo']),
        alcance: 'tenant_nucleo',
        mensaje_error: 'El código del lote ya existe en este núcleo.',
        descripcion: 'Evita repetir códigos de lotes dentro del mismo núcleo.'
      }
    ];

    for (const rule of seeds) {
      await c.query(
        `
          INSERT INTO sys_unicidad_reglas
            (codigo_regla, modulo, tabla, columnas_unicas, columnas_ambito, alcance, mensaje_error, descripcion, activo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
          ON DUPLICATE KEY UPDATE
            modulo = VALUES(modulo),
            tabla = VALUES(tabla),
            columnas_unicas = VALUES(columnas_unicas),
            columnas_ambito = VALUES(columnas_ambito),
            alcance = VALUES(alcance),
            mensaje_error = VALUES(mensaje_error),
            descripcion = VALUES(descripcion),
            activo = VALUES(activo)
        `,
        [
          rule.codigo_regla,
          rule.modulo,
          rule.tabla,
          rule.columnas_unicas,
          rule.columnas_ambito,
          rule.alcance,
          rule.mensaje_error,
          rule.descripcion
        ]
      );
    }

    console.log('Reglas de unicidad verificadas y sembradas.');
  } catch (err) {
    console.error('Error en migracion de unicidad:', err);
    throw err;
  } finally {
    await c.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
