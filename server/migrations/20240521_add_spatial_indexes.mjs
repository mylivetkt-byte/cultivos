import pool from '../db.js';

(async () => {
  try {
    console.log('⏳ Creando índices espaciales en fincas y lotes...');

    // Asegurarse de que poligono_gps no sea nulo antes de agregar el índice espacial
    // MySQL requiere que las columnas con SPATIAL INDEX sean NOT NULL
    
    // Para fincas
    await pool.query(`UPDATE fincas SET poligono_gps = ST_GeomFromText('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))') WHERE poligono_gps IS NULL;`);
    await pool.query(`ALTER TABLE fincas MODIFY poligono_gps GEOMETRY NOT NULL;`);
    try {
      await pool.query(`ALTER TABLE fincas ADD SPATIAL INDEX(poligono_gps);`);
      console.log('✅ Índice espacial creado en fincas.');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') console.log('⚠️ El índice espacial en fincas ya existe.');
      else throw e;
    }

    // Para lotes
    await pool.query(`UPDATE lotes SET poligono_gps = ST_GeomFromText('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))') WHERE poligono_gps IS NULL;`);
    await pool.query(`ALTER TABLE lotes MODIFY poligono_gps GEOMETRY NOT NULL;`);
    try {
      await pool.query(`ALTER TABLE lotes ADD SPATIAL INDEX(poligono_gps);`);
      console.log('✅ Índice espacial creado en lotes.');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') console.log('⚠️ El índice espacial en lotes ya existe.');
      else throw e;
    }

    console.log('✅ Migración de índices espaciales completada.');
  } catch (err) {
    console.error('❌ Error en migración de índices espaciales:', err);
  } finally {
    process.exit();
  }
})();
