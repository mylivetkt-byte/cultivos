-- =====================================================================
-- 03c_CREATE_produccion_costos_cuentas_precios.sql (BORRADOR - REVISION)
-- =====================================================================
USE sas_agricolas; -- <<<--- Ejecuta todas las sentencias en la base correcta

-- Mano de obra de la orden: manual/real ahora + integración futura RRHH/cuadrillas.
CREATE TABLE prod_orden_mano_obra (
  id_mo              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant          INT          NOT NULL,
  id_orden           INT UNSIGNED NOT NULL,
  origen               ENUM('Manual','IntegracionRRHH') NOT NULL DEFAULT 'Manual',
  concepto           VARCHAR(120) NOT NULL,
  id_empleado        INT          NULL COMMENT 'FK rrhh_empleados (integracion futura)',
  id_cuadrilla       INT          NULL,
  horas              DECIMAL(8,2) NULL,
  valor_hora         DECIMAL(12,4) NULL,
  total              DECIMAL(14,4) NOT NULL DEFAULT 0,
  fecha              DATE         NOT NULL,
  PRIMARY KEY (id_mo),
  KEY idx_orden_mo_tenant_orden (id_tenant, id_orden),
  CONSTRAINT fk_orden_mo_orden FOREIGN KEY (id_orden) REFERENCES prod_ordenes (id_orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT 'Mano de obra por orden (historico congelado>';

-- Parametrizacion contable por producto con HERENCIA (producto > categoria/grupo > tenant).
CREATE TABLE prod_cuentas (
  id_prod_cuenta     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant          INT          NOT NULL,
  id_insumo_producto INT          NULL COMMENT 'NULL = herencia (categoria o tenant)',
  id_grupo           INT          NULL COMMENT 'Herencia por categoria (inv_grupos)',
  id_cuenta_pt       INT          NOT NULL COMMENT 'FK plan_contable: inventario PT (Debito)',
  id_cuenta_mp       INT          NOT NULL COMMENT 'Consumo materias primas (Credito)',
  id_cuenta_mo       INT          NOT NULL COMMENT 'Mano de obra (Credito)',
  id_cuenta_cif      INT          NOT NULL COMMENT 'CIF (Credito)',
  PRIMARY KEY (id_prod_cuenta),
  UNIQUE KEY uq_prod_cuenta_config (id_tenant, id_insumo_producto, id_grupo),
  CONSTRAINT fk_prod_cuenta_pt FOREIGN KEY (id_cuenta_pt) REFERENCES plan_contable (id_cuenta),
  CONSTRAINT fk_prod_cuenta_mp FOREIGN KEY (id_cuenta_mp) REFERENCES plan_contable (id_cuenta),
  CONSTRAINT fk_prod_cuenta_mo FOREIGN KEY (id_cuenta_mo) REFERENCES plan_contable (id_cuenta),
  CONSTRAINT fk_prod_cuenta_cif FOREIGN KEY (id_cuenta_cif) REFERENCES plan_contable (id_cuenta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT 'Cuentas contables por producto (herencia producto>grupo>tenant>';

-- NOTA: prod_precios_mercado (Inteligencia de Mercado) queda EXCLUIDA de esta migracion.
-- Se implementará como módulo futuro (margen y utilidad se calcularán por ahora contra un precio referencial configurable en la capa de presentación).