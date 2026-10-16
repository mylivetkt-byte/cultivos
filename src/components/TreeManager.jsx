import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import Select from 'react-select';
import { QRCodeSVG } from 'qrcode.react';
import 'leaflet/dist/leaflet.css';
import { 
  fetchTrees, fetchTreeDetail, createTree, createVisit, applyRecipe, 
  fetchTableData 
} from '../utils/api';

// Helper to parse POINT WKT
function parseWKTPoint(wkt) {
  if (!wkt || typeof wkt !== 'string') return null;
  try {
    const match = wkt.match(/point\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) {
      const lng = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      return [lat, lng];
    }
  } catch (e) {
    console.error('Error parsing POINT WKT:', e);
  }
  return null;
}

// Helper to parse POLYGON WKT
function parseWKTPolygon(wkt) {
  if (!wkt || typeof wkt !== 'string') return [];
  try {
    const coordsStr = wkt
      .replace(/polygon\s*\(\s*\(\s*/i, '')
      .replace(/\s*\)\s*\)\s*$/, '')
      .trim();
    if (!coordsStr) return [];
    return coordsStr.split(',').map(p => {
      const parts = p.trim().split(/\s+/);
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      return [lat, lng];
    });
  } catch (e) {
    console.error('Error parsing POLYGON WKT:', e);
    return [];
  }
}

// Helper to get polygon center
function getPolygonCentroid(coords) {
  if (!coords || coords.length === 0) return [10.4625, -73.2525];
  let lat = 0, lng = 0;
  for (const c of coords) {
    lat += c[0];
    lng += c[1];
  }
  return [lat / coords.length, lng / coords.length];
}

