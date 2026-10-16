-- =====================================================================
-- 03b_CREATE_produccion_lotes.sql (BORRADOR - REVISION)
-- =====================================================================
USE sas_agricolas; -- <<<--- Ejecuta todas las sentencias en la base correcta

-- Consumo REAL de materiales por orden, con lote de origen (trazabilidad FIFO).
CREATE TABLE prod_orden_materiales (
  id_orden_material   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant           INT          NOT NULL,
  id_orden            INT UNSIGNED NOT NULL,
  id_insumo           INT          NOT NULL,
  cantidad_consumida  DECIMAL(14,4) NOT NULL,
  unidad_medida       VARCHAR(10)  NOT NULL,
  costo_unitario      DECIMAL(14,4) NOT NULL DEFAULT 0,
  id_lote_existencia  INT          NULL COMMENT 'FK inv_lotes_existencia (origen FIFO)',
  lote_origen         VARCHAR(60)  NULL,
  PRIMARY KEY (id_orden_material),
  KEY idx_orden_mat_tenant_orden (id_tenant, id_orden),
  KEY idx_orden_mat_tenant_lote (id_tenant, id_lote_existencia),
  CONSTRAINT fk_orden_mat_orden FOREIGN KEY (id_orden) REFERENCES prod_ordenes (id_orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT 'Materiales consumidos por orden (trazabilidad MP -> lote)';

-- Lotes de PRODUCTO TERMINADO / SUBPRODUCTO / DESPERDICIO (todo es insumo con clasificacion).
CREATE TABLE prod_lotes (
  id_lote_prod       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant          INT          NOT NULL,
  id_orden           INT UNSIGNED NOT NULL,
  id_insumo          INT          NOT NULL COMMENT 'PT, subproducto o desperdicio (insumos)',
  lot_code           VARCHAR(60)  NOT NULL COMMENT 'Codigo de lote unico por tenant',
  cantidad           DECIMAL(14,4) NOT NULL,
  cantidad_disponible DECIMAL(14,4) NOT NULL,
  unidad_medida      VARCHAR(10)  NOT NULL,
  costo_unitario     DECIMAL(14,4) NOT NULL DEFAULT 0,
  fecha_produccion   DATE         NOT NULL,
  expiration_date    DATE         NULL,
  qr_code_hash       VARCHAR(64)  NOT NULL COMMENT 'Hash seguro (SHA-256) para trazabilidad publica',
  qr_public_token    VARCHAR(64)  NULL COMMENT 'Token publico no sensible (no expone ids ni tenant)',
  id_bodega          INT UNSIGNED NOT NULL,
  estado             ENUM('Disponible','Comprometido','Caducado','Consumido','Anulado')
                     NOT NULL DEFAULT 'Disponible',
  PRIMARY KEY (id_lote_prod),
  UNIQUE KEY uq_lote_tenant_lot (id_tenant, lot_code),
  UNIQUE KEY uq_lote_qr_hash (qr_code_hash),
  KEY idx_lote_tenant_insumo_estado (id_tenant, id_insumo, estado),
  KEY idx_lote_tenant_venc (id_tenant, expiration_date),
  KEY idx_lote_tenant_token (id_tenant, qr_public_token),
  CONSTRAINT fk_lote_orden FOREIGN KEY (id_orden) REFERENCES prod_ordenes (id_orden),
  CONSTRAINT fk_lote_insumo FOREIGN KEY (id_insumo) REFERENCES insumos (id_insumo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT 'Lotes de producto terminado/subproducto/desperdicio';