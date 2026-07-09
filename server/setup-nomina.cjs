// server/setup-nomina.cjs
// Run with: node server/setup-nomina.cjs
// Creates tables for the payroll (nómina) module.

const pool = require('./db');

async function run() {
  try {
    // empleados table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS empleados (
        id_empleado INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        tipo_contrato ENUM('planta','contratista','otro') NOT NULL,
        cargo VARCHAR(255),
        salario_base DECIMAL(12,2) NOT NULL,
        fecha_ingreso DATE NOT NULL,
        fecha_fin DATE,
        biometric_id VARCHAR(255),
        device_id VARCHAR(255),
        activo BOOLEAN DEFAULT TRUE,
        id_tenant VARCHAR(64) NOT NULL,
        INDEX (id_tenant)
      ) ENGINE=InnoDB;
    `);

    // contratos table (allows multiple contracts per employee over time)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contratos (
        id_contrato INT AUTO_INCREMENT PRIMARY KEY,
        id_empleado INT NOT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE,
        frecuencia_pago ENUM('semanal','quincenal','mensual') NOT NULL,
        modalidad ENUM('planta','contratista','otro') NOT NULL,
        salario DECIMAL(12,2) NOT NULL,
        id_tenant VARCHAR(64) NOT NULL,
        FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado) ON DELETE RESTRICT,
        INDEX (id_tenant)
      ) ENGINE=InnoDB;
    `);

    // conceptos de pago (ingresos y deducciones)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conceptos_pago (
        id_concepto INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        tipo ENUM('ingreso','deduccion') NOT NULL,
        formula JSON NULL COMMENT 'JSON definition for variable calculation',
        id_tenant VARCHAR(64) NOT NULL,
        INDEX (id_tenant)
      ) ENGINE=InnoDB;
    `);

    // asignaciones de labor
    await pool.query(`
      CREATE TABLE IF NOT EXISTS labor_asignada (
        id_labor INT AUTO_INCREMENT PRIMARY KEY,
        id_empleado INT NOT NULL,
        id_finca INT,
        id_nucleo INT,
        id_bodega INT,
        id_taller INT,
        descripcion TEXT,
        fecha_planificada DATE,
        fecha_real DATE,
        estado ENUM('planificada','en_progreso','completada','rechazada') DEFAULT 'planificada',
        horas_estimadas DECIMAL(5,2),
        horas_reales DECIMAL(5,2),
        id_tenant VARCHAR(64) NOT NULL,
        FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado) ON DELETE RESTRICT,
        INDEX (id_tenant)
      ) ENGINE=InnoDB;
    `);

    // asistencia (entrada/salida)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS asistencia (
        id_asistencia INT AUTO_INCREMENT PRIMARY KEY,
        id_empleado INT NOT NULL,
        timestamp_entrada DATETIME NOT NULL,
        timestamp_salida DATETIME,
        latitud DECIMAL(10,7),
        longitud DECIMAL(10,7),
        metodo ENUM('biometria','gps','manual') NOT NULL,
        id_tenant VARCHAR(64) NOT NULL,
        FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado) ON DELETE RESTRICT,
        INDEX (id_tenant),
        INDEX (timestamp_entrada)
      ) ENGINE=InnoDB;
    `);

    // planilla (pay slip) – one per contract per period
    await pool.query(`
      CREATE TABLE IF NOT EXISTS planilla (
        id_planilla INT AUTO_INCREMENT PRIMARY KEY,
        id_contrato INT NOT NULL,
        periodo_ano INT NOT NULL,
        periodo_semana INT NOT NULL,
        fecha_generacion DATE DEFAULT CURRENT_DATE,
        total_bruto DECIMAL(12,2) DEFAULT 0,
        total_deducciones DECIMAL(12,2) DEFAULT 0,
        total_neto DECIMAL(12,2) DEFAULT 0,
        estado ENUM('borrador','pendiente_aprobacion','aprobada','pagada') DEFAULT 'borrador',
        id_tenant VARCHAR(64) NOT NULL,
        FOREIGN KEY (id_contrato) REFERENCES contratos(id_contrato) ON DELETE RESTRICT,
        UNIQUE KEY uq_periodo (id_contrato, periodo_ano, periodo_semana),
        INDEX (id_tenant)
      ) ENGINE=InnoDB;
    `);

    // detalle de planilla (conceptos aplicados)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS planilla_detalle (
        id_detalle INT AUTO_INCREMENT PRIMARY KEY,
        id_planilla INT NOT NULL,
        id_concepto INT NOT NULL,
        valor DECIMAL(12,2) NOT NULL,
        descripcion TEXT,
        id_tenant VARCHAR(64) NOT NULL,
        FOREIGN KEY (id_planilla) REFERENCES planilla(id_planilla) ON DELETE CASCADE,
        FOREIGN KEY (id_concepto) REFERENCES conceptos_pago(id_concepto) ON DELETE RESTRICT,
        INDEX (id_tenant)
      ) ENGINE=InnoDB;
    `);

    // contabilidad journal (NIIF export)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contabilidad_journal (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fecha DATE NOT NULL,
        cuenta VARCHAR(64) NOT NULL,
        debe DECIMAL(12,2) DEFAULT 0,
        haber DECIMAL(12,2) DEFAULT 0,
        descripcion TEXT,
        id_tenant VARCHAR(64) NOT NULL,
        INDEX (id_tenant),
        INDEX (fecha)
      ) ENGINE=InnoDB;
    `);

    // Views / materialized aggregates (example for vacaciones y primas)
    await pool.query(`
      CREATE OR REPLACE VIEW acumulados_empleado AS
      SELECT
        e.id_empleado,
        SUM(CASE WHEN la.estado = 'completada' THEN la.horas_reales ELSE 0 END) AS horas_trabajadas,
        COUNT(CASE WHEN la.estado = 'completada' THEN 1 END) AS labores_completas,
        -- simple vacation accrual: 1.25 days per month worked
        FLOOR((SUM(CASE WHEN la.estado = 'completada' THEN la.horas_reales ELSE 0 END) / 160) * 1.25) AS dias_vacaciones_acumulados,
        -- premium accrual placeholder
        0 AS dias_prima_acumulados
      FROM empleados e
      LEFT JOIN labor_asignada la ON la.id_empleado = e.id_empleado
      WHERE e.activo = TRUE
      GROUP BY e.id_empleado;
    `);

    console.log('Payroll tables and view created/updated successfully');
  } catch (err) {
    console.error('Error creating payroll tables:', err);
  } finally {
    process.exit();
  }
}

run();
