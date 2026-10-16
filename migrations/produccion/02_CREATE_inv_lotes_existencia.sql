-- =====================================================================
-- 02_CREATE_inv_lotes_existencia.sql (BORRADOR - REVISION)
-- =====================================================================
USE sas_agricolas; -- <<<--- Ejecuta todas las sentencias en la base correcta

CREATE TABLE inv_lotes_existencia (
  id_lote_existencia   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant            INT NOT NULL,
  id_insumo            INT NOT NULL,
  id_bodega            INT NOT NULL,
  lote                 VARCHAR(60) NOT NULL,
  fecha_vencimiento    DATE NULL,
  cantidad             DECIMAL(14,4) NOT NULL DEFAULT 0,
  costo_unitario       DECIMAL(14,4) NOT NULL DEFAULT 0,
  id_documento_detalle INT NULL COMMENT 'Origen (recepcion) si aplica',
  estado               ENUM('Disponible','Parcial','Agotado','Caducado') NOT NULL DEFAULT 'Disponible',
  creado_por           INT NULL,
  creado_el            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_lote_existencia),
  UNIQUE KEY uq_inv_lote_tenant (id_tenant, lote),
  KEY idx_inv_lotes_tenant_insumo_estado (id_tenant, id_insumo, estado),
  KEY idx_inv_lotes_tenant_bodega_venc (id_tenant, id_bodega, fecha_vencimiento),
  KEY idx_inv_lotes_tenant_documento (id_tenant, id_documento_detalle),
  CONSTRAINT fk_inv_lotes_insumo FOREIGN KEY (id_insumo) REFERENCES insumos (id_insumo),
  CONSTRAINT fk_inv_lotes_bodega FOREIGN KEY (id_bodega) REFERENCES bod_bodegas (id_bodega)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT 'Stock fisico por lote de MP (trazabilidad, FIFO)';