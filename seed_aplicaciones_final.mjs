import mysql from 'mysql2/promise';

const DB = {
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '12345',
  database: 'sas_agricolas',
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randDec = (min, max, dec = 2) => +(Math.random() * (max - min) + min).toFixed(dec);
const randDate = (startYear = 2025, endYear = 2026) => {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start)).toISOString().slice(0, 10);
};

const productosMetodo = ['Imidacloprid 70WG', 'Abamectina 1.8EC', 'Azadiractina 0.3EC', 'Bacillus thuringiensis', 'Metomil 40SP', 'Spinosad 48SC', 'Lufenuron 5EC', 'Aceite Parafinico', 'Azufre 80WP', 'Oxido Cobre'];
const productos = ['Biol Ancestral', 'Caldo Sulfo Calcico', 'Compost Tea', 'Kelp Extract', 'Humus Lombriz', 'Aminoacidos', 'Extracto Algas', 'Biol Pez'];

async function main() {
  const conn = await mysql.createConnection(DB);
  await conn.query('SET FOREIGN_KEY_CHECKS=0');

  const [recetas] = await conn.query('SELECT id_receta FROM app_recetas WHERE id_tenant=1 LIMIT 1000');
  const recetaIds = recetas.map((r) => r.id_receta);
  const [lotes] = await conn.query('SELECT id_lote FROM lotes LIMIT 5000');
  const loteIds = lotes.map((r) => r.id_lote);
  const [prog] = await conn.query('SELECT id_programacion FROM app_programacion WHERE id_tenant=1 LIMIT 1000');
  const progIds = prog.map((r) => r.id_programacion);
  const [insumos] = await conn.query('SELECT id_insumo FROM insumos LIMIT 1000');
  const insumoIds = insumos.map((r) => r.id_insumo);

  if (!recetaIds.length || !loteIds.length || !progIds.length || !insumoIds.length) {
    throw new Error('Faltan datos base: recetas/lotes/programacion/insumos');
  }

  const mezclaValues = [];
  for (let i = 0; i < 50; i++) {
    mezclaValues.push([1, pick(recetaIds), pick(loteIds), randDate(2025, 2026), pick(productosMetodo), randDec(10, 1000, 1), randDec(30, 900, 2)]);
  }
  await conn.query('INSERT INTO app_preparaciones_mezcla (id_tenant,id_receta,lote_id,fecha_preparacion,producto,cantidad_litros,costo) VALUES ?', [mezclaValues]);

  const prodValues = [];
  for (let i = 0; i < 50; i++) {
    prodValues.push([1, pick(loteIds), randDate(2025, 2026), pick(productos), randDec(50, 2000, 1), randDec(20, 400, 2), randDec(15, 350, 2)]);
  }
  await conn.query('INSERT INTO app_produccion_organica (id_tenant,lote_id,fecha_produccion,producto,cantidad_litros,costo_materiales,costo_jornales) VALUES ?', [prodValues]);

  const envCurrent = (await conn.query('SELECT COUNT(*) c FROM app_control_envases'))[0][0].c;
  const envNeed = Math.max(0, 50 - envCurrent);
  if (envNeed > 0) {
    const envValues = [];
    for (let i = 0; i < envNeed; i++) {
      const entregado = Math.random() < 0.7 ? 1 : 0;
      envValues.push([pick(progIds), pick(insumoIds), randInt(1, 24), Math.random() < 0.8 ? 1 : 0, Math.random() < 0.9 ? 1 : 0, entregado, entregado ? randDate(2025, 2026) : null, pick(['Entregado a centro', 'Pendiente recoleccion', 'Lavado verificado', ''])]);
    }
    await conn.query('INSERT INTO app_control_envases (id_programacion,id_insumo,cantidad_envases_vacios,lavado_triple_realizado,perforado_inutilizado,entregado_centro_acopio,fecha_entrega,notas_disposicion) VALUES ?', [envValues]);
  }

  await conn.query('SET FOREIGN_KEY_CHECKS=1');
  await conn.end();
  console.log('seed finalizado');
}

main().catch((e) => { console.error('Error en seed:', e); process.exit(1); });
