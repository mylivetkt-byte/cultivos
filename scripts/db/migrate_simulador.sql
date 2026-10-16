-- Fase 3: Tablas del Simulador y Variables Económicas
-- 1. Tabla de Catálogo Técnico y Diseño Espacial
CREATE TABLE IF NOT EXISTS cultivos_recetas_maestras (
    id_receta INT AUTO_INCREMENT PRIMARY KEY,
    id_cultivo INT NOT NULL,
    nombre_fase VARCHAR(100) NOT NULL,
    dia_inicio INT NOT NULL,
    descripcion_tecnica TEXT,
    url_video VARCHAR(255),
    url_pdf VARCHAR(255),
    activo TINYINT(1) DEFAULT 1,
    FOREIGN KEY (id_cultivo) REFERENCES cultivos(id_cultivo)
);

-- 2. Variables Económicas y de Mercado (Precios actuales)
CREATE TABLE IF NOT EXISTS cultivos_economia (
    id_economia INT AUTO_INCREMENT PRIMARY KEY,
    id_cultivo INT NOT NULL UNIQUE,
    precio_mercado_kilo DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    costo_promedio_hectarea DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    rendimiento_esperado_ha DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    peso_volumetrico_bulto DECIMAL(6, 2) NOT NULL DEFAULT 50.00, -- Kilos por bulto/saco estándar
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cultivo) REFERENCES cultivos(id_cultivo)
);

-- 3. Historial de Simulaciones (El "Guardado" del Wizard)
CREATE TABLE IF NOT EXISTS simulaciones_historico (
    id_simulacion INT AUTO_INCREMENT PRIMARY KEY,
    id_tenant INT NOT NULL,
    id_finca INT NOT NULL,
    id_cultivo INT NOT NULL,
    nombre_proyecto VARCHAR(150) NOT NULL,
    area_hectareas DECIMAL(10, 2) NOT NULL,
    estado ENUM('Borrador', 'En_Marcha', 'Abandonado', 'Completado') DEFAULT 'Borrador',
    costo_proyectado DECIMAL(12, 2),
    ventas_proyectadas DECIMAL(12, 2),
    ganancia_proyectada DECIMAL(12, 2),
    vehiculos_requeridos VARCHAR(255),
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_finca) REFERENCES fincas(id_finca),
    FOREIGN KEY (id_cultivo) REFERENCES cultivos(id_cultivo)
);
