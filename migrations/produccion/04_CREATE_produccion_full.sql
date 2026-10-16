-- =====================================================================
-- 04_CREATE_produccion_full.sql (FINAL) Multi-Tenant Agroindustrial Production
-- =====================================================================
USE sas_agricolas; -- Base de datos única para todos los tenants

-- -------------------------------------------------
-- Parámetros globales por tenant
-- -------------------------------------------------
CREATE TABLE prod_config_tenant (
  id_config INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant INT UNSIGNED NOT NULL UNIQUE,
  margen_minimo_rentable DECIMAL(8,4) NOT NULL DEFAULT 20,
  habilitar_inteligencia_mercado TINYINT(1) NOT NULL DEFAULT 1,
  dias_validez_precio_mercado INT NOT NULL DEFAULT 30,
  autofinalizar_sin_consumo TINYINT(1) NOT NULL DEFAULT 0,
  redondeo_costos DECIMAL(4,2) NOT NULL DEFAULT 0,
  actualizado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id_config),
  UNIQUE KEY uq_config_tenant (id_tenant)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Parámetros de configuración multi‑tenant';

-- -------------------------------------------------
-- Catálogo de productos terminados (Insumos) versiónados
-- -------------------------------------------------
CREATE TABLE prod_recetas (
  id_receta BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant INT UNSIGNED NOT NULL,
  codigo VARCHAR(30) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  descripcion VARCHAR(255) NULL,
  id_insumo_producto BIGINT UNSIGNED NOT NULL COMMENT 'Producto terminado (insumo)',
  unidad_medida VARCHAR(10) NOT NULL,
  version_actual INT NOT NULL DEFAULT 1,
  rendimiento_esperado DECIMAL(14,4) NULL,
  id_bodega_destino BIGINT UNSIGNED NULL,
  cif_modo ENUM('Porcentaje','Fijo') NOT NULL DEFAULT 'Porcentaje',
  cif_valor DECIMAL(12,4) NOT NULL DEFAULT 0,
  estado ENUM('Borrador','Activa','Inactiva') NOT NULL DEFAULT 'Borrador',
  creado_por BIGINT NULL,
  creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id_receta),
  UNIQUE KEY uq_receta_tenant_codigo (id_tenant, codigo),
  UNIQUE KEY uq_receta_tenant_producto (id_tenant, id_insumo_producto),
  KEY idx_receta_tenant_estado (id_tenant, estado),
  CONSTRAINT fk_receta_producto FOREIGN KEY (id_insumo_producto) REFERENCES insumos (id_insumo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Productos terminados versión‑brasil (recetas), con snapshot de spawn';

CREATE TABLE prod_receta_componentes (
  id_componente BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant INT UNSIGNED NOT NULL,
  id_receta BIGINT UNSIGNED NOT NULL,
  version INT NOT NULL,
  id_insumo BIGINT NOT NULL COMMENT 'Materia prima',
  cantidad_por_unidad DECIMAL(14,4) NOT NULL,
  unidad_medida VARCHAR(10) NOT NULL,
  costo_estandar DECIMAL(14,4) NOT NULL DEFAULT 0,
  factor_merma DECIMAL(6,4) NOT NULL DEFAULT 0,
  orden SMALLINT NOT NULL DEFAULT 0,

  PRIMARY KEY (id_componente),
  KEY idx_receta_comp_version (id_receta, version),
  KEY idx_receta_tenant_insumo (id_tenant, id_insumo),
  CONSTRAINT fk_receta_comp_receta FOREIGN KEY (id_receta) REFERENCES prod_recetas (id_receta),
  CONSTRAINT fk_receta_comp_insumo FOREIGN KEY (id_insumo) REFERENCES insumos (id_insumo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Detalle de la receta por versión para variante multi‑tenant';

-- -------------------------------------------------
-- Órdenes de producción con Snapshot de fórmula y costos
-- -------------------------------------------------
CREATE TABLE prod_ordenes (
  id_orden BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant INT UNSIGNED NOT NULL,
  codigo_orden VARCHAR(30) NOT NULL,
  id_receta BIGINT UNSIGNED NOT NULL,
  version_receta INT NOT NULL,
  id_insumo_producto BIGINT UNSIGNED NOT NULL COMMENT 'Insumo a producir',
  cantidad_ordenada DECIMAL(14,4) NOT NULL,
  unidad_medida VARCHAR(10) NOT NULL,
  id_bodega_origen BIGINT UNSIGNED NOT NULL,
  id_bodega_destino BIGINT UNSIGNED NOT NULL,
  id_finca BIGINT NULL COMMENT 'Finca que ejecuta la producción',
  id_centro_costo BIGINT NULL,
  fecha_orden DATE NOT NULL,
  estado ENUM('Borrador','Validada','En_Proceso','Finalizada','Cancelada') NOT NULL DEFAULT 'Borrador',
  formula_snapshot JSON NOT NULL COMMENT 'JSON con versión y costos de la receta',
  id_insumo_originario BIGINT NULL COMMENT 'Referencia al insumo origen (para trazabilidad FIFO)',
  cantidad_consumida DECIMAL(14,4) NULL,
  costo_materiales DECIMAL(14,4) NULL,
  costo_man_obra DECIMAL(14,4) NULL,
  costo_cif DECIMAL(14,4) NULL,
  costo_total DECIMAL(14,4) NULL,
  base_cif DECIMAL(14,4) NULL,
  cif_detalle JSON NULL,
  qr_public_token VARCHAR(64) NULL,
  fecha_finalizacion DATETIME NULL,
  creado_por BIGINT NULL,
  creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_orden),
  UNIQUE KEY uq_orden_tenant_codigo (id_tenant, codigo_orden),
  KEY idx_orden_tenant_estado_fecha (id_tenant, estado, fecha_orden),
  KEY idx_orden_tenant_finca (id_tenant, id_finca),
  KEY idx_orden_tenant_producto (id_tenant, id_insumo_producto),
  KEY idx_orden_tenant_finalizado (id_tenant, fecha_finalizacion),
  CONSTRAINT fk_orden_receta FOREIGN KEY (id_receta) REFERENCES prod_recetas (id_receta),
  CONSTRAINT fk_orden_insumo_producto FOREIGN KEY (id_insumo_producto) REFERENCES insumos (id_insumo),
  CONSTRAINT fk_orden_bodega_origen FOREIGN KEY (id_bodega_origen) REFERENCES bodegas (id_bodega),
  CONSTRAINT fk_orden_bodega_destino FOREIGN KEY (id_bodega_destino) REFERENCES bodegas (id_bodega),
  CONSTRAINT fk_orden_finca FOREIGN KEY (id_finca) REFERENCES fincas (id_finca)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Órdenes de producción con snapshot de fórmula y costos congelados';

-- -------------------------------------------------
-- Gestión de lotes y trazabilidad
-- -------------------------------------------------
CREATE TABLE prod_lotes (
  id_lote BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant INT UNSIGNED NOT NULL,
  lote_code VARCHAR(40) NOT NULL UNIQUE,
  id_insumo BIGINT UNSIGNED NOT NULL COMMENT 'Referencia al insumo (MP) o producto terminado',
  cantidad DECIMAL(14,4) NOT NULL,
  unidad_medida VARCHAR(10) NOT NULL,
  fecha_creacion DATE NOT NULL,
  fecha_vencimiento DATE NULL,
  qr_hash CHAR(64) NOT NULL COMMENT 'Hash del QR de trazabilidad',
  id_bodega BIGINT NOT NULL,
  estado ENUM('Disponible','En_Proceso','Reservado','Vencido','Retirado') NOT NULL DEFAULT 'Disponible',
  creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id_lote),
  KEY idx_lote_tenant_idbodega (id_tenant, id_bodega),
  KEY idx_lote_tenant_vencimiento (id_tenant, fecha_vencimiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Lotes de insumos o productos terminados con trazabilidad QR';

CREATE TABLE prod_movimientos_inventario (
  id_movimiento BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant INT UNSIGNED NOT NULL,
  id_lote BIGINT UNSIGNED NOT NULL,
  tipo_movimiento ENUM('ENTRADA','SALIDA','AJUSTE') NOT NULL,
  cantidad DECIMAL(14,4) NOT NULL,
  unidades_medida VARCHAR(10) NOT NULL,
  id_bodega_destino BIGINT NULL,
  referencia VARCHAR(100) NULL COMMENT 'Orden/Factura/Traslado',
  fecha_movimiento DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id_movimiento),
  KEY idx_movimientos_tenant_lote (id_tenant, id_lote),
  KEY idx_movimientos_tenant_fecha (id_tenant, fecha_movimiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Registro FIFO de movimientos de inventario';

-- -------------------------------------------------
-- Inteligencia de mercado y análisis de rentabilidad
-- -------------------------------------------------
CREATE TABLE prod_precios_mercado (
  id_precio_mercado BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant INT UNSIGNED NOT NULL,
  id_insumo_producto BIGINT UNSIGNED NOT NULL,
  precio_unitario DECIMAL(14,4) NOT NULL,
  moneda VARCHAR(5) NOT NULL DEFAULT 'COP',
  fuente VARCHAR(60) NOT NULL DEFAULT 'Manual',
  notas VARCHAR(255) NULL,
  vigente_desde DATE NOT NULL,
  vigente_hasta DATE NULL,
  creado_por BIGINT NULL,
  creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_precio_mercado),
  KEY idx_precio_tenant_producto_vigencia (id_tenant, id_insumo_producto, vigente_desde),
  KEY idx_precio_tenant_activo (id_tenant, vigente_hasta),
  CONSTRAINT fk_precio_insumo_producto FOREIGN KEY (id_insumo_producto) REFERENCES insumos (id_insumo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Precios de mercado referencial por producto y fecha (histórico)';

CREATE TABLE prod_analisis_rentabilidad (
  id_rentabilidad BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant INT UNSIGNED NOT NULL,
  id_orden BIGINT UNSIGNED NOT NULL UNIQUE,
  id_insumo_producto BIGINT UNSIGNED NOT NULL,
  cantidad_producida DECIMAL(14,4) NOT NULL,
  unidad_medida VARCHAR(10) NOT NULL,
  costo_total_produccion DECIMAL(14,4) NOT NULL,
  costo_unitario DECIMAL(14,4) NOT NULL,
  precio_mercado_unitario DECIMAL(14,4) NOT NULL,
  margen_bruto_unitario DECIMAL(14,4) NOT NULL,
  margen_bruto_total DECIMAL(14,4) NOT NULL,
  pct_margen_bruto DECIMAL(8,4) NOT NULL,
  precio_venta_real DECIMAL(14,4) NULL,
  margen_real DECIMAL(14,4) NULL,
  pct_margen_real DECIMAL(8,4) NULL,
  estado_rentabilidad ENUM('Rentable','Marginal','Deficitario') NOT NULL DEFAULT 'Rentable',
  analisis_json JSON NULL,
  fecha_calculo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id_rentabilidad),
  KEY idx_rent_tenant_orden (id_tenant, id_orden),
  KEY idx_rent_tenant_producto_fecha (id_tenant, id_insumo_producto, fecha_calculo),
  CONSTRAINT fk_rent_orden FOREIGN KEY (id_orden) REFERENCES prod_ordenes (id_orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Análisis de rentabilidad congelado por orden de producción';

-- -------------------------------------------------
-- Histórico de consultas bajo demanda
-- -------------------------------------------------
CREATE TABLE prod_consultas_historico (
  id_consulta BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant INT UNSIGNED NOT NULL,
  usuario_id BIGINT NULL,
  tipo_consulta VARCHAR(60) NOT NULL COMMENT 'historico_producciones, analisis_rentabilidad, trazabilidad_lotes',
  filtros_aplicados JSON NOT NULL,
  cantidad_registros INT NOT NULL DEFAULT 0,
  tiempo_procesamiento_ms INT NULL,
  estado_consulta ENUM('Exitosa','Error','Pendiente','Cancelada') NOT NULL DEFAULT 'Exitosa',
  resultado_json LONGTEXT NULL,
  error_mensaje VARCHAR(500) NULL,
  creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id_consulta),
  KEY idx_consulta_tenant_tipo_fecha (id_tenant, tipo_consulta, creado_el),
  KEY idx_consulta_usuario (usuario_id, creado_el)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Auditoría y caché de consultas históricas (carga bajo demanda)';

-- -------------------------------------------------
-- Comentarios finales para índices optimizados multi‑tenant
-- -------------------------------------------------
-- (Los índices ya fueron creados dentro de cada tabla según su COMMENT)