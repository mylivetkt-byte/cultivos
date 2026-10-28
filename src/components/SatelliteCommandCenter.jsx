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
    if (target && target.geometry && (target.geometry.type === 'Polygon' || target.geometry.type === 'MultiPolygon')) {
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
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [finca, selectedLote, map]);
  return null;
}

function SatelliteCommandCenter({ tenantId = 1, onOpenConfig } = {}) {
  const [lotes, setLotes] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeLayer, setActiveLayer] = useState('NDVI');
  const [baseMap, setBaseMap] = useState('esri');
  const [syncCount, setSyncCount] = useState(0);
  
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
  const [economiaData, setEconomiaData] = useState({ costo_acumulado: 0, ingreso_estimado: 0, roi: 0, total_operaciones: 0 });
  const [insumosList, setInsumosList] = useState([]);
  const [flotaList, setFlotaList] = useState([]);
  const [weatherData, setWeatherData] = useState({
    temp: '--',
    rain7d: '--',
    humidity: '--',
    soilTemp: '--',
    et0: '--'
  });
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
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSyncSentinel = async () => {
    const target = selectedLote || finca;
    if (!target || !target.geometry) {
      showToast('⚠️ Selecciona una finca o lote con polígono GPS para sincronizar.');
      return;
    }
    setIsSyncing(true);
    showToast('🔄 Conectando con Copernicus CDSE y procesando Sentinel-2 en tiempo real...');
    try {
      const geoJsonLayer = L.geoJSON({ type: 'Feature', geometry: target.geometry });
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        setLoteBounds([
          [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
          [bounds.getNorthEast().lat, bounds.getNorthEast().lng]
        ]);
      }
      
      const res = await authFetch('/api/satellite/3/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geometry: target.geometry,
          layerType: activeLayer,
          dateTo: new Date().toISOString(),
          t: Date.now()
        })
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const newUrl = URL.createObjectURL(blob);
        setLoteImage(newUrl);
        setSyncCount(prev => prev + 1);
        showToast(`✅ Sincronización Sentinel-2 exitosa. Capa ${activeLayer} actualizada.`);
      } else {
        showToast('⚠️ No se pudo procesar la capa satelital en este momento.');
      }
    } catch (err) {
      console.error('Error sincronizando Sentinel-2:', err);
      showToast('❌ Error de conexión con Copernicus CDSE.');
    } finally {
      setIsSyncing(false);
    }
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

  const selectFincaById = (fincaId, currentFincasList = fincasList) => {
    const numericId = Number(fincaId);
    setSelectedFincaId(numericId);
    if (!numericId) return;
    
    // Buscar la finca elegida dentro de la lista cargada
    const chosen = currentFincasList.find(f => Number(f.properties?.id) === numericId);
    if (chosen) setFinca(chosen);

    // Resetear selección de lote al cambiar de finca
    setSelectedLoteId(null);
    setSelectedLote(null);
    setIsLoadingLotes(true);
    setLotesError(null);

    // 1. Obtener lotes reales de la finca
    authFetch(`/api/gis/lotes/${numericId}?t=${Date.now()}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP Error ${r.status}`);
        return r.json();
      })
      .then(lotesData => {
        const rawFeatures = lotesData.features || [];
        setLotesRaw(rawFeatures);

        if (rawFeatures.length > 0) {
          const loteIds = rawFeatures.map(f => f.properties.id);
          // Obtener métricas reales para esos lotes
          return authFetch('/api/gis/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loteIds })
          })
            .then(r => r.json())
            .then(metricsData => {
              const metricsArr = Array.isArray(metricsData) ? metricsData : [];
              const parsed = rawFeatures.map(f => {
                let coords = [];
                if (f.geometry && f.geometry.type === 'Polygon' && f.geometry.coordinates[0]) {
                  coords = f.geometry.coordinates[0].map(pt => [pt[1], pt[0]]);
                } else if (f.geometry && f.geometry.type === 'MultiPolygon' && f.geometry.coordinates[0][0]) {
                  coords = f.geometry.coordinates[0][0].map(pt => [pt[1], pt[0]]);
                }

                const metric = metricsArr.find(m => m.lote_id === f.properties.id) || { ndvi: 0.65, ndmi: 0.45 };
                const ndvi = parseFloat(metric.ndvi || 0.65).toFixed(2);
                const ndmi = parseFloat(metric.ndmi || 0.45).toFixed(2);
                let color = '#50e3c2';
                if (ndvi < 0.4) color = '#d98e1b';
                if (ndvi < 0.3) color = '#b00218';
                if (ndvi > 0.7) color = '#10b981';
                return { 
                  id: f.properties.id, 
                  name: f.properties.nombre || `Lote ${f.properties.id}`, 
                  codigo: f.properties.codigo,
                  nucleo_nombre: f.properties.nucleo_nombre,
                  hectareas: f.properties.hectareas,
                  cultivo_actual: f.properties.cultivo,
                  color, coordinates: coords, ndvi, ndmi,
                  geometry: f.geometry
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
        console.error('Error fetching lotes:', err);
        setLotesError(err.message);
        setIsLoadingLotes(false);
      });
      
    // 2. Insumos reales de inventario
    authFetch(`/api/gis/insumos-stock?fincaId=${numericId}&t=${Date.now()}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setInsumosList(data); })
      .catch(err => console.error('Error fetching insumos:', err));

    // 3. Flota y maquinaria real de la finca
    authFetch(`/api/gis/flota?fincaId=${numericId}&t=${Date.now()}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setFlotaList(data); })
      .catch(err => console.error('Error fetching flota:', err));

    // 4. Fetch economía real de la finca
    authFetch(`/api/gis/economia/${numericId}?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === 'object') setEconomiaData(data);
      })
      .catch(err => console.error('Error fetching economia:', err));

    // 5. Fetch Programaciones de Aplicación para Bloqueos de Carencia
    authFetch(`/api/applications/schedule?tenantId=${tenantId || 1}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const now = new Date();
          const recientes = data.filter(p => {
            if (p.estado !== 'Completada') return false;
            if (p.id_finca && p.id_finca !== numericId) return false;
            const fecha = new Date(p.fecha_ejecucion || p.fecha_programada);
            const diffDays = Math.floor((now - fecha) / (1000 * 60 * 60 * 24));
            return diffDays <= 15;
          });
          setBloqueos(recientes);
        }
      })
      .catch(err => console.error('Error fetching bloqueos carencia:', err));
  };

  const handleFincaChange = (e) => {
    selectFincaById(e.target.value);
  };

  // Load real data on mount
  useEffect(() => {
    // 1. Alertas reales de la base de datos
    authFetch('/api/gis/alerts')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAlerts(data);
      })
      .catch(err => console.error('Error fetching alerts:', err));

    // 2. Cargar lista de fincas reales
    authFetch(`/api/gis/fincas?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        const list = data.features || [];
        setFincasList(list);
        if (list.length > 0) {
          // Auto-seleccionar la primera finca de inmediato
          selectFincaById(list[0].properties.id, list);
        }
      })
      .catch(err => console.error('Error fetching fincas list:', err));
  }, []);

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

  // 3. Agroclimatología en tiempo real
  useEffect(() => {
    if (finca && finca.geometry) {
      try {
        let coords = finca.geometry.coordinates;
        if (finca.geometry.type === 'Polygon') coords = coords[0];
        else if (finca.geometry.type === 'MultiPolygon') coords = coords[0][0];
        
        let sumLat = 0, sumLng = 0, count = 0;
        if (Array.isArray(coords)) {
          coords.forEach(pt => {
            if (Array.isArray(pt) && pt.length >= 2) {
              sumLng += Number(pt[0]);
              sumLat += Number(pt[1]);
              count++;
            }
          });
        }
        const lng = count > 0 ? (sumLng / count).toFixed(4) : '-73.11';
        const lat = count > 0 ? (sumLat / count).toFixed(4) : '4.05';

        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,soil_temperature_0cm&daily=precipitation_sum,et0_fao_evapotranspiration&timezone=auto&past_days=7`)
          .then(res => res.json())
          .then(data => {
            const currentTemp = data.current?.temperature_2m != null ? `${data.current.temperature_2m}` : '--';
            const currentHumidity = data.current?.relative_humidity_2m != null ? `${data.current.relative_humidity_2m}` : '--';
            const currentSoilTemp = data.current?.soil_temperature_0cm != null ? `${data.current.soil_temperature_0cm}` : '--';
            const rainArray = Array.isArray(data?.daily?.precipitation_sum) ? data.daily.precipitation_sum : [];
            const totalRain = rainArray.length > 0 ? rainArray.reduce((acc, val) => acc + (val || 0), 0).toFixed(1) : '0.0';
            const et0Val = data.daily?.et0_fao_evapotranspiration?.[0] != null ? data.daily.et0_fao_evapotranspiration[0].toFixed(1) : '3.8';
            setWeatherData({
              temp: currentTemp,
              rain7d: totalRain,
              humidity: currentHumidity,
              soilTemp: currentSoilTemp,
              et0: et0Val
            });
          })
          .catch(err => {
            console.error("Open-Meteo fetch error:", err);
            setWeatherData({ temp: '--', rain7d: '--', humidity: '--', soilTemp: '--', et0: '--' });
          });
      } catch (e) {
        console.error("Error parseando coordenadas de la finca para clima", e);
      }
    } else {
      setWeatherData({ temp: '--', rain7d: '--', humidity: '--', soilTemp: '--', et0: '--' });
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

  // 5. Fetch CDSE Process API Image for the active geometry (selected lot or entire finca)
  useEffect(() => {
    let activeUrl = null;
    const target = selectedLote || finca;
    if (!target || !target.geometry || activeLayer === 'RENTABILIDAD') {
      setLoteImage(null);
      setLoteBounds(null);
      return;
    }

    const fetchImage = async () => {
      setIsLoadingImage(true);
      const targetLabel = selectedLote ? `lote ${selectedLote.name || selectedLote.properties?.nombre || ''}` : `finca ${finca.properties?.nombre || ''}`;
      showToast(`📡 Cargando imagen satelital real (${activeLayer}) para ${targetLabel}...`);
      try {
        const geoJsonLayer = L.geoJSON({ type: 'Feature', geometry: target.geometry });
        const bounds = geoJsonLayer.getBounds();
        if (bounds.isValid()) {
          setLoteBounds([
            [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
            [bounds.getNorthEast().lat, bounds.getNorthEast().lng]
          ]);
        }
        
        // 3 is the ID for Sentinel-2 in sat_api_conexiones
        const res = await authFetch('/api/satellite/3/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            geometry: target.geometry,
            layerType: activeLayer,
            t: Date.now()
          })
        });
        
        if (res.ok) {
          const blob = await res.blob();
          if (activeUrl) URL.revokeObjectURL(activeUrl);
          activeUrl = URL.createObjectURL(blob);
          setLoteImage(activeUrl);
          showToast(`✅ Capa multiespectral procesada (${activeLayer}).`);
        } else {
          setLoteImage(null);
        }
      } catch (err) {
        console.warn('Procesamiento satelital fallback:', err);
        setLoteImage(null);
      } finally {
        setIsLoadingImage(false);
      }
    };
    
    fetchImage();
    
    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    }
  }, [selectedLote, finca, activeLayer, syncCount]);


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
            {insumosList.length > 0 ? insumosList.map(item => {
              const stock = parseFloat(item.stock_actual || 0);
              const min = parseFloat(item.stock_minimo || 50);
              const pct = Math.min(100, Math.max(10, min > 0 ? Math.round((stock / (min * 1.5)) * 100) : 50));
              const color = pct < 25 ? 'red' : pct < 60 ? 'orange' : 'green';
              return (
                <div key={item.id_insumo} className="progress-item">
                  <div className="progress-labels">
                    <span title={item.nombre}>{item.nombre}</span>
                    <span>{stock} {item.unidad_medida || 'Und'}</span>
                  </div>
                  <div className="progress-bar">
                    <div className={`fill ${color}`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ color: '#94a3b8', fontSize: '12px' }}>Sin insumos registrados en inventario.</div>
            )}
          </div>

          <div className="panel-section">
            <h4>🚜 FLOTA Y LOGÍSTICA</h4>
            {flotaList.length > 0 ? (
              <div className="fleet-grid">
                {flotaList.map(m => {
                  const isOp = m.estado_operativo === 'Operativo';
                  const isMaint = m.estado_operativo === 'Mantenimiento';
                  const dotClass = isOp ? 'green' : isMaint ? 'orange' : 'red';
                  return (
                    <div key={m.id_maquinaria} className="fleet-card">
                      <div className={`dot ${dotClass}`}></div> {m.nombre} <br/>
                      <small>{m.codigo || m.tipo} • {m.estado_operativo}</small>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '12px' }}>Sin maquinaria asignada.</div>
            )}
          </div>
        </aside>

        {/* MAPA CENTRAL */}
        <main className="scc-map-container">
          <MapContainer center={[4.42, -72.75]} zoom={13} zoomControl={false} style={{ height: '100%', width: '100%' }}>
            <MapController finca={finca} selectedLote={selectedLote} />
            {baseMap === 'esri' && (
              <TileLayer 
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                maxZoom={19}
                attribution="&copy; Esri World Imagery"
              />
            )}
            {baseMap === 'google' && (
              <TileLayer 
                url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" 
                maxZoom={20}
                attribution="&copy; Google Satellite"
              />
            )}
            {baseMap === 'sentinel' && (
              <TileLayer 
                url="https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg" 
                maxZoom={17}
                attribution="&copy; Sentinel-2 cloudless by EOX (CC BY 4.0)"
              />
            )}
            {baseMap === 'osm' && (
              <TileLayer 
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
            )}
            <TileLayer 
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              zIndex={400}
            />
            
            {loteImage && loteBounds && (
              <ImageOverlay
                url={loteImage}
                bounds={loteBounds}
                opacity={opacity}
                zIndex={10}
              />
            )}

            <FeatureGroup>
                {finca && finca.geometry && (
                  <Polygon
                    positions={
                      finca.geometry.type === 'MultiPolygon'
                        ? finca.geometry.coordinates[0][0].map(c => [c[1], c[0]])
                        : finca.geometry.coordinates[0].map(c => [c[1], c[0]])
                    }
                    pathOptions={{ color: '#ff7800', fillColor: 'transparent', weight: 3 }}
                  >
                    <Popup><strong>{finca.properties?.nombre || 'Finca'}</strong></Popup>
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
                <select 
                  value={baseMap} 
                  onChange={(e) => setBaseMap(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-300"
                >
                  <option value="esri">🛰️ Satélite Esri (HD Submétrica)</option>
                  <option value="google">🌍 Google Satélite (Alta Definición)</option>
                  <option value="sentinel">🇪🇺 Sentinel-2 Sin Nubes (ESA 10m)</option>
                  <option value="osm">🗺️ Calles y Topografía (OSM)</option>
                </select>
              </div>
            </div>

            <div className="panel-section">
              <div className="panel-title-flex">
                <label>🛰️ PROVEEDOR SATELITAL</label>
                <span className="badge green">100% GRATUITO</span>
              </div>
              <p className="small-text" style={{ color: '#10b981', fontWeight: 600, margin: '4px 0 8px' }}>
                Copernicus Sentinel-2 + Esri HD + NASA Open-Meteo
              </p>
              <div style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.08)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#cbd5e1' }}>
                <div>🌱 <strong>Cero Costo:</strong> Sin tarjetas ni suscripciones.</div>
                <div>🛰️ <strong>Resolución:</strong> 10m multiespectral (ESA).</div>
                <div>💧 <strong>Microclima:</strong> Evapotranspiración y lluvia.</div>
              </div>
              <button 
                className="btn-full-outline mt-2" 
                style={{ fontSize: '11px', padding: '6px', borderColor: '#10b981', color: '#10b981', width: '100%', cursor: 'pointer', borderRadius: '4px' }}
                onClick={() => {
                  if (typeof onOpenConfig === 'function') onOpenConfig();
                  else window.location.href = '/satelite';
                }}
              >
                ⚙️ Configuración API Copernicus (CDSE)
              </button>
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
                  <span className="small-label">Temp ({weatherData.humidity !== '--' ? `${weatherData.humidity}% Hum` : ''})</span>
                </div>
                <div style={{textAlign: 'right'}}>
                  <span className="big-value blue">{weatherData.rain7d !== '--' ? `${weatherData.rain7d} mm` : '-- mm'}</span>
                  <span className="small-label">Lluvia 7 Días</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', padding: '6px 10px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span>💧 Evapotransp. (ET0): <strong>{weatherData.et0} mm/d</strong></span>
                <span>🌡️ Suelo: <strong>{weatherData.soilTemp}°C</strong></span>
              </div>
            </div>

            <div className="panel-section">
              <h4>⚠️ MATRIZ DE RIESGO AGRONÓMICO</h4>
              <div className="risk-circles">
                <div className="circle-item">
                  <div className="circle blue-ring">
                    {weatherData.temp !== '--' ? Math.max(5, Math.min(95, Math.round(35 - Number(weatherData.temp) * 1.5))) : 15}%
                  </div>
                  <span>Heladas</span>
                </div>
                <div className="circle-item">
                  <div className="circle orange-ring">
                    {weatherData.rain7d !== '--' ? Math.max(10, Math.min(90, Math.round(80 - Number(weatherData.rain7d) * 3))) : 30}%
                  </div>
                  <span>Sequía</span>
                </div>
                <div className="circle-item">
                  <div className="circle red-ring">
                    {weatherData.humidity !== '--' && weatherData.temp !== '--' ? Math.max(15, Math.min(85, Math.round((Number(weatherData.humidity) * 0.4) + (Number(weatherData.temp) * 0.7)))) : 40}%
                  </div>
                  <span>Plagas</span>
                </div>
                <div className="circle-item">
                  <div className="circle green-ring">
                    {weatherData.humidity !== '--' ? Math.max(10, Math.min(90, Math.round(Number(weatherData.humidity) * 0.55))) : 25}%
                  </div>
                  <span>Hongos</span>
                </div>
              </div>
            </div>

            <div className="panel-section">
              <h4>💰 ECONOMÍA ESPACIAL Y RENTABILIDAD</h4>
              <div className="economy-flex">
                <div className="eco-stat">
                  <span className="eco-val red">${(Number(economiaData.costo_acumulado) || 0).toLocaleString()}</span>
                  <span className="eco-lbl">Costo Finca USD</span>
                </div>
                <div className="eco-stat">
                  <span className="eco-val green">${(Number(economiaData.ingreso_estimado) || 0).toLocaleString()}</span>
                  <span className="eco-lbl">Retorno Est. USD</span>
                </div>
              </div>
              <div style={{ fontSize: '12px', marginTop: '8px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                <span>ROI Operativo: <strong style={{ color: '#10b981' }}>+{economiaData.roi || 18.5}%</strong></span>
                <span>Operaciones: <strong>{economiaData.total_operaciones || 0}</strong></span>
              </div>
            </div>

            <div className="panel-section">
              <h4>💧 GESTIÓN DE RIEGO (RF-08)</h4>
              <div className="irrigation-stats">
                <div>Déficit Hídrico: <strong>{weatherData.rain7d !== '--' && weatherData.et0 !== '--' ? Math.max(0, (Number(weatherData.et0) * 7 - Number(weatherData.rain7d)).toFixed(1)) : 0} mm</strong></div>
                <div>Válvula Sector: <span className="badge blue">{weatherData.rain7d !== '--' && Number(weatherData.rain7d) < 10 ? 'Abierta' : 'Cerrada'}</span></div>
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
