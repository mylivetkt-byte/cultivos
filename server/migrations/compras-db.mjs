import mysql from 'mysql2/promise';

async function migrate() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas'
  });

  try {
    console.log('Altering solicitudes_pedido...');
    await conn.query(`
      ALTER TABLE solicitudes_pedido
      ADD COLUMN IF NOT EXISTS id_empleado_solicitante INT COMMENT 'Empleado que originó la solicitud',
      ADD COLUMN IF NOT EXISTS area_solicitante VARCHAR(100) COMMENT 'Área o departamento que originó la solicitud',
      ADD CONSTRAINT fk_solicitudes_empleado FOREIGN KEY (id_empleado_solicitante) REFERENCES terceros(id_tercero) ON DELETE SET NULL
    `).catch(e => console.log('Notice:', e.message));

    console.log('Altering ordenes_compra_detalle...');
    await conn.query(`
      ALTER TABLE ordenes_compra_detalle
      ADD COLUMN IF NOT EXISTS id_detalle_solicitud BIGINT COMMENT 'Referencia a la solicitud original',
      ADD CONSTRAINT fk_oc_detalle_solicitud FOREIGN KEY (id_detalle_solicitud) REFERENCES solicitudes_detalle(id_detalle_solicitud) ON DELETE SET NULL
    `).catch(e => console.log('Notice:', e.message));

    console.log('Creating compras_precios_proveedor...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS compras_precios_proveedor (
        id_precio BIGINT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        id_insumo INT NOT NULL,
        id_proveedor INT NOT NULL,
        precio_unitario DECIMAL(15,4) NOT NULL,
        fecha_cotizacion DATE NOT NULL,
        condiciones TEXT,
        es_ultimo_precio TINYINT(1) DEFAULT 1,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_tenant) REFERENCES tenants(id_tenant) ON DELETE CASCADE,
        FOREIGN KEY (id_insumo) REFERENCES insumos(id_insumo) ON DELETE CASCADE,
        FOREIGN KEY (id_proveedor) REFERENCES terceros(id_tercero) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await conn.end();
  }
}

migrate();
