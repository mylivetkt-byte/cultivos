-- SEEDS PARA DRONES Y AGTECH

-- 1. Catálogo
INSERT IGNORE INTO modelos_drones_catalogo (marca, modelo, categoria, autonomia_minutos, precio_ref_usd_min, precio_ref_usd_max, recomendado_para, es_flagship, activo) VALUES
('DJI', 'Mavic 3M', 'mapeo_multiespectral', 43, 4700, 6500, 'RGB 20MP + 4 bandas + RTK ⭐', 1, 1),
('DJI', 'Mavic 3T', 'termica', 45, 5500, 8000, 'térmica 640px: ganado, fugas, lagos', 0, 1),
('DJI', 'Matrice 350 RTK', 'modular', 55, 12000, 15000, 'cámaras intercambiables', 0, 1),
('Wingtra', 'WingtraOne GEN II', 'ala_fija', 60, 30000, 40000, 'VTOL, hasta 400 ha/vuelo, PPK 1-3 cm', 0, 1),
('AgEagle', 'eBee X', 'ala_fija', 90, 15000, 30000, 'sensor Duet M', 0, 1);

INSERT IGNORE INTO modelos_drones_catalogo (marca, modelo, categoria, capacidad_liquido_litros, capacidad_solido_kg, precio_ref_usd_min, precio_ref_usd_max, recomendado_para, es_flagship, activo) VALUES
('DJI', 'Agras T50', 'fumigacion', 40, 50, 28000, 45000, 'doble atomización ⭐ flagship', 1, 1),
('DJI', 'Agras T25', 'fumigacion', 20, 25, 14000, 20000, 'ideal ladera (café, aguacate)', 0, 1),
('DJI', 'Agras T40', 'fumigacion', 40, 50, 25000, 32000, 'generación anterior', 0, 1),
('XAG', 'P100 Pro', 'fumigacion', 40, 50, 20000, 26000, 'alta capacidad', 0, 1),
('XAG', 'P50', 'fumigacion', 16, 25, 10000, 14000, 'fincas medianas', 0, 1);

-- 2. Empleados de prueba
-- Aseguramos un tenant y finca base
INSERT IGNORE INTO usuarios (id_usuario, id_tenant, username, password_hash, email, nombres, apellidos, rol, activo) VALUES 
(9901, 1, 'piloto1', 'hash', 'p1@demo.com', 'Juan', 'Perez', 'Tecnico_Campo', 1),
(9902, 1, 'piloto2', 'hash', 'p2@demo.com', 'Maria', 'Gomez', 'Tecnico_Campo', 1);

INSERT IGNORE INTO rrhh_empleados (id_empleado, id_tenant, id_finca, documento, nombres, apellidos, cargo, estado) VALUES
(9901, 1, 1, '12345678', 'Juan', 'Perez', 'Piloto Dron', 'Activo'),
(9902, 1, 1, '87654321', 'Maria', 'Gomez', 'Piloto Dron', 'Activo'),
(9903, 1, 1, '11112222', 'Carlos', 'Ruiz', 'Mecánico', 'Activo'),
(9904, 1, 1, '33334444', 'Ana', 'Lopez', 'Operario', 'Activo'),
(9905, 1, 1, '55556666', 'Luis', 'Diaz', 'Operario', 'Activo'),
(9906, 1, 1, '77778888', 'Rosa', 'Mendez', 'Operario', 'Activo');

-- 3. Licencias
INSERT IGNORE INTO dron_licencias_pilotos (empleado_id, numero_licencia, fecha_vencimiento_licencia) VALUES
(9901, 'LIC-2026-001', '2026-12-31'), -- Vigente
(9902, 'LIC-2023-002', '2023-12-31'); -- Vencida

-- 4. Equipos
INSERT IGNORE INTO maquinaria (id_maquinaria, id_tenant, id_finca, codigo, nombre, tipo, estado_operativo, categoria, tenencia) VALUES
(8801, 1, 1, 'TR-01', 'Tractor John Deere', 'Tractor', 'Operativo', 'MAQUINARIA', 'PROPIO'),
(8802, 1, 1, 'CS-01', 'Cosechadora Case', 'Cosechadora', 'Operativo', 'MAQUINARIA', 'PROPIO'),
(8803, 1, 1, 'DR-01', 'DJI Mavic 3M', 'Otro', 'Operativo', 'DRON', 'PROPIO'),
(8804, 1, 1, 'DR-02', 'DJI Agras T50', 'Fumigadora', 'Operativo', 'DRON', 'ALQUILADO');

INSERT IGNORE INTO equipos_dron (equipo_id, serial_number, catalogo_modelo_id, horas_vuelo_acumuladas) VALUES
(8803, 'SN-MAVIC-001', (SELECT id FROM modelos_drones_catalogo WHERE modelo='Mavic 3M'), 15.5),
(8804, 'SN-AGRAS-002', (SELECT id FROM modelos_drones_catalogo WHERE modelo='Agras T50'), 40.0);

