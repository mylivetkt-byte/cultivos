import React, { useState, useEffect } from 'react';
import '../dashboard.css';
import { authFetch } from '../../utils/api';
import PremiumSelect from '../PremiumSelect';
import ExportButtons from '../ExportButtons';
import { useAuth } from '../../context/AuthContext';

const SiembraArbolesManager = () => {
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Catalogs for lookup and filtering
  const [lotes, setLotes] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    lote: '',
    estado_salud: '',
    variedad: '',
    codigo: ''
  });

  const [processedData, setProcessedData] = useState([]);
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    if (tenantId) {
      loadCatalogs();
    }
  }, [tenantId]);

  const loadCatalogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const resLotes = await authFetch(`/api/table/lotes/data?tenantId=${tenantId}&pageSize=500`, { headers });
      const dataLotes = await resLotes.json();

      setLotes(dataLotes.data || []);
    } catch (err) {
      console.error('Error loading catalogs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      let url = `/api/table/siembra_arboles/data?tenantId=${tenantId}&pageSize=1000`;
      
      const response = await authFetch(url, { headers });
      const data = await response.json();
      let records = data.data || [];
      
      // Apply filters locally
      if (filters.lote) {
        const loteObj = lotes.find(l => l.nombre === filters.lote);
        if (loteObj) records = records.filter(r => r.id_lote === loteObj.id_lote);
      }
      
      if (filters.estado_salud) {
        records = records.filter(r => r.estado_salud === filters.estado_salud);
      }
      
      if (filters.variedad) {
        records = records.filter(r => (r.variedad || '').toLowerCase().includes(filters.variedad.toLowerCase()));
      }
      
      if (filters.codigo) {
        records = records.filter(r => (r.codigo_arbol || '').toLowerCase().includes(filters.codigo.toLowerCase()));
      }

      setProcessedData(records);
      setHasProcessed(true);
    } catch (err) {
      console.error('Error procesando arboles:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLoteName = (id) => {
    const l = lotes.find(l => l.id_lote === id);
    return l ? l.nombre : id;
  };

  const exportColumns = [
    { header: 'Código Árbol', getter: a => a.codigo_arbol },
    { header: 'Lote', getter: a => getLoteName(a.id_lote) },
    { header: 'Variedad', getter: a => a.variedad || 'N/A' },
    { header: 'Fecha Siembra', getter: a => a.fecha_siembra ? new Date(a.fecha_siembra).toLocaleDateString() : (a.ano_siembra || 'N/A') },
    { header: 'Estado de Salud', getter: a => a.estado_salud || 'Desconocido' },
    { header: 'Coordenadas (GPS)', getter: a => {
        if (!a.gps_punto) return 'No registrado';
        if (typeof a.gps_punto === 'object' && a.gps_punto.coordinates) return `${a.gps_punto.coordinates[0]}, ${a.gps_punto.coordinates[1]}`;
        if (typeof a.gps_punto === 'string') return a.gps_punto;
        return 'No registrado';
    }}
  ];

  if (loading && !hasProcessed) return <div className="loading">Cargando Módulo de Árboles...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Control de Individuos (Siembra de Árboles)</h1>
        <p style={{ color: 'var(--text-muted)' }}>Inventario y seguimiento de estado de salud por individuo</p>
      </div>

      <div className="card" style={{ marginBottom: '25px', padding: '0', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2em' }}>🔍</span>
          <h4 style={{ margin: 0, color: '#60A5FA' }}>Buscador de Árboles</h4>
        </div>
        
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', background: 'rgba(0,0,0,0.15)' }}>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Lote / Potrero</label>
            <PremiumSelect
              options={lotes.map(l => ({ value: l.nombre, label: l.nombre }))}
              value={filters.lote}
              onChange={e => setFilters({...filters, lote: e.target.value})}
              placeholder="-- Todos los Lotes --"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Estado de Salud</label>
            <PremiumSelect
              options={[
                { value: 'Sano', label: 'Sano' },
                { value: 'Enfermo', label: 'Enfermo' },
                { value: 'Tratamiento', label: 'En Tratamiento' },
                { value: 'Muerto', label: 'Muerto' },
                { value: 'Desaparecido', label: 'Desaparecido' }
              ]}
              value={filters.estado_salud}
              onChange={e => setFilters({...filters, estado_salud: e.target.value})}
              placeholder="-- Todos los Estados --"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Variedad</label>
            <input 
              type="text" 
              className="form-control" 
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px', fontSize: '1rem', borderRadius: '6px', width: '100%' }} 
              placeholder="Escriba variedad..."
              value={filters.variedad} 
              onChange={e => setFilters({...filters, variedad: e.target.value})} 
            />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Código del Árbol</label>
            <input 
              type="text" 
              className="form-control" 
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px', fontSize: '1rem', borderRadius: '6px', width: '100%' }} 
              placeholder="Buscar por código..."
              value={filters.codigo} 
              onChange={e => setFilters({...filters, codigo: e.target.value})} 
            />
          </div>
        </div>
        
        <div style={{ padding: '15px 20px', background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <ExportButtons data={processedData} columns={exportColumns} filename="Reporte_Arboles" />
          </div>
          <button className="btn btn-primary" onClick={handleProcess} style={{ padding: '10px 25px', fontSize: '1.05em', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            {loading ? 'Procesando...' : '⚙️ Procesar Consulta'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Código Árbol</th>
              <th>Lote</th>
              <th>Variedad</th>
              <th>Fecha Siembra</th>
              <th>Estado de Salud</th>
              <th>Geolocalización (GPS)</th>
            </tr>
          </thead>
          <tbody>
            {!hasProcessed ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Presione 'Procesar Consulta' para cargar los registros.
                </td>
              </tr>
            ) : processedData.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No se encontraron árboles con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              processedData.map(a => {
                let statusColor = '#34D399'; // Sano (Green)
                if (a.estado_salud === 'Enfermo') statusColor = '#F87171'; // Red
                else if (a.estado_salud === 'Tratamiento') statusColor = '#FBBF24'; // Yellow
                else if (a.estado_salud === 'Muerto' || a.estado_salud === 'Desaparecido') statusColor = '#9CA3AF'; // Gray
                
                // Tratar de sacar coordenadas si es un campo geográfico. Puede venir como string WKT o objeto
                let coordStr = 'No registrado';
                if (a.gps_punto) {
                   if (typeof a.gps_punto === 'object' && a.gps_punto.coordinates) {
                      coordStr = `${a.gps_punto.coordinates[0]}, ${a.gps_punto.coordinates[1]}`;
                   } else if (typeof a.gps_punto === 'string') {
                      coordStr = a.gps_punto;
                   }
                }

                return (
                  <tr key={a.id_arbol}>
                    <td><strong>{a.codigo_arbol}</strong></td>
                    <td style={{ color: '#60A5FA' }}>{getLoteName(a.id_lote)}</td>
                    <td>{a.variedad || 'N/A'}</td>
                    <td>{a.fecha_siembra ? new Date(a.fecha_siembra).toLocaleDateString() : (a.ano_siembra || 'N/A')}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85em',
                        fontWeight: 'bold',
                        background: `${statusColor}33`, // 20% opacity
                        color: statusColor,
                        border: `1px solid ${statusColor}66`
                      }}>
                        {a.estado_salud || 'Desconocido'}
                      </span>
                    </td>
                    <td>
                      {coordStr !== 'No registrado' ? (
                        <span style={{ fontSize: '0.9em', color: '#9CA3AF' }}>📍 {coordStr}</span>
                      ) : (
                        <span style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SiembraArbolesManager;
