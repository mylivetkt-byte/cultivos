import React, { useState, useEffect, useMemo } from 'react';
import DatePickerClaro from '../Common/DatePickerClaro';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  TrendingUp, DollarSign, Award, Layers, Plus, Search, 
  RefreshCw, CheckCircle2, AlertTriangle, ArrowUpRight, 
  Percent, Scale, FileText, X, ChevronRight, Share2, Sparkles
} from 'lucide-react';
import { authFetch } from '../../utils/api';
import ExportButtons from '../ExportButtons';
import Pagination from '../Pagination';
import './RendimientoROIManager.css';

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

export default function RendimientoROIManager() {
  const [activeTab, setActiveTab] = useState('roi'); // 'roi', 'mapas', 'visor-mapa'

  // Catálogos
  const [fincas, setFincas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [selectedFinca, setSelectedFinca] = useState('');
  const [selectedLote, setSelectedLote] = useState('');

  // Ensayos Strip Trials y Mapas
  const [trials, setTrials] = useState([]);
  const [mapas, setMapas] = useState([]);
  const [selectedMapa, setSelectedMapa] = useState(null);
  const [puntosMapa, setPuntosMapa] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Filtros y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modales
  const [showModalTrial, setShowModalTrial] = useState(false);
  const [showModalMapa, setShowModalMapa] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Formularios (100% LIMPIOS, CERO REGISTROS DEMO)
  const initialTrialForm = {
    id_finca: '',
    id_lote: '',
    codigo_ensayo: '',
    nombre: '',
    tratamiento_control: 'Dosis Fija Convencional',
    tratamiento_vra: 'Dosis Variable VRA',
    costo_insumo_control_ha: '',
    costo_insumo_vra_ha: '',
    rendimiento_control_ton_ha: '',
    rendimiento_vra_ton_ha: '',
    precio_venta_tonelada: '',
    fecha_evaluacion: new Date().toISOString().split('T')[0],
    evaluador: '',
    observaciones: ''
  };
  const [trialForm, setTrialForm] = useState(initialTrialForm);

  const initialMapaForm = {
    id_finca: '',
    id_lote: '',
    codigo_mapa: '',
    nombre_cosecha: '',
    cultivo: '',
    fecha_cosecha: new Date().toISOString().split('T')[0],
    rendimiento_promedio_ton_ha: '',
    rendimiento_min_ton_ha: '',
    rendimiento_max_ton_ha: '',
    humedad_grano_promedio_porc: '14.00',
    archivo_origen_tipo: 'Monitor_Cosechadora'
  };
  const [mapaForm, setMapaForm] = useState(initialMapaForm);

  useEffect(() => {
    fetchFincasYLotes();
    fetchStripTrials();
    fetchMapas();
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

  const fetchStripTrials = async () => {
    setLoading(true);
    try {
      let url = '/api/rendimiento/strip-trials';
      const params = new URLSearchParams();
      if (selectedFinca) params.append('fincaId', selectedFinca);
      if (selectedLote) params.append('loteId', selectedLote);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await authFetch(url);
      const data = await res.json();
      if (Array.isArray(data)) setTrials(data);
    } catch (err) {
      console.error('Error consultando strip trials:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMapas = async () => {
    try {
      let url = '/api/rendimiento/mapas';
      const params = new URLSearchParams();
      if (selectedFinca) params.append('fincaId', selectedFinca);
      if (selectedLote) params.append('loteId', selectedLote);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await authFetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMapas(data);
        if (data.length > 0 && !selectedMapa) {
          setSelectedMapa(data[0]);
          fetchPuntosMapa(data[0].id_mapa);
        }
      }
    } catch (err) {
      console.error('Error cargando mapas de rendimiento:', err);
    }
  };

  const fetchPuntosMapa = async (idMapa) => {
    if (!idMapa) return;
    try {
      const res = await authFetch(`/api/rendimiento/mapas/${idMapa}/puntos`);
      const data = await res.json();
      if (Array.isArray(data)) setPuntosMapa(data);
    } catch (err) {
      console.error('Error cargando puntos de mapa:', err);
    }
  };

  // Guardar Strip Trial ROI en BD (100% Real)
  const handleGuardarTrial = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedbackMsg(null);

    try {
      const res = await authFetch('/api/rendimiento/strip-trials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trialForm)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error guardando strip trial');

      setFeedbackMsg({
        type: 'success',
        text: `Ensayo y ROI guardados en BD: Beneficio Neto = $${data.roi_neto_ha}/ha (Ahorro insumos: $${data.ahorro_insumos_ha}/ha)`
      });
      setShowModalTrial(false);
      setTrialForm(initialTrialForm);
      await fetchStripTrials();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Guardar Mapa de Cosecha en BD (100% Real)
  const handleGuardarMapa = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedbackMsg(null);

    try {
      const res = await authFetch('/api/rendimiento/mapas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapaForm)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al guardar mapa');

      setFeedbackMsg({ type: 'success', text: 'Mapa de cosecha guardado exitosamente en base de datos.' });
      setShowModalMapa(false);
      setMapaForm(initialMapaForm);
      await fetchMapas();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Coordenadas para mapa de calor/rendimiento
  const mapCoords = useMemo(() => {
    if (!puntosMapa || puntosMapa.length === 0) return [[4.6097, -74.0817]];
    return puntosMapa.map(p => [parseFloat(p.latitud), parseFloat(p.longitud)]);
  }, [puntosMapa]);

  // Color según densidad de rendimiento (kg/ha)
  const getYieldColor = (kg) => {
    if (kg >= 32000) return '#10b981'; // Verde alto
    if (kg >= 25000) return '#f59e0b'; // Amarillo medio
    return '#ef4444'; // Rojo bajo
  };

  // Resumen acumulado de ROI de todos los ensayos registrados
  const metricasROI = useMemo(() => {
    if (trials.length === 0) {
      return { totalEnsayos: 0, roiPromedio: 0, ahorroPromedio: 0, deltaRendPromedio: 0 };
    }
    const totalROI = trials.reduce((acc, t) => acc + (parseFloat(t.roi_neto_ha) || 0), 0);
    const totalAhorro = trials.reduce((acc, t) => acc + (parseFloat(t.ahorro_insumos_ha) || 0), 0);
    const totalDelta = trials.reduce((acc, t) => acc + (parseFloat(t.rendimiento_vra_ton_ha) - parseFloat(t.rendimiento_control_ton_ha) || 0), 0);
    return {
      totalEnsayos: trials.length,
      roiPromedio: +(totalROI / trials.length).toFixed(2),
      ahorroPromedio: +(totalAhorro / trials.length).toFixed(2),
      deltaRendPromedio: +(totalDelta / trials.length).toFixed(2)
    };
  }, [trials]);

  // Columnas para ExportButtons
  const exportColumns = [
    { header: 'Código Ensayo', accessor: 'codigo_ensayo' },
    { header: 'Nombre', accessor: 'nombre' },
    { header: 'Finca', accessor: 'finca_nombre' },
    { header: 'Lote', accessor: 'lote_nombre' },
    { header: 'Rend. Control (ton/ha)', accessor: 'rendimiento_control_ton_ha' },
    { header: 'Rend. VRA (ton/ha)', accessor: 'rendimiento_vra_ton_ha' },
    { header: 'Ahorro Insumos ($/ha)', accessor: 'ahorro_insumos_ha' },
    { header: 'Ingreso Adicional ($/ha)', accessor: 'ingreso_adicional_ha' },
    { header: 'ROI Neto Total ($/ha)', accessor: 'roi_neto_ha' },
    { header: 'Evaluador', accessor: 'evaluador' },
    { header: 'Fecha', accessor: 'fecha_evaluacion' }
  ];

  return (
    <div className="rendimiento-roi-container">
      {/* HEADER */}
      <div className="rendimiento-header">
        <div className="header-titles">
          <div className="badge-modulo-roi">MÓDULO 6 • MAPAS DE RENDIMIENTO & RETORNO ROI</div>
          <h2>Validación Agronómica & Rentabilidad Neta de la Precisión</h2>
          <p>Comparación empírica en franjas (Strip Trials: Dosis Fija vs. Dosis Variable VRA) y mapas de cosecha por cosechadora.</p>
        </div>

        <div className="header-actions">
          <button 
            className="btn-refresh" 
            onClick={() => {
              setRefreshing(true);
              fetchStripTrials();
              fetchMapas();
              setTimeout(() => setRefreshing(false), 500);
            }} 
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            <span>Actualizar</span>
          </button>

          <button 
            className="btn-primary-roi"
            onClick={() => {
              setTrialForm(initialTrialForm);
              setShowModalTrial(true);
            }}
          >
            <Plus size={16} />
            <span>Nuevo Strip Trial ROI</span>
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

      {/* KPIS DE RETORNO ECONÓMICO */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
            <DollarSign size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Beneficio Neto Promedio</span>
            <span className="kpi-value text-emerald-600">
              ${metricasROI.roiPromedio.toLocaleString()} / ha
            </span>
            <span className="kpi-sub">Retorno sobre inversión de VRA</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <Scale size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Ahorro en Fertilizantes/Insumos</span>
            <span className="kpi-value">
              ${metricasROI.ahorroPromedio.toLocaleString()} / ha
            </span>
            <span className="kpi-sub">Dosis ajustada a potencial real</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
            <TrendingUp size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Ganancia en Rendimiento ($\Delta$)</span>
            <span className="kpi-value">
              +{metricasROI.deltaRendPromedio} ton/ha
            </span>
            <span className="kpi-sub">VRA vs Testigo Dosis Fija</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box" style={{ background: '#f1f5f9', color: '#475569' }}>
            <Award size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">Strip Trials Evaluados</span>
            <span className="kpi-value">{metricasROI.totalEnsayos}</span>
            <span className="kpi-sub">Ensayos en campo registrados</span>
          </div>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="precision-tabs-nav">
        <button 
          className={`tab-btn ${activeTab === 'roi' ? 'active' : ''}`}
          onClick={() => setActiveTab('roi')}
        >
          <TrendingUp size={16} />
          <span>Ensayos Strip Trials & Matriz ROI ({trials.length})</span>
        </button>

        <button 
          className={`tab-btn ${activeTab === 'mapas' ? 'active' : ''}`}
          onClick={() => setActiveTab('mapas')}
        >
          <Scale size={16} />
          <span>Mapas de Cosecha ({mapas.length})</span>
        </button>

        <button 
          className={`tab-btn ${activeTab === 'visor-mapa' ? 'active' : ''}`}
          onClick={() => setActiveTab('visor-mapa')}
        >
          <Layers size={16} />
          <span>Visor de Puntos de Rendimiento</span>
        </button>
      </div>

      {/* CONTENIDO SEGÚN PESTAÑA */}
      <div className="tab-content-wrapper">

        {/* TAB 1: STRIP TRIALS Y EVALUACIÓN ROI */}
        {activeTab === 'roi' && (
          <div className="roi-view">
            <div className="table-actions-bar">
              <div className="search-box">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar ensayo por código o lote..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <ExportButtons 
                data={trials} 
                columns={exportColumns} 
                filename="Evaluacion_ROI_Strip_Trials" 
              />
            </div>

            <div className="trials-card-grid">
              {trials.length === 0 ? (
                <div className="empty-trials-box">
                  <TrendingUp size={36} color="#94a3b8" />
                  <p>No se han registrado ensayos de rendimiento en franjas aún.</p>
                </div>
              ) : (
                trials
                  .filter(t => (t.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) || (t.codigo_ensayo || '').toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(t => (
                    <div key={t.id_ensayo} className="trial-card-item">
                      <div className="trial-card-header">
                        <span className="trial-badge">{t.codigo_ensayo}</span>
                        <span className="text-xs text-slate-500">{new Date(t.fecha_evaluacion).toLocaleDateString()}</span>
                      </div>
                      <h3>{t.nombre}</h3>
                      <p className="text-xs text-slate-600 mb-3">{t.finca_nombre} &bull; {t.lote_nombre}</p>

                      {/* Comparativa Lado a Lado */}
                      <div className="comparison-columns">
                        <div className="comparison-side control">
                          <span className="side-title">Testigo Dosis Fija</span>
                          <span className="side-ton">{t.rendimiento_control_ton_ha} ton/ha</span>
                          <span className="side-cost">Costo Insumo: ${t.costo_insumo_control_ha}/ha</span>
                        </div>

                        <div className="comparison-side vra">
                          <span className="side-title">Dosis Variable VRA</span>
                          <span className="side-ton highlight">{t.rendimiento_vra_ton_ha} ton/ha</span>
                          <span className="side-cost">Costo Insumo: ${t.costo_insumo_vra_ha}/ha</span>
                        </div>
                      </div>

                      {/* Resumen Económico */}
                      <div className="economic-summary-box">
                        <div className="summary-row">
                          <span>Ahorro en Insumos:</span>
                          <strong className="text-emerald-700">+${t.ahorro_insumos_ha}/ha</strong>
                        </div>
                        <div className="summary-row">
                          <span>Ingreso por Cosecha Adicional:</span>
                          <strong className="text-emerald-700">+${t.ingreso_adicional_ha}/ha</strong>
                        </div>
                        <div className="summary-row total">
                          <span>Beneficio Neto (ROI/ha):</span>
                          <strong className="text-emerald-600 font-extrabold text-base">+${t.roi_neto_ha}/ha</strong>
                        </div>
                      </div>

                      {t.observaciones && (
                        <p className="trial-notes">{t.observaciones}</p>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CATÁLOGO DE MAPAS DE RENDIMIENTO */}
        {activeTab === 'mapas' && (
          <div className="mapas-view">
            <div className="table-actions-bar">
              <div className="search-box">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar por lote, código o cultivo..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <button 
                className="btn-primary-roi"
                onClick={() => {
                  setMapaForm(initialMapaForm);
                  setShowModalMapa(true);
                }}
              >
                <Plus size={16} />
                <span>Registrar Mapa de Cosecha</span>
              </button>
            </div>

            <div className="table-responsive-box">
              <table className="precision-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Cosecha / Cultivo</th>
                    <th>Finca / Lote</th>
                    <th>Fecha</th>
                    <th>Rend. Promedio</th>
                    <th>Rango (Mín - Máx)</th>
                    <th>Puntos Registrados</th>
                    <th>Origen Datos</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {mapas.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-6">
                        No se han registrado mapas de cosecha aún.
                      </td>
                    </tr>
                  ) : (
                    mapas
                      .filter(m => (m.nombre_cosecha || '').toLowerCase().includes(searchTerm.toLowerCase()) || (m.codigo_mapa || '').toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(m => (
                        <tr key={m.id_mapa}>
                          <td className="font-bold text-slate-800">{m.codigo_mapa}</td>
                          <td>
                            <strong>{m.nombre_cosecha}</strong>
                            <div className="text-xs text-slate-500">{m.cultivo}</div>
                          </td>
                          <td>{m.finca_nombre} &bull; {m.lote_nombre}</td>
                          <td>{m.fecha_cosecha}</td>
                          <td className="font-bold text-emerald-600">{m.rendimiento_promedio_ton_ha} ton/ha</td>
                          <td className="text-xs">{m.rendimiento_min_ton_ha} - {m.rendimiento_max_ton_ha} ton/ha</td>
                          <td>{m.total_puntos_muestreados} pts</td>
                          <td>
                            <span className="source-badge">{m.archivo_origen_tipo}</span>
                          </td>
                          <td>
                            <button 
                              className="btn-icon-action"
                              title="Ver puntos en mapa"
                              onClick={() => {
                                setSelectedMapa(m);
                                fetchPuntosMapa(m.id_mapa);
                                setActiveTab('visor-mapa');
                              }}
                            >
                              <Layers size={14} />
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

        {/* TAB 3: VISOR DE PUNTOS DE COSECHA */}
        {activeTab === 'visor-mapa' && selectedMapa && (
          <div className="yield-map-layout">
            <div className="yield-sidebar-card">
              <span className="sensor-tag">{selectedMapa.codigo_mapa}</span>
              <h3>{selectedMapa.nombre_cosecha}</h3>
              <p className="text-xs text-slate-600 mb-3">{selectedMapa.cultivo} &bull; {selectedMapa.finca_nombre}</p>

              <div className="yield-stats-box">
                <div className="stat-line">
                  <span>Rendimiento Promedio:</span>
                  <strong>{selectedMapa.rendimiento_promedio_ton_ha} ton/ha</strong>
                </div>
                <div className="stat-line">
                  <span>Rendimiento Mínimo:</span>
                  <strong>{selectedMapa.rendimiento_min_ton_ha} ton/ha</strong>
                </div>
                <div className="stat-line">
                  <span>Rendimiento Máximo:</span>
                  <strong>{selectedMapa.rendimiento_max_ton_ha} ton/ha</strong>
                </div>
                <div className="stat-line">
                  <span>Humedad de Grano Prom.:</span>
                  <strong>{selectedMapa.humedad_grano_promedio_porc}%</strong>
                </div>
                <div className="stat-line">
                  <span>Puntos de Cosechadora:</span>
                  <strong>{puntosMapa.length} registros</strong>
                </div>
              </div>

              {/* Leyenda de Rendimiento */}
              <div className="yield-legend-box">
                <h4>Distribución de Productividad:</h4>
                <div className="legend-row">
                  <span className="legend-circle" style={{ background: '#10b981' }}></span>
                  <span>Alto Rendimiento (&gt; 32 ton/ha)</span>
                </div>
                <div className="legend-row">
                  <span className="legend-circle" style={{ background: '#f59e0b' }}></span>
                  <span>Rendimiento Medio (25 - 32 ton/ha)</span>
                </div>
                <div className="legend-row">
                  <span className="legend-circle" style={{ background: '#ef4444' }}></span>
                  <span>Bajo Rendimiento (&lt; 25 ton/ha)</span>
                </div>
              </div>
            </div>

            <div className="yield-leaflet-card">
              <MapContainer 
                center={mapCoords[0]} 
                zoom={16} 
                style={{ height: '560px', width: '100%', borderRadius: '14px' }}
              >
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution="Esri World Imagery"
                />
                <MapRecenter coords={mapCoords} />

                {/* Puntos de Cosecha */}
                {puntosMapa.map(p => {
                  const lat = parseFloat(p.latitud);
                  const lng = parseFloat(p.longitud);
                  const kg = parseFloat(p.rendimiento_kg_ha);
                  const color = getYieldColor(kg);

                  return (
                    <CircleMarker
                      key={p.id_punto}
                      center={[lat, lng]}
                      radius={7}
                      pathOptions={{
                        color: '#ffffff',
                        weight: 1.5,
                        fillColor: color,
                        fillOpacity: 0.85
                      }}
                    >
                      <Popup>
                        <div className="yield-popup">
                          <strong>{(kg / 1000).toFixed(2)} ton/ha</strong>
                          <div>Humedad: {p.humedad_pct || 14}%</div>
                          <div>Velocidad: {p.velocidad_kmh || 5} km/h</div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: NUEVO STRIP TRIAL ROI (CAMPOS 100% LIMPIOS, CERO DEMO)           */}
      {/* ========================================================================= */}
      {showModalTrial && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Registrar Strip Trial & Evaluación de Retorno ROI</h3>
              <button className="btn-close" onClick={() => setShowModalTrial(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleGuardarTrial} className="modal-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Finca *</label>
                  <select 
                    required 
                    value={trialForm.id_finca}
                    onChange={(e) => setTrialForm({ ...trialForm, id_finca: e.target.value, id_lote: '' })}
                  >
                    <option value="">Seleccione Finca</option>
                    {fincas.map(f => (
                      <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Lote del Ensayo *</label>
                  <select 
                    required 
                    value={trialForm.id_lote}
                    onChange={(e) => setTrialForm({ ...trialForm, id_lote: e.target.value })}
                    disabled={!trialForm.id_finca}
                  >
                    <option value="">Seleccione Lote</option>
                    {lotes
                      .filter(l => String(l.id_finca) === String(trialForm.id_finca))
                      .map(l => (
                        <option key={l.id_lote} value={l.id_lote}>{l.nombre}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Código Ensayo *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. TRL-VRA-2026-02"
                    value={trialForm.codigo_ensayo}
                    onChange={(e) => setTrialForm({ ...trialForm, codigo_ensayo: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Nombre del Strip Trial *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. Franja Comparativa NPK Dosis Fija vs VRA"
                    value={trialForm.nombre}
                    onChange={(e) => setTrialForm({ ...trialForm, nombre: e.target.value })}
                  />
                </div>
              </div>

              {/* Costos de Insumo por Hectárea */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Costo Insumo Testigo Fijo ($/ha) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    placeholder="Ej. 350.00"
                    value={trialForm.costo_insumo_control_ha}
                    onChange={(e) => setTrialForm({ ...trialForm, costo_insumo_control_ha: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Costo Insumo Dosis Variable VRA ($/ha) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    placeholder="Ej. 285.00"
                    value={trialForm.costo_insumo_vra_ha}
                    onChange={(e) => setTrialForm({ ...trialForm, costo_insumo_vra_ha: e.target.value })}
                  />
                </div>
              </div>

              {/* Rendimientos Obtenidos */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Rendimiento Testigo Fijo (ton/ha) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    placeholder="Ej. 24.00"
                    value={trialForm.rendimiento_control_ton_ha}
                    onChange={(e) => setTrialForm({ ...trialForm, rendimiento_control_ton_ha: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Rendimiento Dosis Variable VRA (ton/ha) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    placeholder="Ej. 28.50"
                    value={trialForm.rendimiento_vra_ton_ha}
                    onChange={(e) => setTrialForm({ ...trialForm, rendimiento_vra_ton_ha: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Precio Venta por Tonelada Cosechada ($/ton) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    placeholder="Ej. 220.00"
                    value={trialForm.precio_venta_tonelada}
                    onChange={(e) => setTrialForm({ ...trialForm, precio_venta_tonelada: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Evaluador Agronómico *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. Ing. Carlos Mendoza"
                    value={trialForm.evaluador}
                    onChange={(e) => setTrialForm({ ...trialForm, evaluador: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Observaciones del Ensayo en Franjas</label>
                <textarea 
                  rows="2"
                  placeholder="Detalles de homogeneidad, vigor o respuesta del cultivo..."
                  value={trialForm.observaciones}
                  onChange={(e) => setTrialForm({ ...trialForm, observaciones: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModalTrial(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={submitting}>
                  {submitting ? 'Guardando en BD...' : 'Calcular ROI & Guardar en BD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: NUEVO MAPA DE RENDIMIENTO (CAMPOS 100% LIMPIOS, CERO DEMO)       */}
      {/* ========================================================================= */}
      {showModalMapa && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Registrar Mapa de Rendimiento de Cosecha</h3>
              <button className="btn-close" onClick={() => setShowModalMapa(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleGuardarMapa} className="modal-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Finca *</label>
                  <select 
                    required 
                    value={mapaForm.id_finca}
                    onChange={(e) => setMapaForm({ ...mapaForm, id_finca: e.target.value, id_lote: '' })}
                  >
                    <option value="">Seleccione Finca</option>
                    {fincas.map(f => (
                      <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Lote Cosechado *</label>
                  <select 
                    required 
                    value={mapaForm.id_lote}
                    onChange={(e) => setMapaForm({ ...mapaForm, id_lote: e.target.value })}
                    disabled={!mapaForm.id_finca}
                  >
                    <option value="">Seleccione Lote</option>
                    {lotes
                      .filter(l => String(l.id_finca) === String(mapaForm.id_finca))
                      .map(l => (
                        <option key={l.id_lote} value={l.id_lote}>{l.nombre}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Código Mapa *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. YLD-2026-L02"
                    value={mapaForm.codigo_mapa}
                    onChange={(e) => setMapaForm({ ...mapaForm, codigo_mapa: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Nombre de la Cosecha *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. Cosecha Ciclo A 2026"
                    value={mapaForm.nombre_cosecha}
                    onChange={(e) => setMapaForm({ ...mapaForm, nombre_cosecha: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Cultivo Cosechado *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. Palma de Aceite / Maíz / Soya"
                    value={mapaForm.cultivo}
                    onChange={(e) => setMapaForm({ ...mapaForm, cultivo: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Fecha de Cosecha *</label>
                  <DatePickerClaro required 
                    value={mapaForm.fecha_cosecha}
                    onChange={(e) => setMapaForm({ ...mapaForm, fecha_cosecha: e.target.value })} />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>Rendimiento Promedio (ton/ha) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    placeholder="Ej. 28.50"
                    value={mapaForm.rendimiento_promedio_ton_ha}
                    onChange={(e) => setMapaForm({ ...mapaForm, rendimiento_promedio_ton_ha: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Rendimiento Mínimo (ton/ha)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="Ej. 18.00"
                    value={mapaForm.rendimiento_min_ton_ha}
                    onChange={(e) => setMapaForm({ ...mapaForm, rendimiento_min_ton_ha: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Rendimiento Máximo (ton/ha)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="Ej. 36.00"
                    value={mapaForm.rendimiento_max_ton_ha}
                    onChange={(e) => setMapaForm({ ...mapaForm, rendimiento_max_ton_ha: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Humedad Grano / Fruto Promedio (%)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    value={mapaForm.humedad_grano_promedio_porc}
                    onChange={(e) => setMapaForm({ ...mapaForm, humedad_grano_promedio_porc: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Origen de los Datos</label>
                  <select 
                    value={mapaForm.archivo_origen_tipo}
                    onChange={(e) => setMapaForm({ ...mapaForm, archivo_origen_tipo: e.target.value })}
                  >
                    <option value="Monitor_Cosechadora">Monitor de Rendimiento Cosechadora</option>
                    <option value="Balanza_Tolva">Pesaje de Tolva / Báscula</option>
                    <option value="Muestreo_Manual">Muestreo Destructivo / Aforo Manual</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModalMapa(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Guardar Mapa en BD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
