-- 20230609_create_view_pesos_diarios.sql
CREATE OR REPLACE VIEW v_pesos_diarios AS
SELECT
  DATE(r.created_at) AS fecha,
  r.id_bascula,
  b.codigo,
  b.nombre,
  SUM(r.peso) AS peso_total
FROM registro_pesos r
JOIN basculas b ON b.id_bascula = r.id_bascula
GROUP BY DATE(r.created_at), r.id_bascula;
