import mysql from 'mysql2/promise';

async function check() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas'
  });

  const tables = ['solicitudes_pedido', 'solicitudes_detalle', 'ordenes_compra', 'ordenes_compra_detalle', 'insumos', 'terceros', 'inv_pedidos'];
  for (const t of tables) {
    try {
      const [rows] = await conn.query(`DESCRIBE ${t}`);
      console.log(`\n--- ${t} ---`);
      for (const r of rows) console.log(`${r.Field}: ${r.Type} | Key: ${r.Key}`);
    } catch (e) {
      console.log(`\n--- ${t} --- (Not Found)`);
    }
  }
  await conn.end();
}
check();
