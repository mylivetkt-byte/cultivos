const mysql = require('mysql2/promise');

async function seedAudit() {
  const c = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas'
  });

  try {
    const [insumos] = await c.query('SELECT id_insumo, codigo, nombre FROM insumos WHERE nombre LIKE "%Carbofuran%"');
    if (insumos.length === 0) {
      console.log('No se encontró Carbofuran.');
      return;
    }
    const id_insumo = insumos[0].id_insumo;

    console.log(`Preparando auditoría perfecta para: ${insumos[0].nombre} (ID: ${id_insumo})`);

    // Borrar historial aleatorio previo de este insumo
    await c.query('DELETE FROM movimientos_inventario WHERE id_insumo = ?', [id_insumo]);
    await c.query('DELETE FROM inv_existencias WHERE id_insumo = ?', [id_insumo]);

    // Obtener referencias
    const [bCentral] = await c.query('SELECT id_bodega, nombre FROM bod_bodegas WHERE id_bodega = 1 LIMIT 1'); // Bodega Central Insumos
    const [bParaiso] = await c.query('SELECT id_bodega, nombre FROM bod_bodegas WHERE id_bodega = 2 LIMIT 1'); // Bodega Finca El Paraiso
    const id_b1 = bCentral[0].id_bodega;
    const id_b2 = bParaiso[0].id_bodega;

    const [lotes] = await c.query('SELECT id_lote FROM lotes LIMIT 2');
    const id_lote1 = lotes.length > 0 ? lotes[0].id_lote : null;
    const id_lote2 = lotes.length > 1 ? lotes[1].id_lote : id_lote1;

    const now = new Date();
    
    // Función helper para insertar
    async function insert(tipo, cant, fecha, obs, idBod, idLote = null) {
      await c.query(
        `INSERT INTO movimientos_inventario 
        (id_tenant, id_insumo, tipo_movimiento, cantidad, costo_unitario, fecha_movimiento, usuario_responsable, observaciones, id_bodega, id_lote) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [1, id_insumo, tipo, cant, 5000, fecha, 1, obs, idBod, idLote]
      );
    }

    // --- TIMELINE DE AUDITORÍA ---
    // 1. Día 0 (Hace 90 días): Saldo Inicial en Bodega Central
    const d0 = new Date(now); d0.setDate(d0.getDate() - 90); d0.setHours(7, 0, 0);
    await insert('Entrada', 5000, d0, 'Saldo Inicial Auditado (Apertura de Inventario)', id_b1);

    // 2. Día 15 (Hace 75 días): Consumo local en Finca Central
    const d1 = new Date(now); d1.setDate(d1.getDate() - 75); d1.setHours(10, 30, 0);
    await insert('Salida', 50, d1, 'Aplicación directa de agroquímico en campo', id_b1, id_lote1);

    // 3. Día 30 (Hace 60 días): TRASLADO de B1 a B2
    const d2 = new Date(now); d2.setDate(d2.getDate() - 60); d2.setHours(8, 15, 0);
    await insert('Salida', 1000, d2, `Traslado de Salida hacia ${bParaiso[0].nombre} (Doc #TR-8001)`, id_b1);
    await insert('Entrada', 1000, d2, `Traslado de Entrada desde ${bCentral[0].nombre} (Doc #TR-8001)`, id_b2);

    // 4. Día 45 (Hace 45 días): Consumo desde la Bodega de Destino (B2)
    const d3 = new Date(now); d3.setDate(d3.getDate() - 45); d3.setHours(9, 0, 0);
    await insert('Salida', 200, d3, 'Aplicación de producto en lote satélite', id_b2, id_lote2);

    // 5. Día 60 (Hace 30 días): Nueva Compra en Bodega Central (B1)
    const d4 = new Date(now); d4.setDate(d4.getDate() - 30); d4.setHours(14, 0, 0);
    await insert('Entrada', 1500, d4, 'Ingreso por Compra a Proveedor (Fact #FV-992)', id_b1);

    // 6. Día 75 (Hace 15 días): Segundo TRASLADO de B1 a B2
    const d5 = new Date(now); d5.setDate(d5.getDate() - 15); d5.setHours(11, 45, 0);
    await insert('Salida', 500, d5, `Traslado de Salida hacia ${bParaiso[0].nombre} (Doc #TR-8089)`, id_b1);
    await insert('Entrada', 500, d5, `Traslado de Entrada desde ${bCentral[0].nombre} (Doc #TR-8089)`, id_b2);

    // 7. Día 85 (Hace 5 días): Consumo final en B2
    const d6 = new Date(now); d6.setDate(d6.getDate() - 5); d6.setHours(16, 20, 0);
    await insert('Salida', 150, d6, 'Aplicación de mantenimiento', id_b2, id_lote2);

    console.log('Historial de Carbofuran reescrito a la perfección.');

    // Recalcular Kárdex solo para Carbofuran
    const [saldos] = await c.query(`
      SELECT id_bodega, 
        SUM(CASE WHEN tipo_movimiento = 'Entrada' THEN cantidad ELSE 0 END) - 
        SUM(CASE WHEN tipo_movimiento = 'Salida' THEN cantidad ELSE 0 END) AS saldo
      FROM movimientos_inventario 
      WHERE id_insumo = ?
      GROUP BY id_bodega
    `, [id_insumo]);

    for (let saldo of saldos) {
      if (saldo.saldo > 0) {
        await c.query(
          `INSERT INTO inv_existencias (id_bodega, id_insumo, cantidad, costo_promedio, fecha_ultima_actualizacion)
           VALUES (?, ?, ?, ?, NOW())`,
          [saldo.id_bodega, id_insumo, saldo.saldo, 5000]
        );
      }
    }
    console.log('Saldos de Carbofuran guardados en inv_existencias.');

  } catch (err) {
    console.error('Error in audit script:', err);
  } finally {
    c.end();
  }
}

seedAudit();
