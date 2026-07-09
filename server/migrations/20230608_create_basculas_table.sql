-- Migration: crear tabla basculas
CREATE TABLE IF NOT EXISTS basculas (
    id_bascula INT AUTO_INCREMENT PRIMARY KEY,
    id_tenant INT NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    ubicacion VARCHAR(150),
    capacidad_maxima DECIMAL(15,2),
    activa TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
