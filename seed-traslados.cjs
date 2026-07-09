const mysql = require('mysql2/promise');

(async () => {
  const pool = await mysql.createConnection({
    host: 'localhost', port: 3307, user: 'root', password: '12345', database: 'sas_agricolas'
  });

  try {
    // 1. Create Bodega in Finca 2
    console.log('Creating Bodega 2...');
    await pool.query(`
      INSERT IGNORE INTO bod_bodegas (id_bodega, id_tenant, id_finca, nombre, tipo, capacidad_m3, es_principal)
      VALUES (2, 1, 2, 'Bodega Finca El Paraiso', 'Insumos', 1000.00, 0)
    `);

    // 2. Create Document type Traslado (id_tipo = 3)
    console.log('Creating Transfer Document...');
    const [docRes] = await pool.query(`
      INSERT INTO inv_documentos (id_tenant, id_tipo, consecutivo, id_bodega_origen, id_bodega_destino, estado, observaciones, id_usuario_crea)
      VALUES (1, 3, 'TRA-00001', 1, 2, 'Aplicado', 'Traslado de insumos para siembra', 1)
    `);
    const id_documento = docRes.insertId;

    // 3. Create Details
    console.log('Creating Document Details...');
    await pool.query(`
      INSERT INTO inv_documentos_detalle (id_documento, id_insumo, cantidad, costo_unitario)
      VALUES (?, 1, 50.00, 15000.00), (?, 2, 100.00, 20000.00)
    `, [id_documento, id_documento]);

    // 4. Create Movements (Salida bodega 1, Entrada bodega 2)
    console.log('Creating Movements...');
    await pool.query(`
      INSERT INTO movimientos_inventario (id_tenant, id_insumo, tipo_movimiento, cantidad, costo_unitario, documento_referencia, usuario_responsable, id_bodega, id_documento)
      VALUES 
      (1, 1, 'Salida', 50.00, 15000.00, 'TRA-00001', 1, 1, ?),
      (1, 1, 'Entrada', 50.00, 15000.00, 'TRA-00001', 1, 2, ?),
      (1, 2, 'Salida', 100.00, 20000.00, 'TRA-00001', 1, 1, ?),
      (1, 2, 'Entrada', 100.00, 20000.00, 'TRA-00001', 1, 2, ?)
    `, [id_documento, id_documento, id_documento, id_documento]);

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    process.exit(0);
  }
})();
