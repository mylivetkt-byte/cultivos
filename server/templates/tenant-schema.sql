-- Tenant schema template for SAS Agricolass
-- Generated: 2026-06-09T22:34:08.851Z
-- Tables: 284

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `abonos_cxc` (
  `id_abono` bigint NOT NULL AUTO_INCREMENT,
  `id_cxc` bigint NOT NULL,
  `fecha_abono` date NOT NULL,
  `valor_abono` decimal(15,2) NOT NULL,
  `forma_pago` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referencia` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_abono`),
  KEY `id_cxc` (`id_cxc`),
  CONSTRAINT `abonos_cxc_ibfk_1` FOREIGN KEY (`id_cxc`) REFERENCES `cartera_cxc` (`id_cxc`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `actividades_mantenimiento_preventivo` (
  `id_actividad_plan` int NOT NULL AUTO_INCREMENT,
  `id_plan` int NOT NULL,
  `nombre` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `orden_ejecucion` int DEFAULT '1',
  `tiempo_estimado_minutos` int DEFAULT NULL,
  `herramientas_necesarias` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `piezas_reemplazo_necesarias` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `instrucciones_seguridad` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_actividad_plan`),
  KEY `id_plan` (`id_plan`),
  CONSTRAINT `actividades_mantenimiento_preventivo_ibfk_1` FOREIGN KEY (`id_plan`) REFERENCES `planes_mantenimiento_preventivo` (`id_plan`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `actividades_tipo` (
  `id_tipo_actividad` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` enum('Preparacion','Siembra','Mantenimiento','Fitosanitario','Fertilizacion','Riego','Cosecha','Postcosecha','Gasto_General','Gasto_Administrativo','Mantenimiento_Preventivo','Mantenimiento_Correctivo') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `unidad_medida` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `costo_unitario_estimado` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id_tipo_actividad`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `nucleos` (
  `id_nucleo` int NOT NULL AUTO_INCREMENT,
  `id_finca` int NOT NULL,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_nucleo`),
  UNIQUE KEY `uq_nucleos_codigo_finca` (`id_finca`,`codigo`),
  UNIQUE KEY `uq_nucleos_nombre_finca` (`id_finca`,`nombre`),
  KEY `id_finca` (`id_finca`),
  CONSTRAINT `nucleos_ibfk_1` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `parcelas` (
  `id_parcela` int NOT NULL AUTO_INCREMENT,
  `id_nucleo` int NOT NULL,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `area` decimal(12,2) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_parcela`),
  UNIQUE KEY `uq_parcelas_codigo_nucleo` (`id_nucleo`,`codigo`),
  UNIQUE KEY `uq_parcelas_nombre_nucleo` (`id_nucleo`,`nombre`),
  KEY `id_nucleo` (`id_nucleo`),
  CONSTRAINT `parcelas_ibfk_1` FOREIGN KEY (`id_nucleo`) REFERENCES `nucleos` (`id_nucleo`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla cosechas (Harvest)
CREATE TABLE `cosechas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `id_parcela` INT NOT NULL,
  `id_cultivo` INT NOT NULL,
  `codigoCosecha` VARCHAR(50) NOT NULL,
  `fecha_cosecha` DATE NOT NULL,
  `peso_total_kg` DECIMAL(10,2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_by` INT NOT NULL,
  UNIQUE KEY `uq_cosechas_parcela_fecha` (`id_parcela`,`fecha_cosecha`),
  UNIQUE KEY `uq_cosechas_codigo` (`codigoCosecha`),
  CONSTRAINT `cosechas_fk_parcela` FOREIGN KEY (`id_parcela`) REFERENCES `parcelas` (`id_parcela`) ON DELETE CASCADE,
  CONSTRAINT `cosechas_fk_cultivo` FOREIGN KEY (`id_cultivo`) REFERENCES `cultivos` (`id_cultivo`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla cosechas_detalle (inputs/outputs per harvest)
CREATE TABLE `cosechas_detalle` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `id_cosecha` INT NOT NULL,
  `tipo_insumo` VARCHAR(50),
  `cantidad` DECIMAL(10,2),
  `unidad` VARCHAR(20),
  CONSTRAINT `cosechas_detalle_fk_cosecha` FOREIGN KEY (`id_cosecha`) REFERENCES `cosechas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla cosechas_auditoria (audit log)
CREATE TABLE `cosechas_auditoria` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `id_cosecha` INT NOT NULL,
  `action` ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `user_id` INT NOT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `payload` JSON,
  CONSTRAINT `cosechas_auditoria_fk_cosecha` FOREIGN KEY (`id_cosecha`) REFERENCES `cosechas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `activos_mantenimiento` (
  `id_activo` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_tipo_activo` int NOT NULL,
  `codigo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `ubicacion_gps` point DEFAULT NULL,
  `id_finca` int DEFAULT NULL,
  `id_nucleo` int DEFAULT NULL,
  `id_lote` int DEFAULT NULL,
  `id_sede` int DEFAULT NULL,
  `id_bodega` int DEFAULT NULL,
  `id_vivero` int DEFAULT NULL,
  `id_sistema_riego` int DEFAULT NULL,
  `id_maquinaria` int DEFAULT NULL,
  `id_vehiculo` int DEFAULT NULL,
  `id_equipo` int DEFAULT NULL,
  `id_aljibe` int DEFAULT NULL,
  `id_planta_produccion` int DEFAULT NULL,
  `fecha_instalacion` date DEFAULT NULL,
  `fecha_ultimo_mantenimiento` date DEFAULT NULL,
  `fecha_proximo_mantenimiento` date DEFAULT NULL,
  `horas_operacion_actuales` decimal(10,2) DEFAULT '0.00',
  `kilometraje_actual` int DEFAULT '0',
  `estado_operativo` enum('Operativo','Mantenimiento_Preventivo','Mantenimiento_Correctivo','Danado','Fuera_Servicio','Retirado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Operativo',
  `prioridad_mantenimiento` enum('Baja','Media','Alta','Critica') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Media',
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_activo`),
  UNIQUE KEY `uq_activos_mantenimiento_codigo_tenant` (`id_tenant`,`codigo`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_tipo_activo` (`id_tipo_activo`),
  KEY `id_finca` (`id_finca`),
  KEY `id_nucleo` (`id_nucleo`),
  KEY `id_lote` (`id_lote`),
  KEY `idx_activo_estado` (`estado_operativo`,`prioridad_mantenimiento`),
  CONSTRAINT `activos_mantenimiento_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `activos_mantenimiento_ibfk_2` FOREIGN KEY (`id_tipo_activo`) REFERENCES `tipos_activo_mantenimiento` (`id_tipo_activo`),
  CONSTRAINT `activos_mantenimiento_ibfk_3` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`),
  CONSTRAINT `activos_mantenimiento_ibfk_4` FOREIGN KEY (`id_nucleo`) REFERENCES `nucleos` (`id_nucleo`),
  CONSTRAINT `activos_mantenimiento_ibfk_5` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `acuicola_alimentacion` (
  `id_alim_acui` bigint NOT NULL AUTO_INCREMENT,
  `id_siembra_acui` bigint NOT NULL,
  `tipo_alimento` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cantidad_kg` decimal(10,2) NOT NULL,
  `frecuencia` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `costo` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id_alim_acui`),
  KEY `id_siembra_acui` (`id_siembra_acui`),
  CONSTRAINT `acuicola_alimentacion_ibfk_1` FOREIGN KEY (`id_siembra_acui`) REFERENCES `acuicola_siembras` (`id_siembra_acui`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `acuicola_calidad_agua` (
  `id_calidad_acui` bigint NOT NULL AUTO_INCREMENT,
  `id_estanque` int NOT NULL,
  `fecha` datetime NOT NULL,
  `temperatura_c` decimal(4,2) DEFAULT NULL,
  `oxigeno_disuelto_mgl` decimal(5,2) DEFAULT NULL,
  `ph` decimal(4,2) DEFAULT NULL,
  `amonio_mgl` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id_calidad_acui`),
  KEY `id_estanque` (`id_estanque`),
  CONSTRAINT `acuicola_calidad_agua_ibfk_1` FOREIGN KEY (`id_estanque`) REFERENCES `acuicola_estanques` (`id_estanque`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `acuicola_cosechas` (
  `id_cosecha_acui` bigint NOT NULL AUTO_INCREMENT,
  `id_siembra_acui` bigint NOT NULL,
  `fecha_cosecha` date NOT NULL,
  `biomasa_total_kg` decimal(12,2) NOT NULL,
  `peso_promedio_g` decimal(8,2) NOT NULL,
  `destino` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_cosecha_acui`),
  KEY `id_siembra_acui` (`id_siembra_acui`),
  CONSTRAINT `acuicola_cosechas_ibfk_1` FOREIGN KEY (`id_siembra_acui`) REFERENCES `acuicola_siembras` (`id_siembra_acui`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `acuicola_especies` (
  `id_especie_acui` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `temperatura_optima_min` decimal(5,2) DEFAULT NULL,
  `temperatura_optima_max` decimal(5,2) DEFAULT NULL,
  `oxigeno_minimo` decimal(5,2) DEFAULT NULL,
  `fca_esperado` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id_especie_acui`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `acuicola_estanques` (
  `id_estanque` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_finca` int NOT NULL,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `area_m2` decimal(10,2) NOT NULL,
  `profundidad_m` decimal(5,2) NOT NULL,
  `sistema_aireacion` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado_actual` enum('Activo','Mantenimiento','Seco') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Activo',
  PRIMARY KEY (`id_estanque`),
  UNIQUE KEY `uq_acuicola_estanques_codigo_tenant` (`id_tenant`,`codigo`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_finca` (`id_finca`),
  CONSTRAINT `acuicola_estanques_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `acuicola_estanques_ibfk_2` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `acuicola_muestreos` (
  `id_muestreo` bigint NOT NULL AUTO_INCREMENT,
  `id_siembra_acui` bigint NOT NULL,
  `fecha` date NOT NULL,
  `peso_promedio_g` decimal(8,2) DEFAULT NULL,
  `longitud_cm` decimal(8,2) DEFAULT NULL,
  `biomasa_estimada_kg` decimal(10,2) DEFAULT NULL,
  `fca_actual` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id_muestreo`),
  KEY `id_siembra_acui` (`id_siembra_acui`),
  CONSTRAINT `acuicola_muestreos_ibfk_1` FOREIGN KEY (`id_siembra_acui`) REFERENCES `acuicola_siembras` (`id_siembra_acui`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `acuicola_siembras` (
  `id_siembra_acui` bigint NOT NULL AUTO_INCREMENT,
  `id_estanque` int NOT NULL,
  `id_especie_acui` int NOT NULL,
  `fecha_siembra` date NOT NULL,
  `cantidad_alevines` int NOT NULL,
  `peso_promedio_inicial_g` decimal(8,2) DEFAULT NULL,
  `costo_siembra` decimal(15,2) DEFAULT NULL,
  PRIMARY KEY (`id_siembra_acui`),
  KEY `id_estanque` (`id_estanque`),
  KEY `id_especie_acui` (`id_especie_acui`),
  CONSTRAINT `acuicola_siembras_ibfk_1` FOREIGN KEY (`id_estanque`) REFERENCES `acuicola_estanques` (`id_estanque`),
  CONSTRAINT `acuicola_siembras_ibfk_2` FOREIGN KEY (`id_especie_acui`) REFERENCES `acuicola_especies` (`id_especie_acui`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `agentes_biologicos` (
  `id_agente` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_comun` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_cientifico` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo` enum('Depredador','Parasitoide','Entomopatogeno','Antagonista','Biofertilizante') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `controla_plaga` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `controla_enfermedad` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dosis_recomendada_ha` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `condiciones_aplicacion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `tiempo_accion_dias` int DEFAULT NULL,
  `costo_unitario` decimal(12,2) DEFAULT NULL,
  `unidad_medida` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_agente`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `agri_alerts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lote_id` int NOT NULL,
  `tipo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `severidad` enum('BAJA','MEDIA','ALTA','CRITICA') COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensaje` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  `estado` enum('ACTIVA','RESUELTA') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVA',
  PRIMARY KEY (`id`),
  KEY `lote_id` (`lote_id`),
  CONSTRAINT `agri_alerts_ibfk_1` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id_lote`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `agroind_control_calidad` (
  `id_calidad_agro` bigint NOT NULL AUTO_INCREMENT,
  `id_etapa_proc` bigint NOT NULL,
  `parametro_medido` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `resultado` enum('Aprobado','Rechazado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `especificaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_calidad_agro`),
  KEY `id_etapa_proc` (`id_etapa_proc`),
  CONSTRAINT `agroind_control_calidad_ibfk_1` FOREIGN KEY (`id_etapa_proc`) REFERENCES `agroind_etapas_proceso` (`id_etapa_proc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `agroind_etapas_proceso` (
  `id_etapa_proc` bigint NOT NULL AUTO_INCREMENT,
  `id_orden_prod` bigint NOT NULL,
  `nombre_etapa` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `rendimiento_pct` decimal(5,2) DEFAULT NULL,
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_etapa_proc`),
  KEY `id_orden_prod` (`id_orden_prod`),
  CONSTRAINT `agroind_etapas_proceso_ibfk_1` FOREIGN KEY (`id_orden_prod`) REFERENCES `agroind_ordenes_produccion` (`id_orden_prod`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `agroind_maquinaria_equipo` (
  `id_maq_agro` int NOT NULL AUTO_INCREMENT,
  `tipo` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `marca_modelo` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado_operativo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_finca` int DEFAULT NULL,
  `placa` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `es_alquilada` tinyint(1) DEFAULT '0',
  `valor_comercial` decimal(15,2) DEFAULT NULL,
  `horometro_actual` decimal(12,2) DEFAULT '0.00',
  `odometro_actual` decimal(12,2) DEFAULT '0.00',
  `combustible_tipo` enum('Diesel','Gasolina','Eléctrico') COLLATE utf8mb4_unicode_ci DEFAULT 'Diesel',
  `fin_garantia` date DEFAULT NULL,
  `ficha_tecnica` json DEFAULT NULL,
  PRIMARY KEY (`id_maq_agro`),
  KEY `fk_agroind_maquinaria_equipo_finca` (`id_finca`),
  CONSTRAINT `fk_agroind_maquinaria_equipo_finca` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `agroind_movimientos_terminado` (
  `id_mov_term` bigint NOT NULL AUTO_INCREMENT,
  `id_lote_terminado` bigint NOT NULL,
  `tipo_movimiento` enum('Entrada','Salida','Transferencia','Ajuste') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cantidad` decimal(12,2) NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_mov_term`),
  KEY `id_lote_terminado` (`id_lote_terminado`),
  CONSTRAINT `agroind_movimientos_terminado_ibfk_1` FOREIGN KEY (`id_lote_terminado`) REFERENCES `agroind_inventario_terminado` (`id_lote_terminado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `agroind_subproductos` (
  `id_subproducto` bigint NOT NULL AUTO_INCREMENT,
  `id_orden_prod` bigint NOT NULL,
  `tipo` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cantidad_kg` decimal(12,2) NOT NULL,
  `uso_asignado` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_subproducto`),
  KEY `id_orden_prod` (`id_orden_prod`),
  CONSTRAINT `agroind_subproductos_ibfk_1` FOREIGN KEY (`id_orden_prod`) REFERENCES `agroind_ordenes_produccion` (`id_orden_prod`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `agua_balance_hidrico` (
  `id_balance` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_finca` int NOT NULL,
  `anio` int NOT NULL,
  `mes` int NOT NULL,
  `precipitacion_entrada` decimal(10,2) DEFAULT '0.00',
  `riego_entrada` decimal(10,2) DEFAULT '0.00',
  `et_salida` decimal(10,2) DEFAULT '0.00',
  `escorrentia_salida` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`id_balance`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_finca` (`id_finca`),
  CONSTRAINT `agua_balance_hidrico_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `agua_balance_hidrico_ibfk_2` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `agua_calidad_fisicoquimica` (
  `id_calidad` bigint NOT NULL AUTO_INCREMENT,
  `id_fuente` int NOT NULL,
  `fecha_muestreo` date NOT NULL,
  `ph` decimal(4,2) DEFAULT NULL,
  `conductividad_electrica` decimal(8,2) DEFAULT NULL,
  `oxigeno_disuelto` decimal(5,2) DEFAULT NULL,
  `turbidez` decimal(6,2) DEFAULT NULL,
  `coliformes` decimal(8,2) DEFAULT NULL,
  `cumple_norma` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_calidad`),
  KEY `id_fuente` (`id_fuente`),
  CONSTRAINT `agua_calidad_fisicoquimica_ibfk_1` FOREIGN KEY (`id_fuente`) REFERENCES `agua_fuentes` (`id_fuente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `agua_caudales` (
  `id_caudal` bigint NOT NULL AUTO_INCREMENT,
  `id_fuente` int NOT NULL,
  `fecha_medicion` date NOT NULL,
  `caudal_lps` decimal(10,2) NOT NULL,
  `metodo_medicion` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_caudal`),
  KEY `id_fuente` (`id_fuente`),
  CONSTRAINT `agua_caudales_ibfk_1` FOREIGN KEY (`id_fuente`) REFERENCES `agua_fuentes` (`id_fuente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `agua_derechos_uso` (
  `id_derecho` int NOT NULL AUTO_INCREMENT,
  `id_fuente` int NOT NULL,
  `numero_concesion` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `volumen_autorizado_m3` decimal(15,2) NOT NULL,
  `entidad_otorgante` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_emision` date NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  PRIMARY KEY (`id_derecho`),
  KEY `id_fuente` (`id_fuente`),
  CONSTRAINT `agua_derechos_uso_ibfk_1` FOREIGN KEY (`id_fuente`) REFERENCES `agua_fuentes` (`id_fuente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `agua_fuentes` (
  `id_fuente` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_finca` int NOT NULL,
  `nombre` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('Rio','Quebrada','Pozo','Manantial','Canal') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `caudal_estimado_lps` decimal(10,2) DEFAULT NULL,
  `estado_operacion` enum('Activa','Inactiva','Seca') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Activa',
  `coordenadas` point DEFAULT NULL,
  PRIMARY KEY (`id_fuente`),
  UNIQUE KEY `uq_agua_fuentes_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_finca` (`id_finca`),
  CONSTRAINT `agua_fuentes_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `agua_fuentes_ibfk_2` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `alertas` (
  `id_alerta` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_usuario_emisor` int DEFAULT NULL,
  `tipo_alerta` enum('Informacion','Advertencia','Critica') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `titulo` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensaje` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `prioridad` enum('Baja','Media','Alta','Critica') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Media',
  `leida` tinyint(1) DEFAULT '0',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_alerta`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_usuario_emisor` (`id_usuario_emisor`),
  CONSTRAINT `alertas_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `alertas_ibfk_2` FOREIGN KEY (`id_usuario_emisor`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `aljibes` (
  `id_aljibe` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_activo` int NOT NULL,
  `id_lote` int DEFAULT NULL,
  `codigo` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('Concreto','Plastico','Metalico','Geomembrana','Excavado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `capacidad_m3` decimal(12,2) DEFAULT NULL,
  `nivel_actual_m3` decimal(12,2) DEFAULT NULL,
  `profundidad_m` decimal(5,2) DEFAULT NULL,
  `diametro_m` decimal(5,2) DEFAULT NULL,
  `fecha_ultima_limpieza` date DEFAULT NULL,
  `fecha_proxima_limpieza` date DEFAULT NULL,
  `calidad_agua_ultimo_muestreo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_aljibe`),
  UNIQUE KEY `uq_aljibes_codigo_tenant` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_aljibes_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_activo` (`id_activo`),
  KEY `id_lote` (`id_lote`),
  CONSTRAINT `aljibes_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `aljibes_ibfk_2` FOREIGN KEY (`id_activo`) REFERENCES `activos_mantenimiento` (`id_activo`),
  CONSTRAINT `aljibes_ibfk_3` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `amb_biodiversidad` (
  `id_biodiversidad` bigint NOT NULL AUTO_INCREMENT,
  `id_finca` int NOT NULL,
  `especie_observada` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria_amenaza` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `habitat` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_observacion` date NOT NULL,
  PRIMARY KEY (`id_biodiversidad`),
  KEY `id_finca` (`id_finca`),
  CONSTRAINT `amb_biodiversidad_ibfk_1` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `amb_fuentes_emision` (
  `id_fuente_emision` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `nombre` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` enum('Maquinaria','Fertilizantes','Ganaderia','Procesamiento') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `factor_emision` decimal(10,4) NOT NULL,
  PRIMARY KEY (`id_fuente_emision`),
  UNIQUE KEY `uq_amb_fuentes_emision_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `amb_fuentes_emision_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `amb_huella_agua` (
  `id_huella_agua` bigint NOT NULL AUTO_INCREMENT,
  `id_finca` int NOT NULL,
  `id_cultivo` int NOT NULL,
  `agua_verde_m3` decimal(12,2) DEFAULT NULL,
  `agua_azul_m3` decimal(12,2) DEFAULT NULL,
  `agua_gris_m3` decimal(12,2) DEFAULT NULL,
  `total_huella_m3` decimal(15,2) DEFAULT NULL,
  PRIMARY KEY (`id_huella_agua`),
  KEY `id_finca` (`id_finca`),
  KEY `id_cultivo` (`id_cultivo`),
  CONSTRAINT `amb_huella_agua_ibfk_1` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`),
  CONSTRAINT `amb_huella_agua_ibfk_2` FOREIGN KEY (`id_cultivo`) REFERENCES `cultivos` (`id_cultivo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `amb_indicadores_sostenibilidad` (
  `id_indicador_amb` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `periodo_anio` int NOT NULL,
  `huella_carbono_total_ton` decimal(12,2) DEFAULT NULL,
  `porcentaje_energia_renovable` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id_indicador_amb`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `amb_indicadores_sostenibilidad_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `amb_licencias_ambientales` (
  `id_licencia` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `tipo` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_resolucion` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidad_otorgante` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_emision` date NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `estado` enum('Vigente','En_Renovacion','Vencida') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Vigente',
  PRIMARY KEY (`id_licencia`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `amb_licencias_ambientales_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `amb_registro_emisiones` (
  `id_emision` bigint NOT NULL AUTO_INCREMENT,
  `id_fuente_emision` int NOT NULL,
  `periodo_mes` int NOT NULL,
  `periodo_anio` int NOT NULL,
  `cantidad_co2_eq` decimal(12,2) NOT NULL,
  `metodo_calculo` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_emision`),
  KEY `id_fuente_emision` (`id_fuente_emision`),
  CONSTRAINT `amb_registro_emisiones_ibfk_1` FOREIGN KEY (`id_fuente_emision`) REFERENCES `amb_fuentes_emision` (`id_fuente_emision`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `amb_residuos` (
  `id_residuo` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `tipo` enum('Peligroso','No_Peligroso','Organico') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cantidad_kg` decimal(12,2) NOT NULL,
  `fecha_generacion` date NOT NULL,
  `metodo_disposicion` enum('Reciclaje','Compostaje','Relleno','Incineracion','Tratamiento_Especial') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `certificado_disposicion` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_residuo`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `amb_residuos_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `amb_vertimientos` (
  `id_vertimiento` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `fuente` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('Agricola','Industrial','Domestico') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `volumen_m3` decimal(12,2) NOT NULL,
  `punto_descarga` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_vertimiento`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `amb_vertimientos_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `analisis_suelos` (
  `id_analisis` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_lote` int NOT NULL,
  `fecha_muestreo` date NOT NULL,
  `fecha_analisis` date DEFAULT NULL,
  `laboratorio` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ph` decimal(3,1) DEFAULT NULL,
  `conductividad_us_cm` decimal(8,2) DEFAULT NULL,
  `materia_organica` decimal(5,2) DEFAULT NULL,
  `nitrogeno_total` decimal(5,2) DEFAULT NULL,
  `fosforo` decimal(8,2) DEFAULT NULL,
  `potasio` decimal(8,2) DEFAULT NULL,
  `calcio` decimal(8,2) DEFAULT NULL,
  `magnesio` decimal(8,2) DEFAULT NULL,
  `azufre` decimal(8,2) DEFAULT NULL,
  `hierro` decimal(8,2) DEFAULT NULL,
  `zinc` decimal(8,2) DEFAULT NULL,
  `cobre` decimal(8,2) DEFAULT NULL,
  `manganeso` decimal(8,2) DEFAULT NULL,
  `boro` decimal(8,2) DEFAULT NULL,
  `capacidad_intercambio` decimal(8,2) DEFAULT NULL,
  `textura_arena` decimal(5,2) DEFAULT NULL,
  `textura_limo` decimal(5,2) DEFAULT NULL,
  `textura_arcilla` decimal(5,2) DEFAULT NULL,
  `recomendaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_analisis`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_lote` (`id_lote`),
  CONSTRAINT `analisis_suelos_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `analisis_suelos_ibfk_2` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `analisis_tejido` (
  `id_analisis_tejido` bigint NOT NULL AUTO_INCREMENT,
  `id_lote` int NOT NULL,
  `fecha_muestreo` date NOT NULL,
  `nitrogeno_pct` decimal(5,2) DEFAULT NULL,
  `fosforo_pct` decimal(5,2) DEFAULT NULL,
  `potasio_pct` decimal(5,2) DEFAULT NULL,
  `calcio_pct` decimal(5,2) DEFAULT NULL,
  `magnesio_pct` decimal(5,2) DEFAULT NULL,
  `boro_ppm` decimal(8,2) DEFAULT NULL,
  `zinc_ppm` decimal(8,2) DEFAULT NULL,
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_analisis_tejido`),
  KEY `id_lote` (`id_lote`),
  CONSTRAINT `analisis_tejido_ibfk_1` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `app_control_envases` (
  `id_control` bigint NOT NULL AUTO_INCREMENT,
  `id_programacion` bigint NOT NULL,
  `id_insumo` int NOT NULL,
  `cantidad_envases_vacios` int NOT NULL,
  `lavado_triple_realizado` tinyint(1) DEFAULT '0',
  `perforado_inutilizado` tinyint(1) DEFAULT '0',
  `entregado_centro_acopio` tinyint(1) DEFAULT '0',
  `fecha_entrega` date DEFAULT NULL,
  `notas_disposicion` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_control`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `app_programacion` (
  `id_programacion` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_finca` int NOT NULL,
  `id_lote` int NOT NULL,
  `id_receta` bigint DEFAULT NULL,
  `fecha_programada` date NOT NULL,
  `fecha_ejecucion` datetime DEFAULT NULL,
  `metodo_aplicacion` enum('Manual','Dron','Avión','Tractor','Fertirriego','Otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_maquinaria` int DEFAULT NULL,
  `responsable_aplicacion` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `condiciones_climaticas` text COLLATE utf8mb4_unicode_ci,
  `estado` enum('Programada','En Proceso','Completada','Cancelada') COLLATE utf8mb4_unicode_ci DEFAULT 'Programada',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_programacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `app_programacion_insumos` (
  `id_prog_insumo` bigint NOT NULL AUTO_INCREMENT,
  `id_programacion` bigint NOT NULL,
  `id_insumo` int NOT NULL,
  `cantidad_proyectada` decimal(10,2) NOT NULL,
  `cantidad_real_aplicada` decimal(10,2) DEFAULT NULL,
  `costo_total` decimal(15,2) DEFAULT NULL,
  PRIMARY KEY (`id_prog_insumo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `app_recetas` (
  `id_receta` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `nombre_receta` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('Fertilización','Fitosanitario','Bio-Fábrica') COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_cultivo` int DEFAULT NULL,
  `id_enfermedad_plaga` int DEFAULT NULL,
  `autor_tecnico` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_creacion` date DEFAULT NULL,
  `instrucciones_preparacion` text COLLATE utf8mb4_unicode_ci,
  `recomendaciones_seguridad` text COLLATE utf8mb4_unicode_ci,
  `estado` enum('Activa','Inactiva') COLLATE utf8mb4_unicode_ci DEFAULT 'Activa',
  PRIMARY KEY (`id_receta`),
  UNIQUE KEY `uq_app_recetas_nombre_receta_tenant` (`id_tenant`,`nombre_receta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `app_recetas_detalle` (
  `id_detalle` bigint NOT NULL AUTO_INCREMENT,
  `id_receta` bigint NOT NULL,
  `id_insumo` int NOT NULL,
  `dosis_recomendada` decimal(10,2) NOT NULL,
  `unidad_medida` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notas` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_detalle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `asociacion_cultivos` (
  `id_asociacion` int NOT NULL AUTO_INCREMENT,
  `id_cultivo_principal` int NOT NULL,
  `id_cultivo_companero` int NOT NULL,
  `beneficio_mutuo` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_asociacion`),
  KEY `id_cultivo_principal` (`id_cultivo_principal`),
  KEY `id_cultivo_companero` (`id_cultivo_companero`),
  CONSTRAINT `asociacion_cultivos_ibfk_1` FOREIGN KEY (`id_cultivo_principal`) REFERENCES `cultivos` (`id_cultivo`),
  CONSTRAINT `asociacion_cultivos_ibfk_2` FOREIGN KEY (`id_cultivo_companero`) REFERENCES `cultivos` (`id_cultivo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `atec_asistencia_capacitacion` (
  `id_asistencia_cap` bigint NOT NULL AUTO_INCREMENT,
  `id_capacitacion` bigint NOT NULL,
  `id_empleado` int NOT NULL,
  `calificacion_obtenida` decimal(4,2) DEFAULT NULL,
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_asistencia_cap`),
  KEY `id_capacitacion` (`id_capacitacion`),
  KEY `id_empleado` (`id_empleado`),
  CONSTRAINT `atec_asistencia_capacitacion_ibfk_1` FOREIGN KEY (`id_capacitacion`) REFERENCES `atec_capacitaciones` (`id_capacitacion`),
  CONSTRAINT `atec_asistencia_capacitacion_ibfk_2` FOREIGN KEY (`id_empleado`) REFERENCES `rrhh_empleados` (`id_empleado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `atec_capacitaciones` (
  `id_capacitacion` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `tema` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `instructor` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` date NOT NULL,
  `duracion_horas` decimal(5,2) DEFAULT NULL,
  `evaluacion_satisfaccion` decimal(3,1) DEFAULT NULL,
  PRIMARY KEY (`id_capacitacion`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `atec_capacitaciones_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `atec_recetario_enfermedades` (
  `id_receta` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_visita_arbol` bigint NOT NULL,
  `enfermedad_plaga_detectada` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gravedad` enum('Baja','Media','Alta','Critica') COLLATE utf8mb4_unicode_ci DEFAULT 'Media',
  `receta_tratamiento` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_insumo` int DEFAULT NULL,
  `dosis_recomendada` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_aplicacion_sugerida` date DEFAULT NULL,
  `aplicado` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id_receta`),
  KEY `fk_recetas_tenant` (`id_tenant`),
  KEY `fk_recetas_visita` (`id_visita_arbol`),
  KEY `fk_recetas_insumo` (`id_insumo`),
  CONSTRAINT `fk_recetas_insumo` FOREIGN KEY (`id_insumo`) REFERENCES `insumos` (`id_insumo`),
  CONSTRAINT `fk_recetas_tenant` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `fk_recetas_visita` FOREIGN KEY (`id_visita_arbol`) REFERENCES `atec_visitas_arboles` (`id_visita_arbol`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `atec_recomendaciones` (
  `id_recomendacion` bigint NOT NULL AUTO_INCREMENT,
  `id_visita` bigint NOT NULL,
  `descripcion_detallada` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `prioridad` enum('Baja','Media','Alta','Urgente') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Media',
  `estado_implementacion` enum('Pendiente','En_Proceso','Implementada','Descartada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pendiente',
  PRIMARY KEY (`id_recomendacion`),
  KEY `id_visita` (`id_visita`),
  CONSTRAINT `atec_recomendaciones_ibfk_1` FOREIGN KEY (`id_visita`) REFERENCES `atec_visitas_tecnicas` (`id_visita`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `atec_visitas_arboles` (
  `id_visita_arbol` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_arbol` int NOT NULL,
  `id_empleado` int NOT NULL,
  `fecha_visita` datetime NOT NULL,
  `estado_salud_detectado` enum('Sano','Enfermo','Tratamiento','Muerto') COLLATE utf8mb4_unicode_ci NOT NULL,
  `diagnostico` varchar(250) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_visita_arbol`),
  KEY `fk_visitas_arbol_tenant` (`id_tenant`),
  KEY `fk_visitas_arbol_arbol` (`id_arbol`),
  KEY `fk_visitas_arbol_empleado` (`id_empleado`),
  CONSTRAINT `fk_visitas_arbol_arbol` FOREIGN KEY (`id_arbol`) REFERENCES `siembra_arboles` (`id_arbol`) ON DELETE CASCADE,
  CONSTRAINT `fk_visitas_arbol_empleado` FOREIGN KEY (`id_empleado`) REFERENCES `rrhh_empleados` (`id_empleado`),
  CONSTRAINT `fk_visitas_arbol_tenant` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `atec_visitas_tecnicas` (
  `id_visita` bigint NOT NULL AUTO_INCREMENT,
  `id_finca` int NOT NULL,
  `id_lote` int DEFAULT NULL,
  `tecnico_responsable` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_visita` date NOT NULL,
  `motivo` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_visita`),
  KEY `id_finca` (`id_finca`),
  KEY `id_lote` (`id_lote`),
  CONSTRAINT `atec_visitas_tecnicas_ibfk_1` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`),
  CONSTRAINT `atec_visitas_tecnicas_ibfk_2` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `auditorias` (
  `id_auditoria` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_finca` int NOT NULL,
  `tipo` enum('Interna','Externa') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` date NOT NULL,
  `auditor` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `hallazgos` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `no_conformidades` int DEFAULT '0',
  `estado_cierre` enum('Abierta','En_Plan_Accion','Cerrada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Abierta',
  PRIMARY KEY (`id_auditoria`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_finca` (`id_finca`),
  CONSTRAINT `auditorias_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `auditorias_ibfk_2` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `basculas` (
  `id_bascula` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `codigo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ubicacion` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capacidad_maxima` decimal(15,2) DEFAULT NULL,
  `precision_kg` decimal(10,3) DEFAULT NULL,
  `unidad` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'kg',
  `tipo_conexion` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT 'manual',
  `codigo_sensor` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_calibracion` date DEFAULT NULL,
  `activa` tinyint(1) DEFAULT '1',
  `inicio_lectura` int DEFAULT '0' COMMENT 'Posici├│n inicial para extraer el peso de la trama',
  `longitud_lectura` int DEFAULT '10' COMMENT 'Cantidad de caracteres a leer desde inicio_lectura',
  `protocolo` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT 'continua' COMMENT 'Protocolo de comunicacion: continua, cas, magallan, torrey, personalizado',
  `baud_rate` int DEFAULT '9600' COMMENT 'Baud rate',
  `data_bits` int DEFAULT '8' COMMENT 'Bits de datos',
  `paridad` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'none' COMMENT 'Paridad',
  `stop_bits` int DEFAULT '1' COMMENT 'Bits de parada',
  `modo_lectura` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT 'continuo',
  `comando_peticion` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_bascula`),
  UNIQUE KEY `uq_basculas_codigo_tenant` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_basculas_nombre_tenant` (`id_tenant`,`nombre`),
  UNIQUE KEY `uq_basculas_codigo_sensor_tenant` (`id_tenant`,`codigo_sensor`),
  CONSTRAINT `basculas_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bod_bodegas` (
  `id_bodega` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_finca` int DEFAULT NULL,
  `nombre` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('Insumos','Producto_Terminado','General') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `capacidad_m3` decimal(10,2) DEFAULT NULL,
  `es_principal` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id_bodega`),
  UNIQUE KEY `uq_bod_bodegas_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_finca` (`id_finca`),
  CONSTRAINT `bod_bodegas_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `bod_bodegas_ibfk_2` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bod_transferencia_detalle` (
  `id_trans_det` bigint NOT NULL AUTO_INCREMENT,
  `id_transferencia` bigint NOT NULL,
  `insumo_producto` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cantidad` decimal(12,2) NOT NULL,
  `estado_linea` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_trans_det`),
  KEY `id_transferencia` (`id_transferencia`),
  CONSTRAINT `bod_transferencia_detalle_ibfk_1` FOREIGN KEY (`id_transferencia`) REFERENCES `bod_transferencias` (`id_transferencia`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bod_transferencias` (
  `id_transferencia` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_bodega_origen` int NOT NULL,
  `id_bodega_destino` int NOT NULL,
  `fecha_solicitud` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_recepcion` datetime DEFAULT NULL,
  `estado` enum('Pendiente','En_Transito','Recibida','Cancelada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pendiente',
  `id_empleado_transportador` int DEFAULT NULL,
  `codigo_seguridad` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_transferencia`),
  UNIQUE KEY `uq_bod_transferencias_codigo_seguridad_tenant` (`id_tenant`,`codigo_seguridad`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_bodega_origen` (`id_bodega_origen`),
  KEY `id_bodega_destino` (`id_bodega_destino`),
  CONSTRAINT `bod_transferencias_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `bod_transferencias_ibfk_2` FOREIGN KEY (`id_bodega_origen`) REFERENCES `bod_bodegas` (`id_bodega`),
  CONSTRAINT `bod_transferencias_ibfk_3` FOREIGN KEY (`id_bodega_destino`) REFERENCES `bod_bodegas` (`id_bodega`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bod_ubicaciones` (
  `id_ubicacion` int NOT NULL AUTO_INCREMENT,
  `id_bodega` int NOT NULL,
  `pasillo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estante` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `posicion` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_ubicacion`),
  KEY `id_bodega` (`id_bodega`),
  CONSTRAINT `bod_ubicaciones_ibfk_1` FOREIGN KEY (`id_bodega`) REFERENCES `bod_bodegas` (`id_bodega`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cajas_menores` (
  `id_caja_menor` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_finca` int DEFAULT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `responsable_id` int DEFAULT NULL,
  `saldo_inicial` decimal(15,2) NOT NULL,
  `saldo_actual` decimal(15,2) NOT NULL,
  `monto_maximo` decimal(15,2) NOT NULL,
  `monto_minimo` decimal(15,2) DEFAULT '0.00',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_ultimo_arqueo` datetime DEFAULT NULL,
  `estado` enum('Activa','Cerrada','Bloqueada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Activa',
  PRIMARY KEY (`id_caja_menor`),
  UNIQUE KEY `uq_cajas_menores_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_finca` (`id_finca`),
  KEY `responsable_id` (`responsable_id`),
  CONSTRAINT `cajas_menores_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `cajas_menores_ibfk_2` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`),
  CONSTRAINT `cajas_menores_ibfk_3` FOREIGN KEY (`responsable_id`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `calendario_agricola` (
  `id_calendario_agr` int NOT NULL AUTO_INCREMENT,
  `id_cultivo` int NOT NULL,
  `zona_agroecologica` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mes_optimo_siembra` int DEFAULT NULL,
  `mes_optimo_cosecha` int DEFAULT NULL,
  PRIMARY KEY (`id_calendario_agr`),
  KEY `id_cultivo` (`id_cultivo`),
  CONSTRAINT `calendario_agricola_ibfk_1` FOREIGN KEY (`id_cultivo`) REFERENCES `cultivos` (`id_cultivo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `calendario_cultivo` (
  `id_calendario` bigint NOT NULL AUTO_INCREMENT,
  `id_siembra` bigint NOT NULL,
  `dia_ciclo` int NOT NULL,
  `fecha_esperada` date NOT NULL,
  `descripcion_actividad` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_calendario`),
  KEY `id_siembra` (`id_siembra`),
  CONSTRAINT `calendario_cultivo_ibfk_1` FOREIGN KEY (`id_siembra`) REFERENCES `siembras` (`id_siembra`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `calendario_riego` (
  `id_cal_riego` bigint NOT NULL AUTO_INCREMENT,
  `id_lote` int NOT NULL,
  `fecha_recomendada` date NOT NULL,
  `volumen_estimado_m3` decimal(10,2) DEFAULT NULL,
  `motivo` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_cal_riego`),
  KEY `id_lote` (`id_lote`),
  CONSTRAINT `calendario_riego_ibfk_1` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `calidad_postcosecha` (
  `id_calidad` bigint NOT NULL AUTO_INCREMENT,
  `id_cosecha` bigint NOT NULL,
  `fecha_evaluacion` date NOT NULL,
  `acidez_libre_porcentaje` decimal(5,2) DEFAULT NULL,
  `humedad_porcentaje` decimal(5,2) DEFAULT NULL,
  `impurezas_porcentaje` decimal(5,2) DEFAULT NULL,
  `color` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `olor` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `calificacion` enum('Excelente','Buena','Regular','Mala') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_calidad`),
  KEY `id_cosecha` (`id_cosecha`),
  CONSTRAINT `calidad_postcosecha_ibfk_1` FOREIGN KEY (`id_cosecha`) REFERENCES `cosechas` (`id_cosecha`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `caminos_calles` (
  `id_camino` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_activo` int NOT NULL,
  `id_finca` int NOT NULL,
  `codigo` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('Principal','Secundario','Tercería','Acceso','Interno','Carreteable') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `longitud_metros` decimal(10,2) DEFAULT NULL,
  `ancho_metros` decimal(5,2) DEFAULT NULL,
  `tipo_superficie` enum('Asfalto','Concreto','Afirmado','Lastrado','Tierra','Empedrado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado_superficie` enum('Excelente','Bueno','Regular','Malo','Critico') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Bueno',
  `fecha_ultimo_mantenimiento` date DEFAULT NULL,
  PRIMARY KEY (`id_camino`),
  UNIQUE KEY `uq_caminos_calles_codigo_tenant` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_caminos_calles_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_activo` (`id_activo`),
  KEY `id_finca` (`id_finca`),
  CONSTRAINT `caminos_calles_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `caminos_calles_ibfk_2` FOREIGN KEY (`id_activo`) REFERENCES `activos_mantenimiento` (`id_activo`),
  CONSTRAINT `caminos_calles_ibfk_3` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `capas_geo` (
  `id_capa` int NOT NULL AUTO_INCREMENT,
  `id_finca` int NOT NULL,
  `nombre_capa` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('Suelos','Topografia','Uso_Suelo','Hidrografia','Limites') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `formato` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url_archivo` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_actualizacion` date DEFAULT NULL,
  PRIMARY KEY (`id_capa`),
  KEY `id_finca` (`id_finca`),
  CONSTRAINT `capas_geo_ibfk_1` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cartera_cxc` (
  `id_cxc` bigint NOT NULL AUTO_INCREMENT,
  `id_documento` bigint NOT NULL,
  `saldo_pendiente` decimal(15,2) NOT NULL,
  `dias_mora` int DEFAULT '0',
  `estado` enum('Vigente','Vencida','Cobrada','Incobrable') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Vigente',
  PRIMARY KEY (`id_cxc`),
  KEY `id_documento` (`id_documento`),
  CONSTRAINT `cartera_cxc_ibfk_1` FOREIGN KEY (`id_documento`) REFERENCES `documentos_comerciales` (`id_documento`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cartera_cxp` (
  `id_cxp` bigint NOT NULL AUTO_INCREMENT,
  `id_documento` bigint NOT NULL,
  `saldo_pendiente` decimal(15,2) NOT NULL,
  `dias_mora` int DEFAULT '0',
  `estado` enum('Vigente','Vencida','Pagada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Vigente',
  PRIMARY KEY (`id_cxp`),
  KEY `id_documento` (`id_documento`),
  CONSTRAINT `cartera_cxp_ibfk_1` FOREIGN KEY (`id_documento`) REFERENCES `documentos_comerciales` (`id_documento`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `categorias_gastos` (
  `id_categoria_gasto` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_gasto` enum('Operativo','Administrativo','Ventas','Financiero','Extraordinario','Mantenimiento') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `afecta_produccion` tinyint(1) DEFAULT '0',
  `requiere_aprobacion` tinyint(1) DEFAULT '0',
  `monto_maximo_sin_aprobacion` decimal(15,2) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_categoria_gasto`),
  UNIQUE KEY `uq_categorias_gastos_codigo_tenant` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_categorias_gastos_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `categorias_gastos_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `categorias_insumos` (
  `id_categoria` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('Fertilizante','Plaguicida','Herbicida','Fungicida','Semilla','Sustrato','Repuesto','Herramienta','Combustible','Otro') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_padre` int DEFAULT NULL,
  PRIMARY KEY (`id_categoria`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Categoría Insumos';

CREATE TABLE `centros_costo` (
  `id_centro_costo` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `id_finca` int DEFAULT NULL,
  PRIMARY KEY (`id_centro_costo`),
  UNIQUE KEY `uq_centros_costo_codigo_tenant` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_centros_costo_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `centros_costo_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `certificaciones_cultivo` (
  `id_certificacion` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_finca` int NOT NULL,
  `id_cultivo` int NOT NULL,
  `tipo_certificacion` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_obtencion` date NOT NULL,
  `vigencia_hasta` date NOT NULL,
  `auditor` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('Vigente','En_Proceso','Suspendida','Vencida') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Vigente',
  PRIMARY KEY (`id_certificacion`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_finca` (`id_finca`),
  KEY `id_cultivo` (`id_cultivo`),
  CONSTRAINT `certificaciones_cultivo_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `certificaciones_cultivo_ibfk_2` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`),
  CONSTRAINT `certificaciones_cultivo_ibfk_3` FOREIGN KEY (`id_cultivo`) REFERENCES `cultivos` (`id_cultivo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `certificaciones_finca` (
  `id_certificacion` int NOT NULL AUTO_INCREMENT,
  `id_finca` int NOT NULL,
  `tipo_certificacion` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidad_certificadora` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_certificado` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_emision` date NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `estado` enum('Vigente','En_Proceso','Vencida') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Vigente',
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_certificacion`),
  KEY `id_finca` (`id_finca`),
  CONSTRAINT `certificaciones_finca_ibfk_1` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cfg_notificaciones` (
  `id_config` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `modulo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requiere_pin` tinyint(1) DEFAULT '0',
  `canal_notificacion` enum('Ninguno','Email','WhatsApp') COLLATE utf8mb4_unicode_ci DEFAULT 'Ninguno',
  `smtp_host` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `smtp_port` int DEFAULT NULL,
  `smtp_user` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `smtp_pass` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `whatsapp_key` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_config`),
  UNIQUE KEY `unique_tenant_modulo` (`id_tenant`,`modulo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `comer_canales_distribucion` (
  `id_canal` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('Exportacion','Local','Mayorista','Minorista','Directo') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_canal`),
  UNIQUE KEY `uq_comer_canales_distribucion_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `comer_canales_distribucion_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `comer_clientes` (
  `id_cliente` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_tercero` int DEFAULT NULL,
  `nombre_razon_social` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('Industrial','Exportador','Minorista','Mayorista') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `condicion_pago_dias` int DEFAULT '0',
  `activo` tinyint(1) DEFAULT '1',
  `codigoCliente` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cif` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rfc` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_cliente`),
  UNIQUE KEY `uq_comer_clientes_nombre_razon_social_tenant` (`id_tenant`,`nombre_razon_social`),
  UNIQUE KEY `uq_comer_clientes_codigocliente_tenant` (`id_tenant`,`codigoCliente`),
  UNIQUE KEY `uq_comer_clientes_cif_tenant` (`id_tenant`,`cif`),
  UNIQUE KEY `uq_comer_clientes_rfc_tenant` (`id_tenant`,`rfc`),
  KEY `id_tenant` (`id_tenant`),
  KEY `fk_cli_tercero` (`id_tercero`),
  CONSTRAINT `comer_clientes_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `fk_cli_tercero` FOREIGN KEY (`id_tercero`) REFERENCES `terceros` (`id_tercero`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `comer_comisiones` (
  `id_comision` bigint NOT NULL AUTO_INCREMENT,
  `id_empleado` int NOT NULL,
  `monto` decimal(15,2) NOT NULL,
  `porcentaje` decimal(5,2) DEFAULT NULL,
  `periodo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('Pendiente','Pagada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pendiente',
  PRIMARY KEY (`id_comision`),
  KEY `id_empleado` (`id_empleado`),
  CONSTRAINT `comer_comisiones_ibfk_1` FOREIGN KEY (`id_empleado`) REFERENCES `rrhh_empleados` (`id_empleado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `comer_contratos_venta` (
  `id_contrato` bigint NOT NULL AUTO_INCREMENT,
  `id_cliente` int NOT NULL,
  `codigo_contrato` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `producto` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cantidad_pactada_kg` decimal(15,2) NOT NULL,
  `precio_pactado` decimal(15,2) NOT NULL,
  `fecha_limite_entrega` date NOT NULL,
  `estado` enum('Vigente','Cumplido','Incumplido') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Vigente',
  PRIMARY KEY (`id_contrato`),
  UNIQUE KEY `codigo_contrato` (`codigo_contrato`),
  KEY `id_cliente` (`id_cliente`),
  CONSTRAINT `comer_contratos_venta_ibfk_1` FOREIGN KEY (`id_cliente`) REFERENCES `comer_clientes` (`id_cliente`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `comer_ordenes_venta` (
  `id_orden_venta` bigint NOT NULL AUTO_INCREMENT,
  `id_cliente` int NOT NULL,
  `id_contrato` bigint DEFAULT NULL,
  `fecha_emision` date NOT NULL,
  `total_venta` decimal(15,2) NOT NULL,
  `estado` enum('Borrador','Confirmada','Despachada','Facturada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Borrador',
  PRIMARY KEY (`id_orden_venta`),
  KEY `id_cliente` (`id_cliente`),
  KEY `id_contrato` (`id_contrato`),
  CONSTRAINT `comer_ordenes_venta_ibfk_1` FOREIGN KEY (`id_cliente`) REFERENCES `comer_clientes` (`id_cliente`),
  CONSTRAINT `comer_ordenes_venta_ibfk_2` FOREIGN KEY (`id_contrato`) REFERENCES `comer_contratos_venta` (`id_contrato`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `comer_precios_mercado` (
  `id_precio_mercado` bigint NOT NULL AUTO_INCREMENT,
  `producto` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` date NOT NULL,
  `precio_promedio` decimal(15,2) NOT NULL,
  `fuente` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_precio_mercado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `compras_precios_proveedor` (
  `id_precio` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_insumo` int NOT NULL,
  `id_proveedor` int NOT NULL,
  `precio_unitario` decimal(15,4) NOT NULL,
  `fecha_cotizacion` date NOT NULL,
  `condiciones` text,
  `es_ultimo_precio` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_precio`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_insumo` (`id_insumo`),
  KEY `id_proveedor` (`id_proveedor`),
  CONSTRAINT `compras_precios_proveedor_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`) ON DELETE CASCADE,
  CONSTRAINT `compras_precios_proveedor_ibfk_2` FOREIGN KEY (`id_insumo`) REFERENCES `insumos` (`id_insumo`) ON DELETE CASCADE,
  CONSTRAINT `compras_precios_proveedor_ibfk_3` FOREIGN KEY (`id_proveedor`) REFERENCES `terceros` (`id_tercero`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `comunicaciones` (
  `id_comunicacion` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_finca` int DEFAULT NULL,
  `tipo` enum('Correo','Reunion','Llamada','Nota') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` datetime NOT NULL,
  `asunto` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contenido_resumido` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `participantes` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_comunicacion`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_finca` (`id_finca`),
  CONSTRAINT `comunicaciones_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `comunicaciones_ibfk_2` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `con_distribucion_documentos` (
  `id_distribucion` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_finca` int NOT NULL,
  `modulo` varchar(50) COLLATE utf8mb4_spanish_ci NOT NULL COMMENT 'Ej: INVENTARIO, NOMINA',
  `id_tipo_documento` int NOT NULL COMMENT 'ID del tipo de doc en su modulo (ej. inv_tipos_documento)',
  `id_tipo_comp` int NOT NULL COMMENT 'El comprobante que se va a generar (tipos_comprobantes)',
  `cuenta_debito` int DEFAULT NULL COMMENT 'Cuenta por defecto para el debito (plan_contable)',
  `cuenta_credito` int DEFAULT NULL COMMENT 'Cuenta por defecto para el credito (plan_contable)',
  `activo` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_distribucion`),
  KEY `id_finca` (`id_finca`),
  KEY `id_tipo_comp` (`id_tipo_comp`),
  KEY `cuenta_debito` (`cuenta_debito`),
  KEY `cuenta_credito` (`cuenta_credito`),
  CONSTRAINT `con_distribucion_documentos_ibfk_1` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`),
  CONSTRAINT `con_distribucion_documentos_ibfk_2` FOREIGN KEY (`id_tipo_comp`) REFERENCES `tipos_comprobantes` (`id_tipo_comp`),
  CONSTRAINT `con_distribucion_documentos_ibfk_3` FOREIGN KEY (`cuenta_debito`) REFERENCES `plan_contable` (`id_cuenta`),
  CONSTRAINT `con_distribucion_documentos_ibfk_4` FOREIGN KEY (`cuenta_credito`) REFERENCES `plan_contable` (`id_cuenta`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE `configuracion_agente_ia` (
  `id_config` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `modulo_activo` tinyint(1) DEFAULT '1',
  `frecuencia_revision_horas` int DEFAULT '6',
  `anticipacion_dias_tareas` int DEFAULT '7',
  `auto_asignar_recursos` tinyint(1) DEFAULT '0',
  `notificar_por_email` tinyint(1) DEFAULT '1',
  `notificar_por_app` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_config`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `configuracion_agente_ia_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `contab_comprobantes` (
  `id_comprobante` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_periodo` int NOT NULL,
  `id_tipo_comp` int NOT NULL,
  `numero` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('Abierto','Cerrado','Anulado') COLLATE utf8mb4_unicode_ci DEFAULT 'Abierto',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_comprobante`),
  UNIQUE KEY `uq_contab_comprobantes_numero_tenant` (`id_tenant`,`numero`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `contab_detalles` (
  `id_detalle` bigint NOT NULL AUTO_INCREMENT,
  `id_documento` bigint NOT NULL,
  `id_cuenta` int NOT NULL,
  `id_tercero` int DEFAULT NULL,
  `id_centro_costo` int DEFAULT NULL,
  `descripcion` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `valor_base` decimal(15,2) DEFAULT '0.00',
  `debito` decimal(15,2) DEFAULT '0.00',
  `credito` decimal(15,2) DEFAULT '0.00',
  PRIMARY KEY (`id_detalle`),
  KEY `id_documento` (`id_documento`),
  CONSTRAINT `contab_detalles_ibfk_1` FOREIGN KEY (`id_documento`) REFERENCES `contab_documentos` (`id_documento`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1840 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `contab_documentos` (
  `id_documento` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_comprobante` bigint DEFAULT NULL,
  `id_tipo_doc` int NOT NULL,
  `numero_doc` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` date NOT NULL,
  `concepto` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_tercero` int DEFAULT NULL,
  `estado` enum('Borrador','Aprobado','Anulado') COLLATE utf8mb4_unicode_ci DEFAULT 'Borrador',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `tabla_origen` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_origen` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_documento`),
  KEY `id_comprobante` (`id_comprobante`),
  KEY `id_tipo_doc` (`id_tipo_doc`),
  CONSTRAINT `contab_documentos_ibfk_1` FOREIGN KEY (`id_comprobante`) REFERENCES `contab_comprobantes` (`id_comprobante`) ON DELETE CASCADE,
  CONSTRAINT `contab_documentos_ibfk_2` FOREIGN KEY (`id_tipo_doc`) REFERENCES `tipos_documentos` (`id_tipo_doc`)
) ENGINE=InnoDB AUTO_INCREMENT=882 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `contab_plantillas` (
  `id_plantilla` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `id_tipo_doc_defecto` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `codigo_evento` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id_plantilla`),
  UNIQUE KEY `uq_contab_plantillas_nombre_tenant` (`id_tenant`,`nombre`),
  UNIQUE KEY `uq_contab_plantillas_codigo_evento_tenant` (`id_tenant`,`codigo_evento`),
  KEY `id_tipo_doc_defecto` (`id_tipo_doc_defecto`),
  CONSTRAINT `contab_plantillas_ibfk_1` FOREIGN KEY (`id_tipo_doc_defecto`) REFERENCES `tipos_documentos` (`id_tipo_doc`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `contab_plantillas_detalles` (
  `id_detalle_plantilla` int NOT NULL AUTO_INCREMENT,
  `id_plantilla` int NOT NULL,
  `id_cuenta` int NOT NULL,
  `naturaleza` enum('Debito','Credito') NOT NULL,
  `concepto_defecto` varchar(200) DEFAULT NULL,
  `variable_valor` varchar(50) DEFAULT 'total' COMMENT 'Propiedad del JSON a leer (ej: total, subtotal, iva)',
  PRIMARY KEY (`id_detalle_plantilla`),
  KEY `id_plantilla` (`id_plantilla`),
  KEY `id_cuenta` (`id_cuenta`),
  CONSTRAINT `contab_plantillas_detalles_ibfk_1` FOREIGN KEY (`id_plantilla`) REFERENCES `contab_plantillas` (`id_plantilla`) ON DELETE CASCADE,
  CONSTRAINT `contab_plantillas_detalles_ibfk_2` FOREIGN KEY (`id_cuenta`) REFERENCES `plan_contable` (`id_cuenta`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=107 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `control_plagas` (
  `id_control_plaga` bigint NOT NULL AUTO_INCREMENT,
  `id_deteccion` bigint NOT NULL,
  `tipo_control` enum('Quimico','Biologico','Cultural','Mecanico') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `producto_metodo` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `dosis` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `area_aplicacion_ha` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id_control_plaga`),
  KEY `id_deteccion` (`id_deteccion`),
  CONSTRAINT `control_plagas_ibfk_1` FOREIGN KEY (`id_deteccion`) REFERENCES `detecciones_fitosanitarias` (`id_deteccion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cosechas` (
  `id_cosecha` bigint NOT NULL AUTO_INCREMENT,
  `id_siembra` bigint NOT NULL,
  `fecha_cosecha` date NOT NULL,
  `hectareas_cosechadas` decimal(10,2) DEFAULT NULL,
  `rendimiento_estimado_ha` decimal(12,2) DEFAULT NULL,
  `rendimiento_real_ha` decimal(12,2) DEFAULT NULL,
  `produccion_total_kg` decimal(15,2) DEFAULT NULL,
  `calidad_cosecha` enum('Excelente','Buena','Regular','Mala') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `perdidas_porcentaje` decimal(5,2) DEFAULT NULL,
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `id_lote_producto_principal` bigint DEFAULT NULL,
  `es_cosecha_final` tinyint(1) DEFAULT '1',
  `porcentaje_humedad` decimal(5,2) DEFAULT NULL,
  `factor_conversion_seco` decimal(5,4) DEFAULT NULL,
  PRIMARY KEY (`id_cosecha`),
  KEY `id_siembra` (`id_siembra`),
  CONSTRAINT `cosechas_ibfk_1` FOREIGN KEY (`id_siembra`) REFERENCES `siembras` (`id_siembra`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `costos_produccion` (
  `id_costo_prod` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_finca` int NOT NULL,
  `id_lote` int NOT NULL,
  `id_cultivo` int NOT NULL,
  `periodo` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `costo_mano_obra` decimal(15,2) DEFAULT '0.00',
  `costo_insumos` decimal(15,2) DEFAULT '0.00',
  `costo_maquinaria` decimal(15,2) DEFAULT '0.00',
  `costo_riego` decimal(15,2) DEFAULT '0.00',
  `costo_indirecto` decimal(15,2) DEFAULT '0.00',
  `costo_total` decimal(15,2) DEFAULT '0.00',
  PRIMARY KEY (`id_costo_prod`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_finca` (`id_finca`),
  KEY `id_lote` (`id_lote`),
  KEY `id_cultivo` (`id_cultivo`),
  CONSTRAINT `costos_produccion_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `costos_produccion_ibfk_2` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`),
  CONSTRAINT `costos_produccion_ibfk_3` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`),
  CONSTRAINT `costos_produccion_ibfk_4` FOREIGN KEY (`id_cultivo`) REFERENCES `cultivos` (`id_cultivo`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cuentas_bancarias` (
  `id_cuenta_bancaria` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `banco` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_cuenta` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_cuenta` enum('Corriente','Ahorros','Nomina','Inversion') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `moneda` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `saldo_inicial` decimal(15,2) DEFAULT '0.00',
  `saldo_actual` decimal(15,2) DEFAULT '0.00',
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_cuenta_bancaria`),
  UNIQUE KEY `uq_cuentas_bancarias_codigo_tenant` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_cuentas_bancarias_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `cuentas_bancarias_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cultivos` (
  `id_cultivo` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_cientifico` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ciclo_dias` int DEFAULT NULL,
  `tipo` enum('Permanente','Transitorio','Hortaliza','Frutal','Cana','Palma','Cereal','Leguminosa','Tuberculo','Aromatica','Medicinal','Condimento','Otro') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `temperatura_optima_min` decimal(4,1) DEFAULT NULL,
  `temperatura_optima_max` decimal(4,1) DEFAULT NULL,
  `precipitacion_optima_mm` decimal(6,2) DEFAULT NULL,
  `altitud_optima_min` decimal(8,2) DEFAULT NULL,
  `altitud_optima_max` decimal(8,2) DEFAULT NULL,
  `ph_optimo_min` decimal(3,1) DEFAULT NULL,
  `ph_optimo_max` decimal(3,1) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_cultivo`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cultivos_catalogo` (
  `id_catalogo` int NOT NULL AUTO_INCREMENT,
  `nombre_oficial` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `familia_botanica` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requerimiento_hidrico_anual_mm` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id_catalogo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `datos_climaticos_diarios` (
  `id_clima` bigint NOT NULL AUTO_INCREMENT,
  `id_estacion` int NOT NULL,
  `fecha` date NOT NULL,
  `temperatura_max` decimal(5,2) DEFAULT NULL,
  `temperatura_min` decimal(5,2) DEFAULT NULL,
  `temperatura_promedio` decimal(5,2) DEFAULT NULL,
  `humedad_relativa_max` decimal(5,2) DEFAULT NULL,
  `humedad_relativa_min` decimal(5,2) DEFAULT NULL,
  `humedad_promedio` decimal(5,2) DEFAULT NULL,
  `precipitacion_mm` decimal(6,2) DEFAULT NULL,
  `velocidad_viento_kmh` decimal(5,2) DEFAULT NULL,
  `radiacion_solar` decimal(8,2) DEFAULT NULL,
  `evaporacion_mm` decimal(6,2) DEFAULT NULL,
  `horas_sol` decimal(5,2) DEFAULT NULL,
  `indice_uv` decimal(3,1) DEFAULT NULL,
  PRIMARY KEY (`id_clima`),
  UNIQUE KEY `uk_clima_estacion_fecha` (`id_estacion`,`fecha`),
  KEY `idx_clima_fecha` (`fecha`),
  CONSTRAINT `datos_climaticos_diarios_ibfk_1` FOREIGN KEY (`id_estacion`) REFERENCES `estaciones_meteorologicas` (`id_estacion`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `despachos` (
  `id_despacho` bigint NOT NULL AUTO_INCREMENT,
  `id_cosecha` bigint NOT NULL,
  `id_transporte` int NOT NULL,
  `fecha_despacho` date NOT NULL,
  `peso_neto_kg` decimal(15,2) DEFAULT NULL,
  `destino` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `guia_remision` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_despacho`),
  KEY `id_cosecha` (`id_cosecha`),
  KEY `id_transporte` (`id_transporte`),
  CONSTRAINT `despachos_ibfk_1` FOREIGN KEY (`id_cosecha`) REFERENCES `cosechas` (`id_cosecha`),
  CONSTRAINT `despachos_ibfk_2` FOREIGN KEY (`id_transporte`) REFERENCES `transportes` (`id_transporte`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `detalle_orden_mantenimiento` (
  `id_detalle` bigint NOT NULL AUTO_INCREMENT,
  `id_orden_trabajo` bigint NOT NULL,
  `id_actividad_plan` int DEFAULT NULL,
  `nombre_actividad` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `fecha_ejecucion` datetime DEFAULT NULL,
  `tiempo_ejecucion_minutos` int DEFAULT NULL,
  `tecnico_responsable` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_detalle`),
  KEY `id_orden_trabajo` (`id_orden_trabajo`),
  KEY `id_actividad_plan` (`id_actividad_plan`),
  CONSTRAINT `detalle_orden_mantenimiento_ibfk_1` FOREIGN KEY (`id_orden_trabajo`) REFERENCES `ordenes_trabajo_mantenimiento` (`id_orden_trabajo`),
  CONSTRAINT `detalle_orden_mantenimiento_ibfk_2` FOREIGN KEY (`id_actividad_plan`) REFERENCES `actividades_mantenimiento_preventivo` (`id_actividad_plan`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `detecciones_fitosanitarias` (
  `id_deteccion` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_lote` int NOT NULL,
  `id_siembra` bigint NOT NULL,
  `id_plaga` int DEFAULT NULL,
  `id_enfermedad` int DEFAULT NULL,
  `id_maleza` int DEFAULT NULL,
  `fecha_deteccion` date NOT NULL,
  `gravedad_observada` enum('Baja','Media','Alta','Critica') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `porcentaje_afectacion` decimal(5,2) DEFAULT NULL,
  `superficie_afectada_ha` decimal(10,2) DEFAULT NULL,
  `fase_fenologica` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `control_realizado` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `efectividad_control` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id_deteccion`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_lote` (`id_lote`),
  KEY `id_siembra` (`id_siembra`),
  KEY `id_plaga` (`id_plaga`),
  KEY `id_enfermedad` (`id_enfermedad`),
  KEY `id_maleza` (`id_maleza`),
  CONSTRAINT `detecciones_fitosanitarias_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `detecciones_fitosanitarias_ibfk_2` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`),
  CONSTRAINT `detecciones_fitosanitarias_ibfk_3` FOREIGN KEY (`id_siembra`) REFERENCES `siembras` (`id_siembra`),
  CONSTRAINT `detecciones_fitosanitarias_ibfk_4` FOREIGN KEY (`id_plaga`) REFERENCES `plagas` (`id_plaga`),
  CONSTRAINT `detecciones_fitosanitarias_ibfk_5` FOREIGN KEY (`id_enfermedad`) REFERENCES `enfermedades` (`id_enfermedad`),
  CONSTRAINT `detecciones_fitosanitarias_ibfk_6` FOREIGN KEY (`id_maleza`) REFERENCES `malezas` (`id_maleza`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dian_configuracion` (
  `id_config` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL DEFAULT '1',
  `entorno` enum('Pruebas','Produccion') COLLATE utf8mb4_unicode_ci DEFAULT 'Pruebas',
  `api_token` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `test_set_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `software_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `software_pin` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_config`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dian_nominas_cabecera` (
  `id_nomina_dian` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL DEFAULT '1',
  `id_planilla_manual` int DEFAULT NULL COMMENT 'Vinculación a la planilla operativa',
  `prefijo` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'NI',
  `consecutivo` int NOT NULL,
  `cune` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Código Único de Nómina Electrónica',
  `fecha_emision` date DEFAULT NULL,
  `estado_dian` enum('Borrador','Procesando','Validada','Rechazada') COLLATE utf8mb4_unicode_ci DEFAULT 'Borrador',
  `tipo_documento` int DEFAULT '9' COMMENT '9=Nómina Individual, 10=Ajuste Reemplazo, 11=Ajuste Eliminación',
  `total_devengos` decimal(15,2) DEFAULT '0.00',
  `total_deducciones` decimal(15,2) DEFAULT '0.00',
  `total_comprobante` decimal(15,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_nomina_dian`),
  UNIQUE KEY `uq_dian_nominas_prefijo_consecutivo_tenant` (`id_tenant`,`prefijo`,`consecutivo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dian_nominas_deducciones` (
  `id_deduccion` int NOT NULL AUTO_INCREMENT,
  `id_nomina_dian` int NOT NULL,
  `concepto` enum('Salud','Pension','Fondo Solidaridad','Libranza','Retencion','Otras') COLLATE utf8mb4_unicode_ci NOT NULL,
  `porcentaje` decimal(5,2) DEFAULT NULL,
  `valor` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id_deduccion`),
  KEY `id_nomina_dian` (`id_nomina_dian`),
  CONSTRAINT `dian_nominas_deducciones_ibfk_1` FOREIGN KEY (`id_nomina_dian`) REFERENCES `dian_nominas_cabecera` (`id_nomina_dian`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dian_nominas_devengos` (
  `id_devengo` int NOT NULL AUTO_INCREMENT,
  `id_nomina_dian` int NOT NULL,
  `concepto` enum('Basico','Transporte','Horas Extras','Bonificaciones','Otros') COLLATE utf8mb4_unicode_ci NOT NULL,
  `dias_trabajados` int DEFAULT '0',
  `valor` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id_devengo`),
  KEY `id_nomina_dian` (`id_nomina_dian`),
  CONSTRAINT `dian_nominas_devengos_ibfk_1` FOREIGN KEY (`id_nomina_dian`) REFERENCES `dian_nominas_cabecera` (`id_nomina_dian`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dian_nominas_logs` (
  `id_log` int NOT NULL AUTO_INCREMENT,
  `id_nomina_dian` int DEFAULT NULL,
  `evento` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_payload` json DEFAULT NULL,
  `response_payload` json DEFAULT NULL,
  `xml_url` text COLLATE utf8mb4_unicode_ci,
  `zip_url` text COLLATE utf8mb4_unicode_ci,
  `codigo_respuesta` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mensaje_error` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_log`),
  KEY `id_nomina_dian` (`id_nomina_dian`),
  CONSTRAINT `dian_nominas_logs_ibfk_1` FOREIGN KEY (`id_nomina_dian`) REFERENCES `dian_nominas_cabecera` (`id_nomina_dian`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dian_nominas_trabajador` (
  `id_trabajador_dian` int NOT NULL AUTO_INCREMENT,
  `id_nomina_dian` int NOT NULL,
  `id_empleado` int NOT NULL,
  `tipo_trabajador_id` int DEFAULT '1' COMMENT 'Tabla de DIAN ej: 1=Dependiente',
  `subtipo_trabajador_id` int DEFAULT '0' COMMENT '0=No Aplica',
  `tipo_contrato_id` int DEFAULT '1' COMMENT '1=Termino Fijo, 2=Indefinido',
  `sueldo` decimal(15,2) DEFAULT NULL,
  `municipio_id` int DEFAULT NULL COMMENT 'ID DIAN Municipio',
  `codigo_trabajador` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_trabajador_dian`),
  KEY `id_nomina_dian` (`id_nomina_dian`),
  CONSTRAINT `dian_nominas_trabajador_ibfk_1` FOREIGN KEY (`id_nomina_dian`) REFERENCES `dian_nominas_cabecera` (`id_nomina_dian`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dian_respuestas_presentacion` (
  `id_respuesta` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `ambiente` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'presentacion',
  `is_valid` tinyint(1) NOT NULL DEFAULT '1',
  `cune_prefijo` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `xml_url_base` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `zip_url_base` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_message` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_respuesta`),
  UNIQUE KEY `uq_dian_respuesta` (`id_tenant`,`ambiente`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dispositivos_moviles` (
  `id_dispositivo` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_usuario_asignado` int DEFAULT NULL,
  `imei` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_telefono` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `marca` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modelo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sistema_operativo` enum('Android','iOS','HarmonyOS') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_dispositivo`),
  UNIQUE KEY `uq_dispositivos_moviles_imei_tenant` (`id_tenant`,`imei`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_usuario_asignado` (`id_usuario_asignado`),
  CONSTRAINT `dispositivos_moviles_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `dispositivos_moviles_ibfk_2` FOREIGN KEY (`id_usuario_asignado`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `documentos_comerciales` (
  `id_documento` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_tipo_doc` int DEFAULT NULL,
  `id_tercero` int NOT NULL,
  `numero_documento` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_emision` date NOT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `subtotal` decimal(15,2) NOT NULL DEFAULT '0.00',
  `iva_total` decimal(15,2) DEFAULT '0.00',
  `total` decimal(15,2) NOT NULL DEFAULT '0.00',
  `estado` enum('Borrador','Emitido','Contabilizado','Anulado','Pagado_Parcial','Pagado_Total') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Borrador',
  `tipo_pago` enum('Contado','Credito','Mixto') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Credito',
  `plazo_dias` int DEFAULT '0',
  `usuario_creacion` int NOT NULL,
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_documento`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_tercero` (`id_tercero`),
  KEY `usuario_creacion` (`usuario_creacion`),
  CONSTRAINT `documentos_comerciales_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `documentos_comerciales_ibfk_2` FOREIGN KEY (`id_tercero`) REFERENCES `terceros` (`id_tercero`),
  CONSTRAINT `documentos_comerciales_ibfk_3` FOREIGN KEY (`usuario_creacion`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `documentos_gestion` (
  `id_documento` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `titulo` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_documento` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url_archivo` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_carga` datetime DEFAULT CURRENT_TIMESTAMP,
  `estado` enum('Borrador','Aprobado','Archivado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Aprobado',
  PRIMARY KEY (`id_documento`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `documentos_gestion_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `energia_consumo` (
  `id_consumo` bigint NOT NULL AUTO_INCREMENT,
  `id_fuente_energia` int NOT NULL,
  `id_finca` int NOT NULL,
  `fecha_medicion` date NOT NULL,
  `kwh_consumidos` decimal(12,2) NOT NULL,
  `costo_total` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id_consumo`),
  KEY `id_fuente_energia` (`id_fuente_energia`),
  KEY `id_finca` (`id_finca`),
  CONSTRAINT `energia_consumo_ibfk_1` FOREIGN KEY (`id_fuente_energia`) REFERENCES `energia_fuentes` (`id_fuente_energia`),
  CONSTRAINT `energia_consumo_ibfk_2` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `energia_fuentes` (
  `id_fuente_energia` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `tipo` enum('Red_Electrica','Solar','Diesel','Biomasa','Biodigestor') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `capacidad_instalada_kw` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id_fuente_energia`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `energia_fuentes_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `energia_huella_carbono` (
  `id_huella_energia` bigint NOT NULL AUTO_INCREMENT,
  `id_consumo` bigint NOT NULL,
  `kg_co2_generado` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id_huella_energia`),
  KEY `id_consumo` (`id_consumo`),
  CONSTRAINT `energia_huella_carbono_ibfk_1` FOREIGN KEY (`id_consumo`) REFERENCES `energia_consumo` (`id_consumo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `energia_produccion_propia` (
  `id_prod_energia` bigint NOT NULL AUTO_INCREMENT,
  `id_fuente_energia` int NOT NULL,
  `periodo_mes` int NOT NULL,
  `kwh_generados` decimal(12,2) NOT NULL,
  `kwh_vertidos_red` decimal(12,2) DEFAULT '0.00',
  `costo_produccion` decimal(15,2) DEFAULT NULL,
  PRIMARY KEY (`id_prod_energia`),
  KEY `id_fuente_energia` (`id_fuente_energia`),
  CONSTRAINT `energia_produccion_propia_ibfk_1` FOREIGN KEY (`id_fuente_energia`) REFERENCES `energia_fuentes` (`id_fuente_energia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `enfermedades` (
  `id_enfermedad` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_comun` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_cientifico` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `sintomas` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `imagen_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gravedad` enum('Baja','Media','Alta','Critica') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `agente_causal` enum('Hongo','Bacteria','Virus','Fitoplasma','Nematodo') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_enfermedad`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `estaciones_meteorologicas` (
  `id_estacion` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_finca` int DEFAULT NULL,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ubicacion_gps` point DEFAULT NULL,
  `marca` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modelo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activa` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_estacion`),
  UNIQUE KEY `uq_estaciones_meteorologicas_codigo_tenant` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_estaciones_meteorologicas_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_finca` (`id_finca`),
  CONSTRAINT `estaciones_meteorologicas_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `estaciones_meteorologicas_ibfk_2` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `estados_patrimonio_movimientos` (
  `id_registro` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `anio` int NOT NULL,
  `codigo` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `saldo_inicial` decimal(15,2) NOT NULL DEFAULT '0.00',
  `aumentos` decimal(15,2) NOT NULL DEFAULT '0.00',
  `disminuciones` decimal(15,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id_registro`),
  UNIQUE KEY `uq_patrimonio_anio` (`id_tenant`,`anio`,`codigo`),
  UNIQUE KEY `uq_estados_patrimonio_movimientos_codigo_tenant` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_estados_patrimonio_movimientos_nombre_tenant` (`id_tenant`,`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `eventos_climaticos` (
  `id_evento` bigint NOT NULL AUTO_INCREMENT,
  `id_finca` int NOT NULL,
  `id_lote` int DEFAULT NULL,
  `tipo_evento` enum('Sequia','Tormenta','Inundacion','Helada','Granizada','Huracan') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `severidad` enum('Baja','Media','Alta','Critica') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `impacto_estimado` decimal(15,2) DEFAULT NULL,
  `area_afectada_ha` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id_evento`),
  KEY `id_finca` (`id_finca`),
  KEY `id_lote` (`id_lote`),
  CONSTRAINT `eventos_climaticos_ibfk_1` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`),
  CONSTRAINT `eventos_climaticos_ibfk_2` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fenologia_cultivo` (
  `id_fenologia_cultivo` int NOT NULL AUTO_INCREMENT,
  `id_cultivo` int NOT NULL,
  `id_etapa` int NOT NULL,
  `duracion_promedio_dias` int DEFAULT NULL,
  `kc_coeficiente` decimal(4,2) DEFAULT NULL,
  PRIMARY KEY (`id_fenologia_cultivo`),
  KEY `id_cultivo` (`id_cultivo`),
  KEY `id_etapa` (`id_etapa`),
  CONSTRAINT `fenologia_cultivo_ibfk_1` FOREIGN KEY (`id_cultivo`) REFERENCES `cultivos` (`id_cultivo`),
  CONSTRAINT `fenologia_cultivo_ibfk_2` FOREIGN KEY (`id_etapa`) REFERENCES `fenologia_etapas` (`id_etapa`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fenologia_etapas` (
  `id_etapa` int NOT NULL AUTO_INCREMENT,
  `id_cultivo` int NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `dia_inicio` int NOT NULL,
  `dia_fin` int NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_etapa`),
  KEY `id_cultivo` (`id_cultivo`),
  CONSTRAINT `fenologia_etapas_ibfk_1` FOREIGN KEY (`id_cultivo`) REFERENCES `cultivos` (`id_cultivo`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fertilizaciones` (
  `id_fertilizacion` bigint NOT NULL AUTO_INCREMENT,
  `id_trazabilidad` bigint NOT NULL,
  `id_insumo` int NOT NULL,
  `dosis_por_ha` decimal(10,2) DEFAULT NULL,
  `concentracion_n` decimal(5,2) DEFAULT NULL,
  `concentracion_p` decimal(5,2) DEFAULT NULL,
  `concentracion_k` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id_fertilizacion`),
  KEY `id_trazabilidad` (`id_trazabilidad`),
  CONSTRAINT `fertilizaciones_ibfk_1` FOREIGN KEY (`id_trazabilidad`) REFERENCES `trazabilidad_lotes` (`id_trazabilidad`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fin_abonos_cxp` (
  `id_abono_cxp` bigint NOT NULL AUTO_INCREMENT,
  `id_cxp` bigint NOT NULL,
  `fecha_abono` date NOT NULL,
  `valor_abono` decimal(15,2) NOT NULL,
  `forma_pago` enum('Efectivo','Transferencia','Cheque') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `retencion_aplicada` decimal(15,2) DEFAULT '0.00',
  PRIMARY KEY (`id_abono_cxp`),
  KEY `id_cxp` (`id_cxp`),
  CONSTRAINT `fin_abonos_cxp_ibfk_1` FOREIGN KEY (`id_cxp`) REFERENCES `cartera_cxp` (`id_cxp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fin_activos_biologicos_valoracion` (
  `id_valoracion` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int DEFAULT NULL,
  `id_siembra` int DEFAULT NULL,
  `periodo` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `costo_acumulado_historico` decimal(15,2) DEFAULT '0.00',
  `valor_razonable_estimado` decimal(15,2) DEFAULT '0.00',
  `deterioro` decimal(15,2) DEFAULT '0.00',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `contabilizado` tinyint(1) DEFAULT '0',
  `fecha_valoracion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_valoracion`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fin_conciliacion_movimientos` (
  `id_mov_concil` bigint NOT NULL AUTO_INCREMENT,
  `id_conciliacion` bigint NOT NULL,
  `tipo` enum('Conciliado','Pendiente','Error') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `monto` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id_mov_concil`),
  KEY `id_conciliacion` (`id_conciliacion`),
  CONSTRAINT `fin_conciliacion_movimientos_ibfk_1` FOREIGN KEY (`id_conciliacion`) REFERENCES `fin_conciliaciones_bancarias` (`id_conciliacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fin_conciliaciones_bancarias` (
  `id_conciliacion` bigint NOT NULL AUTO_INCREMENT,
  `id_cuenta_bancaria` int NOT NULL,
  `periodo_mes` int NOT NULL,
  `periodo_anio` int NOT NULL,
  `saldo_segun_banco` decimal(15,2) NOT NULL,
  `saldo_segun_libros` decimal(15,2) NOT NULL,
  `diferencia` decimal(15,2) DEFAULT '0.00',
  `estado` enum('Borrador','Cuadrada','Con_Diferencias') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Borrador',
  PRIMARY KEY (`id_conciliacion`),
  KEY `id_cuenta_bancaria` (`id_cuenta_bancaria`),
  CONSTRAINT `fin_conciliaciones_bancarias_ibfk_1` FOREIGN KEY (`id_cuenta_bancaria`) REFERENCES `cuentas_bancarias` (`id_cuenta_bancaria`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fin_extractos_bancarios` (
  `id_extracto` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int DEFAULT NULL,
  `id_cuenta_bancaria` int DEFAULT NULL,
  `fecha` date DEFAULT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referencia` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cargo` decimal(15,2) DEFAULT '0.00',
  `abono` decimal(15,2) DEFAULT '0.00',
  `saldo` decimal(15,2) DEFAULT '0.00',
  `id_detalle_contable` bigint DEFAULT NULL,
  `estado_conciliacion` enum('Pendiente','Conciliado') COLLATE utf8mb4_unicode_ci DEFAULT 'Pendiente',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_extracto`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fin_flujo_caja_proyectado` (
  `id_flujo` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `mes_proyeccion` int NOT NULL,
  `anio_proyeccion` int NOT NULL,
  `ingresos_estimados` decimal(15,2) DEFAULT NULL,
  `egresos_estimados` decimal(15,2) DEFAULT NULL,
  PRIMARY KEY (`id_flujo`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `fin_flujo_caja_proyectado_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fin_presupuestos` (
  `id_presupuesto` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_centro_costo` int NOT NULL,
  `anio` int NOT NULL,
  `categoria_gasto` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `monto_presupuestado` decimal(15,2) NOT NULL,
  `monto_ejecutado` decimal(15,2) DEFAULT '0.00',
  PRIMARY KEY (`id_presupuesto`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_centro_costo` (`id_centro_costo`),
  CONSTRAINT `fin_presupuestos_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `fin_presupuestos_ibfk_2` FOREIGN KEY (`id_centro_costo`) REFERENCES `centros_costo` (`id_centro_costo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fin_retenciones` (
  `id_retencion` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_tercero` int NOT NULL,
  `tipo` enum('ISR','IVA','ICA','Municipal') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `base` decimal(15,2) NOT NULL,
  `porcentaje` decimal(5,2) NOT NULL,
  `monto` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id_retencion`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_tercero` (`id_tercero`),
  CONSTRAINT `fin_retenciones_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `fin_retenciones_ibfk_2` FOREIGN KEY (`id_tercero`) REFERENCES `terceros` (`id_tercero`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `fincas` (
  `id_finca` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `hectareas_totales` decimal(12,2) DEFAULT NULL,
  `poligono_gps` geometry NOT NULL,
  `altitud_min` decimal(8,2) DEFAULT NULL,
  `altitud_max` decimal(8,2) DEFAULT NULL,
  `altitud_promedio` decimal(8,2) DEFAULT NULL,
  `municipio` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vereda` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `zona_agroecologica` enum('Seco','Humedo','Muy_Humedo','Alto_Andino','Selva') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clasificacion_suelo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_finca`),
  UNIQUE KEY `uq_fincas_nombre` (`id_tenant`,`nombre`),
  UNIQUE KEY `uq_fincas_codigo_tenant` (`id_tenant`,`codigo`),
  KEY `idx_finca_tenant` (`id_tenant`,`activo`),
  SPATIAL KEY `poligono_gps` (`poligono_gps`),
  CONSTRAINT `fincas_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `forest_areas_protegidas` (
  `id_area_prot` int NOT NULL AUTO_INCREMENT,
  `id_finca` int NOT NULL,
  `nombre` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('Bosque_Ripario','Reserva','Corredor_Biologico') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `area_ha` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_area_prot`),
  KEY `id_finca` (`id_finca`),
  CONSTRAINT `forest_areas_protegidas_ibfk_1` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `forest_especies` (
  `id_especie_for` int NOT NULL AUTO_INCREMENT,
  `nombre_comun` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_cientifico` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `crecimiento_medio_anual_m3` decimal(8,2) DEFAULT NULL,
  PRIMARY KEY (`id_especie_for`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `forest_inventario` (
  `id_inventario_for` bigint NOT NULL AUTO_INCREMENT,
  `id_plantacion` int NOT NULL,
  `fecha_medicion` date NOT NULL,
  `volumen_maderable_m3` decimal(12,2) DEFAULT NULL,
  `dap_promedio_cm` decimal(8,2) DEFAULT NULL,
  `altura_promedio_m` decimal(8,2) DEFAULT NULL,
  PRIMARY KEY (`id_inventario_for`),
  KEY `id_plantacion` (`id_plantacion`),
  CONSTRAINT `forest_inventario_ibfk_1` FOREIGN KEY (`id_plantacion`) REFERENCES `forest_plantaciones` (`id_plantacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `forest_planes_manejo` (
  `id_plan_for` bigint NOT NULL AUTO_INCREMENT,
  `id_plantacion` int NOT NULL,
  `actividad` enum('Raleo','Poda','Cosecha','Mantenimiento') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_programada` date NOT NULL,
  `estado` enum('Pendiente','Ejecutada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pendiente',
  PRIMARY KEY (`id_plan_for`),
  KEY `id_plantacion` (`id_plantacion`),
  CONSTRAINT `forest_planes_manejo_ibfk_1` FOREIGN KEY (`id_plantacion`) REFERENCES `forest_plantaciones` (`id_plantacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `forest_plantaciones` (
  `id_plantacion` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_finca` int NOT NULL,
  `id_especie_for` int NOT NULL,
  `codigo` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `area_ha` decimal(10,2) NOT NULL,
  `densidad_arboles_ha` int NOT NULL,
  `ano_establecimiento` int NOT NULL,
  `objetivo` enum('Madera','Carbono','Proteccion') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_plantacion`),
  UNIQUE KEY `uq_forest_plantaciones_codigo_tenant` (`id_tenant`,`codigo`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_finca` (`id_finca`),
  KEY `id_especie_for` (`id_especie_for`),
  CONSTRAINT `forest_plantaciones_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `forest_plantaciones_ibfk_2` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`),
  CONSTRAINT `forest_plantaciones_ibfk_3` FOREIGN KEY (`id_especie_for`) REFERENCES `forest_especies` (`id_especie_for`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ganado_alimentacion` (
  `id_alimentacion` bigint NOT NULL AUTO_INCREMENT,
  `id_animal` bigint NOT NULL,
  `tipo_alimento` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cantidad_kg` decimal(8,2) NOT NULL,
  `costo_estimado` decimal(10,2) DEFAULT NULL,
  `fecha` date NOT NULL,
  PRIMARY KEY (`id_alimentacion`),
  KEY `id_animal` (`id_animal`),
  CONSTRAINT `ganado_alimentacion_ibfk_1` FOREIGN KEY (`id_animal`) REFERENCES `ganado_animales` (`id_animal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ganado_animales` (
  `id_animal` bigint NOT NULL AUTO_INCREMENT,
  `id_hato` int NOT NULL,
  `id_raza` int NOT NULL,
  `arete_crotal` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `sexo` enum('Macho','Hembra') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_padre` bigint DEFAULT NULL,
  `id_madre` bigint DEFAULT NULL,
  `peso_actual_kg` decimal(8,2) DEFAULT NULL,
  `estado` enum('Activo','Vendido','Muerto','Descarte') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Activo',
  PRIMARY KEY (`id_animal`),
  UNIQUE KEY `arete_crotal` (`arete_crotal`),
  KEY `id_hato` (`id_hato`),
  KEY `id_raza` (`id_raza`),
  KEY `id_padre` (`id_padre`),
  KEY `id_madre` (`id_madre`),
  CONSTRAINT `ganado_animales_ibfk_1` FOREIGN KEY (`id_hato`) REFERENCES `ganado_hatos` (`id_hato`),
  CONSTRAINT `ganado_animales_ibfk_2` FOREIGN KEY (`id_raza`) REFERENCES `ganado_razas` (`id_raza`),
  CONSTRAINT `ganado_animales_ibfk_3` FOREIGN KEY (`id_padre`) REFERENCES `ganado_animales` (`id_animal`),
  CONSTRAINT `ganado_animales_ibfk_4` FOREIGN KEY (`id_madre`) REFERENCES `ganado_animales` (`id_animal`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ganado_especies` (
  `id_especie` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('Bovino','Porcino','Equino','Aves','Caprino','Ovino','Bufalino') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_especie`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ganado_hatos` (
  `id_hato` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_finca` int NOT NULL,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `proposito` enum('Cria','Levante','Ceba','Lecheria') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_hato`),
  UNIQUE KEY `uq_ganado_hatos_codigo_tenant` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_ganado_hatos_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_finca` (`id_finca`),
  CONSTRAINT `ganado_hatos_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `ganado_hatos_ibfk_2` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ganado_inventario_mensual` (
  `id_inv_ganado` bigint NOT NULL AUTO_INCREMENT,
  `id_hato` int NOT NULL,
  `periodo_mes` int NOT NULL,
  `periodo_anio` int NOT NULL,
  `cantidad_animales` int NOT NULL,
  `biomasa_total_kg` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id_inv_ganado`),
  KEY `id_hato` (`id_hato`),
  CONSTRAINT `ganado_inventario_mensual_ibfk_1` FOREIGN KEY (`id_hato`) REFERENCES `ganado_hatos` (`id_hato`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ganado_mortalidad` (
  `id_mortalidad` bigint NOT NULL AUTO_INCREMENT,
  `id_animal` bigint NOT NULL,
  `causa_presunta` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `diagnostico_veterinario` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `fecha` date NOT NULL,
  `impacto_economico` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id_mortalidad`),
  KEY `id_animal` (`id_animal`),
  CONSTRAINT `ganado_mortalidad_ibfk_1` FOREIGN KEY (`id_animal`) REFERENCES `ganado_animales` (`id_animal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ganado_pesajes` (
  `id_pesaje` bigint NOT NULL AUTO_INCREMENT,
  `id_animal` bigint NOT NULL,
  `fecha_pesaje` date NOT NULL,
  `peso_kg` decimal(8,2) NOT NULL,
  `ganancia_diaria_g` decimal(8,2) DEFAULT NULL,
  PRIMARY KEY (`id_pesaje`),
  KEY `id_animal` (`id_animal`),
  CONSTRAINT `ganado_pesajes_ibfk_1` FOREIGN KEY (`id_animal`) REFERENCES `ganado_animales` (`id_animal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ganado_produccion_leche` (
  `id_produccion_leche` bigint NOT NULL AUTO_INCREMENT,
  `id_animal` bigint NOT NULL,
  `fecha` date NOT NULL,
  `litros_producidos` decimal(6,2) NOT NULL,
  `porcentaje_grasa` decimal(4,2) DEFAULT NULL,
  PRIMARY KEY (`id_produccion_leche`),
  KEY `id_animal` (`id_animal`),
  CONSTRAINT `ganado_produccion_leche_ibfk_1` FOREIGN KEY (`id_animal`) REFERENCES `ganado_animales` (`id_animal`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ganado_razas` (
  `id_raza` int NOT NULL AUTO_INCREMENT,
  `id_especie` int NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `proposito` enum('Carne','Leche','Doble_Proposito','Trabajo') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_raza`),
  KEY `id_especie` (`id_especie`),
  CONSTRAINT `ganado_razas_ibfk_1` FOREIGN KEY (`id_especie`) REFERENCES `ganado_especies` (`id_especie`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ganado_reproduccion` (
  `id_reproduccion` bigint NOT NULL AUTO_INCREMENT,
  `id_animal` bigint NOT NULL,
  `tipo_evento` enum('Servicio','Diagnostico_Gestacion','Parto','Aborto') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` date NOT NULL,
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_reproduccion`),
  KEY `id_animal` (`id_animal`),
  CONSTRAINT `ganado_reproduccion_ibfk_1` FOREIGN KEY (`id_animal`) REFERENCES `ganado_animales` (`id_animal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ganado_sanidad` (
  `id_sanidad` bigint NOT NULL AUTO_INCREMENT,
  `id_animal` bigint NOT NULL,
  `diagnostico` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tratamiento` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `fecha` date NOT NULL,
  PRIMARY KEY (`id_sanidad`),
  KEY `id_animal` (`id_animal`),
  CONSTRAINT `ganado_sanidad_ibfk_1` FOREIGN KEY (`id_animal`) REFERENCES `ganado_animales` (`id_animal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ganado_vacunacion` (
  `id_vacunacion` bigint NOT NULL AUTO_INCREMENT,
  `id_animal` bigint NOT NULL,
  `tipo_vacuna` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` date NOT NULL,
  `dosis` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `veterinario` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `proxima_fecha` date DEFAULT NULL,
  PRIMARY KEY (`id_vacunacion`),
  KEY `id_animal` (`id_animal`),
  CONSTRAINT `ganado_vacunacion_ibfk_1` FOREIGN KEY (`id_animal`) REFERENCES `ganado_animales` (`id_animal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gastos_diarios` (
  `id_gasto` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_categoria_gasto` int NOT NULL,
  `id_caja_menor` int DEFAULT NULL,
  `id_lote` int DEFAULT NULL,
  `fecha_gasto` date NOT NULL,
  `tipo_documento` enum('Factura','Recibo','Ticket','Declaracion_Jurada','Otro') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_documento` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `proveedor_nombre` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cantidad` decimal(12,4) DEFAULT '1.0000',
  `valor_unitario` decimal(15,4) DEFAULT NULL,
  `subtotal` decimal(15,2) NOT NULL,
  `iva_porcentaje` decimal(5,2) DEFAULT '0.00',
  `iva_valor` decimal(15,2) DEFAULT '0.00',
  `total` decimal(15,2) NOT NULL,
  `forma_pago` enum('Efectivo','Transferencia','Cheque','Tarjeta','Credito_Proveedor') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_registra` int NOT NULL,
  `estado` enum('Registrado','Aprobado','Rechazado','Contabilizado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Registrado',
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_gasto`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_categoria_gasto` (`id_categoria_gasto`),
  KEY `id_caja_menor` (`id_caja_menor`),
  KEY `id_lote` (`id_lote`),
  KEY `usuario_registra` (`usuario_registra`),
  CONSTRAINT `gastos_diarios_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `gastos_diarios_ibfk_2` FOREIGN KEY (`id_categoria_gasto`) REFERENCES `categorias_gastos` (`id_categoria_gasto`),
  CONSTRAINT `gastos_diarios_ibfk_3` FOREIGN KEY (`id_caja_menor`) REFERENCES `cajas_menores` (`id_caja_menor`),
  CONSTRAINT `gastos_diarios_ibfk_4` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`),
  CONSTRAINT `gastos_diarios_ibfk_5` FOREIGN KEY (`usuario_registra`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gerencia_abonos_produccion` (
  `id_registro` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `periodo` char(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `compost_ton` decimal(12,2) NOT NULL DEFAULT '0.00',
  `humus_ton` decimal(12,2) NOT NULL DEFAULT '0.00',
  `biol_lt` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id_registro`),
  UNIQUE KEY `uq_abonos_periodo` (`id_tenant`,`periodo`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gerencia_kpis` (
  `id_kpi` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `periodo` char(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `liquidez_corriente` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `prueba_acida` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `endeudamiento` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `margen_ebitda` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `roe` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `roa` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `costo_hectarea_promedio` decimal(15,2) NOT NULL DEFAULT '0.00',
  `ingresos_totales` decimal(15,2) NOT NULL DEFAULT '0.00',
  `costos_operativos` decimal(15,2) NOT NULL DEFAULT '0.00',
  `variacion_ingresos_pct` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `variacion_ebitda_pct` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `variacion_costo_ha_pct` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `fuente` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Presentacion real',
  PRIMARY KEY (`id_kpi`),
  UNIQUE KEY `uq_gerencia_kpis` (`id_tenant`,`periodo`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gerencia_semillas_inventario` (
  `id_registro` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `categoria` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` int NOT NULL DEFAULT '0',
  `orden` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_registro`),
  UNIQUE KEY `uq_semillas_categoria` (`id_tenant`,`categoria`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gps_labores_asignaciones` (
  `id_asignacion` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `tipo_entidad` enum('Empleado','Maquina','Vehiculo') COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_entidad` int NOT NULL,
  `descripcion_labor` varchar(250) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_asignacion` date NOT NULL,
  `estado` enum('Pendiente','En Progreso','Completada','Incumplida') COLLATE utf8mb4_unicode_ci DEFAULT 'Pendiente',
  `geofence_tipo` enum('Punto','Lote') COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_lote` int DEFAULT NULL,
  `punto_gps` point DEFAULT NULL,
  `radio_metros` int DEFAULT '50',
  `dentro_zona_actual` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id_asignacion`),
  KEY `fk_asignaciones_tenant` (`id_tenant`),
  KEY `fk_asignaciones_lote` (`id_lote`),
  CONSTRAINT `fk_asignaciones_lote` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`),
  CONSTRAINT `fk_asignaciones_tenant` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gps_tracking_dispositivos` (
  `id_dispositivo` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `tipo_entidad` enum('Empleado','Maquina','Vehiculo') COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_entidad` int NOT NULL,
  `identificador_gps` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('Activo','Inactivo') COLLATE utf8mb4_unicode_ci DEFAULT 'Activo',
  `ultima_conexion` datetime DEFAULT NULL,
  `ultima_latitud` decimal(10,8) DEFAULT NULL,
  `ultima_longitud` decimal(11,8) DEFAULT NULL,
  `ultima_velocidad` decimal(5,2) DEFAULT '0.00',
  `ultima_direccion` int DEFAULT '0',
  PRIMARY KEY (`id_dispositivo`),
  UNIQUE KEY `uq_gps_tracking_dispositivos_identificador_tenant` (`id_tenant`,`identificador_gps`),
  CONSTRAINT `fk_tracking_tenant` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gps_tracking_historial` (
  `id_log` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_dispositivo` int NOT NULL,
  `fecha_hora` datetime NOT NULL,
  `latitud` decimal(10,8) NOT NULL,
  `longitud` decimal(11,8) NOT NULL,
  `coordenadas_punto` point NOT NULL,
  `velocidad` decimal(5,2) DEFAULT '0.00',
  `direccion` int DEFAULT '0',
  `dentro_zona` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id_log`),
  SPATIAL KEY `coordenadas_punto` (`coordenadas_punto`),
  KEY `fk_historial_tenant` (`id_tenant`),
  KEY `fk_historial_dispositivo` (`id_dispositivo`),
  CONSTRAINT `fk_historial_dispositivo` FOREIGN KEY (`id_dispositivo`) REFERENCES `gps_tracking_dispositivos` (`id_dispositivo`) ON DELETE CASCADE,
  CONSTRAINT `fk_historial_tenant` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `historial_mantenimiento_activo` (
  `id_historial` bigint NOT NULL AUTO_INCREMENT,
  `id_activo` int NOT NULL,
  `id_orden_trabajo` bigint NOT NULL,
  `fecha_mantenimiento` date NOT NULL,
  `tipo_mantenimiento` enum('Preventivo','Correctivo','Emergencia') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion_resumen` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `costo_total` decimal(15,2) DEFAULT NULL,
  `proximo_mantenimiento_programado` date DEFAULT NULL,
  `horas_operacion_momento` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id_historial`),
  KEY `id_activo` (`id_activo`),
  KEY `id_orden_trabajo` (`id_orden_trabajo`),
  CONSTRAINT `historial_mantenimiento_activo_ibfk_1` FOREIGN KEY (`id_activo`) REFERENCES `activos_mantenimiento` (`id_activo`),
  CONSTRAINT `historial_mantenimiento_activo_ibfk_2` FOREIGN KEY (`id_orden_trabajo`) REFERENCES `ordenes_trabajo_mantenimiento` (`id_orden_trabajo`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ia_dashboard_kpis` (
  `id_dashboard` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_finca` int DEFAULT NULL,
  `categoria` enum('Produccion','Financiera','Climatica','RRHH','Ambiental') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `configuracion_json` json NOT NULL,
  PRIMARY KEY (`id_dashboard`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_finca` (`id_finca`),
  CONSTRAINT `ia_dashboard_kpis_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `ia_dashboard_kpis_ibfk_2` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ia_reportes_programados` (
  `id_reporte` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `nombre_reporte` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `frecuencia` enum('Diario','Semanal','Mensual') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `destinatarios` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `formato` enum('PDF','Excel','CSV') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'PDF',
  PRIMARY KEY (`id_reporte`),
  UNIQUE KEY `uq_ia_reportes_programados_nombre_reporte_tenant` (`id_tenant`,`nombre_reporte`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `ia_reportes_programados_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `indicadores_rentabilidad` (
  `id_rentabilidad` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_cultivo` int NOT NULL,
  `periodo` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ingreso_total` decimal(15,2) DEFAULT '0.00',
  `costo_total` decimal(15,2) DEFAULT '0.00',
  `margen_bruto` decimal(15,2) DEFAULT '0.00',
  `roi_pct` decimal(8,2) DEFAULT '0.00',
  `punto_equilibrio_tn` decimal(12,2) DEFAULT '0.00',
  PRIMARY KEY (`id_rentabilidad`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_cultivo` (`id_cultivo`),
  CONSTRAINT `indicadores_rentabilidad_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `indicadores_rentabilidad_ibfk_2` FOREIGN KEY (`id_cultivo`) REFERENCES `cultivos` (`id_cultivo`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `insumos` (
  `id_insumo` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `codigo` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `unidad_medida` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `costo_unitario` decimal(15,4) DEFAULT NULL,
  `stock_actual` decimal(12,2) DEFAULT NULL,
  `stock_minimo` decimal(12,2) DEFAULT NULL,
  `ubicacion_almacen` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `requiere_receta` tinyint(1) DEFAULT '0',
  `ingrediente_activo` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tiempo_reentrada_horas` int DEFAULT NULL,
  `origen_insumo` enum('Compra Externa','Producción Interna','Recolectado') COLLATE utf8mb4_unicode_ci DEFAULT 'Compra Externa',
  `id_finca` int DEFAULT NULL,
  `id_grupo` int DEFAULT NULL,
  `id_subgrupo` int DEFAULT NULL,
  `tipo_item` enum('Producto','Servicio') COLLATE utf8mb4_unicode_ci DEFAULT 'Producto',
  `requiere_devolucion` tinyint(1) DEFAULT '0',
  `descripcion_larga` text COLLATE utf8mb4_unicode_ci,
  `descripcion_corta` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `codigo_proveedor` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `codigo_barras` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `codigo_qr` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aplica_iva` tinyint(1) DEFAULT '0',
  `porcentaje_iva` decimal(5,2) DEFAULT '0.00',
  `subpartida_arancelaria` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `registro_ica` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `origen` enum('Nacional','Importado','Produccion Propia') COLLATE utf8mb4_unicode_ci DEFAULT 'Nacional',
  `precio_venta_1` decimal(15,4) DEFAULT '0.0000',
  `precio_venta_2` decimal(15,4) DEFAULT '0.0000',
  `precio_venta_3` decimal(15,4) DEFAULT '0.0000',
  `maneja_bascula` tinyint(1) DEFAULT '0',
  `id_bascula` int DEFAULT NULL,
  `estado` enum('Activo','Suspendido','Eliminado') COLLATE utf8mb4_unicode_ci DEFAULT 'Activo',
  `es_nocivo` tinyint(1) DEFAULT '0',
  `anotacion_prevencion` text COLLATE utf8mb4_unicode_ci,
  `stock_maximo` decimal(12,2) DEFAULT NULL,
  `id_proveedor` int DEFAULT NULL,
  `imagen_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_insumo`),
  UNIQUE KEY `uq_insumos_codigo_tenant` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_insumos_nombre_tenant` (`id_tenant`,`nombre`),
  UNIQUE KEY `uq_insumos_codigo_barras_tenant` (`id_tenant`,`codigo_barras`),
  UNIQUE KEY `uq_insumos_codigo_proveedor_tenant` (`id_tenant`,`codigo_proveedor`),
  UNIQUE KEY `uq_insumos_codigo_qr_tenant` (`id_tenant`,`codigo_qr`),
  KEY `id_tenant` (`id_tenant`),
  KEY `fk_insumos_finca` (`id_finca`),
  KEY `fk_insumo_grupo` (`id_grupo`),
  KEY `fk_insumo_subgrupo` (`id_subgrupo`),
  CONSTRAINT `fk_insumo_grupo` FOREIGN KEY (`id_grupo`) REFERENCES `inv_grupos` (`id_grupo`) ON DELETE SET NULL,
  CONSTRAINT `fk_insumo_subgrupo` FOREIGN KEY (`id_subgrupo`) REFERENCES `inv_subgrupos` (`id_subgrupo`) ON DELETE SET NULL,
  CONSTRAINT `fk_insumos_finca` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`) ON DELETE CASCADE,
  CONSTRAINT `insumos_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Insumos';

CREATE TABLE `inv_autorizadores_pedidos` (
  `id_autorizador` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_empleado` int NOT NULL,
  `area_autorizada` enum('Todas','Pre-vivero','Vivero','Siembra','Mantenimiento_Agricola','Sanidad_Vegetal','Cosecha_Recoleccion','Vias_Canales','Planta_Extractora','Taller_Maquinaria','Bodega','Administracion','Campamento_Casino','Produccion_Bioles','Seguridad') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Todas',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_autorizador`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inv_conversiones` (
  `id_conversion` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_insumo` int NOT NULL,
  `id_unidad_origen` int NOT NULL,
  `id_unidad_destino` int NOT NULL,
  `factor_multiplicador` decimal(12,4) NOT NULL,
  PRIMARY KEY (`id_conversion`),
  UNIQUE KEY `uq_inv_conversiones_insumo_unidad_tenant` (`id_tenant`,`id_insumo`,`id_unidad_origen`),
  KEY `id_unidad_destino` (`id_unidad_destino`),
  KEY `inv_conversiones_ibfk_1` (`id_insumo`),
  KEY `inv_conversiones_ibfk_2` (`id_unidad_origen`),
  CONSTRAINT `inv_conversiones_ibfk_1` FOREIGN KEY (`id_insumo`) REFERENCES `insumos` (`id_insumo`),
  CONSTRAINT `inv_conversiones_ibfk_2` FOREIGN KEY (`id_unidad_origen`) REFERENCES `inv_unidades_medida` (`id_unidad`),
  CONSTRAINT `inv_conversiones_ibfk_3` FOREIGN KEY (`id_unidad_destino`) REFERENCES `inv_unidades_medida` (`id_unidad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Inv Conversiones';

CREATE TABLE `inv_documentos` (
  `id_documento` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_tipo` int NOT NULL,
  `consecutivo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  `id_bodega_origen` int DEFAULT NULL,
  `id_bodega_destino` int DEFAULT NULL,
  `estado` enum('Borrador','Aplicado','Anulado') COLLATE utf8mb4_unicode_ci DEFAULT 'Borrador',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `id_usuario_crea` int DEFAULT NULL,
  `id_usuario_aprueba` int DEFAULT NULL,
  `peso_bascula_entrada` decimal(12,2) DEFAULT NULL,
  `peso_bascula_salida` decimal(12,2) DEFAULT NULL,
  `id_empleado_recibe` int DEFAULT NULL,
  `id_empleado_entrega` int DEFAULT NULL,
  `persona_reclama` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_maquina` int DEFAULT NULL,
  `firma_recibe` longtext COLLATE utf8mb4_unicode_ci COMMENT 'Base64 signature image',
  PRIMARY KEY (`id_documento`),
  KEY `id_tipo` (`id_tipo`),
  CONSTRAINT `inv_documentos_ibfk_1` FOREIGN KEY (`id_tipo`) REFERENCES `inv_tipos_documento` (`id_tipo`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Inv Documentos';

CREATE TABLE `inv_existencias` (
  `id_existencia` int NOT NULL AUTO_INCREMENT,
  `id_bodega` int NOT NULL,
  `id_insumo` int NOT NULL,
  `cantidad` decimal(12,2) DEFAULT '0.00',
  `costo_promedio` decimal(15,4) DEFAULT '0.0000',
  `fecha_ultima_actualizacion` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `estanteria` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nivel` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_existencia`),
  UNIQUE KEY `idx_bodega_insumo` (`id_bodega`,`id_insumo`),
  KEY `id_insumo` (`id_insumo`),
  CONSTRAINT `inv_existencias_ibfk_1` FOREIGN KEY (`id_bodega`) REFERENCES `bod_bodegas` (`id_bodega`) ON DELETE CASCADE,
  CONSTRAINT `inv_existencias_ibfk_2` FOREIGN KEY (`id_insumo`) REFERENCES `insumos` (`id_insumo`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inv_grupos` (
  `id_grupo` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `codigo` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_grupo`),
  UNIQUE KEY `uq_inv_grupos_codigo_tenant` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_inv_grupos_nombre_tenant` (`id_tenant`,`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Inv Grupos';

CREATE TABLE `inv_pedidos` (
  `id_pedido` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `tipo_origen` enum('Pre-vivero','Vivero','Siembra','Mantenimiento_Agricola','Sanidad_Vegetal','Cosecha_Recoleccion','Vias_Canales','Planta_Extractora','Taller_Maquinaria','Bodega','Administracion','Campamento_Casino','Produccion_Bioles','Seguridad') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Bodega',
  `id_origen` int DEFAULT NULL,
  `id_bodega_solicita` int DEFAULT NULL,
  `id_bodega_provee` int DEFAULT NULL,
  `estado` enum('Pendiente_Aprobacion','Aprobado','Rechazado','Despachado','Recibido') COLLATE utf8mb4_unicode_ci DEFAULT 'Pendiente_Aprobacion',
  `fecha_solicitud` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_requerida` date DEFAULT NULL,
  `fecha_aprobacion` datetime DEFAULT NULL,
  `id_usuario_solicita` int DEFAULT NULL,
  `id_usuario_aprueba` int DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `nombre_solicitante` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre_autorizador` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `es_alerta_automatica` tinyint(1) DEFAULT '1',
  `id_usuario_entrega` int DEFAULT NULL,
  `id_usuario_recibe` int DEFAULT NULL,
  PRIMARY KEY (`id_pedido`),
  KEY `id_bodega_solicita` (`id_bodega_solicita`),
  KEY `id_bodega_provee` (`id_bodega_provee`),
  CONSTRAINT `inv_pedidos_ibfk_1` FOREIGN KEY (`id_bodega_solicita`) REFERENCES `bod_bodegas` (`id_bodega`),
  CONSTRAINT `inv_pedidos_ibfk_2` FOREIGN KEY (`id_bodega_provee`) REFERENCES `bod_bodegas` (`id_bodega`)
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inv_pedidos_detalle` (
  `id_detalle` int NOT NULL AUTO_INCREMENT,
  `id_pedido` int NOT NULL,
  `id_insumo` int NOT NULL,
  `cantidad_solicitada` decimal(12,2) NOT NULL,
  `cantidad_aprobada` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id_detalle`),
  KEY `id_pedido` (`id_pedido`),
  KEY `id_insumo` (`id_insumo`),
  CONSTRAINT `inv_pedidos_detalle_ibfk_1` FOREIGN KEY (`id_pedido`) REFERENCES `inv_pedidos` (`id_pedido`) ON DELETE CASCADE,
  CONSTRAINT `inv_pedidos_detalle_ibfk_2` FOREIGN KEY (`id_insumo`) REFERENCES `insumos` (`id_insumo`)
) ENGINE=InnoDB AUTO_INCREMENT=129 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inv_repuestos_cambiados` (
  `id_cambio` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_documento_salida` int NOT NULL,
  `id_pedido_origen` int DEFAULT NULL,
  `id_insumo` int NOT NULL,
  `id_maquinaria` int NOT NULL,
  `id_vehiculo` int DEFAULT NULL,
  `id_empleado` int NOT NULL,
  `pieza_vieja_entregada` tinyint(1) DEFAULT '0',
  `estado_devolucion` enum('Pendiente','Entregado_Bodega','Perdido_Robado') COLLATE utf8mb4_unicode_ci DEFAULT 'Pendiente',
  `fecha_entrega_pieza` datetime DEFAULT NULL,
  `id_usuario_recibe` int DEFAULT NULL,
  PRIMARY KEY (`id_cambio`),
  KEY `id_documento_salida` (`id_documento_salida`),
  KEY `id_insumo` (`id_insumo`),
  KEY `id_maquinaria` (`id_maquinaria`),
  CONSTRAINT `inv_repuestos_cambiados_ibfk_1` FOREIGN KEY (`id_documento_salida`) REFERENCES `inv_documentos` (`id_documento`) ON DELETE CASCADE,
  CONSTRAINT `inv_repuestos_cambiados_ibfk_2` FOREIGN KEY (`id_insumo`) REFERENCES `insumos` (`id_insumo`),
  CONSTRAINT `inv_repuestos_cambiados_ibfk_3` FOREIGN KEY (`id_maquinaria`) REFERENCES `agroind_maquinaria_equipo` (`id_maq_agro`)
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inv_subgrupos` (
  `id_subgrupo` int NOT NULL AUTO_INCREMENT,
  `id_grupo` int NOT NULL,
  `id_tenant` int NOT NULL,
  `codigo` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_subgrupo`),
  UNIQUE KEY `uq_inv_subgrupos_codigo_tenant` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_inv_subgrupos_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `id_grupo` (`id_grupo`),
  CONSTRAINT `inv_subgrupos_ibfk_1` FOREIGN KEY (`id_grupo`) REFERENCES `inv_grupos` (`id_grupo`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Inv Subgrupos';

CREATE TABLE `inv_tipos_documento` (
  `id_tipo` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `codigo` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `naturaleza` enum('Entrada','Salida','Transferencia','Neutro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `es_automatico` tinyint(1) DEFAULT '1',
  `consecutivo_actual` int DEFAULT '1',
  PRIMARY KEY (`id_tipo`),
  UNIQUE KEY `idx_tenant_codigo` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_inv_tipos_documento_nombre_tenant` (`id_tenant`,`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Inv Tipos De Documentos';

CREATE TABLE `inv_tomas_fisicas` (
  `id_toma` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_bodega` int NOT NULL,
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `estado` enum('Borrador','En Conteo','Conciliado') COLLATE utf8mb4_unicode_ci DEFAULT 'Borrador',
  `responsable_id` int DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_toma`),
  KEY `id_bodega` (`id_bodega`),
  CONSTRAINT `inv_tomas_fisicas_ibfk_1` FOREIGN KEY (`id_bodega`) REFERENCES `bod_bodegas` (`id_bodega`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inv_tomas_fisicas_detalle` (
  `id_detalle` int NOT NULL AUTO_INCREMENT,
  `id_toma` int NOT NULL,
  `id_insumo` int NOT NULL,
  `stock_teorico` decimal(12,2) NOT NULL DEFAULT '0.00',
  `stock_fisico` decimal(12,2) DEFAULT NULL,
  `diferencia` decimal(12,2) DEFAULT NULL,
  `procesado` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id_detalle`),
  KEY `id_toma` (`id_toma`),
  KEY `id_insumo` (`id_insumo`),
  CONSTRAINT `inv_tomas_fisicas_detalle_ibfk_1` FOREIGN KEY (`id_toma`) REFERENCES `inv_tomas_fisicas` (`id_toma`) ON DELETE CASCADE,
  CONSTRAINT `inv_tomas_fisicas_detalle_ibfk_2` FOREIGN KEY (`id_insumo`) REFERENCES `insumos` (`id_insumo`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inv_unidades_medida` (
  `id_unidad` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `codigo` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_unidad`),
  UNIQUE KEY `idx_tenant_codigo` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_inv_unidades_medida_nombre_tenant` (`id_tenant`,`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kpis_agricolas` (
  `id_kpi` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `fecha_registro` date NOT NULL,
  `indice` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` decimal(12,2) NOT NULL,
  `unidad_medida` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_kpi`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `kpis_agricolas_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lab_alertas` (
  `id_alerta_lab` bigint NOT NULL AUTO_INCREMENT,
  `id_muestra` bigint NOT NULL,
  `parametro_fuera_rango` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nivel_criticidad` enum('Baja','Media','Alta','Urgente') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `recomendacion_automatica` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_alerta_lab`),
  KEY `id_muestra` (`id_muestra`),
  CONSTRAINT `lab_alertas_ibfk_1` FOREIGN KEY (`id_muestra`) REFERENCES `lab_muestras` (`id_muestra`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lab_historial_lote` (
  `id_historial_lab` bigint NOT NULL AUTO_INCREMENT,
  `id_lote` int NOT NULL,
  `anio` int NOT NULL,
  `promedio_ph` decimal(4,2) DEFAULT NULL,
  `promedio_materia_organica` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id_historial_lab`),
  KEY `id_lote` (`id_lote`),
  CONSTRAINT `lab_historial_lote_ibfk_1` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `labor_stats` (
  `id` int NOT NULL AUTO_INCREMENT,
  `categoria` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cnt` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `labores_diarias` (
  `id_labor` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `categoria` enum('Personal','Cultivos','Lotes','Arboles','Riegos','Maquinas_Vehiculos','Talleres','Semilleros','Viveros','Abonos','Cosecha') COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion_labor` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_planificada` date NOT NULL,
  `id_empleado` int DEFAULT NULL,
  `id_lote` int DEFAULT NULL,
  `id_arbol` int DEFAULT NULL,
  `id_vehiculo` int DEFAULT NULL,
  `id_maquinaria` int DEFAULT NULL,
  `estado` enum('Planificada','En Progreso','Completada','Incumplida') COLLATE utf8mb4_unicode_ci DEFAULT 'Planificada',
  `cumplimiento_observaciones` text COLLATE utf8mb4_unicode_ci,
  `fecha_completado` datetime DEFAULT NULL,
  `evaluado_por` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reporte_enviado` tinyint(1) DEFAULT '0',
  `fecha_reporte` datetime DEFAULT NULL,
  `evidencia_foto` longtext COLLATE utf8mb4_unicode_ci,
  `firma_digital` longtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_labor`),
  KEY `fk_labores_tenant` (`id_tenant`),
  KEY `fk_labores_empleado` (`id_empleado`),
  KEY `fk_labores_lote` (`id_lote`),
  KEY `fk_labores_arbol` (`id_arbol`),
  KEY `fk_labores_vehiculo` (`id_vehiculo`),
  KEY `fk_labores_maquinaria` (`id_maquinaria`),
  CONSTRAINT `fk_labores_arbol` FOREIGN KEY (`id_arbol`) REFERENCES `siembra_arboles` (`id_arbol`) ON DELETE CASCADE,
  CONSTRAINT `fk_labores_empleado` FOREIGN KEY (`id_empleado`) REFERENCES `rrhh_empleados` (`id_empleado`),
  CONSTRAINT `fk_labores_lote` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`),
  CONSTRAINT `fk_labores_maquinaria` FOREIGN KEY (`id_maquinaria`) REFERENCES `maquinaria` (`id_maquinaria`),
  CONSTRAINT `fk_labores_tenant` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `fk_labores_vehiculo` FOREIGN KEY (`id_vehiculo`) REFERENCES `vehiculos` (`id_vehiculo`)
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lib_fitosanitaria_ica` (
  `id_enfermedad_plaga` int NOT NULL AUTO_INCREMENT,
  `tipo` enum('Plaga','Enfermedad') COLLATE utf8mb4_unicode_ci NOT NULL,
  `cultivo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_comun` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_cientifico` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `agente_causal` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sintomas` text COLLATE utf8mb4_unicode_ci,
  `danos_ocasionados` text COLLATE utf8mb4_unicode_ci,
  `umbral_economico_pct` decimal(5,2) DEFAULT NULL,
  `medidas_preventivas` text COLLATE utf8mb4_unicode_ci,
  `control_biologico` text COLLATE utf8mb4_unicode_ci,
  `control_quimico` text COLLATE utf8mb4_unicode_ci,
  `recomendaciones_ica` text COLLATE utf8mb4_unicode_ci,
  `imagen_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nivel_riesgo` enum('Bajo','Medio','Alto','Cuarentenario') COLLATE utf8mb4_unicode_ci DEFAULT 'Medio',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_enfermedad_plaga`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `liberaciones_biologicas` (
  `id_liberacion` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_lote` int NOT NULL,
  `id_siembra` bigint NOT NULL,
  `id_agente` int NOT NULL,
  `fecha_liberacion` date NOT NULL,
  `cantidad_liberada` decimal(12,2) NOT NULL,
  `unidad_medida` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_trazabilidad` bigint DEFAULT NULL,
  `efectividad_estimada` decimal(5,2) DEFAULT NULL,
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_liberacion`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_lote` (`id_lote`),
  KEY `id_siembra` (`id_siembra`),
  KEY `id_agente` (`id_agente`),
  CONSTRAINT `liberaciones_biologicas_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `liberaciones_biologicas_ibfk_2` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`),
  CONSTRAINT `liberaciones_biologicas_ibfk_3` FOREIGN KEY (`id_siembra`) REFERENCES `siembras` (`id_siembra`),
  CONSTRAINT `liberaciones_biologicas_ibfk_4` FOREIGN KEY (`id_agente`) REFERENCES `agentes_biologicos` (`id_agente`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `log_auditoria` (
  `id_audit` bigint NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `tabla_afectada` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `registro_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `operacion` enum('INSERT','UPDATE','DELETE','EXPORT') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `valores_anteriores` json DEFAULT NULL,
  `valores_nuevos` json DEFAULT NULL,
  `fecha_operacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_audit`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `log_auditoria_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lotes` (
  `id_lote` int NOT NULL AUTO_INCREMENT,
  `id_nucleo` int NOT NULL,
  `codigo` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hectareas` decimal(10,2) NOT NULL,
  `poligono_gps` geometry NOT NULL,
  `centro_gps` point DEFAULT NULL,
  `tipo_suelo` enum('Arcilloso','Arenoso','Franco','Limoso','Organico') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ph_promedio` decimal(3,1) DEFAULT NULL,
  `profundidad_util_cm` decimal(5,2) DEFAULT NULL,
  `drenaje` enum('Excelente','Bueno','Regular','Pobre') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('Activo','Descanso','En_Recuperacion','Inactivo','En_Preparacion') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Activo',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_lote`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `id_nucleo` (`id_nucleo`),
  KEY `idx_lote_estado` (`estado`,`activo`),
  SPATIAL KEY `poligono_gps` (`poligono_gps`),
  CONSTRAINT `lotes_ibfk_1` FOREIGN KEY (`id_nucleo`) REFERENCES `nucleos` (`id_nucleo`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `malezas` (
  `id_maleza` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_comun` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_cientifico` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `nivel_agresividad` enum('Baja','Media','Alta','Muy_Alta') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_maleza`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `maquinaria` (
  `id_maquinaria` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `codigo` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('Tractor','Cosechadora','Fumigadora','Riego','Transporte','Preparacion','Otro') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `marca` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modelo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ano_fabricacion` int DEFAULT NULL,
  `horas_motor_actuales` decimal(10,2) DEFAULT NULL,
  `horas_motor_totales` decimal(10,2) DEFAULT '0.00',
  `ultimo_mantenimiento` date DEFAULT NULL,
  `proximo_mantenimiento_horas` decimal(10,2) DEFAULT NULL,
  `estado_operativo` enum('Operativo','Mantenimiento','Danado','Retirado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Operativo',
  `valor_compra` decimal(15,2) DEFAULT NULL,
  `valor_actual` decimal(15,2) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `id_finca` int DEFAULT NULL,
  PRIMARY KEY (`id_maquinaria`),
  UNIQUE KEY `uq_maquinaria_codigo_tenant` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_maquinaria_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `id_tenant` (`id_tenant`),
  KEY `idx_maquinaria_estado` (`estado_operativo`),
  KEY `fk_maquinaria_finca` (`id_finca`),
  CONSTRAINT `fk_maquinaria_finca` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`) ON DELETE CASCADE,
  CONSTRAINT `maquinaria_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `monitoreo_biologico` (
  `id_monitoreo` bigint NOT NULL AUTO_INCREMENT,
  `id_liberacion` bigint NOT NULL,
  `fecha_monitoreo` date NOT NULL,
  `poblacion_plaga_antes` decimal(10,2) DEFAULT NULL,
  `poblacion_plaga_despues` decimal(10,2) DEFAULT NULL,
  `poblacion_agente_control` decimal(10,2) DEFAULT NULL,
  `reduccion_porcentaje` decimal(5,2) DEFAULT NULL,
  `requiere_reliberacion` tinyint(1) DEFAULT '0',
  `metodo_muestreo` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_monitoreo`),
  KEY `id_liberacion` (`id_liberacion`),
  CONSTRAINT `monitoreo_biologico_ibfk_1` FOREIGN KEY (`id_liberacion`) REFERENCES `liberaciones_biologicas` (`id_liberacion`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `movimientos_inventario` (
  `id_movimiento` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_insumo` int NOT NULL,
  `tipo_movimiento` enum('Entrada','Salida','Ajuste','Devolucion') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cantidad` decimal(12,2) NOT NULL,
  `costo_unitario` decimal(15,4) DEFAULT NULL,
  `id_trazabilidad` bigint DEFAULT NULL,
  `fecha_movimiento` datetime DEFAULT CURRENT_TIMESTAMP,
  `documento_referencia` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuario_responsable` int NOT NULL,
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `id_bodega` int DEFAULT NULL,
  `id_documento` int DEFAULT NULL,
  `id_empleado` int DEFAULT NULL,
  `id_vehiculo` int DEFAULT NULL,
  `id_maquina` int DEFAULT NULL,
  `id_lote` int DEFAULT NULL,
  `id_semillero` int DEFAULT NULL,
  `id_produccion_biol` int DEFAULT NULL,
  PRIMARY KEY (`id_movimiento`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_insumo` (`id_insumo`),
  KEY `id_trazabilidad` (`id_trazabilidad`),
  CONSTRAINT `movimientos_inventario_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `movimientos_inventario_ibfk_2` FOREIGN KEY (`id_insumo`) REFERENCES `insumos` (`id_insumo`),
  CONSTRAINT `movimientos_inventario_ibfk_3` FOREIGN KEY (`id_trazabilidad`) REFERENCES `trazabilidad_lotes` (`id_trazabilidad`)
) ENGINE=InnoDB AUTO_INCREMENT=1619 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `niveles_humedad` (
  `id_humedad` bigint NOT NULL AUTO_INCREMENT,
  `id_lote` int NOT NULL,
  `fecha_medicion` datetime NOT NULL,
  `profundidad_cm` int NOT NULL,
  `humedad_pct` decimal(5,2) NOT NULL,
  `capacidad_campo_pct` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id_humedad`),
  KEY `id_lote` (`id_lote`),
  CONSTRAINT `niveles_humedad_ibfk_1` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notificaciones_tareas` (
  `id_notificacion` bigint NOT NULL AUTO_INCREMENT,
  `id_tarea` bigint NOT NULL,
  `id_usuario_destino` int NOT NULL,
  `tipo_notificacion` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mensaje` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `leida` tinyint(1) DEFAULT '0',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_notificacion`),
  KEY `id_tarea` (`id_tarea`),
  KEY `id_usuario_destino` (`id_usuario_destino`),
  CONSTRAINT `notificaciones_tareas_ibfk_1` FOREIGN KEY (`id_tarea`) REFERENCES `tareas_programadas` (`id_tarea`),
  CONSTRAINT `notificaciones_tareas_ibfk_2` FOREIGN KEY (`id_usuario_destino`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `nucleos` (
  `id_nucleo` int NOT NULL AUTO_INCREMENT,
  `id_finca` int NOT NULL,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `hectareas` decimal(10,2) DEFAULT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_nucleo`),
  UNIQUE KEY `uk_nucleo_codigo_finca` (`id_finca`,`codigo`),
  UNIQUE KEY `uq_nucleos_nombre` (`id_finca`,`nombre`),
  CONSTRAINT `nucleos_ibfk_1` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ordenes_compra` (
  `id_orden_compra` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_proveedor` int NOT NULL,
  `numero_orden` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_emision` date NOT NULL,
  `fecha_entrega_esperada` date NOT NULL,
  `subtotal` decimal(15,2) NOT NULL,
  `iva` decimal(15,2) DEFAULT '0.00',
  `total` decimal(15,2) NOT NULL,
  `estado` enum('Borrador','Enviada','Confirmada','Recibida_Total','Cancelada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Borrador',
  `usuario_creador` int NOT NULL,
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_orden_compra`),
  UNIQUE KEY `uq_ordenes_compra_numero_tenant` (`id_tenant`,`numero_orden`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_proveedor` (`id_proveedor`),
  KEY `usuario_creador` (`usuario_creador`),
  CONSTRAINT `ordenes_compra_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `ordenes_compra_ibfk_2` FOREIGN KEY (`id_proveedor`) REFERENCES `terceros` (`id_tercero`),
  CONSTRAINT `ordenes_compra_ibfk_3` FOREIGN KEY (`usuario_creador`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ordenes_compra_detalle` (
  `id_detalle` bigint NOT NULL AUTO_INCREMENT,
  `id_orden_compra` bigint NOT NULL,
  `id_insumo` int NOT NULL,
  `cantidad_pedida` decimal(12,2) NOT NULL,
  `precio_unitario` decimal(15,2) NOT NULL,
  `cantidad_recibida` decimal(12,2) DEFAULT '0.00',
  `id_detalle_solicitud` bigint DEFAULT NULL,
  PRIMARY KEY (`id_detalle`),
  KEY `id_orden_compra` (`id_orden_compra`),
  KEY `id_insumo` (`id_insumo`),
  KEY `fk_oc_detalle_solicitud` (`id_detalle_solicitud`),
  CONSTRAINT `fk_oc_detalle_solicitud` FOREIGN KEY (`id_detalle_solicitud`) REFERENCES `solicitudes_detalle` (`id_detalle_solicitud`) ON DELETE SET NULL,
  CONSTRAINT `ordenes_compra_detalle_ibfk_1` FOREIGN KEY (`id_orden_compra`) REFERENCES `ordenes_compra` (`id_orden_compra`),
  CONSTRAINT `ordenes_compra_detalle_ibfk_2` FOREIGN KEY (`id_insumo`) REFERENCES `insumos` (`id_insumo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ordenes_trabajo_mantenimiento` (
  `id_orden_trabajo` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_activo` int NOT NULL,
  `id_plan` int DEFAULT NULL,
  `numero_orden` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_orden` enum('Preventivo','Correctivo','Emergencia','Predictivo') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `prioridad` enum('Baja','Media','Alta','Critica') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_solicitud` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_programada` date DEFAULT NULL,
  `fecha_inicio` datetime DEFAULT NULL,
  `fecha_fin` datetime DEFAULT NULL,
  `descripcion_problema` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `diagnostico` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `solucion_aplicada` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `horas_trabajadas` decimal(6,2) DEFAULT NULL,
  `costo_mano_obra` decimal(15,2) DEFAULT NULL,
  `costo_repuestos` decimal(15,2) DEFAULT NULL,
  `costo_herramientas` decimal(15,2) DEFAULT NULL,
  `costo_total` decimal(15,2) DEFAULT NULL,
  `id_usuario_solicitante` int NOT NULL,
  `id_tecnico_asignado` int DEFAULT NULL,
  `id_supervisor` int DEFAULT NULL,
  `estado` enum('Solicitada','Aprobada','Programada','En_Ejecucion','Completada','Verificada','Cancelada','Rechazada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Solicitada',
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_orden_trabajo`),
  UNIQUE KEY `uq_ordenes_trabajo_numero_tenant` (`id_tenant`,`numero_orden`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_activo` (`id_activo`),
  KEY `id_plan` (`id_plan`),
  KEY `id_usuario_solicitante` (`id_usuario_solicitante`),
  KEY `id_tecnico_asignado` (`id_tecnico_asignado`),
  KEY `id_supervisor` (`id_supervisor`),
  CONSTRAINT `ordenes_trabajo_mantenimiento_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `ordenes_trabajo_mantenimiento_ibfk_2` FOREIGN KEY (`id_activo`) REFERENCES `activos_mantenimiento` (`id_activo`),
  CONSTRAINT `ordenes_trabajo_mantenimiento_ibfk_3` FOREIGN KEY (`id_plan`) REFERENCES `planes_mantenimiento_preventivo` (`id_plan`),
  CONSTRAINT `ordenes_trabajo_mantenimiento_ibfk_4` FOREIGN KEY (`id_usuario_solicitante`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `ordenes_trabajo_mantenimiento_ibfk_5` FOREIGN KEY (`id_tecnico_asignado`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `ordenes_trabajo_mantenimiento_ibfk_6` FOREIGN KEY (`id_supervisor`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=137 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `periodos_contables` (
  `id_periodo` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `ano` int NOT NULL,
  `mes` int NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `estado` enum('Abierto','Cerrado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Abierto',
  PRIMARY KEY (`id_periodo`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `periodos_contables_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `plagas` (
  `id_plaga` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_comun` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_cientifico` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `sintomas` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `imagen_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gravedad` enum('Baja','Media','Alta','Critica') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ciclo_vida_dias` int DEFAULT NULL,
  `hospederos` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_plaga`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `plagas_catalogo` (
  `id_plaga_cat` int NOT NULL AUTO_INCREMENT,
  `id_plaga` int NOT NULL,
  `cultivo_afectado` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metodo_control_recomendado` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `umbral_economico_pct` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id_plaga_cat`),
  KEY `id_plaga` (`id_plaga`),
  CONSTRAINT `plagas_catalogo_ibfk_1` FOREIGN KEY (`id_plaga`) REFERENCES `plagas` (`id_plaga`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `plan_contable` (
  `id_cuenta` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `codigo` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nivel` int DEFAULT '1',
  `naturaleza` enum('Debito','Credito') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requiere_centro_costo` tinyint(1) DEFAULT '0',
  `porcentaje_impuesto` decimal(5,2) DEFAULT NULL,
  `requiere_tercero` tinyint(1) DEFAULT '0',
  `requiere_cxc` tinyint(1) DEFAULT '0',
  `requiere_cxp` tinyint(1) DEFAULT '0',
  `maneja_iva` tinyint(1) DEFAULT '0',
  `maneja_retefuente` tinyint(1) DEFAULT '0',
  `maneja_reteica` tinyint(1) DEFAULT '0',
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_cuenta`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `plan_contable_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=158 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `planes_fertilizacion` (
  `id_plan_fert` bigint NOT NULL AUTO_INCREMENT,
  `id_cultivo` int NOT NULL,
  `etapa_fenologica` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `dosis_recomendada` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fuentes_optimas` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `cronograma_aplicaciones` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_plan_fert`),
  KEY `id_cultivo` (`id_cultivo`),
  CONSTRAINT `planes_fertilizacion_ibfk_1` FOREIGN KEY (`id_cultivo`) REFERENCES `cultivos` (`id_cultivo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `planes_mantenimiento_preventivo` (
  `id_plan` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_tipo_activo` int NOT NULL,
  `codigo` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `frecuencia_tipo` enum('Horas','Dias','Meses','Kilometros','Ciclos') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `frecuencia_valor` int NOT NULL,
  `duracion_estimada_horas` decimal(6,2) DEFAULT NULL,
  `requiere_parada_maquina` tinyint(1) DEFAULT '0',
  `requiere_herramientas_especiales` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_plan`),
  UNIQUE KEY `uq_planes_mantenimiento_preventivo_codigo_tenant` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_planes_mantenimiento_preventivo_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_tipo_activo` (`id_tipo_activo`),
  CONSTRAINT `planes_mantenimiento_preventivo_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `planes_mantenimiento_preventivo_ibfk_2` FOREIGN KEY (`id_tipo_activo`) REFERENCES `tipos_activo_mantenimiento` (`id_tipo_activo`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `presupuestos_siembra` (
  `id_presupuesto` bigint NOT NULL AUTO_INCREMENT,
  `id_siembra` bigint NOT NULL,
  `concepto` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `presupuesto_cop` decimal(15,2) NOT NULL,
  `ejecutado_cop` decimal(15,2) DEFAULT '0.00',
  `estado` enum('En_Ejecucion','Cerrado','Excedido') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'En_Ejecucion',
  PRIMARY KEY (`id_presupuesto`),
  KEY `id_siembra` (`id_siembra`),
  CONSTRAINT `presupuestos_siembra_ibfk_1` FOREIGN KEY (`id_siembra`) REFERENCES `siembras` (`id_siembra`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `produccion_agentes_biologicos` (
  `id_produccion` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_agente` int NOT NULL,
  `fecha_produccion` date NOT NULL,
  `cantidad_producida` decimal(12,2) NOT NULL,
  `lote_produccion` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `calidad_controlada` tinyint(1) DEFAULT '0',
  `fecha_vencimiento` date DEFAULT NULL,
  `costo_produccion` decimal(15,2) DEFAULT NULL,
  PRIMARY KEY (`id_produccion`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_agente` (`id_agente`),
  CONSTRAINT `produccion_agentes_biologicos_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `produccion_agentes_biologicos_ibfk_2` FOREIGN KEY (`id_agente`) REFERENCES `agentes_biologicos` (`id_agente`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `productos_cosecha` (
  `id_producto` bigint NOT NULL AUTO_INCREMENT,
  `id_cosecha` bigint NOT NULL,
  `tipo_producto` enum('Primera','Segunda','Industrial','Desecho') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `peso_kg` decimal(15,2) DEFAULT NULL,
  `calidad` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `destino` enum('Venta_Fresco','Postcosecha','Industrializacion','Almacenamiento') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `precio_kg` decimal(12,2) DEFAULT NULL,
  `valor_total` decimal(15,2) DEFAULT NULL,
  `id_finca` int DEFAULT NULL,
  PRIMARY KEY (`id_producto`),
  KEY `id_cosecha` (`id_cosecha`),
  KEY `fk_productos_cosecha_finca` (`id_finca`),
  CONSTRAINT `fk_productos_cosecha_finca` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`) ON DELETE CASCADE,
  CONSTRAINT `productos_cosecha_ibfk_1` FOREIGN KEY (`id_cosecha`) REFERENCES `cosechas` (`id_cosecha`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `puntos_muestreo` (
  `id_punto_muestreo` bigint NOT NULL AUTO_INCREMENT,
  `id_lote` int NOT NULL,
  `codigo_punto` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `latitud` decimal(10,8) NOT NULL,
  `longitud` decimal(11,8) NOT NULL,
  `tipo_muestreo` enum('Suelo','Agua','Tejido') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_punto_muestreo`),
  KEY `id_lote` (`id_lote`),
  CONSTRAINT `puntos_muestreo_ibfk_1` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `app_preparaciones_mezcla` (
  `id_preparacion` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_receta` bigint NOT NULL,
  `id_empleado_prepara` int DEFAULT NULL,
  `id_bodega` int DEFAULT NULL,
  `volumen_total_preparado` decimal(12,2) NOT NULL,
  `unidad_medida` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'Litros',
  `envases_vacios_generados` int DEFAULT '0',
  `fecha_preparacion` datetime NOT NULL,
  `estado` enum('Pendiente','Completada','Cancelada') COLLATE utf8mb4_unicode_ci DEFAULT 'Completada',
  PRIMARY KEY (`id_preparacion`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_receta` (`id_receta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `app_produccion_organica` (
  `id_produccion` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_receta` bigint NOT NULL,
  `id_insumo_producido` int NOT NULL,
  `volumen_litros_producido` decimal(12,2) NOT NULL,
  `horas_recoleccion` decimal(6,2) DEFAULT '0.00',
  `horas_preparacion` decimal(6,2) DEFAULT '0.00',
  `costo_total_lote` decimal(15,2) DEFAULT '0.00',
  `costo_unitario_litro` decimal(15,2) DEFAULT '0.00',
  `fecha_produccion` datetime NOT NULL,
  `id_empleado_responsable` int DEFAULT NULL,
  PRIMARY KEY (`id_produccion`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_insumo_producido` (`id_insumo_producido`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `registro_aplicaciones` (
  `id_aplicacion` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_lote` int NOT NULL,
  `id_labor` bigint DEFAULT NULL,
  `id_insumo` int DEFAULT NULL,
  `id_empleado` int DEFAULT NULL,
  `id_maquinaria` int DEFAULT NULL,
  `cantidad_aplicada` decimal(12,2) NOT NULL,
  `tiempo_horas` decimal(6,2) DEFAULT NULL,
  `condiciones_climaticas` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `notificacion_enviada` tinyint(1) DEFAULT '0',
  `id_comprobante_contable` bigint DEFAULT NULL,
  `fecha_aplicacion` datetime NOT NULL,
  PRIMARY KEY (`id_aplicacion`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_lote` (`id_lote`),
  KEY `id_labor` (`id_labor`),
  KEY `id_insumo` (`id_insumo`),
  CONSTRAINT `registro_aplicaciones_ibfk_1` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `reglas_tareas_automaticas` (
  `id_regla` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `condicion_tipo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parametros_condicion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `id_tipo_tarea_generar` int DEFAULT NULL,
  `prioridad` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activa` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_regla`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `regulaciones_pais` (
  `id_regulacion` int NOT NULL AUTO_INCREMENT,
  `id_config_pais` int NOT NULL,
  `codigo_ley` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` enum('Ambiental','Laboral','Fitosanitaria','Comercial') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_regulacion`),
  KEY `id_config_pais` (`id_config_pais`),
  CONSTRAINT `regulaciones_pais_ibfk_1` FOREIGN KEY (`id_config_pais`) REFERENCES `sys_configuracion_pais` (`id_config`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `riegos_realizados` (
  `id_riego` bigint NOT NULL AUTO_INCREMENT,
  `id_trazabilidad` bigint NOT NULL,
  `duracion_horas` decimal(6,2) DEFAULT NULL,
  `volumen_m3` decimal(10,2) DEFAULT NULL,
  `lamina_riego_mm` decimal(6,2) DEFAULT NULL,
  `fuente_agua` enum('Acueducto','Pozo','Rio','Embalse','Quebrada','Lluvia','Aljibe') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `calidad_agua_ce_us_cm` decimal(8,2) DEFAULT NULL,
  PRIMARY KEY (`id_riego`),
  KEY `id_trazabilidad` (`id_trazabilidad`),
  CONSTRAINT `riegos_realizados_ibfk_1` FOREIGN KEY (`id_trazabilidad`) REFERENCES `trazabilidad_lotes` (`id_trazabilidad`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rotaciones_cultivos` (
  `id_rotacion` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `nombre` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `secuencia` json NOT NULL,
  `objetivo` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_rotacion`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `rotaciones_cultivos_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rotaciones_fases` (
  `id_fase_rotacion` bigint NOT NULL AUTO_INCREMENT,
  `id_rotacion` int NOT NULL,
  `id_lote` int NOT NULL,
  `cultivo_actual` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cultivo_siguiente` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_transicion` date DEFAULT NULL,
  PRIMARY KEY (`id_fase_rotacion`),
  KEY `id_rotacion` (`id_rotacion`),
  KEY `id_lote` (`id_lote`),
  CONSTRAINT `rotaciones_fases_ibfk_1` FOREIGN KEY (`id_rotacion`) REFERENCES `rotaciones_cultivos` (`id_rotacion`),
  CONSTRAINT `rotaciones_fases_ibfk_2` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_accesos_biometricos` (
  `id_acceso` bigint NOT NULL AUTO_INCREMENT,
  `id_empleado` int NOT NULL,
  `tipo_marcacion` enum('Entrada','Salida') COLLATE utf8mb4_unicode_ci NOT NULL,
  `metodo` enum('Huella','Iris','PIN','Manual') COLLATE utf8mb4_unicode_ci DEFAULT 'Huella',
  `timestamp_marcacion` datetime NOT NULL,
  `device_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_acceso`),
  KEY `id_empleado` (`id_empleado`),
  CONSTRAINT `rrhh_accesos_biometricos_ibfk_1` FOREIGN KEY (`id_empleado`) REFERENCES `rrhh_empleados` (`id_empleado`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_catalogo_labores` (
  `id_labor_catalogo` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL DEFAULT '1',
  `codigo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` enum('Administrativas','Agrícolas','Taller','Vivero','Producción','Maquinaria','Equipos','Cosechas','Bodegas','Despacho','Ganaderas','Piscícola','Otros') COLLATE utf8mb4_unicode_ci NOT NULL,
  `unidad_medida` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Jornal',
  `tarifa_base` decimal(10,2) NOT NULL DEFAULT '0.00',
  `estado` enum('Activo','Inactivo') COLLATE utf8mb4_unicode_ci DEFAULT 'Activo',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_labor_catalogo`),
  UNIQUE KEY `uq_rrhh_catalogo_labores_codigo_tenant` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_rrhh_catalogo_labores_nombre_tenant` (`id_tenant`,`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_conceptos_nomina` (
  `id_concepto` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('Devengado','Deduccion') COLLATE utf8mb4_unicode_ci NOT NULL,
  `naturaleza` enum('Fijo','Variable') COLLATE utf8mb4_unicode_ci DEFAULT 'Fijo',
  `cuenta_contable` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `base_prestacional` tinyint(1) DEFAULT '1',
  `estado` enum('Activo','Inactivo') COLLATE utf8mb4_unicode_ci DEFAULT 'Activo',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_concepto`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_contratos` (
  `id_contrato` int NOT NULL AUTO_INCREMENT,
  `id_empleado` int NOT NULL,
  `tipo` enum('Fijo','Indefinido','Por_Obra','Destajo') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `salario_acordado` decimal(15,2) NOT NULL,
  `jornada` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_contrato`),
  KEY `id_empleado` (`id_empleado`),
  CONSTRAINT `rrhh_contratos_ibfk_1` FOREIGN KEY (`id_empleado`) REFERENCES `rrhh_empleados` (`id_empleado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_contratos_empleados` (
  `id_asignacion` int NOT NULL AUTO_INCREMENT,
  `id_contrato` int NOT NULL,
  `id_empleado` int NOT NULL,
  `porcentaje_participacion` decimal(5,2) DEFAULT '100.00',
  `estado` enum('Asignado','Retirado') COLLATE utf8mb4_unicode_ci DEFAULT 'Asignado',
  PRIMARY KEY (`id_asignacion`),
  KEY `id_contrato` (`id_contrato`),
  KEY `id_empleado` (`id_empleado`),
  CONSTRAINT `rrhh_contratos_empleados_ibfk_1` FOREIGN KEY (`id_contrato`) REFERENCES `rrhh_contratos_obra` (`id_contrato`) ON DELETE CASCADE,
  CONSTRAINT `rrhh_contratos_empleados_ibfk_2` FOREIGN KEY (`id_empleado`) REFERENCES `rrhh_empleados` (`id_empleado`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_contratos_obra` (
  `id_contrato` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_finca` int DEFAULT NULL,
  `nombre_obra` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` enum('Finca','Lote','Vía','Cultivo','Administrativo','Bodegas','Produccion Violes','Semilleros','Bodega Cosecha','Otros') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `valor_total` decimal(15,2) DEFAULT '0.00',
  `total_abonado` decimal(15,2) DEFAULT '0.00',
  `saldo_pendiente` decimal(15,2) DEFAULT '0.00',
  `estado` enum('Activo','Pausado','Finalizado','Liquidado','Cancelado','Eliminado','Suspendido') COLLATE utf8mb4_unicode_ci DEFAULT 'Activo',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `id_lote` int DEFAULT NULL,
  `ubicacion_detalle` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_responsable` int DEFAULT NULL,
  PRIMARY KEY (`id_contrato`),
  UNIQUE KEY `uq_rrhh_contratos_obra_nombre_obra_tenant` (`id_tenant`,`nombre_obra`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_control_asistencia` (
  `id_asistencia` bigint NOT NULL AUTO_INCREMENT,
  `id_empleado` int NOT NULL,
  `id_lote` int DEFAULT NULL,
  `fecha` date NOT NULL,
  `hora_entrada` time DEFAULT NULL,
  `hora_salida` time DEFAULT NULL,
  `id_tipo_jornal` int NOT NULL,
  `cantidad_unidades` decimal(8,2) DEFAULT '1.00',
  `actividad_realizada` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_asistencia`),
  KEY `id_empleado` (`id_empleado`),
  KEY `id_lote` (`id_lote`),
  KEY `id_tipo_jornal` (`id_tipo_jornal`),
  CONSTRAINT `rrhh_control_asistencia_ibfk_1` FOREIGN KEY (`id_empleado`) REFERENCES `rrhh_empleados` (`id_empleado`),
  CONSTRAINT `rrhh_control_asistencia_ibfk_2` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`),
  CONSTRAINT `rrhh_control_asistencia_ibfk_3` FOREIGN KEY (`id_tipo_jornal`) REFERENCES `rrhh_tipos_jornal` (`id_tipo_jornal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_dotaciones` (
  `id_dotacion` bigint NOT NULL AUTO_INCREMENT,
  `id_empleado` int NOT NULL,
  `tipo_elemento` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cantidad` int NOT NULL,
  `fecha_entrega` date NOT NULL,
  `costo` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id_dotacion`),
  KEY `id_empleado` (`id_empleado`),
  CONSTRAINT `rrhh_dotaciones_ibfk_1` FOREIGN KEY (`id_empleado`) REFERENCES `rrhh_empleados` (`id_empleado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_empleados` (
  `id_empleado` int NOT NULL AUTO_INCREMENT,
  `id_tercero` int DEFAULT NULL,
  `id_tenant` int NOT NULL,
  `id_finca` int DEFAULT NULL,
  `documento` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombres` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `apellidos` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_cargo` int NOT NULL,
  `fecha_ingreso` date NOT NULL,
  `salario_base` decimal(15,2) NOT NULL,
  `tipo_contrato` enum('Fijo','Indefinido','Por_Obra','Destajo') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('Activo','Inactivo','Vacaciones','Incapacitado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Activo',
  `biometric_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `huella_hash` text COLLATE utf8mb4_unicode_ci,
  `iris_hash` text COLLATE utf8mb4_unicode_ci,
  `area_asignada` enum('Taller','Administracion','Recursos Humanos','Invernadero','Produccion Abonos Organicos','Campo','Sistemas','Gerencia','Almacen') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `sexo` enum('Masculino','Femenino','Otro') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fotografia` longtext COLLATE utf8mb4_unicode_ci,
  `estudios` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `especialidad_agricola` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cuadrilla_nombre` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_empleado`),
  UNIQUE KEY `uq_rrhh_empleados_documento_tenant` (`id_tenant`,`documento`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_finca` (`id_finca`),
  KEY `fk_rrhh_tercero` (`id_tercero`),
  CONSTRAINT `fk_rrhh_tercero` FOREIGN KEY (`id_tercero`) REFERENCES `terceros` (`id_tercero`),
  CONSTRAINT `rrhh_empleados_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `rrhh_empleados_ibfk_2` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`),
  CONSTRAINT `fk_rrhh_cargo` FOREIGN KEY (`id_cargo`) REFERENCES `rrhh_cargos` (`id_cargo`)
) ENGINE=InnoDB AUTO_INCREMENT=304 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_cargos` (
  `id_cargo` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_cargo`),
  UNIQUE KEY `uq_rrhh_cargos_codigo_tenant` (`id_tenant`,`codigo`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `fk_rrhh_cargos_tenant` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `rrhh_gps_accesos` (
  `id_acceso` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_empleado` int NOT NULL,
  `documento` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pin_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `device_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gps_identificador` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `selfie_base64` longtext COLLATE utf8mb4_unicode_ci,
  `selfie_taken_at` datetime DEFAULT NULL,
  `session_token` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `session_expires` datetime DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `last_seen` datetime DEFAULT NULL,
  `failed_attempts` int DEFAULT '0',
  `locked_until` datetime DEFAULT NULL,
  `estado` enum('Activo','Bloqueado') COLLATE utf8mb4_unicode_ci DEFAULT 'Activo',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_acceso`),
  UNIQUE KEY `uq_rrhh_gps_accesos_documento_tenant` (`id_tenant`,`documento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_hojas_vida` (
  `id_hoja_vida` int NOT NULL AUTO_INCREMENT,
  `id_empleado` int NOT NULL,
  `nivel_academico` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `experiencia_previa` text COLLATE utf8mb4_unicode_ci,
  `talla_camisa` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `talla_pantalon` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `talla_calzado` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contacto_emergencia_nombre` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contacto_emergencia_telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones_jefe` text COLLATE utf8mb4_unicode_ci,
  `estado_hoja` enum('Completa','Incompleta') COLLATE utf8mb4_unicode_ci DEFAULT 'Incompleta',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_hoja_vida`),
  UNIQUE KEY `id_empleado` (`id_empleado`),
  CONSTRAINT `rrhh_hojas_vida_ibfk_1` FOREIGN KEY (`id_empleado`) REFERENCES `rrhh_empleados` (`id_empleado`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_incapacidades` (
  `id_incapacidad` bigint NOT NULL AUTO_INCREMENT,
  `id_empleado` int NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `tipo` enum('Enfermedad_General','Laboral','Maternidad') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `dias` int NOT NULL,
  `porcentaje_pago` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id_incapacidad`),
  KEY `id_empleado` (`id_empleado`),
  CONSTRAINT `rrhh_incapacidades_ibfk_1` FOREIGN KEY (`id_empleado`) REFERENCES `rrhh_empleados` (`id_empleado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_liquidacion_laboral` (
  `id_liquidacion` bigint NOT NULL AUTO_INCREMENT,
  `id_contrato` int NOT NULL,
  `fecha_liquidacion` date NOT NULL,
  `motivo_retiro` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_pagado` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id_liquidacion`),
  KEY `id_contrato` (`id_contrato`),
  CONSTRAINT `rrhh_liquidacion_laboral_ibfk_1` FOREIGN KEY (`id_contrato`) REFERENCES `rrhh_contratos` (`id_contrato`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_nomina_detalle` (
  `id_nomina_detalle` bigint NOT NULL AUTO_INCREMENT,
  `id_nomina` bigint NOT NULL,
  `id_empleado` int NOT NULL,
  `salario_base_devengado` decimal(12,2) DEFAULT '0.00',
  `horas_extras` decimal(12,2) DEFAULT '0.00',
  `bonificaciones` decimal(12,2) DEFAULT '0.00',
  `deduccion_salud` decimal(12,2) DEFAULT '0.00',
  `deduccion_pension` decimal(12,2) DEFAULT '0.00',
  `neto_a_pagar` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id_nomina_detalle`),
  KEY `id_nomina` (`id_nomina`),
  KEY `id_empleado` (`id_empleado`),
  CONSTRAINT `rrhh_nomina_detalle_ibfk_1` FOREIGN KEY (`id_nomina`) REFERENCES `rrhh_nomina_quincena` (`id_nomina`),
  CONSTRAINT `rrhh_nomina_detalle_ibfk_2` FOREIGN KEY (`id_empleado`) REFERENCES `rrhh_empleados` (`id_empleado`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_nomina_quincena` (
  `id_nomina` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `periodo_anio` int NOT NULL,
  `periodo_mes` int NOT NULL,
  `quincena` enum('Primera','Segunda','Mensual') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_devengado` decimal(15,2) DEFAULT '0.00',
  `total_deducciones` decimal(15,2) DEFAULT '0.00',
  `total_neto` decimal(15,2) DEFAULT '0.00',
  `estado` enum('Borrador','Calculada','Aprobada','Pagada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Borrador',
  PRIMARY KEY (`id_nomina`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `rrhh_nomina_quincena_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_novedades` (
  `id_novedad` bigint NOT NULL AUTO_INCREMENT,
  `id_empleado` int NOT NULL,
  `tipo_novedad` enum('Vacaciones','Permiso Remunerado','Permiso No Remunerado','Incapacidad General','Incapacidad Laboral','Licencia') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `dias_totales` int NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `estado` enum('Pendiente','Aprobado','Rechazado') COLLATE utf8mb4_unicode_ci DEFAULT 'Pendiente',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_novedad`),
  KEY `id_empleado` (`id_empleado`),
  CONSTRAINT `rrhh_novedades_ibfk_1` FOREIGN KEY (`id_empleado`) REFERENCES `rrhh_empleados` (`id_empleado`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_permisos` (
  `id_permiso` int NOT NULL AUTO_INCREMENT,
  `id_empleado` int NOT NULL,
  `tipo_permiso` enum('Remunerado','No Remunerado','Calamidad','Cita Médica','Luto','Paternidad/Maternidad') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `dias_solicitados` int NOT NULL,
  `motivo` text COLLATE utf8mb4_unicode_ci,
  `estado` enum('Pendiente','Aprobado','Rechazado') COLLATE utf8mb4_unicode_ci DEFAULT 'Pendiente',
  `aprobado_por` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_permiso`),
  KEY `id_empleado` (`id_empleado`),
  CONSTRAINT `rrhh_permisos_ibfk_1` FOREIGN KEY (`id_empleado`) REFERENCES `rrhh_empleados` (`id_empleado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_planillas_consolidadas` (
  `id_planilla` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_finca` int DEFAULT NULL,
  `id_contrato` int DEFAULT NULL,
  `ciclo` enum('Semanal','Quincenal','Mensual','Vacaciones','Liquidacion','Contrato Especial') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `estado` enum('Borrador','Aprobada','Pagada','Contabilizada') COLLATE utf8mb4_unicode_ci DEFAULT 'Borrador',
  `total_devengado` decimal(15,2) DEFAULT '0.00',
  `total_deducido` decimal(15,2) DEFAULT '0.00',
  `total_neto` decimal(15,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_planilla`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_planillas_detalle` (
  `id_detalle` int NOT NULL AUTO_INCREMENT,
  `id_planilla` int NOT NULL,
  `id_empleado` int NOT NULL,
  `dias_trabajados` int DEFAULT '0',
  `salario_base` decimal(15,2) DEFAULT '0.00',
  `total_devengos` decimal(15,2) DEFAULT '0.00',
  `total_deducciones` decimal(15,2) DEFAULT '0.00',
  `neto_pagar` decimal(15,2) DEFAULT '0.00',
  PRIMARY KEY (`id_detalle`),
  KEY `id_planilla` (`id_planilla`),
  KEY `id_empleado` (`id_empleado`),
  CONSTRAINT `rrhh_planillas_detalle_ibfk_1` FOREIGN KEY (`id_planilla`) REFERENCES `rrhh_planillas_consolidadas` (`id_planilla`) ON DELETE CASCADE,
  CONSTRAINT `rrhh_planillas_detalle_ibfk_2` FOREIGN KEY (`id_empleado`) REFERENCES `rrhh_empleados` (`id_empleado`)
) ENGINE=InnoDB AUTO_INCREMENT=88 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_planillas_manuales` (
  `id_planilla` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL DEFAULT '1',
  `id_finca` int DEFAULT NULL,
  `tipo_planilla` enum('Semanal','Quincenal','Mensual','Contrato') COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_semana` int DEFAULT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `estado` enum('Abierta','Cerrada') COLLATE utf8mb4_unicode_ci DEFAULT 'Abierta',
  `contabilizado` tinyint(1) DEFAULT '0',
  `id_asiento_contable` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_planilla`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_planillas_manuales_detalle` (
  `id_detalle` int NOT NULL AUTO_INCREMENT,
  `id_planilla` int NOT NULL,
  `id_empleado` int DEFAULT NULL,
  `id_maquinaria` int DEFAULT NULL,
  `id_labor_catalogo` int NOT NULL,
  `fecha_labor` date NOT NULL,
  `cantidad` decimal(10,2) NOT NULL DEFAULT '1.00',
  `tarifa` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total` decimal(15,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id_detalle`),
  KEY `id_planilla` (`id_planilla`),
  CONSTRAINT `rrhh_planillas_manuales_detalle_ibfk_1` FOREIGN KEY (`id_planilla`) REFERENCES `rrhh_planillas_manuales` (`id_planilla`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=134 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_planillas_semanales` (
  `id_planilla` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `semana_numero` int NOT NULL,
  `anio` int NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `total_salarios` decimal(15,2) DEFAULT '0.00',
  `total_extras` decimal(15,2) DEFAULT '0.00',
  `total_deducciones` decimal(15,2) DEFAULT '0.00',
  `total_neto` decimal(15,2) DEFAULT '0.00',
  `estado` enum('Borrador','Revisión','Aprobada','Contabilizada') COLLATE utf8mb4_unicode_ci DEFAULT 'Borrador',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_planilla`),
  UNIQUE KEY `uq_rrhh_planillas_semana_anio_tenant` (`id_tenant`,`semana_numero`,`anio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_plantillas_contables` (
  `id_plantilla` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `tipo_planilla` enum('Semanal','Quincenal','Mensual','Vacaciones','Liquidacion','Contratos') COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('Activo','Inactivo') COLLATE utf8mb4_unicode_ci DEFAULT 'Activo',
  `id_comprobante` int NOT NULL DEFAULT '3',
  `cuenta_debito` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '510506',
  `cuenta_credito` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '250505',
  PRIMARY KEY (`id_plantilla`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_plantillas_contables_detalles` (
  `id_detalle` int NOT NULL AUTO_INCREMENT,
  `id_plantilla` int NOT NULL,
  `concepto` enum('Salario Base','Horas Extras','Auxilio Transporte','Salud','Pension','Retencion','Cesantias','Prima','Intereses Cesantias','Vacaciones','Avance Obra','Sueldos por Pagar') COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_cuenta` int NOT NULL,
  `naturaleza` enum('Debito','Credito') COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_detalle`),
  KEY `id_plantilla` (`id_plantilla`),
  KEY `id_cuenta` (`id_cuenta`),
  CONSTRAINT `rrhh_plantillas_contables_detalles_ibfk_1` FOREIGN KEY (`id_plantilla`) REFERENCES `rrhh_plantillas_contables` (`id_plantilla`) ON DELETE CASCADE,
  CONSTRAINT `rrhh_plantillas_contables_detalles_ibfk_2` FOREIGN KEY (`id_cuenta`) REFERENCES `plan_contable` (`id_cuenta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_prestaciones_sociales` (
  `id_prestacion` bigint NOT NULL AUTO_INCREMENT,
  `id_empleado` int NOT NULL,
  `tipo` enum('Cesantias','Prima','Vacaciones','Intereses') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_calculo` date NOT NULL,
  `monto` decimal(15,2) NOT NULL,
  `periodo_anio` int NOT NULL,
  PRIMARY KEY (`id_prestacion`),
  KEY `id_empleado` (`id_empleado`),
  CONSTRAINT `rrhh_prestaciones_sociales_ibfk_1` FOREIGN KEY (`id_empleado`) REFERENCES `rrhh_empleados` (`id_empleado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_tipos_jornal` (
  `id_tipo_jornal` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tarifa_base` decimal(12,2) NOT NULL,
  `unidad_medida` enum('Dia','Hora','Tonelada','Hectarea','Tarea') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_tipo_jornal`),
  UNIQUE KEY `uq_rrhh_tipos_jornal_codigo_tenant` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_rrhh_tipos_jornal_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `rrhh_tipos_jornal_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rrhh_vacaciones_programacion` (
  `id_vacacion` int NOT NULL AUTO_INCREMENT,
  `id_empleado` int NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `dias_disfrutados` int NOT NULL,
  `estado` enum('Programada','En Curso','Finalizada','Cancelada') COLLATE utf8mb4_unicode_ci DEFAULT 'Programada',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_vacacion`),
  KEY `id_empleado` (`id_empleado`),
  CONSTRAINT `rrhh_vacaciones_programacion_ibfk_1` FOREIGN KEY (`id_empleado`) REFERENCES `rrhh_empleados` (`id_empleado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_alertas_anomalias` (
  `id_alerta_sat` bigint NOT NULL AUTO_INCREMENT,
  `id_lote` int NOT NULL,
  `fecha_deteccion` datetime NOT NULL,
  `tipo_anomalia` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nivel_severidad` enum('Baja','Media','Alta','Critica') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `estado` enum('Activa','En_Revision','Resuelta') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Activa',
  PRIMARY KEY (`id_alerta_sat`),
  KEY `id_lote` (`id_lote`),
  CONSTRAINT `sat_alertas_anomalias_ibfk_1` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_api_conexiones` (
  `id_conexion` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `proveedor` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `api_key` text COLLATE utf8mb4_unicode_ci,
  `endpoint_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_expiracion` date DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `token_type` enum('mock','real') COLLATE utf8mb4_unicode_ci DEFAULT 'mock',
  `access_token` text COLLATE utf8mb4_unicode_ci,
  `access_token_expires` datetime DEFAULT NULL,
  PRIMARY KEY (`id_conexion`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `sat_api_conexiones_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_bandas_espectrales` (
  `id_banda` int NOT NULL AUTO_INCREMENT,
  `fuente` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_banda` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `rango_longitud_onda` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resolucion_m` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id_banda`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_calibraciones_campo` (
  `id_calibracion` bigint NOT NULL AUTO_INCREMENT,
  `id_lote` int NOT NULL,
  `fecha_calibracion` date NOT NULL,
  `biomasa_real` decimal(10,2) DEFAULT NULL,
  `ndvi_referencia` decimal(5,4) DEFAULT NULL,
  PRIMARY KEY (`id_calibracion`),
  KEY `id_lote` (`id_lote`),
  CONSTRAINT `sat_calibraciones_campo_ibfk_1` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_comparaciones_multitemporales` (
  `id_comparacion` bigint NOT NULL AUTO_INCREMENT,
  `id_lote` int NOT NULL,
  `fecha_base` date NOT NULL,
  `fecha_comparacion` date NOT NULL,
  `variacion_ndvi_pct` decimal(6,2) NOT NULL,
  PRIMARY KEY (`id_comparacion`),
  KEY `id_lote` (`id_lote`),
  CONSTRAINT `sat_comparaciones_multitemporales_ibfk_1` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_dashboard_config` (
  `id_config_dash` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `indices_mostrar` json DEFAULT NULL,
  `umbrales_alerta` json DEFAULT NULL,
  PRIMARY KEY (`id_config_dash`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `sat_dashboard_config_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_deteccion_plagas` (
  `id_det_sat` bigint NOT NULL AUTO_INCREMENT,
  `id_imagen` bigint NOT NULL,
  `patron_estres` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `probabilidad_plaga_pct` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id_det_sat`),
  KEY `id_imagen` (`id_imagen`),
  CONSTRAINT `sat_deteccion_plagas_ibfk_1` FOREIGN KEY (`id_imagen`) REFERENCES `sat_imagenes` (`id_imagen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_estimaciones_rendimiento` (
  `id_estimacion` bigint NOT NULL AUTO_INCREMENT,
  `id_lote` int NOT NULL,
  `fecha_estimacion` date NOT NULL,
  `rendimiento_proyectado_tn` decimal(12,2) NOT NULL,
  `margen_error_pct` decimal(5,2) DEFAULT NULL,
  `modelo_ia_utilizado` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_estimacion`),
  KEY `id_lote` (`id_lote`),
  CONSTRAINT `sat_estimaciones_rendimiento_ibfk_1` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_humedad_suelo` (
  `id_humedad_sat` bigint NOT NULL AUTO_INCREMENT,
  `id_lote` int NOT NULL,
  `fecha_lectura` date NOT NULL,
  `indice_humedad_sar` decimal(5,2) NOT NULL,
  `penetracion_cm` int DEFAULT NULL,
  PRIMARY KEY (`id_humedad_sat`),
  KEY `id_lote` (`id_lote`),
  CONSTRAINT `sat_humedad_suelo_ibfk_1` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_imagenes` (
  `id_imagen` bigint NOT NULL AUTO_INCREMENT,
  `id_lote` int NOT NULL,
  `fecha_captura` datetime NOT NULL,
  `fuente` enum('Sentinel-1','Sentinel-2','Landsat-8','PlanetScope','Dron') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cobertura_nubes_pct` decimal(5,2) DEFAULT NULL,
  `url_archivo` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_imagen`),
  KEY `id_lote` (`id_lote`),
  CONSTRAINT `sat_imagenes_ibfk_1` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_indices_vegetacion` (
  `id_indice` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `formula` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `rango_optimo_min` decimal(5,2) DEFAULT NULL,
  `rango_optimo_max` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id_indice`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_lecturas_indices` (
  `id_lectura` bigint NOT NULL AUTO_INCREMENT,
  `id_imagen` bigint NOT NULL,
  `id_indice` int NOT NULL,
  `valor_promedio` decimal(6,4) NOT NULL,
  `clasificacion` enum('Critico','Alerta','Optimo') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_lectura`),
  KEY `id_imagen` (`id_imagen`),
  KEY `id_indice` (`id_indice`),
  CONSTRAINT `sat_lecturas_indices_ibfk_1` FOREIGN KEY (`id_imagen`) REFERENCES `sat_imagenes` (`id_imagen`),
  CONSTRAINT `sat_lecturas_indices_ibfk_2` FOREIGN KEY (`id_indice`) REFERENCES `sat_indices_vegetacion` (`id_indice`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_metrics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lote_id` int NOT NULL,
  `fecha` date NOT NULL,
  `ndvi` decimal(5,4) DEFAULT NULL,
  `ndmi` decimal(5,4) DEFAULT NULL,
  `et0` decimal(5,2) DEFAULT NULL,
  `temperatura` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lote_id` (`lote_id`),
  CONSTRAINT `sat_metrics_ibfk_1` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id_lote`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_ordenes_imagen` (
  `id_orden_img` bigint NOT NULL AUTO_INCREMENT,
  `fuente` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `area_interes` polygon NOT NULL,
  `fecha_solicitud` date NOT NULL,
  `estado` enum('Pendiente','Descargada','Procesada','Error') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pendiente',
  PRIMARY KEY (`id_orden_img`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_orders_presentacion` (
  `id_order` int NOT NULL AUTO_INCREMENT,
  `id_conexion` int NOT NULL,
  `order_id` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `workflow_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `submission_date` datetime NOT NULL,
  `status` enum('queued','running','completed','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'queued',
  PRIMARY KEY (`id_order`),
  UNIQUE KEY `uq_sat_order` (`id_conexion`,`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_procesamiento_log` (
  `id_log_sat` bigint NOT NULL AUTO_INCREMENT,
  `id_imagen` bigint NOT NULL,
  `tiempo_procesamiento_seg` int DEFAULT NULL,
  `errores` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_log_sat`),
  KEY `id_imagen` (`id_imagen`),
  CONSTRAINT `sat_procesamiento_log_ibfk_1` FOREIGN KEY (`id_imagen`) REFERENCES `sat_imagenes` (`id_imagen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_reportes` (
  `id_reporte_sat` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `fecha_generacion` datetime NOT NULL,
  `tipo_informe` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url_documento` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_reporte_sat`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `sat_reportes_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_series_temporales` (
  `id_serie` bigint NOT NULL AUTO_INCREMENT,
  `id_lote` int NOT NULL,
  `id_indice` int NOT NULL,
  `tendencia` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `desviacion_vs_historico` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id_serie`),
  KEY `id_lote` (`id_lote`),
  KEY `id_indice` (`id_indice`),
  CONSTRAINT `sat_series_temporales_ibfk_1` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`),
  CONSTRAINT `sat_series_temporales_ibfk_2` FOREIGN KEY (`id_indice`) REFERENCES `sat_indices_vegetacion` (`id_indice`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_tareas_programadas` (
  `id_tarea_sat` int NOT NULL AUTO_INCREMENT,
  `fuente` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `frecuencia_dias` int NOT NULL,
  `area_interes` polygon NOT NULL,
  PRIMARY KEY (`id_tarea_sat`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_vuelos_drones` (
  `id_vuelo` bigint NOT NULL AUTO_INCREMENT,
  `id_finca` int NOT NULL,
  `id_lote` int DEFAULT NULL,
  `fecha_vuelo` datetime NOT NULL,
  `piloto` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sensores_utilizados` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `area_cubierta_ha` decimal(10,2) DEFAULT NULL,
  `url_ortomosaico` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('Planificado','Ejecutado','Procesado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Planificado',
  PRIMARY KEY (`id_vuelo`),
  KEY `id_finca` (`id_finca`),
  KEY `id_lote` (`id_lote`),
  CONSTRAINT `sat_vuelos_drones_ibfk_1` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`),
  CONSTRAINT `sat_vuelos_drones_ibfk_2` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_workflows_presentacion` (
  `id_workflow` int NOT NULL AUTO_INCREMENT,
  `id_conexion` int NOT NULL,
  `workflow_id` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `output_product_type` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_workflow`),
  UNIQUE KEY `uq_sat_workflow` (`id_conexion`,`workflow_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sat_zonas_variabilidad` (
  `id_zona` bigint NOT NULL AUTO_INCREMENT,
  `id_imagen` bigint NOT NULL,
  `poligono_zona` polygon NOT NULL,
  `clasificacion` enum('Alta_Productividad','Media_Productividad','Baja_Productividad') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `area_ha` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_zona`),
  KEY `id_imagen` (`id_imagen`),
  CONSTRAINT `sat_zonas_variabilidad_ibfk_1` FOREIGN KEY (`id_imagen`) REFERENCES `sat_imagenes` (`id_imagen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sedes` (
  `id_sede` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_activo` int NOT NULL,
  `id_finca` int DEFAULT NULL,
  `codigo` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_sede` enum('Oficina_Principal','Oficina_Campo','Dormitorio_Empleados','Comedor','Casa_Finca','Taller','Pesebrera','Galpon') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `capacidad_personas` int DEFAULT NULL,
  `area_construida_m2` decimal(10,2) DEFAULT NULL,
  `direccion` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `responsable_nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_ultimo_mantenimiento` date DEFAULT NULL,
  PRIMARY KEY (`id_sede`),
  UNIQUE KEY `uq_sedes_codigo_tenant` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_sedes_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_activo` (`id_activo`),
  KEY `id_finca` (`id_finca`),
  CONSTRAINT `sedes_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `sedes_ibfk_2` FOREIGN KEY (`id_activo`) REFERENCES `activos_mantenimiento` (`id_activo`),
  CONSTRAINT `sedes_ibfk_3` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `seg_coberturas` (
  `id_cobertura` int NOT NULL AUTO_INCREMENT,
  `id_poliza` int NOT NULL,
  `tipo_riesgo` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `suma_asegurada` decimal(15,2) NOT NULL,
  `deducible_pct` decimal(5,2) DEFAULT NULL,
  `condiciones_especiales` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_cobertura`),
  KEY `id_poliza` (`id_poliza`),
  CONSTRAINT `seg_coberturas_ibfk_1` FOREIGN KEY (`id_poliza`) REFERENCES `seg_polizas` (`id_poliza`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `seg_polizas` (
  `id_poliza` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `aseguradora` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_poliza` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_seguro` enum('Agricola','Ganadero','Equipo','Vida','Responsabilidad') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `cobertura_maxima` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id_poliza`),
  UNIQUE KEY `uq_seg_polizas_numero_tenant` (`id_tenant`,`numero_poliza`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `seg_polizas_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `seg_siniestros` (
  `id_siniestro` bigint NOT NULL AUTO_INCREMENT,
  `id_poliza` int NOT NULL,
  `fecha_evento` date NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `area_afectada_ha` decimal(10,2) DEFAULT NULL,
  `monto_reclamado` decimal(15,2) NOT NULL,
  `monto_indemnizado` decimal(15,2) DEFAULT '0.00',
  `estado` enum('Reportado','En_Proceso','Pagado','Rechazado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Reportado',
  PRIMARY KEY (`id_siniestro`),
  KEY `id_poliza` (`id_poliza`),
  CONSTRAINT `seg_siniestros_ibfk_1` FOREIGN KEY (`id_poliza`) REFERENCES `seg_polizas` (`id_poliza`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `siembra_arboles` (
  `id_arbol` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_lote` int NOT NULL,
  `codigo_arbol` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gps_punto` point NOT NULL,
  `fecha_siembra` date DEFAULT NULL,
  `estado_salud` enum('Sano','Enfermo','Tratamiento','Muerto','Desaparecido') COLLATE utf8mb4_unicode_ci DEFAULT 'Sano',
  `variedad` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ano_siembra` int DEFAULT NULL,
  PRIMARY KEY (`id_arbol`),
  UNIQUE KEY `uq_siembra_arboles_codigo_arbol_tenant` (`id_tenant`,`codigo_arbol`),
  SPATIAL KEY `gps_punto` (`gps_punto`),
  KEY `fk_arboles_lote` (`id_lote`),
  CONSTRAINT `fk_arboles_lote` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`),
  CONSTRAINT `fk_arboles_tenant` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `siembras` (
  `id_siembra` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_lote` int NOT NULL,
  `id_cultivo` int NOT NULL,
  `id_variedad` int DEFAULT NULL,
  `fecha_siembra` date NOT NULL,
  `hectareas_sembradas` decimal(10,2) NOT NULL,
  `densidad_siembra` int DEFAULT NULL,
  `cantidad_plantas` int DEFAULT NULL,
  `sistema_riego_establecido` enum('Goteo','Aspersion','Surcos','Gravitacional','Secano') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lote_procedencia_plantulas` int DEFAULT NULL,
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `estado` enum('Activo','Cosechado','Perdido','Abandonado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Activo',
  `fecha_cierre` date DEFAULT NULL,
  PRIMARY KEY (`id_siembra`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_cultivo` (`id_cultivo`),
  KEY `id_variedad` (`id_variedad`),
  KEY `idx_siembra_fecha` (`fecha_siembra`,`estado`),
  KEY `idx_siembra_lote` (`id_lote`,`estado`),
  CONSTRAINT `siembras_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `siembras_ibfk_2` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`),
  CONSTRAINT `siembras_ibfk_3` FOREIGN KEY (`id_cultivo`) REFERENCES `cultivos` (`id_cultivo`),
  CONSTRAINT `siembras_ibfk_4` FOREIGN KEY (`id_variedad`) REFERENCES `variedades` (`id_variedad`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sistemas_riego` (
  `id_sistema_riego` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_lote` int NOT NULL,
  `tipo` enum('Goteo','Aspersion','Microaspersion','Pivot','Surcos','Inundacion') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `eficiencia` decimal(5,2) DEFAULT NULL,
  `caudal_lps` decimal(10,2) DEFAULT NULL,
  `presion_psi` decimal(8,2) DEFAULT NULL,
  `fecha_instalacion` date DEFAULT NULL,
  `ultimo_mantenimiento` date DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_sistema_riego`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_lote` (`id_lote`),
  CONSTRAINT `sistemas_riego_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `sistemas_riego_ibfk_2` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `solicitudes_detalle` (
  `id_detalle_solicitud` bigint NOT NULL AUTO_INCREMENT,
  `id_solicitud` bigint NOT NULL,
  `id_insumo` int DEFAULT NULL,
  `cantidad_solicitada` decimal(12,2) NOT NULL,
  `cantidad_aprobada` decimal(12,2) DEFAULT NULL,
  `cantidad_pedida` decimal(12,2) DEFAULT NULL,
  `cantidad_recibida` decimal(12,2) DEFAULT NULL,
  `costo_unitario_estimado` decimal(15,4) DEFAULT NULL,
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_detalle_solicitud`),
  KEY `id_solicitud` (`id_solicitud`),
  KEY `id_insumo` (`id_insumo`),
  CONSTRAINT `solicitudes_detalle_ibfk_1` FOREIGN KEY (`id_solicitud`) REFERENCES `solicitudes_pedido` (`id_solicitud`),
  CONSTRAINT `solicitudes_detalle_ibfk_2` FOREIGN KEY (`id_insumo`) REFERENCES `insumos` (`id_insumo`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `solicitudes_pedido` (
  `id_solicitud` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_usuario_solicitante` int DEFAULT NULL,
  `fecha_solicitud` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_necesidad` date NOT NULL,
  `prioridad` enum('Normal','Urgente','Critica') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Normal',
  `estado` enum('Borrador','Enviada','Aprobada','Rechazada','En_Compras','Pedida','Recibida','Cancelada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Borrador',
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `id_empleado_solicitante` int DEFAULT NULL,
  `area_solicitante` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_finca` int DEFAULT NULL,
  PRIMARY KEY (`id_solicitud`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_usuario_solicitante` (`id_usuario_solicitante`),
  KEY `fk_solicitudes_empleado` (`id_empleado_solicitante`),
  KEY `fk_solicitudes_finca` (`id_finca`),
  CONSTRAINT `fk_solicitudes_empleado` FOREIGN KEY (`id_empleado_solicitante`) REFERENCES `terceros` (`id_tercero`) ON DELETE SET NULL,
  CONSTRAINT `fk_solicitudes_finca` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`) ON DELETE SET NULL,
  CONSTRAINT `solicitudes_pedido_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `solicitudes_pedido_ibfk_2` FOREIGN KEY (`id_usuario_solicitante`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `taller_alquileres` (
  `id_alquiler` bigint NOT NULL AUTO_INCREMENT,
  `id_maq_agro` int NOT NULL,
  `id_proveedor` int NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `costo_hora` decimal(15,2) DEFAULT NULL,
  `estado` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Activo',
  PRIMARY KEY (`id_alquiler`),
  KEY `id_maq_agro` (`id_maq_agro`),
  CONSTRAINT `taller_alquileres_ibfk_1` FOREIGN KEY (`id_maq_agro`) REFERENCES `agroind_maquinaria_equipo` (`id_maq_agro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `taller_checklist` (
  `id_checklist` bigint NOT NULL AUTO_INCREMENT,
  `id_maq_agro` int NOT NULL,
  `id_operario` int NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  `fugas_aceite` tinyint(1) DEFAULT '0',
  `presion_llantas` tinyint(1) DEFAULT '1',
  `luces` tinyint(1) DEFAULT '1',
  `frenos` tinyint(1) DEFAULT '1',
  `novedades` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_checklist`),
  KEY `id_maq_agro` (`id_maq_agro`),
  CONSTRAINT `taller_checklist_ibfk_1` FOREIGN KEY (`id_maq_agro`) REFERENCES `agroind_maquinaria_equipo` (`id_maq_agro`)
) ENGINE=InnoDB AUTO_INCREMENT=211 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `taller_combustible` (
  `id_tanqueo` bigint NOT NULL AUTO_INCREMENT,
  `id_maq_agro` int NOT NULL,
  `id_vehiculo` int DEFAULT NULL,
  `id_operario` int NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  `galones` decimal(10,2) NOT NULL,
  `costo_total` decimal(15,2) NOT NULL,
  `horometro_tanqueo` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id_tanqueo`),
  KEY `id_maq_agro` (`id_maq_agro`),
  CONSTRAINT `taller_combustible_ibfk_1` FOREIGN KEY (`id_maq_agro`) REFERENCES `agroind_maquinaria_equipo` (`id_maq_agro`)
) ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `taller_telemetria` (
  `id_lectura` bigint NOT NULL AUTO_INCREMENT,
  `id_maq_agro` int NOT NULL,
  `fecha_lectura` datetime DEFAULT CURRENT_TIMESTAMP,
  `horometro` decimal(12,2) DEFAULT NULL,
  `odometro` decimal(12,2) DEFAULT NULL,
  `galones_combustible` decimal(10,2) DEFAULT NULL,
  `origen_datos` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Manual',
  PRIMARY KEY (`id_lectura`),
  KEY `id_maq_agro` (`id_maq_agro`),
  CONSTRAINT `taller_telemetria_ibfk_1` FOREIGN KEY (`id_maq_agro`) REFERENCES `agroind_maquinaria_equipo` (`id_maq_agro`)
) ENGINE=InnoDB AUTO_INCREMENT=211 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tareas_programadas` (
  `id_tarea` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_lote` int DEFAULT NULL,
  `id_tipo_tarea` int DEFAULT NULL,
  `titulo` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `prioridad` enum('Baja','Media','Alta','Critica') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Media',
  `fecha_programada` date NOT NULL,
  `estado` enum('Pendiente','En_Progreso','Completada','Cancelada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pendiente',
  `usuario_asignado` int DEFAULT NULL,
  `origen` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_por` int DEFAULT NULL,
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_tarea`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_lote` (`id_lote`),
  KEY `id_tipo_tarea` (`id_tipo_tarea`),
  KEY `usuario_asignado` (`usuario_asignado`),
  KEY `creado_por` (`creado_por`),
  CONSTRAINT `tareas_programadas_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `tareas_programadas_ibfk_2` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`),
  CONSTRAINT `tareas_programadas_ibfk_3` FOREIGN KEY (`id_tipo_tarea`) REFERENCES `tipos_tarea` (`id_tipo_tarea`),
  CONSTRAINT `tareas_programadas_ibfk_4` FOREIGN KEY (`usuario_asignado`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `tareas_programadas_ibfk_5` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `task_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `action` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `performed_by` int DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `task_id` (`task_id`),
  KEY `performed_by` (`performed_by`),
  CONSTRAINT `task_logs_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_logs_ibfk_2` FOREIGN KEY (`performed_by`) REFERENCES `empleados` (`id_empleado`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `task_recurrences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `frequency` enum('daily','weekly','monthly') COLLATE utf8mb4_unicode_ci NOT NULL,
  `cron_expression` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `task_id` (`task_id`),
  CONSTRAINT `task_recurrences_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `assigned_to` int DEFAULT NULL,
  `tenant_id` int DEFAULT NULL,
  `status` enum('pending','in_progress','completed','canceled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `priority` int DEFAULT '0',
  `start_at` datetime DEFAULT NULL,
  `end_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `assigned_to` (`assigned_to`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id_tenant`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `terceros` (
  `id_tercero` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `tipo_persona` enum('Juridica','Natural') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_documento` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `documento` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `dv` varchar(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre_completo` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_comercial` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contacto` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono_contacto` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `regimen_fiscal` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'R-99-PN',
  `activo` tinyint(1) DEFAULT '1',
  `correo_facturacion` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `codigo_postal` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `codigo_municipio` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cupo_credito` decimal(15,2) DEFAULT '0.00',
  `dias_plazo` int DEFAULT '0',
  `recomendado_por` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `es_cliente` tinyint(1) DEFAULT '0',
  `es_proveedor` tinyint(1) DEFAULT '0',
  `es_empleado` tinyint(1) DEFAULT '0',
  `es_socio` tinyint(1) DEFAULT '0',
  `es_propietario` tinyint(1) DEFAULT '0',
  `es_otro` tinyint(1) DEFAULT '0',
  `banco` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_cuenta` enum('Ahorros','Corriente') COLLATE utf8mb4_unicode_ci DEFAULT 'Ahorros',
  `numero_cuenta` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_tercero`),
  UNIQUE KEY `unq_documento_tenant` (`id_tenant`,`documento`),
  UNIQUE KEY `uq_terceros_nombre_completo_tenant` (`id_tenant`,`nombre_completo`),
  UNIQUE KEY `uq_terceros_email_tenant` (`id_tenant`,`email`),
  UNIQUE KEY `uq_terceros_codigo_municipio_tenant` (`id_tenant`,`codigo_municipio`),
  UNIQUE KEY `uq_terceros_codigo_postal_tenant` (`id_tenant`,`codigo_postal`),
  UNIQUE KEY `uq_terceros_nombre_comercial_tenant` (`id_tenant`,`nombre_comercial`),
  KEY `id_tenant` (`id_tenant`),
  KEY `fk_tercero_tipo_doc` (`tipo_documento`),
  KEY `fk_tercero_regimen` (`regimen_fiscal`),
  KEY `fk_tercero_municipio` (`codigo_municipio`),
  CONSTRAINT `fk_tercero_municipio` FOREIGN KEY (`codigo_municipio`) REFERENCES `gen_municipios` (`codigo_dane`),
  CONSTRAINT `fk_tercero_regimen` FOREIGN KEY (`regimen_fiscal`) REFERENCES `gen_regimen_fiscal` (`codigo`),
  CONSTRAINT `fk_tercero_tipo_doc` FOREIGN KEY (`tipo_documento`) REFERENCES `gen_tipos_documento` (`codigo`),
  CONSTRAINT `terceros_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=80 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tipos_activo_mantenimiento` (
  `id_tipo_activo` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `categoria` enum('Infraestructura','Maquinaria','Vehiculo','Equipo','Sistema_Riego','Aljibe','Planta_Produccion','Jardin','Vivero','Bodega','Sede','Dormitorio','Camino') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `requiere_plan_preventivo` tinyint(1) DEFAULT '1',
  `requiere_orden_trabajo` tinyint(1) DEFAULT '1',
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_tipo_activo`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tipos_comprobantes` (
  `id_tipo_comp` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `codigo` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `es_factura_electronica` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id_tipo_comp`),
  UNIQUE KEY `uq_tipos_comprobantes_codigo_tenant` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_tipos_comprobantes_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `tipos_comprobantes_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tipos_documentos` (
  `id_tipo_doc` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_tipo_comp` int NOT NULL,
  `codigo` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `consecutivo_actual` int DEFAULT '1',
  `es_manual` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id_tipo_doc`),
  UNIQUE KEY `uq_tipos_documentos_codigo_tenant` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_tipos_documentos_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `id_tipo_comp` (`id_tipo_comp`),
  CONSTRAINT `tipos_documentos_ibfk_1` FOREIGN KEY (`id_tipo_comp`) REFERENCES `tipos_comprobantes` (`id_tipo_comp`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tipos_tarea` (
  `id_tipo_tarea` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tiempo_estimado_horas` decimal(6,2) DEFAULT NULL,
  `prioridad_defecto` enum('Baja','Media','Alta','Critica') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Media',
  PRIMARY KEY (`id_tipo_tarea`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `transportes` (
  `id_transporte` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `placa` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `empresa` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `conductor_nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `conductor_telefono` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_vehiculo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capacidad_kg` decimal(12,2) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_transporte`),
  UNIQUE KEY `uq_transportes_placa_tenant` (`id_tenant`,`placa`),
  KEY `id_tenant` (`id_tenant`),
  CONSTRAINT `transportes_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `trazabilidad_lotes` (
  `id_trazabilidad` bigint NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_lote` int NOT NULL,
  `id_siembra` bigint NOT NULL,
  `id_tipo_actividad` int NOT NULL,
  `fecha_actividad` date NOT NULL,
  `cantidad` decimal(12,2) NOT NULL,
  `unidad_medida` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_maquinaria` int DEFAULT NULL,
  `id_usuario_responsable` int DEFAULT NULL,
  `duracion_horas` decimal(6,2) DEFAULT NULL,
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `evidencia_foto` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `costo_mano_obra` decimal(12,2) DEFAULT NULL,
  `costo_insumos` decimal(12,2) DEFAULT NULL,
  `costo_maquinaria` decimal(12,2) DEFAULT NULL,
  `id_centro_costo` int DEFAULT NULL,
  PRIMARY KEY (`id_trazabilidad`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_lote` (`id_lote`),
  KEY `id_tipo_actividad` (`id_tipo_actividad`),
  KEY `idx_trazabilidad_fecha` (`fecha_actividad`),
  KEY `idx_trazabilidad_siembra` (`id_siembra`),
  CONSTRAINT `trazabilidad_lotes_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `trazabilidad_lotes_ibfk_2` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`),
  CONSTRAINT `trazabilidad_lotes_ibfk_3` FOREIGN KEY (`id_siembra`) REFERENCES `siembras` (`id_siembra`),
  CONSTRAINT `trazabilidad_lotes_ibfk_4` FOREIGN KEY (`id_tipo_actividad`) REFERENCES `actividades_tipo` (`id_tipo_actividad`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `trazabilidad_producto` (
  `id_traz_prod` bigint NOT NULL AUTO_INCREMENT,
  `id_finca` int NOT NULL,
  `id_lote` int NOT NULL,
  `id_cosecha` bigint NOT NULL,
  `id_siembra` bigint NOT NULL,
  `fecha_evento` datetime NOT NULL,
  `etapa` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `peso_kg` decimal(12,2) DEFAULT NULL,
  `destino` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_traz_prod`),
  KEY `id_finca` (`id_finca`),
  KEY `id_lote` (`id_lote`),
  KEY `id_cosecha` (`id_cosecha`),
  KEY `id_siembra` (`id_siembra`),
  CONSTRAINT `trazabilidad_producto_ibfk_1` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`),
  CONSTRAINT `trazabilidad_producto_ibfk_2` FOREIGN KEY (`id_lote`) REFERENCES `lotes` (`id_lote`),
  CONSTRAINT `trazabilidad_producto_ibfk_3` FOREIGN KEY (`id_cosecha`) REFERENCES `cosechas` (`id_cosecha`),
  CONSTRAINT `trazabilidad_producto_ibfk_4` FOREIGN KEY (`id_siembra`) REFERENCES `siembras` (`id_siembra`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `umbrales_plagas` (
  `id_umbral` int NOT NULL AUTO_INCREMENT,
  `id_plaga` int NOT NULL,
  `id_cultivo` int NOT NULL,
  `nivel_incidencia_critico` decimal(5,2) NOT NULL,
  `costo_tratamiento_vs_perdida` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_umbral`),
  KEY `id_plaga` (`id_plaga`),
  KEY `id_cultivo` (`id_cultivo`),
  CONSTRAINT `umbrales_plagas_ibfk_1` FOREIGN KEY (`id_plaga`) REFERENCES `plagas` (`id_plaga`),
  CONSTRAINT `umbrales_plagas_ibfk_2` FOREIGN KEY (`id_cultivo`) REFERENCES `cultivos` (`id_cultivo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `unicidad_auditoria` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tabla` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `columna` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `accion` enum('COMPROBADO','AGREGADO','ERROR') COLLATE utf8mb4_unicode_ci NOT NULL,
  `detalle` text COLLATE utf8mb4_unicode_ci,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `variedades` (
  `id_variedad` int NOT NULL AUTO_INCREMENT,
  `id_cultivo` int NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `dias_cosecha` int DEFAULT NULL,
  `rendimiento_promedio_ha` decimal(12,2) DEFAULT NULL,
  `resistencia_enfermedades` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `certificada` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id_variedad`),
  KEY `id_cultivo` (`id_cultivo`),
  CONSTRAINT `variedades_ibfk_1` FOREIGN KEY (`id_cultivo`) REFERENCES `cultivos` (`id_cultivo`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vehiculos` (
  `id_vehiculo` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_activo` int NOT NULL,
  `placa` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_vehiculo` enum('Camioneta','Camion','Bus','Automovil','Motocicleta','Tractocamion','Volqueta') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `marca` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modelo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ano` int DEFAULT NULL,
  `color` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_motor` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_chasis` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kilometraje_actual` int DEFAULT '0',
  `capacidad_carga_kg` decimal(10,2) DEFAULT NULL,
  `capacidad_pasajeros` int DEFAULT NULL,
  `soat_vencimiento` date DEFAULT NULL,
  `tecnicomecanica_vencimiento` date DEFAULT NULL,
  `poliza_seguro` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `seguro_vencimiento` date DEFAULT NULL,
  `id_finca` int DEFAULT NULL,
  PRIMARY KEY (`id_vehiculo`),
  UNIQUE KEY `uq_vehiculos_placa_tenant` (`id_tenant`,`placa`),
  KEY `id_tenant` (`id_tenant`),
  KEY `id_activo` (`id_activo`),
  KEY `fk_vehiculos_finca` (`id_finca`),
  CONSTRAINT `fk_vehiculos_finca` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`) ON DELETE CASCADE,
  CONSTRAINT `vehiculos_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`),
  CONSTRAINT `vehiculos_ibfk_2` FOREIGN KEY (`id_activo`) REFERENCES `activos_mantenimiento` (`id_activo`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vivero_camadas` (
  `id_camada` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_item_semilla` int NOT NULL,
  `codigo_camada` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_siembra_bandeja` date NOT NULL,
  `fecha_germinacion_esperada` date DEFAULT NULL,
  `cantidad_sembrada` decimal(15,2) NOT NULL,
  `cantidad_actual` decimal(15,2) NOT NULL,
  `ubicacion_vivero` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('En Germinación','Crecimiento','Lista para Siembra','Agotada','Descartada') COLLATE utf8mb4_unicode_ci DEFAULT 'En Germinación',
  PRIMARY KEY (`id_camada`),
  UNIQUE KEY `uq_vivero_camadas_codigo_camada_tenant` (`id_tenant`,`codigo_camada`),
  KEY `idx_tenant` (`id_tenant`),
  KEY `id_item_semilla` (`id_item_semilla`),
  CONSTRAINT `vivero_camadas_ibfk_1` FOREIGN KEY (`id_item_semilla`) REFERENCES `vivero_inventario` (`id_item`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vivero_inventario` (
  `id_item` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `tipo` enum('Semilla','Plántula','Abono Químico','Abono Orgánico') COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proveedor` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cantidad_disponible` decimal(15,2) DEFAULT '0.00',
  `unidad_medida` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `costo_unitario` decimal(15,2) DEFAULT '0.00',
  `fecha_ingreso` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_item`),
  UNIQUE KEY `uq_vivero_inventario_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `idx_tenant` (`id_tenant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vivero_movimientos` (
  `id_movimiento` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_camada` int DEFAULT NULL,
  `id_item` int DEFAULT NULL,
  `tipo_movimiento` enum('Ingreso','Salida_Siembra','Salida_Poda','Salida_Resiembra','Venta','Obsequio','Baja_Enfermedad') COLLATE utf8mb4_unicode_ci NOT NULL,
  `cantidad` decimal(15,2) NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  `id_empleado_responsable` int DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `precio_venta_total` decimal(15,2) DEFAULT '0.00',
  PRIMARY KEY (`id_movimiento`),
  KEY `idx_tenant` (`id_tenant`),
  KEY `id_camada` (`id_camada`),
  KEY `id_item` (`id_item`),
  KEY `id_empleado_responsable` (`id_empleado_responsable`),
  CONSTRAINT `vivero_movimientos_ibfk_1` FOREIGN KEY (`id_camada`) REFERENCES `vivero_camadas` (`id_camada`) ON DELETE SET NULL,
  CONSTRAINT `vivero_movimientos_ibfk_2` FOREIGN KEY (`id_item`) REFERENCES `vivero_inventario` (`id_item`) ON DELETE SET NULL,
  CONSTRAINT `vivero_movimientos_ibfk_3` FOREIGN KEY (`id_empleado_responsable`) REFERENCES `rrhh_empleados` (`id_empleado`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vivero_produccion` (
  `id_vivero_prod` bigint NOT NULL AUTO_INCREMENT,
  `id_vivero` int NOT NULL,
  `id_cultivo` int NOT NULL,
  `id_variedad` int DEFAULT NULL,
  `fecha_siembra` date NOT NULL,
  `cantidad_bandejas` int NOT NULL,
  `cantidad_celdas_bandeja` int NOT NULL,
  `cantidad_plantulas_sembradas` int NOT NULL,
  `cantidad_plantulas_vivas` int NOT NULL,
  `porcentaje_germinacion` decimal(5,2) DEFAULT NULL,
  `edad_dias` int DEFAULT NULL,
  `fecha_estimada_trasplante` date DEFAULT NULL,
  `fecha_real_trasplante` date DEFAULT NULL,
  `lote_destino` int DEFAULT NULL,
  `estado` enum('En_Crecimiento','Listo_Trasplante','Trasplantado','Perdido','Descartado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'En_Crecimiento',
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_vivero_prod`),
  KEY `id_vivero` (`id_vivero`),
  KEY `lote_destino` (`lote_destino`),
  KEY `idx_vivero_estado` (`estado`,`fecha_estimada_trasplante`),
  CONSTRAINT `vivero_produccion_ibfk_1` FOREIGN KEY (`id_vivero`) REFERENCES `viveros` (`id_vivero`),
  CONSTRAINT `vivero_produccion_ibfk_2` FOREIGN KEY (`lote_destino`) REFERENCES `lotes` (`id_lote`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vivero_seguimiento_fitosanitario` (
  `id_seguimiento` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `id_camada` int NOT NULL,
  `fecha_revision` date NOT NULL,
  `porcentaje_afectacion` decimal(5,2) DEFAULT '0.00',
  `tipo_plaga_enfermedad` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accion_tomada` text COLLATE utf8mb4_unicode_ci,
  `id_empleado_revisor` int DEFAULT NULL,
  PRIMARY KEY (`id_seguimiento`),
  KEY `idx_tenant` (`id_tenant`),
  KEY `id_camada` (`id_camada`),
  KEY `id_empleado_revisor` (`id_empleado_revisor`),
  CONSTRAINT `vivero_seguimiento_fitosanitario_ibfk_1` FOREIGN KEY (`id_camada`) REFERENCES `vivero_camadas` (`id_camada`) ON DELETE CASCADE,
  CONSTRAINT `vivero_seguimiento_fitosanitario_ibfk_2` FOREIGN KEY (`id_empleado_revisor`) REFERENCES `rrhh_empleados` (`id_empleado`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `viveros` (
  `id_vivero` int NOT NULL AUTO_INCREMENT,
  `id_tenant` int NOT NULL,
  `codigo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `capacidad_bandejas` int DEFAULT NULL,
  `dimensiones_m2` decimal(10,2) DEFAULT NULL,
  `tipo_estructura` enum('Plastico','Vidrio','Malla_Sombra','Casa_Malla','Aire_Libre') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sistema_riego` enum('Goteo','Aspersion','Microaspersion','Manual') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `id_finca` int DEFAULT NULL,
  PRIMARY KEY (`id_vivero`),
  UNIQUE KEY `uq_viveros_codigo_tenant` (`id_tenant`,`codigo`),
  UNIQUE KEY `uq_viveros_nombre_tenant` (`id_tenant`,`nombre`),
  KEY `id_tenant` (`id_tenant`),
  KEY `fk_viveros_finca` (`id_finca`),
  CONSTRAINT `fk_viveros_finca` FOREIGN KEY (`id_finca`) REFERENCES `fincas` (`id_finca`) ON DELETE CASCADE,
  CONSTRAINT `viveros_ibfk_1` FOREIGN KEY (`id_tenant`) REFERENCES `tenants` (`id_tenant`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
