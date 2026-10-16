/**
 * INTEGRACIÓN DEL MÓDULO DE PRODUCCIÓN EN SIDEBAR.JSX
 *
 * Este archivo muestra cómo integrar el módulo de Producción en el menú principal
 */

// ============================================
// PASO 1: Importar en Sidebar.jsx (línea 1-20)
// ============================================

import ProductionMenuItems from './ProductionMenuIntegration';

// ============================================
// PASO 2: Agregar sección en el renderizado
// ============================================

// Dentro del renderizado del sidebar, agregar:

/*
<div className="menu-section">
  <div className="menu-section-title">📦 PRODUCCIÓN</div>
  <ProductionMenuItems onSelectTable={onSelectTable} />
</div>

// Esto genera 4 opciones:
// ├─ 📊 Histórico de Producciones
// ├─ 📦 Crear Orden de Producción
// ├─ 💰 Precios de Mercado
// └─ ⚙️ Configuración de Producción
*/

// ============================================
// PASO 3: CSS para estilos (en App.css o similar)
// ============================================

const sidebarStyles = `
  .produccion-menu-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem 0;
  }

  .produccion-item {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .produccion-item:hover {
    background-color: #f3f4f6;
    color: #059669;
    transform: translateX(4px);
  }

  .produccion-item.active {
    background-color: #d1fae5;
    color: #059669;
    border-left: 4px solid #059669;
  }

  .produccion-item .menu-icon {
    margin-right: 0.75rem;
    flex-shrink: 0;
  }

  .produccion-item .menu-label {
    flex: 1;
  }

  .menu-section-title {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #6b7280;
    padding: 1rem 1rem 0.5rem 1rem;
    margin-top: 1rem;
  }
`;

// ============================================
// ESTRUCTURA COMPLETA DEL MENÚ ESPERADO
// ============================================

/*
MENÚ PRINCIPAL:
├── INICIO
├── AGRICULTURA
│   ├─ Biblioteca Fitosanitaria
│   ├─ Programador de Aplicaciones
│   ├─ Recetario
│   └─ Ejecución de Aplicaciones
├── GANADERÍA
│   ├─ Sanidad
│   ├─ Reproducción
│   └─ Comercio
├── ACUICULTURA
│   ├─ Dashboard
│   ├─ Catálogos
│   └─ Herramientas
├── INVENTARIO
│   ├─ Bodegas
│   ├─ Traslados
│   └─ Tomas Físicas
├── PRODUCCIÓN ◄─── NUEVO
│   ├─ Histórico de Producciones
│   ├─ Crear Orden de Producción
│   ├─ Precios de Mercado
│   └─ Configuración de Producción
├── FINANCIERO
│   ├─ Contabilidad
│   ├─ Finanzas Agro
│   └─ Estados Financieros
└── SISTEMAS
    ├─ Configuración
    ├─ Auditoría
    └─ Estadísticas
*/

// ============================================
// RUTAS ADICIONALES EN APP.JSX (si aplica)
// ============================================

/*
Dentro de la sección <Routes>:

<Route path="/produccion/historico" element={<ProductionHistoryDashboard />} />
<Route path="/produccion/crear-orden" element={<CreateProductionOrder />} />
<Route path="/produccion/precios-mercado" element={<MarketPriceManager />} />
<Route path="/produccion/configuracion" element={<ProductionConfig />} />

Nota: CreateProductionOrder, MarketPriceManager, ProductionConfig
deberían ser componentes React adicionales para completar el módulo.
*/

// ============================================
// VARIABLES DE AMBIENTE (.env)
// ============================================

/*
# Producción - Configuración por Tenant
PRODUCCION_MARGEN_MINIMO=20
PRODUCCION_INTELIGENCIA_MERCADO=true
PRODUCCION_DIAS_VALIDEZ_PRECIO=30
PRODUCCION_CARGA_BAJO_DEMANDA=true
PRODUCCION_MAX_REGISTROS_POR_CONSULTA=10000
*/

// ============================================
// ENDPOINTS DISPONIBLES
// ============================================

const apiEndpoints = {
  createOrder: 'POST /api/produccion/crear-orden',
  finalizeProduction: 'POST /api/produccion/finalizar-produccion',
  getHistorico: 'POST /api/produccion/historico-producciones',
  getLoteDetails: 'GET /api/produccion/lote/:idLoteProd',
  setMarketPrice: 'POST /api/produccion/precios-mercado',
  getMarketPrice: 'GET /api/produccion/precios-mercado/:id_insumo_producto',
  getConfig: 'GET /api/produccion/config-tenant/:id_tenant',
  setConfig: 'POST /api/produccion/config-tenant',
  getRentabilityAnalysis: 'POST /api/produccion/analisis-rentabilidad'
};

export default sidebarStyles;
