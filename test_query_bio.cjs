require('dotenv').config();
const pool = require('./server/db.js').default;

async function run(){
  try {
    const [saldos] = await pool.query(`SELECT i.id_insumo, i.codigo, i.nombre as producto, i.unidad_medida, i.stock_actual, i.costo_unitario, (i.stock_actual * i.costo_unitario) as costo_total FROM insumos i WHERE i.id_tenant = 1 AND (i.origen = 'Biofábrica' OR i.id_insumo IN (SELECT DISTINCT id_insumo FROM app_produccion_organica WHERE id_insumo IS NOT NULL))`);
    console.log('SALDOS:', saldos.slice(0,2));

    const [mov] = await pool.query(`SELECT m.id_movimiento, m.fecha_movimiento, m.tipo_movimiento, m.cantidad, m.costo_unitario, (m.cantidad * m.costo_unitario) as costo_total, m.observaciones, i.nombre as insumo, i.codigo, i.unidad_medida, u.nombre_completo as responsable FROM movimientos_inventario m JOIN insumos i ON m.id_insumo = i.id_insumo LEFT JOIN empleados u ON m.usuario_responsable = u.id_empleado WHERE m.id_tenant = 1 AND i.id_insumo IN (SELECT DISTINCT id_insumo FROM app_produccion_organica_detalles) ORDER BY m.fecha_movimiento DESC`);
    console.log('MOV:', mov.slice(0,2));

  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
