import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

// Helper to parse WKT string POLYGON((lng lat, lng lat, ...)) to Array of {lat, lng}
function parseWKTPolygon(wkt) {
  if (!wkt || typeof wkt !== 'string') return [];
  try {
    const coordsStr = wkt
      .replace(/polygon\s*\(\s*\(\s*/i, '')
      .replace(/\s*\)\s*\)\s*$/, '')
      .trim();
    if (!coordsStr) return [];
    
    const points = coordsStr.split(',').map(p => {
      const parts = p.trim().split(/\s+/);
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      return { lat, lng };
    });
    
    // Remove last point if it duplicates first point (Leaflet handles closing automatically)
    if (points.length > 1 && 
        points[0].lat === points[points.length - 1].lat && 
        points[0].lng === points[points.length - 1].lng) {
      points.pop();
    }
    return points;
  } catch (e) {
    console.error('Error parsing WKT Polygon:', e);
    return [];
  }
}

// Convert Array of {lat, lng} to WKT POLYGON
function toWKTPolygon(coords) {
  if (!coords || coords.length < 3) return '';
  const points = coords.map(c => `${c.lng.toFixed(6)} ${c.lat.toFixed(6)}`);
  // Close the polygon
  points.push(`${coords[0].lng.toFixed(6)} ${coords[0].lat.toFixed(6)}`);
  return `POLYGON((${points.join(', ')}))`;
}

// Convert {lat, lng} to WKT POINT
function toWKTPoint(coord) {
  if (!coord) return '';
  return `POINT(${coord.lng.toFixed(6)} ${coord.lat.toFixed(6)})`;
}

// Calculate centroid of coordinates
function getCentroid(coords) {
  if (!coords || coords.length === 0) return { lat: 4.570868, lng: -74.297333 }; // default Colombia
  let lat = 0, lng = 0;
  for (const c of coords) {
    lat += c.lat;
    lng += c.lng;
  }
  return { lat: lat / coords.length, lng: lng / coords.length };
}

// Shoelace formula with geographic projection to calculate area in Hectares
function calculateAreaHectares(coords) {
  if (coords.length < 3) return 0;
  const centroid = getCentroid(coords);
  const latRad = centroid.lat * Math.PI / 180;
  const metersPerLat = 111132;
  const metersPerLng = 111320 * Math.cos(latRad);
  
  const projected = coords.map(c => ({
    x: c.lng * metersPerLng,
    y: c.lat * metersPerLat
  }));

  let area = 0;
  for (let i = 0; i < projected.length; i++) {
    const j = (i + 1) % projected.length;
    area += projected[i].x * projected[j].y;
    area -= projected[j].x * projected[i].y;
  }
  area = Math.abs(area) / 2.0;
  return area / 10000; // 1 Hectare = 10,000 m²
}

