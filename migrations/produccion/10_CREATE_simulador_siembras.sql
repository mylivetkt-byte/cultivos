CREATE TABLE IF NOT EXISTS catalogo_cultivos_variables (
  id_parametro INT AUTO_INCREMENT PRIMARY KEY,
  id_cultivo INT NOT NULL,
  distancia_surcos_m DECIMAL(5,2) DEFAULT 0,
  distancia_plantas_m DECIMAL(5,2) DEFAULT 0,
  porcentaje_germinacion DECIMAL(5,2) DEFAULT 95.0,
  costo_semilla_unitario DECIMAL(12,2) DEFAULT 0,
  costo_prep_hectarea DECIMAL(12,2) DEFAULT 0,
  costo_mantenimiento_hectarea DECIMAL(12,2) DEFAULT 0,
  precio_venta_esperado_kg DECIMAL(12,2) DEFAULT 0,
  rendimiento_esperado_kg_ha DECIMAL(12,2) DEFAULT 0,
  ciclo_dias INT DEFAULT 0,
  FOREIGN KEY (id_cultivo) REFERENCES cultivos(id_cultivo) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS presupuestos_siembra (
  id_presupuesto BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_siembra BIGINT NOT NULL,
  etapa_categoria VARCHAR(100) NOT NULL,
  costo_estimado DECIMAL(15,2) DEFAULT 0,
  costo_real DECIMAL(15,2) DEFAULT 0,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_siembra) REFERENCES siembras(id_siembra) ON DELETE CASCADE
);