-- 5. Lotes, Potreros, Lagos (Demo)
INSERT IGNORE INTO lotes (id_lote, codigo, nombre, hectareas, poligono_gps) VALUES
(7701, 'L01', 'Lote Norte', 10.5, ST_GeomFromText('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))', 4326)),
(7702, 'L02', 'Lote Sur', 15.0, ST_GeomFromText('POLYGON((1 1, 1 2, 2 2, 2 1, 1 1))', 4326)),
(7703, 'L03', 'Lote Este', 20.0, ST_GeomFromText('POLYGON((2 2, 2 3, 3 3, 3 2, 2 2))', 4326));

INSERT IGNORE INTO ganado_potreros (id_potrero, id_finca, nombre, hectareas, geometria) VALUES
(6601, 1, 'Potrero Principal', 50.0, ST_GeomFromText('POLYGON((0 0, 0 5, 5 5, 5 0, 0 0))', 4326));

INSERT IGNORE INTO acuicola_lagos (id, nombre, tipo_lago, geometria) VALUES
(5501, 'Lago Central', 'lago', ST_GeomFromText('POLYGON((0 0, 0 0.5, 0.5 0.5, 0.5 0, 0 0))', 4326));

-- 6. Misiones y Análisis
INSERT IGNORE INTO dron_misiones (id, equipo_dron_id, piloto_id, lote_id, tipo, estado, fecha_programada, hora_inicio, hora_fin, duracion_minutos) VALUES
(4401, (SELECT id FROM equipos_dron WHERE serial_number='SN-MAVIC-001'), (SELECT id FROM dron_licencias_pilotos WHERE empleado_id=9901), 7701, 'mapeo_ndvi', 'completada', '2026-08-01 08:00:00', '2026-08-01 08:15:00', '2026-08-01 08:45:00', 30),
(4402, (SELECT id FROM equipos_dron WHERE serial_number='SN-MAVIC-001'), (SELECT id FROM dron_licencias_pilotos WHERE empleado_id=9901), 7701, 'mapeo_ndvi', 'completada', '2026-08-15 08:00:00', '2026-08-15 08:10:00', '2026-08-15 08:40:00', 30),
(4403, (SELECT id FROM equipos_dron WHERE serial_number='SN-MAVIC-001'), (SELECT id FROM dron_licencias_pilotos WHERE empleado_id=9901), 7701, 'mapeo_ndvi', 'completada', '2026-08-28 08:00:00', '2026-08-28 08:15:00', '2026-08-28 08:45:00', 30),
(4404, (SELECT id FROM equipos_dron WHERE serial_number='SN-AGRAS-002'), (SELECT id FROM dron_licencias_pilotos WHERE empleado_id=9901), 7702, 'fumigacion', 'completada', '2026-08-16 06:00:00', '2026-08-16 06:30:00', '2026-08-16 08:00:00', 90),
(4405, (SELECT id FROM equipos_dron WHERE serial_number='SN-AGRAS-002'), (SELECT id FROM dron_licencias_pilotos WHERE empleado_id=9901), 7703, 'fumigacion', 'programada', '2026-09-01 06:00:00', NULL, NULL, NULL);

-- 7. Análisis de imágenes
INSERT IGNORE INTO dron_analisis (mision_id, lote_id, tipo_analisis, indice_promedio, fecha_analisis) VALUES
(4401, 7701, 'ndvi', 0.65, '2026-08-01'),
(4402, 7701, 'ndvi', 0.68, '2026-08-15'),
(4403, 7701, 'ndvi', 0.72, '2026-08-28');

-- 8. Ubicaciones GPS
INSERT IGNORE INTO registro_ubicaciones (tipo_entidad, entidad_id, lat, lng, fecha_hora) VALUES
('maquinaria', 8803, 4.6097100, -74.0817500, '2026-08-28 10:00:00'),
('empleado', 9901, 4.6097200, -74.0817600, '2026-08-28 10:00:00');

-- 9. Historiales Precargados
INSERT IGNORE INTO lote_historial (lote_id, tipo_evento, fuente, referencia_id) VALUES
(7701, 'analisis_ndvi', 'dron', 4401),
(7701, 'analisis_ndvi', 'dron', 4402),
(7701, 'analisis_ndvi', 'dron', 4403),
(7702, 'aplicacion', 'dron', 4404);

INSERT IGNORE INTO potrero_historial (potrero_id, fecha, num_animales, fuente) VALUES
(6601, '2026-08-25', 120, 'dron');

INSERT IGNORE INTO lago_historial (lago_id, fecha, nivel_agua_m, fuente) VALUES
(5501, '2026-08-20', 2.5, 'manual');
