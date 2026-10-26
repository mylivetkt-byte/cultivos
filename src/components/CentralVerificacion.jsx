import React, { useState, useEffect } from 'react';
import DatePickerClaro from './Common/DatePickerClaro';
import { fetchTableData } from '../utils/api';
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons';
import PremiumSelect from './PremiumSelect';

const API_BASE = 'http://localhost:3002/api';

function CentralVerificacion({ tenantId }) {
  const [labores, setLabores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Filtros
  const [filters, setFilters] = useState({
    fechaInicio: '',
    fechaFin: '',
    finca: '',
    lote: '',
    empleado: '',
    categoria: ''
  });

  // Catálogos para los selectores
  const [fincas, setFincas] = useState([]);
  const [nucleos, setNucleos] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  // Modal State
  const [evalModal, setEvalModal] = useState({ open: false, labor: null, action: null });
  const [evalData, setEvalData] = useState({
    horas_trabajadas: '',
    cantidad_producida: '',
    costo_mano_obra: '',
    observaciones: ''
  });

  // Cargar catálogos iniciales
  useEffect(() => {
    async function initCatalogs() {
      try {
        const token = localStorage.getItem('token');
        const [fRes, nRes, lRes, eRes] = await Promise.all([
          fetch(`${API_BASE}/table/fincas/data?tenantId=${tenantId}&limit=1000`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/table/nucleos/data?tenantId=${tenantId}&limit=5000`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/table/lotes/data?tenantId=${tenantId}&limit=10000`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/table/rrhh_empleados/data?tenantId=${tenantId}&limit=1000`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        if (fRes.ok) { const fData = await fRes.json(); setFincas(fData.data || []); }
        if (nRes.ok) { const nData = await nRes.json(); setNucleos(nData.data || []); }
        if (lRes.ok) { const lData = await lRes.json(); setLotes(lData.data || []); }
        if (eRes.ok) { const eData = await eRes.json(); setEmpleados(eData.data || []); }
      } catch (err) {
        console.error("Error loading catalogs", err);
      } finally {
        setInitialLoading(false);
        loadData(); // Cargar data por defecto al iniciar
      }
    }
    if (tenantId) initCatalogs();
  }, [tenantId]);

  async function loadData() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ tenantId });
      if (filters.fechaInicio) params.append('fechaInicio', filters.fechaInicio);
      if (filters.fechaFin) params.append('fechaFin', filters.fechaFin);
      if (filters.finca) params.append('finca', filters.finca);
      if (filters.lote) params.append('lote', filters.lote);
      if (filters.empleado) params.append('empleado', filters.empleado);
      if (filters.categoria) params.append('categoria', filters.categoria);

      const res = await fetch(`${API_BASE}/labores/verificacion_diaria?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error loading verification data');
      const data = await res.json();
      setLabores(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleProcesar = () => {
    loadData();
  };

  const handleEvaluate = async (laborId, estado, data = {}) => {
    try {
      const token = localStorage.getItem('token');
      const payload = { 
        estado, 
        evaluador: 'Jefe de Área',
        ...data 
      };
      
      const res = await fetch(`${API_BASE}/labores/${laborId}/evaluar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Error evaluating');
      
      setLabores(prev => prev.map(l => l.id_labor === laborId ? { ...l, estado, ...data } : l));
      setEvalModal({ open: false, labor: null, action: null });
    } catch (err) {
      alert('Error evaluando labor: ' + err.message);
    }
  };

  const openEvaluationModal = (labor, action) => {
    setEvalModal({ open: true, labor, action });
    setEvalData({
      horas_trabajadas: labor.horas_trabajadas || '',
      cantidad_producida: labor.cantidad_producida || '',
      costo_mano_obra: labor.costo_mano_obra || '',
      observaciones: labor.cumplimiento_observaciones || 'Evaluado por el Centro de Verificación'
    });
  };

  const submitEvaluation = (e) => {
    e.preventDefault();
    handleEvaluate(evalModal.labor.id_labor, evalModal.action, evalData);
  };

  // Lógica de Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLabores = labores.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(labores.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>📝</span>
          Central de Verificación y Nómina
        </h2>
      </div>

      {/* Panel de Filtros */}
      <div style={{ 
        background: 'var(--card-bg)', 
        padding: '20px', 
        borderRadius: '12px', 
        border: '1px solid var(--border)',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', alignItems: 'end', marginBottom: '20px' }}>
          
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.85em', color: '#94a3b8', marginBottom: '5px' }}>Finca</label>
            <PremiumSelect 
              value={filters.finca} 
              onChange={e => setFilters({...filters, finca: e.target.value})}
              options={[{ value: '', label: '-- Todas --' }, ...fincas.map(f => ({ value: String(f.id_finca), label: f.nombre }))]}
              isClearable={false}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.85em', color: '#94a3b8', marginBottom: '5px' }}>Lote / Potrero</label>
            <PremiumSelect 
              value={filters.lote} 
              onChange={e => setFilters({...filters, lote: e.target.value})}
              options={[{ value: '', label: '-- Todos --' }, ...lotes.filter(l => {
                if (!filters.finca) return true;
                const nucleo = nucleos.find(n => n.id_nucleo === l.id_nucleo);
                return nucleo && nucleo.id_finca === Number(filters.finca);
              }).map(l => ({ value: String(l.id_lote), label: l.nombre }))]}
              isClearable={false}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.85em', color: '#94a3b8', marginBottom: '5px' }}>Empleado</label>
            <PremiumSelect 
              value={filters.empleado} 
              onChange={e => setFilters({...filters, empleado: e.target.value})}
              options={[{ value: '', label: '-- Todos --' }, ...empleados.map(e => ({ value: String(e.id_empleado), label: `${e.nombres} ${e.apellidos}` }))]}
              isClearable={false}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.85em', color: '#94a3b8', marginBottom: '5px' }}>Categoría Labor</label>
            <PremiumSelect 
              value={filters.categoria} 
              onChange={e => setFilters({...filters, categoria: e.target.value})}
              options={[
                { value: '', label: '-- Todas --' },
                { value: 'Personal', label: 'Personal' },
                { value: 'Cultivos', label: 'Cultivos' },
                { value: 'Cosecha', label: 'Cosecha' },
                { value: 'Mantenimiento', label: 'Mantenimiento' }
              ]}
              isClearable={false}
            />
          </div>

          <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.85em', color: '#94a3b8', marginBottom: '5px' }}>Rango Fechas (Opcional)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <DatePickerClaro className="form-control" 
                style={{ cursor: 'pointer', background: '#334155', color: '#f8fafc', border: '1px solid #475569', textAlign: 'center' }}
                value={filters.fechaInicio} 
                onChange={e => setFilters({...filters, fechaInicio: e.target.value})} 
                title="Fecha Inicio"
                onClick={e => e.target.showPicker && e.target.showPicker()} />
              <DatePickerClaro className="form-control" 
                style={{ cursor: 'pointer', background: '#334155', color: '#f8fafc', border: '1px solid #475569', textAlign: 'center' }}
                value={filters.fechaFin} 
                onChange={e => setFilters({...filters, fechaFin: e.target.value})} 
                title="Fecha Fin" 
                onClick={e => e.target.showPicker && e.target.showPicker()} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button className="btn btn-primary" onClick={handleProcesar} disabled={loading || initialLoading} style={{ padding: '10px 24px', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            {loading ? 'Procesando...' : '🔍 Procesar'}
          </button>
        </div>
      </div>

      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '20px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
      }}>
        {initialLoading ? <p>Cargando información del sistema...</p> : (loading ? <p>Procesando labores...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9em' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', color: '#94a3b8' }}>
                <th style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>Labor / Tarea</th>
                <th style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>Categoría</th>
                <th style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>Operario</th>
                <th style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>Asistencia</th>
                <th style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>Estado</th>
                <th style={{ padding: '12px 10px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentLabores.map(l => {
                const isAbsent = l.id_empleado && !l.hora_entrada;
                return (
                  <tr key={l.id_labor} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'transparent', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 10px', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={l.descripcion_labor}>
                      {l.descripcion_labor}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <span style={{ background: '#334155', color: '#f8fafc', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {l.categoria}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '500' }}>{l.id_empleado ? `${l.empleado_nombres} ${l.empleado_apellidos}` : <span style={{ color: '#64748b', fontStyle: 'italic' }}>Sin asignar</span>}</span>
                        {l.cargo && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{l.cargo}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                      {l.id_empleado ? (
                        isAbsent ? (
                          <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '500', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: '4px', width: 'fit-content' }}>
                            <WarningOutlined /> AUSENTE
                          </span>
                        ) : (
                          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '500', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '4px', width: 'fit-content' }}>
                            <CheckCircleOutlined /> Presente ({l.hora_entrada?.substring(0,5) || 'N/A'})
                          </span>
                        )
                      ) : <span style={{ color: '#475569' }}>-</span>}
                    </td>
                    <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ 
                          color: l.estado === 'Completada' ? '#10b981' : l.estado === 'Incumplida' ? '#ef4444' : '#f59e0b',
                          fontWeight: 'bold', fontSize: '13px'
                        }}>
                          {l.estado}
                        </span>
                        {(l.costo_mano_obra > 0) && (
                          <span style={{ fontSize: '11px', color: '#34d399', fontWeight: '600' }}>
                            Pago: ${Number(l.costo_mano_obra).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '12px', opacity: isAbsent ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}
                          disabled={isAbsent}
                          title="Marcar labor como Completada y evaluar nómina"
                          onClick={() => openEvaluationModal(l, 'Completada')}
                        >
                          <CheckCircleOutlined /> Cumplió
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '6px 12px', fontSize: '12px', borderColor: '#ef4444', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Marcar labor como Incumplida"
                          onClick={() => openEvaluationModal(l, 'Incumplida')}
                        >
                          <CloseCircleOutlined /> No Cumplió
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {labores.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                    No hay labores registradas para esta fecha.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ))}
        
        {/* Footer Paginación */}
        {!initialLoading && !loading && labores.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ color: '#94a3b8', fontSize: '13px' }}>
              Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, labores.length)} de {labores.length} registros
              <select 
                style={{ marginLeft: '10px', background: '#334155', color: '#f8fafc', border: '1px solid #475569', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
                value={itemsPerPage}
                onChange={e => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10 por página</option>
                <option value={20}>20 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '5px' }}>
              <button 
                className="btn btn-outline" 
                style={{ padding: '4px 10px', fontSize: '13px', background: currentPage === 1 ? 'transparent' : '#1e293b', borderColor: '#475569', opacity: currentPage === 1 ? 0.5 : 1 }}
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                &lt; Anterior
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', background: '#334155', borderRadius: '4px', fontSize: '13px', fontWeight: '500' }}>
                Página {currentPage} de {totalPages}
              </div>

              <button 
                className="btn btn-outline" 
                style={{ padding: '4px 10px', fontSize: '13px', background: currentPage === totalPages ? 'transparent' : '#1e293b', borderColor: '#475569', opacity: currentPage === totalPages ? 0.5 : 1 }}
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Siguiente &gt;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Evaluation Modal */}
      {evalModal.open && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', width: '90%' }}>
            <div className="modal-header">
              <h2>Evaluación de Labor y Nómina</h2>
              <button className="close-btn" onClick={() => setEvalModal({ open: false, labor: null, action: null })}>&times;</button>
            </div>
            
            <div style={{ padding: '15px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', marginBottom: '15px' }}>
              <strong>Operario:</strong> {evalModal.labor?.empleado_nombres} {evalModal.labor?.empleado_apellidos}<br/>
              <strong>Contrato:</strong> <span style={{ color: '#FCD34D' }}>{evalModal.labor?.tipo_contrato || 'Fijo'}</span>
              {evalModal.labor?.tipo_contrato === 'Por_Obra' && ' (Contratista Externo)'}
              <br/>
              <strong>Labor:</strong> {evalModal.labor?.descripcion_labor}
            </div>

            <form onSubmit={submitEvaluation}>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>Resultado Evaluación</label>
                <div style={{ padding: '10px', background: evalModal.action === 'Completada' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: evalModal.action === 'Completada' ? '#34D399' : '#F87171', fontWeight: 'bold', borderRadius: '4px' }}>
                  {evalModal.action === 'Completada' ? '✓ Cumplió con la Labor' : '✕ No Cumplió'}
                </div>
              </div>

              {(evalModal.labor?.tipo_contrato === 'Destajo' || evalModal.labor?.tipo_contrato === 'Por_Obra') ? (
                <>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>Unidades / Cantidad Producida (Kilos, Surcos, etc.)</label>
                    <input type="number" step="0.01" className="form-control" value={evalData.cantidad_producida} onChange={e => setEvalData({...evalData, cantidad_producida: e.target.value})} placeholder="Ej: 1500" required={evalModal.action === 'Completada'} />
                  </div>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>Valor Total a Pagar ($)</label>
                    <input type="number" step="0.01" className="form-control" value={evalData.costo_mano_obra} onChange={e => setEvalData({...evalData, costo_mano_obra: e.target.value})} placeholder="Ej: 450000" required={evalModal.action === 'Completada'} />
                  </div>
                </>
              ) : (
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label>Horas Trabajadas</label>
                  <input type="number" step="0.5" className="form-control" value={evalData.horas_trabajadas} onChange={e => setEvalData({...evalData, horas_trabajadas: e.target.value})} placeholder="Ej: 8" required={evalModal.action === 'Completada'} />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>Observaciones</label>
                <textarea className="form-control" value={evalData.observaciones} onChange={e => setEvalData({...evalData, observaciones: e.target.value})} />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEvalModal({ open: false, labor: null, action: null })}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Evaluación</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CentralVerificacion;
