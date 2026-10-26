import React, { useState, useEffect, useMemo } from 'react';
import DatePickerClaro from '../Common/DatePickerClaro';
import { 
  Droplet, Gauge, Calendar, Clock, Waves, CheckCircle, 
  AlertTriangle, Plus, Search, RefreshCw, Send, CheckCircle2,
  FileText, Sliders, ShieldCheck, ChevronRight, X, User, Activity,
  Smartphone, Monitor, Power, Zap, Play, Square, MessageCircle,
  Settings2, Filter, FlaskConical, MapPin, Check
} from 'lucide-react';
import { authFetch } from '../../utils/api';
import ExportButtons from '../ExportButtons';
import Pagination from '../Pagination';
import CalculadoraFertirriegoAgroPaccioli from './CalculadoraFertirriegoAgroPaccioli';
import AyudaCampesina from '../Common/AyudaCampesina';
import ManualitoCampesinoModal from '../Common/ManualitoCampesinoModal';
import './RiegoPrecisionManager.css';

export default function RiegoPrecisionManager() {
  // Dual-UX Mode: 'campesino' (Mobile/Operario simple) | 'ingeniero' (PC/Técnico avanzado)
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('sas_riego_view_mode') || 'campesino';
  });

  const [activeTab, setActiveTab] = useState('calculadora'); // Pestañas modo ingeniero

  // Catálogos principales
  const [fincas, setFincas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [sectores, setSectores] = useState([]);
  const [bombas, setBombas] = useState([]);
  const [valvulas, setValvulas] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [fertirriegoRecetas, setFertirriegoRecetas] = useState([]);

  // Filtros
  const [selectedFinca, setSelectedFinca] = useState('');
  const [selectedLote, setSelectedLote] = useState('');
  const [selectedSectorId, setSelectedSectorId] = useState('');

  // Programaciones e Historial FAO
  const [programaciones, setProgramaciones] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Filtros de tabla y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modales
  const [showModalSector, setShowModalSector] = useState(false);
  const [showModalTurno, setShowModalTurno] = useState(false);
  const [showModalBomba, setShowModalBomba] = useState(false);
  const [showModalValvula, setShowModalValvula] = useState(false);
  const [showModalFertirriego, setShowModalFertirriego] = useState(false);
  const [showModalUniformidad, setShowModalUniformidad] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ---------------------------------------------------------------------------
  // ESTADOS DE FORMULARIOS LIMPIOS (SIN REGISTROS DEMO NI HARDCODEADOS)
  // ---------------------------------------------------------------------------
  const initialSectorForm = {
    id_finca: '',
    id_lote: '',
    codigo_sector: '',
    nombre: '',
    metodo_riego: 'Goteo',
    caudal_diseno_lps: '',
    presion_trabajo_bar: '',
    espaciamiento_emisores_m: '',
    espaciamiento_lineas_m: '',
    caudal_emisor_lph: '',
    eficiencia_aplicacion_ea_porc: '90.00',
    area_sector_ha: '',
    estado: 'Operativo'
  };
  const [sectorForm, setSectorForm] = useState(initialSectorForm);

  const initialTurnoForm = {
    id_finca: '',
    id_lote: '',
    id_sector: '',
    codigo_turno: '',
    responsable_nombre: '',
    responsable_telefono: '',
    fecha_riego: new Date().toISOString().split('T')[0],
    hora_inicio_programada: '06:00',
    hora_fin_programada: '08:30',
    duracion_minutos_estimada: '150',
    volumen_objetivo_m3: '',
    observaciones: ''
  };
  const [turnoForm, setTurnoForm] = useState(initialTurnoForm);

  const initialBombaForm = {
    id_finca: '',
    codigo_bomba: '',
    nombre: '',
    tipo_bomba: 'Centrifuga_Superficie',
    potencia_hp: '',
    caudal_nominal_lps: '',
    presion_nominal_bar: '',
    fuente_energia: 'Red_Electrica',
    estado_operativo: 'Apagada',
    notas: ''
  };
  const [bombaForm, setBombaForm] = useState(initialBombaForm);

  const initialValvulaForm = {
    id_sector: '',
    codigo_valvula: '',
    nombre: '',
    tipo_actuador: 'Solenoide_24VAC',
    diametro_pulgadas: '2.0',
    modo_control: 'Manual_Campo',
    estado_actual: 'Cerrada'
  };
  const [valvulaForm, setValvulaForm] = useState(initialValvulaForm);

  const initialFertirriegoForm = {
    id_sector: '',
    nombre_receta: '',
    etapa_fenologica: '',
    ce_objetivo_ms_cm: '',
    ph_objetivo: '',
    tanque_a_formula: '',
    tanque_a_tasa_inyeccion_l_h: '',
    tanque_b_formula: '',
    tanque_b_tasa_inyeccion_l_h: '',
    acido_tipo: 'Acido Fosforico 85%'
  };
  const [fertirriegoForm, setFertirriegoForm] = useState(initialFertirriegoForm);

  const initialUniformidadForm = {
    id_sector: '',
    fecha_ensayo: new Date().toISOString().split('T')[0],
    presion_cabezal_bar: '',
    presion_cola_bar: '',
    evaluador: '',
    observaciones: '',
    lecturas_texto: ''
  };
  const [uniformidadForm, setUniformidadForm] = useState(initialUniformidadForm);

  // Parámetros Calculadora FAO-56
  const [faoParams, setFaoParams] = useState({
    id_sector: '',
    fecha_programada: new Date().toISOString().split('T')[0],
    et0: '',
    kc: '',
    precipitacion_efectiva: '0.00',
    eficiencia_riego: '90.00',
    precipitacion_sistema: '',
    area_ha: '',
    observaciones: ''
  });
  const [calculoResultado, setCalculoResultado] = useState(null);

  // ---------------------------------------------------------------------------
  // EFECTOS Y CARGA DE DATOS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    localStorage.setItem('sas_riego_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    fetchFincasYLotes();
    fetchSectores();
    fetchBombas();
    fetchValvulas();
    fetchTurnos();
    fetchProgramaciones();
    fetchFertirriego();
  }, []);

  const fetchFincasYLotes = async () => {
    try {
      const [resFincas, resLotes] = await Promise.all([
        authFetch('/api/tables/fincas'),
        authFetch('/api/suelos/catalogos/lotes')
      ]);
      const dataFincas = await resFincas.json();
      const dataLotes = await resLotes.json();
      if (Array.isArray(dataFincas)) {
        setFincas(dataFincas);
        if (dataFincas.length > 0 && !selectedFinca) {
          setSelectedFinca(dataFincas[0].id_finca);
        }
      }
      if (Array.isArray(dataLotes)) setLotes(dataLotes);
    } catch (err) {
      console.error('Error cargando catálogos:', err);
    }
  };

  const fetchSectores = async () => {
    setLoading(true);
    try {
      let url = '/api/riego-precision/sectores';
      const params = new URLSearchParams();
      if (selectedFinca) params.append('fincaId', selectedFinca);
      if (selectedLote) params.append('loteId', selectedLote);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await authFetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSectores(data);
        if (data.length > 0 && !selectedSectorId) {
          setSelectedSectorId(data[0].id_sector);
          setFaoParams(prev => ({
            ...prev,
            id_sector: data[0].id_sector,
            precipitacion_sistema: data[0].precipitacion_sistema_mm_h || '',
            eficiencia_riego: data[0].eficiencia_aplicacion_ea_porc || '90.00',
            area_ha: data[0].area_sector_ha || ''
          }));
        }
      }
    } catch (err) {
      console.error('Error cargando sectores:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBombas = async () => {
    try {
      let url = '/api/riego-precision/bombas';
      if (selectedFinca) url += `?fincaId=${selectedFinca}`;
      const res = await authFetch(url);
      const data = await res.json();
      if (Array.isArray(data)) setBombas(data);
    } catch (err) {
      console.error('Error cargando bombas:', err);
    }
  };

  const fetchValvulas = async () => {
    try {
      const res = await authFetch('/api/riego-precision/valvulas');
      const data = await res.json();
      if (Array.isArray(data)) setValvulas(data);
    } catch (err) {
      console.error('Error cargando válvulas:', err);
    }
  };

  const fetchTurnos = async () => {
    try {
      let url = '/api/riego-precision/turnos';
      if (selectedFinca) url += `?fincaId=${selectedFinca}`;
      const res = await authFetch(url);
      const data = await res.json();
      if (Array.isArray(data)) setTurnos(data);
    } catch (err) {
      console.error('Error cargando turnos:', err);
    }
  };

  const fetchProgramaciones = async () => {
    try {
      const res = await authFetch('/api/riego-precision/programaciones');
      const data = await res.json();
      if (Array.isArray(data)) setProgramaciones(data);
    } catch (err) {
      console.error('Error cargando programaciones:', err);
    }
  };

  const fetchFertirriego = async () => {
    try {
      const res = await authFetch('/api/riego-precision/fertirriego');
      const data = await res.json();
      if (Array.isArray(data)) setFertirriegoRecetas(data);
    } catch (err) {
      console.error('Error cargando fertirriego:', err);
    }
  };

  const fetchEvaluaciones = async (sectorId) => {
    if (!sectorId) return;
    try {
      const res = await authFetch(`/api/riego-precision/evaluaciones/${sectorId}`);
      const data = await res.json();
      if (Array.isArray(data)) setEvaluaciones(data);
    } catch (err) {
      console.error('Error cargando evaluaciones:', err);
    }
  };

  useEffect(() => {
    fetchSectores();
    fetchBombas();
    fetchTurnos();
  }, [selectedFinca, selectedLote]);

  // ---------------------------------------------------------------------------
  // ACCIONES RÁPIDAS MODO CAMPESINO
  // ---------------------------------------------------------------------------
  const handleAccionTurno = async (idTurno, accion) => {
    try {
      const res = await authFetch(`/api/riego-precision/turnos/${idTurno}/accion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion,
          confirmado_por: 'Operario de Campo'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al ejecutar acción');

      setFeedbackMsg({
        type: 'success',
        text: `Turno actualizado a ${data.estado.replace('_', ' ')} correctamente.`
      });
      fetchTurnos();
      fetchSectores();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message });
    }
  };

  const handleToggleBomba = async (idBomba, estadoActual) => {
    const nuevoEstado = estadoActual === 'En_Marcha' ? 'Apagada' : 'En_Marcha';
    try {
      const res = await authFetch(`/api/riego-precision/bombas/${idBomba}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevo_estado: nuevoEstado })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar bomba');

      setFeedbackMsg({
        type: 'success',
        text: `Bomba ${nuevoEstado === 'En_Marcha' ? 'ENCENDIDA' : 'APAGADA'} con éxito.`
      });
      fetchBombas();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message });
    }
  };

  const handleToggleValvula = async (idValvula, estadoActual) => {
    const nuevoEstado = estadoActual === 'Abierta' ? 'Cerrada' : 'Abierta';
    try {
      const res = await authFetch(`/api/riego-precision/valvulas/${idValvula}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevo_estado: nuevoEstado })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al alternar válvula');

      setFeedbackMsg({
        type: 'success',
        text: `Válvula ${nuevoEstado.toUpperCase()} con éxito.`
      });
      fetchValvulas();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message });
    }
  };

  const handleWhatsAppCampesino = (turno) => {
    const mensaje = `💧 *TURNO DE RIEGO ASIGNADO*\n\n` +
      `👤 *Regador:* ${turno.responsable_nombre}\n` +
      `📍 *Lote / Sector:* ${turno.lote_nombre} - ${turno.sector_nombre}\n` +
      `📅 *Fecha:* ${turno.fecha_riego}\n` +
      `⏰ *Horario:* ${turno.hora_inicio_programada} a ${turno.hora_fin_programada}\n` +
      `⏱️ *Duración:* ${turno.duracion_minutos_estimada} minutos\n` +
      `🌊 *Volumen Objetivo:* ${turno.volumen_objetivo_m3 || 'Según lámina'} m³\n\n` +
      `_Favor responder a este mensaje cuando abra y cierre la válvula._`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  // ---------------------------------------------------------------------------
  // MOTOR DE CÁLCULO FAO-56 (MODO INGENIERO)
  // ---------------------------------------------------------------------------
  const handleCalcularFAO = async () => {
    if (!faoParams.id_sector || !faoParams.et0 || !faoParams.kc) {
      setFeedbackMsg({ type: 'error', text: 'Complete Sector, ET0 y Kc para calcular el balance FAO-56.' });
      return;
    }

    try {
      const et0 = parseFloat(faoParams.et0);
      const kc = parseFloat(faoParams.kc);
      const etc = +(et0 * kc).toFixed(2);
      const pe = parseFloat(faoParams.precipitacion_efectiva) || 0;
      const ln = +(Math.max(0, etc - pe)).toFixed(2);
      const ea = (parseFloat(faoParams.eficiencia_riego) || 90) / 100;
      const lb = +(ln / ea).toFixed(2);

      const pr = parseFloat(faoParams.precipitacion_sistema) || 2.5;
      const tiempoBombeoHoras = +(lb / pr).toFixed(2);
      const areaHa = parseFloat(faoParams.area_ha) || 1.0;
      const volumenM3 = +(lb * areaHa * 10).toFixed(2);

      const resCalculo = {
        etc,
        ln,
        lb,
        tiempoBombeoHoras,
        volumenM3,
        precipitacionSistema: pr
      };
      setCalculoResultado(resCalculo);

      setFeedbackMsg({
        type: 'success',
        text: `Cálculo agronómico completado: Bombeo requerido = ${tiempoBombeoHoras} h (${volumenM3} m³).`
      });
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Error calculando balance hídrico: ' + err.message });
    }
  };

  const handleProgramarRiegoDirecto = async () => {
    if (!calculoResultado) return;
    setSubmitting(true);
    try {
      const payload = {
        id_sector: faoParams.id_sector,
        fecha_programada: faoParams.fecha_programada,
        et0: faoParams.et0,
        kc: faoParams.kc,
        precipitacion_efectiva: faoParams.precipitacion_efectiva,
        eficiencia_riego: faoParams.eficiencia_riego,
        precipitacion_sistema: faoParams.precipitacion_sistema,
        area_ha: faoParams.area_ha,
        observaciones: faoParams.observaciones
      };

      const res = await authFetch('/api/riego-precision/programar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al programar');

      setFeedbackMsg({ type: 'success', text: 'Riego programado y guardado en base de datos con éxito.' });
      fetchProgramaciones();
      fetchTurnos();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // GUARDAR FORMULARIOS LIMPIOS
  // ---------------------------------------------------------------------------
  const handleGuardarSector = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authFetch('/api/riego-precision/sectores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sectorForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creando sector');

      setFeedbackMsg({ type: 'success', text: 'Sector hídrico registrado exitosamente en BD.' });
      setShowModalSector(false);
      setSectorForm(initialSectorForm);
      fetchSectores();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuardarTurno = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authFetch('/api/riego-precision/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(turnoForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creando turno');

      setFeedbackMsg({ type: 'success', text: 'Turno de campo programado con éxito.' });
      setShowModalTurno(false);
      setTurnoForm(initialTurnoForm);
      fetchTurnos();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuardarBomba = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authFetch('/api/riego-precision/bombas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bombaForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error registrando bomba');

      setFeedbackMsg({ type: 'success', text: 'Bomba registrada en base de datos con éxito.' });
      setShowModalBomba(false);
      setBombaForm(initialBombaForm);
      fetchBombas();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuardarValvula = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authFetch('/api/riego-precision/valvulas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valvulaForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creando válvula');

      setFeedbackMsg({ type: 'success', text: 'Válvula solenoide registrada con éxito.' });
      setShowModalValvula(false);
      setValvulaForm(initialValvulaForm);
      fetchValvulas();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuardarFertirriego = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authFetch('/api/riego-precision/fertirriego', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fertirriegoForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creando receta');

      setFeedbackMsg({ type: 'success', text: 'Receta de fertirriego guardada con éxito.' });
      setShowModalFertirriego(false);
      setFertirriegoForm(initialFertirriegoForm);
      fetchFertirriego();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuardarUniformidad = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const numeros = uniformidadForm.lecturas_texto
        .split(/[\s,]+/)
        .map(v => parseFloat(v))
        .filter(v => !isNaN(v));

      if (numeros.length < 4) {
        throw new Error('Debe ingresar al menos 4 números para calcular Christiansen.');
      }

      const res = await authFetch('/api/riego-precision/evaluacion-uniformidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...uniformidadForm,
          lecturas_volumen_ml: numeros
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error evaluando uniformidad');

      setFeedbackMsg({
        type: 'success',
        text: `Ensayo registrado: CU = ${data.coeficiente_christiansen_cu}%, DU = ${data.uniformidad_distribucion_du}% (${data.diagnostico})`
      });
      setShowModalUniformidad(false);
      setUniformidadForm(initialUniformidadForm);
      fetchSectores();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // EXPORTACIONES Y FILTROS TABLA
  // ---------------------------------------------------------------------------
  const exportColumns = [
    { header: 'Fecha', accessor: 'fecha_programada' },
    { header: 'Sector', accessor: 'codigo_sector' },
    { header: 'Finca', accessor: 'finca_nombre' },
    { header: 'Lote', accessor: 'lote_nombre' },
    { header: 'Lámina Bruta (mm)', accessor: 'lamina_bruta_mm' },
    { header: 'Horas Bombeo', accessor: 'horas_riego_calculadas' },
    { header: 'Volumen (m3)', accessor: 'volumen_total_m3' },
    { header: 'Estado', accessor: 'estado' },
    { header: 'Ejecutado Por', accessor: 'ejecutado_por' }
  ];

  const filteredProgramaciones = useMemo(() => {
    return programaciones.filter(p => {
      const search = searchTerm.toLowerCase();
      return (
        p.codigo_sector?.toLowerCase().includes(search) ||
        p.sector_nombre?.toLowerCase().includes(search) ||
        p.finca_nombre?.toLowerCase().includes(search) ||
        p.estado?.toLowerCase().includes(search)
      );
    });
  }, [programaciones, searchTerm]);

  const paginatedProgramaciones = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProgramaciones.slice(start, start + itemsPerPage);
  }, [filteredProgramaciones, currentPage]);

  // Turnos mapeados para semáforo campesino
  const turnosHoy = useMemo(() => {
    return turnos;
  }, [turnos]);

  return (
    <div className="riego-precision-container">
      {/* HEADER PRINCIPAL CON DUAL-UX SWITCHER */}
      <div className="riego-header">
        <div className="header-titles">
          <div className="badge-modulo-riego">SISTEMA INTELIGENTE DE RIEGO SAS • AGTECH</div>
          <h2>Control y Automatización Hídrica</h2>
          <p>Operación intuitiva de campo (móviles y tabletas) y balance bioclimático FAO-56 de precisión.</p>
        </div>

        {/* CONMUTADOR DUAL MODO */}
        <div className="mode-switch-card">
          <button 
            type="button"
            className={`mode-btn campesino ${viewMode === 'campesino' ? 'active' : ''}`}
            onClick={() => setViewMode('campesino')}
          >
            <Smartphone size={18} />
            <span>Modo Campesino (Móvil)</span>
          </button>

          <button 
            type="button"
            className={`mode-btn ${viewMode === 'ingeniero' ? 'active' : ''}`}
            onClick={() => setViewMode('ingeniero')}
          >
            <Monitor size={18} />
            <span>Modo Ingeniero (Avanzado)</span>
          </button>
        </div>

        <div className="header-actions">
          <button 
            className="btn-refresh" 
            onClick={() => {
              setRefreshing(true);
              fetchSectores();
              fetchBombas();
              fetchValvulas();
              fetchTurnos();
              fetchProgramaciones();
              setTimeout(() => setRefreshing(false), 500);
            }} 
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            <span>Actualizar</span>
          </button>

          {viewMode === 'campesino' ? (
            <button 
              className="btn-primary-riego"
              onClick={() => {
                setTurnoForm({
                  ...initialTurnoForm,
                  id_finca: selectedFinca || ''
                });
                setShowModalTurno(true);
              }}
            >
              <Plus size={16} />
              <span>Programar Turno</span>
            </button>
          ) : (
            <button 
              className="btn-primary-riego"
              onClick={() => {
                setSectorForm(initialSectorForm);
                setShowModalSector(true);
              }}
            >
              <Plus size={16} />
              <span>Nuevo Sector Hídrico</span>
            </button>
          )}
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedbackMsg && (
        <div className={`feedback-banner ${feedbackMsg.type}`}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{feedbackMsg.text}</span>
          <button className="close-banner" onClick={() => setFeedbackMsg(null)}>×</button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA 1: MODO CAMPESINO (MOBILE FIRST, TOUCH FRIENDLY, OPERARIO SIMPLE) */}
      {/* ===================================================================== */}
      {viewMode === 'campesino' && (
        <div className="modo-campesino-container">
          {/* BANNER AMIGABLE PARA EL OPERARIO */}
          <div className="banner-campesino-ayuda" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div className="campesino-text" style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                <h3 style={{ margin: 0 }}>🌾 Tablero Rápido de Riego para el Operario</h3>
                <ManualitoCampesinoModal 
                  modulo="Tablero de Riego del Operario"
                  tituloBoton="🌾 ¿Cómo funciona este tablero? (Guía en 3 Pasos)"
                  pasos={[
                    {
                      titulo: "Paso 1: Mire el color de su sector",
                      detalle: "Si está verde, le toca regar hoy. Si está azul con olas, ya tiene agua corriendo. Si está gris, el suelo todavía tiene humedad y no necesita riego.",
                      audio: "Paso uno. Mire el color del sector. Verde significa regar hoy. Azul significa que ya está regando. Y gris significa que el suelo está húmedo."
                    },
                    {
                      titulo: "Paso 2: Registrar arranque y apagado del motor",
                      detalle: "Al prender la bomba o abrir la llave, toque 'Iniciar Riego' para que el sistema empiece a contar los minutos.",
                      audio: "Paso dos. Al prender la bomba o abrir la llave, toque Iniciar Riego para que el sistema cuente el tiempo."
                    },
                    {
                      titulo: "Paso 3: Notificar y finalizar",
                      detalle: "Al terminar el turno, toque 'Finalizar' y envíe el reporte de metros cúbicos por WhatsApp con un solo toque.",
                      audio: "Paso tres. Al terminar el turno toque Finalizar y puede enviar el reporte por WhatsApp con un solo toque."
                    }
                  ]}
                />
              </div>
              <p style={{ margin: 0 }}>Mire el color de cada sector: Verde indica regar hoy; Azul indica que está regando ahora; y Gris/Rojo indica suelo húmedo.</p>
            </div>
            <div className="finca-quick-filter">
              <select 
                value={selectedFinca} 
                onChange={(e) => setSelectedFinca(e.target.value)}
                style={{ minHeight: '44px', padding: '8px 14px', borderRadius: '10px', fontWeight: '700' }}
              >
                <option value="">Todas las Fincas</option>
                {fincas.map(f => (
                  <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* KPIS RÁPIDOS */}
          <div className="campesino-kpis-grid">
            <div className="campesino-kpi-card">
              <div className="campesino-kpi-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                <Waves size={24} />
              </div>
              <div className="campesino-kpi-info">
                <div className="kpi-num">{turnos.filter(t => t.estado === 'En_Riego').length}</div>
                <div className="kpi-lbl">Sectores Regando Ahora</div>
              </div>
            </div>

            <div className="campesino-kpi-card">
              <div className="campesino-kpi-icon" style={{ background: '#dcfce7', color: '#15803d' }}>
                <Clock size={24} />
              </div>
              <div className="campesino-kpi-info">
                <div className="kpi-num">{turnos.filter(t => t.estado === 'Pendiente').length}</div>
                <div className="kpi-lbl">Turnos Pendientes Hoy</div>
              </div>
            </div>

            <div className="campesino-kpi-card">
              <div className="campesino-kpi-icon" style={{ background: '#fef9c3', color: '#a16207' }}>
                <CheckCircle2 size={24} />
              </div>
              <div className="campesino-kpi-info">
                <div className="kpi-num">{turnos.filter(t => t.estado === 'Completado').length}</div>
                <div className="kpi-lbl">Riegos Finalizados</div>
              </div>
            </div>

            <div className="campesino-kpi-card">
              <div className="campesino-kpi-icon" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                <Zap size={24} />
              </div>
              <div className="campesino-kpi-info">
                <div className="kpi-num">{bombas.filter(b => b.estado_operativo === 'En_Marcha').length} / {bombas.length}</div>
                <div className="kpi-lbl">Bombas en Marcha</div>
              </div>
            </div>
          </div>

          {/* CONTROL RÁPIDO DE BOMBAS (BOTONES TÁCTILES GIGANTES) */}
          <div className="bomba-quick-panel">
            <div className="bomba-quick-header">
              <h4><Zap size={18} color="#eab308" /> Equipos de Bombeo de la Finca</h4>
              <button 
                className="btn-cancel"
                onClick={() => {
                  setBombaForm({ ...initialBombaForm, id_finca: selectedFinca || '' });
                  setShowModalBomba(true);
                }}
              >
                + Registrar Bomba
              </button>
            </div>

            {bombas.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '13px' }}>No hay bombas registradas aún. Use el botón superior para agregar una bomba.</p>
            ) : (
              <div className="bombas-cards-flex">
                {bombas.map(b => (
                  <div key={b.id_bomba} className={`bomba-touch-card ${b.estado_operativo.toLowerCase()}`}>
                    <div>
                      <div className="bomba-title">{b.nombre} ({b.codigo_bomba})</div>
                      <div className="bomba-sub">
                        {b.potencia_hp} HP • {b.caudal_nominal_lps} L/s • {b.presion_nominal_bar} bar
                      </div>
                    </div>

                    <button 
                      className={`btn-bomba-power ${b.estado_operativo === 'En_Marcha' ? 'on' : 'off'}`}
                      onClick={() => handleToggleBomba(b.id_bomba, b.estado_operativo)}
                    >
                      <Power size={18} />
                      <span>{b.estado_operativo === 'En_Marcha' ? 'APAGAR' : 'ENCENDER'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEMÁFORO HÍDRICO DE SECTORES Y TURNOS */}
          <div>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
              💧 Semáforo de Riego por Lotes & Sectores
            </h3>

            {turnosHoy.length === 0 ? (
              <div style={{ background: '#ffffff', padding: '30px', borderRadius: '16px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <Clock size={40} color="#94a3b8" style={{ marginBottom: '10px' }} />
                <h4 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>No hay turnos de riego activos registrados</h4>
                <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px 0' }}>
                  Haga clic en "Programar Turno" para asignar un horario de riego al regador.
                </p>
                <button 
                  className="btn-primary-riego"
                  onClick={() => {
                    setTurnoForm({ ...initialTurnoForm, id_finca: selectedFinca || '' });
                    setShowModalTurno(true);
                  }}
                  style={{ margin: '0 auto' }}
                >
                  <Plus size={16} />
                  <span>Programar Primer Turno</span>
                </button>
              </div>
            ) : (
              <div className="semaforo-grid">
                {turnosHoy.map(t => {
                  const esEnRiego = t.estado === 'En_Riego';
                  const esCompletado = t.estado === 'Completado';
                  const esPendiente = t.estado === 'Pendiente';

                  return (
                    <div 
                      key={t.id_turno} 
                      className={`semaforo-card ${esEnRiego ? 'en-riego' : esPendiente ? 'regar-hoy' : 'no-regar'}`}
                    >
                      <div>
                        <div className="semaforo-badge-status">
                          {esEnRiego && '🔵 EN RIEGO AHORA'}
                          {esPendiente && '🟢 REGAR HOY'}
                          {esCompletado && '⚪ RIEGO TERMINADO'}
                          {t.estado === 'Cancelado' && '🔴 CANCELADO'}
                        </div>

                        <div className="semaforo-title">{t.sector_nombre}</div>
                        <div className="semaforo-location">
                          <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
                          {t.finca_nombre} • {t.lote_nombre}
                        </div>

                        <div className="semaforo-detail-box">
                          <div className="detail-row">
                            <span>Horario Programado:</span>
                            <strong>{t.hora_inicio_programada} - {t.hora_fin_programada}</strong>
                          </div>
                          <div className="detail-row">
                            <span>Duración Asignada:</span>
                            <strong>{t.duracion_minutos_estimada} min ({+(t.duracion_minutos_estimada / 60).toFixed(1)} h)</strong>
                          </div>
                          <div className="detail-row">
                            <span>Responsable en Campo:</span>
                            <strong>{t.responsable_nombre}</strong>
                          </div>
                          {t.volumen_objetivo_m3 > 0 && (
                            <div className="detail-row">
                              <span>Volumen Estimado:</span>
                              <strong>{t.volumen_objetivo_m3} m³</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* BOTONES TÁCTILES GRANDES */}
                      <div className="semaforo-actions">
                        {esPendiente && (
                          <button 
                            className="btn-campesino-action btn-iniciar-riego"
                            onClick={() => handleAccionTurno(t.id_turno, 'INICIAR')}
                          >
                            <Play size={18} />
                            <span>COMENZAR RIEGO AHORA</span>
                          </button>
                        )}

                        {esEnRiego && (
                          <button 
                            className="btn-campesino-action btn-completar-riego"
                            onClick={() => handleAccionTurno(t.id_turno, 'COMPLETAR')}
                          >
                            <Square size={18} />
                            <span>CONFIRMAR TERMINADO</span>
                          </button>
                        )}

                        <button 
                          className="btn-whatsapp-orden"
                          onClick={() => handleWhatsAppCampesino(t)}
                        >
                          <MessageCircle size={18} />
                          <span>Enviar WhatsApp al Regador</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA 2: MODO INGENIERO (TÉCNICO, FAO-56, FERTIRRIEGO, CHRISTIANSEN)   */}
      {/* ===================================================================== */}
      {viewMode === 'ingeniero' && (
        <div>
          {/* TABS DE NAVEGACIÓN TÉCNICA */}
          <div className="precision-tabs-nav">
            <button 
              className={`tab-btn ${activeTab === 'calculadora' ? 'active' : ''}`}
              onClick={() => setActiveTab('calculadora')}
            >
              <Gauge size={16} />
              <span>Calculadora Bioclimática FAO-56</span>
            </button>

            <button 
              className={`tab-btn ${activeTab === 'programaciones' ? 'active' : ''}`}
              onClick={() => setActiveTab('programaciones')}
            >
              <Calendar size={16} />
              <span>Historial de Riegos ({programaciones.length})</span>
            </button>

            <button 
              className={`tab-btn ${activeTab === 'sectores' ? 'active' : ''}`}
              onClick={() => setActiveTab('sectores')}
            >
              <Droplet size={16} />
              <span>Sectores Hídricos ({sectores.length})</span>
            </button>

            <button 
              className={`tab-btn ${activeTab === 'hardware' ? 'active' : ''}`}
              onClick={() => setActiveTab('hardware')}
            >
              <Zap size={16} />
              <span>Telemetría Válvulas & Bombas</span>
            </button>

            <button 
              className={`tab-btn ${activeTab === 'fertirriego' ? 'active' : ''}`}
              onClick={() => setActiveTab('fertirriego')}
            >
              <FlaskConical size={16} />
              <span>Fertirriego & Soluciones Nutritivas</span>
            </button>

            <button 
              className={`tab-btn ${activeTab === 'uniformidad' ? 'active' : ''}`}
              onClick={() => setActiveTab('uniformidad')}
            >
              <Sliders size={16} />
              <span>Evaluación Christiansen (CU / DU)</span>
            </button>
          </div>

          {/* TAB 1: CALCULADORA FAO-56 */}
          {activeTab === 'calculadora' && (
            <div className="calculadora-grid-layout">
              {/* ENTRADAS */}
              <div className="calc-inputs-card">
                <div className="card-top-title">
                  <Gauge size={18} color="#0284c7" />
                  <h4>Variables Bioclimáticas & Coeficientes de Cultivo</h4>
                </div>

                <div className="calc-form-body">
                  <div className="form-group">
                    <label>Sector Hídrico Destino *</label>
                    <select 
                      value={faoParams.id_sector} 
                      onChange={(e) => {
                        const sec = sectores.find(s => s.id_sector === parseInt(e.target.value));
                        setFaoParams({
                          ...faoParams,
                          id_sector: e.target.value,
                          precipitacion_sistema: sec?.precipitacion_sistema_mm_h || '',
                          eficiencia_riego: sec?.eficiencia_aplicacion_ea_porc || '90.00',
                          area_ha: sec?.area_sector_ha || ''
                        });
                      }}
                    >
                      <option value="">Seleccione Sector</option>
                      {sectores.map(s => (
                        <option key={s.id_sector} value={s.id_sector}>
                          {s.codigo_sector} - {s.nombre} ({s.metodo_riego})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Fecha de la Prescripción</label>
                    <DatePickerClaro value={faoParams.fecha_programada}
                      onChange={(e) => setFaoParams({ ...faoParams, fecha_programada: e.target.value })} />
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Evapotranspiración Referencia $ET_0$ (mm/día) *</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="Ej. 4.80"
                        value={faoParams.et0}
                        onChange={(e) => setFaoParams({ ...faoParams, et0: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Coeficiente de Cultivo $K_c$ *</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="Ej. 1.05"
                        value={faoParams.kc}
                        onChange={(e) => setFaoParams({ ...faoParams, kc: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Precipitación Efectiva $P_e$ (mm)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00"
                        value={faoParams.precipitacion_efectiva}
                        onChange={(e) => setFaoParams({ ...faoParams, precipitacion_efectiva: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Eficiencia de Aplicación $E_a$ (%)</label>
                      <input 
                        type="number" 
                        step="1" 
                        placeholder="90"
                        value={faoParams.eficiencia_riego}
                        onChange={(e) => setFaoParams({ ...faoParams, eficiencia_riego: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Precipitación del Sistema $P_r$ (mm/h) *</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="Ej. 2.50"
                        value={faoParams.precipitacion_sistema}
                        onChange={(e) => setFaoParams({ ...faoParams, precipitacion_sistema: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Área del Sector (ha)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="Ej. 1.50"
                        value={faoParams.area_ha}
                        onChange={(e) => setFaoParams({ ...faoParams, area_ha: e.target.value })}
                      />
                    </div>
                  </div>

                  <button 
                    type="button" 
                    className="btn-primary-riego" 
                    onClick={handleCalcularFAO}
                    style={{ marginTop: '10px' }}
                  >
                    <Sliders size={18} />
                    <span>Calcular Balance FAO-56</span>
                  </button>
                </div>
              </div>

              {/* RESULTADOS */}
              <div className="calc-results-card">
                <div className="card-top-title">
                  <Activity size={18} color="#16a34a" />
                  <h4>Prescripción Agronómica & Tiempo de Bombeo</h4>
                </div>

                {calculoResultado ? (
                  <div>
                    <div className="hero-time-box">
                      <div className="hero-label">Tiempo de Bombeo Calculado</div>
                      <div className="hero-number">{calculoResultado.tiempoBombeoHoras} h</div>
                      <div className="hero-sub">Volumen requerido: <strong>{calculoResultado.volumenM3} m³</strong></div>
                    </div>

                    <div className="results-metrics-grid">
                      <div className="metric-pill">
                        <span className="lbl">Evapotranspiración ($ET_c$)</span>
                        <span className="val">{calculoResultado.etc} mm/día</span>
                      </div>
                      <div className="metric-pill">
                        <span className="lbl">Lámina Neta ($L_n$)</span>
                        <span className="val">{calculoResultado.ln} mm</span>
                      </div>
                      <div className="metric-pill">
                        <span className="lbl">Lámina Bruta ($L_b$)</span>
                        <span className="val">{calculoResultado.lb} mm</span>
                      </div>
                      <div className="metric-pill">
                        <span className="lbl">Precipitación Sistema</span>
                        <span className="val">{calculoResultado.precipitacionSistema} mm/h</span>
                      </div>
                    </div>

                    <button 
                      className="btn-campesino-action btn-iniciar-riego"
                      style={{ width: '100%' }}
                      onClick={handleProgramarRiegoDirecto}
                      disabled={submitting}
                    >
                      <CheckCircle size={18} />
                      <span>{submitting ? 'Guardando en BD...' : 'Aprobar y Registrar en Base de Datos'}</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                    <Gauge size={48} color="#cbd5e1" style={{ marginBottom: '12px' }} />
                    <p>Complete los parámetros y pulse "Calcular Balance FAO-56" para ver el tiempo exacto de riego.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: HISTORIAL DE RIEGOS */}
          {activeTab === 'programaciones' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', flex: 1, maxWidth: '350px' }}>
                  <Search size={16} color="#64748b" />
                  <input 
                    type="text" 
                    placeholder="Buscar por sector, finca o estado..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px' }}
                  />
                </div>

                <ExportButtons 
                  data={filteredProgramaciones} 
                  columns={exportColumns} 
                  filename="historial_riegos_precision"
                />
              </div>

              <div className="table-responsive-container">
                <table className="custom-riego-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Sector</th>
                      <th>Finca / Lote</th>
                      <th>Lámina Bruta</th>
                      <th>Horas Bombeo</th>
                      <th>Volumen (m³)</th>
                      <th>Estado</th>
                      <th>WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProgramaciones.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                          No hay registros de riegos programados.
                        </td>
                      </tr>
                    ) : (
                      paginatedProgramaciones.map(p => (
                        <tr key={p.id_programacion}>
                          <td><strong>{p.fecha_programada}</strong></td>
                          <td>{p.codigo_sector} - {p.sector_nombre}</td>
                          <td>{p.finca_nombre} / {p.lote_nombre}</td>
                          <td>{p.lamina_bruta_mm} mm</td>
                          <td><strong>{p.horas_riego_calculadas} h</strong></td>
                          <td>{p.volumen_total_m3} m³</td>
                          <td>
                            <span className={`badge-estado ${p.estado}`}>
                              {p.estado}
                            </span>
                          </td>
                          <td>
                            <button 
                              className="btn-cancel"
                              style={{ padding: '6px 10px', fontSize: '12px' }}
                              onClick={() => {
                                const texto = `💧 Orden de Riego: Sector ${p.codigo_sector} (${p.sector_nombre}) - Horas: ${p.horas_riego_calculadas}h - Volumen: ${p.volumen_total_m3} m³`;
                                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
                              }}
                            >
                              <MessageCircle size={14} color="#16a34a" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination 
                currentPage={currentPage}
                totalItems={filteredProgramaciones.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}

          {/* TAB 3: SECTORES HÍDRICOS */}
          {activeTab === 'sectores' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button 
                  className="btn-primary-riego"
                  onClick={() => {
                    setSectorForm(initialSectorForm);
                    setShowModalSector(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Nuevo Sector Hídrico</span>
                </button>
              </div>

              <div className="table-responsive-container">
                <table className="custom-riego-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nombre Sector</th>
                      <th>Finca / Lote</th>
                      <th>Método</th>
                      <th>Emisor (L/h)</th>
                      <th>Marco (m x m)</th>
                      <th>Precip. Sistema</th>
                      <th>Eficiencia</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectores.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                          No hay sectores hídricos registrados en la base de datos.
                        </td>
                      </tr>
                    ) : (
                      sectores.map(s => (
                        <tr key={s.id_sector}>
                          <td><strong>{s.codigo_sector}</strong></td>
                          <td>{s.nombre}</td>
                          <td>{s.finca_nombre} / {s.lote_nombre}</td>
                          <td>{s.metodo_riego}</td>
                          <td>{s.caudal_emisor_lph} L/h</td>
                          <td>{s.espaciamiento_emisores_m} x {s.espaciamiento_lineas_m} m</td>
                          <td><strong>{s.precipitacion_sistema_mm_h} mm/h</strong></td>
                          <td>{s.eficiencia_aplicacion_ea_porc}%</td>
                          <td>
                            <span className="badge-estado Completado">{s.estado}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: TELEMETRÍA HARDWARE (BOMBAS Y VÁLVULAS SOLENOIDES) */}
          {activeTab === 'hardware' && (
            <div>
              {/* SECCIÓN VÁLVULAS SOLENOIDES */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                  🔌 Electroválvulas Solenoides IoT por Sector
                </h3>
                <button 
                  className="btn-primary-riego"
                  onClick={() => {
                    setValvulaForm(initialValvulaForm);
                    setShowModalValvula(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Nueva Válvula</span>
                </button>
              </div>

              <div className="table-responsive-container" style={{ marginBottom: '30px' }}>
                <table className="custom-riego-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nombre Válvula</th>
                      <th>Sector / Finca</th>
                      <th>Tipo Actuador</th>
                      <th>Diámetro</th>
                      <th>Modo</th>
                      <th>Estado Actual</th>
                      <th>Acción Telecontrol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {valvulas.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                          No hay electroválvulas registradas en el sistema.
                        </td>
                      </tr>
                    ) : (
                      valvulas.map(v => (
                        <tr key={v.id_valvula}>
                          <td><strong>{v.codigo_valvula}</strong></td>
                          <td>{v.nombre}</td>
                          <td>{v.sector_nombre} ({v.finca_nombre})</td>
                          <td>{v.tipo_actuador.replace('_', ' ')}</td>
                          <td>{v.diametro_pulgadas}"</td>
                          <td>{v.modo_control.replace('_', ' ')}</td>
                          <td>
                            <span className={`badge-estado ${v.estado_actual === 'Abierta' ? 'En_Riego' : 'no-regar'}`}>
                              {v.estado_actual}
                            </span>
                          </td>
                          <td>
                            <button 
                              className={`btn-cancel ${v.estado_actual === 'Abierta' ? 'btn-completar-riego' : 'btn-iniciar-riego'}`}
                              style={{ padding: '6px 14px', color: '#ffffff', minHeight: '36px', fontSize: '12px' }}
                              onClick={() => handleToggleValvula(v.id_valvula, v.estado_actual)}
                            >
                              {v.estado_actual === 'Abierta' ? 'CERRAR' : 'ABRIR'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* SECCIÓN BOMBAS */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                  ⚡ Estaciones de Bombeo y Variadores
                </h3>
                <button 
                  className="btn-primary-riego"
                  onClick={() => {
                    setBombaForm({ ...initialBombaForm, id_finca: selectedFinca || '' });
                    setShowModalBomba(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Nueva Bomba</span>
                </button>
              </div>

              <div className="table-responsive-container">
                <table className="custom-riego-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nombre</th>
                      <th>Finca</th>
                      <th>Tipo Bomba</th>
                      <th>Potencia (HP)</th>
                      <th>Caudal Nom. (L/s)</th>
                      <th>Presión Nom. (bar)</th>
                      <th>Estado</th>
                      <th>Telecontrol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bombas.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                          No hay bombas registradas.
                        </td>
                      </tr>
                    ) : (
                      bombas.map(b => (
                        <tr key={b.id_bomba}>
                          <td><strong>{b.codigo_bomba}</strong></td>
                          <td>{b.nombre}</td>
                          <td>{b.finca_nombre}</td>
                          <td>{b.tipo_bomba.replace('_', ' ')}</td>
                          <td>{b.potencia_hp} HP</td>
                          <td>{b.caudal_nominal_lps} L/s</td>
                          <td>{b.presion_nominal_bar} bar</td>
                          <td>
                            <span className={`badge-estado ${b.estado_operativo === 'En_Marcha' ? 'En_Riego' : 'no-regar'}`}>
                              {b.estado_operativo.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <button 
                              className={`btn-cancel ${b.estado_operativo === 'En_Marcha' ? 'btn-completar-riego' : 'btn-iniciar-riego'}`}
                              style={{ padding: '6px 14px', color: '#ffffff', minHeight: '36px', fontSize: '12px' }}
                              onClick={() => handleToggleBomba(b.id_bomba, b.estado_operativo)}
                            >
                              {b.estado_operativo === 'En_Marcha' ? 'APAGAR' : 'ENCENDER'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: FERTIRRIEGO AGROPACCIOLI (ESTEQUIOMETRÍA, MEQ/L, TANQUES A/B) */}
          {activeTab === 'fertirriego' && (
            <CalculadoraFertirriegoAgroPaccioli 
              fincas={fincas}
              sectores={sectores}
              selectedFincaId={selectedFinca}
            />
          )}

          {/* TAB 6: UNIFORMIDAD CHRISTIANSEN */}
          {activeTab === 'uniformidad' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                  📐 Ensayos de Uniformidad de Coeficiente Christiansen (CU / DU)
                </h3>
                <button 
                  className="btn-primary-riego"
                  onClick={() => {
                    setUniformidadForm(initialUniformidadForm);
                    setShowModalUniformidad(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Nuevo Ensayo CU/DU</span>
                </button>
              </div>

              <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.5 }}>
                  El Coeficiente de Christiansen ($CU$) y la Uniformidad de Distribución ($DU$) evalúan la distribución volumétrica real del agua mediante pluviómetros distribuidos en una cuadrícula.
                  <br /><strong>Norma técnica:</strong> CU &ge; 90% Excelente • CU &ge; 80% Aceptable • CU &lt; 70% Crítico / Pérdidas de rendimiento.
                </p>

                <div style={{ marginTop: '20px' }}>
                  <button 
                    className="btn-primary-riego"
                    onClick={() => {
                      setUniformidadForm(initialUniformidadForm);
                      setShowModalUniformidad(true);
                    }}
                  >
                    <Sliders size={16} />
                    <span>Realizar Ensayo Christiansen</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PROGRAMAR TURNO DE CAMPO (MODO CAMPESINO)                           */}
      {/* ========================================================================= */}
      {showModalTurno && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Programar Turno de Riego para el Operario</h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Toque <b>🔊 Escuchar</b> en cualquier campo para oír la explicación.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <ManualitoCampesinoModal 
                  modulo="Turnos de Riego"
                  tituloBoton="🌾 Guía (3 Pasos)"
                  pasos={[
                    {
                      titulo: "Paso 1: Finca, Lote y Sector",
                      detalle: "Escoja la finca y la llave o sector donde va a mandar el agua hoy.",
                      audio: "Paso uno. Escoja la finca, el lote y el sector donde se van a abrir las llaves."
                    },
                    {
                      titulo: "Paso 2: Quién riega y a qué hora",
                      detalle: "Escriba el nombre de quien prende la bomba, la hora de arranque y la hora de apagado.",
                      audio: "Paso dos. Ponga el nombre del regador, la hora de inicio y la hora en que debe terminar."
                    },
                    {
                      titulo: "Paso 3: Guardar el Turno",
                      detalle: "Hunda el botón azul de guardar para que quede grabado y listo para avisar por WhatsApp.",
                      audio: "Paso tres. Oprima el botón de guardar para registrar el turno de riego."
                    }
                  ]}
                />
                <button className="btn-close" onClick={() => setShowModalTurno(false)}><X size={20} /></button>
              </div>
            </div>

            <form onSubmit={handleGuardarTurno} className="modal-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Finca *</label>
                  <select 
                    required 
                    value={turnoForm.id_finca}
                    onChange={(e) => setTurnoForm({ ...turnoForm, id_finca: e.target.value })}
                  >
                    <option value="">Seleccione Finca</option>
                    {fincas.map(f => (
                      <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>
                    ))}
                  </select>
                  <AyudaCampesina campo="id_finca" />
                </div>

                <div className="form-group">
                  <label>Lote *</label>
                  <select 
                    required 
                    value={turnoForm.id_lote}
                    onChange={(e) => setTurnoForm({ ...turnoForm, id_lote: e.target.value })}
                  >
                    <option value="">Seleccione Lote</option>
                    {lotes.filter(l => !turnoForm.id_finca || l.id_finca === parseInt(turnoForm.id_finca)).map(l => (
                      <option key={l.id_lote} value={l.id_lote}>{l.nombre}</option>
                    ))}
                  </select>
                  <AyudaCampesina campo="id_lote" />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Sector Hídrico *</label>
                  <select 
                    required 
                    value={turnoForm.id_sector}
                    onChange={(e) => setTurnoForm({ ...turnoForm, id_sector: e.target.value })}
                  >
                    <option value="">Seleccione Sector</option>
                    {sectores.map(s => (
                      <option key={s.id_sector} value={s.id_sector}>{s.codigo_sector} - {s.nombre}</option>
                    ))}
                  </select>
                  <AyudaCampesina campo="id_sector" />
                </div>

                <div className="form-group">
                  <label>Código Turno *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. TURNO-01"
                    value={turnoForm.codigo_turno}
                    onChange={(e) => setTurnoForm({ ...turnoForm, codigo_turno: e.target.value })}
                  />
                  <AyudaCampesina campo="codigo_turno" />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Nombre del Regador / Operario *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. Pedro Gómez"
                    value={turnoForm.responsable_nombre}
                    onChange={(e) => setTurnoForm({ ...turnoForm, responsable_nombre: e.target.value })}
                  />
                  <AyudaCampesina campo="responsable_nombre" />
                </div>

                <div className="form-group">
                  <label>Teléfono Celular WhatsApp</label>
                  <input 
                    type="text" 
                    placeholder="Ej. +57 300 123 4567"
                    value={turnoForm.responsable_telefono}
                    onChange={(e) => setTurnoForm({ ...turnoForm, responsable_telefono: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>Fecha del Riego *</label>
                  <DatePickerClaro required 
                    value={turnoForm.fecha_riego}
                    onChange={(e) => setTurnoForm({ ...turnoForm, fecha_riego: e.target.value })} />
                  <AyudaCampesina campo="fecha_inicio" textoCustom="Día en que se prende el riego" />
                </div>

                <div className="form-group">
                  <label>Hora Inicio *</label>
                  <input 
                    type="time" 
                    required 
                    value={turnoForm.hora_inicio_programada}
                    onChange={(e) => setTurnoForm({ ...turnoForm, hora_inicio_programada: e.target.value })}
                  />
                  <AyudaCampesina campo="hora_inicio_programada" />
                </div>

                <div className="form-group">
                  <label>Hora Fin *</label>
                  <input 
                    type="time" 
                    required 
                    value={turnoForm.hora_fin_programada}
                    onChange={(e) => setTurnoForm({ ...turnoForm, hora_fin_programada: e.target.value })}
                  />
                  <AyudaCampesina campo="hora_fin_programada" />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Duración Estimada (minutos)</label>
                  <input 
                    type="number" 
                    placeholder="Ej. 120"
                    value={turnoForm.duracion_minutos_estimada}
                    onChange={(e) => setTurnoForm({ ...turnoForm, duracion_minutos_estimada: e.target.value })}
                  />
                  <AyudaCampesina campo="duracion_minutos_estimada" />
                </div>

                <div className="form-group">
                  <label>Volumen Objetivo (m³)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    placeholder="Ej. 45.0"
                    value={turnoForm.volumen_objetivo_m3}
                    onChange={(e) => setTurnoForm({ ...turnoForm, volumen_objetivo_m3: e.target.value })}
                  />
                  <AyudaCampesina campo="volumen_objetivo_m3" />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModalTurno(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={submitting}>
                  {submitting ? 'Guardando en BD...' : 'Asignar Turno al Operario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================      {showModalSector && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3>Registrar Nuevo Sector Hídrico</h3>
                <ManualitoCampesinoModal 
                  modulo="Sectores Hídricos y Cuadros de Riego"
                  descripcion="Pasos para inscribir un nuevo sector de riego o cuadro de siembra"
                  pasos={[
                    {
                      titulo: "1. Escoja la Finca y el Lote",
                      icono: "🏡",
                      texto: "Seleccione en qué finca está ubicado y qué lote o cuadro de tierra comprende este sector de mangueras."
                    },
                    {
                      titulo: "2. Nombre y Método de Riego",
                      icono: "🌱",
                      texto: "Ponga un nombre claro (ej. Vivero Goteo) y seleccione si es goteo con cinta, microaspersores o aspersión."
                    },
                    {
                      titulo: "3. Tamaño y Goteros",
                      icono: "📏",
                      texto: "Anote el tamaño en hectáreas y la distancia entre goteros. Con eso el sistema calcula cuánta agua echarle a las matas."
                    }
                  ]}
                />
              </div>
              <button className="btn-close" onClick={() => setShowModalSector(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleGuardarSector} className="modal-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Finca *</label>
                  <select 
                    required 
                    value={sectorForm.id_finca}
                    onChange={(e) => setSectorForm({ ...sectorForm, id_finca: e.target.value })}
                  >
                    <option value="">Seleccione Finca</option>
                    {fincas.map(f => (
                      <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>
                    ))}
                  </select>
                  <AyudaCampesina campo="id_finca" />
                </div>

                <div className="form-group">
                  <label>Lote *</label>
                  <select 
                    required 
                    value={sectorForm.id_lote}
                    onChange={(e) => setSectorForm({ ...sectorForm, id_lote: e.target.value })}
                  >
                    <option value="">Seleccione Lote</option>
                    {lotes.filter(l => !sectorForm.id_finca || l.id_finca === parseInt(sectorForm.id_finca)).map(l => (
                      <option key={l.id_lote} value={l.id_lote}>{l.nombre}</option>
                    ))}
                  </select>
                  <AyudaCampesina campo="id_lote" />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Código Sector *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. SEC-01"
                    value={sectorForm.codigo_sector}
                    onChange={(e) => setSectorForm({ ...sectorForm, codigo_sector: e.target.value })}
                  />
                  <AyudaCampesina campo="codigo_sector" />
                </div>

                <div className="form-group">
                  <label>Nombre Descriptivo *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. Sector Vivero Goteo"
                    value={sectorForm.nombre}
                    onChange={(e) => setSectorForm({ ...sectorForm, nombre: e.target.value })}
                  />
                  <AyudaCampesina campo="nombre" />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Método de Riego</label>
                  <select 
                    value={sectorForm.metodo_riego}
                    onChange={(e) => setSectorForm({ ...sectorForm, metodo_riego: e.target.value })}
                  >
                    <option value="Goteo">Goteo</option>
                    <option value="Microaspersion">Microaspersión</option>
                    <option value="Aspersion">Aspersión Convencional</option>
                    <option value="Pivote_Central">Pivote Central</option>
                    <option value="Gravedad_Tecnificada">Gravedad Tecnificada</option>
                  </select>
                  <AyudaCampesina campo="metodo_riego" />
                </div>

                <div className="form-group">
                  <label>Área del Sector (ha)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="Ej. 1.25"
                    value={sectorForm.area_sector_ha}
                    onChange={(e) => setSectorForm({ ...sectorForm, area_sector_ha: e.target.value })}
                  />
                  <AyudaCampesina campo="area_sector_ha" />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>Espacio Emisores (m)</label>
                  <input 
                    type="number" 
                    step="0.05" 
                    placeholder="0.50"
                    value={sectorForm.espaciamiento_emisores_m}
                    onChange={(e) => setSectorForm({ ...sectorForm, espaciamiento_emisores_m: e.target.value })}
                  />
                  <AyudaCampesina campo="espaciamiento_emisores_m" />
                </div>

                <div className="form-group">
                  <label>Espacio Líneas (m)</label>
                  <input 
                    type="number" 
                    step="0.05" 
                    placeholder="1.50"
                    value={sectorForm.espaciamiento_lineas_m}
                    onChange={(e) => setSectorForm({ ...sectorForm, espaciamiento_lineas_m: e.target.value })}
                  />
                  <AyudaCampesina campo="espaciamiento_lineas_m" />
                </div>

                <div className="form-group">
                  <label>Caudal Emisor (L/h)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    placeholder="2.00"
                    value={sectorForm.caudal_emisor_lph}
                    onChange={(e) => setSectorForm({ ...sectorForm, caudal_emisor_lph: e.target.value })}
                  />
                  <AyudaCampesina campo="caudal_emisor_lph" />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModalSector(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={submitting}>
                  {submitting ? 'Guardando en BD...' : 'Guardar Sector'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NUEVA BOMBA                                                        */}
      {/* ========================================================================= */}
      {showModalBomba && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3>Registrar Nueva Estación de Bombeo</h3>
                <ManualitoCampesinoModal 
                  modulo="Estaciones de Bombeo y Motores"
                  descripcion="Pasos para registrar una motobomba o electrobomba"
                  pasos={[
                    {
                      titulo: "1. Finca y Código de Bomba",
                      icono: "🏡",
                      texto: "Seleccione en qué finca está la bomba y póngale una identificación (ej. BOMBA-01 o Bomba Pozo 1)."
                    },
                    {
                      titulo: "2. Tipo y Fuerza del Motor",
                      icono: "⚙️",
                      texto: "Indique si es sumergible en el fondo del pozo o en superficie, y los caballos de fuerza (HP) que dice la placa del motor."
                    },
                    {
                      titulo: "3. Chorro y Presión de Trabajo",
                      icono: "🌊",
                      texto: "Anote los litros por segundo de agua que bota y la presión en bares para que el sistema vigile que no haya sobrepresión."
                    }
                  ]}
                />
              </div>
              <button className="btn-close" onClick={() => setShowModalBomba(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleGuardarBomba} className="modal-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Finca *</label>
                  <select 
                    required 
                    value={bombaForm.id_finca}
                    onChange={(e) => setBombaForm({ ...bombaForm, id_finca: e.target.value })}
                  >
                    <option value="">Seleccione Finca</option>
                    {fincas.map(f => (
                      <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>
                    ))}
                  </select>
                  <AyudaCampesina campo="id_finca" />
                </div>

                <div className="form-group">
                  <label>Código Bomba *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. BOMBA-01"
                    value={bombaForm.codigo_bomba}
                    onChange={(e) => setBombaForm({ ...bombaForm, codigo_bomba: e.target.value })}
                  />
                  <AyudaCampesina campo="codigo_bomba" />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Nombre Descriptivo *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. Bomba Principal Pozo 1"
                    value={bombaForm.nombre}
                    onChange={(e) => setBombaForm({ ...bombaForm, nombre: e.target.value })}
                  />
                  <AyudaCampesina campo="nombre" />
                </div>

                <div className="form-group">
                  <label>Tipo de Bomba</label>
                  <select 
                    value={bombaForm.tipo_bomba}
                    onChange={(e) => setBombaForm({ ...bombaForm, tipo_bomba: e.target.value })}
                  >
                    <option value="Centrifuga_Superficie">Centrífuga de Superficie</option>
                    <option value="Sumergible_Pozo_Profundo">Sumergible de Pozo Profundo</option>
                    <option value="Turbina_Vertical">Turbina Vertical</option>
                    <option value="Solar_Sumergible">Solar Sumergible</option>
                    <option value="Motobomba_Diesel">Motobomba Diésel</option>
                  </select>
                  <AyudaCampesina campo="tipo_bomba" />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>Potencia (HP) *</label>
                  <input 
                    type="number" 
                    step="0.5" 
                    required 
                    placeholder="Ej. 15.0"
                    value={bombaForm.potencia_hp}
                    onChange={(e) => setBombaForm({ ...bombaForm, potencia_hp: e.target.value })}
                  />
                  <AyudaCampesina campo="potencia_hp" />
                </div>

                <div className="form-group">
                  <label>Caudal Nom. (L/s)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    placeholder="Ej. 20.0"
                    value={bombaForm.caudal_nominal_lps}
                    onChange={(e) => setBombaForm({ ...bombaForm, caudal_nominal_lps: e.target.value })}
                  />
                  <AyudaCampesina campo="caudal_nominal_lps" />
                </div>

                <div className="form-group">
                  <label>Presión Nom. (bar)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    placeholder="Ej. 4.5"
                    value={bombaForm.presion_nominal_bar}
                    onChange={(e) => setBombaForm({ ...bombaForm, presion_nominal_bar: e.target.value })}
                  />
                  <AyudaCampesina campo="presion_nominal_bar" />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModalBomba(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={submitting}>
                  {submitting ? 'Guardando en BD...' : 'Guardar Bomba'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NUEVA VÁLVULA SOLENOIDE                                            */}
      {/* ========================================================================= */}
      {showModalValvula && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3>Registrar Válvula Solenoide</h3>
                <ManualitoCampesinoModal 
                  modulo="Válvulas y Llaves de Paso"
                  descripcion="Pasos para registrar una llave o electroválvula del sector"
                  pasos={[
                    {
                      titulo: "1. Sector Asociado",
                      icono: "🚰",
                      texto: "Seleccione a cuál cuadro o sector de siembra le abre el agua esta llave."
                    },
                    {
                      titulo: "2. Código y Nombre de la Llave",
                      icono: "🏷️",
                      texto: "Asígnele un número o nombre claro (ej. VALV-01 o Llave Cabezal Sector 1) para que el operario la ubique rápido en campo."
                    },
                    {
                      titulo: "3. Tipo de Apertura",
                      icono: "🔌",
                      texto: "Indique si abre manual a mano (esfera) o eléctrica con solenoide 24V conectada al programador automático."
                    }
                  ]}
                />
              </div>
              <button className="btn-close" onClick={() => setShowModalValvula(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleGuardarValvula} className="modal-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Sector Asociado *</label>
                  <select 
                    required 
                    value={valvulaForm.id_sector}
                    onChange={(e) => setValvulaForm({ ...valvulaForm, id_sector: e.target.value })}
                  >
                    <option value="">Seleccione Sector</option>
                    {sectores.map(s => (
                      <option key={s.id_sector} value={s.id_sector}>{s.codigo_sector} - {s.nombre}</option>
                    ))}
                  </select>
                  <AyudaCampesina campo="id_sector" />
                </div>

                <div className="form-group">
                  <label>Código Válvula *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. VALV-01"
                    value={valvulaForm.codigo_valvula}
                    onChange={(e) => setValvulaForm({ ...valvulaForm, codigo_valvula: e.target.value })}
                  />
                  <AyudaCampesina campo="codigo_valvula" />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Nombre Descriptivo *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. Solenoide Cabezal Sector 1"
                    value={valvulaForm.nombre}
                    onChange={(e) => setValvulaForm({ ...valvulaForm, nombre: e.target.value })}
                  />
                  <AyudaCampesina campo="nombre" />
                </div>

                <div className="form-group">
                  <label>Tipo Actuador</label>
                  <select 
                    value={valvulaForm.tipo_actuador}
                    onChange={(e) => setValvulaForm({ ...valvulaForm, tipo_actuador: e.target.value })}
                  >
                    <option value="Solenoide_24VAC">Solenoide 24 VAC</option>
                    <option value="Solenoide_Latch_9_12VDC">Solenoide Latch 9-12 VDC</option>
                    <option value="Hidraulica_Piloto">Hidráulica con Piloto</option>
                    <option value="Manual_Esfera">Manual de Esfera</option>
                  </select>
                  <AyudaCampesina campo="tipo_actuador" />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModalValvula(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={submitting}>
                  {submitting ? 'Guardando en BD...' : 'Guardar Válvula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NUEVA RECETA FERTIRRIEGO                                           */}
      {/* ========================================================================= */}
      {showModalFertirriego && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3>Nueva Receta de Fertirriego</h3>
                <ManualitoCampesinoModal 
                  modulo="Preparación y Receta de Abonos"
                  descripcion="Reglas de oro para disolver fertilizantes en los tanques"
                  pasos={[
                    {
                      titulo: "1. Regla del Tanque A (Calcio)",
                      icono: "🅰️",
                      texto: "En el Tanque A disuelva Nitrato de Calcio y Nitrato de Potasio. NUNCA mezcle sulfatos aquí porque se corta la mezcla."
                    },
                    {
                      titulo: "2. Regla del Tanque B (Sulfatos y Menores)",
                      icono: "🅱️",
                      texto: "En el Tanque B disuelva Sulfato de Magnesio, MAP (fósforo) y los minerales menores (hierro quelatado, zinc)."
                    },
                    {
                      titulo: "3. Medición de Sales y Ácido",
                      icono: "⚡",
                      texto: "La conductividad (CE) le indica qué tan cargado va el caldo. El pH debe quedar entre 5.5 y 6.2 para no tapar los goteros."
                    }
                  ]}
                />
              </div>
              <button className="btn-close" onClick={() => setShowModalFertirriego(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleGuardarFertirriego} className="modal-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Sector Destino *</label>
                  <select 
                    required 
                    value={fertirriegoForm.id_sector}
                    onChange={(e) => setFertirriegoForm({ ...fertirriegoForm, id_sector: e.target.value })}
                  >
                    <option value="">Seleccione Sector</option>
                    {sectores.map(s => (
                      <option key={s.id_sector} value={s.id_sector}>{s.codigo_sector} - {s.nombre}</option>
                    ))}
                  </select>
                  <AyudaCampesina campo="id_sector" />
                </div>

                <div className="form-group">
                  <label>Nombre de la Receta *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. Nutrición Inicio Floración"
                    value={fertirriegoForm.nombre_receta}
                    onChange={(e) => setFertirriegoForm({ ...fertirriegoForm, nombre_receta: e.target.value })}
                  />
                  <AyudaCampesina campo="nombre_receta" />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>CE Objetivo (mS/cm)</label>
                  <input 
                    type="number" 
                    step="0.05" 
                    placeholder="Ej. 1.80"
                    value={fertirriegoForm.ce_objetivo_ms_cm}
                    onChange={(e) => setFertirriegoForm({ ...fertirriegoForm, ce_objetivo_ms_cm: e.target.value })}
                  />
                  <AyudaCampesina campo="ce_objetivo_ms_cm" />
                </div>

                <div className="form-group">
                  <label>pH Objetivo</label>
                  <input 
                    type="number" 
                    step="0.05" 
                    placeholder="Ej. 5.80"
                    value={fertirriegoForm.ph_objetivo}
                    onChange={(e) => setFertirriegoForm({ ...fertirriegoForm, ph_objetivo: e.target.value })}
                  />
                  <AyudaCampesina campo="ph_objetivo" />
                </div>
              </div>

              <div className="form-group">
                <label>Fórmula Tanque A (Nitratos, Calcio, Potasio)</label>
                <input 
                  type="text" 
                  placeholder="Ej. Nitrato de Calcio 50 kg + Nitrato de Potasio 25 kg"
                  value={fertirriegoForm.tanque_a_formula}
                  onChange={(e) => setFertirriegoForm({ ...fertirriegoForm, tanque_a_formula: e.target.value })}
                />
                <AyudaCampesina campo="tanque_a_formula" />
              </div>

              <div className="form-group">
                <label>Fórmula Tanque B (Sulfatos, Fosfatos, Micronutrientes)</label>
                <input 
                  type="text" 
                  placeholder="Ej. Sulfato de Magnesio 20 kg + MAP 15 kg + Quelatos Fe"
                  value={fertirriegoForm.tanque_b_formula}
                  onChange={(e) => setFertirriegoForm({ ...fertirriegoForm, tanque_b_formula: e.target.value })}
                />
                <AyudaCampesina campo="tanque_b_formula" />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModalFertirriego(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={submitting}>
                  {submitting ? 'Guardando en BD...' : 'Guardar Receta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ENSAYO CHRISTIANSEN                                                */}
      {/* ========================================================================= */}
      {showModalUniformidad && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3>Ensayo de Uniformidad (Christiansen CU)</h3>
                <ManualitoCampesinoModal 
                  modulo="Prueba de Vasitos (Uniformidad)"
                  descripcion="Pasos para verificar en campo si todas las matas reciben la misma agua"
                  pasos={[
                    {
                      titulo: "1. Coloque los Vasitos en el Campo",
                      icono: "🥤",
                      texto: "Ponga 8 a 16 vasitos medidores o latas plásticas debajo de los goteros a lo largo del surco y al final de la manguera."
                    },
                    {
                      titulo: "2. Prenda el Riego 15 a 30 Minutos",
                      icono: "⏱️",
                      texto: "Deje regar a presión normal. Luego recoja los vasitos y anote los mililitros (ml) que llenó cada uno."
                    },
                    {
                      titulo: "3. Copie los Resultados",
                      icono: "📝",
                      texto: "Copie los números separados por coma. Si el resultado da más de 85%, el riego es excelente. Si da menos de 75%, hay goteros tapados."
                    }
                  ]}
                />
              </div>
              <button className="btn-close" onClick={() => setShowModalUniformidad(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleGuardarUniformidad} className="modal-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Sector Evaluado *</label>
                  <select 
                    required 
                    value={uniformidadForm.id_sector}
                    onChange={(e) => setUniformidadForm({ ...uniformidadForm, id_sector: e.target.value })}
                  >
                    <option value="">Seleccione Sector</option>
                    {sectores.map(s => (
                      <option key={s.id_sector} value={s.id_sector}>{s.codigo_sector} - {s.nombre}</option>
                    ))}
                  </select>
                  <AyudaCampesina campo="id_sector" />
                </div>

                <div className="form-group">
                  <label>Fecha del Ensayo *</label>
                  <DatePickerClaro required 
                    value={uniformidadForm.fecha_ensayo}
                    onChange={(e) => setUniformidadForm({ ...uniformidadForm, fecha_ensayo: e.target.value })} />
                  <AyudaCampesina campo="fecha_ensayo" />
                </div>
              </div>

              <div className="form-group">
                <label>Volúmenes en Pluviómetros (ml) * (separados por coma o espacio)</label>
                <textarea 
                  rows="3" 
                  required 
                  placeholder="Ej. 120, 118, 125, 112, 130, 115, 122, 108"
                  value={uniformidadForm.lecturas_texto}
                  onChange={(e) => setUniformidadForm({ ...uniformidadForm, lecturas_texto: e.target.value })}
                />
                <AyudaCampesina campo="lecturas_texto" />
              </div>

              <div className="form-group">
                <label>Evaluador Agronómico *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ej. Ing. Juan Pérez"
                  value={uniformidadForm.evaluador}
                  onChange={(e) => setUniformidadForm({ ...uniformidadForm, evaluador: e.target.value })}
                />
                <AyudaCampesina campo="evaluador" />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModalUniformidad(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={submitting}>
                  {submitting ? 'Calculando y Guardando...' : 'Calcular y Guardar en BD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
