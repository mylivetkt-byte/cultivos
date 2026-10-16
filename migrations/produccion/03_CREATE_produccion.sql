-- =====================================================================
-- 03_CREATE_produccion.sql (BORRADOR - REVISION)
-- =====================================================================
USE sas_agricolas; -- <<<--- Ejecuta todas las sentencias en la base correcta

-- Recetas y Ordenes de Produccion.

-- Receta maestra (versionada). El producto terminado ES un insumo (id_insumo_producto).
CREATE TABLE prod_recetas (
  id_receta            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant            INT          NOT NULL,
  codigo               VARCHAR(30)  NOT NULL,
  nombre               VARCHAR(120) NOT NULL,
  descripcion          VARCHAR(255) NULL,
  id_insumo_producto   INT          NOT NULL COMMENT 'Producto terminado/subproducto (insumos)',
  unidad_medida        VARCHAR(10)  NOT NULL,
  version_actual       INT          NOT NULL DEFAULT 1,
  rendimiento_esperado DECIMAL(14,4) NULL COMMENT 'Cantidad producida por lote/receta',
  id_bodega_destino    INT UNSIGNED NULL COMMENT 'Bodega por defecto del PT',
  cif_modo             ENUM('Porcentaje','Fijo') NOT NULL DEFAULT 'Porcentaje',
  cif_valor            DECIMAL(12,4) NOT NULL DEFAULT 0
                         COMMENT 'Pct sobre MP (Porcentaje) o valor fijo (Fijo)',
  estado               ENUM('Borrador','Activa','Inactiva') NOT NULL DEFAULT 'Borrador',
  creado_por           INT          NULL,
  creado_el            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_el       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_receta),
  UNIQUE KEY uq_receta_tenant_codigo (id_tenant, codigo),
  UNIQUE KEY uq_receta_tenant_producto (id_tenant, id_insumo_producto),
  KEY idx_receta_tenant_estado (id_tenant, estado),
  CONSTRAINT fk_receta_producto FOREIGN KEY (id_insumo_producto) REFERENCES insumos (id_insumo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT 'Recetas / formulas maestras versionadas';

-- Componentes (ingredientes) por version de receta.
CREATE TABLE prod_receta_componentes (
  id_componente       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant           INT UNSIGNED NOT NULL,
  id_receta           INT UNSIGNED NOT NULL,
  version             INT NOT NULL,
  id_insumo           INT          NOT NULL COMMENT 'Materia prima (insumos)',
  cantidad_por_unidad DECIMAL(14,4) NOT NULL COMMENT 'Cantidad de MP por 1 unidad de producto',
  unidad_medida       VARCHAR(10)  NOT NULL,
  costo_estandar      DECIMAL(14,4) NOT NULL DEFAULT 0,
  factor_merma        DECIMAL(6,4) NOT NULL DEFAULT 0 COMMENT 'Merma/desperdicio esperado (0..1)',
  orden               SMALLINT    NOT NULL DEFAULT 0,
  PRIMARY KEY (id_componente),
  KEY idx_receta_comp_version (id_receta, version),
  KEY idx_receta_tenant_insumo (id_tenant, id_insumo),
  CONSTRAINT fk_receta_comp_receta FOREIGN KEY (id_receta) REFERENCES prod_recetas (id_receta),
  CONSTRAINT fk_receta_comp_insumo FOREIGN KEY (id_insumo) REFERENCES insumos (id_insumo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT 'Ingredientes de la receta por version';

-- Orden de produccion. Contiene SNAPSHOT de formula y costos congelados.
CREATE TABLE prod_ordenes (
  id_orden             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_tenant            INT          NOT NULL,
  codigo_orden         VARCHAR(30)  NOT NULL,
  id_receta            INT UNSIGNED NOT NULL,
  version_receta       INT          NOT NULL,
  id_insumo_producto   INT          NOT NULL COMMENT 'PT a producir (insumos)',
  cantidad_ordenada    DECIMAL(14,4) NOT NULL,
  unidad_medida        VARCHAR(10)  NOT NULL,
  id_bodega_origen     INT UNSIGNED NOT NULL COMMENT 'De donde se consumen MP',
  id_bodega_destino    INT UNSIGNED NOT NULL COMMENT 'Donde ingresa el PT',
  id_finca             INT          NULL COMMENT 'Finca que ejecuta la produccion (tabla fincas existente)',
  id_centro_costo      INT          NULL,
  fecha_orden          DATE         NOT NULL,
  estado               ENUM('Borrador','Validada','En_Proceso','Finalizada','Cancelada')
                       NOT NULL DEFAULT 'Borrador',
  formula_snapshot     JSON          NOT NULL COMMENT 'Snapshot de la formula (version, componentes, costos)',
  costo_materiales     DECIMAL(14,4) NULL COMMENT 'Costo REAL de MP (lotes consumidos FIFO)',
  costo_man_obra       DECIMAL(14,4) NULL COMMENT 'MO real/manual congelada',
  costo_cif            DECIMAL(14,4) NULL COMMENT 'CIF aplicado congelado',
  costo_total          DECIMAL(14,4) NULL COMMENT 'Materiales + MO + CIF',
  base_cif             DECIMAL(14,4) NULL,
  cif_detalle          JSON         NULL COMMENT 'Criterio y componentes de CIF aplicados',
  contabilizada        TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '0 = no contabilizada,1 = ya contabilizada',
  id_comprobante_contable INT       NULL COMMENT 'FK contab_comprobantes',
  contabilizacion_json JSON         NULL COMMENT 'Snapshot del asiento (auditoria)',
  qr_public_token      VARCHAR(64)   NULL COMMENT 'Identificador publico/seguro de trazabilidad',
  fecha_finalizacion   DATETIME      NULL,
  creado_por           INT           NULL,
  creado_el            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_orden),
  UNIQUE KEY uq_orden_tenant_codigo (id_tenant, codigo_orden),
  KEY idx_orden_tenant_estado_fecha (id_tenant, estado, fecha_orden),
  KEY idx_orden_tenant_finca (id_tenant, id_finca),
  KEY idx_orden_tenant_producto (id_tenant, id_insumo_producto),
  KEY idx_orden_tenant_finalizado (id_tenant, fecha_finalizacion),
  CONSTRAINT fk_orden_receta FOREIGN KEY (id_receta) REFERENCES prod_recetas (id_receta),
  CONSTRAINT fk_orden_finca FOREIGN KEY (id_finca) REFERENCES fincas (id_finca)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT 'Ordenes de produccion (historico de costos y snapshot)';