function SaludArboles({ tenantId, fincaId, nucleoId }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  
  // Layer Groups
  const polygonGroupRef = useRef(null);
  const treesGroupRef = useRef(null);
  const tempMarkerRef = useRef(null);

  // Data states
  const [lotes, setLotes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [insumos, setInsumos] = useState([]);
  
  const [selectedLoteId, setSelectedLoteId] = useState('');
  const [trees, setTrees] = useState([]);
  const [selectedTree, setSelectedTree] = useState(null);
  const [treeDetail, setTreeDetail] = useState(null);
  
  // UIs and Modes
  const [loading, setLoading] = useState(true);
  const [plantingMode, setPlantingMode] = useState(false);
  const [plantingCoords, setPlantingCoords] = useState(null);
  const [showPlantingForm, setShowPlantingForm] = useState(false);
  
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [hasRecipe, setHasRecipe] = useState(false);

  // Planting Form State
  const [newTreeCode, setNewTreeCode] = useState('');
  const [newTreeVariety, setNewTreeVariety] = useState('Palma de Aceite Híbrida OXG');
  const [newTreeYear, setNewTreeYear] = useState(new Date().getFullYear());
  const [newTreeHealth, setNewTreeHealth] = useState('Sano');

  // Inspection/Prescription Form State
  const [insEmpId, setInsEmpId] = useState('');
  const [insHealth, setInsHealth] = useState('Sano');
  const [insDiagnosis, setInsDiagnosis] = useState('');
  const [insObservations, setInsObservations] = useState('');
  
  const [recEnfermedad, setRecEnfermedad] = useState('');
  const [recGravedad, setRecGravedad] = useState('Media');
  const [recInsumoId, setRecInsumoId] = useState('');
  const [recDosis, setRecDosis] = useState('');
  const [recFechaSugerida, setRecFechaSugerida] = useState('');
  const [recTratamiento, setRecTratamiento] = useState('');

  // Fetch initial lookups: Lotes, Employees (technicians), Insumos (inputs)
  useEffect(() => {
    async function loadLookups() {
      try {
        const lotesData = await fetchTableData('lotes', { tenantId, fincaId, nucleoId, pageSize: 200 });
        const empsData = await fetchTableData('rrhh_empleados', { tenantId, pageSize: 200 });
        const insData = await fetchTableData('insumos', { tenantId, pageSize: 200 });
        
        setLotes(lotesData.data || []);
        setEmployees(empsData.data || []);
        setInsumos(insData.data || []);
        
        // Auto select first lote if available
        if (lotesData.data && lotesData.data.length > 0) {
          setSelectedLoteId(lotesData.data[0].id_lote);
        }
      } catch (err) {
        console.error('Error loading lookups for TreeManager:', err);
      }
    }
    loadLookups();
  }, [tenantId, fincaId, nucleoId]);

  // Load Trees based on selected Lote
  const loadTreesList = useCallback(async () => {
    if (!selectedLoteId) return;
    setLoading(true);
    try {
      const data = await fetchTrees({ tenantId, loteId: selectedLoteId });
      setTrees(data);
    } catch (err) {
      console.error('Error fetching trees:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, selectedLoteId]);

  useEffect(() => {
    loadTreesList();
    // Deselect selected tree when lote changes
    setSelectedTree(null);
    setTreeDetail(null);
    setShowInspectionForm(false);
  }, [selectedLoteId, loadTreesList]);

  // Fetch individual tree detail and fitosanitario record cards
  const loadTreeDetail = async (treeId) => {
    try {
      const detail = await fetchTreeDetail(treeId);
      setTreeDetail(detail);
      // Autofill some fields in forms
      setInsHealth(detail.tree.estado_salud);
      if (employees.length > 0) setInsEmpId(employees[0].id_empleado);
      if (insumos.length > 0) setRecInsumoId(insumos[0].id_insumo);
    } catch (err) {
      console.error('Error fetching tree detail:', err);
    }
  };

  // Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const center = [10.4625, -73.2525];
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true
    }).setView(center, 16);
    mapRef.current = map;

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Layer Satelite
    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Maps',
      maxNativeZoom: 20,
      maxZoom: 22
    }).addTo(map);

    polygonGroupRef.current = L.layerGroup().addTo(map);
    treesGroupRef.current = L.layerGroup().addTo(map);

    // Click Map Handler (For Planting Mode)
    map.on('click', (e) => {
      // Check if planting mode is enabled
      // We read from ref or state. Since this is hook, we use functional check or react effect.
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync Click handler for planting mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onMapClick = (e) => {
      if (!plantingMode) return;
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setPlantingCoords({ lat, lng });
      setNewTreeCode(`PALM-L${selectedLoteId}-${Date.now().toString().slice(-4)}`);
      setShowPlantingForm(true);

      // Draw temp indicator marker
      if (tempMarkerRef.current) {
        tempMarkerRef.current.setLatLng([lat, lng]);
      } else {
        const seedIcon = L.divIcon({
          html: `<div style="font-size: 24px; animation: bounce 1s infinite;">🌱</div>`,
          className: 'temp-seed-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        tempMarkerRef.current = L.marker([lat, lng], { icon: seedIcon }).addTo(map);
      }
    };

    map.on('click', onMapClick);
    return () => {
      map.off('click', onMapClick);
    };
  }, [plantingMode, selectedLoteId]);

  // Update map visual features (Polygon and tree pins)
  useEffect(() => {
    const map = mapRef.current;
    const polygonGroup = polygonGroupRef.current;
    const treesGroup = treesGroupRef.current;

    if (!map || !polygonGroup || !treesGroup) return;

    // Clear old elements
    polygonGroup.clearLayers();
    treesGroup.clearLayers();

    // 1. Draw Selected Lote Polygon boundary
    const activeLote = lotes.find(l => l.id_lote === parseInt(selectedLoteId));
    if (activeLote && activeLote.poligono_gps) {
      const polyCoords = parseWKTPolygon(activeLote.poligono_gps);
      if (polyCoords.length > 0) {
        L.polygon(polyCoords, {
          color: '#00F0FF',
          fillColor: '#00F0FF',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '4, 6'
        }).addTo(polygonGroup);

        // Center map on lote
        const center = getPolygonCentroid(polyCoords);
        map.setView(center, 17);
      }
    }

    // 2. Draw Trees
    trees.forEach(t => {
      if (t.lat && t.lng) {
        // Color mapping by Health
        let markerColor = '#00E676'; // Sano: Green
        if (t.estado_salud === 'Enfermo') markerColor = '#FF1744'; // Red
        if (t.estado_salud === 'Tratamiento') markerColor = '#FF9100'; // Orange
        if (t.estado_salud === 'Muerto') markerColor = '#212121'; // Black/Grey

        const isSelected = selectedTree && selectedTree.id_arbol === t.id_arbol;

        const pinIcon = L.divIcon({
          className: 'tree-pin-marker',
          html: `<div style="
            width: ${isSelected ? '22px' : '15px'};
            height: ${isSelected ? '22px' : '15px'};
            background: ${markerColor};
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 ${isSelected ? '12px' : '6px'} ${markerColor};
            transition: all 0.2s ease;
            cursor: pointer;
          "></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });

        const marker = L.marker([t.lat, t.lng], { icon: pinIcon }).addTo(treesGroup);
        
        marker.on('click', () => {
          setSelectedTree(t);
          setPlantingMode(false);
          loadTreeDetail(t.id_arbol);
        });

        marker.bindTooltip(`<b>Árbol:</b> ${t.codigo_arbol}<br/>Salud: ${t.estado_salud}`, { direction: 'top', offset: [0, -8] });
      }
    });

  }, [trees, selectedLoteId, lotes, selectedTree]);

  // Handle Planting Submission
  const handlePlantingSubmit = async (e) => {
    e.preventDefault();
    if (!plantingCoords) return;

    try {
      await createTree({
        tenantId,
        id_lote: selectedLoteId,
        codigo_arbol: newTreeCode,
        lat: plantingCoords.lat,
        lng: plantingCoords.lng,
        fecha_siembra: new Date().toISOString().split('T')[0],
        estado_salud: newTreeHealth,
        variedad: newTreeVariety,
        ano_siembra: newTreeYear
      });

      // Clear planting mode
      setPlantingMode(false);
      setShowPlantingForm(false);
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }

      // Reload trees
      loadTreesList();
      alert('¡Nueva siembra registrada con éxito!');
    } catch (err) {
      alert(`Error al registrar siembra: ${err.message}`);
    }
  };

  // Handle Technical Inspection / Recipe submission
  const handleInspectionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTree || !insEmpId) {
      alert('Por favor selecciona un agrónomo responsable.');
      return;
    }

    try {
      const payload = {
        tenantId,
        id_arbol: selectedTree.id_arbol,
        id_empleado: insEmpId,
        estado_salud: insHealth,
        diagnostico: insDiagnosis,
        observaciones: insObservations
      };

      if (hasRecipe && recEnfermedad && recTratamiento) {
        payload.enfermedad_plaga_detectada = recEnfermedad;
        payload.gravedad = recGravedad;
        payload.id_insumo = recInsumoId || null;
        payload.dosis_recomendada = recDosis;
        payload.fecha_aplicacion_sugerida = recFechaSugerida || null;
        payload.receta_tratamiento = recTratamiento;
      }

      await createVisit(payload);

      // Reset Form State
      setShowInspectionForm(false);
      setInsDiagnosis('');
      setInsObservations('');
      setRecEnfermedad('');
      setRecTratamiento('');
      setRecDosis('');
      setHasRecipe(false);

      // Reload state
      loadTreesList();
      loadTreeDetail(selectedTree.id_arbol);
      alert('¡Visita de inspección fitosanitaria agregada con éxito!');
    } catch (err) {
      alert(`Error al registrar visita: ${err.message}`);
    }
  };

  // Mark Recipe as Applied
  const handleApplyRecipe = async (recipeId) => {
    try {
      await applyRecipe(recipeId);
      loadTreeDetail(selectedTree.id_arbol);
      loadTreesList();
      alert('Tratamiento marcado como aplicado en el árbol.');
    } catch (err) {
      alert(`Error al aplicar receta: ${err.message}`);
    }
  };

  return (
    <div className="tree-manager-container" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      gap: '16px'
    }}>
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>🌲 Salud Árboles (Control Fitosanitario Individual)</h2>
          <p>Supervisión y trazabilidad médica árbol por árbol con georeferenciación</p>
        </div>

        {/* Lote Selector & Planting Mode Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1000 }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Lote:</label>
            <div style={{ width: '300px' }}>
              <Select
                options={lotes.map(l => ({ value: l.id_lote, label: `${l.codigo || ''} - ${l.nombre}`.replace(/^- /, '') }))}
                value={lotes.filter(l => l.id_lote == selectedLoteId).map(l => ({ value: l.id_lote, label: `${l.codigo || ''} - ${l.nombre}`.replace(/^- /, '') }))[0] || null}
                onChange={(option) => setSelectedLoteId(option ? option.value : '')}
                placeholder="Buscar por código o nombre..."
                isClearable
                styles={{
                  control: (base) => ({
                    ...base,
                    background: 'var(--card-bg)',
                    borderColor: 'var(--border)',
                    minHeight: '36px'
                  }),
                  singleValue: (base) => ({
                    ...base,
                    color: 'var(--text-primary)'
                  }),
                  menu: (base) => ({
                    ...base,
                    background: 'var(--card-bg)',
                    zIndex: 9999
                  }),
                  option: (base, state) => ({
                    ...base,
                    background: state.isFocused ? 'rgba(0, 176, 255, 0.1)' : 'var(--card-bg)',
                    color: 'var(--text-primary)',
                  })
                }}
              />
            </div>
          </div>

          <button
            className="btn"
            style={{
              padding: '8px 16px',
              fontWeight: 'bold',
              background: plantingMode ? '#FF1744' : '#00b0ff',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius)'
            }}
            onClick={() => {
              setPlantingMode(!plantingMode);
              setSelectedTree(null);
              setTreeDetail(null);
              if (tempMarkerRef.current) {
                tempMarkerRef.current.remove();
                tempMarkerRef.current = null;
              }
            }}
          >
            {plantingMode ? '⏹ Detener Plantación' : '🌱 Registrar Siembra'}
          </button>
        </div>
      </div>

      {plantingMode && (
        <div style={{
          background: 'rgba(0, 176, 255, 0.1)',
          borderLeft: '4px solid #00b0ff',
          padding: '10px 16px',
          borderRadius: '4px',
          fontSize: '13px',
          color: '#81d4fa',
          animation: 'pulse 2s infinite'
        }}>
          🎯 <b>Modo de Plantación Activo:</b> Haz clic en cualquier parte dentro del lote en el mapa para colocar el nuevo brote/árbol.
        </div>
      )}

      {/* Grid: Map left, drawer right */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: treeDetail || showPlantingForm ? '1fr 450px' : '1fr',
        gap: '16px',
        flex: 1,
        minHeight: '480px'
      }}>
        {/* Map Panel */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 1000,
            background: 'rgba(30, 41, 59, 0.9)',
            borderLeft: '4px solid #00E676',
            padding: '10px 14px',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#fff',
            pointerEvents: 'none',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
          }}>
            <strong>Estado de Salud:</strong>
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: '#00E676', borderRadius: '50%' }}></span> Sano
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: '#FF1744', borderRadius: '50%' }}></span> Enfermo
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: '#FF9100', borderRadius: '50%' }}></span> Tratamiento
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', background: '#212121', borderRadius: '50%' }}></span> Muerto
              </span>
            </div>
          </div>

          <div ref={mapContainerRef} style={{ flex: 1, width: '100%', height: '100%', borderRadius: 'var(--radius)', overflow: 'hidden' }} />
        </div>

        {/* Right Details Panel / Forms */}
        {(treeDetail || showPlantingForm) && (
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 200px)'
          }}>
            {/* 1. PLANTING FORM */}
            {showPlantingForm && plantingCoords && (
              <form onSubmit={handlePlantingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ color: '#00b0ff', margin: 0, fontSize: '16px' }}>🌱 Nueva Siembra en Coordenadas</h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Lat: {plantingCoords.lat.toFixed(6)}, Lng: {plantingCoords.lng.toFixed(6)}
                </div>

                <div className="form-group">
                  <label className="form-label">Código Único de Identificación</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={newTreeCode}
                    onChange={(e) => setNewTreeCode(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Variedad Cultivada</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={newTreeVariety}
                    onChange={(e) => setNewTreeVariety(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Año de Siembra</label>
                    <input
                      type="number"
                      required
                      className="form-control"
                      value={newTreeYear}
                      onChange={(e) => setNewTreeYear(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado Inicial</label>
                    <select
                      className="form-control"
                      value={newTreeHealth}
                      onChange={(e) => setNewTreeHealth(e.target.value)}
                    >
                      <option value="Sano">Sano</option>
                      <option value="Enfermo">Enfermo</option>
                      <option value="Tratamiento">En Tratamiento</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowPlantingForm(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#00b0ff', border: 'none', color: '#fff' }}>
                    Registrar Árbol
                  </button>
                </div>
              </form>
            )}

            {/* 2. TREE DETAIL DISPLAY AND INSPECTIONS */}
            {treeDetail && !showPlantingForm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '6px', borderRadius: '6px', display: 'flex' }}>
                      <QRCodeSVG value={treeDetail.tree.codigo_qr || `SAS-QR-${treeDetail.tree.codigo_arbol}-${treeDetail.tree.id_arbol}`} size={56} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>🌴 {treeDetail.tree.codigo_arbol}</h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Variedad: {treeDetail.tree.variedad} · Sembrado: {treeDetail.tree.ano_siembra}
                      </span>
                      <div style={{ fontSize: '10px', color: '#00b0ff', marginTop: '2px', fontFamily: 'monospace' }}>
                        ID Trazabilidad: {treeDetail.tree.codigo_qr || `SAS-QR-${treeDetail.tree.codigo_arbol}-${treeDetail.tree.id_arbol}`}
                      </div>
                    </div>
                  </div>
                  
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    background: treeDetail.tree.estado_salud === 'Sano' ? 'rgba(16, 185, 129, 0.15)' : (treeDetail.tree.estado_salud === 'Enfermo' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                    color: treeDetail.tree.estado_salud === 'Sano' ? '#10b981' : (treeDetail.tree.estado_salud === 'Enfermo' ? '#ef4444' : '#f59e0b'),
                    border: '1px solid currentColor'
                  }}>
                    {treeDetail.tree.estado_salud}
                  </span>
                </div>

                {/* Technical report action toggle */}
                {!showInspectionForm && (
                  <button className="btn btn-primary" onClick={() => setShowInspectionForm(true)}>
                    📝 Registrar Inspección / Tratamiento
                  </button>
                )}

                {/* Form to insert visit / prescription */}
                {showInspectionForm && (
                  <form onSubmit={handleInspectionSubmit} style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <h4 style={{ margin: 0, fontSize: '13px', color: '#00b0ff' }}>Registrar Nueva Inspección</h4>
                    
                    <div className="form-group">
                      <label className="form-label">Agrónomo / Técnico Responsable</label>
                      <select
                        required
                        className="form-control"
                        value={insEmpId}
                        onChange={(e) => setInsEmpId(e.target.value)}
                      >
                        <option value="">-- Seleccionar Técnico --</option>
                        {employees.map(e => (
                          <option key={e.id_empleado} value={e.id_empleado}>{e.nombres} {e.apellidos}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div className="form-group">
                        <label className="form-label">Diagnóstico de Salud</label>
                        <select
                          className="form-control"
                          value={insHealth}
                          onChange={(e) => setInsHealth(e.target.value)}
                        >
                          <option value="Sano">Sano</option>
                          <option value="Enfermo">Enfermo</option>
                          <option value="Tratamiento">En Tratamiento</option>
                          <option value="Muerto">Muerto</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Diagnóstico Plaga/Defecto</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Marchitez, Clorosis..."
                          value={insDiagnosis}
                          onChange={(e) => setInsDiagnosis(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Observaciones Técnicas</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="Escribe comentarios de hojas, raíces o suelo..."
                        value={insObservations}
                        onChange={(e) => setInsObservations(e.target.value)}
                      />
                    </div>

                    {/* Prescription checkbox toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                      <input
                        type="checkbox"
                        id="checkRecipe"
                        checked={hasRecipe}
                        onChange={(e) => setHasRecipe(e.target.checked)}
                      />
                      <label htmlFor="checkRecipe" style={{ fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', color: '#00b0ff' }}>
                        📋 Prescribir Recetario Médico Fitosanitario
                      </label>
                    </div>

                    {hasRecipe && (
                      <div style={{
                        padding: '10px',
                        borderRadius: '6px',
                        background: 'rgba(0,176,255,0.05)',
                        border: '1px solid rgba(0,176,255,0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        fontSize: '12px'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div className="form-group">
                            <label className="form-label">Enfermedad / Plaga</label>
                            <input
                              type="text"
                              required
                              className="form-control"
                              value={recEnfermedad}
                              onChange={(e) => setRecEnfermedad(e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Gravedad</label>
                            <select
                              className="form-control"
                              value={recGravedad}
                              onChange={(e) => setRecGravedad(e.target.value)}
                            >
                              <option value="Baja">Baja</option>
                              <option value="Media">Media</option>
                              <option value="Alta">Alta</option>
                              <option value="Critica">Crítica</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div className="form-group">
                            <label className="form-label">Insumo / Medicamento</label>
                            <select
                              className="form-control"
                              value={recInsumoId}
                              onChange={(e) => setRecInsumoId(e.target.value)}
                            >
                              <option value="">-- Ninguno / Genérico --</option>
                              {insumos.map(i => (
                                <option key={i.id_insumo} value={i.id_insumo}>{i.nombre}</option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Dosis Recomendada</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Ej: 50g por estípite"
                              value={recDosis}
                              onChange={(e) => setRecDosis(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Fecha Límite Sugerida</label>
                          <input
                            type="date"
                            className="form-control"
                            value={recFechaSugerida}
                            onChange={(e) => setRecFechaSugerida(e.target.value)}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Plan de Tratamiento (Receta)</label>
                          <textarea
                            required
                            className="form-control"
                            rows={2}
                            placeholder="Escribe las instrucciones detalladas del tratamiento..."
                            value={recTratamiento}
                            onChange={(e) => setRecTratamiento(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button type="button" className="btn btn-outline" style={{ flex: 1, padding: '6px' }} onClick={() => setShowInspectionForm(false)}>
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '6px' }}>
                        Guardar Visita
                      </button>
                    </div>
                  </form>
                )}

                {/* Phytosanitary records timeline */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', borderBottom: '1px solid var(--border)', paddingBottom: '4px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    📜 Historial Clínico ({treeDetail.visits.length} Visitas)
                  </h4>
                  
                  {treeDetail.visits.length === 0 && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Este árbol no registra inspecciones fitosanitarias previas.</p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {treeDetail.visits.map((vis, vIdx) => {
                      // Find if this visit has a recipe
                      const recipe = treeDetail.recipes.find(r => r.id_visita_arbol === vis.id_visita_arbol);

                      return (
                        <div key={vis.id_visita_arbol} style={{
                          padding: '12px',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.01)',
                          border: '1px solid var(--border)',
                          fontSize: '12px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span>👨‍🌾 Agr: {vis.agronomista_nombre}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                              {new Date(vis.fecha_visita).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                          
                          <div style={{ marginTop: '4px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              background: vis.estado_salud_detectado === 'Sano' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                              color: vis.estado_salud_detectado === 'Sano' ? '#10b981' : '#ef4444'
                            }}>
                              {vis.estado_salud_detectado}
                            </span>
                            {vis.diagnostico && <span style={{ fontStyle: 'italic', color: '#fff' }}>"{vis.diagnostico}"</span>}
                          </div>

                          {vis.observaciones && (
                            <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '11px' }}>
                              {vis.observaciones}
                            </p>
                          )}

                          {/* Recipe Sheet */}
                          {recipe && (
                            <div style={{
                              marginTop: '8px',
                              padding: '8px',
                              borderRadius: '4px',
                              background: 'rgba(245, 158, 11, 0.05)',
                              borderLeft: '3px solid #f59e0b'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#f59e0b', fontSize: '11px' }}>
                                <span>📋 RECETA FITOSANITARIA</span>
                                <span style={{
                                  fontSize: '9px',
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  background: recipe.gravedad === 'Critica' ? '#ef4444' : '#f59e0b',
                                  color: 'var(--text-primary)'
                                }}>
                                  Gravedad: {recipe.gravedad}
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', marginTop: '4px' }}>
                                <strong>Pest/Enf:</strong> {recipe.enfermedad_plaga_detectada}
                              </div>
                              <div style={{ fontSize: '11px', color: '#e2e8f0', marginTop: '2px' }}>
                                <strong>Prescripción:</strong> {recipe.receta_tratamiento}
                              </div>
                              {recipe.insumo_nombre && (
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  💊 Insumo: {recipe.insumo_nombre} ({recipe.dosis_recomendada})
                                </div>
                              )}
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px dashed rgba(245,158,11,0.2)', paddingTop: '4px' }}>
                                <span style={{ fontSize: '10px', color: recipe.aplicado ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                                  {recipe.aplicado ? '✓ Aplicado / Completado' : '⏳ Pendiente de Aplicar'}
                                </span>
                                
                                {!recipe.aplicado && (
                                  <button
                                    onClick={() => handleApplyRecipe(recipe.id_receta)}
                                    style={{
                                      fontSize: '10px',
                                      padding: '2px 8px',
                                      background: '#f59e0b',
                                      border: 'none',
                                      color: 'var(--text-primary)',
                                      fontWeight: 'bold',
                                      borderRadius: '3px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Aplicar Tratamiento
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SaludArboles;
