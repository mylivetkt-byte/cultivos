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
const randTime = () => {
  const h = String(randInt(6, 18)).padStart(2, '0');
  const m = String(randInt(0, 59)).padStart(2, '0');
  return `${h}:${m}:00`;
};

const autores = ['Dr. Martinez', 'Ing. Lopez', 'Tec. Rojas', 'Ing. Castro', 'Dr. Paredes', 'Tec. Ortiz', 'Ing. Delgado', 'Dr. Vargas'];
const productos = ['Biol Ancestral', 'Caldo Sulfo Calcico', 'Compost Tea', 'Kelp Extract', 'Humus Lombriz', 'Aminoacidos', 'Extracto Algas', 'Biol Pez'];
const metodos = ['Manual', 'Dron', 'Avion', 'Tractor', 'Fertirriego', 'Otro'];
const estadosProg = ['Programada', 'En Proceso', 'Completada', 'Cancelada'];
const tiposControl = ['Quimico', 'Biologico', 'Cultural', 'Mecanico'];
const productosMetodo = ['Imidacloprid 70WG', 'Abamectina 1.8EC', 'Azadiractina 0.3EC', 'Bacillus thuringiensis', 'Metomil 40SP', 'Spinosad 48SC', 'Lufenuron 5EC', 'Aceite Parafinico', 'Azufre 80WP', 'Oxido Cobre'];
const responsables = ['Juan Perez', 'Maria Gomez', 'Carlos Ruiz', 'Ana Torres', 'Luis Mendoza', 'Sofia Rivas', 'Pedro Diaz', 'Laura Castillo'];
const equipos = ['Tractor John Deere', 'Moto bomba', 'Pulverizador manual', 'Dron DJI Agras', 'Avion aplicador', 'Carro tanque'];
const condiciones = ['Temperatura 24C, Humedad 60%', 'Sin viento', 'Rocio presente', 'Temperatura 18C, llovizna', 'Buen estado'];
const unidades = ['Lts/Ha', 'Kg/Ha', 'Gr/Ha', 'Ml/Ha', 'Cc/Ha'];
const notasDet = ['Dosis recomendada', 'Aplicar en 2 veces', 'Mejor en crecimiento', 'Sin restriccion', ''];

