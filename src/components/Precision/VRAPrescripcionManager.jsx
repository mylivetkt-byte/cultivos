import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Tractor, Layers, Download, Plus, Search, RefreshCw, 
  CheckCircle2, AlertTriangle, FileCode, Sliders, ShieldCheck, 
  MapPin, X, ArrowDownToLine, Share2, Sparkles, Send
} from 'lucide-react';
import { authFetch } from '../../utils/api';
import ExportButtons from '../ExportButtons';
import Pagination from '../Pagination';
import './VRAPrescripcionManager.css';

// Fix icons Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
        console.warn('Map bounds error:', e);
      }
    }
  }, [coords, map]);
  return null;
}

export default function VRAPrescripcionManager() {
  const [activeTab, setActiveTab] = useState('prescripciones'); // 'prescripciones', 'generador', 'mapa'

  // Catálogos
  const [fincas, setFincas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [selectedFinca, setSelectedFinca] = useState('');
  const [selectedLote, setSelectedLote] = useState('');

  // Prescripciones
  const [prescripciones, setPrescripciones] = useState([]);
  const [selectedVra, setSelectedVra] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Filtros y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modales
  const [showModalVRA, setShowModalVRA] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Estados de Formulario (100% LIMPIOS, CERO REGISTROS DEMO)
  const initialVraForm = {
    id_finca: '',
    id_lote: '',
    codigo_prescripcion: '',
    nombre: '',
    tipo_insumo: 'Fertilizante_Solido',
    producto_comercial: '',
    fuente_datos: 'Satelital_NDVI',
    formato_maquinaria: 'ISO_XML_11783',
    dosis_base_kg_ha: '150.00',
    estado: 'Aprobada'
  };
  const [vraForm, setVraForm] = useState(initialVraForm);

  // Zonas generadas por el algoritmo agronómico
  const [previewZonas, setPreviewZonas] = useState(null);

  useEffect(() => {
    fetchFincasYLotes();
    fetchPrescripciones();
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

  const fetchPrescripciones = async () => {
    setLoading(true);
    try {
      let url = '/api/vra/prescripciones';
      const params = new URLSearchParams();
      if (selectedFinca) params.append('fincaId', selectedFinca);
      if (selectedLote) params.append('loteId', selectedLote);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await authFetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setPrescripciones(data);
        if (data.length > 0 && !selectedVra) {
          setSelectedVra(data[0]);
        }
      }
    } catch (err) {
      console.error('Error cargando prescripciones:', err);
    } finally {
      setLoading(false);
    }
  };

  // Simular / Generar Zonas VRA en el diseñador
  const handleGenerarZonasPreview = async (loteId, dosisBase, tipoInsumo) => {
    if (!loteId) return;
    try {
      const res = await authFetch('/api/vra/generar-zonas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_lote: loteId,
          dosis_base_kg_ha: dosisBase || 150,
          tipo_insumo: tipoInsumo
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPreviewZonas(data);
      }
    } catch (err) {
      console.error('Error calculando zonas:', err);
    }
  };

  // Guardar Prescripción VRA en Base de Datos MySQL (100% Real)
  const handleGuardarPrescripcion = async (e) => {
    e.preventDefault();
    if (!previewZonas) {
      alert('Por favor genere primero la estratificación de zonas para el lote.');
      return;
    }
    setSubmitting(true);
    setFeedbackMsg(null);

    try {
      const payload = {
        id_finca: vraForm.id_finca,
        id_lote: vraForm.id_lote,
        codigo_prescripcion: vraForm.codigo_prescripcion,
        nombre: vraForm.nombre,
        tipo_insumo: vraForm.tipo_insumo,
        producto_comercial: vraForm.producto_comercial,
        fuente_datos: vraForm.fuente_datos,
        formato_maquinaria: vraForm.formato_maquinaria,
        zonas_json: previewZonas.zonas,
        dosis_promedio_kg_ha: previewZonas.resumen.dosis_promedio_kg_ha,
        dosis_min_kg_ha: previewZonas.resumen.dosis_min_kg_ha,
        dosis_max_kg_ha: previewZonas.resumen.dosis_max_kg_ha,
        superficie_total_ha: previewZonas.hectareas_totales,
        estado: vraForm.estado
      };

      const res = await authFetch('/api/vra/prescripciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al guardar prescripción');

      setFeedbackMsg({ type: 'success', text: 'Prescripción VRA guardada exitosamente en BD y lista para maquinaria.' });
      setShowModalVRA(false);
      setVraForm(initialVraForm);
      setPreviewZonas(null);
      await fetchPrescripciones();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Descarga ISO-XML
  const handleDescargarIsoXml = (id, codigo) => {
    window.open(`/api/vra/prescripciones/${id}/exportar-iso-xml`, '_blank');
  };

  // Descarga GeoJSON
  const handleDescargarGeoJson = (id, codigo) => {
    window.open(`/api/vra/prescripciones/${id}/exportar-geojson`, '_blank');
  };

  // Coordenadas para el mapa
  const activeLoteGeo = useMemo(() => {
    if (!selectedVra) return null;
    const lote = lotes.find(l => l.id_lote === selectedVra.id_lote);
    if (lote && lote.geojson) {
      try {
        const parsed = JSON.parse(lote.geojson);
        if (parsed.type === 'Polygon' && parsed.coordinates && parsed.coordinates[0]) {
          return parsed.coordinates[0].map(pt => [pt[1], pt[0]]);
        }
      } catch (e) {
        console.warn('Error parsing polygon:', e);
      }
    }
    return [[4.6097, -74.0817], [4.6110, -74.0817], [4.6110, -74.0805], [4.6097, -74.0805]];
  }, [selectedVra, lotes]);

  // Zonas parseadas de la prescripción activa
  const activeZonas = useMemo(() => {
    if (!selectedVra || !selectedVra.zonas_json) return [];
    try {
      return typeof selectedVra.zonas_json === 'string' 
        ? JSON.parse(selectedVra.zonas_json) 
        : selectedVra.zonas_json;
    } catch (e) {
      return [];
    }
  }, [selectedVra]);

  // Columnas para ExportButtons
  const exportColumns = [
    { header: 'Código Prescripción', accessor: 'codigo_prescripcion' },
    { header: 'Nombre', accessor: 'nombre' },
    { header: 'Insumo', accessor: 'producto_comercial' },
    { header: 'Tipo', accessor: 'tipo_insumo' },
    { header: 'Finca', accessor: 'finca_nombre' },
    { header: 'Lote', accessor: 'lote_nombre' },
    { header: 'Dosis Prom. (kg/ha)', accessor: 'dosis_promedio_kg_ha' },
    { header: 'Dosis Mín. (kg/ha)', accessor: 'dosis_min_kg_ha' },
    { header: 'Dosis Máx. (kg/ha)', accessor: 'dosis_max_kg_ha' },
    { header: 'Superficie (ha)', accessor: 'superficie_total_ha' },
    { header: 'Formato', accessor: 'formato_maquinaria' },
    { header: 'Estado', accessor: 'estado' }
  ];

  return (
    <div className="vra-prescripcion-container">
      {/* HEADER */}
      <div className="vra-header">
        <div className="header-titles">
          <div className="badge-modulo-vra">MÓDULO 5 • APLICACIÓN VARIABLE (VRA) & MAQUINARIA</div>
          <h2>Diseñador de Mapas de Prescripción & Exportador ISO-XML</h2>
          <p>Estratificación por Zonas de Manejo (MZ), balance nutricional de dosis variable y compatibilidad directa con consolas John Deere, Trimble y Raven.</p>
        </div>

        <div className="header-actions">
          <button 
            className="btn-refresh" 
            onClick={() => {
              setRefreshing(true);
              fetchPrescripciones();
              setTimeout(() => setRefreshing(false), 500);
            }} 
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            <span>Actualizar</span>
          </button>

          <button 
            className="btn-primary-vra"
            onClick={() => {
              setVraForm(initialVraForm);
              setPreviewZonas(null);
              setShowModalVRA(true);
            }}
          >
            <Plus size={16} />
            <span>Nueva Prescripción VRA</span>
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

      {/* TABS DE NAVEGACIÓN */}
      <div className="precision-tabs-nav">
        <button 
          className={`tab-btn ${activeTab === 'prescripciones' ? 'active' : ''}`}
          onClick={() => setActiveTab('prescripciones')}
        >
          <Tractor size={16} />
          <span>Catálogo de Prescripciones ({prescripciones.length})</span>
        </button>

        <button 
          className={`tab-btn ${activeTab === 'mapa' ? 'active' : ''}`}
          onClick={() => setActiveTab('mapa')}
        >
          <Layers size={16} />
          <span>Visor de Zonas de Manejo (MZ)</span>
        </button>
      </div>

      {/* CONTENIDO */}
      <div className="tab-content-wrapper">

        {/* TAB 1: LISTADO DE PRESCRIPCIONES */}
        {activeTab === 'prescripciones' && (
          <div className="prescripciones-view">
            <div className="table-actions-bar">
              <div className="search-box">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar por código, insumo o lote..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <ExportButtons 
                data={prescripciones} 
                columns={exportColumns} 
                filename="Prescripciones_VRA_Maquinaria" 
              />
            </div>

            <div className="table-responsive-box">
              <table className="precision-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Prescripción / Insumo</th>
                    <th>Finca / Lote</th>
                    <th>Fuente Datos</th>
                    <th>Dosis Promedio</th>
                    <th>Rango (Mín - Máx)</th>
                    <th>Área</th>
                    <th>Estado</th>
                    <th>Exportar a Consola</th>
                  </tr>
                </thead>
                <tbody>
                  {prescripciones.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-6">
                        No se han generado mapas de prescripción VRA aún.
                      </td>
                    </tr>
                  ) : (
                    prescripciones
                      .filter(p => (p.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) || (p.codigo_prescripcion || '').toLowerCase().includes(searchTerm.toLowerCase()) || (p.producto_comercial || '').toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(p => (
                        <tr key={p.id_prescripcion}>
                          <td className="font-bold text-slate-800">{p.codigo_prescripcion}</td>
                          <td>
                            <div><strong>{p.nombre}</strong></div>
                            <span className="text-xs text-sky-700">{p.producto_comercial}</span>
                          </td>
                          <td>{p.finca_nombre} &bull; {p.lote_nombre}</td>
                          <td>
                            <span className="source-badge">{p.fuente_datos}</span>
                          </td>
                          <td className="font-semibold text-emerald-600">{p.dosis_promedio_kg_ha} kg/ha</td>
                          <td className="text-xs">{p.dosis_min_kg_ha} - {p.dosis_max_kg_ha} kg/ha</td>
                          <td>{p.superficie_total_ha} ha</td>
                          <td>
                            <span className={`status-badge-pill ${p.estado.toLowerCase()}`}>
                              {p.estado}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons-cell">
                              <button 
                                className="btn-export-badge isoxml"
                                title="Descargar ISO 11783 TASKDATA.XML para John Deere / Raven"
                                onClick={() => handleDescargarIsoXml(p.id_prescripcion, p.codigo_prescripcion)}
                              >
                                <FileCode size={13} />
                                <span>ISO-XML</span>
                              </button>

                              <button 
                                className="btn-export-badge geojson"
                                title="Descargar GeoJSON para drones agrícolas DJI / GIS"
                                onClick={() => handleDescargarGeoJson(p.id_prescripcion, p.codigo_prescripcion)}
                              >
                                <ArrowDownToLine size={13} />
                                <span>GeoJSON</span>
                              </button>

                              <button 
                                className="btn-icon-action" 
                                title="Ver en visor de zonas"
                                onClick={() => {
                                  setSelectedVra(p);
                                  setActiveTab('mapa');
                                }}
                              >
                                <Layers size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: VISOR DE ZONAS Y MAPA LEAFLET */}
        {activeTab === 'mapa' && selectedVra && (
          <div className="vra-map-layout">
            <div className="vra-details-card">
              <span className="sensor-tag">{selectedVra.codigo_prescripcion}</span>
              <h3>{selectedVra.nombre}</h3>
              <p className="text-xs text-slate-600 mb-3">{selectedVra.producto_comercial} ({selectedVra.tipo_insumo})</p>

              <div className="zonas-breakdown-list">
                <h4>Estratificación de Dosis por Zona</h4>
                {activeZonas.map(z => (
                  <div key={z.id_zona} className="zona-item-row">
                    <div className="zona-color-indicator" style={{ background: z.color }}></div>
                    <div className="zona-details">
                      <span className="font-semibold text-slate-800">{z.nombre}</span>
                      <div className="zona-sub-meta">
                        <span><strong>Dosis:</strong> {z.dosis_kg_ha} kg/ha</span> &bull; 
                        <span><strong>Área:</strong> {z.hectareas} ha</span> &bull; 
                        <span><strong>Total:</strong> {z.total_insumo_kg} kg</span>
                      </div>
                      <span className="text-xs text-slate-500">{z.estrategia}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="export-pack-box">
                <h4>Paquete de Exportación para Cabina:</h4>
                <div className="export-buttons-stack">
                  <button 
                    className="btn-download-console isoxml"
                    onClick={() => handleDescargarIsoXml(selectedVra.id_prescripcion, selectedVra.codigo_prescripcion)}
                  >
                    <FileCode size={16} />
                    <span>Descargar TASKDATA.XML (John Deere / Trimble)</span>
                  </button>

                  <button 
                    className="btn-download-console geojson"
                    onClick={() => handleDescargarGeoJson(selectedVra.id_prescripcion, selectedVra.codigo_prescripcion)}
                  >
                    <ArrowDownToLine size={16} />
                    <span>Descargar GeoJSON (DJI Agras / GIS)</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="vra-map-card">
              <MapContainer 
                center={activeLoteGeo[0]} 
                zoom={16} 
                style={{ height: '560px', width: '100%', borderRadius: '14px' }}
              >
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution="Esri World Imagery"
                />
                <MapRecenter coords={activeLoteGeo} />

                {/* Polígono de Lote coloreado con zonas */}
                <Polygon
                  positions={activeLoteGeo}
                  pathOptions={{
                    color: '#f59e0b',
                    weight: 3,
                    fillColor: '#f59e0b',
                    fillOpacity: 0.35
                  }}
                >
                  <Popup>
                    <div>
                      <h4>{selectedVra.nombre}</h4>
                      <p>Dosis promedio: <strong>{selectedVra.dosis_promedio_kg_ha} kg/ha</strong></p>
                      <p>Superficie: <strong>{selectedVra.superficie_total_ha} ha</strong></p>
                    </div>
                  </Popup>
                </Polygon>
              </MapContainer>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL: NUEVA PRESCRIPCIÓN VRA (CAMPOS 100% LIMPIOS, CERO DEMO)            */}
      {/* ========================================================================= */}
      {showModalVRA && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Crear Prescripción de Dosis Variable (VRA)</h3>
              <button className="btn-close" onClick={() => setShowModalVRA(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleGuardarPrescripcion} className="modal-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Finca Destino *</label>
                  <select 
                    required 
                    value={vraForm.id_finca}
                    onChange={(e) => {
                      setVraForm({ ...vraForm, id_finca: e.target.value, id_lote: '' });
                      setPreviewZonas(null);
                    }}
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
                    value={vraForm.id_lote}
                    onChange={(e) => {
                      setVraForm({ ...vraForm, id_lote: e.target.value });
                      handleGenerarZonasPreview(e.target.value, vraForm.dosis_base_kg_ha, vraForm.tipo_insumo);
                    }}
                    disabled={!vraForm.id_finca}
                  >
                    <option value="">Seleccione Lote</option>
                    {lotes
                      .filter(l => String(l.id_finca) === String(vraForm.id_finca))
                      .map(l => (
                        <option key={l.id_lote} value={l.id_lote}>{l.nombre}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Código Prescripción (Único) *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. VRA-FERT-2026-05"
                    value={vraForm.codigo_prescripcion}
                    onChange={(e) => setVraForm({ ...vraForm, codigo_prescripcion: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Nombre de la Prescripción *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. Fertilización NPK Variable Lote 1"
                    value={vraForm.nombre}
                    onChange={(e) => setVraForm({ ...vraForm, nombre: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Tipo de Insumo</label>
                  <select 
                    value={vraForm.tipo_insumo}
                    onChange={(e) => {
                      setVraForm({ ...vraForm, tipo_insumo: e.target.value });
                      if (vraForm.id_lote) handleGenerarZonasPreview(vraForm.id_lote, vraForm.dosis_base_kg_ha, e.target.value);
                    }}
                  >
                    <option value="Fertilizante_Solido">Fertilizante Sólido Granulado</option>
                    <option value="Fertilizante_Liquido">Fertilizante Líquido</option>
                    <option value="Cal_Enmienda">Enmienda / Cal Agrícola</option>
                    <option value="Semilla">Semilla (Dosis Variable de Siembra)</option>
                    <option value="Agroquimico">Agroquímico Fitosanitario</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Producto Comercial *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. YaraMila Complex 12-11-18"
                    value={vraForm.producto_comercial}
                    onChange={(e) => setVraForm({ ...vraForm, producto_comercial: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Dosis Base de Calibración (kg/ha) *</label>
                  <input 
                    type="number" 
                    step="1"
                    required
                    value={vraForm.dosis_base_kg_ha}
                    onChange={(e) => {
                      setVraForm({ ...vraForm, dosis_base_kg_ha: e.target.value });
                      if (vraForm.id_lote) handleGenerarZonasPreview(vraForm.id_lote, e.target.value, vraForm.tipo_insumo);
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>Fuente de Información</label>
                  <select 
                    value={vraForm.fuente_datos}
                    onChange={(e) => setVraForm({ ...vraForm, fuente_datos: e.target.value })}
                  >
                    <option value="Satelital_NDVI">Índices Satelitales (NDVI / NDRE)</option>
                    <option value="Malla_Suelos">Malla de Muestreo de Suelo</option>
                    <option value="Hibrido">Híbrido (Satélite + Muestreo)</option>
                  </select>
                </div>
              </div>

              {/* Vista Previa de Zonas Calculadas */}
              {previewZonas && (
                <div className="preview-zonas-box">
                  <span className="font-semibold text-slate-700 text-xs uppercase tracking-wider">Zonas de Manejo Generadas:</span>
                  <div className="preview-zonas-pills">
                    {previewZonas.zonas.map(z => (
                      <div key={z.id_zona} className="preview-pill" style={{ borderColor: z.color }}>
                        <span className="pill-dot" style={{ background: z.color }}></span>
                        <strong>{z.dosis_kg_ha} kg/ha</strong> ({z.hectareas} ha)
                      </div>
                    ))}
                  </div>
                  <div className="preview-savings-note">
                    Ahorro estimado respecto a dosis fija: <strong>{previewZonas.resumen.ahorro_estimado_porc}%</strong> (Total Insumo: {previewZonas.resumen.total_insumo_kg} kg)
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModalVRA(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={submitting || !previewZonas}>
                  {submitting ? 'Guardando en BD...' : 'Guardar Prescripción en BD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
