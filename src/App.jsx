import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GlobalSelectorsProvider } from './context/GlobalSelectorsContext.jsx';
import { useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import WaterManagement from './pages/WaterManagement.jsx';
import RegisterPage from './components/RegisterPage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DynamicCatalog from './components/DynamicCatalog';
import PhytosanitaryLibrary from './components/Agriculture/PhytosanitaryLibrary';
import ApplicationPlanner from './components/Agriculture/ApplicationPlanner';
import RecipeManager from './components/Agriculture/RecipeManager';
import SmartPrescriptionApp from './components/Agriculture/SmartPrescriptionApp';
import ApplicationExecution from './components/Agriculture/ApplicationExecution';
import DashboardAplicaciones from './components/Agriculture/DashboardAplicaciones';
import ConsultaAplicaciones from './components/Agriculture/ConsultaAplicaciones';
import CentroMezclas from './components/Agriculture/CentroMezclas';
import BioFabrica from './components/Agriculture/BioFabrica';
import AtecDashboard from './components/Agriculture/AtecDashboard';
import AcuicolaCatalogos from './components/Agriculture/AcuicolaCatalogos';
import HerramientasAcuicolaDashboard from './components/Agriculture/Herramientas/HerramientasAcuicolaDashboard';
import ClimateDashboard from './components/Agriculture/ClimateDashboard';
import ComercialDashboard from './components/Commercialization/ComercialDashboard';
import CultivosDashboard from './components/Agriculture/CultivosDashboard';
import CultivosAdvancedDashboard from './components/Agriculture/CultivosAdvancedDashboard';
import OrdenCompraCapturer from './components/Bodegas/OrdenCompraCapturer';
import RecepcionMercancia from './components/Bodegas/RecepcionMercancia';
import FormCosecha from './pages/Harvest/FormCosecha.jsx';
import CosechasDashboard from './pages/Harvest/CosechasDashboard.jsx';
import CosechasImport from './pages/Harvest/CosechasImport.jsx';
import AnalisisCompras from './components/Bodegas/AnalisisCompras';
import ValidadorCompras from './components/Bodegas/ValidadorCompras';
import ProgramadorCompras from './components/Bodegas/ProgramadorCompras';
import ComprasDashboard from './components/Bodegas/ComprasDashboard';
import SalidasMercancia from './components/Bodegas/SalidasMercancia';
import SolicitudCompraModal from './components/Bodegas/SolicitudCompraModal';
import ConfiguracionAlertas from './components/ConfiguracionAlertas';
import BodegasDashboard from './components/Inventory/BodegasDashboard';
import AcuicolaMolinoMantenimiento from './components/Agriculture/AcuicolaMolinoMantenimiento';

import VeterinarioApp from './components/Mobile/Veterinario/VeterinarioApp';
import TallerApp from './components/Mobile/Taller/TallerApp';


import RequisicionesDashboard from './components/Inventory/RequisicionesDashboard';
import CustodiaRepuestosDashboard from './components/Inventory/CustodiaRepuestosDashboard';
import TallerMasterDashboard from './components/Inventory/TallerMasterDashboard';
import TallerOrdenes from './components/Inventory/TallerOrdenes';
import TallerCombustible from './components/Inventory/TallerCombustible';
import TallerChecklists from './components/Inventory/TallerChecklists';
import TallerHerramientas from './components/Inventory/TallerHerramientas';
import ProgramadorPrenez from './components/Ganado/ProgramadorPrenez';
import JefeCuadrillaApp from './components/Payroll/JefeCuadrillaApp';
import EmpleadoApp from './components/Payroll/EmpleadoApp';
import CapturadorContable from './components/Contabilidad_y_Finanzas/CapturadorContable';
import ParametrosContables from './components/Contabilidad_y_Finanzas/ParametrosContables';
import ExecutiveDashboard from './components/ExecutiveDashboard';
import AccountingConfig from './components/Contabilidad_y_Finanzas/AccountingConfig';
import PaymentCapturer from './components/Cartera/PaymentCapturer';
import AccountStatement from './components/Cartera/AccountStatement';
import CarteraDashboard from './components/Cartera/CarteraDashboard';
import PrestamoCapturer from './components/Cartera/PrestamoCapturer';
import FinanzasDashboard from './components/Contabilidad_y_Finanzas/FinanzasDashboard';
import RentabilidadLote from './components/Contabilidad_y_Finanzas/RentabilidadLote';
import AuditoriaExogena from './components/Contabilidad_y_Finanzas/AuditoriaExogena';
import CertificadosRetencion from './components/Contabilidad_y_Finanzas/CertificadosRetencion';

import FichaAnimal from './components/Ganado/FichaAnimal';
import DashboardGanadero from './components/Ganado/DashboardGanadero';
import CalendarioZoosanitario from './components/Ganado/CalendarioZoosanitario';
import ComercioGanado from './components/Ganado/ComercioGanado';
import HerramientasDashboard from './components/Ganado/Herramientas/HerramientasDashboard';
import ProduccionLeche from './components/Ganado/ProduccionLeche';
import TableroSatelital from './components/Ganado/TableroSatelital';
import EstudioFotografico from './components/Ganado/EstudioFotografico';


import SatelliteMonitor from './components/SatelliteMonitor';
import TrasladosBodegas from './components/TrasladosBodegas';
import SatelliteCommandCenter from './components/SatelliteCommandCenter';
import GPSTracker from './components/GPSTracker';
import AppHeader from './components/AppHeader';
import TaskPlanner from './components/TaskPlanner';
import CentralVerificacion from './components/CentralVerificacion';
import SemilleroDashboard from './components/SemilleroDashboard';
import SaludArboles from './components/TreeManager';
import PayrollDashboard from './components/Payroll/PayrollDashboard';
import RRHHDashboard from './components/Payroll/RRHHDashboard';
import RRHHUbicacionPersonal from './components/Payroll/RRHHUbicacionPersonal';
import InventarioSaldosReport from './components/Inventory/InventarioSaldosReport';
import InventarioMovimientosReport from './components/Inventory/InventarioMovimientosReport';
import LaboresReport from './components/Payroll/LaboresReport';
import AuditoriaCostosDashboard from './components/Payroll/AuditoriaCostosDashboard';
import EmployeesGrid from './components/Payroll/EmployeesGrid';
import ContractsGrid from './components/Payroll/ContractsGrid';
import AttendanceTracker from './components/Payroll/AttendanceTracker';
import LaborBoard from './components/Payroll/LaborBoard';
import ConceptosNomina from './components/Payroll/ConceptosNomina';
import PlanillaConsultas from './components/Payroll/PlanillaConsultas';
import HojasDeVida from './components/Payroll/HojasDeVida';
import ControlPermisos from './components/Payroll/ControlPermisos';
import ProgramadorVacaciones from './components/Payroll/ProgramadorVacaciones';
import PagosNomina from './components/Payroll/PagosNomina';
import ControlContratos from './components/Payroll/ControlContratos';
import CatalogoLabores from './components/Payroll/CatalogoLabores';
import CatalogoCuadrillas from './components/Payroll/CatalogoCuadrillas';
import HistorialCuadrillas from './components/Payroll/HistorialCuadrillas';
import PlanillasManuales from './components/Payroll/PlanillasManuales';
import ConfiguracionBasculas from './components/Basculas/ConfiguracionBasculas';
import PruebasBasculas from './components/Basculas/PruebasBasculas';
import GeneradorNomina from './components/Payroll/GeneradorNomina';
import NominaDianDashboard from './components/Payroll/NominaDianDashboard';
import ViveroDashboard from './components/Vivero/ViveroDashboard';
import InventarioCamadas from './components/Vivero/InventarioCamadas';
import KardexDashboard from './components/Inventory/KardexDashboard';
import TomaFisicaDashboard from './components/Inventory/TomaFisicaDashboard';


import BalanceComprobacion from './components/Contabilidad_y_Finanzas/BalanceComprobacion';
import ConsultasContables from './components/Contabilidad_y_Finanzas/ConsultasContables';
import EstadoResultados from './components/Contabilidad_y_Finanzas/EstadoResultados';
import BalanceGeneral from './components/Contabilidad_y_Finanzas/BalanceGeneral';
import BalanceAcumuladoLapsos from './components/Contabilidad_y_Finanzas/BalanceAcumuladoLapsos';
import EstadoResultadosLapsos from './components/Contabilidad_y_Finanzas/EstadoResultadosLapsos';
import LibroAuxiliar from './components/Contabilidad_y_Finanzas/LibroAuxiliar';
import LibroDiario from './components/Contabilidad_y_Finanzas/LibroDiario';
import LibroMayor from './components/Contabilidad_y_Finanzas/LibroMayor';
import LibroInventarios from './components/Contabilidad_y_Finanzas/LibroInventarios';
import ControlConsecutivos from './components/Contabilidad_y_Finanzas/ControlConsecutivos';
import RastroAuditoria from './components/Contabilidad_y_Finanzas/RastroAuditoria';
import ConciliacionBancaria from './components/Contabilidad_y_Finanzas/ConciliacionBancaria';
import CostosProduccion from './components/Contabilidad_y_Finanzas/CostosProduccion';
import ActivosBiologicos from './components/Contabilidad_y_Finanzas/ActivosBiologicos';
import ExogenaDian from './components/Contabilidad_y_Finanzas/ExogenaDian';
import ConciliacionFiscal from './components/Contabilidad_y_Finanzas/ConciliacionFiscal';
import FlujoEfectivo from './components/Contabilidad_y_Finanzas/FlujoEfectivo';
import CambiosPatrimonio from './components/Contabilidad_y_Finanzas/CambiosPatrimonio';
import DashboardGerencial from './components/Contabilidad_y_Finanzas/DashboardGerencial';
import MotorContable from './components/Contabilidad_y_Finanzas/MotorContable';
import TenantManager from './components/Sistemas/TenantManager';
import GlobalStats from './components/Sistemas/GlobalStats';
import AuditoriaFincaDetalle from './components/Sistemas/AuditoriaFincaDetalle';
import DistribucionContable from './components/Payroll/DistribucionContable';
import UnicidadReglasAdmin from './components/UnicidadReglasAdmin';
import CRMDashboard from './components/CRM/CRMDashboard';
import AcuicolaDashboard from './components/Agriculture/AcuicolaDashboard';
import AcuicolaProgramador from './components/Agriculture/AcuicolaProgramador';
import AcuicolaMolino from './components/Agriculture/AcuicolaMolino';
import AcuicolaCosechasMobile from './components/Agriculture/AcuicolaCosechasMobile';
import AcuicolaHistoricoCosechas from './components/Agriculture/AcuicolaHistoricoCosechas';
import SiembrasManager from './components/Agriculture/SiembrasManager';
import PresupuestosSiembraManager from './components/Agriculture/PresupuestosSiembraManager';
import SiembraArbolesManager from './components/Agriculture/SiembraArbolesManager';
import { fetchModules, fetchTableData } from './utils/api';
import LogoUploader from './components/LogoUploader';

function AppContent() {
  const { user, loading, logout, tenantId, permisos } = useAuth();
  const publicEmployeePortal = window.location.pathname.startsWith('/portal/empleado');
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(window.innerWidth > 768);
  const [selectedTable, setSelectedTable] = React.useState(null);
  const [modules, setModules] = React.useState(null);
  const [loadingModules, setLoadingModules] = React.useState(true);
  const [globalSolicitudModal, setGlobalSolicitudModal] = React.useState(false);

  // Clear selectedTable when navigating to system management routes to avoid unwanted dashboard rendering
  React.useEffect(() => {
    if (location.pathname.startsWith('/sistemas')) {
      setSelectedTable(null);
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
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const handleNavigateHome = () => {
    setSelectedTable(null);
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
                    <Route path="/sistemas/stats" element={<GlobalStats />} />
                    <Route path="/sistemas/auditoria-finca" element={<AuditoriaFincaDetalle />} />
                    <Route path="/satelite" element={<SatelliteMonitor />} />
                    <Route path="/agricultura/biblioteca" element={<PhytosanitaryLibrary />} />
                    <Route path="/agricultura/programador" element={<ApplicationPlanner />} />
                    <Route path="/inventario/traslados-bodegas" element={<TrasladosBodegas />} />
                    <Route path="/agricultura/recetario" element={<RecipeManager />} />
                    <Route path="/agricultura/recetario-inteligente" element={<SmartPrescriptionApp />} />
                    <Route path="/agricultura/ejecucion" element={<ApplicationExecution />} />
                    <Route path="/labores" element={<TaskPlanner tenantId={tenantId} fincaId={selectedFinca} nucleoId={selectedNucleo} />} />
                    <Route path="/rrhh/ubicacion" element={<RRHHUbicacionPersonal tenantId={tenantId} fincaId={selectedFinca} />} />
                  </Routes>
                  {location.pathname === '/' && (
                    (selectedTable === 'saldos_bodega' || selectedTable === 'inv_existencias') ? (
                      <InventarioSaldosReport tenantId={tenantId} />
                  ) : selectedTable === 'movimientos_inventario' ? (
                    <InventarioMovimientosReport tenantId={tenantId} />
                  ) : selectedTable === 'agricultura_biblioteca' ? (
                    <PhytosanitaryLibrary />
                  ) : selectedTable === 'agricultura_programador' ? (
                    <ApplicationPlanner />
                  ) : selectedTable === 'agricultura_recetario' ? (
                    <RecipeManager />
                  ) : selectedTable === 'agricultura_recetario_inteligente' ? (
                    <SmartPrescriptionApp />
                  ) : selectedTable === 'agricultura_ejecucion' ? (
                    <ApplicationExecution />
                  ) : selectedTable === 'comercial-dashboard' ? (
                    <ComercialDashboard tenantId={tenantId} />
                  ) : selectedTable === 'atec-dashboard' ? (
                    <AtecDashboard tenantId={tenantId} fincaId={selectedFinca} />
                  ) : selectedTable === 'cultivos-dashboard' ? (
                    <CultivosDashboard tenantId={tenantId} />
                  ) : selectedTable === 'app_produccion_organica' ? (
                    <BioFabrica tenantId={tenantId} />
                  ) : selectedTable === 'app_preparaciones_mezcla' ? (
                    <CentroMezclas tenantId={tenantId} />
                  ) : selectedTable === 'dashboard_aplicaciones' ? (
                    <DashboardAplicaciones tenantId={tenantId} />
                  ) : selectedTable === 'registro_aplicaciones' ? (
                    <ConsultaAplicaciones />
                  ) : selectedTable === 'control_plagas' ? (
                    <DynamicCatalog tenantId={tenantId} tableName="control_plagas" />
                  ) : selectedTable === 'app_programacion' ? (
                    <DynamicCatalog tenantId={tenantId} tableName="app_programacion" />
                  ) : selectedTable === 'app_programacion_insumos' ? (
                    <DynamicCatalog tenantId={tenantId} tableName="app_programacion_insumos" />
                  ) : selectedTable === 'app_control_envases' ? (
                    <DynamicCatalog tenantId={tenantId} tableName="app_control_envases" />
                  ) : selectedTable === 'costos_operacion' ? (
                    <DynamicCatalog tenantId={tenantId} tableName="costos_operacion" />
                  ) : selectedTable === 'cultivos-avanzado' ? (
                    <CultivosAdvancedDashboard />
                  ) : selectedTable === 'clima-dashboard' ? (
                    <ClimateDashboard tenantId={tenantId} />
                  ) : selectedTable === 'acuicola-dashboard' ? (
                    <AcuicolaDashboard />
                  ) : selectedTable === 'acuicola_programador' ? (
                    <AcuicolaProgramador tenantId={tenantId} />
                  ) : selectedTable === 'acuicola_molino' ? (
                    <AcuicolaMolino tenantId={tenantId} />
                  ) : selectedTable === 'acuicola_molino_mantenimiento' ? (
                    <AcuicolaMolinoMantenimiento tenantId={tenantId} />
                  ) : selectedTable === 'acuicola_cosechas_historico' ? (
                    <AcuicolaHistoricoCosechas tenantId={tenantId} />
                  ) : selectedTable === 'acuicola_cosechas' ? (
                    <AcuicolaCosechasMobile tenantId={tenantId} />
                  ) : selectedTable === 'basculas-config' ? (
                    <ConfiguracionBasculas tenantId={tenantId} onSelectTable={setSelectedTable} />
                  ) : selectedTable === 'basculas-pruebas' ? (
                    <PruebasBasculas tenantId={tenantId} />
                  ) : selectedTable === 'satellite-monitor' ? (
                    <SatelliteCommandCenter />
                  ) : selectedTable === 'gps-tracker' ? (
                    <GPSTracker tenantId={tenantId} fincaId={selectedFinca} nucleoId={selectedNucleo} />
                  ) : selectedTable === 'salud_arboles' ? (
                    <SaludArboles tenantId={tenantId} fincaId={selectedFinca} nucleoId={selectedNucleo} />
                  ) : selectedTable === 'central-verificacion' ? (
                    <CentralVerificacion tenantId={tenantId} />
                  ) : selectedTable === 'task-planner' ? (
                    <TaskPlanner tenantId={tenantId} fincaId={selectedFinca} nucleoId={selectedNucleo} />
                  ) : selectedTable === 'payroll-dashboard' ? (
                    <PayrollDashboard tenantId={tenantId} />
                  ) : selectedTable === 'rrhh-dashboard' ? (
                    <RRHHDashboard tenantId={tenantId} />
                  ) : selectedTable === 'rrhh_ubicacion_personal' ? (
                    <RRHHUbicacionPersonal tenantId={tenantId} fincaId={selectedFinca} />
                  ) : selectedTable === 'labores-report' ? (
                    <LaboresReport tenantId={tenantId} />
                  ) : selectedTable === 'auditoria_costos' ? (
                    <AuditoriaCostosDashboard tenantId={tenantId} />
                  ) : selectedTable === 'employees' ? (
                    <EmployeesGrid tenantId={tenantId} />
                  ) : selectedTable === 'contracts' ? (
                    <ContractsGrid tenantId={tenantId} />
                  ) : selectedTable === 'attendance' ? (
                    <AttendanceTracker tenantId={tenantId} />
                  ) : selectedTable === 'labores' ? (
                    <LaborBoard tenantId={tenantId} />
                  ) : selectedTable === 'siembras' ? (
                    <SiembrasManager />
                  ) : selectedTable === 'presupuestos_siembra' ? (
                    <PresupuestosSiembraManager />
                  ) : selectedTable === 'siembra_arboles' ? (
                    <SiembraArbolesManager />
                  ) : selectedTable === 'rrhh_conceptos' ? (
                    <ConceptosNomina />
                  ) : selectedTable === 'rrhh_catalogo_labores' ? (
                    <CatalogoLabores tenantId={tenantId} />
                  ) : selectedTable === 'rrhh_catalogo_cuadrillas' ? (
                    <CatalogoCuadrillas />
                  ) : selectedTable === 'rrhh_historial_cuadrillas' ? (
                    <HistorialCuadrillas />
                  ) : selectedTable === 'rrhh_planillas_manuales' ? (
                    <PlanillasManuales tenantId={tenantId} fincaId={selectedFinca} />
                  ) : selectedTable === 'rrhh_historial' ? (
                    <PlanillaConsultas tenantId={tenantId} fincaId={selectedFinca} />
                  ) : selectedTable === 'rrhh_hojas_vida' ? (
                    <HojasDeVida tenantId={tenantId} />
                  ) : selectedTable === 'rrhh_permisos' ? (
                    <ControlPermisos tenantId={tenantId} />
                  ) : selectedTable === 'rrhh_vacaciones' ? (
                    <ProgramadorVacaciones tenantId={tenantId} />
                  ) : selectedTable === 'rrhh_contratos' ? (
                    <ControlContratos tenantId={tenantId} fincaId={selectedFinca} />
                  ) : selectedTable === 'rrhh_generador_nomina' ? (
                    <GeneradorNomina tenantId={tenantId} fincaId={selectedFinca} />
                  ) : selectedTable === 'rrhh_dian' ? (
                    <NominaDianDashboard tenantId={tenantId} />
                  ) : selectedTable === 'rrhh_parametros' ? (
                    <DistribucionContable tenantId={tenantId} />
                  ) : selectedTable === 'unicidad-reglas' ? (
                    <UnicidadReglasAdmin />
                  ) : selectedTable === 'vivero-dashboard' ? (
                    <ViveroDashboard tenantId={tenantId} />
                  ) : selectedTable === 'inventario-camadas' ? (
                    <InventarioCamadas tenantId={tenantId} />
                  ) : selectedTable === 'bodegas-dashboard' ? (
                    <BodegasDashboard tenantId={tenantId} />
                  ) : selectedTable === 'kardex-dashboard' ? (
                    <KardexDashboard tenantId={tenantId} />
                  ) : selectedTable === 'toma_fisica' ? (
                    <TomaFisicaDashboard tenantId={tenantId} />
                  ) : selectedTable === 'inv_pedidos' ? (
                    <RequisicionesDashboard tenantId={tenantId} />
                  ) : selectedTable === 'inv_repuestos_cambiados' ? (
                    <CustodiaRepuestosDashboard tenantId={tenantId} />
                  ) : selectedTable === 'taller-master' ? (
                    <TallerMasterDashboard tenantId={tenantId} />
                  ) : selectedTable === 'taller-ordenes' ? (
                    <TallerOrdenes tenantId={tenantId} />
                  ) : selectedTable === 'taller-combustible' ? (
                    <TallerCombustible tenantId={tenantId} />
                  ) : selectedTable === 'taller-checklists' ? (
                    <TallerChecklists tenantId={tenantId} />
                  ) : selectedTable === 'taller-herramientas' ? (
                    <TallerHerramientas tenantId={tenantId} />
                  ) : selectedTable === 'orden-compra-capturer' ? (
                    <OrdenCompraCapturer tenantId={tenantId} />
                  ) : selectedTable === 'recepcion-mercancia' ? (
                    <RecepcionMercancia tenantId={tenantId} fincaId={selectedFinca} />
                  ) : selectedTable === 'salidas_mercancia' ? (
                    <SalidasMercancia tenantId={tenantId} fincaId={selectedFinca} />
                  ) : selectedTable === 'compras-dashboard' ? (
                    <ComprasDashboard tenantId={tenantId} />
                  ) : selectedTable === 'analisis-compras' ? (
                    <AnalisisCompras tenantId={tenantId} />
                  ) : (selectedTable === 'validador-compras' || selectedTable === 'solicitudes_pedido') ? (
                    <ValidadorCompras tenantId={tenantId} />
                  ) : selectedTable === 'programador-compras' ? (
                    <ProgramadorCompras tenantId={tenantId} />
                  ) : selectedTable === 'jefe-cuadrilla-mobile' ? (
                    <JefeCuadrillaApp tenantId={tenantId} />
                  ) : selectedTable === 'app-empleado-mobile' ? (
                    <EmpleadoApp tenantId={tenantId} />
                  ) : selectedTable === 'crm-dashboard' ? (
                    <CRMDashboard tenantId={tenantId} />
                  ) : selectedTable === 'dashboard-gerencial' ? (
                    <ExecutiveDashboard tenantId={tenantId} fincaId={selectedFinca} />
                  ) : selectedTable === 'configuracion-contable' ? (
                    <AccountingConfig tenantId={tenantId} />
                  ) : selectedTable === 'finanzas' ? (
                    <FinanzasDashboard tenantId={tenantId} />
                  ) : selectedTable === 'ph_rentabilidad_lote' ? (
                    <RentabilidadLote />
                  ) : selectedTable === 'ph_exogena_dian' ? (
                    <AuditoriaExogena />
                  ) : selectedTable === 'ph_cert_retencion' ? (
                    <CertificadosRetencion />
                  ) : selectedTable === 'ph_conciliacion_fiscal' ? (
                    <ConciliacionFiscal />
                  ) : selectedTable === 'ph_ganado_dashboard' ? (
                    <DashboardGanadero fincaId={selectedFinca} />
                  ) : selectedTable === 'acuicola_herramientas' ? (
                    <HerramientasAcuicolaDashboard fincaId={selectedFinca} />
                  ) : selectedTable === 'ph_ganado_satelital' ? (
                    <TableroSatelital fincaId={selectedFinca} fincas={fincasList} />
                  ) : selectedTable === 'ph_ganado_ficha' ? (
                    <FichaAnimal fincaId={selectedFinca} />
                  ) : selectedTable === 'ph_ganado_estudio' ? (
                    <EstudioFotografico />
                  ) : selectedTable === 'ph_ganado_reproduccion' ? (
                    <ProgramadorPrenez fincaId={selectedFinca} />
                  ) : selectedTable === 'ph_ganado_comercio' ? (
                    <ComercioGanado fincaId={selectedFinca} />
                  ) : selectedTable === 'ph_ganado_leche' ? (
                    <ProduccionLeche fincaId={selectedFinca} />
                  ) : selectedTable === 'ph_ganado_zoosanitario' ? (
                    <CalendarioZoosanitario fincaId={selectedFinca} />
                  ) : selectedTable === 'ph_ganado_herramientas' ? (
                    <HerramientasDashboard fincaId={selectedFinca} />
                  ) : selectedTable === 'app_veterinario' ? (
                    <VeterinarioApp tenantId={tenantId} fincaId={selectedFinca} />
                  ) : selectedTable === 'app_taller' ? (
                    <TallerApp tenantId={tenantId} />
                  ) : selectedTable === 'contabilidad_capturador' ? (
                    <CapturadorContable tenantId={tenantId} />
                  ) : selectedTable === 'contabilidad_parametros' ? (
                    <ParametrosContables />
                  ) : selectedTable === 'contabilidad_balance' ? (
                    <BalanceComprobacion tenantId={tenantId} />
                  ) : selectedTable === 'consultas_contables' ? (
                    <ConsultasContables tenantId={tenantId} />
                  ) : selectedTable === 'estado_resultados' ? (
                    <EstadoResultados tenantId={tenantId} />
                  ) : selectedTable === 'balance_general' ? (
                    <BalanceGeneral tenantId={tenantId} />
                  ) : selectedTable === 'balance_acumulado_lapsos' ? (
                    <BalanceAcumuladoLapsos tenantId={tenantId} />
                  ) : selectedTable === 'estado_resultados_lapsos' ? (
                    <EstadoResultadosLapsos tenantId={tenantId} />
                  ) : selectedTable === 'libro_auxiliar' ? (
                    <LibroAuxiliar tenantId={tenantId} />
                  ) : selectedTable === 'libro_diario' ? (
                    <LibroDiario tenantId={tenantId} />
                  ) : selectedTable === 'libro_mayor' ? (
                    <LibroMayor tenantId={tenantId} />
                  ) : selectedTable === 'libro_inventarios' ? (
                    <LibroInventarios tenantId={tenantId} />
                  ) : selectedTable === 'control_consecutivos' ? (
                    <ControlConsecutivos tenantId={tenantId} />
                  ) : selectedTable === 'rastro_auditoria' ? (
                    <RastroAuditoria tenantId={tenantId} />
                  ) : selectedTable === 'conciliacion_bancaria' ? (
                    <ConciliacionBancaria tenantId={tenantId} />
                  ) : selectedTable === 'costos_produccion' ? (
                    <CostosProduccion tenantId={tenantId} />
                  ) : selectedTable === 'activos_biologicos' ? (
                    <ActivosBiologicos tenantId={tenantId} />
                  ) : selectedTable === 'exogena_dian' ? (
                    <ExogenaDian tenantId={tenantId} />
                  ) : selectedTable === 'conciliacion_fiscal' ? (
                    <ConciliacionFiscal tenantId={tenantId} />
                  ) : selectedTable === 'flujo_efectivo' ? (
                    <FlujoEfectivo tenantId={tenantId} />
                  ) : selectedTable === 'cambios_patrimonio' ? (
                    <CambiosPatrimonio tenantId={tenantId} />
                  ) : selectedTable === 'dashboard_gerencial' ? (
                    <DashboardGerencial tenantId={tenantId} />
                  ) : selectedTable === 'motor_contable' ? (
                    <MotorContable tenantId={tenantId} />
                  ) : selectedTable === 'cartera_dashboard' ? (
                    <CarteraDashboard tenantId={tenantId} />
                  ) : selectedTable === 'cartera_pagos' ? (
                    <></>
                  ) : selectedTable ? (
                    <DynamicCatalog
                      tableName={selectedTable}
                      key={selectedTable}
                      tenantId={tenantId}
                      fincaId={selectedFinca}
                      nucleoId={selectedNucleo}
                    />
                    ) : (
                      <Dashboard
                        modules={modules}
                        loading={loadingModules}
                        onSelectTable={handleSelectTable}
                        tenantId={tenantId}
                        fincaId={selectedFinca}
                        nucleoId={selectedNucleo}
                      />
                    )
                  )}
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
