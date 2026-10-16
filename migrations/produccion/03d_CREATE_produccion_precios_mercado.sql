-- =====================================================================
-- 03d_CREATE_produccion_precios_mercado.sql
-- Inteligencia de Mercado y Análisis de Rentabilidad
-- =====================================================================
USE sas_agricolas; -- <<<--- Ejecuta todas las sentencias en la base correcta

-- Precios de mercado referenciales por producto y fecha (histórico)
CREATE TABLE prod_precios_mercado (
  id_precio_mercado    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant            INT          NOT NULL,
  id_insumo_producto   INT          NOT NULL COMMENT 'FK insumos (PT)',
  precio_unitario      DECIMAL(14,4) NOT NULL COMMENT 'Precio de mercado referencial',
  moneda               VARCHAR(5)   NOT NULL DEFAULT 'COP',
  fuente               VARCHAR(60)  NOT NULL DEFAULT 'Manual' COMMENT 'Manual, API, Bolsa, Distribuidor',
  notas                VARCHAR(255) NULL,
  vigente_desde        DATE         NOT NULL,
  vigente_hasta        DATE         NULL COMMENT 'NULL = vigente actualmente',
  creado_por           INT          NULL,
  creado_el            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_precio_mercado),
  KEY idx_precio_tenant_producto_vigencia (id_tenant, id_insumo_producto, vigente_desde),
  KEY idx_precio_tenant_activo (id_tenant, vigente_hasta),
  CONSTRAINT fk_precio_producto FOREIGN KEY (id_insumo_producto) REFERENCES insumos (id_insumo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT 'Historial de precios de mercado referenciales por producto';

-- Análisis de rentabilidad por orden (snapshot congelado en finalización)
CREATE TABLE prod_analisis_rentabilidad (
  id_rentabilidad      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant            INT          NOT NULL,
  id_orden             INT UNSIGNED NOT NULL UNIQUE,
  id_insumo_producto   INT          NOT NULL,
  cantidad_producida   DECIMAL(14,4) NOT NULL,
  unidad_medida        VARCHAR(10)  NOT NULL,
  costo_total_produccion DECIMAL(14,4) NOT NULL,
  costo_unitario       DECIMAL(14,4) NOT NULL,
  precio_mercado_unitario DECIMAL(14,4) NOT NULL COMMENT 'Tomado al momento de finalización',
  margen_bruto_unitario DECIMAL(14,4) NOT NULL COMMENT 'Precio - Costo',
  margen_bruto_total   DECIMAL(14,4) NOT NULL,
  pct_margen_bruto     DECIMAL(8,4) NOT NULL COMMENT '(Margen / Precio) * 100',
  precio_venta_real    DECIMAL(14,4) NULL COMMENT 'Si se vende a precio diferente',
  margen_real          DECIMAL(14,4) NULL,
  pct_margen_real      DECIMAL(8,4) NULL,
  estado_rentabilidad  ENUM('Rentable','Marginal','Deficitario') NOT NULL DEFAULT 'Rentable',
  analisis_json        JSON         NULL COMMENT 'Desglose detallado',
  fecha_calculo        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_rentabilidad),
  KEY idx_rent_tenant_orden (id_tenant, id_orden),
  KEY idx_rent_tenant_producto_fecha (id_tenant, id_insumo_producto, fecha_calculo),
  CONSTRAINT fk_rent_orden FOREIGN KEY (id_orden) REFERENCES prod_ordenes (id_orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT 'Análisis de rentabilidad congelado por orden de producción';

-- Histórico de consultas (carga bajo demanda)
CREATE TABLE prod_consultas_historico (
  id_consulta          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant            INT          NOT NULL,
  usuario_id           INT          NULL,
  tipo_consulta        VARCHAR(60)  NOT NULL COMMENT 'historico_producciones, analisis_rentabilidad, trazabilidad_lotes',
  filtros_aplicados    JSON         NOT NULL COMMENT 'Filtros usados en la consulta',
  cantidad_registros   INT          NOT NULL DEFAULT 0,
  tiempo_procesamiento_ms INT       NULL,
  estado_consulta      ENUM('Exitosa','Error','Pendiente','Cancelada') NOT NULL DEFAULT 'Exitosa',
  resultado_json       LONGTEXT     NULL COMMENT 'Comprimido si es muy grande',
  error_mensaje        VARCHAR(500) NULL,
  creado_el            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_consulta),
  KEY idx_consulta_tenant_tipo_fecha (id_tenant, tipo_consulta, creado_el),
  KEY idx_consulta_usuario (usuario_id, creado_el)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT 'Auditoría y caché de consultas históricas (carga bajo demanda)';

-- Parámetros de configuración por tenant
CREATE TABLE prod_config_tenant (
  id_config            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant            INT          NOT NULL UNIQUE,
  margen_minimo_rentable DECIMAL(8,4) NOT NULL DEFAULT 20 COMMENT 'Porcentaje mínimo para considerar rentable',
  habilitar_inteligencia_mercado TINYINT(1) NOT NULL DEFAULT 1,
  dias_validez_precio_mercado INT NOT NULL DEFAULT 30,
  autofinalizar_sin_consumo TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Finalizar orden incluso sin consumos reales',
  redondeo_costos      DECIMAL(4,2) NOT NULL DEFAULT 0 COMMENT 'Decimales para redondeo',
  actualizado_el       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_config),
  UNIQUE KEY uq_config_tenant (id_tenant)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT 'Parámetros de configuración por tenant';

-- Índices adicionales optimizados para Multi-Tenant
CREATE INDEX idx_prod_recetas_tenant_estado_version
  ON prod_recetas (id_tenant, estado, version_actual);

CREATE INDEX idx_prod_ordenes_tenant_finalizadas
  ON prod_ordenes (id_tenant, estado, fecha_finalizacion);

CREATE INDEX idx_prod_ordenes_tenant_producto_fecha
  ON prod_ordenes (id_tenant, id_insumo_producto, fecha_orden);

CREATE INDEX idx_prod_lotes_tenant_bodega_estado
  ON prod_lotes (id_tenant, id_bodega, estado);
