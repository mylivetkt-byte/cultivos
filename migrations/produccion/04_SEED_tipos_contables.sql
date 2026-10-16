-- =====================================================================
-- 04_SEED_tipos_contables.sql (BORRADOR - REVISION)
-- =====================================================================
USE sas_agricolas; -- <<<--- Ejecuta todas las sentencias en la base correcta

-- Tipo de comprobante "Produccion" (si no existe).
INSERT IGNORE INTO tipos_comprobantes (id_tenant, codigo, nombre, naturaleza)
SELECT id, 'PROD', 'Produccion / Agroindustrial', 'Sistema'
FROM tenants
WHERE id NOT IN (
  SELECT DISTINCT id_tenant FROM tipos_comprobantes WHERE codigo = 'PROD' AND id_tenant IS NOT NULL
);

-- Tipo de documento "Produccion" (interno).
INSERT IGNORE INTO tipos_documentos (id_tenant, codigo, nombre)
SELECT id, 'P-NU', 'Numeración Producción', 'Sistema'
FROM tenants
WHERE id NOT IN (
  SELECT DISTINCT id_tenant FROM tipos_documentos WHERE codigo = 'P-NU' AND id_tenant IS NOT NULL
);

-- Cuentas por defecto (herencia a nivel tenant; sobrescritura por producto/grupo en prod_cuentas).
-- INSERT ... SELECT se documenta en la implementación, no se ejecuta en este borrador.