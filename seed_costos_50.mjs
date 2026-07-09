import mysql from 'mysql2/promise';

const DB = {
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '12345',
  database: 'sas_agricolas',
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randDec = (min, max, dec = 2) => +(Math.random() * (max - min) + min).toFixed(dec);
const randDate = (startYear = 2025, endYear = 2026) => {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start)).toISOString().slice(0, 10);
};

async function main() {
  const conn = await mysql.createConnection(DB);
  await conn.query('SET FOREIGN_KEY_CHECKS=0');

  const [prog] = await conn.query('SELECT id_programacion, id_lote, id_finca FROM app_programacion WHERE id_tenant=1 LIMIT 1000');
  const loteIds = [...new Set(prog.map((r) => r.id_lote))];
  const fincaIds = [...new Set(prog.map((r) => r.id_finca))];

  const insValues = [];
  for (let i = 0; i < 50; i++) {
    const loteId = pick(loteIds);
    const fincaId = pick(fincaIds);
    const costo_insumos = randDec(20, 800, 2);
    const costo_mano_obra = randDec(10, 300, 2);
    const costo_maquinaria = randDec(5, 200, 2);
    const costo_riego = randDec(0, 150, 2);
    const costo_indirecto = randDec(5, 100, 2);
    const costo_total = +(costo_insumos + costo_mano_obra + costo_maquinaria + costo_riego + costo_indirecto).toFixed(2);
    const periodo = `${pick(['2025','2026'])}-${String(pick([1,2,3,4,5,6,7,8,9,10,11,12])).padStart(2,'0')}`;
    insValues.push([1, fincaId, loteId, pick([1,2,3,4,5]), periodo, costo_mano_obra, costo_insumos, costo_maquinaria, costo_riego, costo_indirecto, costo_total]);
  }
  await conn.query('INSERT INTO costos_produccion (id_tenant,id_finca,id_lote,id_cultivo,periodo,costo_mano_obra,costo_insumos,costo_maquinaria,costo_riego,costo_indirecto,costo_total) VALUES ?', [insValues]);

  const opValues = [];
  const conceptos = ['Pulverizacion', 'Cosecha mecanica', 'Riego', 'Fertilizacion foliar', 'Control malezas'];
  for (let i = 0; i < 50; i++) {
    opValues.push([1, pick(fincaIds), pick(loteIds), pick(conceptos), randDec(15, 600, 2), randDate(2025, 2026)]);
  }
  await conn.query('INSERT INTO costos_operacion (id_tenant,id_finca,id_lote,concepto,importe,fecha) VALUES ?', [opValues]);

  await conn.query('SET FOREIGN_KEY_CHECKS=1');
  await conn.end();
  console.log('costos seed finalizado');
}

main().catch((e) => { console.error('Error:', e); process.exit(1); });
