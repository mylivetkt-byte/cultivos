import pool from "./server/db.js";

async function run() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    await conn.query(`ALTER TABLE comer_clientes ADD COLUMN codigoCliente VARCHAR(50) NULL`);
    await conn.query(`ALTER TABLE comer_clientes ADD COLUMN cif VARCHAR(20) NULL`);
    await conn.query(`ALTER TABLE comer_clientes ADD COLUMN rfc VARCHAR(20) NULL`);
    
    await conn.query(`CREATE UNIQUE INDEX uq_comer_clientes_codigocliente_tenant ON comer_clientes (id_tenant, codigoCliente)`);
    await conn.query(`CREATE UNIQUE INDEX uq_comer_clientes_cif_tenant ON comer_clientes (id_tenant, cif)`);
    await conn.query(`CREATE UNIQUE INDEX uq_comer_clientes_rfc_tenant ON comer_clientes (id_tenant, rfc)`);
    
    await conn.commit();
    console.log('Columnas e índices agregados correctamente');
  } catch (e) {
    await conn.rollback();
    console.error('Error:', e.message);
  } finally {
    conn.release();
    process.exit();
  }
}
run();