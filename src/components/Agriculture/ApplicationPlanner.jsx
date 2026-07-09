import React, { useState, useEffect } from 'react';
import PremiumSelect from '../PremiumSelect';
import { authFetch } from '../../utils/api.js';
import '../dashboard.css';

const ApplicationPlanner = ({ tenantId = 1 }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    fecha_desde: '',
    fecha_hasta: '',
    lote: '',
    estado: '',
    responsable: ''
  });
  
  // Form Data
  const [fincas, setFincas] = useState([]);
  const [lotesForm, setLotesForm] = useState([]);
  const [lotesAll, setLotesAll] = useState([]);
  const [recetas, setRecetas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [stockInventario, setStockInventario] = useState({});
  
  const [formData, setFormData] = useState({
    id_finca: '',
    id_lote: '',
    id_receta: '',
    fecha_programada: new Date().toISOString().split('T')[0],
    metodo_aplicacion: 'Fumigadora de espalda',
    responsable_aplicacion: '',
    insumos: [] // {id_insumo, cantidad_proyectada, prioridad}
  });

  useEffect(() => {
    // Only load dependencies initially, DO NOT load schedules
    loadFormDependencies();
    setLoading(false);
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const response = await authFetch(`/api/applications/schedule?tenantId=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        
        // Apply filters locally
        let result = data;
        if (filters.fecha_desde) result = result.filter(s => new Date(s.fecha_programada) >= new Date(filters.fecha_desde));
        if (filters.fecha_hasta) result = result.filter(s => new Date(s.fecha_programada) <= new Date(filters.fecha_hasta));
        if (filters.estado) result = result.filter(s => s.estado === filters.estado);
        if (filters.lote) result = result.filter(s => String(s.id_lote) === String(filters.lote) || (s.lote_nombre||'').toLowerCase().includes(filters.lote.toLowerCase()));
        if (filters.responsable) result = result.filter(s => (s.responsable_aplicacion || '').toLowerCase().includes(filters.responsable.toLowerCase()));
        
        setSchedules(data);
        setFilteredSchedules(result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFormDependencies = async () => {
    try {
      // Load Fincas
      const fRes = await authFetch(`/api/table/fincas/data?tenantId=${tenantId}`);
      const fData = await fRes.json();
      setFincas(fData.data || []);

      // Load Recetas
      const rRes = await authFetch('/api/applications/recipes');
      const rData = await rRes.json();
      setRecetas(rData || []);

      // Load Stock
      const sRes = await authFetch(`/api/table/inventario_insumos/data?tenantId=${tenantId}`);
      const sData = await sRes.json();
      const stockMap = {};
      (sData.data || []).forEach(s => {
        if(s.id_bodega === 1) stockMap[s.id_insumo] = parseFloat(s.cantidad);
      });
      setStockInventario(stockMap);
      // Load All Lotes for filter
      const lResAll = await authFetch(`/api/table/lotes/data?tenantId=${tenantId}`);
      const lDataAll = await lResAll.json();
      setLotesAll(lDataAll.data || []);

      // Load Empleados
      const eRes = await authFetch(`/api/table/rrhh_empleados/data?tenantId=${tenantId}`);
      const eData = await eRes.json();
      setEmpleados(eData.data || []);
      
    } catch (e) {
      console.error('Error loading dependencies', e);
    }
  };

  const handleFincaChange = async (e) => {
    const fincaId = e.target.value;
    setFormData({...formData, id_finca: fincaId, id_lote: ''});
    if(fincaId) {
      const lRes = await authFetch(`/api/table/lotes/data?filterFinca=${fincaId}`);
      const lData = await lRes.json();
      setLotesForm(lData.data || []);
    } else {
      setLotesForm([]);
    }
  };

  const handleRecetaLoteChange = (e, field) => {
    const val = e.target.value;
    const newForm = { ...formData, [field]: val };
    
    // Auto calculate if both Receta and Lote are selected
    if (newForm.id_receta && newForm.id_lote) {
      const lote = lotesForm.find(l => String(l.id_lote) === String(newForm.id_lote));
      const receta = recetas.find(r => String(r.id_receta) === String(newForm.id_receta));
      const area = lote ? parseFloat(lote.area_hectareas) || 1 : 1;
      
      if (receta && receta.detalles) {
        newForm.insumos = receta.detalles.map(d => ({
          id_insumo: d.id_insumo,
          nombre: d.insumo_nombre,
          dosis_recomendada: d.dosis_recomendada, // per ha
          cantidad_proyectada: (parseFloat(d.dosis_recomendada) * area).toFixed(2),
          prioridad: 'Media'
        }));
      }
    }
    setFormData(newForm);
  };

  const handleInsumoChange = (index, field, value) => {
    const newInsumos = [...formData.insumos];
    newInsumos[index][field] = value;
    setFormData({ ...formData, insumos: newInsumos });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/applications/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tenantId })
      });
      if (res.ok) {
        alert('Aplicación programada con éxito. Las alertas de stock han sido procesadas.');
        setShowForm(false);
        fetchSchedules();
      } else {
        const error = await res.json();
        alert('Error: ' + error.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error al programar.');
    }
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

  if (loading) return <div className="loading">Cargando Programación...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Programador de Aplicaciones Agrícolas</h1>
        {!showForm && (
          <div className="header-actions">
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              ➕ Nueva Programación
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '20px', padding: '20px', borderLeft: '4px solid var(--primary-color)' }}>
          <h3>Programar Nueva Aplicación</h3>
          <p style={{color: 'var(--text-muted)', marginBottom: '15px'}}>
            Al seleccionar Lote y Receta, el sistema calculará la necesidad total multiplicando Dosis x Área.
          </p>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label>Finca</label>
                <PremiumSelect
                  options={fincas.map(f => ({ value: f.id_finca, label: f.nombre }))}
                  value={Number(formData.id_finca)}
                  onChange={handleFincaChange}
                  placeholder="Seleccione Finca..."
                />
              </div>
              <div>
                <label>Lote (Área determina cant. total)</label>
                <PremiumSelect
                  options={lotesForm.map(l => ({ value: l.id_lote, label: `${l.nombre} (${l.area_hectareas} Ha)` }))}
                  value={Number(formData.id_lote)}
                  onChange={e => handleRecetaLoteChange(e, 'id_lote')}
                  placeholder="Seleccione Lote..."
                />
              </div>
              <div>
                <label>Receta a Aplicar</label>
                <PremiumSelect
                  options={recetas.map(r => ({ value: r.id_receta, label: `${r.nombre_receta} (${r.tipo})` }))}
                  value={Number(formData.id_receta)}
                  onChange={e => handleRecetaLoteChange(e, 'id_receta')}
                  placeholder="Seleccione Receta..."
                />
              </div>
              <div>
                <label>Fecha Programada</label>
                <input type="date" className="form-control" required value={formData.fecha_programada} onChange={e => setFormData({...formData, fecha_programada: e.target.value})} />
              </div>
              <div>
                <label>Método de Aplicación</label>
                <PremiumSelect
                  options={[
                    { value: 'Tractor (Agulón)', label: 'Tractor (Agulón)' },
                    { value: 'Fumigadora de espalda', label: 'Fumigadora de espalda' },
                    { value: 'Dron', label: 'Dron' },
                    { value: 'Sistema de Riego (Fertirriego)', label: 'Sistema de Riego (Fertirriego)' }
                  ]}
                  value={formData.metodo_aplicacion}
                  onChange={e => setFormData({...formData, metodo_aplicacion: e.target.value})}
                  placeholder="Método..."
                  isClearable={false}
                />
              </div>
              <div>
                <label>Agrónomo / Responsable</label>
                <PremiumSelect
                  options={empleados.filter(e => e.cargo && (e.cargo.toLowerCase().includes('agrónomo') || e.cargo.toLowerCase().includes('agronomo') || e.cargo.toLowerCase().includes('técnico') || e.cargo.toLowerCase().includes('tecnico') || e.cargo.toLowerCase().includes('supervisor'))).map(e => ({ value: e.nombres, label: e.nombres }))}
                  value={formData.responsable_aplicacion}
                  onChange={e => setFormData({...formData, responsable_aplicacion: e.target.value})}
                  placeholder="Nombre..."
                />
              </div>
            </div>

            {formData.insumos.length > 0 && (
              <div style={{ background: 'var(--bg-color)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <h4 style={{marginBottom: '10px'}}>Insumos Requeridos (Conversión Dosis x Área)</h4>
                <table className="data-table" style={{ fontSize: '0.9em' }}>
                  <thead>
                    <tr>
                      <th>Insumo</th>
                      <th>Dosis (x Ha)</th>
                      <th>Total a Pedir</th>
                      <th>Stock Bodega</th>
                      <th>Estado / Prioridad Compra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.insumos.map((ins, i) => {
                      const stockVal = stockInventario[ins.id_insumo] || 0;
                      const req = parseFloat(ins.cantidad_proyectada);
                      const isShort = stockVal < req;
                      
                      return (
                        <tr key={i} style={{ background: isShort ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)' }}>
                          <td>{ins.nombre}</td>
                          <td>{ins.dosis_recomendada}</td>
                          <td>
                            <input type="number" step="0.01" className="form-control" value={ins.cantidad_proyectada} 
                              onChange={e => handleInsumoChange(i, 'cantidad_proyectada', e.target.value)} 
                              style={{ width: '80px', padding: '4px' }} />
                          </td>
                          <td style={{ color: isShort ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                            {stockVal}
                          </td>
                          <td>
                            {isShort ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ color: '#ef4444', fontSize: '1.2em' }}>⚠️ Falta</span>
                                <select className="form-control" value={ins.prioridad} onChange={e => handleInsumoChange(i, 'prioridad', e.target.value)} style={{ padding: '2px', width: '100px' }}>
                                  <option value="Baja">Prioridad Baja</option>
                                  <option value="Media">Prioridad Media</option>
                                  <option value="Alta">URGENTE</option>
                                </select>
                              </div>
                            ) : (
                              <span style={{ color: '#10b981' }}>✅ Suficiente</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary">Guardar Programación</button>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {!showForm && (
        <div className="card" style={{ marginBottom: '25px', padding: '0', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2em' }}>🔍</span>
            <h4 style={{ margin: 0, color: '#60A5FA' }}>Buscador Maestro de Programaciones</h4>
          </div>
          
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', background: 'rgba(0,0,0,0.15)' }}>
            <div>
              <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Fecha Desde</label>
              <input type="date" className="form-control" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px', fontSize: '1rem', borderRadius: '6px' }} value={filters.fecha_desde} onChange={e => setFilters({...filters, fecha_desde: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Fecha Hasta</label>
              <input type="date" className="form-control" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px', fontSize: '1rem', borderRadius: '6px' }} value={filters.fecha_hasta} onChange={e => setFilters({...filters, fecha_hasta: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Lote Destino</label>
              <PremiumSelect
                options={lotesAll.map(l => ({ value: l.id_lote, label: l.nombre }))}
                value={Number(filters.lote)}
                onChange={e => setFilters({...filters, lote: e.target.value})}
                placeholder="-- Todos los Lotes --"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Estado de Aplicación</label>
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
            <div>
              <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Agrónomo / Responsable</label>
              <PremiumSelect
                options={empleados.map(e => ({ value: e.nombres, label: e.nombres }))}
                value={filters.responsable}
                onChange={e => setFilters({...filters, responsable: e.target.value})}
                placeholder="-- Buscar Responsable --"
              />
            </div>
          </div>
          
          <div style={{ padding: '15px 20px', background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={fetchSchedules} disabled={loading} style={{ padding: '10px 25px', fontSize: '1.05em', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              {loading ? '⏳ Procesando...' : '⚙️ Procesar Consulta'}
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha Programada</th>
              <th>Finca / Lote</th>
              <th>Receta / Mezcla</th>
              <th>Método</th>
              <th>Responsable</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchedules.length === 0 ? (
              <tr><td colSpan="7" style={{textAlign: 'center', padding: '20px'}}>Presione 'Procesar / Buscar' para cargar las programaciones o ajuste sus filtros.</td></tr>
            ) : (
              filteredSchedules.map(s => (
                <tr key={s.id_programacion}>
                  <td>PROG-{s.id_programacion}</td>
                  <td>{new Date(s.fecha_programada).toLocaleDateString()}</td>
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
      </div>
    </div>
  );
};

export default ApplicationPlanner;
