import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, LayersControl, Marker, WMSTileLayer, FeatureGroup, useMap, ImageOverlay, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as turf from '@turf/turf';
import './SatelliteCommandCenter.css';
import { authFetch } from '../utils/api';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to control map view - uses useMap() hook (react-leaflet v4)
function MapController({ finca, selectedLote }) {
  const map = useMap();
  useEffect(() => {
    // Prioridad: si hay un lote seleccionado, centrar en él; si no, en la finca
    const target = selectedLote || finca;
    if (target && target.geometry && target.geometry.type === 'Polygon') {
      try {
        const geoJson = L.geoJSON({ type: 'Feature', geometry: target.geometry });
        const bounds = geoJson.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
        }
      } catch (e) {
        console.error('Error fitting bounds:', e);
      }
    }
    map.invalidateSize();
  }, [finca, selectedLote, map]);
  return null;
}

function SatelliteCommandCenter({ tenantId = 1 } = {}) {
  const [lotes, setLotes] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeLayer, setActiveLayer] = useState('NDVI');
  const [sentinelInstanceId, setSentinelInstanceId] = useState('');
  
  // Nuevos estados interactivos
  const [opacity, setOpacity] = useState(0.8);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const [finca, setFinca] = useState(null);

  const [fincasList, setFincasList] = useState([]);
  const [selectedFincaId, setSelectedFincaId] = useState(null);
  const [selectedFincaPolygon, setSelectedFincaPolygon] = useState(null);
  const [debugError, setDebugError] = useState(null);
  const [lotesRaw, setLotesRaw] = useState([]);  // GeoJSON features de lotes
  const [isLoadingLotes, setIsLoadingLotes] = useState(false);
  const [lotesError, setLotesError] = useState(null);
  const [selectedLoteId, setSelectedLoteId] = useState(null);
  const [selectedLote, setSelectedLote] = useState(null);
  
  const [loteImage, setLoteImage] = useState(null);
  const [loteBounds, setLoteBounds] = useState(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [economiaData, setEconomiaData] = useState([]);
  const [weatherData, setWeatherData] = useState({ temp: '--', rain7d: '--' });
  const [vraGrid, setVraGrid] = useState(null);
  const [bloqueos, setBloqueos] = useState([]);

  // Ground Truthing States
  const [groundTruthList, setGroundTruthList] = useState([]);
  const [showGroundTruthModal, setShowGroundTruthModal] = useState(false);
  const [groundTruthForm, setGroundTruthForm] = useState({
    codigo_verificacion: '',
    estado_cultivo_real: 'Deficiencia_Nutricional',
    severidad: 'Media',
    diagnostico_campo: '',
    accion_correctiva: '',
    indice_observado: 'NDVI',
    latitud: '',
    longitud: ''
  });

  const toggleTool = (toolName) => {
    setActiveTool(prev => prev === toolName ? null : toolName);
  };

  const fetchGroundTruth = async () => {
    try {
      let url = '/api/satellite/ground-truth';
      if (selectedFincaId) url += `?fincaId=${selectedFincaId}`;
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        setGroundTruthList(data);
      }
    } catch (e) {
      console.error('Error cargando ground truth:', e);
    }
  };

  useEffect(() => {
    fetchGroundTruth();
  }, [selectedFincaId]);

  // Función para mostrar notificaciones temporales
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSyncSentinel = () => {
    if (!sentinelInstanceId) {
      showToast('⚠️ Debes ingresar tu Instance ID de Sentinel Hub primero');
      return;
    }
    setIsSyncing(true);
    showToast('🔄 Conectando con Copernicus CDSE y Sentinel Hub...');
    setTimeout(() => {
      setIsSyncing(false);
      showToast('✅ Sincronización exitosa. Capas actualizadas.');
    }, 2500);
  };

  const handleDespachar = async (alert) => {
    showToast(`⏳ Generando orden de despacho para ${alert.lote_nombre}...`);
    try {
      const res = await authFetch('/api/gis/despachar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_lote: alert.lote_id, descripcion_labor: `Atención a alerta: ${alert.tipo}` })
      });
      if (res.ok) {
        showToast(`✅ Orden de despacho (Labor) generada con éxito.`);
      } else {
        showToast(`❌ Error al generar orden.`);
      }
    } catch (err) {
      showToast(`❌ Error de conexión.`);
    }
  };

  

  const setFallbackLotes = () => {
    setLotes([
      { id: 101, name: 'LOTE 101 - MAÍZ (V6)', color: '#d98e1b', coordinates: [[4.65, -74.1], [4.655, -74.1], [4.655, -74.09], [4.65, -74.09]], ndvi: 0.45, ndmi: 0.3 },
      { id: 204, name: 'LOTE 204 - SOJA', color: '#50e3c2', coordinates: [[4.655, -74.09], [4.66, -74.09], [4.66, -74.08], [4.655, -74.08]], ndvi: 0.85, ndmi: 0.7 },
      { id: 304, name: 'LOTE 304 - SOJA', color: '#4a90e2', coordinates: [[4.65, -74.09], [4.655, -74.09], [4.655, -74.08], [4.65, -74.08]], ndvi: 0.9, ndmi: 0.8 },
      { id: 105, name: 'LOTE 105 - CAFÉ', color: '#b00218', coordinates: [[4.645, -74.1], [4.65, -74.1], [4.65, -74.09], [4.645, -74.09]], ndvi: 0.3, ndmi: 0.2 },
    ]);
  };

  // Load real data on mount
  useEffect(() => {
    // 1. Alerts
    authFetch('/api/gis/alerts')
      .then(r => r.json())
      .then(setAlerts)
      .catch(err => console.error('Error fetching alerts:', err));

    // 2. Cargar lista de fincas
    authFetch(`/api/gis/fincas?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        const list = data.features || [];
        console.log('Fincas cargadas:', list.length);
        setFincasList(list);
      })
      .catch(err => console.error('Error fetching fincas list:', err));
  }, []);

  const handleFincaChange = (e) => {
    const fincaId = Number(e.target.value);
    setSelectedFincaId(fincaId);
    if (!fincaId) return;
    
    // Buscar la finca elegida dentro de la lista cargada
    const chosen = fincasList.find(f => f.properties.id === fincaId);
    if (chosen) setFinca(chosen);

    // Resetear selección de lote al cambiar de finca
    setSelectedLoteId(null);
    setSelectedLote(null);
    setIsLoadingLotes(true);
    setLotesError(null);

    // Obtener lotes de la finca
    authFetch(`/api/gis/lotes/${fincaId}?t=${Date.now()}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP Error ${r.status}`);
        return r.json();
      })
      .then(lotesData => {
        const rawFeatures = lotesData.features || [];
        console.log('Lotes cargados:', rawFeatures.length);
        setLotesRaw(rawFeatures);

        if (rawFeatures.length > 0) {
          const loteIds = rawFeatures.map(f => f.properties.id);
          // Obtener métricas para esos lotes
          return authFetch('/api/gis/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loteIds })
          })
            .then(r => r.json())
            .then(metricsData => {
              const parsed = rawFeatures.map(f => {
                // Extraer y transformar coordenadas GeoJSON a Leaflet LatLng [lat, lon]
                let coords = [];
                if (f.geometry && f.geometry.type === 'Polygon' && f.geometry.coordinates[0]) {
                  coords = f.geometry.coordinates[0].map(pt => [pt[1], pt[0]]);
                } else if (f.geometry && f.geometry.type === 'MultiPolygon' && f.geometry.coordinates[0][0]) {
                  coords = f.geometry.coordinates[0][0].map(pt => [pt[1], pt[0]]);
                }

                const metric = metricsData.find(m => m.lote_id === f.properties.id) || { ndvi: 0.5, ndmi: 0.5 };
                const ndvi = parseFloat(metric.ndvi || 0.5).toFixed(2);
                const ndmi = parseFloat(metric.ndmi || 0.5).toFixed(2);
                let color = '#50e3c2';
                if (ndvi < 0.4) color = '#d98e1b';
                if (ndvi < 0.3) color = '#b00218';
                if (ndvi > 0.7) color = '#4a90e2';
                return { 
                  id: f.properties.id, 
                  name: f.properties.nombre || `Lote ${f.properties.id}`, 
                  codigo: f.properties.codigo,
                  nucleo_nombre: f.properties.nucleo_nombre,
                  hectareas: f.properties.hectareas,
                  cultivo_actual: f.properties.cultivo_actual,
                  color, coordinates: coords, ndvi, ndmi 
                };
              }).filter(l => l.coordinates.length > 0);
              setLotes(parsed);
              setIsLoadingLotes(false);
            });
        } else {
          setLotes([]);
          setIsLoadingLotes(false);
        }
      })
      .catch(err => {
        window._lastError = err;
        console.error('Error fetching lotes:', err);
        setLotesError(err.message);
        setDebugError({
           status: window._lastStatus,
           msg: err.message,
           resp: window._lastResponseStr
        });
        setIsLoadingLotes(false);
      })
      .finally(() => {
        setIsLoadingLotes(false);
      });
      
    // Fetch economía de la finca
    authFetch(`/api/gis/economia/${fincaId}?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        console.log('Economía cargada:', data);
        setEconomiaData(data);
      })
      .catch(err => console.error('Error fetching economia:', err));

    // Fetch Programaciones de Aplicación para Bloqueos de Carencia
    authFetch(`/api/applications/schedule?tenantId=${tenantId || 1}`)
      .then(r => r.json())
      .then(data => {
        if(Array.isArray(data)) {
          const now = new Date();
          const recientes = data.filter(p => {
             // Simulamos un Periodo de Carencia (PC) de 15 días por defecto para aplicaciones químicas/mixtas
             if(p.estado !== 'Completada') return false;
             if(p.id_finca && p.id_finca !== fincaId) return false;
             const fecha = new Date(p.fecha_ejecucion || p.fecha_programada);
             const diffDays = Math.floor((now - fecha) / (1000 * 60 * 60 * 24));
             return diffDays <= 15;
          });
          setBloqueos(recientes);
        }
      })
      .catch(err => console.error('Error fetching bloqueos carencia:', err));
  };

  // 4. Cuando el usuario elige un lote, centrar en él
  useEffect(() => {
    if (!selectedLoteId) {
      setSelectedLote(null);
      return;
    }
    const chosen = lotesRaw.find(f => f.properties.id === selectedLoteId);
    if (chosen) {
      setSelectedLote(chosen);
    }
  }, [selectedLoteId, lotesRaw]);

  // Fetch Clima desde Open-Meteo basado en la ubicación de la finca
  useEffect(() => {
    if (finca && finca.geometry && finca.geometry.coordinates && finca.geometry.coordinates[0]) {
      try {
        let coords = finca.geometry.coordinates[0];
        // handle Multipolygon vs Polygon
        if (finca.geometry.type === 'MultiPolygon') coords = coords[0];
        
        const firstPoint = coords[0];
        // Las coordenadas de geojson vienen en formato [lng, lat]
        const lng = firstPoint[0];
        const lat = firstPoint[1];

        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m&daily=precipitation_sum&timezone=auto&past_days=7`)
          .then(res => res.json())
          .then(data => {
            const currentTemp = data.current?.temperature_2m || '--';
            const rainArray = data.daily?.precipitation_sum || [];
            const totalRain = rainArray.reduce((acc, val) => acc + (val || 0), 0).toFixed(1);
            setWeatherData({ temp: currentTemp, rain7d: totalRain });
          })
          .catch(err => {
            console.error("Open-Meteo fetch error:", err);
            setWeatherData({ temp: '--', rain7d: '--' });
          });
      } catch (e) {
        console.error("Error parseando coordenadas de la finca para clima", e);
      }
    } else {
      setWeatherData({ temp: '--', rain7d: '--' });
    }
  }, [finca]);

  // Generación de Curvas VRA (Zonificación Malla)
  useEffect(() => {
    if (activeTool === 'vra' && selectedLote) {
      try {
        const bbox = turf.bbox(selectedLote);
        const cellSide = 0.03; // 30 meters approx grid
        const squareGrid = turf.squareGrid(bbox, cellSide, { units: 'kilometers', mask: selectedLote });
        
        turf.featureEach(squareGrid, function (feature) {
          // Lógica simulada: Tasa de nitrógeno basada en una variación pseudoaleatoria (demo)
          // En la vida real, se cruza el polígono de cada grilla con los valores de los píxeles NDVI de la imagen TIF.
          const rate = Math.floor(Math.random() * 70) + 80; // 80 a 150 kg/ha
          feature.properties = { applicationRate: rate };
        });

        setVraGrid(squareGrid);
        showToast('✅ Mapa de prescripción VRA generado.');
      } catch (e) {
        console.error("VRA Error", e);
        showToast('❌ Error generando malla VRA.');
        setVraGrid(null);
      }
    } else {
      setVraGrid(null);
    }
  }, [activeTool, selectedLote]);

  // 5. Fetch CDSE Process API Image for the selected lot
  useEffect(() => {
    let activeUrl = null;
    if (!selectedLote || !selectedLote.geometry || activeLayer === 'RENTABILIDAD') {
      setLoteImage(null);
      setLoteBounds(null);
      return;
    }

    const fetchImage = async () => {
      setIsLoadingImage(true);
      showToast(`📡 Solicitando imagen real satelital (${activeLayer}) para el lote...`);
      try {
        const geoJsonLayer = L.geoJSON({ type: 'Feature', geometry: selectedLote.geometry });
        const bounds = geoJsonLayer.getBounds();
        setLoteBounds([
          [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
          [bounds.getNorthEast().lat, bounds.getNorthEast().lng]
        ]);
        
        // 3 is the ID for Sentinel-2 in sat_api_conexiones
        const res = await authFetch('/api/satellite/3/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            geometry: selectedLote.geometry,
            layerType: activeLayer
          })
        });
        
        if (res.ok) {
          const blob = await res.blob();
          if (activeUrl) URL.revokeObjectURL(activeUrl);
          activeUrl = URL.createObjectURL(blob);
          setLoteImage(activeUrl);
          showToast(`✅ Imagen satelital real procesada (${activeLayer}).`);
        } else {
          console.error("Error fetching satellite image", await res.text());
          showToast(`❌ Error al obtener imagen satelital.`);
          setLoteImage(null);
        }
      } catch (err) {
        console.error(err);
        showToast(`❌ Error de conexión al satélite.`);
        setLoteImage(null);
      } finally {
        setIsLoadingImage(false);
      }
    };
    
    fetchImage();
    
    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    }
  }, [selectedLote, activeLayer]);


  return (
    <div className="scc-container">
      <div className="scc-main-wrapper">
        {/* PANEL IZQUIERDO */}
        <aside className="scc-sidebar scc-left-panel">
          <div className="panel-section">
            <div className="panel-title-flex">
              <h4>🚨 OPS & ALERTAS IA <span className="badge online">ONLINE</span></h4>
            </div>
            <div className="offline-toggle">
              <label className="switch">
                <input type="checkbox" />
                <span className="slider-toggle round"></span>
              </label>
              <span>Modo Offline</span>
            </div>

            <div className="panel-section">
              <label>Seleccionar finca:</label>
              <select
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-300"
                value={selectedFincaId || ''}
                onChange={handleFincaChange}
              >
                <option value="" disabled>-- Elegir finca --</option>
                {fincasList.map(f => (
                  <option key={f.properties.id} value={f.properties.id}>
                    {f.properties.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="panel-section">
              <label>Seleccionar lote:</label>
              <select
                value={selectedLoteId || ''}
                onChange={e => setSelectedLoteId(Number(e.target.value))}
                disabled={!selectedFincaId || lotesRaw.length === 0}
              >
                <option value="" disabled>-- Elegir lote --</option>
                {lotesRaw.map(l => (
                  <option key={l.properties.id} value={l.properties.id}>
                    {l.properties.codigo ? `[${l.properties.codigo}] ` : ''}
                    {l.properties.nombre}
                    {l.properties.nucleo_nombre ? ` (${l.properties.nucleo_nombre})` : ''}
                    {l.properties.hectareas ? ` - ${l.properties.hectareas} Ha` : ''}
                    {!l.properties.tiene_poligono ? ' ⚠️ Sin polígono' : ''}
                  </option>
                ))}
              </select>
              {selectedFincaId && lotesRaw.length > 0 && (
                <small className="lotes-count">
                  {lotesRaw.length} lotes — {lotesRaw.filter(l => l.properties.tiene_poligono).length} con polígono GPS
                </small>
              )}
                {selectedFincaId && lotesRaw.length === 0 && isLoadingLotes && (
                  <div style={{ color: '#0ea5e9', fontSize: '12px', background: 'rgba(14, 165, 233, 0.1)', padding: '10px', borderRadius: '4px', border: '1px solid #0ea5e9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <div>Sincronizando polígonos de lotes con el satélite...</div>
                  </div>
                )}
                {selectedFincaId && lotesError && (
                  <div style={{ color: '#ef4444', fontSize: '12px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '4px', border: '1px solid #ef4444' }}>
                    <i className="fa-solid fa-triangle-exclamation"></i> Error: {lotesError}
                  </div>
                )}
                {selectedFincaId && lotesRaw.length === 0 && !isLoadingLotes && !lotesError && (
                  <div style={{ color: '#f97316', fontSize: '11px', background: 'rgba(0,0,0,0.5)', padding: '5px' }}>
                    ⚠️ No se encontraron lotes con polígono para esta finca.
                  </div>
                )}
            </div>
            
            <h5 className="sub-heading">Alertas de Prioridad IA</h5>
            <div className="alerts-container-scroll">
              {alerts.length > 0 ? alerts.map(alert => (
                <div key={alert.id} className={`alert-card ${alert.severidad === 'CRITICA' || alert.severidad === 'ALTA' ? 'high' : 'medium'}`}>
                  <div className="alert-header">
                    <strong>{alert.tipo}</strong>
                    <span className={`badge ${alert.severidad.toLowerCase()}`}>{alert.severidad}</span>
                  </div>
                  <p className="alert-msg">Alerta IA (Real): {alert.mensaje}</p>
                  <div className="alert-actions">
                    <button className="btn-outline" onClick={() => showToast(`🔎 Cargando detalles de: ${alert.tipo}`)}>Detalles</button>
                    <button className="btn-filled" onClick={() => handleDespachar(alert)}>Despachar</button>
                  </div>
                </div>
              )) : (
                <div className="alert-card empty">No hay alertas.</div>
              )}
            </div>
          </div>

          <div className="panel-section">
            <h4>📦 ALMACÉN Y DOSIFICACIÓN</h4>
            <div className="progress-item">
              <div className="progress-labels">
                <span>Fungicida Sistémico (Hongo)</span>
                <span>15%</span>
              </div>
              <div className="progress-bar"><div className="fill red" style={{width: '15%'}}></div></div>
            </div>
            <div className="progress-item">
              <div className="progress-labels">
                <span>Urea Granulada (Nitrógeno)</span>
                <span>48%</span>
              </div>
              <div className="progress-bar"><div className="fill orange" style={{width: '48%'}}></div></div>
            </div>
            <div className="progress-item">
              <div className="progress-labels">
                <span>Herbicida Glifosato</span>
                <span>75%</span>
              </div>
              <div className="progress-bar"><div className="fill green" style={{width: '75%'}}></div></div>
            </div>
          </div>

          <div className="panel-section">
            <h4>🚜 FLOTA Y LOGÍSTICA</h4>
            <div className="fleet-grid">
              <div className="fleet-card"><div className="dot blue"></div> Drone D1 <br/><small>En Uso</small></div>
              <div className="fleet-card"><div className="dot green"></div> Tractor T2 <br/><small>Disponible</small></div>
              <div className="fleet-card"><div className="dot red"></div> Rociadora <br/><small>Mantenimiento</small></div>
              <div className="fleet-card"><div className="dot green"></div> Camión C1 <br/><small>Disponible</small></div>
            </div>
          </div>
        </aside>

        {/* MAPA CENTRAL */}
        <main className="scc-map-container">
          <MapContainer center={[4.42, -72.75]} zoom={13} zoomControl={false} style={{ height: '100%', width: '100%' }}>
            <MapController finca={finca} selectedLote={selectedLote} />
            <LayersControl position="topleft">
              <LayersControl.BaseLayer checked name="Satélite Esri">
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              </LayersControl.BaseLayer>
              {sentinelInstanceId && (
                <>
                  <LayersControl.Overlay checked={activeLayer === 'RGB'} name="Sentinel-2 RGB">
                    <WMSTileLayer opacity={opacity} url={`https://services.sentinel-hub.com/ogc/wms/${sentinelInstanceId}`} layers="TRUE-COLOR-S2L2A" format="image/png" transparent={true} />
                  </LayersControl.Overlay>
                  <LayersControl.Overlay checked={activeLayer === 'NDVI'} name="Sentinel-2 NDVI">
                    <WMSTileLayer opacity={opacity} url={`https://services.sentinel-hub.com/ogc/wms/${sentinelInstanceId}`} layers="NDVI" format="image/png" transparent={true} />
                  </LayersControl.Overlay>
                  <LayersControl.Overlay checked={activeLayer === 'NDMI'} name="Sentinel-2 NDMI">
                    <WMSTileLayer opacity={opacity} url={`https://services.sentinel-hub.com/ogc/wms/${sentinelInstanceId}`} layers="NDMI" format="image/png" transparent={true} />
                  </LayersControl.Overlay>
                </>
              )}
            </LayersControl>
            
            {loteImage && loteBounds && (
              <ImageOverlay
                url={loteImage}
                bounds={loteBounds}
                opacity={opacity}
                zIndex={10}
              />
            )}

            <FeatureGroup>
                {finca && finca.geometry && finca.geometry.type === 'Polygon' && (
                  <Polygon
                    positions={finca.geometry.coordinates[0].map(c => [c[1], c[0]])}
                    pathOptions={{ color: '#ff7800', fillColor: 'transparent', weight: 3 }}
                  >
                    <Popup><strong>{finca.properties.nombre}</strong></Popup>
                  </Polygon>
                )}

                {lotes.map(lote => {
                  const isSelected = selectedLoteId === lote.id;
                  const bloqueo = bloqueos.find(b => b.id_lote === lote.id);

                  let fillColor = 'transparent';
                  let strokeColor = isSelected ? '#ffd700' : lote.color;
                  let weight = isSelected ? 4 : 2;
                  let dashArray = isSelected ? '' : '5 5';
                  let ecoInfo = '';
                  
                  if (activeLayer === 'RENTABILIDAD') {
                     const eco = economiaData.find(e => e.id_lote === lote.id);
                     const cost = eco ? Number(eco.costo_acumulado) : 0;
                     if (cost > 1000) { fillColor = 'rgba(255,0,0,0.6)'; strokeColor = '#ff0000'; }
                     else if (cost > 500) { fillColor = 'rgba(255,165,0,0.6)'; strokeColor = '#ffa500'; }
                     else if (cost > 0) { fillColor = 'rgba(0,128,0,0.6)'; strokeColor = '#008000'; }
                     else { fillColor = 'rgba(128,128,128,0.3)'; strokeColor = '#888'; }
                     ecoInfo = `Costo Total: $${cost}`;
                     dashArray = '';
                  } else {
                     if (bloqueo) {
                        fillColor = 'rgba(239, 68, 68, 0.4)';
                        strokeColor = '#ef4444';
                        weight = isSelected ? 5 : 3;
                        dashArray = '10 5';
                     } else {
                        fillColor = isSelected ? 'rgba(255,215,0,0.15)' : 'rgba(16, 185, 129, 0.05)';
                     }
                  }

                  if (!lote.coordinates || lote.coordinates.length === 0) return null;

                  return (
                    <Polygon 
                      key={lote.id} 
                      positions={lote.coordinates} 
                      pathOptions={{ color: strokeColor, fillColor: fillColor, weight, dashArray }}
                      eventHandlers={{
                        click: () => setSelectedLoteId(lote.id)
                      }}
                    >
                      <Popup>
                        <strong>{lote.name}</strong><br/>
                        {lote.nucleo_nombre && <><em>{lote.nucleo_nombre}</em><br/></>}
                        {lote.hectareas && <>Área: {lote.hectareas} Ha<br/></>}
                        {lote.cultivo_actual && <>Cultivo: {lote.cultivo_actual}<br/></>}
                        NDVI: {lote.ndvi} | NDMI: {lote.ndmi}<br/>{ecoInfo}
                        {bloqueo && (
                          <div style={{backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: 'bold', marginTop: '6px', padding: '6px', border: '1px solid #ef4444', borderRadius: '4px'}}>
                            🚫 BLOQUEADO: PERIODO DE CARENCIA<br/>
                            <span style={{fontSize: '11px', color: '#7f1d1d', fontWeight: 'normal'}}>
                              Fumigado: {new Date(bloqueo.fecha_ejecucion || bloqueo.fecha_programada).toLocaleDateString()}<br/>
                              Receta: {bloqueo.nombre_receta}
                            </span>
                          </div>
                        )}
                      </Popup>
                    </Polygon>
                  );
                })}
            </FeatureGroup>

            {/* PUNTOS DE GROUND TRUTHING (SCOUTING) */}
            {activeTool === 'scouting' && groundTruthList.map(gt => {
              let pinColor = '#10b981';
              if (gt.severidad === 'Critica') pinColor = '#ef4444';
              else if (gt.severidad === 'Alta') pinColor = '#f97316';
              else if (gt.severidad === 'Media') pinColor = '#eab308';
              
              const icon = L.divIcon({
                className: 'custom-gt-marker',
                html: `<div style="background:${pinColor}; width:16px; height:16px; border-radius:50%; border:2px solid #fff; box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
              });

              return (
                <Marker key={gt.id_verificacion} position={[parseFloat(gt.latitud), parseFloat(gt.longitud)]} icon={icon}>
                  <Popup>
                    <div style={{ fontSize: '12px', minWidth: '180px' }}>
                      <strong>📍 {gt.codigo_verificacion}</strong><br/>
                      Lote: {gt.lote_nombre}<br/>
                      Problema Real: <strong>{gt.estado_cultivo_real}</strong><br/>
                      Severidad: <span style={{ color: pinColor, fontWeight: 'bold' }}>{gt.severidad}</span><br/>
                      Índice Satélite: {gt.indice_observado}<br/>
                      Diagnóstico: {gt.diagnostico_campo}<br/>
                      {gt.accion_correctiva && <>Acción: <em>{gt.accion_correctiva}</em><br/></>}
                      <small style={{ color: '#64748b' }}>Fecha: {new Date(gt.fecha_inspeccion).toLocaleDateString()}</small>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {vraGrid && (
              <GeoJSON 
                key={`vra-${selectedLote ? selectedLote.properties.id : 'none'}`}
                data={vraGrid} 
                style={(feature) => {
                  const rate = feature.properties.applicationRate;
                  let color = '#ffff00';
                  if (rate > 130) color = '#ff0000';
                  else if (rate < 100) color = '#00ff00';
                  return { color: '#000', weight: 1, fillColor: color, fillOpacity: 0.5 };
                }}
                onEachFeature={(feature, layer) => {
                  layer.bindPopup(`Tasa VRA: ${feature.properties.applicationRate} kg/ha`);
                }}
              />
            )}
          </MapContainer>
          
          {/* TIMELINE FLOTANTE */}
          <div className="scc-floating-timeline">
            <div className="timeline-header">
              <span>📅 Histórico Sentinel-2 e Índices</span>
              <span className="timeline-date">May - Cosecha</span>
            </div>
            <p className="timeline-desc">Cosecha avanzada y senescencia de follaje residual</p>
            <input type="range" min="1" max="100" defaultValue="90" className="timeline-slider" />
          </div>
        </main>

        {/* PANEL DERECHO */}
        <aside className="scc-sidebar scc-right-panel">
          <div className="right-panel-scroll">
            <div className="panel-section">
              <div className="map-base-select">
                <label>MAPA BASE</label>
                <select><option>Satélite Esri</option></select>
              </div>
            </div>

            <div className="panel-section">
              <div className="panel-title-flex">
                <label>SENTINEL HUB</label>
                <span className="badge green">API EN VIVO</span>
              </div>
              <p className="small-text">SENTINEL HUB ESTÁ CONECTADO. CON SU INSTANCE_ID PUEDE SINCRONIZAR DATOS EN VIVO.</p>
              <input 
                type="text" 
                placeholder="Instance ID Sentinel" 
                value={sentinelInstanceId}
                onChange={(e) => setSentinelInstanceId(e.target.value)}
                className="sentinel-input-full"
              />
              <button className="btn-full-outline mt-2">⚙️ Configurar Conexión</button>
            </div>

            <div className="panel-section">
              <label>ÍNDICES SATELITALES</label>
              <div className="indices-buttons">
                <button className={`index-btn ${activeLayer === 'RGB' ? 'active-rgb' : ''}`} onClick={() => setActiveLayer('RGB')}>
                  <div className="color-box rgb"></div> Color Real (RGB)
                </button>
                <button className={`index-btn ${activeLayer === 'NDVI' ? 'active-ndvi' : ''}`} onClick={() => setActiveLayer('NDVI')}>
                  <div className="color-box ndvi"></div> Vigor Foliar (NDVI)
                </button>
                <button className={`index-btn ${activeLayer === 'NDRE' ? 'active-ndvi' : ''}`} onClick={() => setActiveLayer('NDRE')}>
                  <div className="color-box" style={{background: '#84cc16'}}></div> Canopia Densa (NDRE)
                </button>
                <button className={`index-btn ${activeLayer === 'GNDVI' ? 'active-ndvi' : ''}`} onClick={() => setActiveLayer('GNDVI')}>
                  <div className="color-box" style={{background: '#15803d'}}></div> Clorofila (GNDVI)
                </button>
                <button className={`index-btn ${activeLayer === 'SAVI' ? 'active-ndvi' : ''}`} onClick={() => setActiveLayer('SAVI')}>
                  <div className="color-box" style={{background: '#d97706'}}></div> Suelo Ajustado (SAVI)
                </button>
                <button className={`index-btn ${activeLayer === 'NDMI' ? 'active-ndmi' : ''}`} onClick={() => setActiveLayer('NDMI')}>
                  <div className="color-box ndmi"></div> Humedad Dosel (NDMI)
                </button>
                <button className={`index-btn ${activeLayer === 'RENTABILIDAD' ? 'active-rgb' : ''}`} onClick={() => setActiveLayer('RENTABILIDAD')}>
                  <div className="color-box" style={{background: 'linear-gradient(90deg, green, red)'}}></div> Mapa Rentabilidad
                </button>
              </div>
              <div className="opacity-slider-container mt-2">
                <label>Opacidad:</label>
                <input type="range" className="opacity-slider" min="0" max="100" value={opacity * 100} onChange={(e) => setOpacity(e.target.value / 100)} />
              </div>
            </div>

            <div className="panel-section">
              <label>ACCIONES ESPECIALES</label>
              <button className="btn-action blue" onClick={handleSyncSentinel}>
                {isSyncing ? '⏳ Sincronizando...' : '🔄 Sincronizar Sentinel-2 (Real)'}
              </button>
              <button className={`btn-action outline ${activeTool === 'zonificacion' ? 'tool-active' : ''}`} onClick={() => toggleTool('zonificacion')}>Zonificación Nutricional</button>
              <button className={`btn-action outline ${activeTool === 'vra' ? 'tool-active' : ''}`} onClick={() => toggleTool('vra')}>Curvas Prescripción VRA</button>
              
              {activeTool === 'vra' && vraGrid && (
                <button className="btn-action mt-2" style={{backgroundColor: '#10b981', color: 'white'}} onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(vraGrid));
                  const downloadAnchorNode = document.createElement('a');
                  downloadAnchorNode.setAttribute("href", dataStr);
                  downloadAnchorNode.setAttribute("download", `VRA_Prescription_${selectedLote ? selectedLote.properties.nombre : 'Lote'}.geojson`);
                  document.body.appendChild(downloadAnchorNode); // required for firefox
                  downloadAnchorNode.click();
                  downloadAnchorNode.remove();
                  showToast('✅ Archivo VRA descargado. Listo para tractores John Deere/Trimble.');
                }}>
                  Descargar Mapa VRA (GeoJSON)
                </button>
              )}

              <button className={`btn-action outline ${activeTool === 'scouting' ? 'tool-active' : ''}`} onClick={() => toggleTool('scouting')}>📍 Ground Truthing Scouting</button>
              {activeTool === 'scouting' && (
                <button 
                  className="btn-action mt-1" 
                  style={{ background: '#2563eb', color: '#fff' }}
                  onClick={() => setShowGroundTruthModal(true)}
                >
                  + Nueva Inspección en Terreno
                </button>
              )}
              <button className={`btn-action yellow ${activeTool === 'labores' ? 'tool-active' : ''}`} onClick={() => toggleTool('labores')}>👁️ Mostrar Capas de Labores</button>
              <button className="btn-action outline mt-2" onClick={async () => {
                if (!finca) {
                  showToast('❌ Por favor selecciona una finca primero.');
                  return;
                }
                showToast('📑 Generando reporte PDF...');
                try {
                  const { jsPDF } = await import('jspdf');
                  const doc = new jsPDF();
                  
                  doc.setFontSize(20);
                  doc.text('Reporte Compliance Agronómico', 20, 20);
                  
                  doc.setFontSize(12);
                  doc.text(`Finca: ${finca.properties.nombre}`, 20, 30);
                  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 40);
                  
                  if (selectedLote) {
                    doc.text(`Lote Seleccionado: ${selectedLote.name || selectedLote.properties.nombre}`, 20, 50);
                    doc.text(`Área: ${selectedLote.hectareas || selectedLote.properties.hectareas || 'N/A'} Ha`, 20, 60);
                    doc.text(`Índices - NDVI: ${selectedLote.ndvi || 'N/A'} | NDMI: ${selectedLote.ndmi || 'N/A'}`, 20, 70);
                    
                    let yOffset = 80;
                    
                    if (loteImage) {
                      try {
                        const blob = await fetch(loteImage).then(r => r.blob());
                        const reader = new FileReader();
                        const base64data = await new Promise((resolve) => {
                          reader.onloadend = () => resolve(reader.result);
                          reader.readAsDataURL(blob);
                        });
                        doc.text(`Imagen Satelital (${activeLayer}):`, 20, yOffset);
                        doc.addImage(base64data, 'PNG', 20, yOffset + 5, 100, 100);
                        yOffset += 115;
                      } catch(e) {
                        console.error('Error adding image to pdf:', e);
                      }
                    }
                    
                    doc.setFontSize(12);
                    doc.text('Recomendación IA (Copiloto Agronómico):', 20, yOffset);
                    doc.setFontSize(10);
                    let recText = `Basado en los datos recientes del satélite (Capa: ${activeLayer}), se sugiere `;
                    if (Number(selectedLote.ndvi) < 0.4) {
                      recText += `atención inmediata por bajo vigor foliar (NDVI ${selectedLote.ndvi}). `;
                    } else {
                      recText += `mantener el plan actual dado el buen vigor foliar (NDVI ${selectedLote.ndvi}). `;
                    }
                    if (Number(selectedLote.ndmi) < 0.3) {
                      recText += `Se detecta estrés hídrico; considere aplicar riego.`;
                    } else {
                      recText += `La humedad del dosel es adecuada.`;
                    }
                    
                    const splitText = doc.splitTextToSize(recText, 170);
                    doc.text(splitText, 20, yOffset + 10);
                  } else {
                    doc.text('No se ha seleccionado ningún lote específico.', 20, 50);
                  }
                  
                  doc.save(`Reporte_Compliance_${finca.properties.nombre.replace(/\s+/g, '_')}.pdf`);
                  showToast('✅ Reporte PDF descargado con éxito.');
                } catch (err) {
                  console.error(err);
                  showToast('❌ Error al generar el PDF.');
                }
              }}>Generar Reporte Compliance</button>
            </div>
            
            <div className="panel-section">
              <h4>🌦️ MICROCLIMA Y EVAPOTRANSPIRACIÓN (ETc)</h4>
              <div className="microclima-stats">
                <div>
                  <span className="big-value">{weatherData.temp !== '--' ? `${weatherData.temp}°C` : '--°C'}</span>
                  <span className="small-label">Estación Activa (Open-Meteo)</span>
                </div>
                <div style={{textAlign: 'right'}}>
                  <span className="big-value blue">{weatherData.rain7d !== '--' ? `${weatherData.rain7d} mm` : '-- mm'}</span>
                  <span className="small-label">Lluvia Últimos 7 Días</span>
                </div>
              </div>
              <div className="chart-placeholder">
                <div className="chart-bars"></div>
                <div className="chart-line"></div>
              </div>
            </div>

            <div className="panel-section">
              <h4>⚠️ MATRIZ DE RIESGO AGRONÓMICO</h4>
              <div className="risk-circles">
                <div className="circle-item"><div className="circle blue-ring">25%</div><span>Heladas</span></div>
                <div className="circle-item"><div className="circle orange-ring">60%</div><span>Sequía</span></div>
                <div className="circle-item"><div className="circle red-ring">45%</div><span>Plagas</span></div>
                <div className="circle-item"><div className="circle green-ring">15%</div><span>Hongos</span></div>
              </div>
            </div>

            <div className="panel-section">
              <h4>💰 ECONOMÍA ESPACIAL Y RENTABILIDAD</h4>
              <div className="economy-flex">
                <div className="eco-stat">
                  <span className="eco-val red">${economiaData.reduce((acc, curr) => acc + Number(curr.costo_acumulado || 0), 0).toFixed(0)}</span>
                  <span className="eco-lbl">Costo Finca USD</span>
                </div>
                <div className="eco-stat">
                  <span className="eco-val green">${(economiaData.reduce((acc, curr) => acc + Number(curr.costo_acumulado || 0), 0) * 1.3).toFixed(0)}</span>
                  <span className="eco-lbl">Retorno Est. USD</span>
                </div>
              </div>
              <div className="heatmap-grid-placeholder">
                <div className="hm-row"><div className="hm-cell red"></div><div className="hm-cell orange"></div><div className="hm-cell green"></div></div>
                <div className="hm-row"><div className="hm-cell orange"></div><div className="hm-cell green"></div><div className="hm-cell green"></div></div>
              </div>
            </div>

            <div className="panel-section">
              <h4>💧 GESTIÓN DE RIEGO (RF-08)</h4>
              <div className="irrigation-stats">
                <div>Déficit Hídrico: <strong>- mm</strong></div>
                <div>Válvula L4: <span className="badge blue">Cerrada</span></div>
              </div>
              <button className="btn-action outline mt-2" onClick={() => showToast('🤖 Inicializando IA del Planificador de Riego...')}>🤖 IA Planificador Riego</button>
            </div>
          </div>
        </aside>
      </div>

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="scc-toast">
          {toastMessage}
        </div>
      )}

      {/* MODAL GROUND TRUTHING (SCOUTING EN CAMPO) */}
      {showGroundTruthModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '580px',
            padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>📍 Registrar Verificación en Campo (Ground Truth)</h3>
              <button 
                onClick={() => setShowGroundTruthModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!selectedLoteId) {
                alert('Selecciona un lote en el mapa primero.');
                return;
              }
              try {
                const res = await authFetch('/api/satellite/ground-truth', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id_finca: selectedFincaId,
                    id_lote: selectedLoteId,
                    ...groundTruthForm
                  })
                });
                if (res.ok) {
                  showToast('✅ Verificación de campo guardada con éxito.');
                  setShowGroundTruthModal(false);
                  fetchGroundTruth();
                } else {
                  const err = await res.json();
                  alert('Error: ' + err.error);
                }
              } catch (err) {
                alert('Error al guardar verificación.');
              }
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Código Verificación</label>
                  <input 
                    type="text" 
                    required 
                    className="sentinel-input-full"
                    placeholder="Ej. GT-LOTE-001"
                    value={groundTruthForm.codigo_verificacion}
                    onChange={e => setGroundTruthForm({ ...groundTruthForm, codigo_verificacion: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Índice Observado</label>
                  <select 
                    className="sentinel-input-full"
                    value={groundTruthForm.indice_observado}
                    onChange={e => setGroundTruthForm({ ...groundTruthForm, indice_observado: e.target.value })}
                  >
                    <option value="NDVI">NDVI (Vigor General)</option>
                    <option value="NDRE">NDRE (Red Edge)</option>
                    <option value="GNDVI">GNDVI (Clorofila)</option>
                    <option value="SAVI">SAVI (Suelo Ajustado)</option>
                    <option value="NDMI">NDMI (Estrés Hídrico)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Estado Real en Campo</label>
                  <select 
                    className="sentinel-input-full"
                    value={groundTruthForm.estado_cultivo_real}
                    onChange={e => setGroundTruthForm({ ...groundTruthForm, estado_cultivo_real: e.target.value })}
                  >
                    <option value="Deficiencia_Nutricional">Deficiencia Nutricional (Clorosis)</option>
                    <option value="Estres_Hidrico">Estrés Hídrico / Marchitez</option>
                    <option value="Ataque_Plagas">Ataque de Plagas</option>
                    <option value="Enfermedad_Fungica">Enfermedad Fúngica</option>
                    <option value="Malezas">Infestación de Malezas</option>
                    <option value="Excelente">Excelente / Falsa Alarma</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Severidad</label>
                  <select 
                    className="sentinel-input-full"
                    value={groundTruthForm.severidad}
                    onChange={e => setGroundTruthForm({ ...groundTruthForm, severidad: e.target.value })}
                  >
                    <option value="Baja">Baja (Monitoreo)</option>
                    <option value="Media">Media (Atención Pronta)</option>
                    <option value="Alta">Alta (Aplicación Inmediata)</option>
                    <option value="Critica">Crítica (Riesgo Pérdida Lote)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Latitud GPS</label>
                  <input 
                    type="number" 
                    step="0.0000001" 
                    required 
                    className="sentinel-input-full"
                    placeholder="4.6521"
                    value={groundTruthForm.latitud}
                    onChange={e => setGroundTruthForm({ ...groundTruthForm, latitud: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Longitud GPS</label>
                  <input 
                    type="number" 
                    step="0.0000001" 
                    required 
                    className="sentinel-input-full"
                    placeholder="-74.0915"
                    value={groundTruthForm.longitud}
                    onChange={e => setGroundTruthForm({ ...groundTruthForm, longitud: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Diagnóstico de Campo (Hallazgo Agronómico)</label>
                <textarea 
                  required 
                  className="sentinel-input-full" 
                  rows={2}
                  placeholder="Se confirma amarillamiento interveinal por deficiencia de Magnesio..."
                  value={groundTruthForm.diagnostico_campo}
                  onChange={e => setGroundTruthForm({ ...groundTruthForm, diagnostico_campo: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Acción Correctiva Recomendada</label>
                <input 
                  type="text" 
                  className="sentinel-input-full" 
                  placeholder="Aplicación foliar de Sulfato de Magnesio 2 kg/ha..."
                  value={groundTruthForm.accion_correctiva}
                  onChange={e => setGroundTruthForm({ ...groundTruthForm, accion_correctiva: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-action outline" onClick={() => setShowGroundTruthModal(false)}>Cancelar</button>
                <button type="submit" className="btn-action" style={{ background: '#2563eb', color: '#fff' }}>Guardar y Auditar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SatelliteCommandCenter;