function PolygonEditor({ initialPolygon, existingPolygons = [], onSave, onClose }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const polygonLayerRef = useRef(null);
  const markersGroupRef = useRef(null);
  
  const [coords, setCoords] = useState([]);
  const [mapMode, setMapMode] = useState('satellite'); // 'satellite' | 'streets'
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [area, setArea] = useState(0);

  // Initialize coords from WKT
  useEffect(() => {
    if (initialPolygon) {
      const parsed = parseWKTPolygon(initialPolygon);
      setCoords(parsed);
      setArea(calculateAreaHectares(parsed));
    }
  }, [initialPolygon]);

  // Leaflet map initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCoords = initialPolygon ? parseWKTPolygon(initialPolygon) : [];
    const center = getCentroid(initialCoords);
    const initialZoom = initialCoords.length > 0 ? 15 : 6;

    // Create Map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true
    }).setView([center.lat, center.lng], initialZoom);
    
    mapRef.current = map;

    // Zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Layer definitions
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS'
    });
    
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    });

    // Add initial layer
    if (mapMode === 'satellite') {
      satelliteLayer.addTo(map);
    } else {
      streetLayer.addTo(map);
    }

    // Reference groups
    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    const polygonLayer = L.polygon([], {
      color: '#00F0FF',
      fillColor: '#00F0FF',
      fillOpacity: 0.25,
      weight: 3
    }).addTo(map);
    polygonLayerRef.current = polygonLayer;

    // Map Click Handler to add point
    map.on('click', (e) => {
      const newPt = { lat: e.latlng.lat, lng: e.latlng.lng };
      setCoords(prev => {
        const next = [...prev, newPt];
        setArea(calculateAreaHectares(next));
        return next;
      });
    });

    // Draw existing polygons
    const existingGroup = L.layerGroup().addTo(map);
    existingPolygons.forEach(p => {
      const parsed = parseWKTPolygon(p.wkt);
      if (parsed.length > 2) {
        const poly = L.polygon(parsed.map(c => [c.lat, c.lng]), {
          color: '#FBBF24',
          fillColor: '#FBBF24',
          fillOpacity: 0.15,
          weight: 2,
          dashArray: '4'
        }).addTo(existingGroup);
        if (p.label) poly.bindTooltip(p.label, { permanent: false, sticky: true });
      }
    });

    // Auto-center map if there are existing polygons but no initial polygon
    if (initialCoords.length === 0 && existingPolygons.length > 0) {
      let allPts = [];
      existingPolygons.forEach(p => {
        allPts = allPts.concat(parseWKTPolygon(p.wkt));
      });
      if (allPts.length > 0) {
        const bounds = L.latLngBounds(allPts.map(c => [c.lat, c.lng]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map layer on mode change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, USDA, USGS'
    });
    
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    });

    if (mapMode === 'satellite') {
      satelliteLayer.addTo(map);
    } else {
      streetLayer.addTo(map);
    }
  }, [mapMode]);

  // Update polygon and markers when coords state changes
  useEffect(() => {
    const map = mapRef.current;
    const polygonLayer = polygonLayerRef.current;
    const markersGroup = markersGroupRef.current;

    if (!map || !polygonLayer || !markersGroup) return;

    // Clear old markers
    markersGroup.clearLayers();

    // Update polygon path
    const latLngs = coords.map(c => [c.lat, c.lng]);
    polygonLayer.setLatLngs(latLngs);

    // Vertex icon - premium cyan dot
    const vertexIcon = L.divIcon({
      className: 'custom-map-vertex',
      html: `<div style="
        width: 12px;
        height: 12px;
        background: #00F0FF;
        border: 2px solid #FFFFFF;
        border-radius: 50%;
        box-shadow: 0 0 8px rgba(0, 240, 255, 0.8);
        cursor: grab;
      "></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });

    // Draw markers
    coords.forEach((coord, idx) => {
      const marker = L.marker([coord.lat, coord.lng], {
        icon: vertexIcon,
        draggable: true
      });

      // Drag event handler
      marker.on('drag', (e) => {
        const draggedLatLng = e.target.getLatLng();
        setCoords(prev => {
          const next = [...prev];
          next[idx] = { lat: draggedLatLng.lat, lng: draggedLatLng.lng };
          // Real-time area update
          setArea(calculateAreaHectares(next));
          return next;
        });
      });

      // Click event to remove vertex
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setCoords(prev => {
          const next = prev.filter((_, i) => i !== idx);
          setArea(calculateAreaHectares(next));
          return next;
        });
      });

      marker.addTo(markersGroup);
    });

  }, [coords]);

  const handleClear = () => {
    setCoords([]);
    setArea(0);
  };

  const handleCenter = () => {
    const map = mapRef.current;
    if (!map || coords.length === 0) return;
    const latLngs = coords.map(c => [c.lat, c.lng]);
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [50, 50] });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');

    // Try parsing as coordinates first (lat, lng)
    const parts = searchQuery.replace(/[^\d.-]+/g, ' ').trim().split(/\s+/);
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        const map = mapRef.current;
        if (map) {
          map.setView([lat, lon], 17);
          if (coords.length === 0) setCoords([{ lat, lng: lon }]);
        }
        setSearching(false);
        return;
      }
    }

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat);
        const lon = parseFloat(first.lon);
        const map = mapRef.current;
        if (map) {
          map.setView([lat, lon], 16);
          // If no coords, place first vertex there
          if (coords.length === 0) {
            setCoords([{ lat, lng: lon }]);
          }
        }
      } else {
        setSearchError('Ubicación no encontrada.');
      }
    } catch (err) {
      setSearchError('Error de red al buscar.');
    } finally {
      setSearching(false);
    }
  };

  const handleConfirmSave = () => {
    if (coords.length < 3) {
      alert('Se requieren al menos 3 vértices para guardar un polígono.');
      return;
    }
    const polygonWKT = toWKTPolygon(coords);
    const centerPointWKT = toWKTPoint(getCentroid(coords));
    onSave(polygonWKT, centerPointWKT, area);
  };

  return (
    <div className="polygon-editor-wrapper" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--card-bg, #1a202c)',
      color: 'var(--text-color, #e2e8f0)',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {/* Search and Control Bar */}
      <div className="editor-top-bar" style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        background: 'rgba(0, 0, 0, 0.2)'
      }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: '1', minWidth: '280px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar ciudad, finca o coordenadas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '6px 12px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '4px',
              color: '#ffffff'
            }}
          />
          <button type="submit" className="btn btn-outline" disabled={searching} style={{ padding: '6px 12px' }}>
            {searching ? 'Buscando...' : '🔍 Buscar'}
          </button>
        </form>

        {searchError && (
          <span style={{ color: '#F56565', fontSize: '13px' }}>{searchError}</span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Map Layer Toggle */}
          <div className="layer-toggle" style={{
            display: 'flex',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => setMapMode('satellite')}
              style={{
                padding: '6px 12px',
                border: 'none',
                background: mapMode === 'satellite' ? '#00F0FF' : 'transparent',
                color: mapMode === 'satellite' ? '#000000' : '#ffffff',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              🛰️ Satélite
            </button>
            <button
              onClick={() => setMapMode('streets')}
              style={{
                padding: '6px 12px',
                border: 'none',
                background: mapMode === 'streets' ? '#00F0FF' : 'transparent',
                color: mapMode === 'streets' ? '#000000' : '#ffffff',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              🗺️ Calles
            </button>
          </div>

          {/* Quick Stats */}
          <div style={{
            padding: '4px 12px',
            background: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#00F0FF'
          }}>
            📐 Área: {area.toLocaleString('es-ES', { maximumFractionDigits: 2 })} Ha
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div style={{ position: 'relative', flex: 1, minHeight: '380px' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '380px' }} />
        
        {/* Map overlay hint */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          background: 'rgba(0, 0, 0, 0.75)',
          borderLeft: '4px solid #00F0FF',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          maxWidth: '280px',
          zIndex: 1000,
          pointerEvents: 'none'
        }}>
          💡 <b>Instrucciones:</b><br />
          - Haz clic en el mapa para colocar los vértices.<br />
          - Arrastra los puntos celestes para ajustar la forma.<br />
          - Haz clic en un punto para eliminarlo.
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline" onClick={handleClear} disabled={coords.length === 0}>
            🧹 Limpiar
          </button>
          <button className="btn btn-outline" onClick={handleCenter} disabled={coords.length === 0}>
            🎯 Centrar
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleConfirmSave} disabled={coords.length < 3}>
            💾 Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}

export default PolygonEditor;
