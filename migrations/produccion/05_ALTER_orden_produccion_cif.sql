USE sas_agricolas;

-- Añadir columnas de desglose de costos CIF en órdenes de producción
ALTER TABLE orden_produccion ADD COLUMN costo_energia DECIMAL(14,4) NOT NULL DEFAULT 0.0000;
ALTER TABLE orden_produccion ADD COLUMN costo_agua DECIMAL(14,4) NOT NULL DEFAULT 0.0000;
ALTER TABLE orden_produccion ADD COLUMN costo_impuestos DECIMAL(14,4) NOT NULL DEFAULT 0.0000;

-- Añadir columna de teléfono de alertas en la configuración del tenant
ALTER TABLE prod_config_tenant ADD COLUMN whatsapp_alertas_telefono VARCHAR(20) NULL;
