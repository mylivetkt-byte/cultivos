import React from 'react';
import {
  Map,
  Compass,
  Sprout,
  Tractor,
  Droplets,
  CloudSun,
  ShieldCheck,
  Trees,
  Zap,
  Bug,
  Calendar,
  Layers,
  ThermometerSun,
  Activity,
  ClipboardList,
  Package,
  Wrench,
  ShoppingCart,
  FlaskConical,
  TestTube2,
  Fish,
  Briefcase,
  Users,
  LineChart,
  Landmark,
  FileText,
  Building2,
  PieChart,
  HardHat,
  Droplet,
  Globe2,
  ListTodo,
  Car,
  Camera
} from 'lucide-react';

export const STATIC_NAVIGATION = [
  {
    id: 'Sistemas SAS',
    name: 'Sistemas SAS',
    icon: <Wrench size={20} />,
    items: [
      { id: 'sistemas-tenants', name: 'Gestión de Empresas', icon: <Building2 size={18} />, path: '/sistemas' },
      { id: 'sistemas-stats', name: 'Estadísticas Globales', icon: <LineChart size={18} />, path: '/sistemas/stats' }
    ]
  },
  {
    id: 'Agricultura y Cultivos',
    name: 'Agricultura y Cultivos',
    icon: <Tractor size={20} />,
    items: [
      { id: 'cultivos-avanzado', name: 'Tablero Avanzado (Gerencial)', icon: <LineChart size={18} /> },
      { id: 'cultivos-dashboard', name: 'Centro de Control', icon: <Activity size={18} /> },
      {
        id: 'menu_cultivos',
        name: 'Cultivos',
        icon: <Sprout size={18} />,
        isSubmenu: true,
        items: [
          { id: 'cultivos', name: 'Especies de Cultivos' },
          { id: 'cultivos_catalogo', name: 'Catálogo de Cultivos' },
          { id: 'variedades', name: 'Variedades' },
          { id: 'calendario_agricola', name: 'Calendario Agrícola' },
          { id: 'calendario_cultivo', name: 'Calendario de Cultivo' },
          { id: 'calendario_riego', name: 'Calendario de Riego' },
          { id: 'fenologia_cultivo', name: 'Fenología de Cultivo' },
          { id: 'fenologia_etapas', name: 'Etapas Fenológicas' },
          { id: 'rotaciones_cultivos', name: 'Rotaciones de Cultivos' },
          { id: 'rotaciones_fases', name: 'Fases de Rotación' },
          { id: 'asociacion_cultivos', name: 'Asociaciones' },
          { id: 'satellite-monitor', name: 'Monitoreo Satelital' },
          { id: 'salud_arboles', name: 'Salud Árboles' }
        ]
      },
      {
        id: 'menu_siembras',
        name: 'Siembras',
        icon: <Trees size={18} />,
        isDynamicTarget: true,
        dynamicKey: 'Siembras',
        isSubmenu: true,
        items: [
          { id: 'siembras', name: 'Registro de Siembras' },
          { id: 'presupuestos_siembra', name: 'Presupuestos de Siembra' },
          { id: 'siembra_arboles', name: 'Siembra de Árboles' }
        ]
      },
      {
        id: 'menu_labores',
        name: 'Tareas y Movimientos',
        icon: <ClipboardList size={18} />,
        isSubmenu: true,
        items: [
          { id: 'central-verificacion', name: 'Centro Verificación' },
          { id: 'labores_diarias', name: 'Labores Diarias' },
          { id: 'registro_aplicaciones', name: 'Abonos y Fumigaciones' },
          { id: 'cosechas', name: 'Registro de Cosechas' }
        ]
      },
      {
        id: 'menu_sanidad',
        name: 'Sanidad Vegetal',
        icon: <Bug size={18} />,
        isDynamicTarget: true,
        dynamicKey: 'Fitosanitario',
        isSubmenu: true,
        items: [
          { id: 'plagas', name: 'Catálogo de Plagas' },
          { id: 'enfermedades', name: 'Catálogo de Enfermedades' },
          { id: 'control_plagas', name: 'Aplicaciones Sanitarias' }
        ]
      },
      {
        id: 'menu_agua',
        name: 'Gestión Hídrica',
        icon: <Droplets size={18} />,
        isDynamicTarget: true,
        dynamicKey: 'Agua',
        isSubmenu: true,
        items: [
          { id: 'agua', name: 'Dashboard Hídrico' }
        ]
      },
      {
        id: 'menu_ambiente',
        name: 'Medio Ambiente',
        icon: <Globe2 size={18} />,
        isDynamicTarget: true,
        dynamicKey: 'Ambiente',
        isSubmenu: true,
        items: []
      },
      {
        id: 'menu_clima',
        name: 'Clima y Meteorología',
        icon: <CloudSun size={18} />,
        isDynamicTarget: true,
        dynamicKey: 'Clima',
        isSubmenu: true,
        items: [
          { id: 'clima-dashboard', name: 'Dashboard Climatológico' }
        ]
      },
      {
        id: 'menu_certificaciones',
        name: 'Certificaciones y Auditorías',
        icon: <ShieldCheck size={18} />,
        isDynamicTarget: true,
        dynamicKey: 'Certificaciones',
        isSubmenu: true,
        items: []
      },
      {
        id: 'menu_forestal',
        name: 'Gestión Forestal',
        icon: <Trees size={18} />,
        isDynamicTarget: true,
        dynamicKey: 'Forestal',
        isSubmenu: true,
        items: []
      },
      {
        id: 'menu_energia',
        name: 'Gestión de Energía',
        icon: <Zap size={18} />,
        isDynamicTarget: true,
        dynamicKey: 'Energía',
        isSubmenu: true,
        items: []
      }
    ]
  },
  {
    id: 'Inventario',
    name: 'Inventario',
    icon: <Package size={20} />,
    items: [
      {
        id: 'menu_inventario_catalogos',
        name: 'Catálogos',
        icon: <Layers size={18} />,
        isSubmenu: true,
        items: [
          { id: 'bod_bodegas', name: 'Catálogo de Bodegas' },
          { id: 'categorias_insumos', name: 'Categorías de Artículos' },
          { id: 'bodegas', name: 'Configuración de Bodegas' },
          { id: 'insumos', name: 'Insumos' },
          { id: 'inv_conversiones', name: 'Conversiones' },
          { id: 'inv_documentos', name: 'Documentos' },
          { id: 'inv_grupos', name: 'Grupos' },
          { id: 'inv_subgrupos', name: 'Subgrupos' },
          { id: 'inv_tipos_documento', name: 'Tipos de Documentos' },
          { id: 'inv_unidades_medida', name: 'Unidades de Medida' }
        ]
      },
      {
        id: 'menu_inventario_movimientos',
        name: 'Movimientos',
        icon: <Activity size={18} />,
        isSubmenu: true,
        items: [
          { id: 'recepcion-mercancia', name: 'Recepción (Entradas)' },
          { id: 'salidas_mercancia', name: 'Salidas y Consumos' },
          { id: 'traslados_bodegas', name: 'Traslados' },
          { id: 'toma_fisica', name: 'Toma Física' },
          { id: 'inv_pedidos', name: 'Pedidos Internos' },
          { id: 'inv_repuestos_cambiados', name: 'Custodia de Repuestos' }
        ]
      },
      {
        id: 'menu_inventario_consultas',
        name: 'Consultas y Reportes',
        icon: <FileText size={18} />,
        isSubmenu: true,
        items: [
          { id: 'bodegas-dashboard', name: 'Dashboard Bodegas' },
          { id: 'kardex-dashboard', name: 'Kárdex y Movimientos' },
          { id: 'saldos_bodega', name: 'Saldos por Bodega' },
          { id: 'inv_existencias', name: 'Existencias' },
          { id: 'movimientos_inventario', name: 'Movimientos' }
        ]
      },
      {
        id: 'menu_inventario_parametros',
        name: 'Configuraciones',
        icon: <Wrench size={18} />,
        isSubmenu: true,
        items: [
          { id: 'config_inventario', name: 'Parámetros', isPlaceholder: true },
          { id: 'config_alertas_seguridad', name: 'Alertas y Seguridad (PIN)' },
          { id: 'config_logo', name: 'Logo Empresa' }
        ]
      },
      {
        id: 'menu_inventario_basculas',
        name: 'Integración Básculas',
        icon: <Activity size={18} />,
        isSubmenu: true,
        items: [
          { id: 'basculas-config', name: 'Configuración' },
          { id: 'basculas-pruebas', name: 'Pruebas y Simulación' }
        ]
      }
    ]
  },
  {
    id: 'Compras',
    name: 'Compras',
    icon: <ShoppingCart size={20} />,
    items: [
      { id: 'compras-dashboard', name: 'Dashboard de Compras', icon: <PieChart size={18} /> },
      { id: 'solicitudes_pedido', name: 'Solicitudes', icon: <FileText size={18} /> },
      { id: 'validador-compras', name: 'Validador de Compras', icon: <ShieldCheck size={18} /> },
      { id: 'programador-compras', name: 'Programador', icon: <Calendar size={18} /> },
      { id: 'compras_precios_proveedor', name: 'Catálogo de Precios', icon: <ListTodo size={18} /> },
      { id: 'orden-compra-capturer', name: 'Orden de Compra', icon: <ShoppingCart size={18} /> },
      { id: 'analisis-compras', name: 'Análisis', icon: <LineChart size={18} /> }
    ]
  },
  {
    id: 'RRHH & Labores',
    name: 'RRHH & Labores',
    icon: <Users size={20} />,
    items: [
      {
        id: 'menu_rrhh_catalogos',
        name: 'Catálogos',
        icon: <Layers size={18} />,
        isSubmenu: true,
        items: [
          { id: 'employees', name: 'Empleados Activos' },
          { id: 'rrhh_catalogo_labores', name: 'Labores' },
          { id: 'rrhh_catalogo_cuadrillas', name: 'Catálogo de Cuadrillas' },
          { id: 'rrhh_conceptos', name: 'Conceptos de Nómina' }
        ]
      },
      {
        id: 'menu_rrhh_movimientos',
        name: 'Movimientos',
        icon: <Activity size={18} />,
        isSubmenu: true,
        items: [
          { id: 'app-empleado-mobile', name: 'App Empleado' },
          { id: 'jefe-cuadrilla-mobile', name: 'App Cuadrilla' },
          { id: 'rrhh_planillas_manuales', name: 'Planillas Manuales' },
          { id: 'rrhh_dian', name: 'Nómina DIAN' },
          { id: 'rrhh_permisos', name: 'Permisos' },
          { id: 'rrhh_vacaciones', name: 'Vacaciones' },
          { id: 'rrhh_contratos', name: 'Contratos' },
          { id: 'rrhh_generador_nomina', name: 'Generador de Nómina' }
        ]
      },
      {
        id: 'menu_rrhh_consultas',
        name: 'Consultas y Reportes',
        icon: <FileText size={18} />,
        isSubmenu: true,
        items: [
          { id: 'rrhh-dashboard', name: 'Dashboard RRHH' },
          { id: 'rrhh_ubicacion_personal', name: 'Ubicación del Personal' },
          { id: 'labores-report', name: 'Reporte de Labores' },
          { id: 'rrhh_historial_cuadrillas', name: 'Historial de Cuadrillas' },
          { id: 'auditoria_costos', name: 'Auditoría Costos (Cruce)' },
          { id: 'rrhh_historial', name: 'Historial Nómina' },
          { id: 'rrhh_hojas_vida', name: 'Hojas de Vida' }
        ]
      },
      {
        id: 'menu_rrhh_parametros',
        name: 'Configuraciones',
        icon: <Wrench size={18} />,
        isSubmenu: true,
        items: [
          { id: 'rrhh_parametros_dian', name: 'Parámetros DIAN', isPlaceholder: true },
          { id: 'unicidad-reglas', name: 'Reglas de Unicidad' }
        ]
      }
    ]
  },
  {
    id: 'Taller y Mantenimiento',
    name: 'Taller y Mantenimiento',
    icon: <Wrench size={20} />,
    items: [
      { id: 'app_taller', name: 'App Móvil Taller', icon: <Activity size={18} /> },
      {
        id: 'menu_taller_catalogos',
        name: 'Catálogos',
        icon: <Layers size={18} />,
        isSubmenu: true,
        items: [
          { id: 'agroind_maquinaria_equipo', name: 'Maquinaria Pesada' },
          { id: 'maquinaria', name: 'Equipos y Maquinaria' },
          { id: 'vehiculos', name: 'Flota Vehicular' },
          { id: 'mecanicos', name: 'Mecánicos' },
          { id: 'taller-herramientas', name: 'Herramientas' }
        ]
      },
      {
        id: 'menu_taller_movimientos',
        name: 'Movimientos',
        icon: <Activity size={18} />,
        isSubmenu: true,
        items: [
          { id: 'taller-ordenes', name: 'Órdenes de Trabajo' },
          { id: 'taller-combustible', name: 'Suministro Combustible' },
          { id: 'taller-checklists', name: 'Checklists' }
        ]
      },
      {
        id: 'menu_taller_consultas',
        name: 'Consultas y Reportes',
        icon: <FileText size={18} />,
        isSubmenu: true,
        items: [
          { id: 'taller-master', name: 'Master Taller' }
        ]
      }
    ]
  },
  {
    id: 'Aplicaciones Agrícolas',
    name: 'Aplicaciones Agrícolas',
    icon: <FlaskConical size={20} />,
    items: [
      { id: 'agricultura_biblioteca', name: 'Biblioteca Fitosanitaria ICA', icon: <ShieldCheck size={18} />, path: '/agricultura/biblioteca' },
      {
        id: 'menu_aplicaciones_unificado',
        name: 'Formulación y Aplicaciones',
        icon: <TestTube2 size={18} />,
        isSubmenu: true,
        items: [
          { id: 'agricultura_recetario', name: 'Recetario General', path: '/agricultura/recetario' },
          { id: 'agricultura_recetario_inteligente', name: 'Recetario e IA', path: '/agricultura/recetario-inteligente' },
          { id: 'agricultura_programador', name: 'Programador de Aplicaciones', path: '/agricultura/programador' },
          { id: 'app_produccion_organica', name: 'Bio-Fábrica' },
          { id: 'app_preparaciones_mezcla', name: 'Centro de Mezclas' },
          { id: 'agricultura_ejecucion', name: 'Registro Diario', path: '/agricultura/ejecucion' },
          { id: 'dashboard_aplicaciones', name: 'Tablero de Control' }
        ]
      }
    ]
  },
  {
    id: 'Comercialización',
    name: 'Comercialización',
    icon: <Briefcase size={20} />,
    items: [
      { id: 'comercial-dashboard', name: 'Mercados y Trading', icon: <LineChart size={18} /> },
      { id: 'com_ventas_historial', name: 'Historial de Ventas', icon: <FileText size={18} /> },
      { id: 'com_empresas_compradoras', name: 'Empresas Compradoras', icon: <Building2 size={18} /> },
      { id: 'com_empresas_transportadoras', name: 'Transportadoras', icon: <Car size={18} /> },
      { id: 'com_precios_mercado', name: 'Precios de Mercado', icon: <LineChart size={18} /> },
      { id: 'cosechas', name: 'Registro de Cosechas', icon: <Tractor size={18} /> },
      { id: 'productos_cosecha', name: 'Productos Cosechados', icon: <Package size={18} /> },
      { id: 'calidad_postcosecha', name: 'Calidad Postcosecha', icon: <TestTube2 size={18} /> }
    ]
  },
  {
    id: 'Contabilidad y Finanzas',
    name: 'Contabilidad y Finanzas',
    icon: <Landmark size={20} />,
    items: [
      {
        id: 'menu_catalogos',
        name: 'Catálogos',
        icon: <Layers size={18} />,
        isSubmenu: true,
        items: [
          { id: 'contabilidad_parametros', name: 'Parámetros' },
          { id: 'configuracion-contable', name: 'Distribución Contable' },
          { id: 'fincas', name: 'Fincas / Subempresas' },
          { id: 'contab_documentos', name: 'Comprobantes' },
          { id: 'plan_contable', name: 'Plan de Cuentas (PUC)' },
          { id: 'terceros', name: 'Directorio de Terceros' },
          { id: 'centros_costo', name: 'Centros de Costo' },
          { id: 'motor_contable', name: 'Motor ERP' },
          { id: 'tipos_documentos', name: 'Tipos de Documentos' },
          { id: 'periodos_contables', name: 'Periodos Contables' },
          { id: 'cuentas_bancarias', name: 'Cuentas Bancarias' },
          { id: 'ph_retencion', name: 'Conceptos de Retención', isPlaceholder: true }
        ]
      },
      {
        id: 'menu_movimientos',
        name: 'Movimientos',
        icon: <Activity size={18} />,
        isSubmenu: true,
        items: [
          { id: 'contabilidad_capturador', name: 'Capturador Contable' },
          { id: 'cartera_pagos', name: 'Capturador de Pagos' },
          { id: 'tesoreria_pagos_nomina', name: 'Pago Nómina' },
          { id: 'cartera_prestamos', name: 'Préstamos' },
          { id: 'ph_causacion', name: 'Causación', isPlaceholder: true },
          { id: 'ph_notas', name: 'Notas Bancarias', isPlaceholder: true }
        ]
      },
      {
        id: 'menu_consultas',
        name: 'Consultas',
        icon: <FileText size={18} />,
        isSubmenu: true,
        items: [
          { id: 'cartera_historico', name: 'Estado de Cuenta' },
          { id: 'consultas_contables', name: 'Consultas Contables' },
          { id: 'ph_consulta_doc', name: 'Consulta de Docs', isPlaceholder: true }
        ]
      },
      {
        id: 'menu_oficiales',
        name: 'Libros Oficiales',
        icon: <Building2 size={18} />,
        isSubmenu: true,
        items: [
          { id: 'libro_auxiliar', name: 'Libro Auxiliar' },
          { id: 'libro_diario', name: 'Libro Diario' },
          { id: 'libro_mayor', name: 'Libro Mayor' },
          { id: 'libro_inventarios', name: 'Libro Inventario' }
        ]
      },
      {
        id: 'menu_reportes',
        name: 'Reportes Gerenciales',
        icon: <LineChart size={18} />,
        isSubmenu: true,
        items: [
          { id: 'contabilidad_balance', name: 'Balance de Comprobación' },
          { id: 'balance_acumulado_lapsos', name: 'Balance por Lapsos' },
          { id: 'balance_general', name: 'Estado de Situación' },
          { id: 'estado_resultados', name: 'Estado de Resultados' },
          { id: 'estado_resultados_lapsos', name: 'Resultados por Lapsos' }
        ]
      },
      {
        id: 'menu_auditoria',
        name: 'Auditoría',
        icon: <ShieldCheck size={18} />,
        isSubmenu: true,
        items: [
          { id: 'control_consecutivos', name: 'Consecutivos' },
          { id: 'rastro_auditoria', name: 'Rastro Auditoría' },
          { id: 'conciliacion_bancaria', name: 'Conciliación Bancaria' }
        ]
      },
      {
        id: 'menu_finanzas_agro',
        name: 'Gestión Agro-Financiera',
        icon: <Tractor size={18} />,
        isSubmenu: true,
        items: [
          { id: 'costos_produccion', name: 'Costos Producción' },
          { id: 'activos_biologicos', name: 'Activos Biológicos' }
        ]
      },
      {
        id: 'dynamic_finanzas',
        name: 'Finanzas Consultas',
        icon: <LineChart size={18} />,
        isSubmenu: true,
        items: [
          { id: 'finanzas', name: 'Bolsillo del Productor' },
          { id: 'ph_rentabilidad_lote', name: 'Rentabilidad Lote' },
          { id: 'ph_exogena_dian', name: 'Exógena DIAN' },
          { id: 'ph_cert_retencion', name: 'Cert. de Retención' },
          { id: 'ph_conciliacion_fiscal', name: 'Conciliación Fiscal' },
          { id: 'cajas_menores', name: 'Cajas Menores' },
          { id: 'gastos_diarios', name: 'Gastos Diarios' }
        ]
      }
    ]
  },
  {
    id: 'Viveros',
    name: 'Viveros',
    icon: <Sprout size={20} />,
    isDynamicTarget: true,
    items: [
      { id: 'vivero-dashboard', name: 'Dashboard Vivero', icon: <PieChart size={18} /> },
      { id: 'inventario-camadas', name: 'Inventario y Camadas', icon: <Layers size={18} /> }
    ]
  },
  {
    id: 'Ganado',
    name: 'Ganado y Pecuario',
    icon: <Activity size={20} />,
    items: [
      { id: 'ph_ganado_dashboard', name: 'Dashboard Ganadero', icon: <PieChart size={18} /> },
      { id: 'ph_ganado_satelital', name: 'Monitoreo Satelital', icon: <Globe2 size={18} /> },
      {
        id: 'menu_ganado_catalogos',
        name: 'Catálogos Ganadería',
        icon: <Layers size={18} />,
        isSubmenu: true,
        items: [
          { id: 'ganado_animales', name: 'Animales' },
          { id: 'ganado_potreros', name: 'Potreros' },
          { id: 'ganado_razas', name: 'Razas' },
          { id: 'ganado_piscinas_bano', name: 'Piscinas / Baños' },
          { id: 'ganado_vacunacion', name: 'Vacunación' },
          { id: 'ganado_sanidad', name: 'Sanidad' }
        ]
      },
      { id: 'ph_ganado_ficha', name: 'Ficha del Animal', icon: <FileText size={18} /> },
      { id: 'ph_ganado_estudio', name: 'Estudio Fotográfico', icon: <Camera size={18} /> },
      { id: 'ph_ganado_reproduccion', name: 'Programador de Preñez', icon: <Activity size={18} /> },
      { id: 'ph_ganado_comercio', name: 'Comercio y Traslados', icon: <ShoppingCart size={18} /> },
      { id: 'ph_ganado_leche', name: 'Producción de Leche', icon: <Activity size={18} /> },
      { id: 'ph_ganado_zoosanitario', name: 'Plan Zoosanitario', icon: <ShieldCheck size={18} /> },
      { id: 'ph_ganado_herramientas', name: 'Herramientas', icon: <Wrench size={18} /> },
      { id: 'app_veterinario', name: 'App Zootecnista (Móvil)', icon: <Activity size={18} /> }
    ]
  },
  {
    id: 'Acuícola',
    name: 'Acuícola',
    icon: <Fish size={20} />,
    items: [
      { id: 'acuicola-dashboard', name: 'Dashboard Acuícola', icon: <Activity size={18} /> },
      {
        id: 'menu_acuicola_catalogos',
        name: 'Catálogos Acuícola',
        icon: <Layers size={18} />,
        isSubmenu: true,
        items: [
          { id: 'acuicola_estanques', name: 'Estanques y Lagos' },
          { id: 'acuicola_especies', name: 'Especies' },
          { id: 'acuicola_siembras', name: 'Siembras y Lotes' },
          { id: 'acuicola_calidad_agua', name: 'Calidad del Agua' },
          { id: 'acuicola_alimentacion', name: 'Alimentación' },
          { id: 'acuicola_muestreos', name: 'Muestreos (Biometría)' },
          { id: 'acuicola_novedades', name: 'Novedades y Muertes' }
        ]
      },
      { id: 'acuicola_programador', name: 'Programador y Alevinos', icon: <Calendar size={18} /> },
      { id: 'acuicola_molino', name: 'Planta Alimentos (Molino)', icon: <Building2 size={18} /> },
      { id: 'acuicola_molino_mantenimiento', name: 'Mantenimiento Planta y Equipos', icon: <Wrench size={18} /> },
      { id: 'acuicola_herramientas', name: 'Herramientas y Equipos', icon: <Activity size={18} /> },
      {
        id: 'menu_acuicola_gestion_cosechas',
        name: 'Gestión de Cosechas',
        icon: <Tractor size={18} />,
        isSubmenu: true,
        items: [
          { id: 'acuicola_cosechas', name: 'Registro de Cosechas' },
          { id: 'acuicola_cosechas_historico', name: 'Consultar Históricos' }
        ]
      }
    ]
  },
  {
    id: 'Satélite & GPS Tracker',
    name: 'Satélite & GPS Tracker',
    icon: <Map size={20} />,
    items: [
      { id: 'satellite-monitor', name: 'Satélite (GIS Premium)', icon: <Globe2 size={18} /> },
      { id: 'gps-tracker', name: 'GPS Tracker', icon: <Compass size={18} /> }
    ]
  },
  {
    id: 'IA',
    name: 'Asistente IA',
    icon: <ListTodo size={20} />,
    items: [
      { id: 'task-planner', name: 'Planificador de Tareas', icon: <Calendar size={18} /> }
    ]
  }
];
