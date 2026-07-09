import 'dotenv/config';
import pool from './server/db.js';
(async()=>{
  const conn = await pool.getConnection();
  await conn.query(`ALTER TABLE app_recetas 
    ADD COLUMN tipo_receta ENUM('Quimico','Organico','Mixto') NOT NULL DEFAULT 'Quimico',
    ADD COLUMN origen_insumo ENUM('Compra','Produccion','Recoleccion') NOT NULL DEFAULT 'Compra'`);
  await conn.release();
  console.log('Columns added');
})();
