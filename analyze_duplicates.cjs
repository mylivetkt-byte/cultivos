const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: process.env.MYSQL_PORT || 3307,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sas_agricolas'
    });

    const tablesToCheck = [
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

    const [cultivos] = await pool.query('SELECT id_cultivo, nombre FROM cultivos ORDER BY nombre, id_cultivo');
    
    // Group by norm nombre
    const grouped = {};
    for (const c of cultivos) {
      const norm = c.nombre.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (!grouped[norm]) grouped[norm] = [];
      grouped[norm].push(c);
    }

    const report = {};

    for (const [normName, group] of Object.entries(grouped)) {
      if (group.length > 1) {
        report[normName] = { 
          originalNames: [...new Set(group.map(g => g.nombre))],
          ids: group.map(g => g.id_cultivo),
          usage: {}
        };
        for (const g of group) {
            report[normName].usage[g.id_cultivo] = 0;
        }

        // check usage
        for (const {t, c} of tablesToCheck) {
            for (const g of group) {
                const [countRows] = await pool.query(`SELECT COUNT(*) as cnt FROM ${t} WHERE ${c} = ?`, [g.id_cultivo]);
                report[normName].usage[g.id_cultivo] += countRows[0].cnt;
            }
        }
      }
    }

    console.log(JSON.stringify(report, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
