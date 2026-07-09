import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { fetchGPSConnections, fetchGPSAssignments, pingGPSTelemetry, fetchGPSTrajectory } from '../utils/api';

// Helper to parse WKT strings
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
      return [lat, lng]; // Leaflet expects [lat, lng]
    });
  } catch (e) {
    console.error('Error parsing WKT Polygon:', e);
    return [];
  }
}

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
    console.error('Error parsing WKT Point:', e);
  }
  return null;
}

function GPSTracker({ tenantId, fincaId, nucleoId }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  
  // Map layers refs for updating dynamically
  const geofencesGroupRef = useRef(null);
  const markersGroupRef = useRef(null);
  const trajectoryLineRef = useRef(null);

  const [connections, setConnections] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [historyPath, setHistoryPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Simulator State
  const [simulationActive, setSimulationActive] = useState(false);
  const [simIntervalId, setSimIntervalId] = useState(null);
  const [simDevice, setSimDevice] = useState(null);
  const [simLocationMode, setSimLocationMode] = useState('in'); // 'in' or 'out' or 'moving'
  const [simHeading, setSimHeading] = useState(0);

  // Load telemetry data from API
  const loadTelemetryData = useCallback(async () => {
    try {
      const conns = await fetchGPSConnections({ tenantId });
      const assigns = await fetchGPSAssignments({ tenantId });
      setConnections(conns);
      setAssignments(assigns);
      setError(null);
    } catch (err) {
      console.error('Error fetching GPS telemetry data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Load initial data and set up automatic polling every 10 seconds
  useEffect(() => {
    loadTelemetryData();
    const interval = setInterval(loadTelemetryData, 10000);
    return () => clearInterval(interval);
  }, [loadTelemetryData]);

  // Handle visual update of history route
  const handleShowHistory = async (device) => {
    setSelectedDevice(device);
    try {
      const hist = await fetchGPSTrajectory(device.id_dispositivo);
      setHistoryPath(hist);
    } catch (err) {
      console.error('Error loading history trajectory:', err);
    }
  };

  // Map initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Valledupar coordinate center fallback
    const center = [10.4625, -73.2525];
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true
    }).setView(center, 15);
    mapRef.current = map;

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Layer definitions
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS'
    }).addTo(map);

    geofencesGroupRef.current = L.layerGroup().addTo(map);
    markersGroupRef.current = L.layerGroup().addTo(map);
    
    trajectoryLineRef.current = L.polyline([], {
      color: '#FFB300',
      weight: 3,
      dashArray: '5, 10',
      opacity: 0.8
    }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map overlays (geofences, markers, trajectories) whenever data changes
  useEffect(() => {
    const map = mapRef.current;
    const geofencesGroup = geofencesGroupRef.current;
    const markersGroup = markersGroupRef.current;
    const trajectoryLine = trajectoryLineRef.current;

    if (!map || !geofencesGroup || !markersGroup) return;

    // 1. Render Geofences
    geofencesGroup.clearLayers();
    assignments.forEach(ass => {
      if (ass.geofence_tipo === 'Lote' && ass.lote_poligono_wkt) {
        const polyCoords = parseWKTPolygon(ass.lote_poligono_wkt);
        if (polyCoords.length > 0) {
          const poly = L.polygon(polyCoords, {
            color: ass.dentro_zona_actual ? '#00E676' : '#FF1744',
            fillColor: ass.dentro_zona_actual ? '#00E676' : '#FF1744',
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '3, 5'
          }).addTo(geofencesGroup);
          
          poly.bindTooltip(`<b>Zona Labor:</b> ${ass.descripcion_labor}<br/>Lote: ${ass.lote_nombre}`, { sticky: true });
        }
      } else if (ass.geofence_tipo === 'Punto' && ass.punto_gps_wkt) {
        const centerPt = parseWKTPoint(ass.punto_gps_wkt);
        if (centerPt) {
          const circle = L.circle(centerPt, {
            radius: ass.radio_metros || 50,
            color: ass.dentro_zona_actual ? '#00E676' : '#FF1744',
            fillColor: ass.dentro_zona_actual ? '#00E676' : '#FF1744',
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '3, 5'
          }).addTo(geofencesGroup);
          
          circle.bindTooltip(`<b>Zona Labor (Punto):</b> ${ass.descripcion_labor}<br/>Radio: ${ass.radio_metros}m`, { sticky: true });
        }
      }
    });

    // 2. Render Markers
    markersGroup.clearLayers();
    connections.forEach(conn => {
      if (conn.lat && conn.lng) {
        const isSelected = selectedDevice && selectedDevice.id_dispositivo === conn.id_dispositivo;
        
        // Find if this connection has an active assignment and its zone status
        const activeAss = assignments.find(a => a.tipo_entidad === conn.tipo_entidad && a.id_entidad === conn.id_entidad);
        const inZone = activeAss ? activeAss.dentro_zona_actual === 1 : true;
        const color = inZone ? '#00E676' : '#FF1744'; // Green = inside/no assignment, Red = outside

        // Emoji by Entity Type
        const avatar = conn.tipo_entidad === 'Empleado' ? '👤' : (conn.tipo_entidad === 'Vehiculo' ? '🚚' : '🚜');

        const deviceIcon = L.divIcon({
          className: 'custom-gps-marker',
          html: `<div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            background: #1e293b;
            border: 3px solid ${color};
            border-radius: 50%;
            font-size: 18px;
            color: #ffffff;
            box-shadow: 0 0 10px ${color};
            position: relative;
            transition: all 0.3s ease;
            transform: scale(${isSelected ? 1.25 : 1});
          ">
            ${avatar}
            ${activeAss ? `
              <div style="
                position: absolute;
                bottom: -5px;
                right: -5px;
                width: 12px;
                height: 12px;
                background: ${inZone ? '#00E676' : '#FF1744'};
                border-radius: 50%;
                border: 2px solid #1e293b;
              "></div>
            ` : ''}
          </div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19]
        });

        const marker = L.marker([conn.lat, conn.lng], { icon: deviceIcon }).addTo(markersGroup);
        
        // Setup popup details
        const detailsHtml = `
          <div style="font-family: Inter, sans-serif; color: #1e293b; min-width: 200px; padding: 4px;">
            <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; display: flex; align-items: center; gap: 6px;">
              <span>${avatar}</span> ${conn.nombre_entidad}
            </h4>
            <div style="font-size: 12px; margin-bottom: 4px;"><strong>Identificador:</strong> ${conn.identificador_gps}</div>
            <div style="font-size: 12px; margin-bottom: 4px;"><strong>Estado GPS:</strong> <span style="color: ${conn.estado === 'Activo' ? '#10b981' : '#ef4444'}; font-weight: bold;">${conn.estado}</span></div>
            <div style="font-size: 12px; margin-bottom: 4px;"><strong>Velocidad:</strong> ${conn.velocidad} km/h</div>
            <div style="font-size: 12px; margin-bottom: 6px;"><strong>Dirección:</strong> ${conn.direccion}°</div>
            ${activeAss ? `
              <div style="
                padding: 6px; 
                border-radius: 4px; 
                background: ${inZone ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
                color: ${inZone ? '#059669' : '#dc2626'};
                font-weight: bold;
                font-size: 11px;
                border: 1px solid ${inZone ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
              ">
                📌 Labor: ${activeAss.descripcion_labor}<br/>
                🚨 Estado: ${inZone ? 'EN ZONA ASIGNADA' : 'FUERA DE ZONA'}
              </div>
            ` : `<div style="font-size: 11px; color: #64748b; font-style: italic;">Sin labores geolocalizadas asignadas hoy.</div>`}
          </div>
        `;
        marker.bindPopup(detailsHtml);
      }
    });

    // 3. Render Trajectory
    if (historyPath.length > 0) {
      const latlngs = historyPath.map(h => [h.lat, h.lng]);
      trajectoryLine.setLatLngs(latlngs);
      
      // Auto-zoom map to show full path on load
      if (latlngs.length > 1) {
        const bounds = L.latLngBounds(latlngs);
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    } else {
      trajectoryLine.setLatLngs([]);
    }

  }, [connections, assignments, selectedDevice, historyPath]);

  // Telemetry simulation logic
  const handleSendSimulatedPing = async (mode = simLocationMode) => {
    if (!simDevice) return;

    let targetLat = 10.4625;
    let targetLng = -73.2525;
    let speed = 5.0;

    // Deduce simulated coords based on active assignment
    const activeAss = assignments.find(a => a.tipo_entidad === simDevice.tipo_entidad && a.id_entidad === simDevice.id_entidad);

    if (mode === 'in') {
      // Send coordinates directly within Lote 1 center or point assignment
      if (activeAss) {
        if (activeAss.geofence_tipo === 'Lote') {
          targetLat = 10.4625; // Inside Lote 1
          targetLng = -73.2525;
        } else if (activeAss.geofence_tipo === 'Punto' && activeAss.punto_gps_wkt) {
          const pt = parseWKTPoint(activeAss.punto_gps_wkt);
          if (pt) {
            targetLat = pt[0] + 0.0001; // offset tiny bit inside radius
            targetLng = pt[1] + 0.0001;
          }
        }
      }
      speed = 2.4;
    } else if (mode === 'out') {
      // Send coordinates far away (outside coordinates)
      targetLat = 10.4500;
      targetLng = -73.2400;
      speed = 45.0;
    } else if (mode === 'moving') {
      // Dynamic moving route (incrementally walks/drives across coordinates)
      const prevLat = simDevice.lat || 10.4600;
      const prevLng = simDevice.lng || -73.2500;
      
      // Wander around, crossing bounds
      const step = 0.0003;
      const radian = (simHeading * Math.PI) / 180;
      targetLat = prevLat + step * Math.sin(radian);
      targetLng = prevLng + step * Math.cos(radian);
      
      // Mantener rumbo fijo para no introducir datos artificiales
      setSimHeading(0);
      speed = simDevice.tipo_entidad === 'Empleado' ? 4.5 : 22.0;
    }

    try {
      const result = await pingGPSTelemetry({
        identificador_gps: simDevice.identificador_gps,
        latitud: targetLat,
        longitud: targetLng,
        velocidad: speed,
        direccion: Math.round(simHeading)
      });

      // Reload telemetry state to visualize immediately
      await loadTelemetryData();

      // Keep selection active
      const updatedDevice = connections.find(c => c.id_dispositivo === simDevice.id_dispositivo);
      if (updatedDevice) {
        setSimDevice({
          ...updatedDevice,
          lat: targetLat,
          lng: targetLng
        });
        
        // Feed real-time trajectory if selected
        if (selectedDevice && selectedDevice.id_dispositivo === updatedDevice.id_dispositivo) {
          const hist = await fetchGPSTrajectory(updatedDevice.id_dispositivo);
          setHistoryPath(hist);
        }
      }
    } catch (err) {
      console.error('Error sending simulated ping:', err);
    }
  };

  // Start continuous path tracking simulation
  const toggleSimulation = () => {
    if (simulationActive) {
      clearInterval(simIntervalId);
      setSimIntervalId(null);
      setSimulationActive(false);
    } else {
      if (!simDevice) {
        alert('Por favor selecciona una entidad para iniciar la simulación.');
        return;
      }
      setSimulationActive(true);
      // Fire first ping immediately
      handleSendSimulatedPing('moving');
      // Set interval to ping every 2 seconds
      const intId = setInterval(() => {
        handleSendSimulatedPing('moving');
      }, 2000);
      setSimIntervalId(intId);
    }
  };

  // Clean up interval when component unmounts
  useEffect(() => {
    return () => {
      if (simIntervalId) clearInterval(simIntervalId);
    };
  }, [simIntervalId]);

  return (
    <div className="gps-tracker-container" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      gap: '16px'
    }}>
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Seguimiento Georeferenciado de Personal y Equipos</h2>
          <p>Supervisión en tiempo real de labores agrícolas y alertas de geocercas por GPS</p>
        </div>
        <button className="btn btn-outline" onClick={loadTelemetryData} style={{ padding: '8px 12px' }}>
          🔄 Actualizar Telemetría
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#FFEBEE', color: '#C62828', borderRadius: 'var(--radius)', fontSize: '14px' }}>
          ⚠️ Error al conectar con el servicio de satélites: <strong>{error}</strong>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: '16px',
        flex: 1,
        minHeight: '500px'
      }}>
        {/* Sidebar Controls and Entities List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '16px',
          overflowY: 'auto'
        }}>
          {/* Active Devices List */}
          <div>
            <h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              📡 Dispositivos Activos ({connections.length})
            </h3>
            {loading && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Cargando conexiones...</p>}
            {!loading && connections.length === 0 && (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No hay dispositivos registrados.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {connections.map(conn => {
                const activeAss = assignments.find(a => a.tipo_entidad === conn.tipo_entidad && a.id_entidad === conn.id_entidad);
                const inZone = activeAss ? activeAss.dentro_zona_actual === 1 : true;
                const isSelected = selectedDevice && selectedDevice.id_dispositivo === conn.id_dispositivo;
                const avatar = conn.tipo_entidad === 'Empleado' ? '👤' : (conn.tipo_entidad === 'Vehiculo' ? '🚚' : '🚜');

                return (
                  <div
                    key={conn.id_dispositivo}
                    onClick={() => handleShowHistory(conn)}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius)',
                      border: '1px solid ' + (isSelected ? '#00F0FF' : 'var(--border)'),
                      background: isSelected ? 'rgba(0, 240, 255, 0.05)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>{avatar}</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-color)' }}>
                          {conn.nombre_entidad?.split(' (')[0] || conn.identificador_gps}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {conn.tipo_entidad} · {conn.velocidad} km/h
                        </div>
                      </div>
                    </div>

                    {activeAss ? (
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        background: inZone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: inZone ? '#10b981' : '#ef4444',
                        border: '1px solid ' + (inZone ? '#10b981' : '#ef4444')
                      }}>
                        {inZone ? 'En Zona' : 'Fuera'}
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Libre</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Labors Geofences Info */}
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              📌 Tareas y Geocercas
            </h3>
            {assignments.length === 0 && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Ninguna geocerca activa hoy.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {assignments.map(ass => (
                <div key={ass.id_asignacion} style={{
                  padding: '8px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.01)',
                  borderLeft: '3px solid ' + (ass.dentro_zona_actual ? '#10b981' : '#ef4444'),
                  fontSize: '12px'
                }}>
                  <div style={{ fontWeight: 'bold' }}>{ass.nombre_entidad}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                    {ass.descripcion_labor}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span>Tipo: {ass.geofence_tipo}</span>
                    <span style={{ color: ass.dentro_zona_actual ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                      {ass.dentro_zona_actual ? '✓ En Zona' : '🚨 Fuera de Zona'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Simulator Panel */}
          <div style={{
            marginTop: 'auto',
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: 'var(--radius)',
            border: '1px dashed rgba(255, 255, 255, 0.1)'
          }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#00F0FF', display: 'flex', alignItems: 'center', gap: '4px' }}>
              🎮 Simulador de Movimiento GPS
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <select
                className="form-control"
                style={{ fontSize: '12px', padding: '4px 8px', background: 'var(--body-bg)', color: '#fff', border: '1px solid var(--border)' }}
                value={simDevice ? simDevice.id_dispositivo : ''}
                onChange={(e) => {
                  const d = connections.find(c => c.id_dispositivo === parseInt(e.target.value));
                  setSimDevice(d);
                  if (d) setSimLocationMode('in');
                }}
              >
                <option value="">-- Seleccionar Entidad --</option>
                {connections.map(c => (
                  <option key={c.id_dispositivo} value={c.id_dispositivo}>
                    {c.tipo_entidad}: {c.nombre_entidad?.split(' (')[0]}
                  </option>
                ))}
              </select>

              {simDevice && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="btn btn-outline"
                      style={{ flex: 1, padding: '4px', fontSize: '10px', background: simLocationMode === 'in' ? '#10b981' : 'transparent', color: simLocationMode === 'in' ? '#000' : '#fff' }}
                      onClick={() => {
                        setSimLocationMode('in');
                        handleSendSimulatedPing('in');
                      }}
                    >
                      En Zona
                    </button>
                    <button
                      className="btn btn-outline"
                      style={{ flex: 1, padding: '4px', fontSize: '10px', background: simLocationMode === 'out' ? '#ef4444' : 'transparent', color: simLocationMode === 'out' ? '#000' : '#fff' }}
                      onClick={() => {
                        setSimLocationMode('out');
                        handleSendSimulatedPing('out');
                      }}
                    >
                      Fuera
                    </button>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{
                      padding: '6px',
                      fontSize: '11px',
                      background: simulationActive ? '#f44336' : '#00F0FF',
                      color: '#000',
                      fontWeight: 'bold',
                      border: 'none'
                    }}
                    onClick={toggleSimulation}
                  >
                    {simulationActive ? '⏹ Detener Simulación' : '▶ Iniciar Caminata (Auto)'}
                  </button>
                  
                  {simulationActive && (
                    <div style={{ fontSize: '9px', color: '#00F0FF', textAlign: 'center', animation: 'pulse 1.5s infinite' }}>
                      ● Transmitiendo pings GPS en movimiento...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Map Container panel */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            zIndex: 1000,
            background: 'rgba(30, 41, 59, 0.9)',
            borderLeft: '4px solid #00F0FF',
            padding: '10px 14px',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#fff',
            maxWidth: '320px',
            pointerEvents: 'none',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
          }}>
            <strong>Leyenda de Geocercas:</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
              <div style={{ width: '12px', height: '12px', background: 'rgba(16, 185, 129, 0.3)', border: '1px dashed #10b981' }}></div>
              <span>Entidad asignada DENTRO de la zona</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <div style={{ width: '12px', height: '12px', background: 'rgba(239, 68, 68, 0.3)', border: '1px dashed #ef4444' }}></div>
              <span>🚨 Entidad FUERA de la zona asignada</span>
            </div>
            {selectedDevice && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', color: '#FFB300', fontWeight: 'bold' }}>
                <span>---</span>
                <span>Trayectoria histórica dibujada</span>
              </div>
            )}
          </div>

          <div ref={mapContainerRef} style={{ flex: 1, width: '100%', height: '100%', borderRadius: 'var(--radius)', overflow: 'hidden' }} />
        </div>
      </div>
    </div>
  );
}

export default GPSTracker;
