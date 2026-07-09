import pool from './server/db.js';
await pool.query(`INSERT INTO fincas (id_finca, nombre, poligono_gps) VALUES (1, 'Finca Demo', ST_GeomFromText('POLYGON((-72.77451 4.426263,-72.745069 4.442091,-72.719062 4.423954,-72.73228 4.406158,-72.77451 4.426263))'))`);
console.log('Finca inserted');
process.exit(0);
