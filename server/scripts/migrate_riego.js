import pool from '../db.js';

async function migrate() {
  try {
    console.log('Iniciando migracion de tablas de riego...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS riego_equipos_bombeo (
        id_bomba INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL DEFAULT 1,
        id_finca INT NOT NULL,
        codigo_bomba VARCHAR(50) NOT NULL,
        nombre VARCHAR(120) NOT NULL,
        tipo_bomba ENUM('Centrifuga_Superficie', 'Sumergible_Pozo_Profundo', 'Turbina_Vertical', 'Solar_Sumergible', 'Motobomba_Diesel') DEFAULT 'Centrifuga_Superficie',
        potencia_hp DECIMAL(6,2) DEFAULT 10.00,
        caudal_nominal_lps DECIMAL(8,2) DEFAULT 15.00,
        presion_nominal_bar DECIMAL(5,2) DEFAULT 4.00,
        fuente_energia ENUM('Red_Electrica', 'Generador_Diesel', 'Energia_Solar', 'Hibrido') DEFAULT 'Red_Electrica',
        estado_operativo ENUM('Apagada', 'En_Marcha', 'Falla_Presion', 'Mantenimiento') DEFAULT 'Apagada',
        fecha_instalacion DATE NULL,
        ultimo_mantenimiento DATE NULL,
        horas_acumuladas_marcha DECIMAL(10,2) DEFAULT 0.00,
        consumo_kwh_acumulado DECIMAL(12,2) DEFAULT 0.00,
        telemetria_iot_id VARCHAR(100) NULL,
        notas TEXT NULL,
        creado_el DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_bomba_tenant_codigo (id_tenant, codigo_bomba)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS riego_valvulas_solenoides (
        id_valvula INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL DEFAULT 1,
        id_sector INT NOT NULL,
        codigo_valvula VARCHAR(50) NOT NULL,
        nombre VARCHAR(120) NOT NULL,
        tipo_actuador ENUM('Solenoide_24VAC', 'Solenoide_Latch_9_12VDC', 'Hidraulica_Piloto', 'Manual_Esfera') DEFAULT 'Solenoide_24VAC',
        diametro_pulgadas DECIMAL(4,2) DEFAULT 2.00,
        estado_actual ENUM('Cerrada', 'Abierta', 'Automatica_IoT', 'En_Falla') DEFAULT 'Cerrada',
        modo_control ENUM('Manual_Campo', 'Programado_Horario', 'Sensor_Humedad_Auto', 'Remoto_App') DEFAULT 'Manual_Campo',
        apertura_actual_porc DECIMAL(5,2) DEFAULT 0.00,
        presion_entrada_bar DECIMAL(5,2) DEFAULT 0.00,
        presion_salida_bar DECIMAL(5,2) DEFAULT 0.00,
        ultima_apertura DATETIME NULL,
        ultimo_cierre DATETIME NULL,
        operada_por VARCHAR(120) NULL,
        creado_el DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_valvula_tenant_codigo (id_tenant, codigo_valvula)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS riego_turnos_campo (
        id_turno INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL DEFAULT 1,
        id_finca INT NOT NULL,
        id_lote INT NOT NULL,
        id_sector INT NOT NULL,
        codigo_turno VARCHAR(50) NOT NULL,
        responsable_nombre VARCHAR(120) NOT NULL,
        responsable_telefono VARCHAR(30) NULL,
        fecha_riego DATE NOT NULL,
        hora_inicio_programada TIME NOT NULL,
        hora_fin_programada TIME NOT NULL,
        duracion_minutos_estimada INT NOT NULL DEFAULT 60,
        volumen_objetivo_m3 DECIMAL(10,2) DEFAULT 0.00,
        estado ENUM('Pendiente', 'En_Riego', 'Completado', 'Cancelado') DEFAULT 'Pendiente',
        hora_inicio_real DATETIME NULL,
        hora_fin_real DATETIME NULL,
        volumen_real_m3 DECIMAL(10,2) NULL,
        confirmado_por VARCHAR(120) NULL,
        observaciones TEXT NULL,
        mensaje_whatsapp_enviado TINYINT(1) DEFAULT 0,
        creado_el DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_turno_tenant_codigo (id_tenant, codigo_turno)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS riego_fertirriego_recetas (
        id_receta INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL DEFAULT 1,
        id_sector INT NOT NULL,
        nombre_receta VARCHAR(150) NOT NULL,
        etapa_fenologica VARCHAR(80) NULL,
        ce_objetivo_ms_cm DECIMAL(4,2) DEFAULT 1.80,
        ph_objetivo DECIMAL(3,2) DEFAULT 5.80,
        tanque_a_formula VARCHAR(255) NULL,
        tanque_a_tasa_inyeccion_l_h DECIMAL(6,2) DEFAULT 50.00,
        tanque_b_formula VARCHAR(255) NULL,
        tanque_b_tasa_inyeccion_l_h DECIMAL(6,2) DEFAULT 50.00,
        acido_tipo VARCHAR(80) DEFAULT 'Acido Fosforico 85%',
        activo TINYINT(1) DEFAULT 1,
        creado_el DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS riego_soluciones_nutritivas_calculos (
        id_solucion INT AUTO_INCREMENT PRIMARY KEY,
        id_tenant INT NOT NULL DEFAULT 1,
        id_finca INT NOT NULL,
        id_sector INT NOT NULL,
        nombre_programa VARCHAR(150) NOT NULL,
        cultivo_nombre VARCHAR(100) NOT NULL,
        fase_fenologica VARCHAR(100) NULL,
        volumen_riego_m3 DECIMAL(10,2) NOT NULL DEFAULT 100.00,
        volumen_tanque_a_l DECIMAL(8,2) NOT NULL DEFAULT 1000.00,
        volumen_tanque_b_l DECIMAL(8,2) NOT NULL DEFAULT 1000.00,
        tasa_inyeccion_l_m3 DECIMAL(6,2) NOT NULL DEFAULT 10.00,
        ce_estimada_ms_cm DECIMAL(4,2) NULL,
        ph_estimado DECIMAL(3,2) NULL,
        requerimientos_meq_json JSON NULL,
        agua_aporte_meq_json JSON NULL,
        fertilizantes_calculados_json JSON NULL,
        tanque_a_instrucciones TEXT NULL,
        tanque_b_instrucciones TEXT NULL,
        acido_instrucciones TEXT NULL,
        creado_por VARCHAR(120) NULL,
        creado_el DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Tablas migradas exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('Error en migracion:', error);
    process.exit(1);
  }
}

migrate();
