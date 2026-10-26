import React from 'react';
import Dashboard from '../components/Dashboard';
import DynamicCatalog from '../components/DynamicCatalog';
import PhytosanitaryLibrary from '../components/Agriculture/PhytosanitaryLibrary';
import ApplicationPlanner from '../components/Agriculture/ApplicationPlanner';
import RecipeManager from '../components/Agriculture/RecipeManager';
import SmartPrescriptionApp from '../components/Agriculture/SmartPrescriptionApp';
import ApplicationExecution from '../components/Agriculture/ApplicationExecution';
import DashboardAplicaciones from '../components/Agriculture/DashboardAplicaciones';
import ConsultaAplicaciones from '../components/Agriculture/ConsultaAplicaciones';
import CentroMezclas from '../components/Agriculture/CentroMezclas';
import BioFabrica from '../components/Agriculture/BioFabrica';
import AtecDashboard from '../components/Agriculture/AtecDashboard';
import HerramientasAcuicolaDashboard from '../components/Agriculture/Herramientas/HerramientasAcuicolaDashboard';
import ClimateDashboard from '../components/Agriculture/ClimateDashboard';
import ComercialDashboard from '../components/Commercialization/ComercialDashboard';
import CultivosDashboard from '../components/Agriculture/CultivosDashboard';
import CultivosAdvancedDashboard from '../components/Agriculture/CultivosAdvancedDashboard';
import CatalogoLotes from '../components/Produccion/CatalogoLotes';
import AcuicolaDashboard from '../components/Agriculture/AcuicolaDashboard';
import AcuicolaProgramador from '../components/Agriculture/AcuicolaProgramador';
import AcuicolaMolino from '../components/Agriculture/AcuicolaMolino';
import AcuicolaMolinoMantenimiento from '../components/Agriculture/AcuicolaMolinoMantenimiento';
import AcuicolaHistoricoCosechas from '../components/Agriculture/AcuicolaHistoricoCosechas';
import AcuicolaCosechasMobile from '../components/Agriculture/AcuicolaCosechasMobile';
import AsistenteAcuicolaCampesino from '../components/Acuicola/AsistenteAcuicolaCampesino';
import CosechasAvanzado from '../components/Agriculture/CosechasAvanzado';
import ConfiguracionBasculas from '../components/Basculas/ConfiguracionBasculas';
import PruebasBasculas from '../components/Basculas/PruebasBasculas';
import SatelliteCommandCenter from '../components/SatelliteCommandCenter';
import SatelliteMonitor from '../components/SatelliteMonitor';
import MuestreoSuelosManager from '../components/Precision/MuestreoSuelosManager';
import SensoresIoTManager from '../components/Precision/SensoresIoTManager';
import RiegoPrecisionManager from '../components/Precision/RiegoPrecisionManager';
import VRAPrescripcionManager from '../components/Precision/VRAPrescripcionManager';
import RendimientoROIManager from '../components/Precision/RendimientoROIManager';
import GPSTracker from '../components/GPSTracker';
import SaludArboles from '../components/TreeManager';
import CentralVerificacion from '../components/CentralVerificacion';
import TaskPlanner from '../components/TaskPlanner';
import PayrollDashboard from '../components/Payroll/PayrollDashboard';
import RRHHDashboard from '../components/Payroll/RRHHDashboard';
import RRHHUbicacionPersonal from '../components/Payroll/RRHHUbicacionPersonal';
import InventarioSaldosReport from '../components/Inventory/InventarioSaldosReport';
import InventarioMovimientosReport from '../components/Inventory/InventarioMovimientosReport';
import LaboresReport from '../components/Payroll/LaboresReport';
import AuditoriaCostosDashboard from '../components/Payroll/AuditoriaCostosDashboard';
import EmployeesGrid from '../components/Payroll/EmployeesGrid';
import ContractsGrid from '../components/Payroll/ContractsGrid';
import AttendanceTracker from '../components/Payroll/AttendanceTracker';
import LaborBoard from '../components/Payroll/LaborBoard';
import SiembrasManager from '../components/Agriculture/SiembrasManager';
import PresupuestosSiembraManager from '../components/Agriculture/PresupuestosSiembraManager';
import SiembraArbolesManager from '../components/Agriculture/SiembraArbolesManager';
import TrazabilidadProducto from '../components/Agriculture/TrazabilidadProducto';
import ConceptosNomina from '../components/Payroll/ConceptosNomina';
import CatalogoLabores from '../components/Payroll/CatalogoLabores';
import CatalogoCuadrillas from '../components/Payroll/CatalogoCuadrillas';
import HistorialCuadrillas from '../components/Payroll/HistorialCuadrillas';
import PlanillasManuales from '../components/Payroll/PlanillasManuales';
import PlanillaConsultas from '../components/Payroll/PlanillaConsultas';
import HojasDeVida from '../components/Payroll/HojasDeVida';
import ControlPermisos from '../components/Payroll/ControlPermisos';
import ProgramadorVacaciones from '../components/Payroll/ProgramadorVacaciones';
import ControlContratos from '../components/Payroll/ControlContratos';
import GeneradorNomina from '../components/Payroll/GeneradorNomina';
import NominaDianDashboard from '../components/Payroll/NominaDianDashboard';
import DistribucionContable from '../components/Payroll/DistribucionContable';
import UnicidadReglasAdmin from '../components/UnicidadReglasAdmin';
import ViveroDashboard from '../components/Vivero/ViveroDashboard';
import InventarioCamadas from '../components/Vivero/InventarioCamadas';
import BodegasDashboard from '../components/Inventory/BodegasDashboard';
import BodegasTab from '../components/Sistemas/BodegasTab';
import KardexDashboard from '../components/Inventory/KardexDashboard';
import TomaFisicaDashboard from '../components/Inventory/TomaFisicaDashboard';
import RequisicionesDashboard from '../components/Inventory/RequisicionesDashboard';
import CustodiaRepuestosDashboard from '../components/Inventory/CustodiaRepuestosDashboard';
import TallerMasterDashboard from '../components/Inventory/TallerMasterDashboard';
import TallerOrdenes from '../components/Inventory/TallerOrdenes';
import TallerCombustible from '../components/Inventory/TallerCombustible';
import TallerChecklists from '../components/Inventory/TallerChecklists';
import TallerHerramientas from '../components/Inventory/TallerHerramientas';
import DronesDashboard from '../components/Drones/DronesDashboard';
import OrdenCompraCapturer from '../components/Bodegas/OrdenCompraCapturer';
import RecepcionMercancia from '../components/Bodegas/RecepcionMercancia';
import SalidasMercancia from '../components/Bodegas/SalidasMercancia';
import ComprasDashboard from '../components/Bodegas/ComprasDashboard';
import AnalisisCompras from '../components/Bodegas/AnalisisCompras';
import ValidadorCompras from '../components/Bodegas/ValidadorCompras';
import ProgramadorCompras from '../components/Bodegas/ProgramadorCompras';
import JefeCuadrillaApp from '../components/Payroll/JefeCuadrillaApp';
import EmpleadoApp from '../components/Payroll/EmpleadoApp';
import CRMDashboard from '../components/CRM/CRMDashboard';
import ExecutiveDashboard from '../components/ExecutiveDashboard';
import AccountingConfig from '../components/Contabilidad_y_Finanzas/AccountingConfig';
import CarteraDashboard from '../components/Cartera/CarteraDashboard';
import FinanzasDashboard from '../components/Contabilidad_y_Finanzas/FinanzasDashboard';
import RentabilidadLote from '../components/Contabilidad_y_Finanzas/RentabilidadLote';
import AuditoriaExogena from '../components/Contabilidad_y_Finanzas/AuditoriaExogena';
import CertificadosRetencion from '../components/Contabilidad_y_Finanzas/CertificadosRetencion';
import ConciliacionFiscal from '../components/Contabilidad_y_Finanzas/ConciliacionFiscal';
import DashboardGanadero from '../components/Ganado/DashboardGanadero';
import AsistenteGanaderoCampesino from '../components/Ganado/AsistenteGanaderoCampesino';
import CalendarioZoosanitario from '../components/Ganado/CalendarioZoosanitario';
import ComercioGanado from '../components/Ganado/ComercioGanado';
import HerramientasDashboard from '../components/Ganado/Herramientas/HerramientasDashboard';
import ProduccionLeche from '../components/Ganado/ProduccionLeche';
import TableroSatelital from '../components/Ganado/TableroSatelital';
import EstudioFotografico from '../components/Ganado/EstudioFotografico';
import FichaAnimal from '../components/Ganado/FichaAnimal';
import ProgramadorPrenez from '../components/Ganado/ProgramadorPrenez';
import VeterinarioApp from '../components/Mobile/Veterinario/VeterinarioApp';
import TallerApp from '../components/Mobile/Taller/TallerApp';
import CapturadorContable from '../components/Contabilidad_y_Finanzas/CapturadorContable';
import ParametrosContables from '../components/Contabilidad_y_Finanzas/ParametrosContables';
import BalanceComprobacion from '../components/Contabilidad_y_Finanzas/BalanceComprobacion';
import ConsultasContables from '../components/Contabilidad_y_Finanzas/ConsultasContables';
import EstadoResultados from '../components/Contabilidad_y_Finanzas/EstadoResultados';
import BalanceGeneral from '../components/Contabilidad_y_Finanzas/BalanceGeneral';
import BalanceAcumuladoLapsos from '../components/Contabilidad_y_Finanzas/BalanceAcumuladoLapsos';
import EstadoResultadosLapsos from '../components/Contabilidad_y_Finanzas/EstadoResultadosLapsos';
import LibroAuxiliar from '../components/Contabilidad_y_Finanzas/LibroAuxiliar';
import LibroDiario from '../components/Contabilidad_y_Finanzas/LibroDiario';
import LibroMayor from '../components/Contabilidad_y_Finanzas/LibroMayor';
import LibroInventarios from '../components/Contabilidad_y_Finanzas/LibroInventarios';
import ControlConsecutivos from '../components/Contabilidad_y_Finanzas/ControlConsecutivos';
import RastroAuditoria from '../components/Contabilidad_y_Finanzas/RastroAuditoria';
import ConciliacionBancaria from '../components/Contabilidad_y_Finanzas/ConciliacionBancaria';
import CostosProduccion from '../components/Contabilidad_y_Finanzas/CostosProduccion';
import ActivosBiologicos from '../components/Contabilidad_y_Finanzas/ActivosBiologicos';
import ExogenaDian from '../components/Contabilidad_y_Finanzas/ExogenaDian';
import FlujoEfectivo from '../components/Contabilidad_y_Finanzas/FlujoEfectivo';
import CambiosPatrimonio from '../components/Contabilidad_y_Finanzas/CambiosPatrimonio';
import DashboardGerencial from '../components/Contabilidad_y_Finanzas/DashboardGerencial';
import MotorContable from '../components/Contabilidad_y_Finanzas/MotorContable';
import WaterManagement from '../pages/WaterManagement';

