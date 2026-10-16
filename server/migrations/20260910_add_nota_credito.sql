-- Añadir campos para Nota de Crédito en documentos_comerciales
ALTER TABLE `documentos_comerciales` 
ADD COLUMN `id_documento_referencia` BIGINT DEFAULT NULL AFTER `observaciones`,
ADD COLUMN `motivo_referencia` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `id_documento_referencia`;
