-- ==============================================================================
-- MIGRACIÓN FASE 2: AGRICULTURA DE PRECISIÓN - GROUND TRUTHING & ANOMALÍAS
-- SAS Agrícolas (AgroPacioli)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `sat_verificaciones_campo` (
  `id_verificacion` INT AUTO_INCREMENT PRIMARY KEY,
  `id_tenant` INT NOT NULL,
  `id_finca` INT NOT NULL,
  `id_lote` INT NOT NULL,
  `id_alerta` INT NULL COMMENT 'ID opcional de sat_alertas_anomalias si la inspección responde a una alerta',
  `codigo_verificacion` VARCHAR(50) NOT NULL COMMENT 'Ej. GT-2026-001',
  `fecha_inspeccion` DATETIME NOT NULL,
  `latitud` DECIMAL(10,7) NOT NULL,
  `longitud` DECIMAL(10,7) NOT NULL,
  `geometria_punto` POINT NULL,
  `indice_observado` VARCHAR(50) NOT NULL DEFAULT 'NDVI' COMMENT 'NDVI, NDRE, GNDVI, SAVI, NDMI',
  `valor_indice_satelite` DECIMAL(5,2) NULL COMMENT 'Valor del índice satelital en el punto',
  `estado_cultivo_real` ENUM(
    'Excelente',
    'Bueno',
    'Estres_Hidrico',
    'Deficiencia_Nutricional',
    'Ataque_Plagas',
    'Enfermedad_Fungica',
    'Malezas',
    'Suelo_Desnudo'
  ) NOT NULL DEFAULT 'Bueno',
  `severidad` ENUM('Baja', 'Media', 'Alta', 'Critica') NOT NULL DEFAULT 'Media',
  `diagnostico_campo` TEXT NOT NULL COMMENT 'Descripción agronómica verificada en terreno',
  `accion_correctiva` TEXT NULL COMMENT 'Labor o receta correctiva recomendada',
  `foto_evidencia_url` VARCHAR(255) NULL,
  `id_agronomo` INT NULL,
  `estado_inspeccion` ENUM('Pendiente_Accion', 'En_Tratamiento', 'Resuelta', 'Falsa_Alarma') NOT NULL DEFAULT 'Pendiente_Accion',
  `fecha_registro` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_tenant_codigo_verif` (`id_tenant`, `codigo_verificacion`),
  KEY `idx_verif_tenant_finca` (`id_tenant`, `id_finca`),
  KEY `idx_verif_lote` (`id_lote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
