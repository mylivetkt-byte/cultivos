-- Migration: agregar configuracion completa de protocolo serial a basculas
ALTER TABLE basculas
  ADD COLUMN IF NOT EXISTS protocolo VARCHAR(30) DEFAULT 'continua' COMMENT 'Protocolo de comunicacion: continua, cas, magallan, torrey, personalizado',
  ADD COLUMN IF NOT EXISTS baud_rate INT DEFAULT 9600 COMMENT 'Baud rate de la conexion serial',
  ADD COLUMN IF NOT EXISTS data_bits INT DEFAULT 8 COMMENT 'Bits de datos: 7 u 8',
  ADD COLUMN IF NOT EXISTS paridad VARCHAR(10) DEFAULT 'none' COMMENT 'Paridad: none, even, odd',
  ADD COLUMN IF NOT EXISTS stop_bits INT DEFAULT 1 COMMENT 'Bits de parada: 1 o 2';
