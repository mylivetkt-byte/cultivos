import React, { useState, useEffect } from 'react';
import '../dashboard.css';
import { authFetch } from '../../utils/api';
import PremiumSelect from '../PremiumSelect';
import ExportButtons from '../ExportButtons';
import { useAuth } from '../../context/AuthContext';

const SiembrasManager = () => {
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [siembras, setSiembras] = useState([]);
  
  // Catalogs for lookup and filtering
  const [fincas, setFincas] = useState([]);
  const [nucleos, setNucleos] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  const [variedades, setVariedades] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    finca: '',
    nucleo: '',
    lote: '',
    cultivo: '',
    variedad: '',
    fecha_desde: '',
    fecha_hasta: ''
  });

  const [processedData, setProcessedData] = useState([]);
  const [hasProcessed, setHasProcessed] = useState(false);

  // New Record State
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newRecord, setNewRecord] = useState({
    id_lote: '',
    id_cultivo: '',
    id_variedad: '',
    fecha_siembra: '',
    hectareas_sembradas: '',
    densidad_siembra: '',
    cantidad_plantas: '',
    sistema_riego_establecido: '',
    lote_procedencia_plantulas: '',
    observaciones: '',
    estado: 'Activo'
  });

  useEffect(() => {
    if (tenantId) {
      loadCatalogs();
    }
  }, [tenantId]);

  const loadCatalogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [resFincas, resNucleos, resLotes, resCultivos, resVariedades] = await Promise.all([
        authFetch(`/api/table/fincas/data?tenantId=${tenantId}&pageSize=500`, { headers }),
        authFetch(`/api/table/nucleos/data?tenantId=${tenantId}&pageSize=500`, { headers }),
        authFetch(`/api/table/lotes/data?tenantId=${tenantId}&pageSize=500`, { headers }),
        authFetch(`/api/table/cultivos/data?pageSize=500`, { headers }),
        authFetch(`/api/table/variedades/data?pageSize=500`, { headers })
      ]);
      
      const [dataFincas, dataNucleos, dataLotes, dataCultivos, dataVariedades] = await Promise.all([
        resFincas.json(), resNucleos.json(), resLotes.json(), resCultivos.json(), resVariedades.json()
      ]);

      setFincas(dataFincas.data || []);
      setNucleos(dataNucleos.data || []);
      setLotes(dataLotes.data || []);
      setCultivos(dataCultivos.data || []);
      setVariedades(dataVariedades.data || []);
      
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
      
      let url = `/api/table/siembras/data?tenantId=${tenantId}&pageSize=1000`;
      
      const response = await authFetch(url, { headers });
      const data = await response.json();
      let records = data.data || [];
      
      // Apply filters locally (or backend if supported)
      if (filters.lote) {
        const loteObj = lotes.find(l => l.nombre === filters.lote);
        if (loteObj) records = records.filter(r => r.id_lote === loteObj.id_lote);
      }
      
      if (filters.cultivo) {
        const cultObj = cultivos.find(c => c.nombre === filters.cultivo);
        if (cultObj) records = records.filter(r => r.id_cultivo === cultObj.id_cultivo);
      }
      
      if (filters.variedad) {
        const varObj = variedades.find(v => v.nombre === filters.variedad);
        if (varObj) records = records.filter(r => r.id_variedad === varObj.id_variedad);
      }
      
      if (filters.fecha_desde) {
        records = records.filter(r => new Date(r.fecha_siembra) >= new Date(filters.fecha_desde));
      }
      
      if (filters.fecha_hasta) {
        records = records.filter(r => new Date(r.fecha_siembra) <= new Date(filters.fecha_hasta));
      }

      setProcessedData(records);
      setHasProcessed(true);
    } catch (err) {
      console.error('Error procesando siembras:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLoteName = (id) => {
    const l = lotes.find(l => l.id_lote === id);
    return l ? l.nombre : id;
  };

  const getCultivoName = (id) => {
    const c = cultivos.find(c => c.id_cultivo === id);
    return c ? c.nombre : id;
  };

  const getVariedadName = (id) => {
    if (!id) return 'N/A';
    const v = variedades.find(v => v.id_variedad === id);
    return v ? v.nombre : id;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newRecord.id_lote || !newRecord.id_cultivo || !newRecord.fecha_siembra || !newRecord.hectareas_sembradas) {
      alert("Por favor complete todos los campos obligatorios (*).");
      return;
    }

    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');
      const payload = {
        ...newRecord,
        id_tenant: tenantId,
        id_variedad: newRecord.id_variedad || null,
        densidad_siembra: newRecord.densidad_siembra || null,
        cantidad_plantas: newRecord.cantidad_plantas || null,
        sistema_riego_establecido: newRecord.sistema_riego_establecido || null,
        lote_procedencia_plantulas: newRecord.lote_procedencia_plantulas || null,
        observaciones: newRecord.observaciones || null
      };

      const response = await authFetch('/api/table/siembras', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al guardar la siembra');
      }

      alert("Siembra registrada exitosamente.");
      setShowModal(false);
      setNewRecord({
        id_lote: '', id_cultivo: '', id_variedad: '', fecha_siembra: '',
        hectareas_sembradas: '', densidad_siembra: '', cantidad_plantas: '',
        sistema_riego_establecido: '', lote_procedencia_plantulas: '', observaciones: '', estado: 'Activo'
      });
      if (hasProcessed) handleProcess(); // Refresh
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const exportColumns = [
    { header: 'ID Siembra', getter: s => `SMB-${s.id_siembra}` },
    { header: 'Fecha Siembra', getter: s => s.fecha_siembra ? new Date(s.fecha_siembra).toLocaleDateString() : 'N/A' },
    { header: 'Lote', getter: s => getLoteName(s.id_lote) },
    { header: 'Cultivo', getter: s => getCultivoName(s.id_cultivo) },
    { header: 'Variedad', getter: s => getVariedadName(s.id_variedad) },
    { header: 'Hectáreas', getter: s => s.hectareas_sembradas || '0' },
    { header: 'Plantas', getter: s => s.cantidad_plantas || 'N/A' },
    { header: 'Densidad (pl/ha)', getter: s => s.densidad_siembra || 'N/A' },
    { header: 'Estado', getter: s => s.estado || 'Activo' }
  ];

  if (loading && !hasProcessed) return <div className="loading">Cargando Módulo de Siembras...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Registro de Siembras</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gestión e historial detallado de plantaciones y cultivos</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ padding: '10px 20px', fontSize: '1.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ➕ Nueva Siembra
        </button>
      </div>

      <div className="card" style={{ marginBottom: '25px', padding: '0', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2em' }}>🔍</span>
          <h4 style={{ margin: 0, color: '#60A5FA' }}>Buscador Maestro de Siembras</h4>
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
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Cultivo</label>
            <PremiumSelect
              options={cultivos.map(c => ({ value: c.nombre, label: c.nombre }))}
              value={filters.cultivo}
              onChange={e => setFilters({...filters, cultivo: e.target.value})}
              placeholder="-- Todos los Cultivos --"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Variedad</label>
            <PremiumSelect
              options={variedades.map(v => ({ value: v.nombre, label: v.nombre }))}
              value={filters.variedad}
              onChange={e => setFilters({...filters, variedad: e.target.value})}
              placeholder="-- Todas las Variedades --"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Fecha Desde</label>
            <input type="date" className="form-control" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px', fontSize: '1rem', borderRadius: '6px' }} value={filters.fecha_desde} onChange={e => setFilters({...filters, fecha_desde: e.target.value})} />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Fecha Hasta</label>
            <input type="date" className="form-control" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px', fontSize: '1rem', borderRadius: '6px' }} value={filters.fecha_hasta} onChange={e => setFilters({...filters, fecha_hasta: e.target.value})} />
          </div>
        </div>
        
        <div style={{ padding: '15px 20px', background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <ExportButtons data={processedData} columns={exportColumns} filename="Reporte_Siembras" />
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
              <th>ID Siembra</th>
              <th>Fecha Siembra</th>
              <th>Lote</th>
              <th>Cultivo</th>
              <th>Variedad</th>
              <th>Hectáreas</th>
              <th>Plantas / Densidad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {!hasProcessed ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Presione 'Procesar Consulta' para cargar los registros de siembra.
                </td>
              </tr>
            ) : processedData.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No se encontraron siembras con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              processedData.map(s => (
                <tr key={s.id_siembra}>
                  <td><strong>SMB-{s.id_siembra}</strong></td>
                  <td>{s.fecha_siembra ? new Date(s.fecha_siembra).toLocaleDateString() : 'N/A'}</td>
                  <td>{getLoteName(s.id_lote)}</td>
                  <td>{getCultivoName(s.id_cultivo)}</td>
                  <td style={{ color: '#FCD34D', fontWeight: 'bold' }}>{getVariedadName(s.id_variedad)}</td>
                  <td>{s.hectareas_sembradas || '0'} HA</td>
                  <td>{s.cantidad_plantas || 'N/A'} ({s.densidad_siembra || 'N/A'} pl/ha)</td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.85em',
                      fontWeight: 'bold',
                      background: s.estado === 'Activo' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.1)',
                      color: s.estado === 'Activo' ? '#34D399' : '#fff'
                    }}>
                      {s.estado || 'Activo'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h2>Registrar Nueva Siembra</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Lote / Potrero <span style={{ color: '#EF4444' }}>*</span></label>
                  <select 
                    className="form-control" 
                    value={newRecord.id_lote} 
                    onChange={e => setNewRecord({...newRecord, id_lote: e.target.value})} 
                    required
                  >
                    <option value="">-- Seleccione Lote --</option>
                    {lotes.map(l => <option key={l.id_lote} value={l.id_lote}>{l.nombre}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Cultivo <span style={{ color: '#EF4444' }}>*</span></label>
                  <select 
                    className="form-control" 
                    value={newRecord.id_cultivo} 
                    onChange={e => setNewRecord({...newRecord, id_cultivo: e.target.value})} 
                    required
                  >
                    <option value="">-- Seleccione Cultivo --</option>
                    {cultivos.map(c => <option key={c.id_cultivo} value={c.id_cultivo}>{c.nombre}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Variedad (Opcional)</label>
                  <select 
                    className="form-control" 
                    value={newRecord.id_variedad} 
                    onChange={e => setNewRecord({...newRecord, id_variedad: e.target.value})}
                  >
                    <option value="">-- Seleccione Variedad --</option>
                    {variedades.map(v => <option key={v.id_variedad} value={v.id_variedad}>{v.nombre}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Fecha de Siembra <span style={{ color: '#EF4444' }}>*</span></label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={newRecord.fecha_siembra} 
                    onChange={e => setNewRecord({...newRecord, fecha_siembra: e.target.value})} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Hectáreas Sembradas <span style={{ color: '#EF4444' }}>*</span></label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-control" 
                    value={newRecord.hectareas_sembradas} 
                    onChange={e => setNewRecord({...newRecord, hectareas_sembradas: e.target.value})} 
                    required 
                    placeholder="Ej. 10.5"
                  />
                </div>

                <div className="form-group">
                  <label>Densidad de Siembra (pl/ha) (Opcional)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={newRecord.densidad_siembra} 
                    onChange={e => setNewRecord({...newRecord, densidad_siembra: e.target.value})} 
                    placeholder="Ej. 10000"
                  />
                </div>

                <div className="form-group">
                  <label>Cantidad de Plantas (Opcional)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={newRecord.cantidad_plantas} 
                    onChange={e => setNewRecord({...newRecord, cantidad_plantas: e.target.value})} 
                    placeholder="Total de plantas"
                  />
                </div>

                <div className="form-group">
                  <label>Sistema de Riego (Opcional)</label>
                  <select 
                    className="form-control" 
                    value={newRecord.sistema_riego_establecido} 
                    onChange={e => setNewRecord({...newRecord, sistema_riego_establecido: e.target.value})}
                  >
                    <option value="">-- Sin Definir --</option>
                    <option value="Goteo">Goteo</option>
                    <option value="Aspersion">Aspersión</option>
                    <option value="Surcos">Surcos</option>
                    <option value="Gravitacional">Gravitacional</option>
                    <option value="Secano">Secano</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Lote Procedencia Plántulas (Opcional)</label>
                  <select 
                    className="form-control" 
                    value={newRecord.lote_procedencia_plantulas} 
                    onChange={e => setNewRecord({...newRecord, lote_procedencia_plantulas: e.target.value})}
                  >
                    <option value="">-- Externo / No aplica --</option>
                    {lotes.map(l => <option key={l.id_lote} value={l.id_lote}>{l.nombre}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Estado</label>
                  <select 
                    className="form-control" 
                    value={newRecord.estado} 
                    onChange={e => setNewRecord({...newRecord, estado: e.target.value})}
                  >
                    <option value="Activo">Activo</option>
                    <option value="Cosechado">Cosechado</option>
                    <option value="Perdido">Perdido</option>
                    <option value="Abandonado">Abandonado</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group" style={{ marginTop: '15px' }}>
                <label>Observaciones (Opcional)</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  value={newRecord.observaciones} 
                  onChange={e => setNewRecord({...newRecord, observaciones: e.target.value})} 
                  placeholder="Detalles adicionales sobre la siembra..."
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '25px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)} disabled={isSaving}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Guardando...' : '💾 Guardar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiembrasManager;
