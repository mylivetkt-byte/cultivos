import SuperCultivosCatalogo from './components/Agriculture/SuperCultivosCatalogo.jsx';
import React from 'react';
import RegistroProduccionBiol from './components/Agriculture/RegistroProduccionBiol.jsx';
import FormularioAlimentacionLagos from './components/Acuicola/FormularioAlimentacionLagos.jsx';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GlobalSelectorsProvider } from './context/GlobalSelectorsContext.jsx';
import { useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import Sidebar from './components/Sidebar';
import PhytosanitaryLibrary from './components/Agriculture/PhytosanitaryLibrary';
import ApplicationPlanner from './components/Agriculture/ApplicationPlanner';
import RecipeManager from './components/Agriculture/RecipeManager';
import SmartPrescriptionApp from './components/Agriculture/SmartPrescriptionApp';
import ApplicationExecution from './components/Agriculture/ApplicationExecution';
import AcuicolaCatalogos from './components/Agriculture/AcuicolaCatalogos';
import HerramientasAcuicolaDashboard from './components/Agriculture/Herramientas/HerramientasAcuicolaDashboard';
import FormCosecha from './pages/Harvest/FormCosecha.jsx';
import CosechasDashboard from './pages/Harvest/CosechasDashboard.jsx';
import CosechasImport from './pages/Harvest/CosechasImport.jsx';
import ProductionHistoryDashboard from './components/ProductionHistoryDashboard.jsx';
import CrearOrdenWizard from './components/Production/CrearOrdenWizard.jsx';
import ProductionPreciosMercado from './components/Production/ProductionPreciosMercado.jsx';
import ProductionConfigTenant from './components/Production/ProductionConfigTenant.jsx';
import ProductionDashboard from './components/Production/ProductionDashboard.jsx';
import ProductionCatalogoProductos from './components/Production/ProductionCatalogoProductos.jsx';
import ProductionFormulas from './components/Production/ProductionFormulas.jsx';
import POSConsole from './components/POS/POSConsole.jsx';
import MobileSalesApp from './components/POS/MobileSalesApp.jsx';
import POSHistorial from './components/POS/POSHistorial.jsx';
import POSDianPendientes from './components/POS/POSDianPendientes.jsx';
import POSArqueo from './components/POS/POSArqueo.jsx';
import POSBasculas from './components/POS/POSBasculas.jsx';
import POSCajas from './components/POS/POSCajas.jsx';
import POSHistoricoCajeros from './components/POS/POSHistoricoCajeros.jsx';
import POSCartera from './components/POS/POSCartera.jsx';
import DianBoxSettings from './components/Comercializacion/DianBoxSettings.jsx';
import ProgramadorPrenez from './components/Ganado/ProgramadorPrenez';
import EmpleadoApp from './components/Payroll/EmpleadoApp';

import FichaAnimal from './components/Ganado/FichaAnimal';
import ComercioGanado from './components/Ganado/ComercioGanado';
import TableroSatelital from './components/Ganado/TableroSatelital';


import SatelliteMonitor from './components/SatelliteMonitor';
import MuestreoSuelosManager from './components/Precision/MuestreoSuelosManager';
import TrasladosBodegas from './components/TrasladosBodegas';
import AppHeader from './components/AppHeader';
import TaskPlanner from './components/TaskPlanner';
import RRHHUbicacionPersonal from './components/Payroll/RRHHUbicacionPersonal';


import TenantManager from './components/Sistemas/TenantManager';
import AdministracionUsuarios from './components/SistemasSAS/AdministracionUsuarios';
import GlobalStats from './components/Sistemas/GlobalStats';
import AuditoriaFincaDetalle from './components/Sistemas/AuditoriaFincaDetalle';
import AsistenteGerencial from './components/Sistemas/AsistenteGerencial';
import AcuicolaDashboard from './components/Agriculture/AcuicolaDashboard';
import { fetchModules, fetchTableData } from './utils/api';
import SelectedTableContent from './modules/SelectedTableContent';
import CambioClaveObligatorio from './components/CambioClaveObligatorio';
import PreliquidacionTaller from './components/Taller/PreliquidacionTaller.jsx';
import RadarMaquinaria from './components/RadarMaquinaria.jsx';

function AppContent() {
  const { user, loading, logout, tenantId, permisos, requiereCambioClave } = useAuth();
  const publicEmployeePortal = window.location.pathname.startsWith('/portal/empleado');
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(window.innerWidth > 768);
  const [selectedTable, setSelectedTable] = React.useState(localStorage.getItem('selectedTable') || null);
  const [modules, setModules] = React.useState(null);
  const [loadingModules, setLoadingModules] = React.useState(true);
  const [globalSolicitudModal, setGlobalSolicitudModal] = React.useState(false);

  // Clear selectedTable when navigating to system management routes to avoid unwanted dashboard rendering
  React.useEffect(() => {
    if (location.pathname.startsWith('/sistemas')) {
      setSelectedTable(null);
      localStorage.removeItem('selectedTable');
    }
  }, [location.pathname]);

  const [selectedFinca, setSelectedFinca] = React.useState(localStorage.getItem('selectedFinca') || '');
  const [selectedNucleo, setSelectedNucleo] = React.useState(localStorage.getItem('selectedNucleo') || '');
  const [fincasList, setFincasList] = React.useState([]);
  const [nucleosList, setNucleosList] = React.useState([]);

  React.useEffect(() => {
    if (user) {
      fetchModules()
        .then((data) => setModules(data))
        .catch((err) => console.error('Error loading modules:', err))
        .finally(() => setLoadingModules(false));
    }
  }, [user]);

  React.useEffect(() => {
    if (tenantId) {
      fetchTableData('fincas', { tenantId, pageSize: 100 })
        .then(res => setFincasList(res.data || []))
        .catch(err => console.error('Error fetching fincas:', err));
    }
  }, [tenantId]);

  React.useEffect(() => {
    if (selectedFinca) {
      fetchTableData('nucleos', { fincaId: selectedFinca, tenantId, pageSize: 100 })
        .then(res => setNucleosList(res.data || []))
        .catch(err => console.error('Error fetching nucleos:', err));
    } else {
      setNucleosList([]);
      setSelectedNucleo('');
    }
  }, [selectedFinca, tenantId]);

  const handleFincaChange = (val) => {
    setSelectedFinca(val);
    if (val) {
      localStorage.setItem('selectedFinca', val);
    } else {
      localStorage.removeItem('selectedFinca');
    }
    setSelectedNucleo('');
    localStorage.removeItem('selectedNucleo');
  };

  const handleNucleoChange = (val) => {
    setSelectedNucleo(val);
    if (val) {
      localStorage.setItem('selectedNucleo', val);
    } else {
      localStorage.removeItem('selectedNucleo');
    }
  };

  const handleSelectTable = (tableName) => {
    setSelectedTable(tableName);
    if (tableName) {
      localStorage.setItem('selectedTable', tableName);
    } else {
      localStorage.removeItem('selectedTable');
    }
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const handleNavigateHome = () => {
    setSelectedTable(null);
    localStorage.removeItem('selectedTable');
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const [showRegister, setShowRegister] = React.useState(false);

  if (loading) {
    return (
      <div className="login-container">
        <div style={{ color: '#fff', fontSize: '18px' }}>Cargando...</div>
      </div>
    );
  }

  if (!user && !publicEmployeePortal) {
    if (showRegister) {
      return (
        <RegisterPage onBack={() => setShowRegister(false)} />
      );
    }
    return (
      <LoginPage onRegister={() => setShowRegister(true)} />
    );
  }

  if (user && requiereCambioClave) {
    return <CambioClaveObligatorio />;
  }

  return (
    <GlobalSelectorsProvider>
        {publicEmployeePortal ? (
          <Routes>
            <Route path="/portal/empleado" element={<EmpleadoApp tenantId={tenantId} />} />
            <Route path="/acuicola/dashboard" element={<AcuicolaDashboard selectedTable={selectedTable} />} />
            <Route path="/acuicola/catalogos" element={<AcuicolaCatalogos selectedTable={selectedTable} />} />
            <Route path="/acuicola/herramientas" element={<HerramientasAcuicolaDashboard />} />
            <Route path="/ganado/tablero-satelital" element={<TableroSatelital fincaId={selectedFinca} fincas={fincasList} />} />
            <Route path="*" element={<Navigate to="/portal/empleado" replace />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="ganado/sanidad" element={<PhytosanitaryLibrary />} />
            <Route path="ganado/reproduccion" element={<ProgramadorPrenez />} />
            <Route path="ganado/comercio" element={<ComercioGanado />} />
            <Route path="ganado/ficha" element={<FichaAnimal />} />
            <Route path="/cosechas/nuevo" element={<FormCosecha />} />
            <Route path="/cosechas/dashboard" element={<CosechasDashboard />} />
            <Route path="/cosechas/import" element={<CosechasImport />} />
            <Route path="*" element={
              <div className="app-container">
                <Sidebar
                  modules={modules}
                  loading={loadingModules}
                  selectedTable={selectedTable}
                  onSelectTable={handleSelectTable}
                  onNavigateHome={handleNavigateHome}
                  open={sidebarOpen}
                  onToggle={() => setSidebarOpen(!sidebarOpen)}
                  permisos={permisos}
                />
                <main className="main-content">
                    <AppHeader
                      selectedFinca={selectedFinca}
                      selectedNucleo={selectedNucleo}
                      fincasList={fincasList}
                      nucleosList={nucleosList}
                      handleFincaChange={handleFincaChange}
                      handleNucleoChange={handleNucleoChange}
                      user={user}
                      logout={logout}
                      handleNavigateHome={handleNavigateHome}
                      toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    />
                    {selectedTable && (
                      <span className="breadcrumb" style={{ marginLeft: '12px' }}>
                        <a href="#" onClick={(e) => { e.preventDefault(); handleNavigateHome(); }}>Inicio</a>
                        <span className="breadcrumb-sep">/</span>
                        <span className="breadcrumb-current">{selectedTable.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                      </span>
                    )}
                  
                <div className="content-area">
                  <Routes>
                    <Route path="/sistemas" element={<TenantManager />} />
                    <Route path="/sistemas/usuarios" element={<AdministracionUsuarios />} />
                    <Route path="/sistemas/stats" element={<GlobalStats />} />
                    <Route path="/sistemas/auditoria-finca" element={<AuditoriaFincaDetalle />} />
                    <Route path="/gerencia/asistente-ia" element={<AsistenteGerencial />} />
                    <Route path="/satelite" element={<SatelliteMonitor />} />
                    <Route path="/precision/suelos" element={<MuestreoSuelosManager />} />
                    <Route path="/agricultura/biblioteca" element={<PhytosanitaryLibrary />} />
                    <Route path="/agricultura/programador" element={<ApplicationPlanner />} />
                    <Route path="/inventario/traslados-bodegas" element={<TrasladosBodegas />} />
                              <Route path="/agricultura/catalogo-cultivos-super" element={<SuperCultivosCatalogo />} />
<Route path="/agricultura/recetario" element={<RecipeManager />} />
                    <Route path="/agricultura/recetario-inteligente" element={<SmartPrescriptionApp />} />
                    <Route path="/agricultura/ejecucion" element={<ApplicationExecution />} />

        {/* Rutas inyectadas para Kardex UI */}
        <Route path="/agricultura/bio-fabrica" element={<RegistroProduccionBiol />} />
        <Route path="/acuicola/alimentacion" element={<FormularioAlimentacionLagos />} />

                    <Route path="/labores" element={<TaskPlanner tenantId={tenantId} fincaId={selectedFinca} nucleoId={selectedNucleo} />} />
                    <Route path="/rrhh/ubicacion" element={<RRHHUbicacionPersonal tenantId={tenantId} fincaId={selectedFinca} />} />
                    <Route path="/produccion/historico" element={<ProductionHistoryDashboard />} />
                    <Route path="/produccion/crear-orden" element={<CrearOrdenWizard />} />
                    <Route path="/produccion/precios" element={<ProductionPreciosMercado />} />
                    <Route path="/produccion/config" element={<ProductionConfigTenant />} />
                    <Route path="/produccion/dashboard" element={<ProductionDashboard />} />
                    <Route path="/produccion/catalogo-productos" element={<ProductionCatalogoProductos />} />
                    <Route path="/produccion/formulas" element={<ProductionFormulas />} />
                    <Route path="/maquinaria/radar" element={<RadarMaquinaria />} />
                    <Route path="/taller/preliquidacion" element={<PreliquidacionTaller />} />
                    <Route path="/comercializacion/pos" element={<POSConsole />} />
                    <Route path="/comercializacion/pos/historial" element={<POSHistorial />} />
                    <Route path="/comercializacion/pos/dian-pendientes" element={<POSDianPendientes />} />
                    <Route path="/comercializacion/pos/arqueo" element={<POSArqueo />} />
                    <Route path="/comercializacion/pos-movil" element={<MobileSalesApp />} />
                    <Route path="/comercializacion/pos/basculas" element={<POSBasculas />} />
                    <Route path="/comercializacion/pos/cajas" element={<POSCajas />} />
                    <Route path="/comercializacion/pos/cartera" element={<POSCartera />} />
                    <Route path="/comercializacion/pos/historico-cajeros" element={<POSHistoricoCajeros />} />
                    <Route path="/comercializacion/proveedor-tecnologico" element={<DianBoxSettings tenantId={tenantId} />} />
                  </Routes>
                  <SelectedTableContent
                    locationPathname={location.pathname}
                    selectedTable={selectedTable}
                    tenantId={tenantId}
                    selectedFinca={selectedFinca}
                    selectedNucleo={selectedNucleo}
                    fincasList={fincasList}
                    modules={modules}
                    loadingModules={loadingModules}
                    onSelectTable={handleSelectTable}
                    setSelectedTable={setSelectedTable}
                  />
                  
                </div>
                </main>
              </div>
            } />
          </Routes>
        )}
      </GlobalSelectorsProvider>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

// Force Vite reload