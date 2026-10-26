import React, { useState, useEffect } from 'react';
import DatePickerClaro from '../Common/DatePickerClaro';
import '../dashboard.css';
import { authFetch } from '../../utils/api';
import PremiumSelect from '../PremiumSelect';
import ExportButtons from '../ExportButtons';
import { useAuth } from '../../context/AuthContext';
import AsistenteSiembraCampesina from './AsistenteSiembraCampesina';

const SiembrasManager = () => {
  const { tenantId } = useAuth();
  const [showAsistenteCampesino, setShowAsistenteCampesino] = useState(false);
  const [loading, setLoading] = useState(true);
  const [siembras, setSiembras] = useState([]);
  
  // Catalogs for lookup and filtering
  const [fincas, setFincas] = useState([]);
  const [nucleos, setNucleos] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  const [variedades, setVariedades] = useState([]);
  const [viveros, setViveros] = useState([]);
  
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // New Record State
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newRecord, setNewRecord] = useState({
    id_lote: '',
    id_cultivo: '',
    id_variedad: '',
    fecha_siembra: '',
    hectareas_sembradas: '',
    densidad_siembra: '',
    cantidad_plantas: '',
    sistema_riego_establecido: '',
    origen_plantulas: 'Interno',
    id_vivero_interno: '',
    remision_vivero: '',
    proveedor_externo: '',
    observaciones: '',
    estado: 'Activo'
  });

  const [simulationParams, setSimulationParams] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [showSimulationModal, setShowSimulationModal] = useState(false);

  useEffect(() => {
    if (tenantId) {
      loadCatalogs();
    }
  }, [tenantId]);

  const loadCatalogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [resFincas, resNucleos, resLotes, resCultivos, resVariedades, resViveros] = await Promise.all([
        authFetch(`/api/table/fincas/data?tenantId=${tenantId}&pageSize=500`, { headers }),
        authFetch(`/api/table/nucleos/data?tenantId=${tenantId}&pageSize=500`, { headers }),
        authFetch(`/api/table/lotes/data?tenantId=${tenantId}&pageSize=500`, { headers }),
        authFetch(`/api/table/cultivos/data?pageSize=500`, { headers }),
        authFetch(`/api/table/variedades/data?pageSize=500`, { headers }),
        authFetch(`/api/table/viveros/data?tenantId=${tenantId}&pageSize=500`, { headers })
      ]);
      
      const [dataFincas, dataNucleos, dataLotes, dataCultivos, dataVariedades, dataViveros] = await Promise.all([
        resFincas.json(), resNucleos.json(), resLotes.json(), resCultivos.json(), resVariedades.json(), resViveros.json()
      ]);

      setFincas(dataFincas.data || []);
      setNucleos(dataNucleos.data || []);
      setLotes(dataLotes.data || []);
      setCultivos(dataCultivos.data || []);
      setVariedades(dataVariedades.data || []);
      setViveros(dataViveros.data || []);
      
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
      setCurrentPage(1); // Reset page on new search
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

  const handleEdit = (record) => {
    setEditingId(record.id_siembra);
    setNewRecord({
      id_lote: record.id_lote || '',
      id_cultivo: record.id_cultivo || '',
      id_variedad: record.id_variedad || '',
      fecha_siembra: record.fecha_siembra ? record.fecha_siembra.split('T')[0] : '',
      hectareas_sembradas: record.hectareas_sembradas || '',
      densidad_siembra: record.densidad_siembra || '',
      cantidad_plantas: record.cantidad_plantas || '',
      sistema_riego_establecido: record.sistema_riego_establecido || '',
      origen_plantulas: record.origen_plantulas || 'Interno',
      id_vivero_interno: record.id_vivero_interno || '',
      remision_vivero: record.remision_vivero || '',
      proveedor_externo: record.proveedor_externo || '',
      observaciones: record.observaciones || '',
      estado: record.estado || 'Activo'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que desea eliminar esta siembra? Se perderá el historial asociado.")) return;
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`/api/table/siembras/data/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al eliminar');
      }
      setProcessedData(prev => prev.filter(r => r.id_siembra !== id));
      alert("Registro eliminado exitosamente.");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
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
        origen_plantulas: newRecord.origen_plantulas,
        id_vivero_interno: newRecord.origen_plantulas === 'Interno' ? (newRecord.id_vivero_interno || null) : null,
        remision_vivero: newRecord.origen_plantulas === 'Interno' ? (newRecord.remision_vivero || null) : null,
        proveedor_externo: newRecord.origen_plantulas === 'Externo' ? (newRecord.proveedor_externo || null) : null,
        observaciones: newRecord.observaciones || null
      };

      const url = editingId ? `/api/table/siembras/data/${editingId}` : '/api/table/siembras/data';
      const method = editingId ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method: method,
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

      const siembraResponseData = await response.json();
      
      const savedId = editingId || siembraResponseData.id || siembraResponseData.id_siembra;

      // Guardar el presupuesto si tenemos una simulación
      if (simulationResult && savedId) {
        try {
          await authFetch('/api/agricultura_simulador/guardar-presupuesto', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id_siembra: savedId,
              tenantId: tenantId,
              presupuesto_detallado: simulationResult.presupuesto_detallado
            })
          });
        } catch(err) {
          console.error("Error guardando presupuesto", err);
        }
      }

      alert(editingId ? "Siembra actualizada exitosamente." : "Siembra registrada exitosamente.");
      setShowModal(false);
      setEditingId(null);
      setSimulationParams(null);
      setSimulationResult(null);
      setNewRecord({
        id_lote: '', id_cultivo: '', id_variedad: '', fecha_siembra: '',
        hectareas_sembradas: '', densidad_siembra: '', cantidad_plantas: '',
        sistema_riego_establecido: '', origen_plantulas: 'Interno', id_vivero_interno: '', remision_vivero: '', proveedor_externo: '', observaciones: '', estado: 'Activo'
      });
      if (hasProcessed) handleProcess(); // Refresh
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSimular = async () => {
    if (!newRecord.hectareas_sembradas || !newRecord.id_cultivo) {
       alert("Debe seleccionar un lote (con hectáreas) y un cultivo para simular.");
       return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch('/api/agricultura_simulador/simular', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hectareas: newRecord.hectareas_sembradas,
          id_cultivo: newRecord.id_cultivo,
          parametros: simulationParams || {}
        })
      });
      const data = await response.json();
      setSimulationResult(data);
      setShowSimulationModal(true);
      
      // Auto-fill form based on agronomic data
      if (data.datos_agronomicos) {
         setNewRecord(prev => ({
           ...prev,
           cantidad_plantas: data.datos_agronomicos.plantas_requeridas_con_margen,
           densidad_siembra: Math.floor(data.datos_agronomicos.plantas_requeridas_con_margen / parseFloat(newRecord.hectareas_sembradas))
         }));
      }
    } catch(err) {
      alert("Error en simulación: " + err.message);
    }
  };

  const handleLoteChange = (e) => {
    const idLote = e.target.value;
    const loteInfo = lotes.find(l => String(l.id_lote) === String(idLote));
    setNewRecord(prev => ({
      ...prev,
      id_lote: idLote,
      hectareas_sembradas: loteInfo?.hectareas ? loteInfo.hectareas : prev.hectareas_sembradas
    }));
  };

  const handleCultivoChange = async (e) => {
    const idCultivo = e.target.value;
    setNewRecord(prev => ({ ...prev, id_cultivo: idCultivo }));
    if (!idCultivo) return;
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`/api/agricultura_simulador/parametros/${idCultivo}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setSimulationParams(data);
    } catch(err) {
      console.error(err);
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

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(processedData.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  if (loading && !hasProcessed) return <div className="loading">Cargando Módulo de Siembras...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Registro de Siembras</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gestión e historial detallado de plantaciones y cultivos</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className="btn" 
            onClick={() => setShowAsistenteCampesino(true)} 
            style={{ 
              padding: '10px 18px', 
              fontSize: '0.98em', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#fff',
              border: '1px solid #10b981',
              borderRadius: '8px',
              fontWeight: 'bold',
              boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
              cursor: 'pointer'
            }}
          >
            🌾 Escuela de Campo: Iniciar Lote y Siembra (Altitud/Suelo)
          </button>
          <button className="btn btn-primary" onClick={() => {
            setEditingId(null);
            setNewRecord({
              id_lote: '', id_cultivo: '', id_variedad: '', fecha_siembra: '',
              hectareas_sembradas: '', densidad_siembra: '', cantidad_plantas: '',
              sistema_riego_establecido: '', origen_plantulas: 'Interno', id_vivero_interno: '', remision_vivero: '', proveedor_externo: '', observaciones: '', estado: 'Activo'
            });
            setShowModal(true);
          }} style={{ padding: '10px 20px', fontSize: '1.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ➕ Nueva Siembra Rápida
          </button>
        </div>
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
            <DatePickerClaro className="form-control" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px', fontSize: '1rem', borderRadius: '6px' }} value={filters.fecha_desde} onChange={e => setFilters({...filters, fecha_desde: e.target.value})} />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Fecha Hasta</label>
            <DatePickerClaro className="form-control" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px', fontSize: '1rem', borderRadius: '6px' }} value={filters.fecha_hasta} onChange={e => setFilters({...filters, fecha_hasta: e.target.value})} />
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

      <div className="card table-scroll" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID Siembra</th>
              <th>Fecha Siembra</th>
              <th>Lote</th>
              <th>Cultivo</th>
              <th>Variedad</th>
              <th>Origen Plántula</th>
              <th>Hectáreas</th>
              <th>Plantas / Densidad</th>
              <th>Estado</th>
              <th className="col-actions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!hasProcessed ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Presione 'Procesar Consulta' para cargar los registros de siembra.
                </td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No se encontraron siembras con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              currentItems.map(s => (
                <tr key={s.id_siembra}>
                  <td><strong>SMB-{s.id_siembra}</strong></td>
                  <td>{s.fecha_siembra ? new Date(s.fecha_siembra).toLocaleDateString() : 'N/A'}</td>
                  <td>{getLoteName(s.id_lote)}</td>
                  <td>{getCultivoName(s.id_cultivo)}</td>
                  <td style={{ color: '#FCD34D', fontWeight: 'bold' }}>{getVariedadName(s.id_variedad)}</td>
                  <td>
                    {s.origen_plantulas === 'Externo' ? (
                      <span style={{color: '#F87171'}}>Externo: {s.proveedor_externo || 'N/A'}</span>
                    ) : (
                      <span style={{color: '#34D399'}}>Interno: {viveros.find(v => v.id_vivero === s.id_vivero_interno)?.nombre || 'N/A'} {s.remision_vivero ? `(Rem: ${s.remision_vivero})` : ''}</span>
                    )}
                  </td>
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
                  <td className="cell-actions-col">
                    <div className="cell-actions">
                      <button className="btn btn-outline btn-sm btn-edit" onClick={() => handleEdit(s)}>
                        ✏️ <span className="btn-text">Editar</span>
                      </button>
                      <button className="btn btn-outline btn-sm btn-delete" onClick={() => handleDelete(s.id_siembra)}>
                        🗑️ <span className="btn-text">Eliminar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {hasProcessed && processedData.length > 0 && (
          <div className="table-footer">
            <div className="table-info">
              Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, processedData.length)} de {processedData.length} registros
              <select 
                style={{ marginLeft: '10px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 5px' }}
                value={itemsPerPage}
                onChange={e => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10 por página</option>
                <option value={15}>15 por página</option>
                <option value={30}>30 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
            </div>
            <div className="pagination">
              <button 
                className="page-btn" 
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                &lt;
              </button>
              
              {/* Simple page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Show a window of 5 pages around the current page
                let pageNum = currentPage - 2 + i;
                if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                
                if (pageNum > 0 && pageNum <= totalPages) {
                  return (
                    <button 
                      key={pageNum}
                      className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                }
                return null;
              })}

              <button 
                className="page-btn" 
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar Siembra' : 'Registrar Nueva Siembra'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Lote / Potrero <span style={{ color: '#EF4444' }}>*</span></label>
                  <PremiumSelect
                    value={newRecord.id_lote} 
                    onChange={handleLoteChange} 
                    options={lotes.map(l => ({ value: l.id_lote, label: l.nombre }))}
                    placeholder="-- Seleccione Lote --"
                  />
                </div>

                <div className="form-group">
                  <label>Cultivo <span style={{ color: '#EF4444' }}>*</span></label>
                  <PremiumSelect
                    value={newRecord.id_cultivo} 
                    onChange={handleCultivoChange} 
                    options={cultivos.map(c => ({ value: c.id_cultivo, label: c.nombre }))}
                    placeholder="-- Seleccione Cultivo --"
                  />
                </div>

                <div className="form-group">
                  <label>Variedad (Opcional)</label>
                  <PremiumSelect
                    value={newRecord.id_variedad} 
                    onChange={e => setNewRecord({...newRecord, id_variedad: e.target.value})}
                    options={variedades.map(v => ({ value: v.id_variedad, label: v.nombre }))}
                    placeholder="-- Seleccione Variedad --"
                  />
                </div>

                <div className="form-group">
                  <label>Fecha de Siembra <span style={{ color: '#EF4444' }}>*</span></label>
                  <DatePickerClaro className="form-control" 
                    value={newRecord.fecha_siembra} 
                    onChange={e => setNewRecord({...newRecord, fecha_siembra: e.target.value})} 
                    required />
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
                  <PremiumSelect
                    value={newRecord.sistema_riego_establecido} 
                    onChange={e => setNewRecord({...newRecord, sistema_riego_establecido: e.target.value})}
                    options={[
                      { value: 'Goteo', label: 'Goteo' },
                      { value: 'Aspersion', label: 'Aspersión' },
                      { value: 'Surcos', label: 'Surcos' },
                      { value: 'Gravitacional', label: 'Gravitacional' },
                      { value: 'Secano', label: 'Secano' }
                    ]}
                    placeholder="-- Sin Definir --"
                  />
                </div>

                <div className="form-group">
                  <label>Origen de Plántulas <span style={{ color: '#EF4444' }}>*</span></label>
                  <PremiumSelect
                    value={newRecord.origen_plantulas} 
                    onChange={e => setNewRecord({...newRecord, origen_plantulas: e.target.value})}
                    options={[
                      { value: 'Interno', label: 'Vivero Interno' },
                      { value: 'Externo', label: 'Proveedor Externo' }
                    ]}
                  />
                </div>

                {newRecord.origen_plantulas === 'Interno' && (
                  <>
                    <div className="form-group">
                      <label>Seleccionar Vivero</label>
                      <PremiumSelect
                        value={newRecord.id_vivero_interno} 
                        onChange={e => setNewRecord({...newRecord, id_vivero_interno: e.target.value})}
                        options={viveros.map(v => ({ value: v.id_vivero, label: v.nombre }))}
                        placeholder="-- Seleccione Vivero --"
                      />
                    </div>
                    <div className="form-group">
                      <label>N° Remisión (Opcional)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={newRecord.remision_vivero} 
                        onChange={e => setNewRecord({...newRecord, remision_vivero: e.target.value})} 
                        placeholder="Ej. REM-2026-001"
                      />
                    </div>
                  </>
                )}

                {newRecord.origen_plantulas === 'Externo' && (
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Proveedor Externo</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={newRecord.proveedor_externo} 
                      onChange={e => setNewRecord({...newRecord, proveedor_externo: e.target.value})} 
                      placeholder="Nombre de la empresa o vivero externo"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Estado</label>
                  <PremiumSelect
                    value={newRecord.estado} 
                    onChange={e => setNewRecord({...newRecord, estado: e.target.value})}
                    options={[
                      { value: 'Activo', label: 'Activo' },
                      { value: 'Cosechado', label: 'Cosechado' },
                      { value: 'Perdido', label: 'Perdido' },
                      { value: 'Abandonado', label: 'Abandonado' }
                    ]}
                  />
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

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <button type="button" className="btn btn-warning" onClick={handleSimular} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🧠 Simular Presiembra y Costos
                </button>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)} disabled={isSaving}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>
                    {isSaving ? 'Guardando...' : '💾 Guardar Registro'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSimulationModal && simulationResult && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ maxWidth: '700px', width: '90%' }}>
            <div className="modal-header">
              <h2 style={{ color: '#FCD34D' }}>🧠 Informe del Simulador Inteligente</h2>
              <button className="close-btn" onClick={() => setShowSimulationModal(false)}>&times;</button>
            </div>
            <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <h4 style={{ color: '#10b981', margin: '0 0 10px 0' }}>🌱 Optimización Agronómica</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.95em' }}>
                  <div><strong>Plantas Teóricas:</strong> {simulationResult.datos_agronomicos.plantas_teoricas.toLocaleString()}</div>
                  <div><strong>Ciclo Estimado:</strong> {simulationResult.datos_agronomicos.ciclo_dias} días</div>
                  <div><strong style={{ color: '#FCD34D' }}>Plantas Requeridas (+Margen):</strong> {simulationResult.datos_agronomicos.plantas_requeridas_con_margen.toLocaleString()}</div>
                  <div><strong>Producción Estimada:</strong> {simulationResult.datos_agronomicos.produccion_estimada_kg.toLocaleString()} Kg</div>
                </div>
              </div>

              <h4 style={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>💰 Desglose del Presupuesto</h4>
              <table className="data-table" style={{ marginBottom: '20px' }}>
                <thead>
                  <tr>
                    <th>Etapa / Categoría</th>
                    <th style={{ textAlign: 'right' }}>Costo Proyectado</th>
                  </tr>
                </thead>
                <tbody>
                  {simulationResult.presupuesto_detallado.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.categoria}</td>
                      <td style={{ textAlign: 'right' }}>${Number(item.monto).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}>
                    <td>COSTO TOTAL</td>
                    <td style={{ textAlign: 'right', color: '#EF4444' }}>${Number(simulationResult.totales.costo_total).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3B82F6', padding: '15px', borderRadius: '8px' }}>
                <h4 style={{ color: '#60A5FA', margin: '0 0 10px 0' }}>📈 Proyección Financiera</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '1.05em' }}>
                  <div><strong>Ingresos Esperados:</strong> <span style={{ color: '#34D399' }}>${Number(simulationResult.totales.ingresos_esperados).toLocaleString()}</span></div>
                  <div><strong>Rentabilidad Proyectada:</strong> <span style={{ color: simulationResult.totales.rentabilidad_proyectada >= 0 ? '#34D399' : '#EF4444' }}>${Number(simulationResult.totales.rentabilidad_proyectada).toLocaleString()}</span></div>
                  <div style={{ gridColumn: 'span 2', textAlign: 'center', marginTop: '10px', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                    <span style={{ color: '#FCD34D' }}>Precio Punto de Equilibrio (Break-Even):</span><br/>
                    <strong style={{ fontSize: '1.2em' }}>${Number(simulationResult.totales.punto_equilibrio_precio_kg).toLocaleString(undefined, { maximumFractionDigits: 2 })} / Kg</strong>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" className="btn btn-primary" onClick={() => setShowSimulationModal(false)}>
                Aceptar y Aplicar al Formulario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asistente Pedagógico Escuela de Campo */}
      <AsistenteSiembraCampesina
        isOpen={showAsistenteCampesino}
        onClose={() => setShowAsistenteCampesino(false)}
        onSiembraCreated={handleProcess}
        tenantId={tenantId}
      />
    </div>
  );
};

export default SiembrasManager;
