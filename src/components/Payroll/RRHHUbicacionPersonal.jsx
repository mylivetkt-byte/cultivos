import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Clock3, LocateFixed, MapPin, Play, RefreshCw, Search, Smartphone, Square, Users } from 'lucide-react';
import { fetchRRHULocationEmployees, fetchRRHULocationHistory, pingGPSTelemetry } from '../../utils/api';

const DEFAULT_CENTER = [10.4625, -73.2525];

function statusPalette(status) {
  switch (status) {
    case 'En línea':
      return { bg: 'rgba(16, 185, 129, 0.14)', fg: '#059669', border: '#10b981' };
    case 'Reciente':
      return { bg: 'rgba(245, 158, 11, 0.14)', fg: '#b45309', border: '#f59e0b' };
    case 'Offline':
      return { bg: 'rgba(239, 68, 68, 0.14)', fg: '#b91c1c', border: '#ef4444' };
    case 'Sin señal':
      return { bg: 'rgba(100, 116, 139, 0.14)', fg: '#475569', border: '#64748b' };
    default:
      return { bg: 'rgba(148, 163, 184, 0.14)', fg: '#334155', border: '#94a3b8' };
  }
}

function markerHtml({ label, status, selected }) {
  const palette = statusPalette(status);
  return `
    <div style="
      position: relative;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #0f172a;
      border: 3px solid ${palette.border};
      box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.18);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 15px;
      transform: scale(${selected ? 1.15 : 1});
    ">
      <span>${label}</span>
      <span style="
        position: absolute;
        right: -4px;
        bottom: -4px;
        width: 11px;
        height: 11px;
        border-radius: 50%;
        background: ${palette.border};
        border: 2px solid #0f172a;
      "></span>
    </div>
  `;
}

function employeeLabel(employee) {
  const fullName = [employee?.nombres, employee?.apellidos].filter(Boolean).join(' ').trim();
  return fullName || employee?.nombre_completo || employee?.device_id || `Empleado ${employee?.id_empleado || ''}`;
}

function formatLastSeen(minutes) {
  if (minutes === null || minutes === undefined) return 'Sin ping';
  if (minutes < 1) return 'Hace menos de 1 min';
  if (minutes === 1) return 'Hace 1 min';
  return `Hace ${minutes} min`;
}

