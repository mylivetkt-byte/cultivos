import React, { useState, useEffect } from 'react';
import '../dashboard.css';
import { authFetch } from '../../utils/api';
import PremiumSelect from '../PremiumSelect';
import ExportButtons from '../ExportButtons';
import { useAuth } from '../../context/AuthContext';

const PresupuestosSiembraManager = () => {
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Catalogs
  const [siembras, setSiembras] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  const [variedades, setVariedades] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    siembraId: '',
    concepto: '',
    estado: ''
  });

  const [processedData, setProcessedData] = useState([]);
  const [hasProcessed, setHasProcessed] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newRecord, setNewRecord] = useState({
    id_siembra: '',
    concepto: '',
    presupuesto_cop: '',
    ejecutado_cop: '0',
    estado: 'En_Ejecucion'
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
      
      const [resSiembras, resLotes, resCultivos, resVariedades] = await Promise.all([
        authFetch(`/api/table/siembras/data?tenantId=${tenantId}&pageSize=500`, { headers }),
        authFetch(`/api/table/lotes/data?tenantId=${tenantId}&pageSize=500`, { headers }),
        authFetch(`/api/table/cultivos/data?pageSize=500`, { headers }),
        authFetch(`/api/table/variedades/data?pageSize=500`, { headers })
      ]);
      
      const [dataSiembras, dataLotes, dataCultivos, dataVariedades] = await Promise.all([
        resSiembras.json(), resLotes.json(), resCultivos.json(), resVariedades.json()
      ]);

      setSiembras(dataSiembras.data || []);
      setLotes(dataLotes.data || []);
      setCultivos(dataCultivos.data || []);
      setVariedades(dataVariedades.data || []);
      
    } catch (err) {
      console.error('Error loading catalogs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSiembraLabel = (id_siembra) => {
    const s = siembras.find(s => s.id_siembra === id_siembra);
    if (!s) return `SMB-${id_siembra}`;
    
    const lote = lotes.find(l => l.id_lote === s.id_lote)?.nombre || 'Lote desc.';
    const cultivo = cultivos.find(c => c.id_cultivo === s.id_cultivo)?.nombre || 'Cultivo desc.';
    const variedad = variedades.find(v => v.id_variedad === s.id_variedad)?.nombre || '';
    
    return `SMB-${id_siembra} | ${lote} | ${cultivo} ${variedad ? `(${variedad})` : ''}`;
  };

  const handleProcess = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // En un caso real, si tenemos tenantId en presupuestos_siembra lo usamos,
      // pero como es una tabla hija, traemos todo y filtramos localmente o vía JOIN
      let url = `/api/table/presupuestos_siembra/data?pageSize=1000`;
      
      const response = await authFetch(url, { headers });
      const data = await response.json();
      let records = data.data || [];
      
      // Filtrar asegurándonos de que pertenecen a las siembras del tenant actual
      const validSiembraIds = new Set(siembras.map(s => s.id_siembra));
      records = records.filter(r => validSiembraIds.has(r.id_siembra));
      
      if (filters.siembraId) {
        records = records.filter(r => r.id_siembra.toString() === filters.siembraId.toString());
      }
      
      if (filters.concepto) {
        records = records.filter(r => r.concepto.toLowerCase().includes(filters.concepto.toLowerCase()));
      }
      
      if (filters.estado) {
        records = records.filter(r => r.estado === filters.estado);
      }

      setProcessedData(records);
      setHasProcessed(true);
    } catch (err) {
      console.error('Error procesando presupuestos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newRecord.id_siembra || !newRecord.concepto || !newRecord.presupuesto_cop) {
      alert("Por favor complete todos los campos obligatorios (*).");
      return;
    }

    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');
      const payload = {
        ...newRecord,
        id_tenant: tenantId,
        ejecutado_cop: newRecord.ejecutado_cop || 0
      };

      const response = await authFetch('/api/table/presupuestos_siembra', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al guardar el presupuesto');
      }

      alert("Presupuesto registrado exitosamente.");
      setShowModal(false);
      setNewRecord({
        id_siembra: '', concepto: '', presupuesto_cop: '', ejecutado_cop: '0', estado: 'En_Ejecucion'
      });
      if (hasProcessed) handleProcess(); // Refresh
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val || 0);
  };

  const exportColumns = [
    { header: 'ID', getter: p => `PRE-${p.id_presupuesto}` },
    { header: 'Referencia de Siembra', getter: p => getSiembraLabel(p.id_siembra) },
    { header: 'Concepto', getter: p => p.concepto },
    { header: 'Presupuesto', getter: p => formatCurrency(p.presupuesto_cop) },
    { header: 'Ejecutado', getter: p => formatCurrency(p.ejecutado_cop) },
    { header: 'Diferencia', getter: p => {
        const diff = Number(p.presupuesto_cop) - Number(p.ejecutado_cop);
        return `${diff < 0 ? '-' : '+'}${formatCurrency(Math.abs(diff))}`;
    }},
    { header: 'Estado', getter: p => p.estado ? p.estado.replace('_', ' ') : 'Desconocido' }
  ];

  if (loading && !hasProcessed) return <div className="loading">Cargando Módulo de Presupuestos...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Presupuestos de Siembra</h1>
          <p style={{ color: 'var(--text-muted)' }}>Control financiero de ejecución contra presupuesto por siembra</p>
        </div>
        <button className="btn btn-success" onClick={() => setShowModal(true)} style={{ padding: '10px 20px', fontSize: '1.05em', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2em' }}>+</span> Nuevo Presupuesto
        </button>
      </div>

      <div className="card" style={{ marginBottom: '25px', padding: '0', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2em' }}>🔍</span>
          <h4 style={{ margin: 0, color: '#60A5FA' }}>Buscador Maestro de Presupuestos</h4>
        </div>
        
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', background: 'rgba(0,0,0,0.15)' }}>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Siembra</label>
            <PremiumSelect
              options={siembras.map(s => ({ value: s.id_siembra, label: getSiembraLabel(s.id_siembra) }))}
              value={filters.siembraId}
              onChange={e => setFilters({...filters, siembraId: e.target.value})}
              placeholder="-- Todas las Siembras --"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Concepto (Texto)</label>
            <input 
              type="text" 
              className="form-control" 
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px', fontSize: '1rem', borderRadius: '6px', width: '100%' }} 
              placeholder="Ej. Fertilizantes, Mano de obra..."
              value={filters.concepto} 
              onChange={e => setFilters({...filters, concepto: e.target.value})} 
            />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Estado</label>
            <PremiumSelect
              options={[
                { value: 'En_Ejecucion', label: 'En Ejecución' },
                { value: 'Cerrado', label: 'Cerrado' },
                { value: 'Excedido', label: 'Excedido' }
              ]}
              value={filters.estado}
              onChange={e => setFilters({...filters, estado: e.target.value})}
              placeholder="-- Todos los Estados --"
            />
          </div>
        </div>
        
        <div style={{ padding: '15px 20px', background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <ExportButtons data={processedData} columns={exportColumns} filename="Reporte_Presupuestos" />
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
              <th>ID</th>
              <th>Referencia de Siembra</th>
              <th>Concepto</th>
              <th style={{ textAlign: 'right' }}>Presupuesto</th>
              <th style={{ textAlign: 'right' }}>Ejecutado</th>
              <th style={{ textAlign: 'right' }}>Diferencia</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {!hasProcessed ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Presione 'Procesar Consulta' para cargar los presupuestos.
                </td>
              </tr>
            ) : processedData.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No se encontraron presupuestos con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              processedData.map(p => {
                const diff = Number(p.presupuesto_cop) - Number(p.ejecutado_cop);
                const diffColor = diff < 0 ? '#EF4444' : (diff === 0 ? '#10B981' : '#FCD34D');
                
                return (
                  <tr key={p.id_presupuesto}>
                    <td><strong>PRE-{p.id_presupuesto}</strong></td>
                    <td style={{ color: '#60A5FA' }}>{getSiembraLabel(p.id_siembra)}</td>
                    <td>{p.concepto}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(p.presupuesto_cop)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(p.ejecutado_cop)}</td>
                    <td style={{ textAlign: 'right', color: diffColor, fontWeight: 'bold' }}>
                      {diff < 0 ? '-' : '+'}{formatCurrency(Math.abs(diff))}
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85em',
                        fontWeight: 'bold',
                        background: p.estado === 'Excedido' ? 'rgba(239, 68, 68, 0.2)' : p.estado === 'Cerrado' ? 'rgba(255,255,255,0.1)' : 'rgba(16, 185, 129, 0.2)',
                        color: p.estado === 'Excedido' ? '#EF4444' : p.estado === 'Cerrado' ? '#9CA3AF' : '#34D399'
                      }}>
                        {p.estado ? p.estado.replace('_', ' ') : 'Desconocido'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: '#1E293B', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
              <h2 style={{ margin: 0, color: '#60A5FA', fontSize: '1.5em' }}>Nuevo Presupuesto de Siembra</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5em', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#38BDF8', fontWeight: 'bold', fontSize: '1.05em' }}>Siembra Asociada *</label>
                  <PremiumSelect
                    options={siembras.map(s => ({ value: s.id_siembra, label: getSiembraLabel(s.id_siembra) }))}
                    value={newRecord.id_siembra}
                    onChange={e => setNewRecord({...newRecord, id_siembra: e.target.value})}
                    placeholder="-- Seleccione una Siembra --"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#38BDF8', fontWeight: 'bold', fontSize: '1.05em' }}>Concepto del Gasto / Presupuesto *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '12px', borderRadius: '6px', width: '100%', fontSize: '1.05em' }}
                    value={newRecord.concepto}
                    onChange={e => setNewRecord({...newRecord, concepto: e.target.value})}
                    placeholder="Ej. Fertilizantes, Semillas, Jornales, etc."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#38BDF8', fontWeight: 'bold', fontSize: '1.05em' }}>Presupuesto (COP) *</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      required
                      min="0"
                      step="0.01"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '12px', borderRadius: '6px', width: '100%', fontSize: '1.05em' }}
                      value={newRecord.presupuesto_cop}
                      onChange={e => setNewRecord({...newRecord, presupuesto_cop: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#38BDF8', fontWeight: 'bold', fontSize: '1.05em' }}>Ejecutado (COP) (Opcional)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      min="0"
                      step="0.01"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '12px', borderRadius: '6px', width: '100%', fontSize: '1.05em' }}
                      value={newRecord.ejecutado_cop}
                      onChange={e => setNewRecord({...newRecord, ejecutado_cop: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#38BDF8', fontWeight: 'bold', fontSize: '1.05em' }}>Estado</label>
                  <PremiumSelect
                    options={[
                      { value: 'En_Ejecucion', label: 'En Ejecución' },
                      { value: 'Cerrado', label: 'Cerrado' },
                      { value: 'Excedido', label: 'Excedido' }
                    ]}
                    value={newRecord.estado}
                    onChange={e => setNewRecord({...newRecord, estado: e.target.value})}
                  />
                </div>

              </div>

              <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ padding: '10px 20px', fontSize: '1.05em', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '6px' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="btn btn-success" style={{ padding: '10px 25px', fontSize: '1.05em', fontWeight: 'bold', borderRadius: '6px' }}>
                  {isSaving ? 'Guardando...' : '💾 Guardar Presupuesto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresupuestosSiembraManager;
