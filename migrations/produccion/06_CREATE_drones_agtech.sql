-- 1. MIGRACIONES ADITIVAS (ADD COLUMN) a tablas existentes
ALTER TABLE maquinaria 
ADD COLUMN categoria VARCHAR(30) DEFAULT 'MAQUINARIA',
ADD COLUMN tenencia VARCHAR(20) DEFAULT 'PROPIO';

ALTER TABLE taller_alquileres 
ADD COLUMN costo_por_ha DECIMAL(12,2) NULL,
ADD COLUMN incluye_piloto TINYINT(1) DEFAULT 1;

ALTER TABLE rrhh_empleados 
ADD COLUMN whatsapp_numero VARCHAR(20) NULL;

ALTER TABLE usuarios 
ADD COLUMN whatsapp_numero VARCHAR(20) NULL;

ALTER TABLE ganado_potreros 
ADD COLUMN geometria GEOMETRY SRID 4326 NULL;

-- 2. NUEVAS TABLAS
-- Catálogo del mercado
CREATE TABLE modelos_drones_catalogo (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    categoria VARCHAR(30) NOT NULL COMMENT 'fumigacion|mapeo_multiespectral|termica|ala_fija|modular',
    capacidad_liquido_litros DECIMAL(6,2) NULL,
    capacidad_solido_kg DECIMAL(6,2) NULL,
    autonomia_minutos INT NULL,
    sensores JSON NULL,
    precio_ref_usd_min DECIMAL(10,2) NULL,
    precio_ref_usd_max DECIMAL(10,2) NULL,
    recomendado_para TEXT NULL,
    es_flagship TINYINT(1) DEFAULT 0,
    activo TINYINT(1) DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(marca, modelo)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Extensión 1:1 de maquinaria (drones)
CREATE TABLE equipos_dron (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    equipo_id INT NOT NULL UNIQUE COMMENT 'FK a maquinaria',
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    catalogo_modelo_id BIGINT UNSIGNED NOT NULL,
    horas_vuelo_acumuladas DECIMAL(8,2) DEFAULT 0,
    area_total_trabajada_ha DECIMAL(12,2) DEFAULT 0,
    observaciones TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (equipo_id) REFERENCES maquinaria(id_maquinaria) ON DELETE CASCADE,
    FOREIGN KEY (catalogo_modelo_id) REFERENCES modelos_drones_catalogo(id) ON DELETE RESTRICT
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Licencias de pilotos (extensión de rrhh_empleados)
CREATE TABLE dron_licencias_pilotos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    empleado_id INT NOT NULL UNIQUE COMMENT 'FK a rrhh_empleados',
    numero_licencia VARCHAR(80) NOT NULL,
    autoridad_emisora VARCHAR(100) DEFAULT 'UAEAC',
    fecha_vencimiento_licencia DATE NOT NULL,
    certificaciones JSON NULL,
    estado VARCHAR(20) DEFAULT 'activo',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empleado_id) REFERENCES rrhh_empleados(id_empleado) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Misiones
CREATE TABLE dron_misiones (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    equipo_dron_id BIGINT UNSIGNED NOT NULL,
    piloto_id BIGINT UNSIGNED NOT NULL,
    lote_id INT NULL COMMENT 'FK a lotes',
    potrero_id INT NULL COMMENT 'FK a ganado_potreros',
    lago_id BIGINT NULL COMMENT 'FK a acuicola_lagos',
    tipo VARCHAR(30) NOT NULL COMMENT 'fumigacion|fertilizacion|mapeo_ndvi|mapeo_rgb|conteo_ganado|inspeccion_lago|siembra',
    estado VARCHAR(20) DEFAULT 'programada',
    fecha_programada DATETIME NOT NULL,
    hora_inicio DATETIME NULL,
    hora_fin DATETIME NULL,
    duracion_minutos INT NULL,
    area_cubierta_ha DECIMAL(10,2) NULL,
    producto_aplicado VARCHAR(150) NULL,
    cantidad_aplicada_litros DECIMAL(10,2) NULL,
    altura_vuelo_m DECIMAL(6,2) NULL,
    ruta GEOMETRY SRID 4326 NULL,
    condiciones_clima JSON NULL,
    costo_mision DECIMAL(12,2) NULL COMMENT 'COP',
    fuente_datos VARCHAR(30) DEFAULT 'manual',
    observaciones TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (equipo_dron_id) REFERENCES equipos_dron(id) ON DELETE RESTRICT,
    FOREIGN KEY (piloto_id) REFERENCES dron_licencias_pilotos(id) ON DELETE RESTRICT,
    FOREIGN KEY (lote_id) REFERENCES lotes(id_lote) ON DELETE SET NULL,
    FOREIGN KEY (potrero_id) REFERENCES ganado_potreros(id_potrero) ON DELETE SET NULL,
    FOREIGN KEY (lago_id) REFERENCES acuicola_lagos(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Análisis de imágenes
CREATE TABLE dron_analisis (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    mision_id BIGINT UNSIGNED NOT NULL,
    lote_id INT NULL,
    potrero_id INT NULL,
    lago_id BIGINT NULL,
    tipo_analisis VARCHAR(40) NOT NULL COMMENT 'ndvi|ndre|estres_hidrico|malezas|conteo_plantas|conteo_ganado|calidad_agua',
    indice_promedio DECIMAL(5,3) NULL,
    indice_min DECIMAL(5,3) NULL,
    indice_max DECIMAL(5,3) NULL,
    area_problema_ha DECIMAL(10,2) NULL,
    mapa_url TEXT NULL,
    hallazgos JSON NULL,
    fecha_analisis DATE NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (mision_id) REFERENCES dron_misiones(id) ON DELETE CASCADE,
    FOREIGN KEY (lote_id) REFERENCES lotes(id_lote) ON DELETE SET NULL,
    FOREIGN KEY (potrero_id) REFERENCES ganado_potreros(id_potrero) ON DELETE SET NULL,
    FOREIGN KEY (lago_id) REFERENCES acuicola_lagos(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Soporte de flota
CREATE TABLE dron_baterias (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    equipo_dron_id BIGINT UNSIGNED NOT NULL,
    serial VARCHAR(80) NOT NULL,
    ciclos_carga INT DEFAULT 0,
    salud_porcentaje DECIMAL(5,2) DEFAULT 100,
    estado VARCHAR(20) DEFAULT 'buena',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (equipo_dron_id) REFERENCES equipos_dron(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE dron_mantenimientos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    equipo_dron_id BIGINT UNSIGNED NOT NULL,
    tipo VARCHAR(30) NOT NULL COMMENT 'preventivo|correctivo|firmware|inspeccion',
    fecha DATE NOT NULL,
    descripcion TEXT NULL,
    costo DECIMAL(12,2) NULL COMMENT 'COP',
    realizado_por VARCHAR(150) NULL,
    horas_vuelo_registradas DECIMAL(8,2) NULL,
    proximo_mantenimiento DATE NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (equipo_dron_id) REFERENCES equipos_dron(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE dron_documentos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    equipo_dron_id BIGINT UNSIGNED NOT NULL,
    tipo VARCHAR(40) NOT NULL COMMENT 'registro_uaeac|seguro_rc|certificado_operador|manual|otro',
    archivo_url TEXT NOT NULL,
    fecha_emision DATE NULL,
    fecha_vencimiento DATE NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (equipo_dron_id) REFERENCES equipos_dron(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Historiales
CREATE TABLE lote_historial (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lote_id INT NOT NULL,
    tipo_evento VARCHAR(50) NOT NULL COMMENT 'cambio_cultivo|siembra|cosecha|aplicacion|analisis_ndvi|preparacion_suelo|otro',
    datos JSON NULL,
    fuente VARCHAR(20) DEFAULT 'manual',
    referencia_id BIGINT UNSIGNED NULL,
    usuario_id INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lote_id) REFERENCES lotes(id_lote) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE cultivo_historial_etapas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cultivo_id BIGINT NOT NULL COMMENT 'FK a cultivo_lotes(id)',
    etapa VARCHAR(60) NOT NULL COMMENT 'siembra|germinacion|crecimiento_vegetativo|floracion|llenado_grano|madurez|cosecha',
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NULL,
    indice_ndvi_promedio DECIMAL(5,3) NULL,
    observaciones TEXT NULL,
    fuente VARCHAR(30) NULL,
    creado_por INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cultivo_id) REFERENCES cultivo_lotes(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE potrero_historial (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    potrero_id INT NOT NULL,
    fecha DATE NOT NULL,
    num_animales INT NULL,
    dias_descanso INT NULL,
    estado_pasto VARCHAR(20) NULL COMMENT 'bueno|medio|bajo|sobrepastoreo',
    cobertura_vegetal_pct DECIMAL(5,2) NULL,
    fuente VARCHAR(30) NULL,
    observaciones TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (potrero_id) REFERENCES ganado_potreros(id_potrero) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE lago_historial (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lago_id BIGINT NOT NULL,
    fecha DATE NOT NULL,
    nivel_agua_m DECIMAL(6,2) NULL,
    temperatura_c DECIMAL(5,2) NULL,
    ph DECIMAL(4,2) NULL,
    oxigeno_disuelto DECIMAL(5,2) NULL,
    turbidez_ntu DECIMAL(5,2) NULL,
    fuente VARCHAR(30) NULL,
    observaciones TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lago_id) REFERENCES acuicola_lagos(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Ubicaciones GPS
CREATE TABLE registro_ubicaciones (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tipo_entidad VARCHAR(30) NOT NULL,
    entidad_id BIGINT UNSIGNED NOT NULL,
    lat DECIMAL(10,7) NOT NULL,
    lng DECIMAL(10,7) NOT NULL,
    fecha_hora DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_entidad_fecha (tipo_entidad, entidad_id, fecha_hora)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Auditoría IA
CREATE TABLE ia_conversaciones (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    canal VARCHAR(20) NOT NULL COMMENT 'whatsapp|telegram|web',
    mensaje_entrante TEXT NOT NULL,
    tools_ejecutadas JSON NULL,
    respuesta TEXT NULL,
    total_tokens INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;
