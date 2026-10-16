-- Alter terceros to support export-specific attributes and pricing levels
ALTER TABLE `terceros` ADD COLUMN `es_comprador_extranjero` TINYINT(1) DEFAULT 0;
ALTER TABLE `terceros` ADD COLUMN `tax_id_extranjero` VARCHAR(50) DEFAULT NULL;
ALTER TABLE `terceros` ADD COLUMN `codigo_pais_destino` VARCHAR(10) DEFAULT NULL;
ALTER TABLE `terceros` ADD COLUMN `nivel_precio` ENUM('Publico', 'Detal', 'Mayor') DEFAULT 'Publico';

-- Alter documentos_comerciales to support multimoneda, logistics, and incoterms
ALTER TABLE `documentos_comerciales` ADD COLUMN `moneda` VARCHAR(3) DEFAULT 'COP';
ALTER TABLE `documentos_comerciales` ADD COLUMN `tasa_trm` DECIMAL(15,4) DEFAULT 1.0000;
ALTER TABLE `documentos_comerciales` ADD COLUMN `incoterm` VARCHAR(10) DEFAULT NULL;
ALTER TABLE `documentos_comerciales` ADD COLUMN `doc_transporte` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `documentos_comerciales` ADD COLUMN `flete_tipo` ENUM('Comprador', 'Vendedor', 'Incluido') DEFAULT 'Comprador';

-- Create documentos_comerciales_detalle for item-level details (FIFO lotes, taras, scales, etc.)
CREATE TABLE IF NOT EXISTS `documentos_comerciales_detalle` (
  `id_detalle_doc` BIGINT NOT NULL AUTO_INCREMENT,
  `id_documento` BIGINT NOT NULL,
  `id_insumo` INT DEFAULT NULL,
  `id_lote` INT DEFAULT NULL,
  `cantidad` DECIMAL(12,2) NOT NULL,
  `precio_unitario` DECIMAL(15,2) NOT NULL,
  `iva_porcentaje` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `iva_valor` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `tara` DECIMAL(10,2) DEFAULT 0.00,
  `peso_neto` DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (`id_detalle_doc`),
  KEY `id_documento` (`id_documento`),
  KEY `id_insumo` (`id_insumo`),
  KEY `id_lote` (`id_lote`),
  CONSTRAINT `fk_det_documento` FOREIGN KEY (`id_documento`) REFERENCES `documentos_comerciales` (`id_documento`) ON DELETE CASCADE,
  CONSTRAINT `fk_det_insumo` FOREIGN KEY (`id_insumo`) REFERENCES `insumos` (`id_insumo`),
  CONSTRAINT `fk_det_lote` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create pos_arqueos for cash register turn management (system vs real balance reconciliation)
CREATE TABLE IF NOT EXISTS `pos_arqueos` (
  `id_arqueo` BIGINT NOT NULL AUTO_INCREMENT,
  `id_tenant` INT NOT NULL,
  `id_usuario` INT NOT NULL,
  `fecha_apertura` DATETIME NOT NULL,
  `fecha_cierre` DATETIME DEFAULT NULL,
  `saldo_inicial` DECIMAL(15,2) NOT NULL,
  `saldo_final_sistema` DECIMAL(15,2) DEFAULT 0.00,
  `saldo_final_real` DECIMAL(15,2) DEFAULT 0.00,
  `diferencia` DECIMAL(15,2) DEFAULT 0.00,
  `estado` ENUM('Abierta', 'Cerrada') NOT NULL DEFAULT 'Abierta',
  PRIMARY KEY (`id_arqueo`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `fk_arq_tenant` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `fk_arq_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
