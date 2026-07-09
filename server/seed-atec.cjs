const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: __dirname + '/../.env' });

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: '12345',
  database: 'sas_agricolas',
  port: 3307,
};

// Palma de Aceite Context Data
const temasCapacitacion = [
  'Identificación Temprana de Pudrición del Cogollo (PC)',
  'Manejo de Trampas para Rhynchophorus palmarum',
  'Criterios de Cosecha: Identificación de Racimos Óptimos',
  'Polinización Asistida en Híbridos OxG',
  'Manejo Seguro de Agroquímicos',
  'Calibración de Equipos de Aspersión Fitosanitaria',
  'Control de Malezas y Plateo Químico',
  'Mantenimiento de Drenajes Superficiales',
  'Reconocimiento de Marchitez Sorpresiva',
  'Censo Fitosanitario y Georreferenciación'
];

const enfermedades = [
  'Pudrición del Cogollo (PC)',
  'Marchitez Sorpresiva',
  'Anillo Rojo (Bursaphelenchus cocophilus)',
  'Pestalotiopsis spp.',
  'Pudrición Basal del Tronco (Ganoderma)',
  'Rhynchophorus palmarum (Picudo)',
  'Strategus aloeus',
  'Sagalassa valida',
  'Deficiencia de Boro',
  'Deficiencia de Magnesio'
];

const motivosVisita = [
  'Censo Fitosanitario Mensual',
  'Evaluación de Incidencia de PC',
  'Supervisión de Polinización',
  'Control de Calidad de Cosecha',
  'Auditoría de Trampas de Picudo',
  'Evaluación Post-Aplicación de Herbicida',
  'Inspección de Drenajes en Época Invernal',
  'Mapeo de Palmas Enfermas',
  'Monitoreo de Deficiencias Nutricionales'
];

const recomendacionesText = [
  'Aumentar la densidad de trampas para Rhynchophorus palmarum a 1 por hectárea.',
  'Realizar cirugía inmediata a palmas con PC en grado 1 y 2.',
  'Aplicar fertilizante rico en Boro en el lote afectado.',
  'Erradicar y destruir palmas con Anillo Rojo confirmado.',
  'Mejorar el plateo alrededor del plato de la palma (radio 1.5m).',
  'Limpiar canales de drenaje principales y secundarios para evitar encharcamiento.',
  'Reforzar capacitación de polinizadores; se nota baja viabilidad del polen.',
  'Hacer aplicación de fungicida cúprico post-cirugía.',
  'Ajustar ciclo de cosecha a 12 días debido a pico de producción.'
];

