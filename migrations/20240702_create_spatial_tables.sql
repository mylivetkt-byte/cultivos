-- 20240702_create_spatial_tables.sql
-- Spatial tables for lotes, corrales y lagos
CREATE TABLE IF NOT EXISTS cultivo_lotes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  tipo_cultivo ENUM('arroz','maiz','soja','trigo','frutos') NOT NULL,
  geometria GEOMETRY NOT NULL,
  fecha_siembra DATE NOT NULL,
  fecha_cosecha_estimada DATE,
  SPATIAL INDEX idx_geom (geometria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ganado_corrales (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  tipo_ganado ENUM('vaca','cerdo','oveja','caballo') NOT NULL,
  geometria GEOMETRY NOT NULL,
  SPATIAL INDEX idx_geom (geometria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS acuicola_lagos (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  tipo_lago ENUM('tanque','lago','charca') NOT NULL,
  geometria GEOMETRY NOT NULL,
  SPATIAL INDEX idx_geom (geometria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Trigger to calculate estimated harvest date (example: 90 days after planting for arroz)

CREATE TRIGGER trg_cultivo_lotes_estimate BEFORE INSERT ON cultivo_lotes
FOR EACH ROW
BEGIN
  IF NEW.tipo_cultivo = 'arroz' THEN
    SET NEW.fecha_cosecha_estimada = DATE_ADD(NEW.fecha_siembra, INTERVAL 90 DAY);
  ELSEIF NEW.tipo_cultivo = 'maiz' THEN
    SET NEW.fecha_cosecha_estimada = DATE_ADD(NEW.fecha_siembra, INTERVAL 110 DAY);
  ELSEIF NEW.tipo_cultivo = 'soja' THEN
    SET NEW.fecha_cosecha_estimada = DATE_ADD(NEW.fecha_siembra, INTERVAL 120 DAY);
  ELSE
    SET NEW.fecha_cosecha_estimada = NULL;
  END IF;
END

