-- Migración Fase 5: Mapas de Prescripción VRA, Zonificación & Exportador a Maquinaria (ISO-XML / Shapefile)
-- Fecha: 2026-10-16

CREATE TABLE IF NOT EXISTS vra_prescripciones_maquinaria (
  id_prescripcion INT AUTO_INCREMENT PRIMARY KEY,
  id_tenant INT NOT NULL DEFAULT 1,
  id_finca INT NOT NULL,
  id_lote INT NOT NULL,
  codigo_prescripcion VARCHAR(50) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  tipo_insumo ENUM('Fertilizante_Solido', 'Fertilizante_Liquido', 'Cal_Enmienda', 'Semilla', 'Agroquimico') NOT NULL DEFAULT 'Fertilizante_Solido',
  producto_comercial VARCHAR(150) NOT NULL,
  fuente_datos ENUM('Satelital_NDVI', 'Malla_Suelos', 'Hibrido') NOT NULL DEFAULT 'Satelital_NDVI',
  formato_maquinaria ENUM('Shapefile_ESRI', 'ISO_XML_11783', 'GeoJSON_Standard', 'Trimble_Field') NOT NULL DEFAULT 'ISO_XML_11783',
  zonas_json JSON NOT NULL,
  dosis_promedio_kg_ha DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  dosis_min_kg_ha DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  dosis_max_kg_ha DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  superficie_total_ha DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  archivo_descarga_url VARCHAR(255) NULL,
  estado ENUM('Borrador', 'Aprobada', 'Cargada_Maquinaria', 'Aplicada') NOT NULL DEFAULT 'Aprobada',
  creado_por VARCHAR(120) NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vra_tenant_lote (id_tenant, id_lote),
  INDEX idx_vra_finca (id_finca),
  UNIQUE KEY unq_tenant_codigo_vra (id_tenant, codigo_prescripcion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
