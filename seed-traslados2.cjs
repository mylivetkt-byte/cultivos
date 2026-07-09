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

    // 2. Create Transfer in bod_transferencias
    console.log('Creating Transfer...');
    const [transRes] = await pool.query(`
      INSERT INTO bod_transferencias (id_tenant, id_bodega_origen, id_bodega_destino, estado)
      VALUES (1, 1, 2, 'Recibida')
    `);
    const id_transferencia = transRes.insertId;

    // 3. Create Details in bod_transferencia_detalle
    console.log('Creating Transfer Details...');
    await pool.query(`
      INSERT INTO bod_transferencia_detalle (id_transferencia, insumo_producto, cantidad, estado_linea)
      VALUES (?, 'Cloruro de Potasio (KCl)', 50.00, 'Recibida'), (?, 'Urea Agrícola 46%', 100.00, 'Recibida')
    `, [id_transferencia, id_transferencia]);

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    process.exit(0);
  }
})();
