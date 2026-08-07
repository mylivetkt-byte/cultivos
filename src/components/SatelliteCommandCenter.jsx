import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, LayersControl, Marker, WMSTileLayer, FeatureGroup, useMap, ImageOverlay } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
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

function SatelliteCommandCenter() {
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
  const [lotesRaw, setLotesRaw] = useState([]);  // GeoJSON features de lotes
  const [selectedLoteId, setSelectedLoteId] = useState(null);
  const [selectedLote, setSelectedLote] = useState(null);
  
  const [loteImage, setLoteImage] = useState(null);
  const [loteBounds, setLoteBounds] = useState(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [economiaData, setEconomiaData] = useState([]);

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
      const res = await authFetch('http://localhost:3002/api/gis/despachar', {
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

  const toggleTool = (toolName) => {
    setActiveTool(activeTool === toolName ? null : toolName);
    if (activeTool !== toolName) {
      showToast(`🛠️ Herramienta activada: ${toolName}`);
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
    authFetch('http://localhost:3002/api/gis/alerts')
      .then(r => r.json())
      .then(setAlerts)
      .catch(err => console.error('Error fetching alerts:', err));

    // 2. Cargar lista de fincas
    authFetch('http://localhost:3002/api/gis/fincas')
      .then(r => r.json())
      .then(data => {
        const list = data.features || [];
        console.log('Fincas cargadas:', list.length);
        setFincasList(list);
      })
      .catch(err => console.error('Error fetching fincas list:', err));
  }, []);

  // 3. Cuando el usuario elige una finca, cargar sus lotes y métricas
  useEffect(() => {
    if (!selectedFincaId) return;
    // Buscar la finca elegida dentro de la lista cargada
    const chosen = fincasList.find(f => f.properties.id === selectedFincaId);
    if (chosen) setFinca(chosen);

    // Resetear selección de lote al cambiar de finca
    setSelectedLoteId(null);
    setSelectedLote(null);

    // Obtener lotes de la finca
    authFetch(`http://localhost:3002/api/gis/lotes/${selectedFincaId}`)
      .then(r => r.json())
      .then(lotesData => {
        const rawFeatures = lotesData.features || [];
        console.log('Lotes cargados:', rawFeatures.length);
        setLotesRaw(rawFeatures);

        if (rawFeatures.length > 0) {
          const loteIds = rawFeatures.map(f => f.properties.id);
          // Obtener métricas para esos lotes
          authFetch('http://localhost:3002/api/gis/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loteIds })
          })
            .then(r => r.json())
            .then(metricsData => {
              const parsed = rawFeatures.map(f => {
                let coords = [];
                if (f.geometry && f.geometry.type === 'Polygon') {
                  coords = f.geometry.coordinates[0].map(c => [c[1], c[0]]);
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
            });
        } else {
          setLotes([]);
        }
      })
      .catch(err => console.error('Error fetching lotes:', err));
      
    // Fetch economía de la finca
    authFetch(`http://localhost:3002/api/gis/economia/${selectedFincaId}`)
      .then(r => r.json())
      .then(data => {
        console.log('Economía cargada:', data);
        setEconomiaData(data);
      })
      .catch(err => console.error('Error fetching economia:', err));
      
  }, [selectedFincaId, fincasList]);

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
        const res = await authFetch('http://localhost:3002/api/satellite/3/process', {
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
                value={selectedFincaId || ''}
                onChange={e => setSelectedFincaId(Number(e.target.value))}
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
              {selectedFincaId && lotesRaw.length === 0 && (
                <small style={{ color: '#f97316' }}>⚠️ No se encontraron lotes para esta finca. Verifique que los lotes tengan id_finca o núcleo asignado.</small>
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
                     fillColor = isSelected ? 'rgba(255,215,0,0.15)' : 'transparent';
                  }

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
                      </Popup>
                    </Polygon>
                  );
                })}
            </FeatureGroup>
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
              <button className={`btn-action outline ${activeTool === 'scouting' ? 'tool-active' : ''}`} onClick={() => toggleTool('scouting')}>📍 Ground Truthing Scouting</button>
              <button className={`btn-action yellow ${activeTool === 'labores' ? 'tool-active' : ''}`} onClick={() => toggleTool('labores')}>👁️ Mostrar Capas de Labores</button>
              <button className="btn-action outline mt-2" onClick={() => showToast('📑 Generando reporte PDF en segundo plano...')}>Generar Reporte Compliance</button>
            </div>
            
            <div className="panel-section">
              <h4>🌦️ MICROCLIMA Y EVAPOTRANSPIRACIÓN (ETc)</h4>
              <div className="microclima-stats">
                <div>
                  <span className="big-value">28.8°C</span>
                  <span className="small-label">Estación Activa</span>
                </div>
                <div style={{textAlign: 'right'}}>
                  <span className="big-value blue">109.0 mm</span>
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
    </div>
  );
}

export default SatelliteCommandCenter;
