-- Tablas para el sistema de Permisos Granulares y Control Multi-Finca

CREATE TABLE IF NOT EXISTS sys_modulos (
  id_modulo INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  icono VARCHAR(50),
  orden INT DEFAULT 0,
  activo BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sys_formularios (
  id_formulario INT AUTO_INCREMENT PRIMARY KEY,
  id_modulo INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  ruta VARCHAR(255) NOT NULL,
  orden INT DEFAULT 0,
  activo BOOLEAN DEFAULT 1,
  FOREIGN KEY (id_modulo) REFERENCES sys_modulos(id_modulo) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sys_permisos_usuarios (
  id_permiso INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_formulario INT NOT NULL,
  acceder BOOLEAN DEFAULT 0,
  consultar BOOLEAN DEFAULT 0,
  nuevo BOOLEAN DEFAULT 0,
  editar BOOLEAN DEFAULT 0,
  eliminar BOOLEAN DEFAULT 0,
  imprimir BOOLEAN DEFAULT 0,
  excel BOOLEAN DEFAULT 0,
  pdf BOOLEAN DEFAULT 0,
  whatsapp BOOLEAN DEFAULT 0,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  FOREIGN KEY (id_formulario) REFERENCES sys_formularios(id_formulario) ON DELETE CASCADE,
  UNIQUE KEY unique_user_form (id_usuario, id_formulario)
);

CREATE TABLE IF NOT EXISTS sys_usuarios_fincas (
  id_usuario_finca INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_finca INT NOT NULL,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  FOREIGN KEY (id_finca) REFERENCES fincas(id_finca) ON DELETE CASCADE,
  UNIQUE KEY unique_user_finca (id_usuario, id_finca)
);

-- Poblar módulos base iniciales
INSERT IGNORE INTO sys_modulos (id_modulo, nombre, orden) VALUES
(1, 'Sistemas SAS', 10),
(2, 'Agricultura y Cultivos', 20),
(3, 'Inventario', 30),
(4, 'Compras', 40),
(5, 'RRHH & Labores', 50),
(6, 'Taller y Mantenimiento', 60),
(7, 'Aplicaciones Agrícolas', 70),
(8, 'Comercialización', 80),
(9, 'Producción y Agroindustria', 90),
(10, 'Contabilidad y Finanzas', 100);

-- Poblar algunos formularios base (los principales por ahora, el resto se pueden ir insertando desde la interfaz)
INSERT IGNORE INTO sys_formularios (id_formulario, id_modulo, nombre, ruta, orden) VALUES
(1, 1, 'Gestión de Empresas', '/sistemas/empresas', 10),
(2, 1, 'Administración de Usuarios', '/sistemas/usuarios', 15),
(3, 1, 'Estadísticas Globales', '/sistemas/estadisticas', 20),
(4, 2, 'Lotes', '/agricultura/lotes', 10),
(5, 2, 'Cosechas', '/agricultura/cosechas', 20),
(6, 3, 'Bodegas', '/inventario/bodegas', 10),
(7, 3, 'Insumos', '/inventario/insumos', 20),
(8, 8, 'POS Terminal', '/comercializacion/pos', 10);
