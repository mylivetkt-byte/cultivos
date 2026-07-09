import React, { useState, useEffect } from 'react';
import PremiumSelect from '../PremiumSelect';
import { authFetch } from '../../utils/api.js';
import '../dashboard.css';

const CentroMezclas = ({ tenantId = 1 }) => {
  const [mezclas, setMezclas] = useState([]);
  const [filteredMezclas, setFilteredMezclas] = useState([]);
  const [lotes, setLotes] = useState({});
  const [recetas, setRecetas] = useState({});
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    lote: '',
    responsable: ''
  });

  useEffect(() => {
    // Only load dictionaries initially
    const loadDependencies = async () => {
      try {
        const [lotesRes, recetasRes, empRes] = await Promise.all([
          authFetch(`/api/table/lotes/data?tenantId=1`),
          authFetch(`/api/applications/recipes`),
          authFetch(`/api/table/rrhh_empleados/data?tenantId=1`)
        ]);
        
        if (lotesRes.ok) {
          const lData = await lotesRes.json();
          const lMap = {};
          (lData.data || []).forEach(l => lMap[l.id_lote] = l.nombre);
          setLotes(lMap);
        }
        
        if (recetasRes.ok) {
          const rData = await recetasRes.json();
          const rMap = {};
          rData.forEach(r => rMap[r.id_receta] = r.nombre_receta);
          setRecetas(rMap);
        }

        if (empRes.ok) {
          const eData = await empRes.json();
          setEmpleados(eData.data || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadDependencies();
  }, []);

  const handleProcess = async () => {
    setLoading(true);
    try {
      const mezclasRes = await authFetch(`/api/table/app_preparaciones_mezcla/data?tenantId=${tenantId}`);

      if (mezclasRes.ok) {
        const json = await mezclasRes.json();
        const mData = json.data || [];
        
        // Filter locally
        let result = mData;
        if (filters.lote) result = result.filter(m => String(m.id_lote) === String(filters.lote) || String(m.lote_id) === String(filters.lote));
        if (filters.responsable) result = result.filter(m => (m.responsable_mezcla || m.responsable || '').toLowerCase().includes(filters.responsable.toLowerCase()));
        
        setMezclas(mData);
        setFilteredMezclas(result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Cargando Centro de Mezclas...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Auditoría: Centro de Mezclas</h1>
        <p style={{ color: 'var(--text-muted)' }}>Registro de preparaciones de recetas fitosanitarias</p>
      </div>

      <div className="card" style={{ marginBottom: '25px', padding: '0', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2em' }}>🔍</span>
          <h4 style={{ margin: 0, color: '#60A5FA' }}>Buscador Maestro de Centro de Mezclas</h4>
        </div>
        
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', background: 'rgba(0,0,0,0.15)' }}>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Filtrar por Lote Destino</label>
            <PremiumSelect
              options={Object.entries(lotes).map(([id, nombre]) => ({ value: id, label: nombre }))}
              value={filters.lote}
              onChange={e => setFilters({...filters, lote: e.target.value})}
              placeholder="-- Todos los Lotes --"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Responsable de Mezcla</label>
            <PremiumSelect
              options={empleados.map(e => ({ value: e.nombres, label: e.nombres }))}
              value={filters.responsable}
              onChange={e => setFilters({...filters, responsable: e.target.value})}
              placeholder="-- Todos los Empleados --"
            />
          </div>
        </div>
        
        <div style={{ padding: '15px 20px', background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleProcess} disabled={loading} style={{ padding: '10px 25px', fontSize: '1.05em', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            {loading ? '⏳ Procesando...' : '⚙️ Procesar Consulta'}
          </button>
        </div>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID Mezcla</th>
              <th>Fecha</th>
              <th>Lote Destino</th>
              <th>Receta (Fórmula)</th>
              <th>Volumen Total (Lts)</th>
              <th>Responsable</th>
            </tr>
          </thead>
          <tbody>
            {filteredMezclas.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>Presione 'Procesar / Buscar' para cargar registros.</td></tr>
            ) : (
              filteredMezclas.map(m => (
                <tr key={m.id_mezcla || m.id}>
                  <td>MEZ-{m.id_mezcla || m.id}</td>
                  <td>{m.fecha_preparacion ? new Date(m.fecha_preparacion).toLocaleString() : 'N/A'}</td>
                  <td>{lotes[m.id_lote || m.lote_id] || m.id_lote || 'General'}</td>
                  <td>{recetas[m.id_receta] || m.id_receta || 'Mezcla Manual'}</td>
                  <td>{m.volumen_preparado || m.cantidad_litros || 0} Lts</td>
                  <td>{m.responsable_mezcla || m.responsable || 'No asignado'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CentroMezclas;
