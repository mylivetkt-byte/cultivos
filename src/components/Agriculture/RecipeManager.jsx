import React, { useState, useEffect } from 'react';
import PremiumSelect from '../PremiumSelect';
import { authFetch } from '../../utils/api.js';
import '../dashboard.css';

const RecipeManager = () => {
  const [recipes, setRecipes] = useState([]);
  const [library, setLibrary] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  const [agronomos, setAgronomos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    nombre: '',
    tipo: '',
    autor_tecnico: '',
    id_cultivo: '',
    fecha_desde: '',
    fecha_hasta: ''
  });
  
  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nombre_receta: '',
    tipo: 'Fitosanitario',
    id_cultivo: 1, // Default, would come from crop table
    id_enfermedad_plaga: '',
    id_empleado_autor: '',
    autor_tecnico: '',
    instrucciones_preparacion: '',
    recomendaciones_seguridad: '',
    detalles: []
  });

  const [currentDetalle, setCurrentDetalle] = useState({ id_insumo: '', dosis_recomendada: '', unidad_medida: 'Lts/Ha', notas: '' });

  useEffect(() => {
    // Only load the dictionaries (library, insumos, cultivos)
    const loadDicts = async () => {
      try {
        const [libRes, insRes, cultRes, empRes, recRes] = await Promise.all([
          authFetch('/api/applications/ica?tenantId=1'),
          authFetch('/api/table/insumos/data?tenantId=1'),
          authFetch('/api/table/cultivos/data?tenantId=1'),
          authFetch('/api/table/rrhh_empleados/data?tenantId=1'),
          authFetch('/api/applications/recipes')
        ]);
        if (libRes.ok) setLibrary(await libRes.json());
        if (insRes.ok) {
          const iData = await insRes.json();
          setInsumos(iData.data || []);
        }
        if (cultRes.ok) {
          const cData = await cultRes.json();
          setCultivos(cData.data || []);
        }
        if (empRes.ok) {
          const eData = await empRes.json();
          const emps = eData.data || [];
          // Filtrar por Agrónomo o Técnico
          const agroTec = emps.filter(e => e.cargo && (e.cargo.toLowerCase().includes('agrónomo') || e.cargo.toLowerCase().includes('agronomo') || e.cargo.toLowerCase().includes('técnico') || e.cargo.toLowerCase().includes('tecnico') || e.cargo.toLowerCase().includes('supervisor')));
          setAgronomos(agroTec);
        }
        if (recRes.ok) {
          const rData = await recRes.json();
          setRecipes(rData || []);
        }
      } catch (err) {
        console.error("Error cargando diccionarios:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDicts();
  }, []);

  const handleProcess = async () => {
    setLoading(true);
    try {
      const recRes = await authFetch('/api/applications/recipes');
      if (recRes.ok) {
        const allRecipes = await recRes.json();
        // Apply filters locally
        let result = allRecipes;
        if (filters.nombre) result = result.filter(r => r.nombre_receta.toLowerCase().includes(filters.nombre.toLowerCase()));
        if (filters.tipo) result = result.filter(r => r.tipo === filters.tipo);
        if (filters.autor_tecnico) result = result.filter(r => (r.autor_tecnico||'').toLowerCase().includes(filters.autor_tecnico.toLowerCase()));
        if (filters.id_cultivo) result = result.filter(r => String(r.id_cultivo) === String(filters.id_cultivo));
        if (filters.fecha_desde) result = result.filter(r => new Date(r.fecha_creacion) >= new Date(filters.fecha_desde));
        if (filters.fecha_hasta) result = result.filter(r => new Date(r.fecha_creacion) <= new Date(filters.fecha_hasta));
        
        setRecipes(allRecipes);
        setFilteredRecipes(result);
      }
    } catch (err) {
      console.error("Error fetching recipes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDetalle = () => {
    if (!currentDetalle.id_insumo || !currentDetalle.dosis_recomendada) return;
    const insumoSeleccionado = insumos.find(i => i.id_insumo === parseInt(currentDetalle.id_insumo));
    setFormData({
      ...formData,
      detalles: [...formData.detalles, { ...currentDetalle, id_insumo: parseInt(currentDetalle.id_insumo), insumo_nombre: insumoSeleccionado?.nombre }]
    });
    setCurrentDetalle({ id_insumo: '', dosis_recomendada: '', unidad_medida: 'Lts/Ha', notas: '' });
  };

  const handleRemoveDetalle = (index) => {
    const newDetalles = [...formData.detalles];
    newDetalles.splice(index, 1);
    setFormData({ ...formData, detalles: newDetalles });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/applications/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ nombre_receta: '', tipo: 'Fitosanitario', id_cultivo: 1, id_enfermedad_plaga: '', id_empleado_autor: '', autor_tecnico: '', instrucciones_preparacion: '', recomendaciones_seguridad: '', detalles: [] });
        alert("Receta guardada exitosamente. Presione 'Procesar' para actualizar la grilla.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="loading">Cargando Recetario...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Recetario Técnico y Fórmulas</h1>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>➕ Crear Nueva Receta</button>
      </div>

      <div className="card" style={{ marginBottom: '25px', padding: '0', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2em' }}>🔍</span>
          <h4 style={{ margin: 0, color: '#60A5FA' }}>Buscador Maestro de Recetas y Fórmulas</h4>
        </div>
        
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', background: 'rgba(0,0,0,0.15)' }}>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Nombre Receta</label>
            <PremiumSelect
              options={Array.from(new Set(recipes.map(r => r.nombre_receta))).map(n => ({ value: n, label: n }))}
              value={filters.nombre}
              onChange={e => setFilters({...filters, nombre: e.target.value})}
              placeholder="-- Seleccione Receta --"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Tipo</label>
            <PremiumSelect
              options={[
                { value: 'Fitosanitario', label: 'Fitosanitario' },
                { value: 'Fertilización', label: 'Fertilización' }
              ]}
              value={filters.tipo}
              onChange={e => setFilters({...filters, tipo: e.target.value})}
              placeholder="-- Todos los Tipos --"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Cultivo Objetivo</label>
            <PremiumSelect
              options={cultivos.map(c => ({ value: c.id_cultivo, label: c.nombre }))}
              value={Number(filters.id_cultivo)}
              onChange={e => setFilters({...filters, id_cultivo: e.target.value})}
              placeholder="-- Todos los Cultivos --"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Agrónomo / Autor</label>
            <PremiumSelect
              options={agronomos.map(a => ({ value: a.nombres, label: a.nombres }))}
              value={filters.autor_tecnico}
              onChange={e => setFilters({...filters, autor_tecnico: e.target.value})}
              placeholder="-- Todos los Agrónomos --"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Fecha Creación Desde</label>
            <input type="date" className="form-control" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px', fontSize: '1rem', borderRadius: '6px' }} value={filters.fecha_desde} onChange={e => setFilters({...filters, fecha_desde: e.target.value})} />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Fecha Creación Hasta</label>
            <input type="date" className="form-control" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px', fontSize: '1rem', borderRadius: '6px' }} value={filters.fecha_hasta} onChange={e => setFilters({...filters, fecha_hasta: e.target.value})} />
          </div>
        </div>
        
        <div style={{ padding: '15px 20px', background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleProcess} disabled={loading} style={{ padding: '10px 25px', fontSize: '1.05em', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            {loading ? '⏳ Procesando...' : '⚙️ Procesar Consulta'}
          </button>
        </div>
      </div>

      <div className="card-grid">
        {filteredRecipes.length === 0 ? (
          <div style={{ padding: '20px', gridColumn: '1 / -1', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '8px' }}>
            Presione 'Procesar / Buscar' para ver resultados o ajuste sus filtros.
          </div>
        ) : (
        filteredRecipes.map(r => (
          <div key={r.id_receta} className="card" style={{ borderTop: `4px solid ${r.tipo === 'Fitosanitario' ? '#EF4444' : '#10B981'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary)' }}>{r.nombre_receta}</h3>
              <span style={{ fontSize: '0.8em', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>{r.tipo}</span>
            </div>
            {r.plaga_enfermedad && (
              <div style={{ fontSize: '0.9em', color: '#FCD34D', marginBottom: '10px' }}>
                🛡️ Objetivo: {r.plaga_enfermedad}
              </div>
            )}
            {r.cultivo_nombre && (
              <div style={{ fontSize: '0.9em', color: '#10B981', marginBottom: '10px' }}>
                🌱 Cultivo: {r.cultivo_nombre}
              </div>
            )}
            <p style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Autor: {r.autor_tecnico}</p>
            
            <div style={{ marginTop: '15px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
              <strong>Insumos de la Mezcla:</strong>
              <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px', fontSize: '0.9em' }}>
                {r.detalles?.map(d => (
                  <li key={d.id_detalle}>
                    {d.insumo_nombre} - <strong style={{ color: 'var(--primary-light)' }}>{d.dosis_recomendada} {d.unidad_medida}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <h2>Crear Receta Agrícola</h2>
            <form onSubmit={handleSubmit} className="form-grid">
              
              <div className="form-group">
                <label>Nombre de la Receta</label>
                <input required type="text" value={formData.nombre_receta} onChange={e => setFormData({...formData, nombre_receta: e.target.value})} />
              </div>
              
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ color: 'var(--text-secondary)' }}>Tipo</label>
                <PremiumSelect
                  options={[{ value: 'Fitosanitario', label: 'Fitosanitario' }, { value: 'Fertilización', label: 'Fertilización' }]}
                  value={formData.tipo}
                  onChange={e => setFormData({...formData, tipo: e.target.value})}
                  placeholder="-- Seleccione --"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ color: 'var(--text-secondary)' }}>Cultivo Objetivo</label>
                <PremiumSelect
                  options={cultivos.map(c => ({ value: c.id_cultivo, label: c.nombre }))}
                  value={Number(formData.id_cultivo)}
                  onChange={e => setFormData({...formData, id_cultivo: e.target.value})}
                  placeholder="-- Seleccione --"
                  isClearable={false}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ color: 'var(--text-secondary)' }}>Enfermedad o Plaga</label>
                <PremiumSelect
                  options={library.map(l => ({ value: l.id_enfermedad_plaga, label: l.nombre_comun }))}
                  value={formData.id_enfermedad_plaga}
                  onChange={e => setFormData({...formData, id_enfermedad_plaga: e.target.value || null})}
                  placeholder="-- Ninguna Específica --"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ color: 'var(--text-secondary)' }}>Agrónomo / Autor</label>
                <PremiumSelect
                  options={agronomos.map(a => ({ value: a.nombres, label: a.nombres }))}
                  value={formData.autor_tecnico}
                  onChange={e => setFormData({...formData, autor_tecnico: e.target.value})}
                  placeholder="-- Seleccione --"
                />
              </div>

              <div className="form-group full-width" style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <h4>Añadir Insumos a la Mezcla</h4>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '10px' }}>
                  <div style={{ flex: 2 }}>
                    <label>Producto / Insumo</label>
                    <PremiumSelect
                      options={insumos.map(i => ({ value: i.id_insumo, label: i.nombre }))}
                      value={Number(currentDetalle.id_insumo)}
                      onChange={e => setCurrentDetalle({...currentDetalle, id_insumo: e.target.value})}
                      placeholder="-- Buscar Insumo --"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Dosis Recomendada</label>
                    <input type="number" step="0.01" value={currentDetalle.dosis_recomendada} onChange={e => setCurrentDetalle({...currentDetalle, dosis_recomendada: e.target.value})} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Unidad</label>
                    <PremiumSelect 
                      value={currentDetalle.unidad_medida} 
                      onChange={e => setCurrentDetalle({...currentDetalle, unidad_medida: e.target.value})}
                      options={[
                        { value: 'Lts/Ha', label: 'Lts/Ha' },
                        { value: 'Kg/Ha', label: 'Kg/Ha' },
                        { value: 'Gr/Planta', label: 'Gr/Planta' },
                        { value: 'ml/Ltr', label: 'ml/Ltr' }
                      ]}
                      isClearable={false}
                    />
                  </div>
                  <button type="button" className="btn btn-outline" onClick={handleAddDetalle}>Añadir</button>
                </div>
                
                {formData.detalles.length > 0 && (
                  <table className="data-table" style={{ marginTop: '10px' }}>
                    <thead><tr><th>Insumo</th><th>Dosis</th><th>Acción</th></tr></thead>
                    <tbody>
                      {formData.detalles.map((d, i) => (
                        <tr key={i}>
                          <td>{d.insumo_nombre}</td>
                          <td>{d.dosis_recomendada} {d.unidad_medida}</td>
                          <td><button type="button" onClick={() => handleRemoveDetalle(i)} style={{background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer'}}>✖</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="form-group full-width">
                <label>Instrucciones de Preparación</label>
                <textarea rows="3" value={formData.instrucciones_preparacion} onChange={e => setFormData({...formData, instrucciones_preparacion: e.target.value})}></textarea>
              </div>

              <div className="form-group full-width">
                <label>Recomendaciones de Seguridad (EPP)</label>
                <textarea rows="2" value={formData.recomendaciones_seguridad} onChange={e => setFormData({...formData, recomendaciones_seguridad: e.target.value})}></textarea>
              </div>

              <div className="form-group full-width" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={formData.detalles.length === 0}>Guardar Receta</button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeManager;