/**
 * Renderiza el contenido según el `selectedTable` activo.
 * Extraído de src/App.jsx para reducir el monolito del layout principal.
 * Referencias cruzadas (ruta directa + tabla) como PhytosanitaryLibrary,
 * ApplicationPlanner, TaskPlanner, etc., se resuelven aquí porque también
 * se ofrecen desde el menú lateral (selectedTable).
 */
export default function SelectedTableContent({
  locationPathname,
  selectedTable,
  tenantId,
  selectedFinca,
  selectedNucleo,
  fincasList,
  modules,
  loadingModules,
  onSelectTable,
  setSelectedTable,
}) {
  if (locationPathname !== '/') return null;

  return (
(selectedTable === 'saldos_bodega' || selectedTable === 'inv_existencias') ? (
      <InventarioSaldosReport tenantId={tenantId} />
    ) : selectedTable === 'movimientos_inventario' ? (
      <InventarioMovimientosReport tenantId={tenantId} />
    ) : selectedTable === 'lotes' ? (
      <CatalogoLotes tenantId={tenantId} selectedFinca={selectedFinca} selectedNucleo={selectedNucleo} />
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
    ) : selectedTable === 'acuicola_asistencia' ? (
      <AsistenteAcuicolaCampesino fincaId={selectedFinca} />
    ) : selectedTable === 'cosechas' ? (
      <CosechasAvanzado tenantId={tenantId} />
    ) : selectedTable === 'basculas-config' ? (
      <ConfiguracionBasculas tenantId={tenantId} onSelectTable={setSelectedTable} />
    ) : selectedTable === 'basculas-pruebas' ? (
      <PruebasBasculas tenantId={tenantId} />
    ) : selectedTable === 'muestreo-suelos' ? (
      <MuestreoSuelosManager />
    ) : selectedTable === 'sensores-suelo' ? (
      <SensoresIoTManager />
    ) : selectedTable === 'riego-precision' ? (
      <RiegoPrecisionManager />
    ) : selectedTable === 'vra-prescripciones' ? (
      <VRAPrescripcionManager />
    ) : selectedTable === 'rendimiento-roi' ? (
      <RendimientoROIManager />
    ) : selectedTable === 'satellite-monitor' ? (
      <SatelliteCommandCenter tenantId={tenantId} onOpenConfig={() => onSelectTable && onSelectTable('satellite-config')} />
    ) : selectedTable === 'satellite-config' ? (
      <SatelliteMonitor />
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
    ) : selectedTable === 'bodegas' ? (
      <BodegasTab tenantId={tenantId} />
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
    ) : selectedTable === 'drones-dashboard' ? (
      <DronesDashboard tenantId={tenantId} />
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
    ) : selectedTable === 'ph_ganado_asistencia' ? (
      <AsistenteGanaderoCampesino fincaId={selectedFinca} />
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
    ) : selectedTable === 'agua' ? (
      <WaterManagement tenantId={tenantId} fincaId={selectedFinca} nucleoId={selectedNucleo} />
    ) : selectedTable === 'trazabilidad_producto' ? (
      <TrazabilidadProducto tenantId={tenantId} fincaId={selectedFinca} nucleoId={selectedNucleo} />
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
        onSelectTable={onSelectTable}
        tenantId={tenantId}
        fincaId={selectedFinca}
        nucleoId={selectedNucleo}
      />
    )
  );
}