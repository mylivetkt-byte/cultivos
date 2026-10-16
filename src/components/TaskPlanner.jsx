import React, { useState, useEffect } from 'react';
import { 
  fetchLabores, createLabor, autoGenerateLabores, evaluateLabor, sendLaborReport,
  fetchTableData, fetchTrees, authFetch
} from '../utils/api';
import { exportSimulationPdf } from '../utils/exportSimulationPdf';

const CATEGORIES = [
  { value: 'Personal', label: '👥 Personal & Jornales', color: '#6366f1' },
  { value: 'Cultivos', label: '🌱 Manejo de Cultivos', color: '#10b981' },
  { value: 'Lotes', label: '🗺️ Actividades en Lotes', color: '#14b8a6' },
  { value: 'Arboles', label: '🌴 Fitosanitario Árboles', color: '#22c55e' },
  { value: 'Riegos', label: '💧 Irrigación y Humedad', color: '#3b82f6' },
  { value: 'Maquinas_Vehiculos', label: '🚜 Operación Maquinaria', color: '#f59e0b' },
  { value: 'Talleres', label: '🔧 Mantenimiento Talleres', color: '#ec4899' },
  { value: 'Semilleros', label: '🌱 Control en Semilleros', color: '#84cc16' },
  { value: 'Abonos', label: '🍂 Producción de Abonos', color: '#a16207' },
  { value: 'Cosecha', label: '🧺 Recolección & Cosecha', color: '#eab308' }
];

