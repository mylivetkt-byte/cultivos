import React, { useState, useEffect, useMemo, useRef } from 'react';
import DatePickerClaro from '../Common/DatePickerClaro';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Radio, Cpu, Droplets, Thermometer, Zap, AlertTriangle, CheckCircle2, 
  Plus, Search, RefreshCw, Calendar, MapPin, Sliders, Battery, 
  Activity, ArrowUpRight, ShieldCheck, Download, Trash2, Edit3, X, HelpCircle
} from 'lucide-react';
import { authFetch } from '../../utils/api';
import PremiumSelect from '../PremiumSelect';
import ExportButtons from '../ExportButtons';
import Pagination from '../Pagination';
import './SensoresIoTManager.css';

// Fix icons Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createSensorIcon = (status, isAlert) => {
  const bg = isAlert ? '#ef4444' : status === 'Activo' ? '#10b981' : '#94a3b8';
  return L.divIcon({
    className: 'sensor-leaflet-marker',
    html: `
      <div style="background-color: ${bg}; width: 22px; height: 22px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
        <div style="background: white; width: 6px; height: 6px; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

function MapRecenter({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      try {
        const bounds = L.latLngBounds(coords);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
        }
      } catch (e) {
        console.warn('Map bounds error:', e);
      }
    }
  }, [coords, map]);
  return null;
}

export default function SensoresIoTManager() {
  const [activeTab, setActiveTab] = useState('telemetria'); // 'telemetria', 'dispositivos', 'mapa', 'calibraciones'
  
  // Catálogos
  const [fincas, setFincas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [selectedFinca, setSelectedFinca] = useState('');
  const [selectedLote, setSelectedLote] = useState('');

  // Sensores y Telemetría
  const [sensores, setSensores] = useState([]);
  const [selectedSensorId, setSelectedSensorId] = useState(null);
  const [telemetriaLecturas, setTelemetriaLecturas] = useState([]);
  const [calibraciones, setCalibraciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros y Paginación en tabla de dispositivos
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modales
  const [showModalSensor, setShowModalSensor] = useState(false);
  const [showModalCalibracion, setShowModalCalibracion] = useState(false);
  const [showModalLecturaManual, setShowModalLecturaManual] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Estados de formularios limpios (SIN REGISTROS DEMO - 100% LIMPIOS PARA INGRESO REAL)
  const initialSensorForm = {
    id_finca: '',
    id_lote: '',
    codigo_sensor: '',
    nombre: '',
    tipo_sensor: 'Humedad_Multinivel',
    marca_modelo: '',
    numero_serie: '',
    latitud: '',
    longitud: '',
    profundidades_cm: '10,30,60',
    umbral_estres_humedad: '18.00',
    umbral_saturacion_humedad: '36.00',
    umbral_max_ce_ds_m: '2.00',
    estado: 'Activo',
    fecha_instalacion: new Date().toISOString().split('T')[0]
  };
  const [sensorForm, setSensorForm] = useState(initialSensorForm);

  const initialCalibracionForm = {
    id_sensor: '',
    fecha_calibracion: new Date().toISOString().split('T')[0],
    tipo_suelo_calibrado: '',
    coeficiente_a: '',
    coeficiente_b: '',
    tecnico_responsable: '',
    observaciones: ''
  };
  const [calibracionForm, setCalibracionForm] = useState(initialCalibracionForm);

  const initialLecturaForm = {
    id_sensor: '',
    fecha_hora: new Date().toISOString().slice(0, 16),
    humedad_10cm: '',
    humedad_30cm: '',
    humedad_60cm: '',
    temperatura_suelo_c: '',
    conductividad_electrica_ds_m: '',
    ph_suelo: '',
    bateria_pct: ''
  };
  const [lecturaForm, setLecturaForm] = useState(initialLecturaForm);

  // Cargar Catálogos Iniciales
  useEffect(() => {
    fetchFincasYLotes();
    fetchSensores();
  }, []);

  const fetchFincasYLotes = async () => {
    try {
      const [resFincas, resLotes] = await Promise.all([
        authFetch('/api/tables/fincas'),
        authFetch('/api/suelos/catalogos/lotes')
      ]);
      const dataFincas = await resFincas.json();
      const dataLotes = await resLotes.json();
      if (Array.isArray(dataFincas)) setFincas(dataFincas);
      if (Array.isArray(dataLotes)) setLotes(dataLotes);
    } catch (err) {
      console.error('Error cargando catálogos:', err);
    }
  };

  const fetchSensores = async () => {
    setLoading(true);
    try {
      let url = '/api/sensores/dispositivos';
      const params = new URLSearchParams();
      if (selectedFinca) params.append('fincaId', selectedFinca);
      if (selectedLote) params.append('loteId', selectedLote);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await authFetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSensores(data);
        if (data.length > 0 && !selectedSensorId) {
          setSelectedSensorId(data[0].id_sensor);
        }
      }
    } catch (err) {
      console.error('Error consultando sensores:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar telemetría cuando cambia el sensor seleccionado
  useEffect(() => {
    if (selectedSensorId) {
      fetchTelemetria(selectedSensorId);
      fetchCalibraciones(selectedSensorId);
    }
  }, [selectedSensorId]);

  const fetchTelemetria = async (sensorId) => {
    try {
      const res = await authFetch(`/api/sensores/lecturas/${sensorId}?limite=50`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTelemetriaLecturas(data);
      }
    } catch (err) {
      console.error('Error cargando telemetría:', err);
    }
  };

  const fetchCalibraciones = async (sensorId) => {
    try {
      const res = await authFetch(`/api/sensores/calibraciones/${sensorId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setCalibraciones(data);
      }
    } catch (err) {
      console.error('Error cargando calibraciones:', err);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchSensores();
    if (selectedSensorId) {
      await fetchTelemetria(selectedSensorId);
      await fetchCalibraciones(selectedSensorId);
    }
    setRefreshing(false);
  };

  // Sensor activo seleccionado
  const activeSensor = useMemo(() => {
    return sensores.find(s => s.id_sensor === Number(selectedSensorId)) || sensores[0] || null;
  }, [sensores, selectedSensorId]);

  // Filtrado de lotes según finca seleccionada
  const lotesFiltrados = useMemo(() => {
    if (!selectedFinca) return lotes;
    return lotes.filter(l => String(l.id_finca) === String(selectedFinca));
  }, [lotes, selectedFinca]);

  // Sensores filtrados para la tabla
  const sensoresFiltrados = useMemo(() => {
    return sensores.filter(s => {
      const matchSearch = (s.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.codigo_sensor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.lote_nombre || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || s.estado === statusFilter;
      const matchFinca = !selectedFinca || String(s.id_finca) === String(selectedFinca);
      const matchLote = !selectedLote || String(s.id_lote) === String(selectedLote);
      return matchSearch && matchStatus && matchFinca && matchLote;
    });
  }, [sensores, searchTerm, statusFilter, selectedFinca, selectedLote]);

  // Paginación
  const totalPages = Math.ceil(sensoresFiltrados.length / itemsPerPage);
  const currentSensores = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sensoresFiltrados.slice(start, start + itemsPerPage);
  }, [sensoresFiltrados, currentPage]);

  // Coordenadas para el mapa
  const mapCoords = useMemo(() => {
    const coords = [];
    sensores.forEach(s => {
      if (s.latitud && s.longitud) {
        coords.push([parseFloat(s.latitud), parseFloat(s.longitud)]);
      }
    });
    return coords.length > 0 ? coords : [[4.6097, -74.0817]];
  }, [sensores]);

  // Guardar Nuevo Sensor (100% Real a Base de Datos MySQL)
  const handleGuardarSensor = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedbackMsg(null);

    try {
      const res = await authFetch('/api/sensores/dispositivos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sensorForm)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar sensor');
      }

      setFeedbackMsg({ type: 'success', text: 'Sensor IoT guardado exitosamente en base de datos.' });
      setShowModalSensor(false);
      setSensorForm(initialSensorForm);
      await fetchSensores();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Guardar Nueva Calibración
  const handleGuardarCalibracion = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedbackMsg(null);

    try {
      const res = await authFetch('/api/sensores/calibraciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...calibracionForm,
          id_sensor: calibracionForm.id_sensor || selectedSensorId
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar calibración');
      }

      setFeedbackMsg({ type: 'success', text: 'Calibración guardada exitosamente en la base de datos.' });
      setShowModalCalibracion(false);
      setCalibracionForm(initialCalibracionForm);
      if (selectedSensorId) fetchCalibraciones(selectedSensorId);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Inyectar / Registrar Lectura de Telemetría Real
  const handleGuardarLecturaManual = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedbackMsg(null);

    try {
      const res = await authFetch('/api/sensores/telemetria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lecturaForm,
          id_sensor: lecturaForm.id_sensor || selectedSensorId
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar telemetría');
      }

      setFeedbackMsg({ 
        type: 'success', 
        text: data.alerta_disparada 
          ? 'Lectura guardada. ¡ALERTA DISPARADA: Umbral de estrés o salinidad superado!' 
          : 'Lectura de telemetría guardada en la base de datos.' 
      });
      setShowModalLecturaManual(false);
      setLecturaForm(initialLecturaForm);
      if (selectedSensorId) fetchTelemetria(selectedSensorId);
      fetchSensores();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar Sensor
  const handleEliminarSensor = async (id, nombre) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el sensor "${nombre}" y su historial de lecturas?`)) return;
    try {
      const res = await authFetch(`/api/sensores/dispositivos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSensores();
      }
    } catch (err) {
      console.error('Error eliminando sensor:', err);
    }
  };

  // Columnas para ExportButtons
  const exportColumns = [
    { header: 'Código Sonda', accessor: 'codigo_sensor' },
    { header: 'Nombre Sonda', accessor: 'nombre' },
    { header: 'Tipo Sensor', accessor: 'tipo_sensor' },
    { header: 'Finca', accessor: 'finca_nombre' },
    { header: 'Lote', accessor: 'lote_nombre' },
    { header: 'Estado', accessor: 'estado' },
    { header: 'Humedad 10cm (%)', accessor: 'ultima_humedad_10cm' },
    { header: 'Humedad 30cm (%)', accessor: 'ultima_humedad_30cm' },
    { header: 'Humedad 60cm (%)', accessor: 'ultima_humedad_60cm' },
    { header: 'Temperatura (°C)', accessor: 'ultima_temp_suelo' },
    { header: 'Conductividad (dS/m)', accessor: 'ultima_ce' },
    { header: 'Fecha Instalación', accessor: 'fecha_instalacion' }
  ];

  // Gráfico SVG de Humedad Multinivel
  const renderGraficoHumedad = () => {
    if (!telemetriaLecturas || telemetriaLecturas.length === 0) {
      return (
        <div className="telemetria-empty-chart">
          <Droplets size={36} color="#94a3b8" />
          <p>No se han registrado series temporales de telemetría para esta sonda.</p>
          <button 
            className="btn-link-action"
            onClick={() => {
              setLecturaForm(prev => ({ ...prev, id_sensor: selectedSensorId }));
              setShowModalLecturaManual(true);
            }}
          >
            Registrar primera lectura en BD
          </button>
        </div>
      );
    }

    // Ordenar cronológicamente (más antiguo a más reciente para el eje X)
    const dataSorted = [...telemetriaLecturas].reverse();
    const width = 800;
    const height = 300;
    const padding = { top: 30, right: 30, bottom: 40, left: 50 };

    const minVal = 10;
    const maxVal = 45;
    const rangeY = maxVal - minVal;

    const getX = (idx) => padding.left + (idx / (dataSorted.length - 1 || 1)) * (width - padding.left - padding.right);
    const getY = (val) => {
      const v = Math.max(minVal, Math.min(maxVal, parseFloat(val) || minVal));
      return height - padding.bottom - ((v - minVal) / rangeY) * (height - padding.top - padding.bottom);
    };

    const points10 = dataSorted.map((d, i) => `${getX(i)},${getY(d.humedad_10cm)}`).join(' ');
    const points30 = dataSorted.map((d, i) => `${getX(i)},${getY(d.humedad_30cm)}`).join(' ');
    const points60 = dataSorted.map((d, i) => `${getX(i)},${getY(d.humedad_60cm)}`).join(' ');

    const umbralEstres = activeSensor?.umbral_estres_humedad || 18;
    const umbralSat = activeSensor?.umbral_saturacion_humedad || 36;

    const yEstres = getY(umbralEstres);
    const ySat = getY(umbralSat);

    return (
      <div className="svg-chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="telemetria-svg">
          <defs>
            <linearGradient id="gradOptimal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Zona Óptima de Agua en el Suelo */}
          <rect 
            x={padding.left} 
            y={ySat} 
            width={width - padding.left - padding.right} 
            height={Math.max(0, yEstres - ySat)} 
            fill="url(#gradOptimal)" 
          />

          {/* Líneas de Guía Horizontal */}
          {[15, 20, 25, 30, 35, 40].map((v) => (
            <g key={v}>
              <line 
                x1={padding.left} 
                y1={getY(v)} 
                x2={width - padding.right} 
                y2={getY(v)} 
                stroke="#e2e8f0" 
                strokeDasharray="3 3" 
              />
              <text x={padding.left - 8} y={getY(v) + 4} fill="#94a3b8" fontSize="11" textAnchor="end">
                {v}%
              </text>
            </g>
          ))}

          {/* Línea Umbral Estrés Hídrico */}
          <line 
            x1={padding.left} 
            y1={yEstres} 
            x2={width - padding.right} 
            y2={yEstres} 
            stroke="#ef4444" 
            strokeWidth="2" 
            strokeDasharray="4 4" 
          />
          <text x={width - padding.right} y={yEstres - 6} fill="#ef4444" fontSize="11" fontWeight="bold" textAnchor="end">
            Umbral Estrés ({umbralEstres}%)
          </text>

          {/* Línea Umbral Saturación */}
          <line 
            x1={padding.left} 
            y1={ySat} 
            x2={width - padding.right} 
            y2={ySat} 
            stroke="#3b82f6" 
            strokeWidth="2" 
            strokeDasharray="4 4" 
          />
          <text x={width - padding.right} y={ySat - 6} fill="#3b82f6" fontSize="11" fontWeight="bold" textAnchor="end">
            Capacidad Máx / Saturación ({umbralSat}%)
          </text>

          {/* Curvas de Humedad */}
          <polyline fill="none" stroke="#06b6d4" strokeWidth="2.5" points={points10} />
          <polyline fill="none" stroke="#3b82f6" strokeWidth="2.5" points={points30} />
          <polyline fill="none" stroke="#1d4ed8" strokeWidth="2.5" points={points60} />

          {/* Puntos y Vértices */}
          {dataSorted.map((d, i) => (
            <g key={i}>
              <circle cx={getX(i)} cy={getY(d.humedad_10cm)} r="3.5" fill="#06b6d4" />
              <circle cx={getX(i)} cy={getY(d.humedad_30cm)} r="3.5" fill="#3b82f6" />
              <circle cx={getX(i)} cy={getY(d.humedad_60cm)} r="3.5" fill="#1d4ed8" />
            </g>
          ))}

          {/* Eje X Fechas */}
          {dataSorted.map((d, i) => {
            if (i % Math.ceil(dataSorted.length / 6) === 0 || i === dataSorted.length - 1) {
              const dt = new Date(d.fecha_hora);
              const label = `${dt.getHours()}:${String(dt.getMinutes()).padStart(2, '0')}`;
              return (
                <text key={i} x={getX(i)} y={height - 10} fill="#64748b" fontSize="10" textAnchor="middle">
                  {label}
                </text>
              );
            }
            return null;
          })}
        </svg>

        {/* Leyenda del Gráfico */}
        <div className="chart-legend">
          <div className="legend-item"><span className="legend-color" style={{ background: '#06b6d4' }}></span> Humedad 10 cm (Superficial)</div>
          <div className="legend-item"><span className="legend-color" style={{ background: '#3b82f6' }}></span> Humedad 30 cm (Zona Radicular)</div>
          <div className="legend-item"><span className="legend-color" style={{ background: '#1d4ed8' }}></span> Humedad 60 cm (Subsuelo / Drenaje)</div>
          <div className="legend-item"><span className="legend-line-dashed" style={{ borderColor: '#ef4444' }}></span> Límite Estrés Hídrico</div>
          <div className="legend-item"><span className="legend-line-dashed" style={{ borderColor: '#3b82f6' }}></span> Capacidad de Campo / Saturación</div>
        </div>
      </div>
    );
  };

  return (
    <div className="sensores-iot-container">
      {/* HEADER DE MÓDULO */}
      <div className="sensores-header">
        <div className="header-titles">
          <div className="badge-modulo">MÓDULO 2 • SENSORES AGRÍCOLAS & TELEMETRÍA IOT</div>
          <h2>Red de Monitoreo & Sondas de Humedad en Suelo</h2>
          <p>Supervisión continua de contenido volumétrico de agua (VWC), temperatura radicular, salinidad CE y balance hídrico.</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn-refresh" 
            onClick={handleManualRefresh} 
            disabled={refreshing}
            title="Refrescar datos en tiempo real"
          >
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Sincronizando...' : 'Actualizar'}</span>
          </button>

          <button 
            className="btn-primary-iot"
            onClick={() => {
              setSensorForm(initialSensorForm);
              setShowModalSensor(true);
            }}
          >
            <Plus size={16} />
            <span>Registrar Nueva Sonda</span>
          </button>
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

      {/* BARRA DE KPIS OPERACIONALES */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-box" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <Radio size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Sondas Conectadas</span>
            <span className="kpi-value">{sensores.length}</span>
            <span className="kpi-sub">
              {sensores.filter(s => s.estado === 'Activo').length} operando en línea
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <Droplets size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Humedad Radicular Prom.</span>
            <span className="kpi-value">
              {activeSensor?.ultima_humedad_30cm ? `${activeSensor.ultima_humedad_30cm}%` : '--'}
            </span>
            <span className="kpi-sub">Profundidad activa 30 cm</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Zap size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Conductividad Eléctrica</span>
            <span className="kpi-value">
              {activeSensor?.ultima_ce ? `${activeSensor.ultima_ce} dS/m` : '--'}
            </span>
            <span className="kpi-sub">Control de salinidad radicular</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box" style={{ background: '#f1f5f9', color: '#475569' }}>
            <Battery size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Batería Promedio Nodos</span>
            <span className="kpi-value">
              {activeSensor?.bateria_pct ? `${activeSensor.bateria_pct}%` : '92%'}
            </span>
            <span className="kpi-sub">Alimentación Solar / Batería Li</span>
          </div>
        </div>
      </div>

      {/* FILTROS GLOBALES DE SELECCIÓN */}
      <div className="filters-bar-precision">
        <div className="filter-select-group">
          <label>Finca:</label>
          <select 
            value={selectedFinca} 
            onChange={(e) => {
              setSelectedFinca(e.target.value);
              setSelectedLote('');
            }}
            className="select-precision"
          >
            <option value="">Todas las Fincas</option>
            {fincas.map(f => (
              <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>
            ))}
          </select>
        </div>

        <div className="filter-select-group">
          <label>Lote:</label>
          <select 
            value={selectedLote} 
            onChange={(e) => setSelectedLote(e.target.value)}
            className="select-precision"
          >
            <option value="">Todos los Lotes</option>
            {lotesFiltrados.map(l => (
              <option key={l.id_lote} value={l.id_lote}>{l.nombre}</option>
            ))}
          </select>
        </div>

        <div className="filter-select-group">
          <label>Sonda Activa:</label>
          <select 
            value={selectedSensorId || ''} 
            onChange={(e) => setSelectedSensorId(Number(e.target.value))}
            className="select-precision highlight-select"
          >
            {sensores.map(s => (
              <option key={s.id_sensor} value={s.id_sensor}>
                {s.codigo_sensor} - {s.nombre} ({s.lote_nombre})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div className="precision-tabs-nav">
        <button 
          className={`tab-btn ${activeTab === 'telemetria' ? 'active' : ''}`}
          onClick={() => setActiveTab('telemetria')}
        >
          <Activity size={16} />
          <span>Curvas de Humedad & Telemetría</span>
        </button>

        <button 
          className={`tab-btn ${activeTab === 'mapa' ? 'active' : ''}`}
          onClick={() => setActiveTab('mapa')}
        >
          <MapPin size={16} />
          <span>Mapa Georreferenciado de Sondas</span>
        </button>

        <button 
          className={`tab-btn ${activeTab === 'dispositivos' ? 'active' : ''}`}
          onClick={() => setActiveTab('dispositivos')}
        >
          <Cpu size={16} />
          <span>Catálogo de Dispositivos ({sensores.length})</span>
        </button>

        <button 
          className={`tab-btn ${activeTab === 'calibraciones' ? 'active' : ''}`}
          onClick={() => setActiveTab('calibraciones')}
        >
          <Sliders size={16} />
          <span>Calibraciones Gravimétricas</span>
        </button>
      </div>

      {/* CONTENIDO SEGÚN PESTAÑA */}
      <div className="tab-content-wrapper">
        
        {/* TAB 1: CURVAS DE HUMEDAD Y TELEMETRÍA */}
        {activeTab === 'telemetria' && (
          <div className="telemetria-view">
            {/* Tarjeta de Resumen de la Sonda Seleccionada */}
            <div className="sensor-active-banner">
              <div className="sensor-info-block">
                <span className="sensor-tag">{activeSensor?.codigo_sensor || 'S/C'}</span>
                <h3>{activeSensor?.nombre || 'Seleccione una sonda'}</h3>
                <div className="sensor-meta-row">
                  <span><strong>Finca:</strong> {activeSensor?.finca_nombre || 'N/A'}</span>
                  <span><strong>Lote:</strong> {activeSensor?.lote_nombre || 'N/A'}</span>
                  <span><strong>Hardware:</strong> {activeSensor?.marca_modelo || 'Genérico'}</span>
                  <span><strong>Profundidades:</strong> {activeSensor?.profundidades_cm || '10,30,60'} cm</span>
                </div>
              </div>

              <div className="sensor-status-block">
                <div className="status-pill active">
                  <span className="dot"></span> {activeSensor?.estado || 'Desconectado'}
                </div>
                <button 
                  className="btn-manual-reading"
                  onClick={() => {
                    setLecturaForm(prev => ({ ...prev, id_sensor: activeSensor?.id_sensor || '' }));
                    setShowModalLecturaManual(true);
                  }}
                >
                  <Plus size={14} /> Registrar Telemetría Manual
                </button>
              </div>
            </div>

            {/* Módulo de Gráfico Interactivo de Humedad Multinivel */}
            <div className="chart-card-box">
              <div className="chart-card-header">
                <div>
                  <h4>Dinámica Hídrica del Suelo (Contenido Volumétrico de Agua - VWC %)</h4>
                  <p>Seguimiento por estratos de absorción radicular vs. Umbrales agronómicos de estrés y saturación.</p>
                </div>
                <div className="sensor-battery-badge">
                  <Battery size={16} color="#10b981" />
                  <span>Batería: {activeSensor?.bateria_pct || 90}%</span>
                </div>
              </div>

              {renderGraficoHumedad()}
            </div>

            {/* Fila de Lecturas Actuales */}
            <div className="metrics-depth-row">
              <div className="depth-card">
                <span className="depth-title">Estrato 10 cm</span>
                <span className="depth-val">{activeSensor?.ultima_humedad_10cm ? `${activeSensor.ultima_humedad_10cm}%` : '--'}</span>
                <span className="depth-desc">Humedad Superficial / Evaporación</span>
              </div>
              <div className="depth-card primary">
                <span className="depth-title">Estrato 30 cm</span>
                <span className="depth-val">{activeSensor?.ultima_humedad_30cm ? `${activeSensor.ultima_humedad_30cm}%` : '--'}</span>
                <span className="depth-desc">Bulbo Húmedo / Zona Radicular Activa</span>
              </div>
              <div className="depth-card">
                <span className="depth-title">Estrato 60 cm</span>
                <span className="depth-val">{activeSensor?.ultima_humedad_60cm ? `${activeSensor.ultima_humedad_60cm}%` : '--'}</span>
                <span className="depth-desc">Subsuelo / Drenaje Profundo</span>
              </div>
              <div className="depth-card">
                <span className="depth-title">Temperatura Suelo</span>
                <span className="depth-val">{activeSensor?.ultima_temp_suelo ? `${activeSensor.ultima_temp_suelo} °C` : '--'}</span>
                <span className="depth-desc">Actividad biológica del suelo</span>
              </div>
              <div className="depth-card">
                <span className="depth-title">Salinidad (CE)</span>
                <span className="depth-val">{activeSensor?.ultima_ce ? `${activeSensor.ultima_ce} dS/m` : '--'}</span>
                <span className="depth-desc">Conductividad de solución del suelo</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MAPA GEORREFERENCIADO */}
        {activeTab === 'mapa' && (
          <div className="map-view-box">
            <div className="map-wrapper-leaflet">
              <MapContainer 
                center={mapCoords[0]} 
                zoom={15} 
                style={{ height: '550px', width: '100%', borderRadius: '12px' }}
              >
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution="Esri World Imagery"
                />
                <MapRecenter coords={mapCoords} />

                {/* Marcadores de Sensores en el Lote */}
                {sensores.map(s => {
                  if (!s.latitud || !s.longitud) return null;
                  const lat = parseFloat(s.latitud);
                  const lng = parseFloat(s.longitud);
                  const isAlert = s.ultima_humedad_30cm && parseFloat(s.ultima_humedad_30cm) <= parseFloat(s.umbral_estres_humedad);

                  return (
                    <Marker 
                      key={s.id_sensor} 
                      position={[lat, lng]}
                      icon={createSensorIcon(s.estado, isAlert)}
                    >
                      <Popup>
                        <div className="sensor-popup-content">
                          <h4>{s.nombre}</h4>
                          <span className="sensor-code-badge">{s.codigo_sensor}</span>
                          <div className="popup-metrics">
                            <div><strong>Humedad 10cm:</strong> {s.ultima_humedad_10cm || '--'}%</div>
                            <div><strong>Humedad 30cm:</strong> {s.ultima_humedad_30cm || '--'}%</div>
                            <div><strong>Humedad 60cm:</strong> {s.ultima_humedad_60cm || '--'}%</div>
                            <div><strong>Temp Suelo:</strong> {s.ultima_temp_suelo || '--'} °C</div>
                            <div><strong>Salinidad CE:</strong> {s.ultima_ce || '--'} dS/m</div>
                            <div><strong>Batería:</strong> {s.bateria_pct || 90}%</div>
                          </div>
                          <div className="popup-actions">
                            <button 
                              className="btn-popup-select"
                              onClick={() => {
                                setSelectedSensorId(s.id_sensor);
                                setActiveTab('telemetria');
                              }}
                            >
                              Ver Curvas de Telemetría
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        )}

        {/* TAB 3: CATÁLOGO DE DISPOSITIVOS */}
        {activeTab === 'dispositivos' && (
          <div className="dispositivos-view">
            {/* BARRA DE HERRAMIENTAS: BÚSQUEDA Y EXPORTACIÓN */}
            <div className="table-actions-bar">
              <div className="search-box">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar por código, nombre o lote..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="export-and-filters">
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="status-select"
                >
                  <option value="ALL">Todos los Estados</option>
                  <option value="Activo">Activos</option>
                  <option value="Inactivo">Inactivos</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                </select>

                <ExportButtons 
                  data={sensoresFiltrados} 
                  columns={exportColumns} 
                  filename="Sensores_IoT_Suelos" 
                />
              </div>
            </div>

            {/* TABLA DE DISPOSITIVOS */}
            <div className="table-responsive-box">
              <table className="precision-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre Sonda</th>
                    <th>Tipo</th>
                    <th>Finca / Lote</th>
                    <th>Coordenadas GPS</th>
                    <th>Última Humedad</th>
                    <th>Batería</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSensores.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-6">
                        No se encontraron dispositivos que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    currentSensores.map(s => (
                      <tr key={s.id_sensor}>
                        <td className="font-bold text-slate-800">{s.codigo_sensor}</td>
                        <td>{s.nombre}</td>
                        <td>
                          <span className="sensor-type-pill">{s.tipo_sensor}</span>
                        </td>
                        <td>{s.finca_nombre} &bull; {s.lote_nombre}</td>
                        <td className="font-mono text-xs">{parseFloat(s.latitud).toFixed(5)}, {parseFloat(s.longitud).toFixed(5)}</td>
                        <td>
                          {s.ultima_humedad_30cm ? (
                            <span className="font-semibold text-emerald-600">{s.ultima_humedad_30cm}%</span>
                          ) : (
                            <span className="text-slate-400">Sin datos</span>
                          )}
                        </td>
                        <td>
                          <span className="battery-val">{s.bateria_pct || 90}%</span>
                        </td>
                        <td>
                          <span className={`status-badge-pill ${s.estado.toLowerCase()}`}>
                            {s.estado}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons-cell">
                            <button 
                              className="btn-icon-action" 
                              title="Ver telemetría"
                              onClick={() => {
                                setSelectedSensorId(s.id_sensor);
                                setActiveTab('telemetria');
                              }}
                            >
                              <Activity size={16} />
                            </button>
                            <button 
                              className="btn-icon-action delete" 
                              title="Eliminar sensor"
                              onClick={() => handleEliminarSensor(s.id_sensor, s.nombre)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINACIÓN */}
            {totalPages > 1 && (
              <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={setCurrentPage} 
              />
            )}
          </div>
        )}

        {/* TAB 4: CALIBRACIONES */}
        {activeTab === 'calibraciones' && (
          <div className="calibraciones-view">
            <div className="calibraciones-header">
              <div>
                <h4>Calibraciones Gravimétricas de Sondas</h4>
                <p>Ajuste de coeficientes A y B en laboratorio para correlacionar constante dieléctrica con contenido volumétrico real.</p>
              </div>
              <button 
                className="btn-primary-iot"
                onClick={() => {
                  setCalibracionForm({
                    ...initialCalibracionForm,
                    id_sensor: selectedSensorId || ''
                  });
                  setShowModalCalibracion(true);
                }}
              >
                <Plus size={16} /> Nueva Calibración
              </button>
            </div>

            <div className="calibraciones-list">
              {calibraciones.length === 0 ? (
                <div className="empty-calibraciones">
                  <Sliders size={36} color="#94a3b8" />
                  <p>No se han registrado calibraciones de laboratorio para esta sonda.</p>
                </div>
              ) : (
                calibraciones.map(c => (
                  <div key={c.id_calibracion} className="calibracion-card">
                    <div className="calib-header">
                      <span className="calib-date">{new Date(c.fecha_calibracion).toLocaleDateString()}</span>
                      <span className="calib-soil">{c.tipo_suelo_calibrado}</span>
                    </div>
                    <div className="calib-params">
                      <div><strong>Coeficiente A:</strong> {c.coeficiente_a || '1.000'}</div>
                      <div><strong>Coeficiente B:</strong> {c.coeficiente_b || '0.000'}</div>
                      <div><strong>Técnico:</strong> {c.tecnico_responsable}</div>
                    </div>
                    {c.observaciones && <p className="calib-notes">{c.observaciones}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTRAR NUEVO SENSOR (CAMPOS 100% LIMPIOS, SIN DEMO)          */}
      {/* ========================================================================= */}
      {showModalSensor && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Registrar Sonda de Monitoreo IoT</h3>
              <button className="btn-close" onClick={() => setShowModalSensor(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleGuardarSensor} className="modal-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Finca Destino *</label>
                  <select 
                    required 
                    value={sensorForm.id_finca}
                    onChange={(e) => setSensorForm({ ...sensorForm, id_finca: e.target.value, id_lote: '' })}
                  >
                    <option value="">Seleccione Finca</option>
                    {fincas.map(f => (
                      <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Lote Destino *</label>
                  <select 
                    required 
                    value={sensorForm.id_lote}
                    onChange={(e) => setSensorForm({ ...sensorForm, id_lote: e.target.value })}
                    disabled={!sensorForm.id_finca}
                  >
                    <option value="">Seleccione Lote</option>
                    {lotes
                      .filter(l => String(l.id_finca) === String(sensorForm.id_finca))
                      .map(l => (
                        <option key={l.id_lote} value={l.id_lote}>{l.nombre}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Código Sensor (Único) *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej. SND-FDR-010"
                    value={sensorForm.codigo_sensor}
                    onChange={(e) => setSensorForm({ ...sensorForm, codigo_sensor: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Nombre Identificador *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej. Sonda Multinivel Lote 2"
                    value={sensorForm.nombre}
                    onChange={(e) => setSensorForm({ ...sensorForm, nombre: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Tipo de Sensor</label>
                  <select 
                    value={sensorForm.tipo_sensor}
                    onChange={(e) => setSensorForm({ ...sensorForm, tipo_sensor: e.target.value })}
                  >
                    <option value="Humedad_Multinivel">Humedad Multinivel (FDR/TDR)</option>
                    <option value="Sonda_CE_pH">Sonda CE y pH</option>
                    <option value="Estacion_Climatica">Estación Meteorológica</option>
                    <option value="Tensiometro">Tensiómetro Digital</option>
                    <option value="Caudalimetro">Caudalímetro de Riego</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Marca / Modelo Hardware</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Sentek Drill & Drop 60cm"
                    value={sensorForm.marca_modelo}
                    onChange={(e) => setSensorForm({ ...sensorForm, marca_modelo: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Latitud GPS *</label>
                  <input 
                    type="number" 
                    step="any"
                    required
                    placeholder="Ej. 4.60971"
                    value={sensorForm.latitud}
                    onChange={(e) => setSensorForm({ ...sensorForm, latitud: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Longitud GPS *</label>
                  <input 
                    type="number" 
                    step="any"
                    required
                    placeholder="Ej. -74.08175"
                    value={sensorForm.longitud}
                    onChange={(e) => setSensorForm({ ...sensorForm, longitud: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>Umbral Estrés (%)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={sensorForm.umbral_estres_humedad}
                    onChange={(e) => setSensorForm({ ...sensorForm, umbral_estres_humedad: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Umbral Saturación (%)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={sensorForm.umbral_saturacion_humedad}
                    onChange={(e) => setSensorForm({ ...sensorForm, umbral_saturacion_humedad: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Máx. Salinidad CE (dS/m)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={sensorForm.umbral_max_ce_ds_m}
                    onChange={(e) => setSensorForm({ ...sensorForm, umbral_max_ce_ds_m: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Fecha de Instalación</label>
                <DatePickerClaro value={sensorForm.fecha_instalacion}
                  onChange={(e) => setSensorForm({ ...sensorForm, fecha_instalacion: e.target.value })} />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModalSensor(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={submitting}>
                  {submitting ? 'Guardando en BD...' : 'Guardar Sensor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INGESTA / REGISTRO MANUAL DE TELEMETRÍA                           */}
      {/* ========================================================================= */}
      {showModalLecturaManual && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Ingesta de Telemetría Sonda IoT</h3>
              <button className="btn-close" onClick={() => setShowModalLecturaManual(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleGuardarLecturaManual} className="modal-form">
              <div className="form-group">
                <label>Sonda Receptora *</label>
                <select 
                  required
                  value={lecturaForm.id_sensor}
                  onChange={(e) => setLecturaForm({ ...lecturaForm, id_sensor: e.target.value })}
                >
                  <option value="">Seleccione Sonda</option>
                  {sensores.map(s => (
                    <option key={s.id_sensor} value={s.id_sensor}>{s.codigo_sensor} - {s.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Fecha y Hora de la Lectura *</label>
                <input 
                  type="datetime-local" 
                  required
                  value={lecturaForm.fecha_hora}
                  onChange={(e) => setLecturaForm({ ...lecturaForm, fecha_hora: e.target.value })}
                />
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>Humedad 10cm (%) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    placeholder="Ej. 24.5"
                    value={lecturaForm.humedad_10cm}
                    onChange={(e) => setLecturaForm({ ...lecturaForm, humedad_10cm: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Humedad 30cm (%) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    placeholder="Ej. 28.2"
                    value={lecturaForm.humedad_30cm}
                    onChange={(e) => setLecturaForm({ ...lecturaForm, humedad_30cm: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Humedad 60cm (%) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    placeholder="Ej. 31.0"
                    value={lecturaForm.humedad_60cm}
                    onChange={(e) => setLecturaForm({ ...lecturaForm, humedad_60cm: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>Temperatura Suelo (°C)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    placeholder="Ej. 21.8"
                    value={lecturaForm.temperatura_suelo_c}
                    onChange={(e) => setLecturaForm({ ...lecturaForm, temperatura_suelo_c: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Conductividad CE (dS/m)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="Ej. 1.25"
                    value={lecturaForm.conductividad_electrica_ds_m}
                    onChange={(e) => setLecturaForm({ ...lecturaForm, conductividad_electrica_ds_m: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Batería Nodo (%)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="100" 
                    placeholder="Ej. 95"
                    value={lecturaForm.bateria_pct}
                    onChange={(e) => setLecturaForm({ ...lecturaForm, bateria_pct: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModalLecturaManual(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={submitting}>
                  {submitting ? 'Procesando telemetría...' : 'Registrar Lectura en BD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: NUEVA CALIBRACIÓN DE LABORATORIO                                  */}
      {/* ========================================================================= */}
      {showModalCalibracion && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Calibración de Sonda en Laboratorio</h3>
              <button className="btn-close" onClick={() => setShowModalCalibracion(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleGuardarCalibracion} className="modal-form">
              <div className="form-group">
                <label>Sonda a Calibrar *</label>
                <select 
                  required
                  value={calibracionForm.id_sensor}
                  onChange={(e) => setCalibracionForm({ ...calibracionForm, id_sensor: e.target.value })}
                >
                  <option value="">Seleccione Sonda</option>
                  {sensores.map(s => (
                    <option key={s.id_sensor} value={s.id_sensor}>{s.codigo_sensor} - {s.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Tipo de Suelo Calibrado *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej. Franco Arcilloso"
                    value={calibracionForm.tipo_suelo_calibrado}
                    onChange={(e) => setCalibracionForm({ ...calibracionForm, tipo_suelo_calibrado: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Fecha de Calibración *</label>
                  <DatePickerClaro required
                    value={calibracionForm.fecha_calibracion}
                    onChange={(e) => setCalibracionForm({ ...calibracionForm, fecha_calibracion: e.target.value })} />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Coeficiente A (Pendiente)</label>
                  <input 
                    type="number" 
                    step="0.001" 
                    placeholder="Ej. 1.120"
                    value={calibracionForm.coeficiente_a}
                    onChange={(e) => setCalibracionForm({ ...calibracionForm, coeficiente_a: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Coeficiente B (Intersección)</label>
                  <input 
                    type="number" 
                    step="0.001" 
                    placeholder="Ej. -0.045"
                    value={calibracionForm.coeficiente_b}
                    onChange={(e) => setCalibracionForm({ ...calibracionForm, coeficiente_b: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Técnico Responsable *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej. Ing. Agrónomo Carlos Mendoza"
                  value={calibracionForm.tecnico_responsable}
                  onChange={(e) => setCalibracionForm({ ...calibracionForm, tecnico_responsable: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Observaciones de Laboratorio</label>
                <textarea 
                  rows="2"
                  placeholder="Detalles del método gravimétrico o suelo de muestra..."
                  value={calibracionForm.observaciones}
                  onChange={(e) => setCalibracionForm({ ...calibracionForm, observaciones: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModalCalibracion(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Guardar Calibración'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
