-- =====================================================================
-- 01_ALTER_existentes.sql (BORRADOR - REVISION)
-- =====================================================================
USE sas_agricolas; -- <<<--- Ejecuta todas las sentencias en la base correcta

-- Modificaciones MINIMAS sobre tablas existentes del ERP.
-- 1) insumos: clasificacion para diferenciar MP / PP / PT / Subproducto / Desperdicio.
ALTER TABLE insumos ADD COLUMN clasificacion ENUM('MateriaPrima','ProductoEnProceso','ProductoTerminado','Subproducto','Desperdicio')
 NOT NULL DEFAULT 'MateriaPrima'
 COMMENT 'Clasificacion para el modulo de Produccion',
 ADD COLUMN lote_exigido TINYINT(1) NOT NULL DEFAULT0 COMMENT 'Si =1, la MP se rastrea por lote/vencimiento desde recepcion',
 ADD COLUMN es_producible TINYINT(1) NOT NULL DEFAULT0 COMMENT 'Si =1, el insumo es salida de una receta (Producto Terminado o Subproducto)';

-- Indice por clasificacion (todas las inserciones incluyen id_tenant en el filtro).
ALTER TABLE insumos ADD INDEX idx_insumos_tenant_clasificacion (id_tenant, clasificacion);

-- 2) inv_documentos_detalle: lote y vencimiento cuando el insumo lo exige (recepcion).
ALTER TABLE inv_documentos_detalle ADD COLUMN lote VARCHAR(60) NULL COMMENT 'Lote de la MP registrado en recepcion (trazabilidad)',
 ADD COLUMN fecha_vencimiento DATE NULL COMMENT 'Vencimiento del lote registrado en recepcion';

-- 3) movimientos_inventario: vinculo opcional al lote de existencia consumido (FIFO).
ALTER TABLE movimientos_inventario ADD COLUMN id_lote_existencia INT NULL COMMENT 'FK a inv_lotes_existencia cuando el movimiento consume/produce un lote';

-- Indice compuesto para consultas de trazabilidad por lote.
ALTER TABLE movimientos_inventario ADD INDEX idx_mov_tenant_lote (id_tenant, id_lote_existencia);