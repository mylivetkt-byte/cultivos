-- ==============================================================================
-- MIGRACIÓN FASE 1: AGRICULTURA DE PRECISIÓN - MUESTREO DE SUELOS Y LABORATORIO
-- SAS Agrícolas (AgroPacioli)
-- ==============================================================================

-- 1. Tabla de Mallas de Muestreo (Planificación y Geometría de Grilla)
CREATE TABLE IF NOT EXISTS `suelo_mallas_muestreo` (
  `id_malla` INT AUTO_INCREMENT PRIMARY KEY,
  `id_tenant` INT NOT NULL,
  `id_finca` INT NOT NULL,
  `id_lote` INT NOT NULL,
  `codigo_malla` VARCHAR(50) NOT NULL,
  `descripcion` VARCHAR(255) NULL,
  `tamano_cuadricula_m` DECIMAL(10,2) NOT NULL DEFAULT 100.00 COMMENT 'Lado de la celda en metros (ej. 100m x 100m = 1 ha)',
  `tipo_malla` ENUM('Regular', 'Dirigida_NDVI', 'Aleatoria_Estratificada') NOT NULL DEFAULT 'Regular',
  `total_puntos` INT NOT NULL DEFAULT 0,
  `fecha_plan` DATE NOT NULL,
  `estado` ENUM('Borrador', 'Planificada', 'En_Muestreo', 'Completada', 'Cancelada') NOT NULL DEFAULT 'Planificada',
  `creado_por` INT NULL,
  `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_tenant_codigo_malla` (`id_tenant`, `codigo_malla`),
  KEY `idx_malla_tenant_finca` (`id_tenant`, `id_finca`),
  KEY `idx_malla_lote` (`id_lote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla de Puntos de Muestreo Georreferenciados (Vértices y Centroides de Malla)
CREATE TABLE IF NOT EXISTS `suelo_muestreo_puntos` (
  `id_punto` INT AUTO_INCREMENT PRIMARY KEY,
  `id_tenant` INT NOT NULL,
  `id_malla` INT NOT NULL,
  `id_lote` INT NOT NULL,
  `codigo_punto` VARCHAR(50) NOT NULL COMMENT 'Ej: P01, P02, M-101-01',
  `latitud` DECIMAL(10,7) NOT NULL,
  `longitud` DECIMAL(10,7) NOT NULL,
  `geometria_punto` POINT NULL,
  `profundidad_cm` INT NOT NULL DEFAULT 30 COMMENT 'Profundidad de muestreo en cm (0-20, 0-30, etc.)',
  `submuestras_count` INT NOT NULL DEFAULT 1 COMMENT 'Cantidad de sub-muestras tomadas en zigzag para el composito',
  `estado` ENUM('Pendiente', 'Colectada', 'En_Laboratorio', 'Analizada') NOT NULL DEFAULT 'Pendiente',
  `fecha_recoleccion` DATETIME NULL,
  `id_recolector` INT NULL,
  `observaciones` TEXT NULL,
  `foto_url` VARCHAR(255) NULL,
  `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_malla_codigo_punto` (`id_malla`, `codigo_punto`),
  KEY `idx_puntos_tenant_lote` (`id_tenant`, `id_lote`),
  CONSTRAINT `fk_puntos_malla` FOREIGN KEY (`id_malla`) REFERENCES `suelo_mallas_muestreo` (`id_malla`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla de Resultados Fisicoquímicos de Laboratorio por Punto
CREATE TABLE IF NOT EXISTS `suelo_analisis_laboratorio` (
  `id_analisis` INT AUTO_INCREMENT PRIMARY KEY,
  `id_tenant` INT NOT NULL,
  `id_punto` INT NOT NULL,
  `id_lote` INT NOT NULL,
  `numero_informe` VARCHAR(100) NOT NULL,
  `laboratorio_nombre` VARCHAR(150) NOT NULL,
  `fecha_muestreo` DATE NULL,
  `fecha_analisis` DATE NOT NULL,
  `fecha_resultado` DATE NULL,
  
  -- Propiedades Físicas
  `textura_clase` VARCHAR(50) NULL COMMENT 'Arenoso, Franco, Franco-Arcilloso, Arcilloso, etc.',
  `arena_porc` DECIMAL(5,2) NULL,
  `limo_porc` DECIMAL(5,2) NULL,
  `arcilla_porc` DECIMAL(5,2) NULL,
  `densidad_aparente` DECIMAL(4,2) NULL COMMENT 'g/cm3',
  
  -- Parámetros Químicos y Fertilidad
  `ph` DECIMAL(4,2) NULL COMMENT 'Potencial de Hidrógeno en agua 1:1 o 1:2',
  `ce_ds_m` DECIMAL(6,3) NULL COMMENT 'Conductividad Eléctrica en dS/m (salinidad)',
  `materia_organica_porc` DECIMAL(5,2) NULL COMMENT '% M.O. Walkley-Black',
  `nitrogeno_total_porc` DECIMAL(5,3) NULL,
  `fosforo_ppm` DECIMAL(7,2) NULL COMMENT 'Fósforo disponible Bray II / Mehlich-3 en mg/kg',
  `potasio_meq` DECIMAL(6,3) NULL COMMENT 'K intercambiable cmol(+)/kg',
  `calcio_meq` DECIMAL(6,3) NULL COMMENT 'Ca intercambiable cmol(+)/kg',
  `magnesio_meq` DECIMAL(6,3) NULL COMMENT 'Mg intercambiable cmol(+)/kg',
  `sodio_meq` DECIMAL(6,3) NULL COMMENT 'Na intercambiable cmol(+)/kg',
  `aluminio_meq` DECIMAL(6,3) NULL COMMENT 'Al intercambiable cmol(+)/kg',
  `acidez_intercambiable` DECIMAL(6,3) NULL COMMENT 'Al + H cmol(+)/kg',
  `cic` DECIMAL(6,2) NULL COMMENT 'Capacidad de Intercambio Catiónico Efectiva (CICE) cmol(+)/kg',
  `saturacion_bases_porc` DECIMAL(5,2) NULL COMMENT '% Saturación de bases',
  `saturacion_aluminio_porc` DECIMAL(5,2) NULL COMMENT '% Saturación de aluminio',
  
  -- Micronutrientes
  `azufre_ppm` DECIMAL(7,2) NULL,
  `boro_ppm` DECIMAL(7,2) NULL,
  `zinc_ppm` DECIMAL(7,2) NULL,
  `hierro_ppm` DECIMAL(7,2) NULL,
  `manganeso_ppm` DECIMAL(7,2) NULL,
  `cobre_ppm` DECIMAL(7,2) NULL,
  
  -- Observaciones e Interpretación
  `observaciones` TEXT NULL,
  `interpretacion_agronomica` TEXT NULL,
  `archivo_informe_url` VARCHAR(255) NULL,
  `creado_por` INT NULL,
  `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_punto_informe` (`id_punto`, `numero_informe`),
  KEY `idx_analisis_tenant_lote` (`id_tenant`, `id_lote`),
  CONSTRAINT `fk_analisis_punto` FOREIGN KEY (`id_punto`) REFERENCES `suelo_muestreo_puntos` (`id_punto`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
