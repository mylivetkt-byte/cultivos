const mysql = require('mysql2/promise');

async function fixInventory() {
  const c = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas'
  });

  try {
    // 1. Delete buggy movements where id_bodega is NULL
    await c.query('DELETE FROM movimientos_inventario WHERE id_bodega IS NULL');
    console.log('Borrados movimientos corruptos sin bodega.');

    // 2. Delete negative existing balances by just injecting a massive Entrada
    // Let's get all insumos
    const [insumos] = await c.query('SELECT id_insumo FROM insumos');
    for (let insumo of insumos) {
      await c.query(
        `INSERT INTO movimientos_inventario 
        (id_tenant, id_insumo, tipo_movimiento, cantidad, costo_unitario, fecha_movimiento, usuario_responsable, observaciones, id_bodega) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [1, insumo.id_insumo, 'Entrada', 15000, 5000, '2025-01-01 00:00:00', 1, 'Ajuste de Saldo Inicial Masivo para Demo', 1]
      );
    }
    console.log('Inyectados 15000 de saldo inicial para cada producto en la Bodega 1.');

    // 3. Update inv_existencias to reflect the actual sum of movements
    await c.query('TRUNCATE TABLE inv_existencias');
    const [saldos] = await c.query(`
      SELECT m.id_bodega, m.id_insumo, 
        SUM(CASE WHEN m.tipo_movimiento = 'Entrada' THEN m.cantidad ELSE 0 END) - 
        SUM(CASE WHEN m.tipo_movimiento = 'Salida' THEN m.cantidad ELSE 0 END) AS saldo
      FROM movimientos_inventario m
      GROUP BY m.id_bodega, m.id_insumo
    `);

    for (let saldo of saldos) {
      if (saldo.saldo > 0) {
        await c.query(
          `INSERT INTO inv_existencias (id_bodega, id_insumo, cantidad, costo_promedio, fecha_ultima_actualizacion)
           VALUES (?, ?, ?, ?, NOW())`,
          [saldo.id_bodega, saldo.id_insumo, saldo.saldo, 5000]
        );
      }
    }
    console.log('Tabla estática inv_existencias regenerada y sincronizada.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    c.end();
  }
}

fixInventory();
