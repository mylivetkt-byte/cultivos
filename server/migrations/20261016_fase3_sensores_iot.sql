-- ==============================================================================
-- MIGRACIÓN FASE 3: AGRICULTURA DE PRECISIÓN - SENSORES IOT & TELEMETRÍA
-- SAS Agrícolas (AgroPacioli)
-- ==============================================================================

-- 1. Catálogo de Dispositivos y Sondas de Suelo
CREATE TABLE IF NOT EXISTS `sensores_dispositivos` (
  `id_sensor` INT AUTO_INCREMENT PRIMARY KEY,
  `id_tenant` INT NOT NULL,
  `id_finca` INT NOT NULL,
  `id_lote` INT NOT NULL,
  `codigo_sensor` VARCHAR(50) NOT NULL COMMENT 'Ej. SENS-L101-01',
  `nombre` VARCHAR(100) NOT NULL,
  `tipo_sensor` ENUM(
    'Humedad_Multinivel',
    'Estacion_Climatica',
    'Sonda_CE_pH',
    'Caudalimetro',
    'Tensiometro'
  ) NOT NULL DEFAULT 'Humedad_Multinivel',
  `marca_modelo` VARCHAR(100) NULL COMMENT 'Ej. Sentek Drill & Drop, Decagon 5TE, Davis Vantage',
  `numero_serie` VARCHAR(100) NULL,
  `latitud` DECIMAL(10,7) NOT NULL,
  `longitud` DECIMAL(10,7) NOT NULL,
  `geometria_punto` POINT NULL,
  `profundidades_cm` VARCHAR(100) NOT NULL DEFAULT '10,30,60' COMMENT 'Profundidades de lectura en cm separadas por coma',
  `umbral_estres_humedad` DECIMAL(5,2) NOT NULL DEFAULT 18.00 COMMENT '% VWC bajo el cual el cultivo entra en estrés hídrico',
  `umbral_saturacion_humedad` DECIMAL(5,2) NOT NULL DEFAULT 38.00 COMMENT '% VWC de capacidad de campo / saturación',
  `umbral_max_ce_ds_m` DECIMAL(5,2) NOT NULL DEFAULT 2.00 COMMENT 'Límite máximo de conductividad eléctrica dS/m',
  `estado` ENUM('Activo', 'Mantenimiento', 'Inactivo') NOT NULL DEFAULT 'Activo',
  `bateria_pct` INT NOT NULL DEFAULT 100,
  `fecha_instalacion` DATE NOT NULL,
  `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_tenant_codigo_sensor` (`id_tenant`, `codigo_sensor`),
  KEY `idx_sensor_tenant_finca` (`id_tenant`, `id_finca`),
  KEY `idx_sensor_lote` (`id_lote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Lecturas de Telemetría (Series de Tiempo)
CREATE TABLE IF NOT EXISTS `sensores_telemetria_lecturas` (
  `id_lectura` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `id_tenant` INT NOT NULL,
  `id_sensor` INT NOT NULL,
  `fecha_hora` DATETIME NOT NULL,
  `bateria_pct` INT NULL,
  `temperatura_suelo_c` DECIMAL(4,1) NULL,
  `humedad_10cm` DECIMAL(5,2) NULL COMMENT '% Humedad volumétrica VWC a 10cm',
  `humedad_30cm` DECIMAL(5,2) NULL COMMENT '% Humedad volumétrica VWC a 30cm (zona radicular principal)',
  `humedad_60cm` DECIMAL(5,2) NULL COMMENT '% Humedad volumétrica VWC a 60cm (profundidad de drenaje)',
  `conductividad_electrica_ds_m` DECIMAL(5,2) NULL,
  `ph_suelo` DECIMAL(4,2) NULL,
  `alerta_disparada` TINYINT(1) NOT NULL DEFAULT 0,
  `fecha_registro` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_lecturas_sensor_fecha` (`id_sensor`, `fecha_hora`),
  CONSTRAINT `fk_lecturas_sensor` FOREIGN KEY (`id_sensor`) REFERENCES `sensores_dispositivos` (`id_sensor`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Historial de Calibraciones de Sondas
CREATE TABLE IF NOT EXISTS `sensores_calibraciones` (
  `id_calibracion` INT AUTO_INCREMENT PRIMARY KEY,
  `id_tenant` INT NOT NULL,
  `id_sensor` INT NOT NULL,
  `fecha_calibracion` DATE NOT NULL,
  `tipo_suelo_calibrado` VARCHAR(50) NOT NULL COMMENT 'Ej. Franco, Arenoso, Arcilloso',
  `coeficiente_a` DECIMAL(8,4) NULL,
  `coeficiente_b` DECIMAL(8,4) NULL,
  `tecnico_responsable` VARCHAR(100) NOT NULL,
  `observaciones` TEXT NULL,
  `fecha_registro` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_calib_sensor` (`id_sensor`),
  CONSTRAINT `fk_calib_sensor` FOREIGN KEY (`id_sensor`) REFERENCES `sensores_dispositivos` (`id_sensor`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
