import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icons
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

// Custom Icons
const cowIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1998/1998634.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const dipIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3105/3105805.png', // pool/water icon
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const potreroIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2880/2880155.png', // fence/grass icon
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function TableroSatelital({ fincaId: fincaIdProp, fincas: fincasProp }) {
  const [localFincaId, setLocalFincaId] = useState('');
  const [potreroId, setPotreroId] = useState('');
  const [codigoAnimal, setCodigoAnimal] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const [datosSat, setDatosSat] = useState({ potreros: [], piscinas: [], censo: {} });
  const [fincas, setFincas] = useState([]);
  const [ganadoMock, setGanadoMock] = useState([]);

  // Use global fincaId if local is empty
  const effectiveFincaId = localFincaId || fincaIdProp || '';

  const fetchSatelital = async () => {
    try {
      const query = new URLSearchParams();
      if(fechaInicio) query.append('fecha_inicio', fechaInicio);
      if(fechaFin) query.append('fecha_fin', fechaFin);
      if(effectiveFincaId) query.append('id_finca', effectiveFincaId);
      if(potreroId) query.append('id_potrero', potreroId);

      const res = await fetch(`/api/ganado_avanzado/dashboard?${query.toString()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if(res.ok) {
        const data = await res.json();
        setDatosSat({
          potreros: data.potreros || [],
          piscinas: data.piscinas || [],
          animalesGps: data.animalesGps || [],
          censo: data.censo || {}
        });
      }
    } catch(e) {
      console.error(e);
    }
  };

  const loadFincas = async () => {
    try {
      const res = await fetch('/api/tables/fincas?pageSize=100', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if(res.ok) {
        const data = await res.json();
        setFincas(data.data || []);
      }
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadFincas();
  }, []);

  useEffect(() => {
    fetchSatelital();
  }, [effectiveFincaId]);

  const mapCenter = datosSat.potreros?.find(p => p.latitud && p.longitud) 
    ? [parseFloat(datosSat.potreros.find(p => p.latitud && p.longitud).latitud), parseFloat(datosSat.potreros.find(p => p.latitud && p.longitud).longitud)] 
    : [4.55, -74.15]; // Default center (Colombia)

  return (
    <div className="p-4 dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>🛰️ Tablero Satelital GPS y Censo</h2>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)' }}>Monitoreo en Tiempo Real: Potreros, Ganado y Piscinas de Baño</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px' }}>📗 Exportar</button>
        </div>
      </div>

      {/* FILTROS GLOBALES */}
      <div className="card" style={{ padding: '15px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hato / Finca</label><br/>
          <select value={effectiveFincaId} onChange={e => setLocalFincaId(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', minWidth: '150px' }}>
            <option value="">Todas las Fincas</option>
            {fincas.map(f => <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Potrero</label><br/>
          <select value={potreroId} onChange={e => setPotreroId(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', minWidth: '150px' }}>
            <option value="">Todos los Potreros</option>
            {datosSat.potreros?.map(p => (
              <option key={p.id_potrero} value={p.id_potrero}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Buscar Arete GPS</label><br/>
          <input type="text" value={codigoAnimal} onChange={e => setCodigoAnimal(e.target.value)} placeholder="Ej: GPS-1234" style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
        </div>
        <button onClick={fetchSatelital} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Localizar</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderLeft: '5px solid #3b82f6', borderRadius: '8px' }}>
          <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '14px' }}>Machos de Ceba</h4>
          <h2 style={{ color: '#3b82f6', margin: 0, fontSize: '32px' }}>{datosSat.censo?.machos_ceba || 0}</h2>
        </div>
        <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderLeft: '5px solid #ec4899', borderRadius: '8px' }}>
          <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '14px' }}>Hembras de Cría</h4>
          <h2 style={{ color: '#ec4899', margin: 0, fontSize: '32px' }}>{datosSat.censo?.hembras_cria || 0}</h2>
        </div>
        <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderLeft: '5px solid #f59e0b', borderRadius: '8px' }}>
          <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '14px' }}>Terneros (Levante)</h4>
          <h2 style={{ color: '#f59e0b', margin: 0, fontSize: '32px' }}>{datosSat.censo?.terneros || 0}</h2>
        </div>
        <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderLeft: '5px solid #10b981', borderRadius: '8px' }}>
          <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '14px' }}>Piscinas Activas</h4>
          <h2 style={{ color: '#10b981', margin: 0, fontSize: '32px' }}>{datosSat.piscinas?.length || 0}</h2>
        </div>
      </div>

      {/* MAPA VISUAL SATELITAL */}
      <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <h3 style={{ marginTop: 0, color: 'var(--text)' }}>📍 Mapa Satelital de Cobertura</h3>
        
        <div style={{ width: '100%', height: '500px', background: '#e2e8f0', borderRadius: '8px', position: 'relative', overflow: 'hidden', border: '2px solid #cbd5e1' }}>
          
          <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
            {/* Base Layer: Satellite or standard */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />

            {/* Potreros (Paddocks) */}
            {datosSat.potreros?.filter(p => p.latitud && p.longitud).map(p => (
              <React.Fragment key={`p-${p.id_potrero}`}>
                <Marker 
                  position={[parseFloat(p.latitud), parseFloat(p.longitud)]}
                  icon={potreroIcon}
                >
                  <Popup>
                    <strong>{p.nombre}</strong><br/>
                    Ocupación: {p.ocupacion_actual} / {p.capacidad_carga} cabezas<br/>
                    Área: {p.hectareas} ha
                  </Popup>
                </Marker>
                {/* Visual circle for paddock area */}
                <Circle 
                  center={[parseFloat(p.latitud), parseFloat(p.longitud)]} 
                  pathOptions={{ color: p.ocupacion_actual > p.capacidad_carga ? 'red' : 'green', fillColor: p.ocupacion_actual > p.capacidad_carga ? 'red' : 'green', fillOpacity: 0.2 }}
                  radius={100} // ~100m radius
                />
              </React.Fragment>
            ))}

            {/* Piscinas / Baños */}
            {datosSat.piscinas?.filter(p => p.latitud && p.longitud).map(p => (
              <Marker 
                key={`pool-${p.id_piscina}`}
                position={[parseFloat(p.latitud), parseFloat(p.longitud)]}
                icon={dipIcon}
              >
                <Popup>
                  <strong>{p.nombre_piscina}</strong><br/>
                  <span style={{color: '#3b82f6'}}>🌊 Baño Garrapaticida / Sanitario</span><br/>
                  Producto Activo: {p.producto_activo}<br/>
                  Capacidad: {p.capacidad_litros} L<br/>
                  Estado: <span style={{color: p.estado === 'Activa' ? 'green' : 'orange'}}>{p.estado}</span>
                </Popup>
              </Marker>
            ))}

            {/* Ganado (Real GPS positions from DB) */}
            {(datosSat.animalesGps || []).slice(0, 100).map(g => ( // Limit to 100 to avoid clutter
              <Marker 
                key={`cow-${g.id_animal}`}
                position={[parseFloat(g.lat), parseFloat(g.lng)]}
                icon={cowIcon}
              >
                <Popup>
                  <strong>Arete: {g.arete}</strong><br/>
                  Ubicación: {g.potrero || 'Sin asignar'}<br/>
                  Estado: Activo<br/>
                  <span style={{color: '#8b5cf6', fontSize: '11px'}}>Collar GPS Transmitiendo...</span>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default TableroSatelital;
