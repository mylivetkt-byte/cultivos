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
    console.log("Iniciando migración de Básculas, Medidas y Logística Inversa...");

    // 1. Crear tabla inv_unidades_medida
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inv_unidades_medida (
        id_unidad INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        codigo VARCHAR(10) NOT NULL,
        nombre VARCHAR(50) NOT NULL,
        UNIQUE KEY idx_tenant_codigo (id_tenant, codigo)
      );
    `);
    console.log("✅ inv_unidades_medida creada.");

    // Insertar unidades básicas
    const [tenants] = await pool.query('SELECT DISTINCT id_tenant FROM insumos');
    for (const t of tenants) {
      await pool.query(`
        INSERT IGNORE INTO inv_unidades_medida (id_tenant, codigo, nombre) VALUES
        (?, 'kg', 'Kilogramos'),
        (?, 'g', 'Gramos'),
        (?, 'lb', 'Libras'),
        (?, 'ton', 'Toneladas'),
        (?, 'l', 'Litros'),
        (?, 'ml', 'Mililitros'),
        (?, 'gal', 'Galones'),
        (?, 'bulto', 'Bulto / Saco'),
        (?, 'und', 'Unidades')
      `, [t.id_tenant, t.id_tenant, t.id_tenant, t.id_tenant, t.id_tenant, t.id_tenant, t.id_tenant, t.id_tenant, t.id_tenant]);
    }

    // 2. Crear tabla inv_conversiones
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inv_conversiones (
        id_conversion INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        id_insumo INT NOT NULL,
        id_unidad_origen INT NOT NULL,
        id_unidad_destino INT NOT NULL,
        factor_multiplicador DECIMAL(12,4) NOT NULL,
        FOREIGN KEY (id_insumo) REFERENCES insumos(id_insumo) ON DELETE CASCADE,
        FOREIGN KEY (id_unidad_origen) REFERENCES inv_unidades_medida(id_unidad),
        FOREIGN KEY (id_unidad_destino) REFERENCES inv_unidades_medida(id_unidad),
        UNIQUE KEY idx_insumo_origen (id_insumo, id_unidad_origen)
      );
    `);
    console.log("✅ inv_conversiones creada.");

    // 3. Alterar inv_documentos
    try { await pool.query(`ALTER TABLE inv_documentos ADD COLUMN peso_bascula_entrada DECIMAL(12,2) NULL`); } catch(e){}
    try { await pool.query(`ALTER TABLE inv_documentos ADD COLUMN peso_bascula_salida DECIMAL(12,2) NULL`); } catch(e){}
    try { await pool.query(`ALTER TABLE inv_documentos ADD COLUMN id_empleado_recibe INT NULL`); } catch(e){}
    try { await pool.query(`ALTER TABLE inv_documentos ADD COLUMN id_empleado_entrega INT NULL`); } catch(e){}
    console.log("✅ inv_documentos modificada (pesos y empleados).");

    // 4. Alterar inv_pedidos
    try { await pool.query(`ALTER TABLE inv_pedidos ADD COLUMN es_alerta_automatica BOOLEAN DEFAULT TRUE`); } catch(e){}
    try { await pool.query(`ALTER TABLE inv_pedidos ADD COLUMN id_usuario_entrega INT NULL`); } catch(e){}
    try { await pool.query(`ALTER TABLE inv_pedidos ADD COLUMN id_usuario_recibe INT NULL`); } catch(e){}
    console.log("✅ inv_pedidos modificada (alertas y entregas).");

    // 5. Crear inv_repuestos_cambiados
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inv_repuestos_cambiados (
        id_cambio INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        id_documento_salida INT NOT NULL,
        id_insumo INT NOT NULL,
        id_maquinaria INT NOT NULL,
        id_empleado INT NOT NULL,
        pieza_vieja_entregada BOOLEAN DEFAULT FALSE,
        fecha_entrega_pieza DATETIME NULL,
        FOREIGN KEY (id_documento_salida) REFERENCES inv_documentos(id_documento) ON DELETE CASCADE,
        FOREIGN KEY (id_insumo) REFERENCES insumos(id_insumo),
        FOREIGN KEY (id_maquinaria) REFERENCES agroind_maquinaria_equipo(id_maq_agro)
      );
    `);
    console.log("✅ inv_repuestos_cambiados creada.");

    console.log("🎉 Migración de Logística completada exitosamente!");

  } catch (err) {
    console.error("❌ Error durante la migración:", err);
  } finally {
    process.exit(0);
  }
}

migrate();
