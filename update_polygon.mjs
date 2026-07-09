import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas'
  });

  const sql = `UPDATE fincas SET poligono_gps = ST_GeomFromText('POLYGON((-72.77451 4.426263,-72.745069 4.442091,-72.719062 4.423954,-72.73228 4.406158,-72.77451 4.426263))') WHERE id_finca = 1`;
  const [result] = await conn.query(sql);
  console.log('✅ Polígono actualizado', result);

  const [rows] = await conn.query('SELECT id_finca, ST_AsText(poligono_gps) AS wkt FROM fincas WHERE id_finca = 1');
  console.log('Polígono actual:', rows);
  await conn.end();
}

main().catch(err => {
  console.error('❌ Error updating polygon:', err);
  process.exit(1);
});
