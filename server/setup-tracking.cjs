const mysql = require('C:/sas-app/node_modules/mysql2/promise.js');

async function setupTables() {
  // Resolve MySQL Port dynamically
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
    // 1. gps_tracking_dispositivos
    console.log('Creating table: gps_tracking_dispositivos...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS gps_tracking_dispositivos (
        id_dispositivo INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        tipo_entidad ENUM('Empleado', 'Maquina', 'Vehiculo') NOT NULL,
        id_entidad INT NOT NULL,
        identificador_gps VARCHAR(50) NOT NULL UNIQUE,
        estado ENUM('Activo', 'Inactivo') DEFAULT 'Activo',
        ultima_conexion DATETIME NULL,
        ultima_latitud DECIMAL(10, 8) NULL,
        ultima_longitud DECIMAL(11, 8) NULL,
        ultima_velocidad DECIMAL(5, 2) DEFAULT 0.00,
        ultima_direccion INT DEFAULT 0,
        CONSTRAINT fk_tracking_tenant FOREIGN KEY (id_tenant) REFERENCES tenants(id_tenant)
      ) ENGINE=InnoDB;
    `);

    // 2. gps_labores_asignaciones
    console.log('Creating table: gps_labores_asignaciones...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS gps_labores_asignaciones (
        id_asignacion INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        tipo_entidad ENUM('Empleado', 'Maquina', 'Vehiculo') NOT NULL,
        id_entidad INT NOT NULL,
        descripcion_labor VARCHAR(250) NOT NULL,
        fecha_asignacion DATE NOT NULL,
        estado ENUM('Pendiente', 'En Progreso', 'Completada', 'Incumplida') DEFAULT 'Pendiente',
        geofence_tipo ENUM('Punto', 'Lote') NOT NULL,
        id_lote INT NULL,
        punto_gps POINT NULL,
        radio_metros INT DEFAULT 50,
        dentro_zona_actual TINYINT(1) DEFAULT 0,
        CONSTRAINT fk_asignaciones_tenant FOREIGN KEY (id_tenant) REFERENCES tenants(id_tenant),
        CONSTRAINT fk_asignaciones_lote FOREIGN KEY (id_lote) REFERENCES lotes(id_lote)
      ) ENGINE=InnoDB;
    `);

    // 3. gps_tracking_historial
    console.log('Creating table: gps_tracking_historial...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS gps_tracking_historial (
        id_log BIGINT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        id_dispositivo INT NOT NULL,
        fecha_hora DATETIME NOT NULL,
        latitud DECIMAL(10, 8) NOT NULL,
        longitud DECIMAL(11, 8) NOT NULL,
        coordenadas_punto POINT NOT NULL,
        velocidad DECIMAL(5, 2) DEFAULT 0.00,
        direccion INT DEFAULT 0,
        dentro_zona TINYINT(1) DEFAULT 0,
        SPATIAL INDEX(coordenadas_punto),
        CONSTRAINT fk_historial_tenant FOREIGN KEY (id_tenant) REFERENCES tenants(id_tenant),
        CONSTRAINT fk_historial_dispositivo FOREIGN KEY (id_dispositivo) REFERENCES gps_tracking_dispositivos(id_dispositivo) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 4. siembra_arboles
    console.log('Creating table: siembra_arboles...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS siembra_arboles (
        id_arbol INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        id_lote INT NOT NULL,
        codigo_arbol VARCHAR(50) NOT NULL,
        gps_punto POINT NOT NULL,
        fecha_siembra DATE NULL,
        estado_salud ENUM('Sano', 'Enfermo', 'Tratamiento', 'Muerto', 'Desaparecido') DEFAULT 'Sano',
        variedad VARCHAR(50) NULL,
        ano_siembra INT NULL,
        SPATIAL INDEX(gps_punto),
        CONSTRAINT fk_arboles_tenant FOREIGN KEY (id_tenant) REFERENCES tenants(id_tenant),
        CONSTRAINT fk_arboles_lote FOREIGN KEY (id_lote) REFERENCES lotes(id_lote)
      ) ENGINE=InnoDB;
    `);

    // 5. atec_visitas_arboles
    console.log('Creating table: atec_visitas_arboles...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS atec_visitas_arboles (
        id_visita_arbol BIGINT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        id_arbol INT NOT NULL,
        id_empleado INT NOT NULL,
        fecha_visita DATETIME NOT NULL,
        estado_salud_detectado ENUM('Sano', 'Enfermo', 'Tratamiento', 'Muerto') NOT NULL,
        diagnostico VARCHAR(250) NULL,
        observaciones TEXT NULL,
        CONSTRAINT fk_visitas_arbol_tenant FOREIGN KEY (id_tenant) REFERENCES tenants(id_tenant),
        CONSTRAINT fk_visitas_arbol_arbol FOREIGN KEY (id_arbol) REFERENCES siembra_arboles(id_arbol) ON DELETE CASCADE,
        CONSTRAINT fk_visitas_arbol_empleado FOREIGN KEY (id_empleado) REFERENCES rrhh_empleados(id_empleado)
      ) ENGINE=InnoDB;
    `);

    // 6. atec_recetario_enfermedades
    console.log('Creating table: atec_recetario_enfermedades...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS atec_recetario_enfermedades (
        id_receta INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        id_visita_arbol BIGINT NOT NULL,
        enfermedad_plaga_detectada VARCHAR(150) NOT NULL,
        gravedad ENUM('Baja', 'Media', 'Alta', 'Critica') DEFAULT 'Media',
        receta_tratamiento TEXT NOT NULL,
        id_insumo INT NULL,
        dosis_recomendada VARCHAR(100) NULL,
        fecha_aplicacion_sugerida DATE NULL,
        aplicado TINYINT(1) DEFAULT 0,
        CONSTRAINT fk_recetas_tenant FOREIGN KEY (id_tenant) REFERENCES tenants(id_tenant),
        CONSTRAINT fk_recetas_visita FOREIGN KEY (id_visita_arbol) REFERENCES atec_visitas_arboles(id_visita_arbol) ON DELETE CASCADE,
        CONSTRAINT fk_recetas_insumo FOREIGN KEY (id_insumo) REFERENCES insumos(id_insumo)
      ) ENGINE=InnoDB;
    `);

    console.log('✅ All tracking & agronomy tables created successfully!');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    await connection.end();
  }
}

setupTables();
