-- Migration: add logo_path to config_empresa table
-- File generated on 2026-06-18

ALTER TABLE config_empresa
  ADD COLUMN logo_path VARCHAR(255) NULL COMMENT 'Ruta local del archivo de logo para reportes';
