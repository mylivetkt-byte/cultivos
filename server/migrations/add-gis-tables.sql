/* Migration: add-gis-tables.sql */
-- GIS tables for fincas, lotes, métricas satelitales y ground truth
CREATE TABLE IF NOT EXISTS fincas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  geom GEOMETRY NOT NULL,
  SPATIAL INDEX (geom)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  finca_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  geom GEOMETRY NOT NULL,
  SPATIAL INDEX (geom),
  FOREIGN KEY (finca_id) REFERENCES fincas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sat_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lote_id INT NOT NULL,
  fecha DATE NOT NULL,
  ndvi FLOAT,
  ndmi FLOAT,
  et0 FLOAT,
  FOREIGN KEY (lote_id) REFERENCES lotes(id) ON DELETE CASCADE,
  INDEX idx_lote_date (lote_id, fecha)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ground_truth (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lote_id INT NOT NULL,
  point GEOMETRY NOT NULL,
  foto_url VARCHAR(255),
  notas TEXT,
  creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lote_id) REFERENCES lotes(id) ON DELETE CASCADE,
  SPATIAL INDEX (point)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alertas_sat (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lote_id INT NOT NULL,
  tipo ENUM('ALTA','MEDIA','BAJA') NOT NULL,
  mensaje TEXT,
  creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lote_id) REFERENCES lotes(id) ON DELETE CASCADE,
  INDEX idx_lote_tipo (lote_id, tipo)
) ENGINE=InnoDB;
