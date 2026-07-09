import mysql from 'mysql2/promise';

async function migrate() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas'
  });

  try {
    console.log("Iniciando migración de Bodegas e Inventario Avanzado...");

    // 1. Alterar bod_bodegas
    try {
      await pool.query(`ALTER TABLE bod_bodegas ADD COLUMN es_principal BOOLEAN DEFAULT FALSE`);
    } catch (e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }
    console.log("✅ bod_bodegas modificada.");

    // Asegurarse de que exista al menos una bodega principal por tenant (temporal/por defecto)
    await pool.query(`
      UPDATE bod_bodegas SET es_principal = TRUE WHERE id_bodega IN (
        SELECT id FROM (SELECT MIN(id_bodega) as id FROM bod_bodegas GROUP BY id_tenant) AS temp
      );
    `);

    // 2. Alterar categorias_insumos
    try {
      await pool.query(`ALTER TABLE categorias_insumos ADD COLUMN id_padre INT DEFAULT NULL`);
    } catch (e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }
    console.log("✅ categorias_insumos modificada (soporte subgrupos).");

    // 3. Crear inv_existencias
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inv_existencias (
        id_existencia INT AUTO_INCREMENT PRIMARY KEY,
        id_bodega INT NOT NULL,
        id_insumo INT NOT NULL,
        cantidad DECIMAL(12,2) DEFAULT 0,
        costo_promedio DECIMAL(15,4) DEFAULT 0,
        fecha_ultima_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY idx_bodega_insumo (id_bodega, id_insumo),
        FOREIGN KEY (id_bodega) REFERENCES bod_bodegas(id_bodega) ON DELETE CASCADE,
        FOREIGN KEY (id_insumo) REFERENCES insumos(id_insumo) ON DELETE CASCADE
      );
    `);
    console.log("✅ inv_existencias creada.");

    // 3.1 Migrar stock antiguo a inv_existencias (a la bodega principal de cada tenant)
    // Primero, obtener las bodegas principales
    const [bodegasPrincipales] = await pool.query(`SELECT id_tenant, id_bodega FROM bod_bodegas WHERE es_principal = TRUE`);
    if (bodegasPrincipales.length > 0) {
      for (const bp of bodegasPrincipales) {
        await pool.query(`
          INSERT IGNORE INTO inv_existencias (id_bodega, id_insumo, cantidad, costo_promedio)
          SELECT ?, id_insumo, COALESCE(stock_actual, 0), COALESCE(costo_unitario, 0)
          FROM insumos
          WHERE id_tenant = ? AND stock_actual > 0
        `, [bp.id_bodega, bp.id_tenant]);
      }
      console.log("✅ Stock antiguo migrado a bodegas principales.");
    }

    // 4. Crear inv_tipos_documento
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inv_tipos_documento (
        id_tipo INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        codigo VARCHAR(10) NOT NULL,
        nombre VARCHAR(50) NOT NULL,
        naturaleza ENUM('Entrada', 'Salida', 'Transferencia') NOT NULL,
        es_automatico BOOLEAN DEFAULT TRUE,
        consecutivo_actual INT DEFAULT 1,
        UNIQUE KEY idx_tenant_codigo (id_tenant, codigo)
      );
    `);
    console.log("✅ inv_tipos_documento creada.");

    // Insertar tipos por defecto para los tenants existentes
    const [tenants] = await pool.query('SELECT DISTINCT id_tenant FROM insumos');
    for (const t of tenants) {
      await pool.query(`
        INSERT IGNORE INTO inv_tipos_documento (id_tenant, codigo, nombre, naturaleza, es_automatico) VALUES
        (?, 'ENT', 'Entrada de Inventario', 'Entrada', TRUE),
        (?, 'SAL', 'Salida de Inventario', 'Salida', TRUE),
        (?, 'TRA', 'Transferencia entre Bodegas', 'Transferencia', TRUE),
        (?, 'AJU', 'Ajuste de Inventario', 'Entrada', FALSE)
      `, [t.id_tenant, t.id_tenant, t.id_tenant, t.id_tenant]);
    }

    // 5. Crear inv_documentos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inv_documentos (
        id_documento INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        id_tipo INT NOT NULL,
        consecutivo VARCHAR(50) NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        id_bodega_origen INT NULL,
        id_bodega_destino INT NULL,
        estado ENUM('Borrador', 'Aplicado', 'Anulado') DEFAULT 'Borrador',
        observaciones TEXT,
        id_usuario_crea INT,
        id_usuario_aprueba INT,
        FOREIGN KEY (id_tipo) REFERENCES inv_tipos_documento(id_tipo)
      );
    `);
    console.log("✅ inv_documentos creada.");

    // 6. Alterar movimientos_inventario
    try {
      await pool.query(`ALTER TABLE movimientos_inventario ADD COLUMN id_bodega INT NULL`);
    } catch (e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }
    try {
      await pool.query(`ALTER TABLE movimientos_inventario ADD COLUMN id_documento INT NULL`);
    } catch (e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }
    console.log("✅ movimientos_inventario modificada.");

    // 7. Crear inv_pedidos e inv_pedidos_detalle
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inv_pedidos (
        id_pedido INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        id_bodega_solicita INT NOT NULL,
        id_bodega_provee INT NULL,
        estado ENUM('Pendiente_Aprobacion', 'Aprobado', 'Rechazado', 'Despachado', 'Recibido') DEFAULT 'Pendiente_Aprobacion',
        fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_aprobacion DATETIME NULL,
        id_usuario_solicita INT,
        id_usuario_aprueba INT NULL,
        observaciones TEXT,
        FOREIGN KEY (id_bodega_solicita) REFERENCES bod_bodegas(id_bodega),
        FOREIGN KEY (id_bodega_provee) REFERENCES bod_bodegas(id_bodega)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS inv_pedidos_detalle (
        id_detalle INT AUTO_INCREMENT PRIMARY KEY,
        id_pedido INT NOT NULL,
        id_insumo INT NOT NULL,
        cantidad_solicitada DECIMAL(12,2) NOT NULL,
        cantidad_aprobada DECIMAL(12,2) NULL,
        FOREIGN KEY (id_pedido) REFERENCES inv_pedidos(id_pedido) ON DELETE CASCADE,
        FOREIGN KEY (id_insumo) REFERENCES insumos(id_insumo)
      );
    `);
    console.log("✅ inv_pedidos e inv_pedidos_detalle creadas.");

    console.log("🎉 Migración completada exitosamente!");

  } catch (err) {
    console.error("❌ Error durante la migración:", err);
  } finally {
    process.exit(0);
  }
}

migrate();