async function main() {
  const conn = await mysql.createConnection(DB);
  await conn.query('SET FOREIGN_KEY_CHECKS=0');

  const [insumos] = await conn.query('SELECT id_insumo FROM insumos LIMIT 1000');
  const insumoIds = insumos.map((r) => r.id_insumo);
  const [fincas] = await conn.query('SELECT id_finca FROM fincas LIMIT 1000');
  const fincaIds = fincas.map((r) => r.id_finca);
  const [lotes] = await conn.query('SELECT id_lote FROM lotes LIMIT 5000');
  const loteIds = lotes.map((r) => r.id_lote);
  const [ica] = await conn.query('SELECT id_enfermedad_plaga FROM lib_fitosanitaria_ica LIMIT 1000');
  const icaIds = ica.map((r) => r.id_enfermedad_plaga);
  const [dets] = await conn.query('SELECT id_deteccion FROM detecciones_fitosanitarias LIMIT 1000');
  const detIds = dets.map((r) => r.id_deteccion);
  const [emps] = await conn.query('SELECT id_empleado FROM rrhh_empleados LIMIT 1000');
  const empIds = emps.map((r) => r.id_empleado);

  if (!insumoIds.length || !fincaIds.length || !loteIds.length) {
    throw new Error('Faltan datos base: insumos/fincas/lotes');
  }

  const recetaValues = [];
  for (let i = 0; i < 50; i++) {
    const idTenant = 1;
    const nombre = `Receta ${pick(['Nutricion','Foliares','Raices','Floracion','Frutificacion','Precosecha','Postcosecha','Produccion'])} ${pick(['A','B','C','D','E'])}-${i + 1}`;
    const tipoRand = Math.random();
    const tipo = tipoRand < 0.45 ? 'Fitosanitario' : tipoRand < 0.75 ? 'Fertilización' : 'Fertilización';
    const tipoReceta = pick(['Quimico', 'Organico', 'Mixto']);
    const origen = pick(['Compra', 'Produccion', 'Recoleccion']);
    const cultivoId = randInt(1, 12);
    const enfermedadId = icaIds.length ? pick(icaIds) : null;
    const autor = pick(autores);
    const fecha = randDate(2024, 2025);
    const instrucciones = 'Mezclar en 200L agua. Aplicar en horas frescas.';
    const recomendaciones = pick(['Usar PPE completo', 'Evitar lluvia 24h', 'No mezclar con cobre', 'Rotar modos accion']);
    const estado = pick(['Activa', 'Activa', 'Activa', 'Inactiva']);
    recetaValues.push([idTenant, nombre, tipo, cultivoId, enfermedadId, autor, fecha, instrucciones, recomendaciones, estado, tipoReceta, origen]);
  }
  await conn.query(
    'INSERT INTO app_recetas (id_tenant,nombre_receta,tipo,id_cultivo,id_enfermedad_plaga,autor_tecnico,fecha_creacion,instrucciones_preparacion,recomendaciones_seguridad,estado,tipo_receta,origen_insumo) VALUES ?',
    [recetaValues]
  );
  const [recRows] = await conn.query('SELECT id_receta FROM app_recetas WHERE id_tenant=1 ORDER BY id_receta ASC LIMIT 50');
  const recetaIds = recRows.map((r) => r.id_receta);

  const detalleValues = [];
  for (let i = 0; i < 50; i++) {
    const idReceta = pick(recetaIds);
    const idInsumo = pick(insumoIds);
    const dosis = randDec(0.5, 50);
    const unidad = pick(unidades);
    const notas = pick(notasDet);
    detalleValues.push([idReceta, idInsumo, dosis, unidad, notas]);
  }
  await conn.query('INSERT INTO app_recetas_detalle (id_receta,id_insumo,dosis_recomendada,unidad_medida,notas) VALUES ?', [detalleValues]);

  const progValues = [];
  const progIdsCollector = [];
  for (let i = 0; i < 50; i++) {
    const idTenant = 1;
    const idFinca = pick(fincaIds);
    const idLote = pick(loteIds);
    const idReceta = pick(recetaIds);
    const fecha = randDate(2025, 2026);
    const estado = pick(estadosProg);
    const fecEj = estado === 'Completada' ? randDate(parseInt(fecha.slice(0,4),10), parseInt(fecha.slice(0,4),10)) : null;
    const metodo = pick(metodos);
    const idMaq = randInt(1, 6);
    const responsable = pick(responsables);
    const obs = pick(['', 'Prioridad alta', 'Sector norte', 'Bajo supervision', '']);
    const clim = pick(condiciones);
    progValues.push([idTenant, idFinca, idLote, idReceta, fecha, fecEj, metodo, estado, idMaq || null, responsable, clim, obs]);
  }
  await conn.query(
    'INSERT INTO app_programacion (id_tenant,id_finca,id_lote,id_receta,fecha_programada,fecha_ejecucion,metodo_aplicacion,estado,id_maquinaria,responsable_aplicacion,condiciones_climaticas,observaciones) VALUES ?',
    [progValues]
  );
  const [progRows] = await conn.query('SELECT id_programacion FROM app_programacion WHERE id_tenant=1 ORDER BY id_programacion ASC LIMIT 50');
  const progIds = progRows.map((r) => r.id_programacion);

  const progInsValues = [];
  for (let i = 0; i < 50; i++) {
    const idProg = progIds[i];
    const idInsumo = pick(insumoIds);
    const cantProy = randDec(1, 500, 1);
    const cantReal = Math.random() < 0.6 ? randDec(0.5, 480, 1) : null;
    const costo = randDec(10, 1500);
    progInsValues.push([idProg, idInsumo, cantProy, cantReal, costo]);
  }
  await conn.query(
    'INSERT INTO app_programacion_insumos (id_programacion,id_insumo,cantidad_proyectada,cantidad_real_aplicada,costo_total) VALUES ?',
    [progInsValues]
  );

  const mezclaValues = [];
  for (let i = 0; i < 50; i++) {
    const idTenant = 1;
    const idReceta = pick(recetaIds);
    const loteId = pick(loteIds);
    const fecha = randDate(2025, 2026);
    const producto = pick(productosMetodo);
    const cant = randDec(10, 1000, 1);
    const costo = randDec(30, 900, 2);
    mezclaValues.push([idTenant, idReceta, loteId, fecha, producto, cant, costo]);
  }
  await conn.query(
    'INSERT INTO app_preparaciones_mezcla (id_tenant,id_receta,lote_id,fecha_preparacion,producto,cantidad_litros,costo) VALUES ?',
    [mezclaValues]
  );

  const prodValues = [];
  for (let i = 0; i < 50; i++) {
    const idTenant = 1;
    const loteId = pick(loteIds);
    const fecha = randDate(2025, 2026);
    const producto = pick(productos);
    const cant = randDec(50, 2000, 1);
    const mat = randDec(20, 400, 2);
    const jor = randDec(15, 350, 2);
    prodValues.push([idTenant, loteId, fecha, producto, cant, mat, jor]);
  }
  await conn.query(
    'INSERT INTO app_produccion_organica (id_tenant,lote_id,fecha_produccion,producto,cantidad_litros,costo_materiales,costo_jornales) VALUES ?',
    [prodValues]
  );

  const envValues = [];
  for (let i = 0; i < 50; i++) {
    const idProg = pick(progIds);
    const idInsumo = pick(insumoIds);
    const cant = randInt(1, 24);
    const lavado = Math.random() < 0.8 ? 1 : 0;
    const perforado = Math.random() < 0.9 ? 1 : 0;
    const entregado = Math.random() < 0.7 ? 1 : 0;
    const fechaEnt = entregado ? randDate(2025, 2026) : null;
    const notas = pick(['Entregado a centro', 'Pendiente recoleccion', 'Lavado verificado', '']);
    envValues.push([idProg, idInsumo, cant, lavado, perforado, entregado, fechaEnt, notas]);
  }
  await conn.query(
    'INSERT INTO app_control_envases (id_programacion,id_insumo,cantidad_envases_vacios,lavado_triple_realizado,perforado_inutilizado,entregado_centro_acopio,fecha_entrega,notas_disposicion) VALUES ?',
    [envValues]
  );

  const regValues = [];
  for (let i = 0; i < 50; i++) {
    const idLote = pick(loteIds);
    const producto = pick(productosMetodo);
    const ingrediente = pick(['Cipermetrina', 'Glifosato', 'Deltametrina', 'Abamectina', 'Azadiractina', 'Bacillus', 'Kieserita', 'Calcio']);
    const dosis = pick(['2 L/Ha', '50 Kg/Ha', '0.5 L/Ha', '1.2 L/Ha', '0.8 Kg/Ha']);
    const volumen = randDec(100, 1200, 1);
    const equipo = pick(equipos);
    const cond = pick(condiciones);
    const operador = pick(responsables);
    const fecha = randDate(2025, 2026);
    const hora = randTime();
    regValues.push([idLote, fecha, hora, producto, ingrediente, dosis, volumen, equipo, cond, operador]);
  }
  await conn.query(
    'INSERT INTO registro_aplicaciones (id_lote,fecha,hora,producto_comercial,ingrediente_activo,dosis_ha,volumen_mezcla_lts,equipo_utilizado,condiciones_climaticas,operador) VALUES ?',
    [regValues]
  );

  const cpValues = [];
  for (let i = 0; i < 50; i++) {
    const idDeteccion = detIds.length ? pick(detIds) : null;
    const tipo = pick(tiposControl);
    const metodo = pick(productosMetodo);
    const dosis = pick(['1.5 L/Ha', '30 Kg/Ha', '2.0 L/Ha', '0.5 Kg/Ha']);
    const area = randDec(0.5, 25, 2);
    const responsable = pick(empIds.length ? empIds.map((e) => `Empleado ${e}`) : responsables);
    const fecha = randDate(2025, 2026);
    const obs = pick(['Aplicacion exitosa', 'Requiere seguimiento', 'Recomendar biologico', '']);
    cpValues.push([idDeteccion, tipo, metodo, dosis, area, fecha, responsable, obs]);
  }
  await conn.query(
    'INSERT INTO control_plagas (id_deteccion,tipo_control,producto_metodo,dosis,area_aplicacion_ha,fecha_aplicacion,responsable,observaciones) VALUES ?',
    [cpValues]
  );

  await conn.query('SET FOREIGN_KEY_CHECKS=1');
  await conn.end();
  console.log('Seed finalizado: 50 registros por tabla (9 tablas).');
}

main().catch((e) => {
  console.error('Error en seed:', e);
  process.exit(1);
});
