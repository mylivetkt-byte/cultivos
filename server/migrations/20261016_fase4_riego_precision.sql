-- Migración Fase 4: Manejo Hídrico de Precisión & Programación de Riego FAO-56
-- Fecha: 2026-10-16

CREATE TABLE IF NOT EXISTS riego_sectores_hidricos (
  id_sector INT AUTO_INCREMENT PRIMARY KEY,
  id_tenant INT NOT NULL DEFAULT 1,
  id_finca INT NOT NULL,
  id_lote INT NOT NULL,
  codigo_sector VARCHAR(50) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  metodo_riego ENUM('Goteo', 'Microaspersion', 'Aspersion', 'Pivote_Central', 'Gravedad_Tecnificada') NOT NULL DEFAULT 'Goteo',
  caudal_diseno_lps DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  presion_trabajo_bar DECIMAL(5,2) DEFAULT 2.00,
  espaciamiento_emisores_m DECIMAL(5,2) DEFAULT 0.50,
  espaciamiento_lineas_m DECIMAL(5,2) DEFAULT 1.50,
  caudal_emisor_lph DECIMAL(5,2) DEFAULT 2.00,
  eficiencia_aplicacion_ea_porc DECIMAL(5,2) NOT NULL DEFAULT 90.00,
  precipitacion_sistema_mm_h DECIMAL(6,2) DEFAULT 2.67,
  area_sector_ha DECIMAL(8,2) DEFAULT 1.00,
  estado ENUM('Operativo', 'Mantenimiento', 'Fuera_Servicio') NOT NULL DEFAULT 'Operativo',
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sector_tenant_lote (id_tenant, id_lote),
  INDEX idx_sector_finca (id_finca),
  UNIQUE KEY unq_tenant_codigo_sector (id_tenant, codigo_sector)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS riego_programacion_precision (
  id_programacion INT AUTO_INCREMENT PRIMARY KEY,
  id_tenant INT NOT NULL DEFAULT 1,
  id_sector INT NOT NULL,
  fecha_programada DATE NOT NULL,
  et0_mm_dia DECIMAL(6,2) NOT NULL DEFAULT 4.50,
  kc_cultivo DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  etc_mm_dia DECIMAL(6,2) NOT NULL DEFAULT 4.50,
  precipitacion_efectiva_mm DECIMAL(6,2) DEFAULT 0.00,
  agotamiento_permitido_p DECIMAL(4,2) DEFAULT 0.50,
  lamina_neta_mm DECIMAL(6,2) NOT NULL,
  lamina_bruta_mm DECIMAL(6,2) NOT NULL,
  horas_riego_calculadas DECIMAL(5,2) NOT NULL,
  volumen_total_m3 DECIMAL(10,2) NOT NULL,
  estado ENUM('Programado', 'En_Ejecucion', 'Ejecutado', 'Cancelado') NOT NULL DEFAULT 'Programado',
  ejecutado_por VARCHAR(120) NULL,
  fecha_ejecucion DATETIME NULL,
  observaciones TEXT NULL,
  creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_riego_prog_sector (id_sector),
  INDEX idx_riego_prog_fecha (fecha_programada),
  CONSTRAINT fk_riego_prog_sector FOREIGN KEY (id_sector) REFERENCES riego_sectores_hidricos (id_sector) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS riego_evaluacion_uniformidad (
  id_evaluacion INT AUTO_INCREMENT PRIMARY KEY,
  id_tenant INT NOT NULL DEFAULT 1,
  id_sector INT NOT NULL,
  fecha_ensayo DATE NOT NULL,
  presion_cabezal_bar DECIMAL(5,2) NULL,
  presion_cola_bar DECIMAL(5,2) NULL,
  numero_pluviometros INT NOT NULL DEFAULT 16,
  lecturas_volumen_ml JSON NOT NULL,
  coeficiente_christiansen_cu DECIMAL(5,2) NOT NULL,
  uniformidad_distribucion_du DECIMAL(5,2) NOT NULL,
  diagnostico VARCHAR(100) NOT NULL,
  evaluador VARCHAR(120) NOT NULL,
  observaciones TEXT NULL,
  creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_riego_eval_sector (id_sector),
  CONSTRAINT fk_riego_eval_sector FOREIGN KEY (id_sector) REFERENCES riego_sectores_hidricos (id_sector) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
