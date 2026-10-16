# Convenciones Generales del Proyecto

- **Tablas nuevas**: Automáticamente incluyen:
  `id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
  `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
  `updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP`
  `ENGINE=InnoDB, CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci`
- **Fechas y Horas**: Almacenadas en UTC, representadas en UI en America/Bogota (DD/MM/AAAA).
- **Moneda**: Dinero en COP. Catálogo de drones en USD.
- **Tipos Especiales**: JSON nativo de MySQL. Geometría: `GEOMETRY SRID 4326`, uso de `ST_GeomFromGeoJSON`/`ST_AsGeoJSON`.
- **Modificaciones de Esquema**: 
  - PROHIBIDO: `DROP TABLE`, renombrar tablas/columnas existentes, duplicar entidades ya existentes.
  - Migraciones sobre tablas existentes = solo `ADD COLUMN`.
