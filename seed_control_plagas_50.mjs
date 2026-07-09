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

const tiposControl = ['Quimico', 'Biologico', 'Cultural', 'Mecanico'];
const productosMetodo = ['Imidacloprid 70WG', 'Abamectina 1.8EC', 'Azadiractina 0.3EC', 'Bacillus thuringiensis', 'Metomil 40SP', 'Spinosad 48SC', 'Lufenuron 5EC', 'Aceite Parafinico', 'Azufre 80WP', 'Oxido Cobre'];
const responsables = ['Juan Perez', 'Maria Gomez', 'Carlos Ruiz', 'Ana Torres', 'Luis Mendoza', 'Sofia Rivas', 'Pedro Diaz', 'Laura Castillo'];

async function main() {
  const conn = await mysql.createConnection(DB);
  await conn.query('SET FOREIGN_KEY_CHECKS=0');

  const [dets] = await conn.query('SELECT id_deteccion FROM detecciones_fitosanitarias LIMIT 1000');
  const detIds = dets.map((r) => r.id_deteccion);

  if (!detIds.length) throw new Error('Faltan detecciones_fitosanitarias');

  const values = [];
  for (let i = 0; i < 50; i++) {
    values.push([
      pick(detIds),
      pick(tiposControl),
      pick(productosMetodo),
      pick(['1.5 L/Ha', '30 Kg/Ha', '2.0 L/Ha', '0.5 Kg/Ha']),
      randDec(0.5, 25, 2),
      randDate(2025, 2026),
      pick(responsables),
      pick(['Aplicacion exitosa', 'Requiere seguimiento', 'Recomendar biologico', ''])
    ]);
  }

  await conn.query('INSERT INTO control_plagas (id_deteccion,tipo_control,producto_metodo,dosis,area_aplicacion_ha,fecha_aplicacion,responsable,observaciones) VALUES ?', [values]);
  await conn.query('SET FOREIGN_KEY_CHECKS=1');
  await conn.end();
  console.log('control_plagas seed finalizado');
}

main().catch((e) => { console.error('Error:', e); process.exit(1); });