export default function RRHHUbicacionPersonal({ tenantId, fincaId }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const historyLayerRef = useRef(null);
  const workerMarkerRef = useRef(null);
  const workerWatchRef = useRef(null);

  const [employees, setEmployees] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [workerEmployeeId, setWorkerEmployeeId] = useState('');
  const [mode, setMode] = useState('supervisor');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [workerError, setWorkerError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [workerPoint, setWorkerPoint] = useState(null);
  const [lastPingAt, setLastPingAt] = useState(null);

  const loadEmployees = useCallback(async () => {
    try {
      const rows = await fetchRRHULocationEmployees({ tenantId, fincaId });
      setEmployees(Array.isArray(rows) ? rows : []);
      setError('');
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, fincaId]);

  const loadHistory = useCallback(async (employeeId) => {
    if (!employeeId) {
      setHistory([]);
      return;
    }
    try {
      const rows = await fetchRRHULocationHistory(employeeId, { tenantId });
      setHistory(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error(err);
      setHistory([]);
    }
  }, [tenantId]);

  useEffect(() => {
    loadEmployees();
    const interval = setInterval(loadEmployees, 15000);
    return () => clearInterval(interval);
  }, [loadEmployees]);

  useEffect(() => {
    if (employees.length === 0) return;
    const selectedExists = selectedEmployeeId && employees.some((employee) => String(employee.id_empleado) === String(selectedEmployeeId));
    const workerExists = workerEmployeeId && employees.some((employee) => String(employee.id_empleado) === String(workerEmployeeId));

    if (!selectedExists) {
      const firstWithLocation = employees.find((employee) => employee.tiene_ubicacion) || employees[0];
      setSelectedEmployeeId(String(firstWithLocation.id_empleado));
    }

    if (!workerExists) {
      setWorkerEmployeeId(String(employees[0].id_empleado));
    }
  }, [employees, selectedEmployeeId, workerEmployeeId]);

  useEffect(() => {
    if (mode !== 'supervisor') return;
    loadHistory(selectedEmployeeId);
  }, [mode, selectedEmployeeId, loadHistory]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true
    }).setView(DEFAULT_CENTER, 15);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri'
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    historyLayerRef.current = L.layerGroup().addTo(map);
    workerMarkerRef.current = null;
    mapRef.current = map;

    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      historyLayerRef.current = null;
      workerMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    const historyLayer = historyLayerRef.current;
    if (!map || !markersLayer || !historyLayer) return;

    markersLayer.clearLayers();
    historyLayer.clearLayers();

    const boundsPoints = [];

    if (mode === 'supervisor') {
      employees.forEach((employee) => {
        if (employee.lat === null || employee.lng === null || employee.lat === undefined || employee.lng === undefined) return;

        const selected = String(selectedEmployeeId) === String(employee.id_empleado);
        const point = [Number(employee.lat), Number(employee.lng)];
        boundsPoints.push(point);

        const avatar = employee.nombres?.trim()?.[0] || employee.apellidos?.trim()?.[0] || 'E';
        const palette = statusPalette(employee.estado_seguimiento);
        const icon = L.divIcon({
          className: 'rrhh-location-marker',
          html: markerHtml({
            label: avatar,
            status: employee.estado_seguimiento,
            selected
          }),
          iconSize: [38, 38],
          iconAnchor: [19, 19]
        });

        const marker = L.marker(point, { icon }).addTo(markersLayer);
        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; min-width: 220px; color: #0f172a">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">${employeeLabel(employee)}</div>
            <div style="font-size: 12px; margin-bottom: 3px;"><strong>Cargo:</strong> ${employee.cargo || 'Sin cargo'}</div>
            <div style="font-size: 12px; margin-bottom: 3px;"><strong>Finca:</strong> ${employee.finca_nombre || 'Sin finca'}</div>
            <div style="font-size: 12px; margin-bottom: 3px;"><strong>GPS:</strong> ${employee.identificador_gps || 'Sin dispositivo'}</div>
            <div style="font-size: 12px; margin-bottom: 3px;">
              <strong>Estado:</strong>
              <span style="color: ${palette.fg}; font-weight: 700;"> ${employee.estado_seguimiento}</span>
            </div>
            <div style="font-size: 12px;">${formatLastSeen(employee.minutos_ultima_conexion)}</div>
          </div>
        `);

        marker.on('click', () => {
          setSelectedEmployeeId(String(employee.id_empleado));
        });
      });

      if (history.length > 0) {
        const line = history.map((row) => [Number(row.lat), Number(row.lng)]);
        historyLayer.addLayer(L.polyline(line, {
          color: '#38bdf8',
          weight: 4,
          opacity: 0.9
        }));
        line.forEach((pt) => boundsPoints.push(pt));
      }
    } else if (workerPoint) {
      const point = [Number(workerPoint.lat), Number(workerPoint.lng)];
      boundsPoints.push(point);
      const icon = L.divIcon({
        className: 'rrhh-worker-marker',
        html: markerHtml({ label: 'M', status: 'En línea', selected: true }),
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      const marker = L.marker(point, { icon }).addTo(markersLayer);
      marker.bindPopup(`
        <div style="font-family: Inter, sans-serif; min-width: 220px; color: #0f172a">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">Ubicación en vivo</div>
          <div style="font-size: 12px; margin-bottom: 3px;"><strong>Lat:</strong> ${Number(workerPoint.lat).toFixed(6)}</div>
          <div style="font-size: 12px; margin-bottom: 3px;"><strong>Lng:</strong> ${Number(workerPoint.lng).toFixed(6)}</div>
          <div style="font-size: 12px;"><strong>Precisión:</strong> ${workerPoint.accuracy || 'N/D'} m</div>
        </div>
      `);
    }

    if (boundsPoints.length > 1) {
      map.fitBounds(boundsPoints, { padding: [40, 40] });
    } else if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 17);
    } else {
      map.setView(DEFAULT_CENTER, 15);
    }
  }, [employees, history, mode, selectedEmployeeId, workerPoint]);

  useEffect(() => {
    if (!workerEmployeeId) return;
    if (mode !== 'worker') return;
    const current = employees.find((employee) => String(employee.id_empleado) === String(workerEmployeeId));
    if (!current) return;
    if (!current.lat || !current.lng) {
      setWorkerPoint(null);
    }
  }, [mode, workerEmployeeId, employees]);

  useEffect(() => {
    return () => {
      if (workerWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(workerWatchRef.current);
      }
    };
  }, []);

  const onlineCount = useMemo(() => employees.filter((employee) => employee.estado_seguimiento === 'En línea').length, [employees]);
  const staleCount = useMemo(() => employees.filter((employee) => employee.estado_seguimiento === 'Reciente').length, [employees]);
  const offlineCount = useMemo(() => employees.filter((employee) => ['Offline', 'Sin señal', 'Sin dispositivo'].includes(employee.estado_seguimiento)).length, [employees]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => String(employee.id_empleado) === String(selectedEmployeeId)) || null,
    [employees, selectedEmployeeId]
  );

  const workerEmployee = useMemo(
    () => employees.find((employee) => String(employee.id_empleado) === String(workerEmployeeId)) || null,
    [employees, workerEmployeeId]
  );

  const trackingIdentifier = useMemo(() => {
    if (!workerEmployee) return '';
    return workerEmployee.device_id || `GPS_EMPLEADO_${workerEmployee.id_empleado}`;
  }, [workerEmployee]);

  const stopWorkerTracking = useCallback(() => {
    if (workerWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(workerWatchRef.current);
    }
    workerWatchRef.current = null;
    setSharing(false);
  }, []);

  const startWorkerTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setWorkerError('Este navegador no soporta geolocalización.');
      return;
    }
    if (!workerEmployee) {
      setWorkerError('Selecciona un trabajador primero.');
      return;
    }

    setWorkerError('');
    setSharing(true);

    if (workerWatchRef.current !== null) {
      navigator.geolocation.clearWatch(workerWatchRef.current);
    }

    workerWatchRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, speed, heading, accuracy } = position.coords;
        const point = {
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy || 0)
        };
        setWorkerPoint(point);

        try {
          await pingGPSTelemetry({
            identificador_gps: trackingIdentifier,
            latitud: latitude,
            longitud: longitude,
            velocidad: Number.isFinite(speed) ? speed : 0,
            direccion: Number.isFinite(heading) ? heading : 0,
            auto_register: true,
            tipo_entidad: 'Empleado',
            tenantId,
            id_empleado: workerEmployee.id_empleado
          });
          setLastPingAt(new Date().toISOString());
        } catch (err) {
          console.error(err);
          setWorkerError(err.message);
        }
      },
      (err) => {
        console.error(err);
        setWorkerError(err.message || 'No fue posible acceder al GPS.');
        stopWorkerTracking();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );
  }, [stopWorkerTracking, tenantId, trackingIdentifier, workerEmployee]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((employee) => {
      const haystack = [
        employeeLabel(employee),
        employee.cargo,
        employee.finca_nombre,
        employee.area_asignada,
        employee.identificador_gps,
        employee.estado_seguimiento
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [employees, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '100%', paddingBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: 'var(--text)' }}>Ubicación del Personal</h2>
          <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)' }}>
            Seguimiento real por GPS desde celular. El supervisor ve el mapa y el trabajador puede activar su ubicación desde el mismo módulo.
          </p>
        </div>
        <button className="btn btn-outline" onClick={loadEmployees} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={16} />
          Refrescar
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          className="btn"
          onClick={() => setMode('supervisor')}
          style={{ background: mode === 'supervisor' ? 'var(--primary)' : 'var(--card-bg)', color: mode === 'supervisor' ? '#fff' : 'var(--text)' }}
        >
          <Users size={16} style={{ marginRight: '8px' }} />
          Supervisor
        </button>
        <button
          className="btn"
          onClick={() => setMode('worker')}
          style={{ background: mode === 'worker' ? 'var(--primary)' : 'var(--card-bg)', color: mode === 'worker' ? '#fff' : 'var(--text)' }}
        >
          <Smartphone size={16} style={{ marginRight: '8px' }} />
          Trabajador
        </button>
      </div>

      {mode === 'supervisor' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Personal activo</div>
              <div style={{ fontSize: '28px', fontWeight: 800 }}>{employees.length}</div>
            </div>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>En línea</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>{onlineCount}</div>
            </div>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Reciente</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>{staleCount}</div>
            </div>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Sin señal</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444' }}>{offlineCount}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '16px', minHeight: '680px' }}>
            <aside style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                <Search size={16} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar trabajador..."
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    color: 'var(--text)',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {loading ? (
                  <div style={{ color: 'var(--text-secondary)', padding: '16px 4px' }}>Cargando ubicación real...</div>
                ) : filteredEmployees.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', padding: '16px 4px' }}>No hay trabajadores con ubicación para mostrar.</div>
                ) : (
                  filteredEmployees.map((employee) => {
                    const selected = String(selectedEmployeeId) === String(employee.id_empleado);
                    const palette = statusPalette(employee.estado_seguimiento);

                    return (
                      <button
                        key={employee.id_empleado}
                        onClick={() => setSelectedEmployeeId(String(employee.id_empleado))}
                        style={{
                          textAlign: 'left',
                          width: '100%',
                          border: `1px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                          background: selected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                          borderRadius: '8px',
                          padding: '12px',
                          color: 'var(--text)',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 700 }}>{employeeLabel(employee)}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              {employee.cargo || 'Sin cargo'} · {employee.finca_nombre || 'Sin finca'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              Sesión: {employee.sesion_activa ? 'Activa' : 'Inactiva'} · {employee.device_name || 'Sin dispositivo'}
                            </div>
                          </div>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: '999px',
                            background: palette.bg,
                            color: palette.fg,
                            border: `1px solid ${palette.border}`
                          }}>
                            {employee.estado_seguimiento}
                          </span>
                        </div>
                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <span><MapPin size={14} style={{ verticalAlign: 'text-bottom' }} /> {employee.identificador_gps || 'Sin dispositivo'}</span>
                          <span><Clock3 size={14} style={{ verticalAlign: 'text-bottom' }} /> {formatLastSeen(employee.minutos_ultima_conexion)}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <div style={{ fontWeight: 700, marginBottom: '8px' }}>Detalle</div>
                {selectedEmployee ? (
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <div><strong style={{ color: 'var(--text)' }}>Empleado:</strong> {employeeLabel(selectedEmployee)}</div>
                    <div><strong style={{ color: 'var(--text)' }}>Device:</strong> {selectedEmployee.identificador_gps || 'Sin dispositivo'}</div>
                    <div><strong style={{ color: 'var(--text)' }}>Sesión:</strong> {selectedEmployee.sesion_activa ? 'Activa' : 'Inactiva'}</div>
                    <div><strong style={{ color: 'var(--text)' }}>Dispositivo:</strong> {selectedEmployee.device_name || 'Sin dispositivo'}</div>
                    <div><strong style={{ color: 'var(--text)' }}>Última señal:</strong> {formatLastSeen(selectedEmployee.minutos_ultima_conexion)}</div>
                    <div><strong style={{ color: 'var(--text)' }}>Velocidad:</strong> {Number(selectedEmployee.velocidad || 0).toFixed(1)} km/h</div>
                    <div><strong style={{ color: 'var(--text)' }}>Dirección:</strong> {selectedEmployee.direccion || 0}°</div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Selecciona un trabajador para revisar su recorrido.</div>
                )}
              </div>
            </aside>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div ref={mapContainerRef} style={{ flex: 1, minHeight: '680px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }} />
            </section>
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '16px', minHeight: '680px' }}>
          <section style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Smartphone size={18} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '18px' }}>App de GPS del trabajador</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>El trabajador activa el GPS y el mapa se actualiza en tiempo real.</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Trabajador</label>
              <select
                value={workerEmployeeId}
                onChange={(e) => setWorkerEmployeeId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)'
                }}
              >
                {employees.map((employee) => (
                  <option key={employee.id_empleado} value={employee.id_empleado}>
                    {employeeLabel(employee)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Identificador</div>
                <div style={{ fontWeight: 800, marginTop: '4px' }}>{trackingIdentifier || 'Sin seleccionar'}</div>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Estado</div>
                <div style={{ fontWeight: 800, marginTop: '4px', color: sharing ? '#10b981' : 'var(--text)' }}>
                  {sharing ? 'Compartiendo GPS' : 'Detenido'}
                </div>
              </div>
            </div>

            {workerEmployee && !workerEmployee.device_id && (
              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', color: '#92400e', border: '1px solid rgba(245, 158, 11, 0.24)' }}>
                Este trabajador no tiene `device_id` asignado. El sistema usará el identificador temporal <strong>{trackingIdentifier}</strong> hasta que se configure en la base de datos.
              </div>
            )}

            {workerError && (
              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                {workerError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={startWorkerTracking}
                disabled={sharing || !workerEmployee}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Play size={16} />
                Iniciar GPS
              </button>
              <button
                className="btn btn-outline"
                onClick={stopWorkerTracking}
                disabled={!sharing}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Square size={16} />
                Detener
              </button>
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontWeight: 700, marginBottom: '8px' }}>Lectura en vivo</div>
              {workerPoint ? (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <div><strong style={{ color: 'var(--text)' }}>Latitud:</strong> {Number(workerPoint.lat).toFixed(6)}</div>
                  <div><strong style={{ color: 'var(--text)' }}>Longitud:</strong> {Number(workerPoint.lng).toFixed(6)}</div>
                  <div><strong style={{ color: 'var(--text)' }}>Precisión:</strong> {workerPoint.accuracy} m</div>
                  <div><strong style={{ color: 'var(--text)' }}>Último envío:</strong> {lastPingAt ? new Date(lastPingAt).toLocaleTimeString() : 'Sin enviar'}</div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Activa GPS para empezar a compartir ubicación real.</div>
              )}
            </div>

            <div style={{ marginTop: 'auto', color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.5 }}>
              La ubicación se guarda en `gps_tracking_dispositivos` y `gps_tracking_historial`. No hay valores simulados en esta vista.
            </div>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div ref={mapContainerRef} style={{ flex: 1, minHeight: '680px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }} />
          </section>
        </div>
      )}
    </div>
  );
}
