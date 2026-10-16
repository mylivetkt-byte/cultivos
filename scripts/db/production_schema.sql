-- =============================================================--1️⃣ TABLAS DE REFERENCIA (CATÁLOGOS)
-- =============================================================CREATE TABLE IF NOT EXISTS sys_tenant (
 tenant_id BINARY(16) NOT NULL PRIMARY KEY,
 nombre_comercial VARCHAR(200) NOT NULL,
 rif VARCHAR(20) UNIQUE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB;

-- Estados del proceso (catálogo)
CREATE TABLE sys_estado (
 id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 codigo VARCHAR(30) NOT NULL UNIQUE,
 nombre VARCHAR(100) NOT NULL,
 descripcion TEXT,
 categoria ENUM('GENERAL','MOVIMIENTO','DOCUMENTO','INVENTARIO') NOT NULL,
 activo TINYINT(1) DEFAULT1,
 INDEX idx_codigo (codigo)
) ENGINE=InnoDB;

INSERT INTO sys_estado (codigo, nombre, categoria, descripcion) VALUES('ACTIVO', 'Activo', 'GENERAL', 'Documento/ proceso activo'),
('BORRADOR', 'Borrador', 'DOCUMENTO', 'Documento en borrador'),
('APLICADO', 'Aplicado', 'DOCUMENTO', 'Documento aplicado'),
('ENTRADA', 'Entrada', 'MOVIMIENTO', 'Entrada de inventario'),
('SALIDA', 'Salida', 'MOVIMIENTO', 'Salida de inventario'),
('AJUSTE', 'Ajuste', 'INVENTARIO', 'Ajuste de inventario'),
('DEVOLUCION','Devolución','MOVIMIENTO','Devolución al proveedor');

-- Orígenes de insumosCREATE TABLE sys_origen_insumo (
 id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 codigo VARCHAR(30) NOT NULL UNIQUE,
 nombre VARCHAR(100) NOT NULL,
 activo TINYINT(1) DEFAULT1,
 INDEX idx_codigo (codigo)
) ENGINE=InnoDB;

INSERT INTO sys_origen_insumo (codigo, nombre) VALUES('NACIONAL', 'Nacional'),
('IMPORTADO','Importado'),
('PROPIA', 'Producción Propia');

-- Tipos de movimiento de inventarioCREATE TABLE sys_tipo_movimiento (
 id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 codigo VARCHAR(30) NOT NULL UNIQUE,
 nombre VARCHAR(50) NOT NULL,
 signo ENUM('+','-') DEFAULT '+',
 descripcion TEXT,
 activo TINYINT(1) DEFAULT1,
 INDEX idx_codigo (codigo)
) ENGINE=InnoDB;

INSERT INTO sys_tipo_movimiento (codigo, nombre, signo, descripcion) VALUES('ENTRADA','Entrada','+','Entrada de materias primas'),
('SALIDA','Salida','-','Salida de productos terminados'),
('AJUSTE','Ajuste','+','Ajuste de inventario físico'),
('DEVOLUCION','Devolución','+','Devolución al proveedor');

-- Tipos de items (producto, servicio, biofertilizante…)
CREATE TABLE sys_tipo_item (
 id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 codigo VARCHAR(30) NOT NULL UNIQUE,
 nombre VARCHAR(80) NOT NULL,
 activo TINYINT(1) DEFAULT1,
 INDEX idx_codigo (codigo)
) ENGINE=InnoDB;

INSERT INTO sys_tipo_item (codigo, nombre) VALUES('PRODUCTO','Producto terminado'),
('SERVICIO','Servicio (ej. consultoría agronómica)'),
('BIOFERTILIZANTE','Biofertilizante');

-- Unidades de medidaCREATE TABLE sys_unidad_medida (
 id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 codigo VARCHAR(10) NOT NULL UNIQUE,
 nombre VARCHAR(40) NOT NULL,
 simbolo VARCHAR(5) NOT NULL,
 tipo ENUM('PESO','VOLUMEN','CANTIDAD','LONGITUD','AREA') NOT NULL,
 activo TINYINT(1) DEFAULT1,
 INDEX idx_codigo (codigo)
) ENGINE=InnoDB;

INSERT INTO sys_unidad_medida (codigo, nombre, simbolo, tipo) VALUES('KG','Kilogramo','kg','PESO'),
('L','Litro','L','VOLUMEN'),
('UNI','Unidad','','CANTIDAD'),
('M','Metro','m','LONGITUD');

---------------------------------------------------------------------------
--2️⃣ TABLAS DE NEGOCIO (MULTI‑TENANT)---------------------------------------------------------------------------

-- Tabla de tenants (empresas/fincas)
CREATE TABLE tenants (
 tenant_id BINARY(16) NOT NULL PRIMARY KEY,
 nombre_comercial VARCHAR(200) NOT NULL,
 rif VARCHAR(20) UNIQUE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB;

-- Partición lógica por rango de fechas (ej. por año)
CREATE TABLE production_orders (
 order_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 tenant_id BINARY(16) NOT NULL,
 master_recipe_id BINARY(16) NOT NULL,
 name VARCHAR(150) NOT NULL,
 status ENUM('BORRADOR','EN_PROCESO','FINALIZADO','CANCELADO') NOT NULL DEFAULT 'BORRADOR',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PARTITION BY RANGE (TO_DAYS(created_at)) (
 PARTITION p0 VALUES LESS THAN (TO_DAYS('2025-01-01')),
 PARTITION p1 VALUES LESS THAN (TO_DAYS('2026-01-01')),
 PARTITION p2 VALUES LESS THAN MAXVALUE ) ENGINE=InnoDB;

-- Índices compuestos críticos (tenant + fecha + status) para optimizar consultas
CREATE INDEX idx_orders_tenant_date ON production_orders (tenant_id, created_at, status);
CREATE INDEX idx_orders_tenant_status ON production_orders (tenant_id, status);

-- Detalle de la orden (ingredientes, cantidades, unidad)
CREATE TABLE production_order_details (
 detail_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 order_id BIGINT UNSIGNED NOT NULL,
 ingredient_id BINARY(16) NOT NULL,
 quantity DECIMAL(15,4) NOT NULL,
 unit_id INT NOT NULL,
 description VARCHAR(100),
 INDEX idx_order_detail (order_id, ingredient_id),
 CONSTRAINT fk_detail_order FOREIGN KEY (order_id) REFERENCES production_orders(order_id) ON DELETE CASCADE,
 CONSTRAINT fk_detail_ingredient FOREIGN KEY (ingredient_id) REFERENCES master_ingredients(id)
) ENGINE=InnoDB;

-- Catálogo de recetas maestroCREATE TABLE master_recipes (
 recipe_id BINARY(16) NOT NULL PRIMARY KEY,
 tenant_id BINARY(16) NOT NULL,
 name VARCHAR(150) NOT NULL,
 description TEXT,
 version INT NOT NULL DEFAULT1,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_master_tenant (tenant_id, name)
) ENGINE=InnoDB;
CREATE INDEX idx_master_tenant_name ON master_recipes (tenant_id, name);

-- Lotes de producción (trazabilidad)
CREATE TABLE production_lots (
 lot_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 order_id BIGINT UNSIGNED NOT NULL,
 tenant_id BINARY(16) NOT NULL,
 lot_code VARCHAR(40) NOT NULL,
 expiration_date DATE NOT NULL,
 qr_code_hash CHAR(64) NOT NULL,
 parent_lot_id BIGINT UNSIGNED, -- referencia a materia prima origen (nullable)
 accrual_cost DECIMAL(15,4) NOT NULL DEFAULT0,
 status ENUM('CREADO','CONSUMIDO','VENCIDO','RETORNO') NOT NULL DEFAULT 'CREADO',
 INDEX idx_order_tenant (order_id, tenant_id),
 INDEX idx_lot_code (lot_code),
 INDEX idx_expiration (expiration_date)
) ENGINE=InnoDB;
CREATE INDEX idx_lot_tenant_code ON production_lots (tenant_id, lot_code);

-- Inventario físico por lote (bodega, cantidad, costo unitario)
CREATE TABLE inventory_lots (
 lot_existencia_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 lot_id BIGINT UNSIGNED NOT NULL,
 tenant_id BINARY(16) NOT NULL,
 id_bodega INT NOT NULL,
 lot_number VARCHAR(30) NOT NULL,
 expiration_date DATE NOT NULL,
 quantity DECIMAL(15,4) NOT NULL,
 unit_id INT NOT NULL,
 cost_unitario DECIMAL(15,4) NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_lot_number (tenant_id, lot_number),
 CONSTRAINT fk_existencia_lot FOREIGN KEY (lot_id) REFERENCES production_lots(lot_id) ON DELETE CASCADE,
 INDEX idx_tenant_lot (tenant_id, lot_number)
) ENGINE=InnoDB;

-- Comprobantes contables (asiento contable)
CREATE TABLE accounting_vouchers (
 voucher_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 tenant_id BINARY(16) NOT NULL,
 order_id BIGINT UNSIGNED NOT NULL,
 voucher_date DATE NOT NULL,
 voucher_type ENUM('DEBITO_PRODUCTO_TERMINADO','CREDITO_MATERIA_PRIMA','DEBITO_MO','CREDITO_CIF') NOT NULL,
 amount DECIMAL(15,4) NOT NULL,
 description VARCHAR(255),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_tenant_date (tenant_id, voucher_date),
 INDEX idx_order (order_id)
) ENGINE=InnoDB;

CREATE TABLE accounting_voucher_details (
 detail_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 voucher_id BIGINT UNSIGNED NOT NULL,
 account_code VARCHAR(20) NOT NULL,
 debit_amount DECIMAL(15,4) DEFAULT0,
 credit_amount DECIMAL(15,4) DEFAULT0,
 description VARCHAR(150),
 INDEX idx_voucher (voucher_id),
 INDEX idx_account (account_code)
) ENGINE=InnoDB;

-- Precio de mercado (referencial) por producto y fechaCREATE TABLE market_prices (
 price_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 tenant_id BINARY(16) NOT NULL,
 product_id BINARY(16) NOT NULL, -- referencia a master_recipes.recipe_id (producto terminado)
 price_date DATE NOT NULL,
 price_usd DECIMAL(12,4) NOT NULL,
 source_url VARCHAR(255),
 INDEX idx_product_date (product_id, price_date),
 INDEX idx_tenant_date (tenant_id, price_date)
) ENGINE=InnoDB;
CREATE INDEX idx_price_product_date ON market_prices (product_id, price_date DESC);
CREATE INDEX idx_tenant_price_date ON market_prices (tenant_id, price_date);