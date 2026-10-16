-- Migración Fase 6: Mapas de Rendimiento, Strip Trials & Evaluación de Retorno ROI
-- Fecha: 2026-10-16

CREATE TABLE IF NOT EXISTS rendimiento_mapas_cosecha (
  id_mapa INT AUTO_INCREMENT PRIMARY KEY,
  id_tenant INT NOT NULL DEFAULT 1,
  id_finca INT NOT NULL,
  id_lote INT NOT NULL,
  codigo_mapa VARCHAR(50) NOT NULL,
  nombre_cosecha VARCHAR(150) NOT NULL,
  cultivo VARCHAR(100) NOT NULL,
  fecha_cosecha DATE NOT NULL,
  total_puntos_muestreados INT NOT NULL DEFAULT 0,
  rendimiento_promedio_ton_ha DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  rendimiento_min_ton_ha DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  rendimiento_max_ton_ha DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  humedad_grano_promedio_porc DECIMAL(5,2) DEFAULT 14.00,
  archivo_origen_tipo ENUM('Monitor_Cosechadora', 'Balanza_Tolva', 'Muestreo_Manual') NOT NULL DEFAULT 'Monitor_Cosechadora',
  creado_por VARCHAR(120) NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rend_tenant_lote (id_tenant, id_lote),
  INDEX idx_rend_finca (id_finca),
  UNIQUE KEY unq_tenant_codigo_mapa (id_tenant, codigo_mapa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rendimiento_puntos_detalle (
  id_punto BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_mapa INT NOT NULL,
  latitud DECIMAL(10,8) NOT NULL,
  longitud DECIMAL(11,8) NOT NULL,
  geometria_punto POINT NOT NULL SRID 4326,
  rendimiento_kg_ha DECIMAL(8,2) NOT NULL,
  humedad_pct DECIMAL(5,2) NULL,
  velocidad_kmh DECIMAL(5,2) NULL,
  INDEX idx_rend_puntos_mapa (id_mapa),
  SPATIAL INDEX idx_rend_punto_geo (geometria_punto),
  CONSTRAINT fk_rend_punto_mapa FOREIGN KEY (id_mapa) REFERENCES rendimiento_mapas_cosecha (id_mapa) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rendimiento_strip_trials_roi (
  id_ensayo INT AUTO_INCREMENT PRIMARY KEY,
  id_tenant INT NOT NULL DEFAULT 1,
  id_finca INT NOT NULL,
  id_lote INT NOT NULL,
  codigo_ensayo VARCHAR(50) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  tratamiento_control VARCHAR(150) NOT NULL DEFAULT 'Dosis Fija Convencional',
  tratamiento_vra VARCHAR(150) NOT NULL DEFAULT 'Dosis Variable VRA',
  costo_insumo_control_ha DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  costo_insumo_vra_ha DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  rendimiento_control_ton_ha DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  rendimiento_vra_ton_ha DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  precio_venta_tonelada DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ahorro_insumos_ha DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  ingreso_adicional_ha DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  roi_neto_ha DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  fecha_evaluacion DATE NOT NULL,
  evaluador VARCHAR(120) NOT NULL,
  observaciones TEXT NULL,
  creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_trial_tenant_lote (id_tenant, id_lote),
  INDEX idx_trial_finca (id_finca),
  UNIQUE KEY unq_tenant_codigo_trial (id_tenant, codigo_ensayo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
