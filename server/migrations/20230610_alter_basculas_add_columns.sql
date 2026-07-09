-- Migration: agregar columnas faltantes a tabla basculas
ALTER TABLE basculas
  ADD COLUMN IF NOT EXISTS precision_kg DECIMAL(10,3) NULL AFTER capacidad_maxima,
  ADD COLUMN IF NOT EXISTS unidad VARCHAR(10) DEFAULT 'kg' AFTER precision_kg,
  ADD COLUMN IF NOT EXISTS tipo_conexion VARCHAR(30) DEFAULT 'manual' AFTER unidad,
  ADD COLUMN IF NOT EXISTS codigo_sensor VARCHAR(100) NULL AFTER tipo_conexion,
  ADD COLUMN IF NOT EXISTS fecha_calibracion DATE NULL AFTER codigo_sensor;
