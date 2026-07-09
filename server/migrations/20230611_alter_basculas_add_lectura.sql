-- Migration: agregar configuracion de lectura serial a basculas
ALTER TABLE basculas
  ADD COLUMN IF NOT EXISTS inicio_lectura INT DEFAULT 0 COMMENT 'Posicion inicial para extraer el peso de la trama serial',
  ADD COLUMN IF NOT EXISTS longitud_lectura INT DEFAULT 10 COMMENT 'Cantidad de caracteres a leer desde inicio_lectura';