function TaskPlanner({ tenantId, fincaId, nucleoId }) {
  // Tabs & Simulator States
  const [activeTab, setActiveTab] = useState('agenda'); // 'agenda' | 'simulador'
  const [selectedSimulation, setSelectedSimulation] = useState('');
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [tutorialContent, setTutorialContent] = useState(null);

  // Wizard States
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({ 
    fincaId: '', 
    loteId: '',
    cultivo: '', 
    areaHectareas: 5, 
    fechaInicio: new Date().toISOString().split('T')[0] 
  });
  const [fincasList, setFincasList] = useState([]);
  const [lotesList, setLotesList] = useState([]);
  const [cultivosViables, setCultivosViables] = useState([]);
  const [realCosts, setRealCosts] = useState({
    jornal: 45000,
    insumos: 450000,
    maquinaria: 150000,
    gastosVarios: 100000,
    precioMercado: 4500,
    fuenteInsumo: '',
    receta: { jornales: 10, horas_tractor: 0, ciclo_dias: 120 }
  });
  const [loadingCosts, setLoadingCosts] = useState(false);

  // Fetch real Fincas when wizard opens
  useEffect(() => {
    if (showWizard && activeTab === 'simulador') {
      authFetch('/api/simulador/fincas?tenantId=1')
        .then(res => res.json())
        .then(data => {
          if (data && data.fincas) {
            setFincasList(data.fincas);
            setLotesList(data.lotes || []);
            if (data.fincas.length === 0) {
              alert("⚠️ No tienes Fincas registradas en el sistema. Debes crear al menos una Finca para usar el Simulador.");
            }
          } else if (Array.isArray(data)) {
            setFincasList(data);
          }
        })
        .catch(err => {
          console.error('Error fetching fincas:', err);
          alert("Error de conexión al cargar las Fincas.");
        });
    }
  }, [showWizard, activeTab]);

  // Fetch real Costs when Finca and Cultivo are selected (Moving to Step 2/3)
  useEffect(() => {
    if (wizardStep >= 2 && wizardData.fincaId && wizardData.cultivo) {
      setLoadingCosts(true);
      authFetch(`/api/simulador/wizard-data?tenantId=1&fincaId=${wizardData.fincaId}&cultivo=${wizardData.cultivo}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.costos_unitarios) {
            setRealCosts({
              jornal: data.costos_unitarios.jornal_mano_obra,
              insumos: data.costos_unitarios.insumos_hectarea,
              maquinaria: data.costos_unitarios.maquinaria_hectarea,
              gastosVarios: data.costos_unitarios.gastos_varios_hectarea,
              precioMercado: data.mercado.precio_kilo_actual,
              fuenteInsumo: data.fuentes_datos.semilla_origen,
              receta: data.receta_tecnica,
              alternativas: data.alternativas_rentables || [],
              transportadores: data.transportadores || []
            });
          }
        })
        .catch(err => console.error('Error fetching real costs:', err))
        .finally(() => setLoadingCosts(false));
    }
  }, [wizardStep, wizardData.fincaId, wizardData.cultivo]);

  const handleExportarPDF = () => {
    const selectedFinca = fincasList.find(f => f.id_finca == wizardData.fincaId);
    
    // Calcular fechas
    const inicioDate = wizardData.fechaInicio ? new Date(wizardData.fechaInicio) : new Date();
    const finDate = new Date(inicioDate);
    finDate.setDate(finDate.getDate() + (realCosts.receta.ciclo_dias || 120));

    const totalCostos = wizardData.areaHectareas * ((realCosts.jornal * realCosts.receta.jornales) + realCosts.insumos + realCosts.maquinaria + realCosts.gastosVarios);
    const ventas = wizardData.areaHectareas * (realCosts.receta.rendimiento || 1800) * realCosts.precioMercado;

    const projectData = {
      fincaNombre: selectedFinca?.nombre || 'Finca Desconocida',
      cultivo: wizardData.cultivo,
      area: wizardData.areaHectareas,
      ciclo: realCosts.receta.ciclo_dias || 120,
      fechaInicio: inicioDate.toLocaleDateString(),
      fechaFin: isNaN(finDate) ? 'Desconocida' : finDate.toLocaleDateString(),
      costos: {
        manoObra: wizardData.areaHectareas * realCosts.receta.jornales * realCosts.jornal,
        insumos: wizardData.areaHectareas * realCosts.insumos,
        maquinaria: wizardData.areaHectareas * realCosts.maquinaria,
        gastosVarios: wizardData.areaHectareas * realCosts.gastosVarios,
        total: totalCostos
      },
      ventas: ventas,
      roi: ventas - totalCostos,
      alternativas: realCosts.alternativas,
      transportadores: realCosts.transportadores,
      rendimiento: realCosts.receta.rendimiento || 1800
    };
    
    exportSimulationPdf(projectData);
  };

  const handleExportarExcel = () => {
    const selectedFinca = fincasList.find(f => f.id_finca == wizardData.fincaId);
    
    // Calcular fechas
    const inicioDate = wizardData.fechaInicio ? new Date(wizardData.fechaInicio) : new Date();
    const finDate = new Date(inicioDate);
    const cicloDias = realCosts.receta.ciclo_dias || 120;
    finDate.setDate(finDate.getDate() + cicloDias);
    
    const totalCostos = wizardData.areaHectareas * ((realCosts.jornal * realCosts.receta.jornales) + realCosts.insumos + realCosts.maquinaria + realCosts.gastosVarios);
    const ventas = wizardData.areaHectareas * (realCosts.receta.rendimiento || 1800) * realCosts.precioMercado;
    const roi = ventas - totalCostos;
    
    const data = [
      ["REPORTE AGRONOMICO", wizardData.cultivo],
      ["Finca Operativa", selectedFinca?.nombre || 'Desconocida'],
      ["Area Sembrada (Hectareas)", wizardData.areaHectareas],
      ["Duracion del Ciclo (Dias)", cicloDias],
      ["Fecha Siembra", inicioDate.toLocaleDateString()],
      ["Fecha Cosecha", isNaN(finDate) ? 'Desconocida' : finDate.toLocaleDateString()],
      [],
      ["PROYECCION FINANCIERA (ABC)", "VALOR (COP)"],
      ["Mano de Obra", wizardData.areaHectareas * realCosts.receta.jornales * realCosts.jornal],
      ["Insumos", wizardData.areaHectareas * realCosts.insumos],
      ["Maquinaria", wizardData.areaHectareas * realCosts.maquinaria],
      ["Gastos Varios", wizardData.areaHectareas * realCosts.gastosVarios],
      ["COSTO TOTAL PROYECTADO", totalCostos],
      ["Ventas Proyectadas", ventas],
      ["GANANCIA O PERDIDA NETA (ROI)", roi],
      [],
      ["CONCEPTO AGRONOMICO", roi < 0 ? "INVIABLE: Los costos superan las ventas estimadas. Evaluar rotación de cultivo o tecnificación para reducir costos de mano de obra." : "VIABLE: El margen proyectado es positivo. Proceda con la siembra recomendada según cronograma."],
      ...(() => {
        if (realCosts.alternativas && realCosts.alternativas.length > 0) {
          const alts = realCosts.alternativas.map(alt => `${alt.cultivo}: Precio $${alt.precio}/Kg (ROI Est: $${alt.roi_ha * wizardData.areaHectareas})`).join(" | ");
          return [["INTELIGENCIA DE MERCADO", alts], []];
        }
        return [[]];
      })(),
      ["CRONOGRAMA OPERATIVO", "DIAS", "LABOR", "RECOMENDACION"]
    ];

    const semanasTotal = Math.ceil(cicloDias / 7);
    data.push(["Semana 1", "0 a 7 dias", "Preparacion Suelo", "Arado, cincelado y aplicacion de enmiendas"]);
    data.push(["Semana 2", "8 a 14 dias", "Siembra", "Aplicacion de semilla y fertilizante de arranque"]);
    const semFert1 = Math.max(3, Math.round(semanasTotal * 0.25));
    data.push([`Semana ${semFert1}`, `${(semFert1-1)*7} a ${semFert1*7} dias`, "Fertilizacion 1", "Aplicacion de Urea/NPK"]);
    const semFito = Math.max(semFert1 + 1, Math.round(semanasTotal * 0.40));
    data.push([`Semana ${semFito}`, `${(semFito-1)*7} a ${semFito*7} dias`, "Control Fitosanitario", "Herbicidas/Insecticidas"]);
    const semFert2 = Math.max(semFito + 1, Math.round(semanasTotal * 0.60));
    data.push([`Semana ${semFert2}`, `${(semFert2-1)*7} a ${semFert2*7} dias`, "Fertilizacion 2", "Refuerzo llenado"]);
    data.push([`Semana ${semanasTotal}`, `${(semanasTotal-1)*7} a ${cicloDias} dias`, "Cosecha", "Recoleccion y transporte"]);
    
    if (realCosts.transportadores && realCosts.transportadores.length > 0) {
      data.push([]);
      data.push(["LOGISTICA DE TRANSPORTE", "ORIGEN", "VEHICULOS", "TELEFONO", "TARIFA TONELADA", "COSTO FLETE ESTIMADO"]);
      const totalToneladas = wizardData.areaHectareas * ((realCosts.receta.rendimiento || 1800) / 1000);
      data.push(["Volumen Total a Cosechar (Ton)", totalToneladas.toFixed(1), "", "", "", ""]);
      realCosts.transportadores.forEach(t => {
        data.push([
          t.nombre,
          t.ciudad_base || 'N/A',
          t.tipo_vehiculos || 'N/A',
          t.telefono || 'N/A',
          t.precio_tonelada_promedio || 0,
          totalToneladas * (t.precio_tonelada_promedio || 0)
        ]);
      });
    }

    // Use BOM for Excel UTF-8 and semicolon separator
    let csvContent = "\uFEFF" + data.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Proyeccion_${wizardData.cultivo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWhatsApp = () => {
    const selectedFinca = fincasList.find(f => f.id_finca == wizardData.fincaId);
    const inicioDate = wizardData.fechaInicio ? new Date(wizardData.fechaInicio) : new Date();
    const finDate = new Date(inicioDate);
    const cicloDias = realCosts.receta.ciclo_dias || 120;
    finDate.setDate(finDate.getDate() + cicloDias);
    
    const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
    const totalCostos = wizardData.areaHectareas * ((realCosts.jornal * realCosts.receta.jornales) + realCosts.insumos + realCosts.maquinaria + realCosts.gastosVarios);
    const ventas = wizardData.areaHectareas * (realCosts.receta.rendimiento || 1800) * realCosts.precioMercado;
    const roi = ventas - totalCostos;

    let text = `🚜 *REPORTE AGRONÓMICO: ${wizardData.cultivo.toUpperCase()}*\n`;
    text += `📍 *Finca:* ${selectedFinca?.nombre}\n`;
    text += `📏 *Área:* ${wizardData.areaHectareas} Hectáreas\n`;
    text += `⏱️ *Ciclo:* ${cicloDias} Días (${inicioDate.toLocaleDateString()} al ${isNaN(finDate)?'':finDate.toLocaleDateString()})\n\n`;
    
    text += `💰 *PROYECCIÓN FINANCIERA*\n`;
    text += `• Mano de Obra: ${formatCurrency(wizardData.areaHectareas * realCosts.receta.jornales * realCosts.jornal)}\n`;
    text += `• Insumos: ${formatCurrency(wizardData.areaHectareas * realCosts.insumos)}\n`;
    text += `• Maquinaria: ${formatCurrency(wizardData.areaHectareas * realCosts.maquinaria)}\n`;
    text += `• Gastos Varios: ${formatCurrency(wizardData.areaHectareas * realCosts.gastosVarios)}\n`;
    text += `🔻 *COSTO TOTAL:* ${formatCurrency(totalCostos)}\n`;
    text += `📈 *VENTAS PROY.:* ${formatCurrency(ventas)}\n`;
    text += `${roi < 0 ? '❌' : '✅'} *GANANCIA O PÉRDIDA NETA (ROI):* ${formatCurrency(roi)}\n\n`;
    
    text += `💡 *CONCEPTO AGRONÓMICO*\n`;
    text += `${roi < 0 ? '⚠️ *INVIABLE:* Los costos superan las ventas. Evalúe alternativas o reduzca jornales tecnificando la operación.' : '✨ *VIABLE:* Proyecto con margen positivo. Condiciones de mercado favorables.'}\n\n`;

    if (realCosts.alternativas && realCosts.alternativas.length > 0) {
      text += `🎯 *INTELIGENCIA DE MERCADO (Alternativas)*\n`;
      realCosts.alternativas.forEach(alt => {
        text += `• ${alt.cultivo}: Precio ${formatCurrency(alt.precio)}/Kg | ROI Proyectado: ${formatCurrency(alt.roi_ha * wizardData.areaHectareas)}\n`;
      });
      text += `\n`;
    }

    const semanasTotal = Math.ceil(cicloDias / 7);
    const semFert1 = Math.max(3, Math.round(semanasTotal * 0.25));
    const semFito = Math.max(semFert1 + 1, Math.round(semanasTotal * 0.40));
    const semFert2 = Math.max(semFito + 1, Math.round(semanasTotal * 0.60));

    text += `📅 *CRONOGRAMA CLAVE*\n`;
    text += `Semana 1: Preparación Suelo\n`;
    text += `Semana 2: Siembra\n`;
    text += `Semana ${semFert1}: Fertilización 1\n`;
    text += `Semana ${semFito}: Fitosanitario\n`;
    text += `Semana ${semFert2}: Fertilización 2\n`;
    text += `Semana ${semanasTotal}: Cosecha\n\n`;
    text += `Generado por AgroPaccioli 🚀`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Filters (Agenda Real)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Mock Data (Simulador)
  const MOCK_SIMULATIONS = [
    { id: 'sim_1', nombre: 'Simulación Arroz 500msnm - Lote Principal', cultivo: 'Arroz', estado: 'Borrador' },
    { id: 'sim_2', nombre: 'Prueba Experimental Maíz - Lote 3', cultivo: 'Maíz', estado: 'En Marcha' }
  ];

  const MOCK_TIMELINE = [
    { dia: 0, fase: 'Diseño y Trazado', titulo: 'Medición y Trazado de Surcos', desc: 'Orientación Norte-Sur, a 0.8m entre surcos para aprovechar luz solar.', tuto: { title: 'AGROSAVIA: Diseño Espacial y Preparación de Suelos en Laderas', vid: 'https://www.youtube.com/embed/M3X4lYwE83k' } },
    { dia: 5, fase: 'Preparación', titulo: 'Aplicación de Enmiendas (Cal)', desc: 'Corrección del pH del suelo antes de la siembra.', tuto: { title: 'FENALCE: Correcto uso de Enmiendas y Cal Agrícola', vid: 'https://www.youtube.com/embed/g2qJ1i6tH2g' } },
    { dia: 15, fase: 'Siembra', titulo: 'Siembra de Semilla Certificada', desc: 'Siembra manual usando semilla certificada Corpoica Rojo 39 (Biofortificada).', tuto: { title: 'AGROSAVIA: Producción y Siembra de Frijol Corpoica Rojo 39', vid: 'https://www.youtube.com/embed/YtN1V3K_qDk' } },
    { dia: 45, fase: 'Mantenimiento', titulo: 'Control de Malezas', desc: 'Aplicación de herbicida post-emergente con bomba de espalda.', tuto: { title: 'ICA: Manejo Integrado de Malezas en Leguminosas', vid: 'https://www.youtube.com/embed/5-T8_d9LhE8' } },
    { dia: 120, fase: 'Cosecha', titulo: 'Recolección Mecanizada', desc: 'Uso de combinada, humedad objetivo 22%.', tuto: { title: 'AGROSAVIA: Prácticas de Cosecha y Postcosecha de Frijol', vid: 'https://www.youtube.com/embed/oQ8g-T5ZkFE' } }
  ];

  // Lists
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [potreros, setPotreros] = useState([]);
  const [viveros, setViveros] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [estanques, setEstanques] = useState([]);
  const [caminos, setCaminos] = useState([]);
  const [trees, setTrees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [machines, setMachines] = useState([]);
  const [insumosList, setInsumosList] = useState([]);

  // UIs & Forms
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [auditingTask, setAuditingTask] = useState(null);
  const [emailPreviewContent, setEmailPreviewContent] = useState(null);

  // New Labor Form State
  const [newCategory, setNewCategory] = useState('Personal');
  const [newDescription, setNewDescription] = useState('');
  const [newEmpId, setNewEmpId] = useState('');
  const [locationType, setLocationType] = useState('Lote');
  const [newLoteId, setNewLoteId] = useState('');
  const [newPotreroId, setNewPotreroId] = useState('');
  const [newViveroId, setNewViveroId] = useState('');
  const [newBodegaId, setNewBodegaId] = useState('');
  const [newEstanqueId, setNewEstanqueId] = useState('');
  const [newCaminoId, setNewCaminoId] = useState('');
  const [newArbolId, setNewArbolId] = useState('');
  const [newVehId, setNewVehId] = useState('');
  const [newMaqId, setNewMaqId] = useState('');

  // Audit Form State
  const [auditStatus, setAuditStatus] = useState('Completada');
  const [auditObs, setAuditObs] = useState('');
  const [auditEvaluator, setAuditEvaluator] = useState('Ing. Principal');
  const [auditInsumos, setAuditInsumos] = useState([]);

  // Load Initial Lookups
  useEffect(() => {
    async function loadLookups() {
      try {
        const empsRes = await fetchTableData('rrhh_empleados', { tenantId, pageSize: 150 });
        const lotesRes = await fetchTableData('lotes', { tenantId, fincaId, nucleoId, pageSize: 150 });
        const potrerosRes = await fetchTableData('ganado_potreros', { tenantId, pageSize: 150 });
        const viverosRes = await fetchTableData('viveros', { tenantId, pageSize: 150 });
        const bodegasRes = await fetchTableData('bod_bodegas', { tenantId, pageSize: 150 });
        const estanquesRes = await fetchTableData('acuicola_estanques', { tenantId, pageSize: 150 });
        const caminosRes = await fetchTableData('caminos_calles', { tenantId, pageSize: 150 });
        const vehRes = await fetchTableData('vehiculos', { tenantId, pageSize: 150 });
        const maqRes = await fetchTableData('maquinaria', { tenantId, pageSize: 150 });
        const insRes = await fetchTableData('insumos', { tenantId, pageSize: 500 });

        setEmployees(empsRes.data || []);
        setLotes(lotesRes.data || []);
        setPotreros(potrerosRes.data || []);
        setViveros(viverosRes.data || []);
        setBodegas(bodegasRes.data || []);
        setEstanques(estanquesRes.data || []);
        setCaminos(caminosRes.data || []);
        setVehicles(vehRes.data || []);
        setMachines(maqRes.data || []);
        setInsumosList(insRes.data || []);
      } catch (err) {
        console.error('Error loading lookups for TaskPlanner:', err);
      }
    }
    loadLookups();
  }, [tenantId, fincaId, nucleoId]);

  // Load Trees when selected lote in form changes
  useEffect(() => {
    async function loadLoteTrees() {
      if (!newLoteId) {
        setTrees([]);
        return;
      }
      try {
        const data = await fetchTrees({ tenantId, loteId: newLoteId });
        setTrees(data);
      } catch (err) {
        console.error('Error loading trees for lote:', err);
      }
    }
    loadLoteTrees();
  }, [newLoteId, tenantId]);

  // Cargar cultivos viables cuando selecciona finca/lote
  useEffect(() => {
    if (!wizardData.fincaId) return;
    const fetchCultivos = async () => {
      try {
        const finca = fincasList.find(f => f.id_finca == wizardData.fincaId);
        const res = await authFetch(`/api/simulador/cultivos-viables?altitud=${finca?.altitud_promedio || 0}`);
        if (res.ok) {
          const data = await res.json();
          setCultivosViables(data);
        }
      } catch (err) {
        console.error("Error loading crops", err);
      }
    };
    fetchCultivos();
  }, [wizardData.fincaId, fincasList]);

  // Actualizar área de siembra automáticamente si hay un lote seleccionado
  useEffect(() => {
    if (wizardData.loteId) {
      const lote = lotesList.find(l => l.id_lote == wizardData.loteId);
      if (lote) {
        setWizardData(prev => ({ ...prev, areaHectareas: lote.area_hectareas }));
      }
    }
  }, [wizardData.loteId, lotesList]);

  // Load Tasks
  const loadTasksList = async () => {
    setLoading(true);
    try {
      const data = await fetchLabores({
        tenantId,
        date: selectedDate,
        categoria: filterCategory,
        estado: filterStatus
      });
      setTasks(data);
    } catch (err) {
      console.error('Error loading labors list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasksList();
  }, [selectedDate, filterCategory, filterStatus, tenantId, fincaId, nucleoId]);

  // Handle Manual Task Creation
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newDescription.trim()) return;

    try {
      await createLabor({
        tenantId,
        categoria: newCategory,
        descripcion_labor: newDescription,
        fecha_planificada: selectedDate,
        id_empleado: newEmpId || null,
        id_lote: locationType === 'Lote' ? (newLoteId || null) : null,
        id_potrero: locationType === 'Potrero' ? (newPotreroId || null) : null,
        id_vivero: locationType === 'Vivero' ? (newViveroId || null) : null,
        id_bodega: locationType === 'Bodega' ? (newBodegaId || null) : null,
        id_estanque: locationType === 'Estanque' ? (newEstanqueId || null) : null,
        id_camino: locationType === 'Via' ? (newCaminoId || null) : null,
        id_arbol: newArbolId || null,
        id_vehiculo: newVehId || null,
        id_maquinaria: newMaqId || null
      });

      setNewDescription('');
      setNewEmpId('');
      setNewLoteId('');
      setNewPotreroId('');
      setNewViveroId('');
      setNewBodegaId('');
      setNewEstanqueId('');
      setNewCaminoId('');
      setNewArbolId('');
      setNewVehId('');
      setNewMaqId('');
      setShowAddForm(false);
      loadTasksList();
      alert('¡Nueva labor diaria planificada con éxito!');
    } catch (err) {
      alert(`Error al planificar labor: ${err.message}`);
    }
  };

  // Handle Automated Suggestions Rule Engine
  const handleAutoGenerate = async () => {
    setLoading(true);
    try {
      const res = await autoGenerateLabores({
        tenantId,
        date: selectedDate
      });
      loadTasksList();
      alert(`¡Generador Inteligente activo! Se han sugerido y creado ${res.count} labores recomendadas para hoy basadas en el estado del cultivo y maquinaria.`);
    } catch (err) {
      alert(`Error al autogenerar labores: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Compliance Audit Evaluation
  const handleAuditSubmit = async (e) => {
    e.preventDefault();
    if (!auditingTask) return;

    try {
      await evaluateLabor(auditingTask.id_labor, {
        estado: auditStatus,
        observaciones: auditObs,
        evaluador: auditEvaluator,
        insumos_utilizados: auditInsumos.filter(i => i.id_insumo && i.cantidad > 0)
      });

      setAuditingTask(null);
      setAuditObs('');
      setAuditInsumos([]);
      loadTasksList();
      alert(`Labor calificada correctamente como "${auditStatus}".`);
    } catch (err) {
      alert(`Error al auditar labor: ${err.message}`);
    }
  };

  // Handle Official Report Dispatch
  const handleSendReport = async (task) => {
    try {
      const res = await sendLaborReport(task.id_labor);
      setEmailPreviewContent(res.emailPreview);
      loadTasksList();
    } catch (err) {
      alert(`Error al enviar reporte: ${err.message}`);
    }
  };

  return (
    <div className="task-planner-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      {/* Top Navigation Tabs */}
      <div className="tabs-header" style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '10px' }}>
        <button 
          style={{
            padding: '12px 24px', background: 'transparent', border: 'none', cursor: 'pointer',
            color: activeTab === 'agenda' ? 'var(--primary)' : '#cbd5e1',
            borderBottom: activeTab === 'agenda' ? '3px solid var(--primary)' : 'none',
            fontWeight: activeTab === 'agenda' ? 'bold' : 'normal',
            fontSize: '15px'
          }}
          onClick={() => setActiveTab('agenda')}
        >
          📅 Mi Agenda Hoy
        </button>
        <button 
          style={{
            padding: '12px 24px', background: 'transparent', border: 'none', cursor: 'pointer',
            color: activeTab === 'simulador' ? 'var(--primary)' : '#cbd5e1',
            borderBottom: activeTab === 'simulador' ? '3px solid var(--primary)' : 'none',
            fontWeight: activeTab === 'simulador' ? 'bold' : 'normal',
            fontSize: '15px'
          }}
          onClick={() => setActiveTab('simulador')}
        >
          🎮 Modo Simulador (Cursos & Proyecciones)
        </button>
      </div>

      {/* Top Filter and Command Panel */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        {activeTab === 'agenda' ? (
          <>
            <div>
              <p>Planificación de trabajos de campo, riegos, maquinaria, cosecha y auditoría de cumplimiento.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="date"
                className="form-control"
                style={{ width: '160px', background: 'var(--card-bg)', border: '1px solid var(--border)', color: '#fff', padding: '8px 12px' }}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />

              <button
                onClick={handleAutoGenerate}
                className="btn"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', padding: '8px 16px', fontWeight: 'bold' }}
              >
                ⚡ Generador Inteligente IA
              </button>

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="btn"
                style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '8px 16px', fontWeight: 'bold' }}
              >
                {showAddForm ? '✕ Cerrar Formulario' : '＋ Planificar Labor'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <p>Diseña cronogramas completos desde cero y aprende paso a paso cómo cultivar.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                className="form-control"
                style={{ minWidth: '350px', background: 'var(--card-bg)', border: '1px solid var(--primary)', color: '#fff', padding: '8px 12px' }}
                value={selectedSimulation}
                onChange={(e) => setSelectedSimulation(e.target.value)}
              >
                <option value="">-- Seleccionar Simulación Activa --</option>
                {MOCK_SIMULATIONS.map(sim => (
                  <option key={sim.id} value={sim.id}>{sim.nombre} ({sim.estado})</option>
                ))}
              </select>

              <button 
                className="btn" 
                style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '8px 16px', fontWeight: 'bold' }}
                onClick={() => {
                  setWizardStep(1);
                  setWizardData({ cultivo: 'Frijol', areaHectareas: 5 });
                  setShowWizard(true);
                }}
              >
                ＋ Crear Nueva Simulación
              </button>
            </div>
          </>
        )}
      </div>

      {/* Manual Task Creator Form */}
      {showAddForm && (
        <form onSubmit={handleCreateTask} style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
        }}>
          <div style={{ gridColumn: 'span 2' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#3b82f6', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              📝 Planificar Nuevo Trabajo de Campo
            </h3>
          </div>

          <div className="form-group">
            <label className="form-label">Categoría de la Labor</label>
            <select
              className="form-control"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Descripción Técnica del Trabajo</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="Ej: Deshierbe lote 3, aplicación fertilización..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Operario Asignado</label>
            <select
              className="form-control"
              value={newEmpId}
              onChange={(e) => setNewEmpId(e.target.value)}
            >
              <option value="">-- Ninguno / Sin asignar --</option>
              {employees.map(emp => (
                <option key={emp.id_empleado} value={emp.id_empleado}>{emp.nombres} {emp.apellidos} ({emp.cargo})</option>
              ))}
            </select>
          </div>

          
          <div className="form-group">
            <label className="form-label">Tipo de Ubicación</label>
            <select className="form-control" value={locationType} onChange={(e) => setLocationType(e.target.value)}>
              <option value="Lote">🌿 Lote / Campo</option>
              <option value="Potrero">🐄 Potrero (Ganadería)</option>
              <option value="Estanque">🐟 Estanque (Piscícola)</option>
              <option value="Vivero">🌱 Vivero</option>
              <option value="Bodega">🏭 Bodega / Taller</option>
              <option value="Via">🛣️ Vía / Camino</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Ubicación Específica</label>
            {locationType === 'Lote' && (
              <select className="form-control" value={newLoteId} onChange={(e) => setNewLoteId(e.target.value)}>
                <option value="">-- Campo / Área General --</option>
                {lotes.map(l => <option key={l.id_lote} value={l.id_lote}>{l.nombre}</option>)}
              </select>
            )}
            {locationType === 'Potrero' && (
              <select className="form-control" value={newPotreroId} onChange={(e) => setNewPotreroId(e.target.value)}>
                <option value="">-- General --</option>
                {potreros.map(l => <option key={l.id_potrero} value={l.id_potrero}>{l.nombre}</option>)}
              </select>
            )}
            {locationType === 'Estanque' && (
              <select className="form-control" value={newEstanqueId} onChange={(e) => setNewEstanqueId(e.target.value)}>
                <option value="">-- General --</option>
                {estanques.map(l => <option key={l.id_estanque} value={l.id_estanque}>{l.nombre}</option>)}
              </select>
            )}
            {locationType === 'Vivero' && (
              <select className="form-control" value={newViveroId} onChange={(e) => setNewViveroId(e.target.value)}>
                <option value="">-- General --</option>
                {viveros.map(l => <option key={l.id_vivero} value={l.id_vivero}>{l.nombre}</option>)}
              </select>
            )}
            {locationType === 'Bodega' && (
              <select className="form-control" value={newBodegaId} onChange={(e) => setNewBodegaId(e.target.value)}>
                <option value="">-- General --</option>
                {bodegas.map(l => <option key={l.id_bodega} value={l.id_bodega}>{l.nombre}</option>)}
              </select>
            )}
            {locationType === 'Via' && (
              <select className="form-control" value={newCaminoId} onChange={(e) => setNewCaminoId(e.target.value)}>
                <option value="">-- General --</option>
                {caminos.map(l => <option key={l.id_camino} value={l.id_camino}>{l.nombre}</option>)}
              </select>
            )}
          </div>


          {newLoteId && (
            <div className="form-group">
              <label className="form-label">Árbol Individual (Opcional)</label>
              <select
                className="form-control"
                value={newArbolId}
                onChange={(e) => setNewArbolId(e.target.value)}
              >
                <option value="">-- Lote Completo --</option>
                {trees.map(t => (
                  <option key={t.id_arbol} value={t.id_arbol}>{t.codigo_arbol} ({t.estado_salud})</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Vehículo / Tractor Requerido</label>
            <select
              className="form-control"
              value={newVehId}
              onChange={(e) => setNewVehId(e.target.value)}
            >
              <option value="">-- Ninguno --</option>
              {vehicles.map(v => (
                <option key={v.id_vehiculo} value={v.id_vehiculo}>{v.marca} {v.modelo} - Placa: {v.placa}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: newLoteId ? 'auto' : 'span 2' }}>
            <label className="form-label">Maquinaria / Accesorio de Campo</label>
            <select
              className="form-control"
              value={newMaqId}
              onChange={(e) => setNewMaqId(e.target.value)}
            >
              <option value="">-- Ninguno --</option>
              {machines.map(m => (
                <option key={m.id_maquinaria} value={m.id_maquinaria}>{m.nombre} - Serial: {m.numero_serie}</option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowAddForm(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ background: '#3b82f6', border: 'none', color: '#fff' }}>
              ✓ Guardar y Asignar Labor
            </button>
          </div>
        </form>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: auditingTask ? '1fr 400px' : '1fr', gap: '20px', flex: 1 }}>
        {/* Left Side: Tasks Catalog or Simulator Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeTab === 'agenda' ? (
            <>
              {/* Quick Filters */}
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>Filtros Rápidos:</span>
            <select
              className="form-control"
              style={{ width: '200px', padding: '6px 10px', background: '#0f172a', border: '1px solid var(--border)', color: '#fff' }}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">-- Todas las Categorías --</option>
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <select
              className="form-control"
              style={{ width: '180px', padding: '6px 10px', background: '#0f172a', border: '1px solid var(--border)', color: '#fff' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">-- Todos los Estados --</option>
              <option value="Planificada">Planificada</option>
              <option value="En Progreso">En Progreso</option>
              <option value="Completada">✓ Completadas (Cumplidas)</option>
              <option value="Incumplida">🚨 Incumplidas</option>
            </select>
          </div>

          {/* Task list container */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', background: 'var(--card-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div className="spinner" style={{ margin: '0 auto 10px' }} />
              <p>Consultando calendario de labores diarias...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px', background: 'var(--card-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>🗓️</div>
              <h4 style={{ margin: 0, color: '#fff' }}>No hay labores planificadas para hoy</h4>
              <p style={{ color: '#cbd5e1', fontSize: '13px', maxWidth: '400px', margin: '6px auto 14px' }}>
                Puedes registrar un nuevo trabajo manual con el botón "Planificar Labor" o autogenerar la agenda diaria usando la inteligencia del sistema.
              </p>
              <button onClick={handleAutoGenerate} className="btn btn-outline" style={{ border: '1px solid #10b981', color: '#10b981' }}>
                ⚡ Auto-generar Tareas Recomendadas
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tasks.map(task => {
                const categoryDef = CATEGORIES.find(c => c.value === task.categoria) || { label: task.categoria, color: '#475569' };
                
                return (
                  <div key={task.id_labor} style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderLeft: `5px solid ${categoryDef.color}`,
                    borderRadius: 'var(--radius)',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    transition: 'transform 0.2s',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setAuditingTask(task);
                    setAuditStatus(task.estado === 'Planificada' || task.estado === 'En Progreso' ? 'Completada' : task.estado);
                    setAuditObs(task.cumplimiento_observaciones || '');
                    setAuditInsumos([]);
                  }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: '#fff',
                          background: categoryDef.color,
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          {categoryDef.label}
                        </span>

                        <span style={{
                          fontSize: '10px',
                          fontWeight: 'bold',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: task.estado === 'Completada' ? 'rgba(16, 185, 129, 0.15)' : (task.estado === 'Incumplida' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)'),
                          color: task.estado === 'Completada' ? '#10b981' : (task.estado === 'Incumplida' ? '#ef4444' : '#3b82f6'),
                          border: '1px solid currentColor'
                        }}>
                          {task.estado}
                        </span>

                        {task.reporte_enviado === 1 && (
                          <span style={{ fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            ✉️ Reporte Enviado a Jefes
                          </span>
                        )}
                      </div>

                      <h4 style={{ margin: '4px 0', fontSize: '15px', color: '#fff' }}>{task.descripcion_labor}</h4>
                      
                      {/* Linked Metadata Icons */}
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {task.empleado_nombre && <span>👤 <b>Asignado:</b> {task.empleado_nombre}</span>}
                        {task.lote_nombre && <span>🗺️ <b>Lote:</b> {task.lote_nombre}</span>}
                        {task.codigo_arbol && <span>🌴 <b>Árbol:</b> {task.codigo_arbol}</span>}
                        {task.vehiculo_placa && <span>🚚 <b>Placa:</b> {task.vehiculo_placa}</span>}
                        {task.maquinaria_nombre && <span>🚜 <b>Equipo:</b> {task.maquinaria_nombre}</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setAuditingTask(task);
                          setAuditStatus(task.estado === 'Planificada' || task.estado === 'En Progreso' ? 'Completada' : task.estado);
                          setAuditObs(task.cumplimiento_observaciones || '');
                          setAuditInsumos([]);
                        }}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        ⚙️ Auditar
                      </button>

                      {task.estado !== 'Planificada' && task.estado !== 'En Progreso' && (
                        <button
                          onClick={() => handleSendReport(task)}
                          className="btn"
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            background: task.reporte_enviado === 1 ? '#047857' : '#10b981',
                            color: '#fff',
                            border: 'none'
                          }}
                        >
                          ✉️ Despachar Reporte
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </>
          ) : (
            /* SIMULATOR MOCKUP VIEW */
            <div style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '20px' }}>
              {!selectedSimulation ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎮</div>
                  <h3 style={{ color: '#fff', marginBottom: '8px' }}>Simulador Educativo de Cosecha</h3>
                  <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto' }}>Selecciona una simulación guardada en la parte superior para visualizar la agenda pedagógica de siembra completa o crea una nueva.</p>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', color: '#3b82f6' }}>Proyección Gráfica del Ciclo de Vida</h3>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Desde la preparación topográfica hasta la cosecha.</p>
                    </div>
                    <button 
                      className="btn" 
                      style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '10px 20px', fontWeight: 'bold', fontSize: '15px' }}
                      onClick={() => alert("¡Las tareas han sido generadas e inyectadas en tu Agenda Real diaria!")}
                    >
                      🚀 Iniciar Cultivo Real (Exportar a Mi Agenda)
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {MOCK_TIMELINE.map((step, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '20px', position: 'relative', paddingBottom: '30px' }}>
                        {/* Timeline Graphic line */}
                        {idx !== MOCK_TIMELINE.length - 1 && (
                          <div style={{ position: 'absolute', left: '19px', top: '30px', bottom: '0', width: '2px', background: 'var(--border)', zIndex: 1 }}></div>
                        )}
                        
                        <div style={{ 
                          width: '40px', height: '40px', borderRadius: '50%', background: '#1e293b', border: '2px solid #3b82f6', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontWeight: 'bold', zIndex: 2 
                        }}>
                          {idx + 1}
                        </div>

                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', position: 'relative' }}>
                          <span style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '12px', fontWeight: 'bold', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                            Día {step.dia}
                          </span>
                          <h4 style={{ margin: '0 0 4px 0', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Fase: {step.fase}</h4>
                          <h3 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '16px' }}>{step.titulo}</h3>
                          <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>{step.desc}</p>
                          
                          <button 
                            className="btn btn-outline" 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderColor: '#3b82f6', color: '#3b82f6' }}
                            onClick={() => {
                              setTutorialContent(step.tuto);
                              setShowTutorialModal(true);
                            }}
                          >
                            <span style={{ fontSize: '16px' }}>📚</span> Ver Tutorial Educativo
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Audit compliance panel */}
        {auditingTask && (
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Panel de Cumplimiento</span>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#fff' }}>Labor #{auditingTask.id_labor}</h3>
              </div>
              <button onClick={() => setAuditingTask(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}>×</button>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              <b>Trabajo:</b> {auditingTask.descripcion_labor}
            </p>

            <form onSubmit={handleAuditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Resultado de Auditoría</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius)',
                      border: '1px solid #10b981',
                      background: auditStatus === 'Completada' ? 'rgba(16,185,129,0.15)' : 'transparent',
                      color: '#10b981',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                    onClick={() => setAuditStatus('Completada')}
                  >
                    ✓ CUMPLIÓ
                  </button>

                  <button
                    type="button"
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius)',
                      border: '1px solid #ef4444',
                      background: auditStatus === 'Incumplida' ? 'rgba(239,68,68,0.15)' : 'transparent',
                      color: '#ef4444',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                    onClick={() => setAuditStatus('Incumplida')}
                  >
                    🚨 NO CUMPLIÓ
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Evaluador / Supervisor</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={auditEvaluator}
                  onChange={(e) => setAuditEvaluator(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Observaciones y Detalles de Verificación</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Comentarios sobre el rendimiento de la labor, justificación del incumplimiento, etc."
                  value={auditObs}
                  onChange={(e) => setAuditObs(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Insumos Aplicados / Descuento de Inventario</label>
                <p style={{fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 8px 0'}}>Asocie los insumos usados para descontar el stock del Kardex y costear la trazabilidad del lote.</p>
                {auditInsumos.map((ai, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <select className="form-control" style={{ flex: 2 }} value={ai.id_insumo} onChange={(e) => {
                      const newAi = [...auditInsumos];
                      newAi[i].id_insumo = parseInt(e.target.value);
                      setAuditInsumos(newAi);
                    }}>
                      <option value="">Seleccione Insumo (Bodega)...</option>
                      {insumosList.map(ins => (
                        <option key={ins.id_insumo} value={ins.id_insumo}>{ins.nombre} ({ins.unidad_medida} | Stock: {ins.stock_actual})</option>
                      ))}
                    </select>
                    <input type="number" className="form-control" style={{ flex: 1 }} min="0.01" step="0.01" placeholder="Cantidad" value={ai.cantidad} onChange={(e) => {
                      const newAi = [...auditInsumos];
                      newAi[i].cantidad = parseFloat(e.target.value);
                      setAuditInsumos(newAi);
                    }} />
                    <button type="button" className="btn btn-outline" style={{ border: '1px solid #ef4444', color: '#ef4444', padding: '4px 8px' }} onClick={() => {
                      setAuditInsumos(auditInsumos.filter((_, idx) => idx !== i));
                    }}>✕</button>
                  </div>
                ))}
                <button type="button" className="btn btn-outline" style={{ fontSize: '12px', marginTop: '4px' }} onClick={() => setAuditInsumos([...auditInsumos, { id_insumo: '', cantidad: '' }])}>
                  + Reportar Consumo de Insumo
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setAuditingTask(null)}>
                  Cerrar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  ✓ Guardar Auditoría
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Simulated Email Report Preview Overlay */}
      {emailPreviewContent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15,23,42,0.85)',
          zIndex: 10000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '12px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              background: '#10b981',
              color: '#fff',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '15px' }}>✉️ Correo de Notificación Enviado con Éxito</h3>
              <button
                onClick={() => setEmailPreviewContent(null)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            {/* Email Body Scrollable wrapper */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', background: '#f1f5f9', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#334155' }}>
                <div><b>Para:</b> jefes.area@sasagricolas.com, administrador@finca.com</div>
                <div><b>Asunto:</b> 🚨 AgroPaccioli - Notificación de Auditoría de Labor Diaria</div>
              </div>

              {/* Render the backend pre-formatted high-fidelity template */}
              <div dangerouslySetInnerHTML={{ __html: emailPreviewContent }} />
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setEmailPreviewContent(null)} className="btn" style={{ background: '#475569', color: '#fff', border: 'none', padding: '8px 16px' }}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Educational Tutorial Modal */}
      {showTutorialModal && tutorialContent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15,23,42,0.9)', zIndex: 11000,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px',
            width: '100%', maxWidth: '800px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ background: '#3b82f6', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📚</span> {tutorialContent.title}
              </h3>
              <button 
                onClick={() => setShowTutorialModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}
              >×</button>
            </div>
            
            <div style={{ padding: '20px' }}>
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px', background: '#000', marginBottom: '20px' }}>
                <iframe 
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  src={tutorialContent.vid} 
                  title="Tutorial Educativo" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(59,130,246,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.3)' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: '#3b82f6' }}>Material de Apoyo (Offline)</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Descarga el manual en PDF para leerlo sin conexión a internet en tu finca.</p>
                </div>
                <button className="btn" style={{ background: '#10b981', border: 'none', color: 'white', padding: '10px 20px', fontWeight: 'bold' }}>
                  📥 Descargar Manual PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simulator Wizard Modal */}
      {showWizard && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15,23,42,0.95)', zIndex: 12000,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--primary)', borderRadius: '12px',
            width: '100%', maxWidth: '700px', maxHeight: '95vh', display: 'flex', flexDirection: 'column', 
            overflow: 'hidden', boxShadow: '0 0 50px rgba(59,130,246,0.2)'
          }}>
            <div style={{ background: 'linear-gradient(90deg, #1e293b, #0f172a)', padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px' }}>
                  ⚙️ Asistente de Planificación Inteligente
                </h3>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>Paso {wizardStep} de 3</p>
              </div>
              <button onClick={() => setShowWizard(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
              {/* PASO 1 */}
              {wizardStep === 1 && (
                <div className="wizard-step">
                  <h4 style={{ color: '#fff', fontSize: '18px', marginBottom: '16px' }}>🌍 1. Inteligencia Geográfica y Selección</h4>
                  
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ color: 'var(--text-secondary)' }}>Selecciona la Finca donde deseas proyectar:</label>
                    <select 
                      className="form-control" 
                      style={{ fontSize: '16px', padding: '10px', background: '#0f172a', border: '1px solid var(--primary)', color: '#fff', width: '100%', marginBottom: '16px' }}
                      value={wizardData.fincaId}
                      onChange={(e) => {
                        const newFincaId = e.target.value;
                        setWizardData({...wizardData, fincaId: newFincaId, loteId: '', cultivo: ''});
                        if (newFincaId) {
                          const selectedFinca = fincasList.find(f => f.id_finca == newFincaId);
                          
                          if (!selectedFinca.altitud_promedio || selectedFinca.altitud_promedio <= 0) {
                            alert("❌ Error: Faltan datos sobre el nivel del mar (altitud) en la finca seleccionada. Sin este dato, el sistema no puede sugerir los cultivos permitidos. Por favor actualiza la Finca en el módulo correspondiente.");
                          } else {
                            const hasLotes = lotesList.some(l => l.id_finca == newFincaId);
                            if (!hasLotes) {
                              alert("⚠️ Advertencia: Esta finca no tiene Lotes/Núcleos registrados. Para mayor precisión agronómica, deberías crear al menos un Lote en esta Finca.");
                            }
                          }
                        }
                      }}
                    >
                      <option value="">-- Seleccionar Finca --</option>
                      {fincasList.map(f => (
                        <option key={f.id_finca} value={f.id_finca}>{f.nombre} ({f.altitud_promedio ? `${f.altitud_promedio} msnm` : 'Sin Altitud'})</option>
                      ))}
                    </select>

                    {wizardData.fincaId && (() => {
                      const fincaLotes = lotesList.filter(l => l.id_finca == wizardData.fincaId);
                      if (fincaLotes.length === 0) return null;
                      return (
                        <>
                          <label style={{ color: 'var(--text-secondary)' }}>Selecciona el Lote/Núcleo (Obligatorio):</label>
                          <select 
                            className="form-control" 
                            style={{ fontSize: '16px', padding: '10px', background: '#0f172a', border: '1px solid var(--primary)', color: '#fff', width: '100%' }}
                            value={wizardData.loteId}
                            onChange={(e) => setWizardData({...wizardData, loteId: e.target.value})}
                          >
                            <option value="">-- Seleccionar Lote --</option>
                            {fincaLotes.map(l => (
                              <option key={l.id_lote} value={l.id_lote}>{l.nombre} ({l.area_hectareas} Ha)</option>
                            ))}
                          </select>
                        </>
                      );
                    })()}
                  </div>

                  {wizardData.fincaId ? (() => {
                    const selectedFinca = fincasList.find(f => f.id_finca == wizardData.fincaId);
                    const fincaLotes = lotesList.filter(l => l.id_finca == wizardData.fincaId);
                    const hasAltitudeError = !selectedFinca.altitud_promedio || selectedFinca.altitud_promedio <= 0;
                    const hasLotesError = fincaLotes.length === 0;
                    
                    return (
                      <>
                        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                          <p style={{ margin: 0, color: '#10b981', fontSize: '14px' }}>
                            📍 <b>Ubicación Confirmada:</b> La finca "{selectedFinca.nombre}" está ubicada a <b>{selectedFinca.altitud_promedio ? `${selectedFinca.altitud_promedio} msnm` : 'Nivel Desconocido'}</b>. 
                            {wizardData.loteId && (() => {
                              const l = lotesList.find(l => l.id_lote == wizardData.loteId);
                              return l ? ` Trabajando en lote: ${l.nombre} (${l.area_hectareas} Ha).` : '';
                            })()}
                          </p>
                        </div>
                        
                        {hasAltitudeError && (
                           <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                              <p style={{ margin: 0, color: '#ef4444', fontSize: '14px' }}>
                                ⚠️ <b>Faltan datos de altitud en la Finca.</b> Configura el nivel del mar para poder cargar los cultivos.
                              </p>
                           </div>
                        )}

                        {hasLotesError && (
                           <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                              <p style={{ margin: 0, color: '#ef4444', fontSize: '14px' }}>
                                ⚠️ <b>Finca sin Lotes.</b> Esta finca no tiene Lotes/Núcleos registrados. Debes crear al menos un Lote en esta Finca para continuar.
                              </p>
                           </div>
                        )}

                        {!hasAltitudeError && !hasLotesError ? (
                          <>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Según la altitud, estos son los {cultivosViables.length} cultivos recomendados:</p>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                              {cultivosViables.length > 0 ? cultivosViables.map(c => (
                                <div key={c.id}
                                  style={{ border: wizardData.cultivo === c.nombre ? '2px solid #3b82f6' : '1px solid var(--border)', background: wizardData.cultivo === c.nombre ? 'rgba(59,130,246,0.1)' : 'transparent', padding: '16px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center' }}
                                  onClick={() => setWizardData({...wizardData, cultivo: c.nombre})}
                                >
                                  <div style={{ height: '120px', marginBottom: '12px', borderRadius: '6px', overflow: 'hidden', position: 'relative', background: 'rgba(0,0,0,0.2)' }}>
                                    <img 
                                      src={c.imagen_url || `https://images.unsplash.com/photo-1592982537447-6f2334ed2846?auto=format&fit=crop&w=320&q=80`} 
                                      alt={c.nombre} 
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        if(e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                                      }}
                                    />
                                    <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
                                      🌱
                                    </div>
                                  </div>
                                  <h4 style={{ margin: 0, color: '#fff', fontSize: '15px' }}>{c.nombre}</h4>
                                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{c.tipo}</p>
                                </div>
                              )) : (
                                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No hay cultivos registrados para esta altitud.</p>
                              )}
                            </div>
                          </>
                        ) : null}
                      </>
                    )
                  })() : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                      👆 Selecciona una finca arriba para ver recomendaciones geográficas.
                    </div>
                  )}
                </div>
              )}

              {/* PASO 2 */}
              {wizardStep === 2 && (
                <div className="wizard-step">
                  <h4 style={{ color: '#fff', fontSize: '18px', marginBottom: '16px' }}>📏 2. Matemáticas Topográficas y Siembra</h4>
                  <div className="form-group">
                    <label style={{ color: 'var(--text-secondary)' }}>Área disponible para cultivar (Hectáreas):</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={wizardData.areaHectareas} 
                      onChange={(e) => setWizardData({...wizardData, areaHectareas: e.target.value})}
                      style={{ fontSize: '18px', padding: '12px', background: '#0f172a', border: '1px solid var(--primary)' }}
                    />
                  </div>

                  <div style={{ marginTop: '24px', background: '#0f172a', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
                    <h5 style={{ margin: '0 0 16px 0', color: '#fff', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Cálculo Técnico de Insumos:</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Surcos Trazados (0.8m dist):</p>
                        <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
                          {(wizardData.areaHectareas * 125).toLocaleString()} <span style={{fontSize:'12px'}}>Surcos</span>
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Plantas Estimadas (0.2m dist):</p>
                        <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                          {(wizardData.areaHectareas * 62500).toLocaleString()} <span style={{fontSize:'12px'}}>Plantas</span>
                        </p>
                      </div>
                      <div style={{ gridColumn: 'span 2', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '12px', borderRadius: '8px' }}>
                        <p style={{ margin: 0, fontSize: '12px', color: '#f59e0b' }}>Semilla Requerida para la Siembra:</p>
                        <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                          {(wizardData.areaHectareas * 45).toLocaleString()} <span style={{fontSize:'14px'}}>Kg de {wizardData.cultivo}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 3 */}
              {wizardStep === 3 && (
                <div className="wizard-step">
                  <h4 style={{ color: '#fff', fontSize: '18px', marginBottom: '16px' }}>💰 3. Proyección Financiera y Logística de Transporte</h4>
                  {loadingCosts && <p style={{ color: '#3b82f6' }}>Calculando inteligencia de negocios...</p>}
                  {!loadingCosts && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '20px' }}>
                    
                    {/* ENCABEZADO Y RESUMEN DEL PROYECTO */}
                    <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid #10b981', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h5 style={{ margin: 0, color: '#10b981', fontSize: '15px' }}>📋 Resumen del Proyecto: Cosecha de {wizardData.cultivo}</h5>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px' }}>
                        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Finca/Ubicación: </span>
                          <span style={{ color: '#fff', fontWeight: 'bold' }}>{fincasList.find(f => f.id_finca == wizardData.fincaId)?.nombre || ''}</span>
                        </div>
                        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Área Sembrada: </span>
                          <span style={{ color: '#fff', fontWeight: 'bold' }}>{wizardData.areaHectareas} Hectáreas</span>
                        </div>
                        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Duración del Ciclo: </span>
                          <span style={{ color: '#fff', fontWeight: 'bold' }}>{realCosts.receta.ciclo_dias || 120} días (~{Math.round((realCosts.receta.ciclo_dias || 120)/30)} meses)</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', alignItems: 'center' }}>
                        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Inicio (Siembra): </span>
                          <span style={{ color: '#fff', fontWeight: 'bold', marginTop: '4px' }}>
                            <input 
                              type="date" 
                              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: '#fff', borderRadius: '4px', padding: '6px', width: '100%', boxSizing: 'border-box' }} 
                              value={wizardData.fechaInicio || new Date().toISOString().split('T')[0]} 
                              onChange={(e) => setWizardData({...wizardData, fechaInicio: e.target.value})} 
                            />
                          </span>
                        </div>
                        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Fin (Cosecha Est.): </span>
                          <span style={{ color: '#fff', fontWeight: 'bold', marginTop: '4px', padding: '6px 0' }}>
                            {(() => {
                              const inicio = wizardData.fechaInicio ? new Date(wizardData.fechaInicio) : new Date();
                              inicio.setDate(inicio.getDate() + (realCosts.receta.ciclo_dias || 120));
                              return isNaN(inicio) ? 'Fecha Inválida' : inicio.toLocaleDateString();
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
                      <h5 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '15px' }}>Desglose de Costos de Producción (Motor Agronómico de Precisión):</h5>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--border)', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          👷 Mano de Obra ({(wizardData.areaHectareas * realCosts.receta.jornales).toLocaleString()} Jornales ajustados por región):
                        </span>
                        <span style={{ color: '#fff' }}>$ {(wizardData.areaHectareas * realCosts.receta.jornales * realCosts.jornal).toLocaleString()}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--border)', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          🌱 Insumos (<span style={{color: realCosts.fuenteInsumo.includes('Web') ? '#fbbf24' : '#10b981'}}>{realCosts.fuenteInsumo}</span>):
                        </span>
                        <span style={{ color: '#fff' }}>$ {(wizardData.areaHectareas * realCosts.insumos).toLocaleString()}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--border)', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          🚜 Maquinaria ({(wizardData.areaHectareas * realCosts.receta.horas_tractor).toLocaleString()} Horas Tractor/Alquiler):
                        </span>
                        <span style={{ color: '#fff' }}>$ {(wizardData.areaHectareas * realCosts.maquinaria).toLocaleString()}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--border)', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>📋 Gastos Varios e Imprevistos:</span>
                        <span style={{ color: '#fff' }}>$ {(wizardData.areaHectareas * realCosts.gastosVarios).toLocaleString()}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0 0', marginTop: '6px', fontSize: '14px', fontWeight: 'bold' }}>
                        <span style={{ color: '#ef4444' }}>Costo Total Proyectado:</span>
                        <span style={{ color: '#ef4444' }}>$ {(wizardData.areaHectareas * ((realCosts.jornal * realCosts.receta.jornales) + realCosts.insumos + realCosts.maquinaria + realCosts.gastosVarios)).toLocaleString()}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#0f172a', border: '1px solid var(--border)', borderRadius: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Precio de Mercado Actual ({wizardData.cultivo}):</span>
                      <span style={{ color: '#fff', fontWeight: 'bold' }}>$ {realCosts.precioMercado.toLocaleString()} / Kg</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#0f172a', border: '1px solid var(--border)', borderRadius: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Ventas Proyectadas ({(wizardData.areaHectareas * (realCosts.receta.rendimiento || 1800)).toLocaleString()} Kg):</span>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>$ {(wizardData.areaHectareas * (realCosts.receta.rendimiento || 1800) * realCosts.precioMercado).toLocaleString()}</span>
                    </div>
                    {(() => {
                      const totalCosto = wizardData.areaHectareas * ((realCosts.jornal * realCosts.receta.jornales) + realCosts.insumos + realCosts.maquinaria + realCosts.gastosVarios);
                      const totalVentas = wizardData.areaHectareas * (realCosts.receta.rendimiento || 1800) * realCosts.precioMercado;
                      const roi = totalVentas - totalCosto;
                      const isLoss = roi < 0;

                      return (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: isLoss ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', borderRadius: '8px', border: `1px solid ${isLoss ? '#ef4444' : '#10b981'}` }}>
                            <span style={{ color: isLoss ? '#ef4444' : '#10b981', fontSize: '18px', fontWeight: 'bold' }}>Ganancia o Pérdida Neta (ROI):</span>
                            <span style={{ color: isLoss ? '#ef4444' : '#10b981', fontSize: '20px', fontWeight: 'bold' }}>$ {roi.toLocaleString()}</span>
                          </div>

                          <div style={{ background: isLoss ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${isLoss ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`, padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                            <h5 style={{ margin: '0 0 8px 0', color: isLoss ? '#ef4444' : '#10b981', fontSize: '15px' }}>
                              {isLoss ? '⚠️ CONCEPTO AGRONÓMICO: INVIABLE' : '✨ CONCEPTO AGRONÓMICO: VIABLE'}
                            </h5>
                            <p style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
                              {isLoss 
                                ? `El proyecto arroja un ROI negativo. Los altos costos (especialmente la nómina operativa) superan el precio de venta esperado en el mercado. Recomendación: Evalúe rotar a un cultivo más rentable o tecnifique el lote implementando maquinaria para reducir drásticamente los ${(wizardData.areaHectareas * realCosts.receta.jornales).toLocaleString()} jornales proyectados.`
                                : `Excelente oportunidad comercial. El rendimiento de ${((realCosts.receta.rendimiento || 1800)/1000).toFixed(1)} toneladas por hectárea compensa holgadamente los costos logísticos y de personal, dejando un margen sólido. Ideal para iniciar agenda de campo.`}
                            </p>
                            
                            {realCosts.alternativas && realCosts.alternativas.length > 0 && (
                              <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px dashed var(--border)' }}>
                                <strong style={{ color: '#fbbf24', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                                  💡 Inteligencia de Mercado (Alternativas Sugeridas):
                                </strong>
                                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                  {realCosts.alternativas.map((alt, i) => (
                                    <li key={i} style={{ marginBottom: '4px' }}>
                                      Sembrar <b>{alt.cultivo}</b>: Precio actual a <b>${alt.precio.toLocaleString()}/Kg</b>. Proyección de ROI: <b style={{color: alt.roi_ha > 0 ? '#10b981' : '#ef4444'}}>${(alt.roi_ha * wizardData.areaHectareas).toLocaleString()}</b>.
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  )}

                  <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                    <h5 style={{ margin: '0 0 8px 0', color: '#3b82f6', fontSize: '14px' }}>🚛 Directorio Logístico (Transportadores Disponibles):</h5>
                    <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      Cosecha estimada a mover: <b>{(wizardData.areaHectareas * ((realCosts.receta.rendimiento || 1800)/1000)).toFixed(1)} Toneladas</b>.
                    </p>
                    
                    {realCosts.transportadores && realCosts.transportadores.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {realCosts.transportadores.map((t, idx) => {
                          const totalToneladas = wizardData.areaHectareas * ((realCosts.receta.rendimiento || 1800)/1000);
                          const totalFlete = totalToneladas * (t.precio_tonelada_promedio || 0);
                          const camiones = Math.ceil(totalToneladas / (t.capacidad_toneladas || 1));
                          
                          return (
                            <div key={idx} style={{ background: '#0f172a', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div>
                                  <strong style={{ color: '#fff', fontSize: '14px', display: 'block' }}>{t.nombre}</strong>
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                                    📍 {t.ciudad_base} | RNDC: {t.registro_nacional_carga} | {t.tipo_vehiculos}
                                  </span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ color: '#fbbf24', fontSize: '12px', marginBottom: '2px' }}>
                                    {'⭐'.repeat(Math.floor(t.calificacion_estrellas || 5))} {Number(t.calificacion_estrellas).toFixed(1)}
                                  </div>
                                  <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '13px' }}>
                                    ${Number(t.precio_tonelada_promedio).toLocaleString()} / Ton
                                  </div>
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border)', paddingTop: '8px' }}>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                                  Costo Estimado: <b style={{color: '#fff'}}>${totalFlete.toLocaleString()}</b> ({camiones} Viajes)
                                </div>
                                
                                {t.tiene_whatsapp ? (
                                  <a 
                                    href={`https://wa.me/${t.telefono.replace(/\+/g, '')}?text=${encodeURIComponent(`Hola ${t.nombre}, los contacto desde AgroPaccioli. Quisiera cotizar un flete para transportar ${totalToneladas.toFixed(1)} Toneladas de ${wizardData.cultivo} desde mi finca.`)}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="btn-secondary" 
                                    style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <span style={{ fontSize: '14px' }}>💬</span> Cotizar
                                  </a>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>📞 {t.telefono}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                        No hay transportadores registrados para esta especialidad.
                      </p>
                    )}
                  </div>

                  {/* Export Actions */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                    <button onClick={handleExportarPDF} className="btn-secondary" style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                      📄 Exportar PDF
                    </button>
                    <button onClick={handleExportarExcel} className="btn-secondary" style={{ flex: 1, padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                      📊 Exportar Excel
                    </button>
                    <button onClick={handleWhatsApp} className="btn-secondary" style={{ flex: 1, padding: '10px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                      📲 Enviar por WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <button 
                className="btn btn-outline" 
                onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : setShowWizard(false)}
              >
                {wizardStep > 1 ? '← Atrás' : 'Cancelar'}
              </button>
              
              {wizardStep < 3 ? (
                <button 
                  className="btn btn-primary" 
                  style={{ background: '#3b82f6', color: 'white', border: 'none' }}
                  onClick={() => {
                    if (wizardStep === 1 && !wizardData.cultivo) {
                      alert('Por favor selecciona un cultivo viable.');
                      return;
                    }
                    setWizardStep(wizardStep + 1);
                  }}
                  disabled={wizardStep === 1 && !wizardData.fincaId}
                >
                  Siguiente Paso →
                </button>
              ) : (
                <button 
                  className="btn btn-primary" 
                  style={{ background: '#10b981', color: 'white', border: 'none', fontWeight: 'bold' }}
                  onClick={() => {
                    alert("¡Simulación guardada con éxito en el historial!");
                    setShowWizard(false);
                    setSelectedSimulation('sim_2');
                  }}
                >
                  💾 Guardar y Generar Cronograma
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default TaskPlanner;
