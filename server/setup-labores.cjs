const mysql = require('C:/sas-app/node_modules/mysql2/promise.js');

async function setupLabores() {
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
    console.log(`[DB Setup] Fallback: Port 3307 not available. Using 3306.`);
    activePort = 3306;
  }

  console.log(`[DB Setup] Connecting to MySQL on port ${activePort}...`);
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: activePort,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas',
  });

  try {
    console.log('Creating table: labores_diarias...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS labores_diarias (
        id_labor INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        categoria ENUM('Personal', 'Cultivos', 'Lotes', 'Arboles', 'Riegos', 'Maquinas_Vehiculos', 'Talleres', 'Semilleros', 'Abonos', 'Cosecha') NOT NULL,
        descripcion_labor VARCHAR(255) NOT NULL,
        fecha_planificada DATE NOT NULL,
        
        -- Optional linked entities
        id_empleado INT NULL,
        id_lote INT NULL,
        id_arbol INT NULL,
        id_vehiculo INT NULL,
        id_maquinaria INT NULL,
        
        -- Auditing and completion follow-up
        estado ENUM('Planificada', 'En Progreso', 'Completada', 'Incumplida') DEFAULT 'Planificada',
        cumplimiento_observaciones TEXT NULL,
        fecha_completado DATETIME NULL,
        evaluado_por VARCHAR(100) NULL,
        
        -- Reports tracking
        reporte_enviado TINYINT(1) DEFAULT 0,
        fecha_reporte DATETIME NULL,
        
        CONSTRAINT fk_labores_tenant FOREIGN KEY (id_tenant) REFERENCES tenants(id_tenant),
        CONSTRAINT fk_labores_empleado FOREIGN KEY (id_empleado) REFERENCES rrhh_empleados(id_empleado),
        CONSTRAINT fk_labores_lote FOREIGN KEY (id_lote) REFERENCES lotes(id_lote),
        CONSTRAINT fk_labores_arbol FOREIGN KEY (id_arbol) REFERENCES siembra_arboles(id_arbol) ON DELETE CASCADE,
        CONSTRAINT fk_labores_vehiculo FOREIGN KEY (id_vehiculo) REFERENCES vehiculos(id_vehiculo),
        CONSTRAINT fk_labores_maquinaria FOREIGN KEY (id_maquinaria) REFERENCES maquinaria(id_maquinaria)
      ) ENGINE=InnoDB;
    `);

    // Clean existing seed records if run multiple times
    await connection.query('DELETE FROM labores_diarias');

    // Fetch lookups to seed realistic tasks
    const [emps] = await connection.query('SELECT id_empleado FROM rrhh_empleados LIMIT 2');
    const [lotes] = await connection.query('SELECT id_lote FROM lotes LIMIT 2');
    const [arboles] = await connection.query('SELECT id_arbol FROM siembra_arboles WHERE estado_salud = "Enfermo" LIMIT 1');
    const [vehs] = await connection.query('SELECT id_vehiculo FROM vehiculos LIMIT 1');

    const empId1 = emps.length > 0 ? emps[0].id_empleado : null;
    const empId2 = emps.length > 1 ? emps[1].id_empleado : null;
    const loteId = lotes.length > 0 ? lotes[0].id_lote : null;
    const arbolId = arboles.length > 0 ? arboles[0].id_arbol : null;
    const vehId = vehs.length > 0 ? vehs[0].id_vehiculo : null;

    console.log('Seeding initial daily labor tasks...');
    await connection.query(`
      INSERT INTO labores_diarias (id_tenant, categoria, descripcion_labor, fecha_planificada, id_empleado, id_lote, id_arbol, id_vehiculo, estado, cumplimiento_observaciones, fecha_completado, evaluado_por, reporte_enviado, fecha_reporte)
      VALUES 
        (1, 'Riegos', 'Riego por aspersión sector norte mañana', CURDATE(), ?, ?, NULL, NULL, 'Completada', 'Riego realizado en el horario programado. Humedad recuperada.', NOW(), 'Ing. Carlos Peralta', 1, NOW()),
        (1, 'Abonos', 'Mezcla y compostaje de residuos orgánicos pila B', CURDATE(), ?, NULL, NULL, NULL, 'En Progreso', NULL, NULL, NULL, 0, NULL),
        (1, 'Maquinas_Vehiculos', 'Inspección de presión hidráulica y fugas en tractor', CURDATE(), ?, ?, NULL, ?, 'Planificada', NULL, NULL, NULL, 0, NULL)
    `, [empId1, loteId, empId2, empId1, loteId, vehId]);

    if (arbolId) {
      await connection.query(`
        INSERT INTO labores_diarias (id_tenant, categoria, descripcion_labor, fecha_planificada, id_empleado, id_lote, id_arbol, estado, cumplimiento_observaciones, fecha_completado, evaluado_por, reporte_enviado, fecha_reporte)
        VALUES 
          (1, 'Arboles', 'Control fitosanitario contra Marchitez Sorpresiva', CURDATE(), ?, ?, ?, 'Planificada', NULL, NULL, NULL, 0, NULL)
      `, [empId1, loteId, arbolId]);
    }

    console.log('✅ Daily labor table and initial seeds completed successfully!');
  } catch (err) {
    console.error('❌ Setup error:', err);
  } finally {
    await connection.end();
  }
}

setupLabores();