const recetasText = [
  'Aplicación de fungicida protectante y curativo en el cogollo.',
  'Inyección de insecticida sistémico.',
  'Aplicación de nematicida al plato.',
  'Fertilización foliar con microelementos.',
  'Aplicación de cebo tóxico en trampas.',
  'Drench con fungicida biológico (Trichoderma).'
];

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function seedAtec() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully.');

    // Step 1: Get base IDs
    const [tenants] = await connection.query('SELECT id_tenant FROM tenants LIMIT 1');
    if (tenants.length === 0) throw new Error('No tenants found.');
    const tenantId = tenants[0].id_tenant;

    const [fincas] = await connection.query('SELECT id_finca FROM fincas WHERE id_tenant = ?', [tenantId]);
    if (fincas.length === 0) throw new Error('No fincas found.');
    const fincaIds = fincas.map(f => f.id_finca);

    const [lotes] = await connection.query('SELECT l.id_lote, n.id_finca FROM lotes l JOIN nucleos n ON l.id_nucleo = n.id_nucleo');
    const lotesByFinca = {};
    lotes.forEach(l => {
      if (!lotesByFinca[l.id_finca]) lotesByFinca[l.id_finca] = [];
      lotesByFinca[l.id_finca].push(l.id_lote);
    });

    const [empleados] = await connection.query('SELECT id_empleado FROM rrhh_empleados WHERE id_tenant = ?', [tenantId]);
    const empleadoIds = empleados.map(e => e.id_empleado);
    if (empleadoIds.length === 0) empleadoIds.push(1); // fallback

    const [arboles] = await connection.query('SELECT a.id_arbol, n.id_finca FROM siembra_arboles a JOIN lotes l ON a.id_lote = l.id_lote JOIN nucleos n ON l.id_nucleo = n.id_nucleo');
    const arbolesByFinca = {};
    arboles.forEach(a => {
      if (!arbolesByFinca[a.id_finca]) arbolesByFinca[a.id_finca] = [];
      arbolesByFinca[a.id_finca].push(a.id_arbol);
    });

    const [insumos] = await connection.query('SELECT id_insumo FROM insumos WHERE id_tenant = ?', [tenantId]);
    const insumoIds = insumos.map(i => i.id_insumo);
    if (insumoIds.length === 0) insumoIds.push(1); // fallback

    console.log('Clearing existing ATEC data...');
    await connection.query('DELETE FROM atec_asistencia_capacitacion');
    await connection.query('DELETE FROM atec_capacitaciones');
    await connection.query('DELETE FROM atec_recomendaciones');
    await connection.query('DELETE FROM atec_visitas_tecnicas');
    await connection.query('DELETE FROM atec_recetario_enfermedades');
    await connection.query('DELETE FROM atec_visitas_arboles');

    // 1. Seed Capacitaciones (30 records over the last 6 months)
    console.log('Inserting ATEC Capacitaciones & Asistencia (30 courses)...');
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    for (let i = 0; i < 30; i++) {
      const fecha = randomDate(sixMonthsAgo, new Date());
      const tema = randomItem(temasCapacitacion);
      const instructor = 'Ing. ' + randomItem(['Carlos Mendez', 'Diana Vargas', 'Roberto Gomez', 'Andrea Salazar', 'Miguel Rojas']);
      const duracion = (Math.floor(Math.random() * 5) + 2) + (Math.random() > 0.5 ? 0.5 : 0);
      const evaluacion = (Math.random() * 1.5 + 3.5).toFixed(1); // 3.5 to 5.0
      
      const [capRes] = await connection.query(
        'INSERT INTO atec_capacitaciones (id_tenant, tema, instructor, fecha, duracion_horas, evaluacion_satisfaccion) VALUES (?, ?, ?, ?, ?, ?)',
        [tenantId, tema, instructor, fecha, duracion, evaluacion]
      );
      
      // Asistencia (5 to 15 employees per course)
      const numAsistentes = Math.min(Math.floor(Math.random() * 11) + 5, empleadoIds.length);
      const asistentesRandom = [...empleadoIds].sort(() => 0.5 - Math.random()).slice(0, numAsistentes);
      
      for (let empId of asistentesRandom) {
        const calificacion = (Math.random() * 4 + 6).toFixed(1); // 6.0 to 10.0
        const observaciones = calificacion >= 9 ? 'Excelente comprensión' : calificacion < 7 ? 'Requiere refuerzo' : 'Participación normal';
        await connection.query(
          'INSERT INTO atec_asistencia_capacitacion (id_capacitacion, id_empleado, calificacion_obtenida, observaciones) VALUES (?, ?, ?, ?)',
          [capRes.insertId, empId, calificacion, observaciones]
        );
      }
    }

    // 2. Seed Visitas Técnicas & Recomendaciones (100 records)
    console.log('Inserting ATEC Visitas Técnicas & Recomendaciones (100 visits)...');
    const tecnicos = ['Agron. Patricia Soto', 'Ing. Roberto', 'Téc. Marcos Silva', 'Ing. Diana', 'Auditor Hernan'];
    const prioridades = ['Baja', 'Media', 'Alta', 'Urgente'];
    const estadosRec = ['Pendiente', 'En_Proceso', 'Implementada', 'Descartada'];
    
    for (let i = 0; i < 100; i++) {
      const fincaId = randomItem(fincaIds);
      const loteId = lotesByFinca[fincaId] ? randomItem(lotesByFinca[fincaId]) : null;
      const tecnico = randomItem(tecnicos);
      const fecha = randomDate(sixMonthsAgo, new Date());
      const motivo = randomItem(motivosVisita);
      
      const [visitaRes] = await connection.query(
        'INSERT INTO atec_visitas_tecnicas (id_finca, id_lote, tecnico_responsable, fecha_visita, motivo, observaciones) VALUES (?, ?, ?, ?, ?, ?)',
        [fincaId, loteId, tecnico, fecha, motivo, 'Recorrido en zig-zag. ' + (Math.random() > 0.5 ? 'Condiciones de alta humedad.' : 'Déficit hídrico leve.')]
      );
      
      // Generate 1 to 3 recommendations per visit
      const numRecs = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < numRecs; j++) {
        // Bias towards recent dates being pending
        const daysAgo = (new Date() - fecha) / (1000 * 60 * 60 * 24);
        let estado = 'Implementada';
        if (daysAgo < 15) estado = randomItem(['Pendiente', 'En_Proceso', 'Implementada']);
        if (daysAgo < 5) estado = randomItem(['Pendiente', 'Pendiente', 'En_Proceso']);
        
        await connection.query(
          'INSERT INTO atec_recomendaciones (id_visita, descripcion_detallada, prioridad, estado_implementacion) VALUES (?, ?, ?, ?)',
          [visitaRes.insertId, randomItem(recomendacionesText), randomItem(prioridades), estado]
        );
      }
    }

    // 3. Seed Visitas a Árboles (Palmas) & Recetario (300 records)
    console.log('Inserting ATEC Visitas a Árboles & Recetario (300 tree inspections)...');
    const estadosSalud = ['Sano', 'Enfermo', 'Tratamiento', 'Sano', 'Sano']; // Bias to healthy
    const gravedades = ['Baja', 'Media', 'Alta', 'Critica'];
    
    for (let i = 0; i < 300; i++) {
      const fincaId = randomItem(fincaIds);
      if (!arbolesByFinca[fincaId] || arbolesByFinca[fincaId].length === 0) continue;
      
      const arbolId = randomItem(arbolesByFinca[fincaId]);
      const empId = randomItem(empleadoIds);
      const fecha = randomDate(sixMonthsAgo, new Date());
      let estadoSalud = randomItem(estadosSalud);
      
      let diagnostico = 'Palma con desarrollo vegetativo esperado.';
      if (estadoSalud !== 'Sano') {
        diagnostico = 'Presencia de síntomas compatibles con ' + randomItem(enfermedades);
      }
      
      const [arbolRes] = await connection.query(
        'INSERT INTO atec_visitas_arboles (id_tenant, id_arbol, id_empleado, fecha_visita, estado_salud_detectado, diagnostico, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [tenantId, arbolId, empId, fecha, estadoSalud, diagnostico, 'Revisión hoja 17 y 33.']
      );
      
      // If not healthy, issue a recipe
      if (estadoSalud !== 'Sano') {
        const enf = randomItem(enfermedades);
        const insumoId = randomItem(insumoIds);
        const aplicado = (new Date() - fecha) / (1000 * 60 * 60 * 24) > 10 ? 1 : (Math.random() > 0.4 ? 1 : 0);
        
        await connection.query(
          'INSERT INTO atec_recetario_enfermedades (id_tenant, id_visita_arbol, enfermedad_plaga_detectada, gravedad, receta_tratamiento, id_insumo, dosis_recomendada, fecha_aplicacion_sugerida, aplicado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            tenantId, 
            arbolRes.insertId, 
            enf, 
            randomItem(gravedades), 
            randomItem(recetasText), 
            insumoId, 
            (Math.floor(Math.random() * 50) + 10) + ' cc / palma', 
            new Date(fecha.getTime() + 2 * 24 * 60 * 60 * 1000), 
            aplicado
          ]
        );
      }
    }

    console.log('Massive Palma de Aceite Demo Data Seeded Successfully!');

  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedAtec();
