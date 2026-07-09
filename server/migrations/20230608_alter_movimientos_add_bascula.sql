-- Migration: agregar columnas para báscula y peso en movimientos_inventario
ALTER TABLE movimientos_inventario
  ADD COLUMN id_bascula INT NULL,
  ADD COLUMN peso DECIMAL(15,2) NULL,
  ADD CONSTRAINT fk_mov_bascula FOREIGN KEY (id_bascula) REFERENCES basculas(id_bascula) ON DELETE RESTRICT;
