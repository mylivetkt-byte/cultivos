const mysql = require('C:/sas-app/node_modules/mysql2/promise.js');

async function seed() {
  let activePort = 3307;
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      port: 3307,
      user: 'root',
      password: '12345',
      database: 'sas_agricolas',
      connectTimeout: 500
    });
    await conn.end();
  } catch (err) {
    activePort = 3306;
  }

  const connection = await mysql.createConnection({
    host: 'localhost',
    port: activePort,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas',
  });

  try {
    console.log('--- SEEDING TRACKING & AGRONOMY DATA ---');

    // 1. Update Lotes with Polygons
    console.log('Updating Lote 1 & Lote 2 with polygons...');
    await connection.query(`
      UPDATE lotes SET 
        poligono_gps = ST_GeomFromText('POLYGON((-73.250 10.460, -73.255 10.460, -73.255 10.465, -73.250 10.465, -73.250 10.460))'),
        centro_gps = ST_GeomFromText('POINT(-73.2525 10.4625)'),
        hectareas = 27.5
      WHERE id_lote = 1
    `);
    await connection.query(`
      UPDATE lotes SET 
        poligono_gps = ST_GeomFromText('POLYGON((-73.245 10.460, -73.250 10.460, -73.250 10.465, -73.245 10.465, -73.245 10.460))'),
        centro_gps = ST_GeomFromText('POINT(-73.2475 10.4625)'),
        hectareas = 27.5
      WHERE id_lote = 2
    `);

    // Get an employee
    const [emps] = await connection.query('SELECT id_empleado FROM rrhh_empleados LIMIT 1');
    if (emps.length === 0) {
      console.log('⚠️ No employees found. Please make sure rrhh_empleados has records.');
      return;
    }
    const empId = emps[0].id_empleado;

    // Get a vehicle and machine
    const [vehs] = await connection.query('SELECT id_vehiculo FROM vehiculos LIMIT 1');
    const vehId = vehs.length > 0 ? vehs[0].id_vehiculo : 1;

    const [maqs] = await connection.query('SELECT id_maquinaria FROM maquinaria LIMIT 1');
    const maqId = maqs.length > 0 ? maqs[0].id_maquinaria : 1;

    // 2. Clean existing records for seed safety
    await connection.query('DELETE FROM atec_recetario_enfermedades');
    await connection.query('DELETE FROM atec_visitas_arboles');
    await connection.query('DELETE FROM siembra_arboles');
    await connection.query('DELETE FROM gps_tracking_historial');
    await connection.query('DELETE FROM gps_labores_asignaciones');
    await connection.query('DELETE FROM gps_tracking_dispositivos');

    // 3. Seed Devices
    console.log('Seeding devices...');
    await connection.query(`
      INSERT INTO gps_tracking_dispositivos (id_dispositivo, id_tenant, tipo_entidad, id_entidad, identificador_gps, estado, ultima_conexion, ultima_latitud, ultima_longitud, ultima_velocidad, ultima_direccion)
      VALUES 
        (1, 1, 'Empleado', ?, 'EMP-001', 'Activo', NOW(), 10.4625, -73.2525, 4.2, 90),
        (2, 1, 'Vehiculo', ?, 'VEH-001', 'Activo', NOW(), 10.4610, -73.2510, 32.5, 180),
        (3, 1, 'Maquina', ?, 'MAQ-001', 'Activo', NOW(), 10.4645, -73.2545, 12.0, 270)
    `, [empId, vehId, maqId]);

    // 4. Seed Assignments
    console.log('Seeding assignments...');
    await connection.query(`
      INSERT INTO gps_labores_asignaciones (id_asignacion, id_tenant, tipo_entidad, id_entidad, descripcion_labor, fecha_asignacion, estado, geofence_tipo, id_lote, punto_gps, radio_metros, dentro_zona_actual)
      VALUES 
        (1, 1, 'Empleado', ?, 'Monitoreo fitosanitario lote A1', CURDATE(), 'En Progreso', 'Lote', 1, NULL, 50, 1),
        (2, 1, 'Vehiculo', ?, 'Transporte de insumos agrícolas', CURDATE(), 'En Progreso', 'Lote', 1, NULL, 50, 1),
        (3, 1, 'Maquina', ?, 'Preparación de suelo lindero norte', CURDATE(), 'En Progreso', 'Punto', NULL, ST_GeomFromText('POINT(-73.2540 10.4640)'), 80, 1)
    `, [empId, vehId, maqId]);

    // 5. Seed Trees (siembra_arboles)
    console.log('Seeding individual trees...');
    const trees = [
      { code: 'PALM-A1-001', lat: 10.4612, lng: -73.2512, health: 'Sano' },
      { code: 'PALM-A1-002', lat: 10.4615, lng: -73.2515, health: 'Enfermo' },
      { code: 'PALM-A1-003', lat: 10.4618, lng: -73.2518, health: 'Tratamiento' },
      { code: 'PALM-A1-004', lat: 10.4622, lng: -73.2522, health: 'Sano' },
      { code: 'PALM-A1-005', lat: 10.4625, lng: -73.2525, health: 'Sano' },
      { code: 'PALM-A1-006', lat: 10.4628, lng: -73.2528, health: 'Enfermo' },
      { code: 'PALM-A1-007', lat: 10.4632, lng: -73.2532, health: 'Tratamiento' },
      { code: 'PALM-A1-008', lat: 10.4635, lng: -73.2535, health: 'Sano' },
      { code: 'PALM-A1-009', lat: 10.4642, lng: -73.2542, health: 'Muerto' },
      { code: 'PALM-A1-010', lat: 10.4645, lng: -73.2545, health: 'Sano' }
    ];

    for (let i = 0; i < trees.length; i++) {
      const t = trees[i];
      await connection.query(`
        INSERT INTO siembra_arboles (id_arbol, id_tenant, id_lote, codigo_arbol, gps_punto, fecha_siembra, estado_salud, variedad, ano_siembra)
        VALUES (?, 1, 1, ?, ST_GeomFromText(?), '2023-04-15', ?, 'Palma de Aceite Híbrida OXG', 2023)
      `, [i + 1, t.code, `POINT(${t.lng} ${t.lat})`, t.health]);
    }

    // 6. Seed Visits
    console.log('Seeding agronomist tree visits...');
    await connection.query(`
      INSERT INTO atec_visitas_arboles (id_visita_arbol, id_tenant, id_arbol, id_empleado, fecha_visita, estado_salud_detectado, diagnostico, observaciones)
      VALUES 
        (1, 1, 2, ?, NOW() - INTERVAL 5 DAY, 'Enfermo', 'Presencia de Marchitez Sorpresiva', 'Hojas bajeras con coloración amarillenta pronunciada.'),
        (2, 1, 3, ?, NOW() - INTERVAL 3 DAY, 'Tratamiento', 'Ataque moderado de picudo (Rhynchophorus palmarum)', 'Se inició tratamiento de endoterapia hace 3 días.'),
        (3, 1, 6, ?, NOW() - INTERVAL 1 DAY, 'Enfermo', 'Deficiencia severa de Potasio y Magnesio', 'Presenta clorosis moteada en hojas jóvenes y viejas.')
    `, [empId, empId, empId]);

    // Get an input ID from insumos
    const [ins] = await connection.query('SELECT id_insumo FROM insumos LIMIT 1');
    const insId = ins.length > 0 ? ins[0].id_insumo : null;

    // 7. Seed Disease Recipes (atec_recetario_enfermedades)
    console.log('Seeding fitosanitario disease recipes...');
    await connection.query(`
      INSERT INTO atec_recetario_enfermedades (id_receta, id_tenant, id_visita_arbol, enfermedad_plaga_detectada, gravedad, receta_tratamiento, id_insumo, dosis_recomendada, fecha_aplicacion_sugerida, aplicado)
      VALUES 
        (1, 1, 1, 'Marchitez Sorpresiva', 'Critica', 'Aplicación por inyección al estípite de fungicida sistémico y aislamiento de drenajes.', ?, '20ml por palma', CURDATE() + INTERVAL 1 DAY, 0),
        (2, 1, 2, 'Picudo de la Palma', 'Alta', 'Colocación de trampas de feromona y aspersión dirigida al cogollo con insecticida organofosforado.', ?, '15g por litro de agua', CURDATE(), 0),
        (3, 1, 3, 'Pudrición de Cogollo (PC)', 'Media', 'Cirugía de remoción de tejido enfermo y desinfección local con pasta fúngica de cobre.', ?, '50g por corte', CURDATE() + INTERVAL 2 DAY, 0)
    `, [insId, insId, insId]);

    console.log('✅ Seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding error:', err);
  } finally {
    await connection.end();
  }
}

seed();
