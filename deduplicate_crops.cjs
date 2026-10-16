const mysql = require('mysql2/promise');
require('dotenv').config();

const mappings = [
  { master: 34, duplicates: [1, 4, 9, 14, 19, 24, 29, 37, 40, 45] },
  { master: 2, duplicates: [5, 10, 15, 20, 25, 30, 35, 38, 41, 46] },
  { master: 6, duplicates: [3, 11, 16, 21, 26, 31, 36, 39, 42, 47] },
  { master: 8, duplicates: [13, 18, 23, 28, 33] },
  { master: 32, duplicates: [7, 12, 17, 22, 27, 43] }
];

const tablesToUpdate = [
  { t: 'amb_huella_agua', c: 'id_cultivo' },
  { t: 'app_recetas', c: 'id_cultivo' },
  { t: 'asociacion_cultivos', c: 'id_cultivo_companero' },
  { t: 'asociacion_cultivos', c: 'id_cultivo_principal' },
  { t: 'calendario_agricola', c: 'id_cultivo' },
  { t: 'certificaciones_cultivo', c: 'id_cultivo' },
  { t: 'costos_produccion', c: 'id_cultivo' },
  { t: 'fenologia_cultivo', c: 'id_cultivo' },
  { t: 'fenologia_etapas', c: 'id_cultivo' },
  { t: 'indicadores_rentabilidad', c: 'id_cultivo' },
  { t: 'parcelas', c: 'id_cultivo' },
  { t: 'planes_fertilizacion', c: 'id_cultivo' },
  { t: 'siembras', c: 'id_cultivo' },
  { t: 'umbrales_plagas', c: 'id_cultivo' },
  { t: 'variedades', c: 'id_cultivo' },
  { t: 'vivero_produccion', c: 'id_cultivo' }
];

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: process.env.MYSQL_PORT || 3307,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sas_agricolas'
    });

    for (const map of mappings) {
      if (map.duplicates.length === 0) continue;
      console.log(`Processing master ID ${map.master} with duplicates ${map.duplicates.join(', ')}...`);

      for (const tableInfo of tablesToUpdate) {
        // We use UPDATE IGNORE to avoid unique key constraint errors. 
        // If a duplicate constraint prevents the update, we will delete the duplicate row instead of updating it.
        const [updateRes] = await pool.query(
          `UPDATE IGNORE ${tableInfo.t} SET ${tableInfo.c} = ? WHERE ${tableInfo.c} IN (?)`,
          [map.master, map.duplicates]
        );
        if (updateRes.affectedRows > 0) {
          console.log(`  Updated ${updateRes.affectedRows} rows in ${tableInfo.t}.${tableInfo.c}`);
        }

        // Delete any remaining references that were ignored due to unique constraints
        const [delRes] = await pool.query(
          `DELETE FROM ${tableInfo.t} WHERE ${tableInfo.c} IN (?)`,
          [map.duplicates]
        );
        if (delRes.affectedRows > 0) {
          console.log(`  Deleted ${delRes.affectedRows} overlapping rows in ${tableInfo.t}.${tableInfo.c} due to constraints`);
        }
      }

      // Finally, delete the duplicate crops from the main table
      const [finalDel] = await pool.query(
        `DELETE FROM cultivos WHERE id_cultivo IN (?)`,
        [map.duplicates]
      );
      console.log(`  -> Deleted ${finalDel.affectedRows} duplicate crop records from cultivos`);
    }

    console.log('Successfully completed crop deduplication.');
    process.exit(0);
  } catch (err) {
    console.error('Error during deduplication:', err);
    process.exit(1);
  }
})();
