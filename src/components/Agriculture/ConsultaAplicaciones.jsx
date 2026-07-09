import React, { useState, useEffect } from 'react';
import PremiumSelect from '../PremiumSelect';
import { authFetch } from '../../utils/api.js';
import '../dashboard.css';

const ConsultaAplicaciones = () => {
  const [schedules, setSchedules] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    lote: '',
    empleado: '',
    maquina: '',
    estado: '',
    textoLibre: '' // Para caminos, potreros, etc.
  });

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [response, lotesRes, empRes] = await Promise.all([
          authFetch('/api/applications/schedule'),
          authFetch('/api/table/lotes/data?tenantId=1'),
          authFetch('/api/table/rrhh_empleados/data?tenantId=1')
        ]);
        
        if (response.ok) {
          const data = await response.json();
          setSchedules(data);
        }
        if (lotesRes.ok) {
          const lData = await lotesRes.json();
          setLotes(lData.data || []);
        }
        if (empRes.ok) {
          const eData = await empRes.json();
          setEmpleados(eData.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const handleProcess = () => {
    applyFilters(filters, schedules);
  };

  const applyFilters = (f, data) => {
    let result = data;
    if (f.lote) result = result.filter(s => (s.lote_nombre || '').toLowerCase().includes(f.lote.toLowerCase()));
    if (f.empleado) result = result.filter(s => (s.responsable_aplicacion || '').toLowerCase().includes(f.empleado.toLowerCase()));
    if (f.estado) result = result.filter(s => s.estado === f.estado);
    if (f.textoLibre) {
      const lowerText = f.textoLibre.toLowerCase();
      result = result.filter(s => 
        (s.observaciones || '').toLowerCase().includes(lowerText) || 
        (s.lote_nombre || '').toLowerCase().includes(lowerText) ||
        (s.finca_nombre || '').toLowerCase().includes(lowerText) ||
        (s.metodo_aplicacion || '').toLowerCase().includes(lowerText)
      );
    }
    setFiltered(result);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Programada': return '#3B82F6';
      case 'En Proceso': return '#F59E0B';
      case 'Completada': return '#10B981';
      case 'Cancelada': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Consulta Avanzada de Aplicaciones</h1>
        <p style={{ color: 'var(--text-muted)' }}>Historial de Lotes, Potreros, Empleados y Maquinaria</p>
      </div>

      <div className="card" style={{ marginBottom: '25px', padding: '0', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2em' }}>🔍</span>
          <h4 style={{ margin: 0, color: '#60A5FA' }}>Buscador Maestro de Aplicaciones en Campo</h4>
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
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Texto Libre (Camino, etc)</label>
            <input type="text" className="form-control" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px', fontSize: '1rem', borderRadius: '6px' }} name="textoLibre" value={filters.textoLibre} onChange={handleFilterChange} placeholder="Buscar..." />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Empleado / Agrónomo</label>
            <PremiumSelect
              options={empleados.map(e => ({ value: e.nombres, label: e.nombres }))}
              value={filters.empleado}
              onChange={e => setFilters({...filters, empleado: e.target.value})}
              placeholder="-- Todos los Empleados --"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Maquinaria / Vehículo</label>
            <input type="text" className="form-control" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px', fontSize: '1rem', borderRadius: '6px' }} name="maquina" value={filters.maquina} onChange={handleFilterChange} placeholder="ID o Nombre..." />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Estado</label>
            <PremiumSelect
              options={[
                { value: 'Programada', label: 'Programada' },
                { value: 'En Proceso', label: 'En Proceso' },
                { value: 'Completada', label: 'Completada' },
                { value: 'Cancelada', label: 'Cancelada' }
              ]}
              value={filters.estado}
              onChange={e => setFilters({...filters, estado: e.target.value})}
              placeholder="-- Todos los Estados --"
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
              <th>ID</th>
              <th>Fecha</th>
              <th>Finca - Lote</th>
              <th>Receta / Mezcla</th>
              <th>Método / Máquina</th>
              <th>Responsable</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7" style={{textAlign: 'center', padding: '20px'}}>Presione 'Procesar / Buscar' para ver resultados o ajuste sus filtros.</td></tr>
            ) : (
              filtered.map(s => (
                <tr key={s.id_programacion}>
                  <td>PROG-{s.id_programacion}</td>
                  <td>{s.fecha_ejecucion ? new Date(s.fecha_ejecucion).toLocaleDateString() : new Date(s.fecha_programada).toLocaleDateString()}</td>
                  <td>{s.finca_nombre} - {s.lote_nombre}</td>
                  <td>{s.nombre_receta || 'Mezcla Manual'}</td>
                  <td>{s.metodo_aplicacion}</td>
                  <td>{s.responsable_aplicacion}</td>
                  <td>
                    <span style={{ background: getStatusColor(s.estado), color: '#fff', padding: '4px 8px', borderRadius: '12px', fontSize: '0.85em' }}>
                      {s.estado}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div style={{ marginTop: '10px', fontSize: '0.85em', color: 'var(--text-muted)' }}>
          Total de registros: {filtered.length}
        </div>
      </div>
    </div>
  );
};

export default ConsultaAplicaciones;
