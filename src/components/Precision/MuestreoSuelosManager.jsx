import React, { useState, useEffect, useMemo, useRef } from 'react';
import DatePickerClaro from '../Common/DatePickerClaro';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, Layers, FlaskConical, Plus, Search, FileText, CheckCircle, 
  Calendar, Activity, Share2, Info, AlertTriangle, ArrowRight 
} from 'lucide-react';
import { authFetch } from '../../utils/api';
import PremiumSelect from '../PremiumSelect';
import ExportButtons from '../ExportButtons';
import Pagination from '../Pagination';
import './MuestreoSuelosManager.css';

// Fix icons Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Marcadores personalizados por estado
const createColorIcon = (color) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
};

const iconPendiente = createColorIcon('#94a3b8'); // Gris
const iconColectada = createColorIcon('#f59e0b'); // Ámbar
const iconAnalizada = createColorIcon('#10b981'); // Verde

// Controlador de cámara de mapa
function MapRecenter({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      try {
        const bounds = L.latLngBounds(coords);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 });
        }
      } catch (e) {
        console.error('Error centrando mapa:', e);
      }
    }
  }, [coords, map]);
  return null;
}

export default function MuestreoSuelosManager() {
  const [activeTab, setActiveTab] = useState('mallas'); // 'mallas' | 'analisis' | 'kpis'
  
  // Catálogos
  const [fincas, setFincas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [selectedFinca, setSelectedFinca] = useState(null);
  const [selectedLote, setSelectedLote] = useState(null);

  // Mallas y Puntos
  const [mallas, setMallas] = useState([]);
  const [selectedMalla, setSelectedMalla] = useState(null);
  const [puntos, setPuntos] = useState([]);
  const [selectedPunto, setSelectedPunto] = useState(null);

  // Analítica de Laboratorio
  const [analisisList, setAnalisisList] = useState([]);
  const [loteStats, setLoteStats] = useState(null);

  // Estados de Carga y Filtros
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modales
  const [showNuevaMallaModal, setShowNuevaMallaModal] = useState(false);
  const [showNuevoAnalisisModal, setShowNuevoAnalisisModal] = useState(false);
  const [codigoMallaError, setCodigoMallaError] = useState('');

  // Formulario Nueva Malla
  const [mallaForm, setMallaForm] = useState({
    codigo_malla: '',
    descripcion: '',
    tamano_cuadricula_m: 100,
    tipo_malla: 'Regular',
    fecha_plan: new Date().toISOString().slice(0, 10),
    profundidad_cm: 30
  });

  // Formulario Nuevo Análisis
  const [analisisForm, setAnalisisForm] = useState({
    id_punto: null,
    numero_informe: '',
    laboratorio_nombre: '',
    fecha_analisis: new Date().toISOString().slice(0, 10),
    fecha_muestreo: new Date().toISOString().slice(0, 10),
    arena_porc: '',
    limo_porc: '',
    arcilla_porc: '',
    densidad_aparente: '',
    ph: '',
    ce_ds_m: '',
    materia_organica_porc: '',
    fosforo_ppm: '',
    potasio_meq: '',
    calcio_meq: '',
    magnesio_meq: '',
    sodio_meq: '',
    aluminio_meq: '',
    azufre_ppm: '',
    boro_ppm: '',
    zinc_ppm: '',
    observaciones: ''
  });

  // Carga inicial de Fincas
  useEffect(() => {
    fetchFincas();
  }, []);

  // Carga de Lotes al cambiar Finca
  useEffect(() => {
    if (selectedFinca) {
      fetchLotes(selectedFinca.value);
    } else {
      setLotes([]);
      setSelectedLote(null);
    }
  }, [selectedFinca]);

  // Carga de Mallas y Análisis al cambiar Lote
  useEffect(() => {
    if (selectedLote) {
      fetchMallas(selectedLote.value);
      fetchAnalisis(selectedLote.value);
      fetchLoteStats(selectedLote.value);
    } else {
      setMallas([]);
      setPuntos([]);
      setAnalisisList([]);
      setLoteStats(null);
    }
  }, [selectedLote]);

  // Carga de puntos al seleccionar Malla
  useEffect(() => {
    if (selectedMalla) {
      fetchPuntos(selectedMalla.id_malla);
    } else {
      setPuntos([]);
    }
  }, [selectedMalla]);

  const fetchFincas = async () => {
    try {
      const res = await authFetch('/api/table/fincas/data?pageSize=500');
      const data = await res.json();
      if (data.data) {
        const opts = data.data.map(f => ({ value: f.id_finca, label: `${f.codigoFinca || f.codigo || ''} - ${f.nombre}` }));
        setFincas(opts);
        if (opts.length > 0) setSelectedFinca(opts[0]);
      }
    } catch (err) {
      console.error('Error cargando fincas:', err);
    }
  };

  const fetchLotes = async (fincaId) => {
    try {
      const res = await authFetch(`/api/suelos/catalogos/lotes?fincaId=${fincaId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const opts = data.map(l => {
          let coords = [];
          if (l.geojson) {
            try {
              const parsed = typeof l.geojson === 'string' ? JSON.parse(l.geojson) : l.geojson;
              if (parsed.coordinates && parsed.coordinates[0]) {
                coords = parsed.coordinates[0].map(pt => [pt[1], pt[0]]);
              }
            } catch (e) {}
          }
          return {
            value: l.id_lote,
            label: `${l.codigo || l.id_lote} - ${l.nombre}`,
            coords,
            area_ha: l.hectareas || 0
          };
        });
        setLotes(opts);
        if (opts.length > 0) setSelectedLote(opts[0]);
      }
    } catch (err) {
      console.error('Error cargando lotes:', err);
    }
  };

  const fetchMallas = async (loteId) => {
    try {
      setLoading(true);
      const res = await authFetch(`/api/suelos/mallas?loteId=${loteId}`);
      const data = await res.json();
      setMallas(data);
      if (data.length > 0) {
        setSelectedMalla(data[0]);
      } else {
        setSelectedMalla(null);
        setPuntos([]);
      }
    } catch (err) {
      console.error('Error cargando mallas:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPuntos = async (mallaId) => {
    try {
      const res = await authFetch(`/api/suelos/mallas/${mallaId}/puntos`);
      const data = await res.json();
      setPuntos(data);
    } catch (err) {
      console.error('Error cargando puntos:', err);
    }
  };

  const fetchAnalisis = async (loteId) => {
    try {
      const res = await authFetch(`/api/suelos/analisis?loteId=${loteId}`);
      const data = await res.json();
      setAnalisisList(data);
    } catch (err) {
      console.error('Error cargando análisis:', err);
    }
  };

  const fetchLoteStats = async (loteId) => {
    try {
      const res = await authFetch(`/api/suelos/stats-lote/${loteId}`);
      const data = await res.json();
      setLoteStats(data);
    } catch (err) {
      console.error('Error cargando estadísticas del lote:', err);
    }
  };

  // Crear Nueva Malla
  const handleCrearMalla = async (e) => {
    e.preventDefault();
    if (!selectedFinca || !selectedLote) {
      alert('Debes seleccionar una finca y un lote primero.');
      return;
    }
    setCodigoMallaError('');
    try {
      const res = await authFetch('/api/suelos/mallas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_finca: selectedFinca.value,
          id_lote: selectedLote.value,
          ...mallaForm
        })
      });

      if (res.status === 409) {
        setCodigoMallaError('Ya existe una malla con este código.');
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        alert('Error: ' + (err.error || 'No se pudo crear la malla.'));
        return;
      }

      const resData = await res.json();
      alert(`✅ Malla creada con éxito. Se generaron ${resData.total_puntos} puntos en grilla.`);
      setShowNuevaMallaModal(false);
      fetchMallas(selectedLote.value);
    } catch (err) {
      alert('Error en conexión al crear malla.');
    }
  };

  // Actualizar estado de Punto (Pendiente -> Colectada)
  const handleActualizarPunto = async (punto, nuevoEstado) => {
    try {
      const res = await authFetch(`/api/suelos/puntos/${punto.id_punto}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: nuevoEstado,
          fecha_recoleccion: new Date().toISOString().slice(0, 19).replace('T', ' ')
        })
      });
      if (res.ok) {
        fetchPuntos(selectedMalla.id_malla);
        if (selectedLote) fetchMallas(selectedLote.value);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Guardar Análisis de Laboratorio
  const handleGuardarAnalisis = async (e) => {
    e.preventDefault();
    if (!analisisForm.id_punto) {
      alert('Selecciona un punto de muestreo.');
      return;
    }
    try {
      const res = await authFetch('/api/suelos/analisis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_lote: selectedLote.value,
          ...analisisForm
        })
      });

      if (res.status === 409) {
        alert('Error 409: Este número de informe ya está registrado para este punto.');
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        alert('Error: ' + err.error);
        return;
      }

      alert('✅ Análisis de laboratorio guardado exitosamente.');
      setShowNuevoAnalisisModal(false);
      if (selectedLote) {
        fetchAnalisis(selectedLote.value);
        fetchLoteStats(selectedLote.value);
      }
      if (selectedMalla) fetchPuntos(selectedMalla.id_malla);
    } catch (err) {
      alert('Error al guardar análisis.');
    }
  };

  // Cálculos en vivo en el formulario de análisis
  const liveCalculos = useMemo(() => {
    const ca = parseFloat(analisisForm.calcio_meq) || 0;
    const mg = parseFloat(analisisForm.magnesio_meq) || 0;
    const k = parseFloat(analisisForm.potasio_meq) || 0;
    const na = parseFloat(analisisForm.sodio_meq) || 0;
    const al = parseFloat(analisisForm.aluminio_meq) || 0;
    const sumaBases = ca + mg + k + na;
    const cice = sumaBases + al;
    const satBases = cice > 0 ? ((sumaBases / cice) * 100).toFixed(1) : 0;
    const satAluminio = cice > 0 ? ((al / cice) * 100).toFixed(1) : 0;
    return { sumaBases: sumaBases.toFixed(2), cice: cice.toFixed(2), satBases, satAluminio };
  }, [analisisForm]);

  // Columnas para Exportación
  const exportColumns = [
    { header: 'Punto', key: 'codigo_punto' },
    { header: 'Malla', key: 'codigo_malla' },
    { header: 'Informe', key: 'numero_informe' },
    { header: 'Laboratorio', key: 'laboratorio_nombre' },
    { header: 'Fecha', key: 'fecha_analisis' },
    { header: 'pH', key: 'ph' },
    { header: 'M.O. %', key: 'materia_organica_porc' },
    { header: 'P (ppm)', key: 'fosforo_ppm' },
    { header: 'K (meq)', key: 'potasio_meq' },
    { header: 'Ca (meq)', key: 'calcio_meq' },
    { header: 'Mg (meq)', key: 'magnesio_meq' },
    { header: 'CICE', key: 'cic' },
    { header: 'Sat. Bases %', key: 'saturacion_bases_porc' },
    { header: 'Textura', key: 'textura_clase' }
  ];

  // Puntos filtrados y paginados
  const puntosFiltrados = useMemo(() => {
    return puntos.filter(p => 
      p.codigo_punto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.estado.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [puntos, searchQuery]);

  const puntosPaginados = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return puntosFiltrados.slice(start, start + pageSize);
  }, [puntosFiltrados, currentPage]);

  return (
    <div className="precision-container">
      {/* Header */}
      <div className="precision-header">
        <div className="precision-title-group">
          <h2>
            <FlaskConical size={26} color="#2563eb" />
            Muestreo de Suelo & Analítica de Precisión
          </h2>
          <span className="precision-badge">Módulo 1 & 3 • Agricultura de Precisión</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            className="precision-tab-btn" 
            style={{ background: '#2563eb', color: '#fff', borderRadius: 8, padding: '8px 16px' }}
            onClick={() => setShowNuevaMallaModal(true)}
          >
            <Plus size={16} /> Nueva Malla de Muestreo
          </button>
          <button 
            className="precision-tab-btn" 
            style={{ background: '#10b981', color: '#fff', borderRadius: 8, padding: '8px 16px' }}
            onClick={() => setShowNuevoAnalisisModal(true)}
          >
            <Plus size={16} /> Registrar Análisis Lab
          </button>
          <ExportButtons 
            data={analisisList} 
            columns={exportColumns} 
            filename={`Analisis_Suelo_${selectedLote?.label || 'General'}`} 
          />
        </div>
      </div>

      {/* Selector de Finca y Lote */}
      <div className="precision-filters-bar">
        <div className="filter-item">
          <label>Hacienda / Finca</label>
          <PremiumSelect 
            options={fincas} 
            value={selectedFinca} 
            onChange={setSelectedFinca} 
            placeholder="Seleccionar Finca..." 
          />
        </div>
        <div className="filter-item">
          <label>Lote Productivo</label>
          <PremiumSelect 
            options={lotes} 
            value={selectedLote} 
            onChange={setSelectedLote} 
            placeholder="Seleccionar Lote..." 
          />
        </div>
        {selectedLote && (
          <div className="filter-item" style={{ fontSize: 13, color: '#475569' }}>
            <strong>Área:</strong> {selectedLote.area_ha || '--'} Ha | 
            <strong> Mallas activas:</strong> {mallas.length}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="precision-tabs">
        <button 
          className={`precision-tab-btn ${activeTab === 'mallas' ? 'active' : ''}`}
          onClick={() => setActiveTab('mallas')}
        >
          <MapPin size={18} /> Malla y Puntos de Muestreo
        </button>
        <button 
          className={`precision-tab-btn ${activeTab === 'analisis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analisis')}
        >
          <FlaskConical size={18} /> Resultados de Laboratorio ({analisisList.length})
        </button>
        <button 
          className={`precision-tab-btn ${activeTab === 'kpis' ? 'active' : ''}`}
          onClick={() => setActiveTab('kpis')}
        >
          <Activity size={18} /> Diagnóstico de Fertilidad del Lote
        </button>
      </div>

      {/* TAB 1: MALLAS Y MAPA */}
      {activeTab === 'mallas' && (
        <div className="map-points-grid">
          {/* Mapa Leaflet */}
          <div className="map-card">
            <div className="map-card-header">
              <strong style={{ fontSize: 14, color: '#1e293b' }}>
                📍 Georreferenciación de Malla: {selectedMalla?.codigo_malla || 'Sin malla activa'}
              </strong>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Total: {puntos.length} puntos en celda de {selectedMalla?.tamano_cuadricula_m || 100}m
              </span>
            </div>
            <div className="map-container-inner">
              <MapContainer 
                center={[4.57, -74.29]} 
                zoom={14} 
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer 
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                  attribution="Esri World Imagery"
                />
                {selectedLote && selectedLote.coords && selectedLote.coords.length > 0 && (
                  <>
                    <Polygon 
                      positions={selectedLote.coords} 
                      pathOptions={{ color: '#3b82f6', weight: 2, fillOpacity: 0.15 }} 
                    />
                    <MapRecenter coords={selectedLote.coords} />
                  </>
                )}
                {puntos.map(pt => {
                  const icon = pt.estado === 'Analizada' ? iconAnalizada : pt.estado === 'Colectada' ? iconColectada : iconPendiente;
                  return (
                    <Marker key={pt.id_punto} position={[pt.latitud, pt.longitud]} icon={icon}>
                      <Popup>
                        <div style={{ fontSize: 12 }}>
                          <strong>{pt.codigo_punto}</strong><br/>
                          Estado: <span className={`status-badge ${pt.estado}`}>{pt.estado}</span><br/>
                          Prof: {pt.profundidad_cm} cm<br/>
                          {pt.ph && <>pH: {pt.ph} | MO: {pt.materia_organica_porc}%<br/></>}
                          {pt.estado === 'Pendiente' && (
                            <button 
                              style={{ marginTop: 8, padding: '4px 8px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                              onClick={() => handleActualizarPunto(pt, 'Colectada')}
                            >
                              Marcar como Colectada
                            </button>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>

          {/* Tabla de Puntos de la Malla */}
          <div className="points-table-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
                <input 
                  type="text" 
                  className="form-control-input" 
                  style={{ paddingLeft: 34 }} 
                  placeholder="Buscar punto..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="points-table-scroll">
              <table className="precision-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Estado</th>
                    <th>Prof.</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {puntosPaginados.map(pt => (
                    <tr key={pt.id_punto} onClick={() => setSelectedPunto(pt)}>
                      <td><strong>{pt.codigo_punto}</strong></td>
                      <td><span className={`status-badge ${pt.estado}`}>{pt.estado}</span></td>
                      <td>{pt.profundidad_cm} cm</td>
                      <td>
                        {pt.estado === 'Pendiente' ? (
                          <button 
                            style={{ padding: '3px 8px', background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                            onClick={(e) => { e.stopPropagation(); handleActualizarPunto(pt, 'Colectada'); }}
                          >
                            Colectar
                          </button>
                        ) : pt.estado === 'Colectada' ? (
                          <button 
                            style={{ padding: '3px 8px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setAnalisisForm(prev => ({ ...prev, id_punto: pt.id_punto }));
                              setShowNuevoAnalisisModal(true);
                            }}
                          >
                            + Cargar Lab
                          </button>
                        ) : (
                          <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 600 }}>✓ Analizado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {puntosPaginados.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
                        No hay puntos para esta malla. Crea una nueva malla arriba.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination 
              currentPage={currentPage} 
              totalItems={puntosFiltrados.length} 
              pageSize={pageSize} 
              onPageChange={setCurrentPage} 
            />
          </div>
        </div>
      )}

      {/* TAB 2: RESULTADOS DE LABORATORIO */}
      {activeTab === 'analisis' && (
        <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="precision-table">
              <thead>
                <tr>
                  <th>Informe</th>
                  <th>Punto</th>
                  <th>Laboratorio</th>
                  <th>Fecha</th>
                  <th>pH</th>
                  <th>M.O. (%)</th>
                  <th>P (ppm)</th>
                  <th>K (meq)</th>
                  <th>Ca (meq)</th>
                  <th>Mg (meq)</th>
                  <th>CICE</th>
                  <th>Sat. Bases %</th>
                  <th>Sat. Al %</th>
                  <th>Textura</th>
                </tr>
              </thead>
              <tbody>
                {analisisList.map(a => (
                  <tr key={a.id_analisis}>
                    <td><strong>{a.numero_informe}</strong></td>
                    <td>{a.codigo_punto}</td>
                    <td>{a.laboratorio_nombre}</td>
                    <td>{a.fecha_analisis?.slice(0, 10)}</td>
                    <td><strong style={{ color: a.ph < 5.5 ? '#dc2626' : '#16a34a' }}>{a.ph}</strong></td>
                    <td>{a.materia_organica_porc}%</td>
                    <td>{a.fosforo_ppm}</td>
                    <td>{a.potasio_meq}</td>
                    <td>{a.calcio_meq}</td>
                    <td>{a.magnesio_meq}</td>
                    <td><strong>{a.cic}</strong></td>
                    <td>{a.saturacion_bases_porc}%</td>
                    <td><span style={{ color: a.saturacion_aluminio_porc > 20 ? '#dc2626' : 'inherit' }}>{a.saturacion_aluminio_porc}%</span></td>
                    <td><span className="status-badge Analizada">{a.textura_clase || 'N/D'}</span></td>
                  </tr>
                ))}
                {analisisList.length === 0 && (
                  <tr>
                    <td colSpan={14} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      No se han registrado análisis de laboratorio para este lote.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DIAGNÓSTICO AGRONÓMICO Y KPIS */}
      {activeTab === 'kpis' && loteStats && (
        <div>
          <div className="kpi-fertility-grid">
            <div className="fertility-kpi-card">
              <span className="kpi-label">pH Promedio</span>
              <span className="kpi-value">{loteStats.ph_promedio || '--'}</span>
              <span className={`kpi-status ${Number(loteStats.ph_promedio) < 5.5 ? 'critico' : 'optimo'}`}>
                {Number(loteStats.ph_promedio) < 5.5 ? 'Ácido (Encalado)' : 'Rango Adecuado'}
              </span>
            </div>
            <div className="fertility-kpi-card">
              <span className="kpi-label">Materia Orgánica</span>
              <span className="kpi-value">{loteStats.mo_promedio ? `${loteStats.mo_promedio}%` : '--'}</span>
              <span className={`kpi-status ${Number(loteStats.mo_promedio) < 2.5 ? 'alerta' : 'optimo'}`}>
                {Number(loteStats.mo_promedio) < 2.5 ? 'Bajo' : 'Aceptable'}
              </span>
            </div>
            <div className="fertility-kpi-card">
              <span className="kpi-label">Fósforo Disponible</span>
              <span className="kpi-value">{loteStats.p_promedio ? `${loteStats.p_promedio} ppm` : '--'}</span>
              <span className={`kpi-status ${Number(loteStats.p_promedio) < 15 ? 'critico' : 'optimo'}`}>
                {Number(loteStats.p_promedio) < 15 ? 'Deficiente' : 'Óptimo'}
              </span>
            </div>
            <div className="fertility-kpi-card">
              <span className="kpi-label">Potasio Intercambiable</span>
              <span className="kpi-value">{loteStats.k_promedio ? `${loteStats.k_promedio} meq` : '--'}</span>
              <span className="kpi-status optimo">Reserva K</span>
            </div>
            <div className="fertility-kpi-card">
              <span className="kpi-label">CICE Promedio</span>
              <span className="kpi-value">{loteStats.cic_promedio || '--'}</span>
              <span className="kpi-status optimo">cmol(+)/kg</span>
            </div>
            <div className="fertility-kpi-card">
              <span className="kpi-label">Sat. Aluminio</span>
              <span className="kpi-value">{loteStats.sat_aluminio_promedio ? `${loteStats.sat_aluminio_promedio}%` : '0%'}</span>
              <span className={`kpi-status ${Number(loteStats.sat_aluminio_promedio) > 15 ? 'critico' : 'optimo'}`}>
                {Number(loteStats.sat_aluminio_promedio) > 15 ? 'Toxicidad Al' : 'No Tóxico'}
              </span>
            </div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#0f172a' }}>
              🌾 Resumen de Textura Predominante
            </h3>
            <p style={{ color: '#475569', fontSize: 14 }}>
              Clase textural identificada en el lote: <strong>{loteStats.textura_predominante || 'Franco'}</strong>. 
              Esta textura condiciona una retención hídrica media-alta y una velocidad de infiltración moderada para el cálculo de láminas de riego.
            </p>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA MALLA DE MUESTREO */}
      {showNuevaMallaModal && (
        <div className="modal-overlay">
          <div className="modal-content-precision">
            <div className="modal-header">
              <h3>Crear Malla de Muestreo Georreferenciada</h3>
              <button 
                onClick={() => setShowNuevaMallaModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCrearMalla}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Código de Malla (Único)</label>
                  <input 
                    type="text" 
                    className="form-control-input" 
                    required 
                    value={mallaForm.codigo_malla}
                    onChange={e => { setMallaForm({ ...mallaForm, codigo_malla: e.target.value }); setCodigoMallaError(''); }}
                    placeholder="Ej. MAL-L101-2026"
                  />
                  {codigoMallaError && <span style={{ color: '#dc2626', fontSize: 11 }}>{codigoMallaError}</span>}
                </div>
                <div className="form-group">
                  <label>Fecha de Planificación</label>
                  <DatePickerClaro className="form-control-input" 
                    required 
                    value={mallaForm.fecha_plan}
                    onChange={e => setMallaForm({ ...mallaForm, fecha_plan: e.target.value })} />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>Lado de Cuadrícula (Metros)</label>
                  <select 
                    className="form-control-input" 
                    value={mallaForm.tamano_cuadricula_m}
                    onChange={e => setMallaForm({ ...mallaForm, tamano_cuadricula_m: Number(e.target.value) })}
                  >
                    <option value={50}>50 m (0.25 Ha / punto - Intensivo)</option>
                    <option value={100}>100 m (1.0 Ha / punto - Estándar)</option>
                    <option value={150}>150 m (2.25 Ha / punto - Extensivo)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo de Muestreo</label>
                  <select 
                    className="form-control-input"
                    value={mallaForm.tipo_malla}
                    onChange={e => setMallaForm({ ...mallaForm, tipo_malla: e.target.value })}
                  >
                    <option value="Regular">Malla Regular (Cuadrícula)</option>
                    <option value="Dirigida_NDVI">Dirigida por Vigor NDVI</option>
                    <option value="Aleatoria_Estratificada">Aleatoria Estratificada</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Profundidad de Muestreo</label>
                  <input 
                    type="number" 
                    className="form-control-input" 
                    value={mallaForm.profundidad_cm}
                    onChange={e => setMallaForm({ ...mallaForm, profundidad_cm: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Descripción u Objetivo</label>
                <textarea 
                  className="form-control-input" 
                  rows={2}
                  value={mallaForm.descripcion}
                  onChange={e => setMallaForm({ ...mallaForm, descripcion: e.target.value })}
                  placeholder="Ej. Diagnóstico previo a siembra de ciclo principal..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button 
                  type="button" 
                  className="precision-tab-btn" 
                  onClick={() => setShowNuevaMallaModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="precision-tab-btn" 
                  style={{ background: '#2563eb', color: '#fff', borderRadius: 8 }}
                >
                  Generar Malla Espacial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR ANÁLISIS DE LABORATORIO */}
      {showNuevoAnalisisModal && (
        <div className="modal-overlay">
          <div className="modal-content-precision">
            <div className="modal-header">
              <h3>Registrar Análisis Fisicoquímico de Suelo</h3>
              <button 
                onClick={() => setShowNuevoAnalisisModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleGuardarAnalisis}>
              <div className="form-grid-3">
                <div className="form-group">
                  <label>Punto de Muestreo</label>
                  <select 
                    className="form-control-input"
                    required
                    value={analisisForm.id_punto || ''}
                    onChange={e => setAnalisisForm({ ...analisisForm, id_punto: Number(e.target.value) })}
                  >
                    <option value="">Seleccionar punto...</option>
                    {puntos.map(p => (
                      <option key={p.id_punto} value={p.id_punto}>
                        {p.codigo_punto} ({p.estado})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>N° Informe de Laboratorio</label>
                  <input 
                    type="text" 
                    className="form-control-input" 
                    required
                    value={analisisForm.numero_informe}
                    onChange={e => setAnalisisForm({ ...analisisForm, numero_informe: e.target.value })}
                    placeholder="Ej. LAB-2026-908"
                  />
                </div>
                <div className="form-group">
                  <label>Nombre del Laboratorio</label>
                  <input 
                    type="text" 
                    className="form-control-input" 
                    required
                    value={analisisForm.laboratorio_nombre}
                    onChange={e => setAnalisisForm({ ...analisisForm, laboratorio_nombre: e.target.value })}
                  />
                </div>
              </div>

              {/* Parámetros Físicos */}
              <h4 style={{ margin: '14px 0 8px 0', fontSize: 13, color: '#64748b', textTransform: 'uppercase' }}>
                Física de Suelo y Textura
              </h4>
              <div className="form-grid-4">
                <div className="form-group">
                  <label>% Arena</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    className="form-control-input" 
                    value={analisisForm.arena_porc}
                    onChange={e => setAnalisisForm({ ...analisisForm, arena_porc: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>% Limo</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    className="form-control-input" 
                    value={analisisForm.limo_porc}
                    onChange={e => setAnalisisForm({ ...analisisForm, limo_porc: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>% Arcilla</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    className="form-control-input" 
                    value={analisisForm.arcilla_porc}
                    onChange={e => setAnalisisForm({ ...analisisForm, arcilla_porc: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Densidad Aparente (g/cm³)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-control-input" 
                    value={analisisForm.densidad_aparente}
                    onChange={e => setAnalisisForm({ ...analisisForm, densidad_aparente: e.target.value })}
                  />
                </div>
              </div>

              {/* Parámetros Químicos */}
              <h4 style={{ margin: '14px 0 8px 0', fontSize: 13, color: '#64748b', textTransform: 'uppercase' }}>
                Química de Suelo y Fertilidad
              </h4>
              <div className="form-grid-4">
                <div className="form-group">
                  <label>pH (Agua 1:1)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-control-input" 
                    required
                    value={analisisForm.ph}
                    onChange={e => setAnalisisForm({ ...analisisForm, ph: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Materia Orgánica %</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-control-input" 
                    value={analisisForm.materia_organica_porc}
                    onChange={e => setAnalisisForm({ ...analisisForm, materia_organica_porc: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Fósforo P (ppm)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    className="form-control-input" 
                    value={analisisForm.fosforo_ppm}
                    onChange={e => setAnalisisForm({ ...analisisForm, fosforo_ppm: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Potasio K (meq/100g)</label>
                  <input 
                    type="number" 
                    step="0.001" 
                    className="form-control-input" 
                    value={analisisForm.potasio_meq}
                    onChange={e => setAnalisisForm({ ...analisisForm, potasio_meq: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-4">
                <div className="form-group">
                  <label>Calcio Ca (meq)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-control-input" 
                    value={analisisForm.calcio_meq}
                    onChange={e => setAnalisisForm({ ...analisisForm, calcio_meq: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Magnesio Mg (meq)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-control-input" 
                    value={analisisForm.magnesio_meq}
                    onChange={e => setAnalisisForm({ ...analisisForm, magnesio_meq: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Sodio Na (meq)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-control-input" 
                    value={analisisForm.sodio_meq}
                    onChange={e => setAnalisisForm({ ...analisisForm, sodio_meq: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Aluminio Al (meq)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-control-input" 
                    value={analisisForm.aluminio_meq}
                    onChange={e => setAnalisisForm({ ...analisisForm, aluminio_meq: e.target.value })}
                  />
                </div>
              </div>

              {/* Caja de Cálculos Agronómicos en Vivo */}
              <div className="calc-box">
                <div className="calc-box-title">⚡ Cálculos Automáticos de Fertilidad</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, fontSize: 13 }}>
                  <div><strong>Suma de Bases:</strong> {liveCalculos.sumaBases} meq</div>
                  <div><strong>CICE:</strong> {liveCalculos.cice} meq/100g</div>
                  <div><strong>Sat. Bases:</strong> {liveCalculos.satBases}%</div>
                  <div><strong>Sat. Aluminio:</strong> {liveCalculos.satAluminio}%</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button 
                  type="button" 
                  className="precision-tab-btn" 
                  onClick={() => setShowNuevoAnalisisModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="precision-tab-btn" 
                  style={{ background: '#10b981', color: '#fff', borderRadius: 8 }}
                >
                  Guardar y Auditar Resultado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
