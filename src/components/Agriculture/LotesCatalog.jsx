import React, { useEffect, useState } from 'react';
import { fetchTableData, authFetch } from '../../utils/api'; // assuming you have a helper
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * LotesCatalog
 * ----------
 * UI para consultar y editar lotes agrícolas.
 * Permite filtrar por FINCA y NÚCLEO, listar los lotes asociados y
 * visualizar/editar el polígono GPS (campo `poligono_gps`).
 *
 * Uso esperado:
 *   - El usuario elige una finca y, opcionalmente, un núcleo.
 *   - La lista de lotes se actualiza.
 *   - Al seleccionar un lote, se muestra su geometría en un mapa Leaflet.
 *   - El usuario puede reemplazar el polígono (WKT) mediante un textarea y guardar.
 */
export default function LotesCatalog({ tenantId }) {
  const [fincas, setFincas] = useState([]);
  const [nucleos, setNucleos] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [selectedFinca, setSelectedFinca] = useState('');
  const [selectedNucleo, setSelectedNucleo] = useState('');
  const [selectedLote, setSelectedLote] = useState(null);
  const [map, setMap] = useState(null);
  const [wkt, setWkt] = useState('');

  // Load lookup data (fincas, nucleos) on mount
  useEffect(() => {
    async function loadLookups() {
      try {
        const [fincasRes, nucleosRes] = await Promise.all([
          fetchTableData('fincas', { tenantId, pageSize: 200 }),
          fetchTableData('nucleos', { tenantId, pageSize: 200 })
        ]);
        setFincas(fincasRes.data || []);
        setNucleos(nucleosRes.data || []);
      } catch (err) {
        console.error('Error loading fincas/nucleos', err);
      }
    }
    loadLookups();
  }, [tenantId]);

  // Load lotes cuando cambian finca o nucleo
  useEffect(() => {
    if (!selectedFinca) return;
    async function loadLotes() {
      try {
        const params = { tenantId, fincaId: selectedFinca, pageSize: 200 };
        if (selectedNucleo) params.nucleoId = selectedNucleo;
        const res = await fetchTableData('lotes', params);
        setLotes(res.data || []);
        setSelectedLote(null);
      } catch (err) {
        console.error('Error loading lotes', err);
      }
    }
    loadLotes();
  }, [selectedFinca, selectedNucleo, tenantId]);

  // Initialise Leaflet map once the component mounts
  useEffect(() => {
    const mapInstance = L.map('lotes-map').setView([4.6, -74.1], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance);
    setMap(mapInstance);
    return () => mapInstance.remove();
  }, []);

  // Render selected lote polygon on the map
  useEffect(() => {
    if (!map) return;
    // Clear previous layers
    map.eachLayer(layer => {
      if (layer.options && layer.options.pane === 'overlayPane') {
        map.removeLayer(layer);
      }
    });
    if (selectedLote && selectedLote.poligono_gps) {
      try {
        // Convert WKT to GeoJSON (simple parser for POLYGON only)
        const wktStr = selectedLote.poligono_gps;
        const coordinates = wktStr
          .replace(/^POLYGON\s*\(\(/i, '')
          .replace(/\)\)$/i, '')
          .split(',')
          .map(pair => pair.trim().split(' ').map(Number));
        const geoJson = {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [coordinates] }
        };
        const layer = L.geoJSON(geoJson, { style: { color: '#ff5722' } }).addTo(map);
        map.fitBounds(layer.getBounds());
        setWkt(wktStr);
      } catch (e) {
        console.warn('Failed to parse WKT polygon', e);
      }
    }
  }, [map, selectedLote]);

  const handleSavePolygon = async () => {
    if (!selectedLote) return;
    try {
      await authFetch(`/api/lotes/${selectedLote.id_lote}`, {
        method: 'PUT',
        body: JSON.stringify({ poligono_gps: wkt })
      });
      alert('Polígono guardado con éxito');
      // Refresh lotes list to reflect changes
      const res = await fetchTableData('lotes', { tenantId, fincaId: selectedFinca, pageSize: 200 });
      setLotes(res.data || []);
    } catch (err) {
      console.error('Error guardando polígono', err);
      alert('Falló al guardar el polígono');
    }
  };

  return (
    <div className="container" style={{ padding: '20px' }}>
      <h2 className="title">📍 Catálogo de Lotes</h2>
      <div className="filters" style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <select
          className="form-control"
          value={selectedFinca}
          onChange={e => setSelectedFinca(e.target.value)}
        >
          <option value="">Seleccione una Finca</option>
          {fincas.map(f => (
            <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>
          ))}
        </select>
        <select
          className="form-control"
          value={selectedNucleo}
          onChange={e => setSelectedNucleo(e.target.value)}
          disabled={!selectedFinca}
        >
          <option value="">Todos los Núcleos</option>
          {nucleos.filter(n => n.id_finca === Number(selectedFinca)).map(n => (
            <option key={n.id_nucleo} value={n.id_nucleo}>{n.nombre}</option>
          ))}
        </select>
      </div>

      {lotes.length > 0 && (
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <h3>Lotes disponibles</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {lotes.map(l => (
                <li
                  key={l.id_lote}
                  onClick={() => setSelectedLote(l)}
                  style={{
                    padding: '6px 8px',
                    cursor: 'pointer',
                    backgroundColor: selectedLote?.id_lote === l.id_lote ? 'var(--primary-light)' : 'transparent'
                  }}
                >
                  {l.codigo} - {l.nombre}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ flex: 2 }}>
            <h3>Mapa del Lote</h3>
            <div id="lotes-map" style={{ height: '400px', border: '1px solid var(--border)' }} />
            {selectedLote && (
              <div style={{ marginTop: '12px' }}>
                <label>Polígono (WKT)</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={wkt}
                  onChange={e => setWkt(e.target.value)}
                />
                <button className="btn btn-primary" style={{ marginTop: '8px' }} onClick={handleSavePolygon}>
                  Guardar Polígono
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
