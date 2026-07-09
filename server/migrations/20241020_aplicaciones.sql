-- Migration: agregar columnas y tablas para módulo Aplicaciones Insumos
-- 1. Extender app_recetas
ALTER TABLE app_recetas
  ADD COLUMN tipo_receta ENUM('Quimico','Organico','Mixto') NOT NULL DEFAULT 'Quimico',
  ADD COLUMN origen_insumo ENUM('Compra','Produccion','Recoleccion') NOT NULL DEFAULT 'Compra';

-- 2. Tabla para preparaciones de mezcla química
CREATE TABLE IF NOT EXISTS app_preparaciones_mezcla (
  id_preparacion INT AUTO_INCREMENT PRIMARY KEY,
  id_tenant INT NOT NULL,
  id_receta INT NOT NULL,
  lote_id INT NOT NULL,
  fecha_preparacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  producto VARCHAR(100) NOT NULL,
  cantidad_litros DECIMAL(10,2) NOT NULL,
  costo DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (id_tenant) REFERENCES tenants(id_tenant) ON DELETE CASCADE,
  FOREIGN KEY (id_receta) REFERENCES app_recetas(id_receta) ON DELETE RESTRICT,
  INDEX idx_tenant_receta (id_tenant, id_receta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabla para producción orgánica (violes, compost)
CREATE TABLE IF NOT EXISTS app_produccion_organica (
  id_produccion INT AUTO_INCREMENT PRIMARY KEY,
  id_tenant INT NOT NULL,
  lote_id INT NOT NULL,
  fecha_produccion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  producto VARCHAR(100) NOT NULL,
  cantidad_litros DECIMAL(10,2) NOT NULL,
  costo_materiales DECIMAL(12,2) NOT NULL,
  costo_jornales DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (id_tenant) REFERENCES tenants(id_tenant) ON DELETE CASCADE,
  INDEX idx_tenant_lote (id_tenant, lote_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Añadir columna a registro_aplicaciones para enlazar la sustancia final
ALTER TABLE registro_aplicaciones
  ADD COLUMN id_preparacion INT NULL,
  ADD COLUMN id_produccion INT NULL,
  ADD CONSTRAINT fk_preparacion_aplicacion FOREIGN KEY (id_preparacion) REFERENCES app_preparaciones_mezcla(id_preparacion) ON DELETE SET NULL,
  ADD CONSTRAINT fk_produccion_aplicacion FOREIGN KEY (id_produccion) REFERENCES app_produccion_organica(id_produccion) ON DELETE SET NULL;
