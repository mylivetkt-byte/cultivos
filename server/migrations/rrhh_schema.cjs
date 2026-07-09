const mysql = require('mysql2/promise');

async function migrate() {
  const c = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '12345',
    database: 'sas_agricolas'
  });

  console.log('Iniciando migración de RRHH...');

  try {
    // 1. Añadir campos biométricos a rrhh_empleados si no existen
    try { await c.query("ALTER TABLE rrhh_empleados ADD COLUMN biometric_id VARCHAR(255) DEFAULT NULL"); } catch(e){}
    try { await c.query("ALTER TABLE rrhh_empleados ADD COLUMN device_id VARCHAR(255) DEFAULT NULL"); } catch(e){}
    try { await c.query("ALTER TABLE rrhh_empleados ADD COLUMN huella_hash TEXT DEFAULT NULL"); } catch(e){}
    try { await c.query("ALTER TABLE rrhh_empleados ADD COLUMN iris_hash TEXT DEFAULT NULL"); } catch(e){}
    try { await c.query("ALTER TABLE rrhh_empleados ADD COLUMN area_asignada ENUM('Administrativo', 'Campo', 'Planta', 'Logistica') DEFAULT 'Campo'"); } catch(e){}
    console.log('Campos biométricos verificados en rrhh_empleados.');

    try { await c.query("ALTER TABLE rrhh_empleados ADD UNIQUE KEY ux_rrhh_empleados_documento (documento)"); } catch(e){}
    console.log('Indice unico verificado en rrhh_empleados.documento.');

    // 2. Crear tabla rrhh_novedades para vacaciones, permisos, etc.
    await c.query(`
      CREATE TABLE IF NOT EXISTS rrhh_novedades (
        id_novedad BIGINT AUTO_INCREMENT PRIMARY KEY,
        id_empleado INT NOT NULL,
        tipo_novedad ENUM('Vacaciones', 'Permiso Remunerado', 'Permiso No Remunerado', 'Incapacidad General', 'Incapacidad Laboral', 'Licencia') NOT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE NOT NULL,
        dias_totales INT NOT NULL,
        descripcion TEXT,
        estado ENUM('Pendiente', 'Aprobado', 'Rechazado') DEFAULT 'Pendiente',
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_empleado) REFERENCES rrhh_empleados(id_empleado) ON DELETE CASCADE
      )
    `);
    console.log('Tabla rrhh_novedades creada.');

    // 3. Crear tabla de resumen de planillas semanales
    await c.query(`
      CREATE TABLE IF NOT EXISTS rrhh_planillas_semanales (
        id_planilla BIGINT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL,
        semana_numero INT NOT NULL,
        anio INT NOT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE NOT NULL,
        total_salarios DECIMAL(15,2) DEFAULT 0,
        total_extras DECIMAL(15,2) DEFAULT 0,
        total_deducciones DECIMAL(15,2) DEFAULT 0,
        total_neto DECIMAL(15,2) DEFAULT 0,
        estado ENUM('Borrador', 'Revisión', 'Aprobada', 'Contabilizada') DEFAULT 'Borrador',
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla rrhh_planillas_semanales creada.');

    // 4. Modificar rrhh_control_asistencia
    await c.query(`
      CREATE TABLE IF NOT EXISTS rrhh_accesos_biometricos (
        id_acceso BIGINT AUTO_INCREMENT PRIMARY KEY,
        id_empleado INT NOT NULL,
        tipo_marcacion ENUM('Entrada', 'Salida') NOT NULL,
        metodo ENUM('Huella', 'Iris', 'PIN', 'Manual') DEFAULT 'Huella',
        timestamp_marcacion DATETIME NOT NULL,
        device_id VARCHAR(255),
        FOREIGN KEY (id_empleado) REFERENCES rrhh_empleados(id_empleado) ON DELETE CASCADE
      )
    `);
    console.log('Tabla rrhh_accesos_biometricos creada.');

    console.log('Migración completada exitosamente.');
  } catch (e) {
    console.error('Error en migración:', e);
  } finally {
    await c.end();
  }
}

migrate();
