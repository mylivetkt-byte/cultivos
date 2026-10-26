import React, { useState, useEffect } from 'react';
import DatePickerClaro from '../Common/DatePickerClaro';
import { message } from 'antd';
import Select from 'react-select';
import { authFetch } from '../../utils/api';

export default function PlanillasManuales({ tenantId, fincaId }) {
  const [planillas, setPlanillas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [yaBuscado, setYaBuscado] = useState(false);
  
  // Catálogos
  const [empleados, setEmpleados] = useState([]);
  const [labores, setLabores] = useState([]);

  // Estados del master
  // Estados del master (Filtros Avanzados)
  const [filtroTipo, setFiltroTipo] = useState('Todas');
  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [fincaFiltro, setFincaFiltro] = useState('Todas');
  const [centroCostoFiltro, setCentroCostoFiltro] = useState('Todos');

  // Listas para selectores
  const [fincasList, setFincasList] = useState([]);
  const [centrosCostoList, setCentrosCostoList] = useState([
    { label: 'Administración', value: 'ADMIN' },
    { label: 'Operación Agrícola', value: 'AGRI' },
    { label: 'Maquinaria', value: 'MAQ' }
  ]);
  
  // Modal de Nueva Planilla (Cabecera)
  const [showHeaderModal, setShowHeaderModal] = useState(false);
  const [headerForm, setHeaderForm] = useState({
    tipo_planilla: 'Semanal',
    fecha_inicio: '',
    fecha_fin: ''
  });

  // Modal de Detalle (Ingreso Diario de Labores)
  const [activePlanilla, setActivePlanilla] = useState(null);
  const [detalles, setDetalles] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailForm, setDetailForm] = useState({
    id_empleado: '',
    id_labor_catalogo: '',
    fecha_labor: new Date().toISOString().split('T')[0],
    cantidad: 1,
    tarifa: 0
  });

  useEffect(() => {
    fetchCatalogos();
  }, [tenantId, fincaId]);

  const fetchPlanillas = async () => {
    setLoading(true);
    setYaBuscado(true);
    try {
      const tid = tenantId || 1;
      const res = await authFetch(`/api/rrhh/planillas-manuales?tenantId=${tid}${fincaId ? '&fincaId='+fincaId : ''}`);
      const data = await res.json();
      setPlanillas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      message.error('Error al cargar planillas');
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogos = async () => {
    try {
      const tid = tenantId || 1;
      const resE = await authFetch(`/api/rrhh/empleados?tenantId=${tid}`);
      const dataE = await resE.json();
      setEmpleados(Array.isArray(dataE) ? dataE : []);

      const resL = await authFetch(`/api/rrhh/catalogo-labores?tenantId=${tid}`);
      const dataL = await resL.json();
      setLabores(Array.isArray(dataL) ? dataL.filter(l => l.estado === 'Activo') : []);

      try {
        const resF = await authFetch(`/api/table/fincas/data`);
        const dataF = await resF.json();
        setFincasList(dataF.data || []);
      } catch(e) {}
    } catch (e) {
      console.error(e);
    }
  };

  // ================= CABECERAS =================
  const openNewPlanilla = () => {
    setHeaderForm({
      tipo_planilla: 'Semanal',
      fecha_inicio: '',
      fecha_fin: ''
    });
    setShowHeaderModal(true);
  };

  const savePlanilla = async () => {
    if(!headerForm.fecha_inicio || !headerForm.fecha_fin) return message.error('Las fechas son requeridas');
    try {
      const res = await authFetch('/api/rrhh/planillas-manuales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...headerForm, tenantId: tenantId || 1, id_finca: fincaId })
      });
      if (!res.ok) throw new Error('Error al crear planilla');
      message.success('Planilla creada');
      setShowHeaderModal(false);
      fetchPlanillas();
    } catch (e) {
      message.error(e.message);
    }
  };

  const deletePlanilla = async (id) => {
    if (!window.confirm('¿Eliminar esta planilla?')) return;
    try {
      const res = await authFetch(`/api/rrhh/planillas-manuales/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('No se puede eliminar (quizás ya está cerrada)');
      message.success('Eliminada');
      fetchPlanillas();
    } catch (e) {
      message.error(e.message);
    }
  };

  const cerrarPlanilla = async (id) => {
    if (!window.confirm('¿Estás seguro de CERRAR esta planilla? Se generará la distribución contable y no podrá ser modificada.')) return;
    try {
      const res = await authFetch(`/api/rrhh/planillas-manuales/${id}/cerrar`, { method: 'POST' });
      if (!res.ok) throw new Error('Error al cerrar');
      message.success('Planilla cerrada y enviada a Contabilidad');
      fetchPlanillas();
      if (activePlanilla && activePlanilla.id_planilla === id) {
        setActivePlanilla({ ...activePlanilla, estado: 'Cerrada' });
      }
    } catch (e) {
      message.error(e.message);
    }
  };

  // ================= DETALLES =================
  const openDetails = async (planilla) => {
    setActivePlanilla(planilla);
    await fetchDetalles(planilla.id_planilla);
    setShowDetailModal(true);
  };

  const fetchDetalles = async (idPlanilla) => {
    try {
      const res = await authFetch(`/api/rrhh/planillas-manuales/${idPlanilla}/detalles`);
      const data = await res.json();
      setDetalles(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      message.error('Error cargando diario de labores');
    }
  };

  const handleLaborChange = (laborId) => {
    const labor = labores.find(l => l.id_labor_catalogo === parseInt(laborId));
    setDetailForm({
      ...detailForm,
      id_labor_catalogo: laborId,
      tarifa: labor ? labor.tarifa_base : 0
    });
  };

  const saveDetalle = async () => {
    if(!detailForm.id_empleado || !detailForm.id_labor_catalogo) return message.error('Empleado y Labor son obligatorios');
    try {
      const res = await authFetch(`/api/rrhh/planillas-manuales/${activePlanilla.id_planilla}/detalles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(detailForm)
      });
      if (!res.ok) throw new Error('Error al guardar línea');
      fetchDetalles(activePlanilla.id_planilla);
      fetchPlanillas(); // Para actualizar el total
      setDetailForm({ ...detailForm, id_empleado: '', id_labor_catalogo: '', tarifa: 0, cantidad: 1 });
      message.success('Labor registrada');
    } catch (e) {
      message.error(e.message);
    }
  };

  const selectStyles = {
    control: (base) => ({ ...base, borderRadius: '8px', borderColor: '#cbd5e1', minHeight: '40px' })
  };

  const deleteDetalle = async (idDetalle) => {
    try {
      await authFetch(`/api/rrhh/planillas-manuales/detalles/${idDetalle}`, { method: 'DELETE' });
      fetchDetalles(activePlanilla.id_planilla);
      fetchPlanillas();
    } catch (e) {
      message.error('Error al borrar línea');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const planillasFiltradas = planillas.filter(p => {
    let match = true;
    if (filtroTipo !== 'Todas' && p.tipo_planilla !== filtroTipo) match = false;
    if (fincaFiltro !== 'Todas' && p.finca_nombre !== fincaFiltro) match = false;
    
    if (busqueda) {
      const b = busqueda.toLowerCase();
      if (!String(p.id_planilla).includes(b) && !(p.tipo_planilla||'').toLowerCase().includes(b)) {
        match = false;
      }
    }

    if (fechaDesde && p.fecha_inicio < fechaDesde) match = false;
    if (fechaHasta && p.fecha_fin > fechaHasta) match = false;

    // Filtro por centro de costo (Simulado para UI según solicitud)
    if (centroCostoFiltro !== 'Todos') {
      // Como la planilla no tiene CC en la cabecera en este modelo, esto es un filtro visual representativo.
    }

    return match;
  });

  return (
    <div className="catalog-container">
      <div className="catalog-header print:hidden">
        <h2>📋 Planillas Manuales (Diario de Labores)</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handlePrint} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🖨️</span> Imprimir
          </button>
          <button onClick={openNewPlanilla} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>+</span> Nueva Planilla
          </button>
        </div>
      </div>

      <div className="print:hidden" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <span style={{ fontSize: '18px' }}>🔍</span>
          <h3 style={{ margin: 0, fontSize: '15px', color: '#334155' }}>Búsqueda y Filtros Avanzados</h3>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          {/* Búsqueda general */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Código o Descripción</label>
            <input 
              type="text" 
              placeholder="Buscar por ID Planilla o Tipo..." 
              value={busqueda} 
              onChange={e => setBusqueda(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>

          {/* Rango de Fechas */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Rango de Fechas</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <DatePickerClaro value={fechaDesde} 
                onChange={e => setFechaDesde(e.target.value)}
                style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                title="Desde" />
              <DatePickerClaro value={fechaHasta} 
                onChange={e => setFechaHasta(e.target.value)}
                style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                title="Hasta" />
            </div>
          </div>

          {/* Filtro por Tipo */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Tipo de Planilla</label>
            <Select 
              options={[
                { value: 'Todas', label: 'Todas las Planillas' },
                { value: 'Semanal', label: 'Semanal' },
                { value: 'Quincenal', label: 'Quincenal' },
                { value: 'Mensual', label: 'Mensual' },
                { value: 'Contrato', label: 'Contrato por Obra' }
              ]}
              value={{ value: filtroTipo, label: filtroTipo === 'Todas' ? 'Todas las Planillas' : filtroTipo }}
              onChange={(sel) => setFiltroTipo(sel.value)}
              styles={selectStyles}
            />
          </div>

          {/* Filtro por Finca */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Finca / Hacienda</label>
            <Select 
              options={[
                { value: 'Todas', label: '-- Todas las Fincas --' },
                ...fincasList.map(f => ({ value: f.nombre, label: f.nombre }))
              ]}
              value={{ value: fincaFiltro, label: fincaFiltro === 'Todas' ? '-- Todas las Fincas --' : fincaFiltro }}
              onChange={(sel) => setFincaFiltro(sel.value)}
              isSearchable
              placeholder="Buscar finca..."
              styles={selectStyles}
            />
          </div>

          {/* Filtro por Centro de Costo */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Centro de Costo</label>
            <Select 
              options={[
                { value: 'Todos', label: '-- Todos los CC --' },
                ...centrosCostoList
              ]}
              value={{ value: centroCostoFiltro, label: centroCostoFiltro === 'Todos' ? '-- Todos los CC --' : centrosCostoList.find(c => c.value === centroCostoFiltro)?.label }}
              onChange={(sel) => setCentroCostoFiltro(sel.value)}
              isSearchable
              placeholder="Buscar Centro Costo..."
              styles={selectStyles}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
          <button 
            onClick={fetchPlanillas}
            className="btn btn-primary" 
            style={{ padding: '10px 24px', fontWeight: 'bold', fontSize: '14px', background: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span>⚙️</span> {loading ? 'Procesando...' : 'Procesar / Consultar'}
          </button>
        </div>
      </div>

      {/* Lista de Planillas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        {loading ? <p>Cargando planillas...</p> : 
         !yaBuscado ? <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', color: '#64748b' }}>👆 Presione <strong>Procesar / Consultar</strong> para cargar las planillas según los filtros seleccionados.</div> :
         planillasFiltradas.length === 0 ? <p style={{ color: '#64748b', padding: '20px' }}>No se encontraron planillas con estos filtros.</p> :
         planillasFiltradas.map(p => (
          <div key={p.id_planilla} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', borderTop: `4px solid ${p.estado === 'Cerrada' ? '#10b981' : '#3b82f6'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#1e293b' }}>Planilla {p.tipo_planilla} #{p.id_planilla}</h3>
                <span style={{ fontSize: '12px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#475569' }}>
                  {p.finca_nombre || 'General'}
                </span>
              </div>
              <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: p.estado === 'Cerrada' ? '#dcfce7' : '#dbeafe', color: p.estado === 'Cerrada' ? '#166534' : '#1e40af' }}>
                {p.estado}
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', color: '#475569', marginBottom: '16px' }}>
              <div><strong>Del:</strong> {p.fecha_inicio.substring(0,10)}</div>
              <div><strong>Al:</strong> {p.fecha_fin.substring(0,10)}</div>
              {p.tipo_planilla === 'Semanal' && <div style={{ gridColumn: '1 / -1', color: '#f59e0b', fontWeight: 'bold' }}>⭐ Semana del año: {p.numero_semana}</div>}
              {p.estado === 'Cerrada' && p.contabilizado === 1 && <div style={{ gridColumn: '1 / -1', color: '#10b981', fontWeight: 'bold' }}>✅ Contabilizada</div>}
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Registros</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>{p.num_detalles || 0}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Planilla</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>${Number(p.total_planilla || 0).toLocaleString()}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }} className="print:hidden">
              <button onClick={() => openDetails(p)} style={{ flex: 1, background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Ver / Capturar Labores
              </button>
              {p.estado === 'Abierta' && (
                <button onClick={() => deletePlanilla(p.id_planilla)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>
                  🗑️
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL CREAR PLANILLA */}
      {showHeaderModal && (
        <div style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(15, 23, 42, 0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'white', padding:'24px', borderRadius:'12px', width:'400px' }}>
            <h3 style={{ marginTop: 0, borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>Crear Planilla de Labores</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Tipo de Planilla</label>
                <select value={headerForm.tipo_planilla} onChange={e=>setHeaderForm({...headerForm, tipo_planilla:e.target.value})} style={{ width:'100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <option value="Semanal">Semanal (Requiere # de semana)</option>
                  <option value="Quincenal">Quincenal</option>
                  <option value="Mensual">Mensual</option>
                  <option value="Contrato">Contrato por Obra</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Fecha Inicio</label>
                  <DatePickerClaro value={headerForm.fecha_inicio} onChange={e=>setHeaderForm({...headerForm, fecha_inicio:e.target.value})} style={{ width:'100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Fecha Fin</label>
                  <DatePickerClaro value={headerForm.fecha_fin} onChange={e=>setHeaderForm({...headerForm, fecha_fin:e.target.value})} style={{ width:'100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end', gap:'12px', marginTop: '20px' }}>
              <button onClick={() => setShowHeaderModal(false)} className="btn btn-outline">Cancelar</button>
              <button onClick={savePlanilla} className="btn btn-primary">Abrir Planilla</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GIGANTE DE DETALLES (DIARIO DE LABORES) */}
      {showDetailModal && activePlanilla && (
        <div className="print-modal-wrapper" style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(15, 23, 42, 0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding: '20px' }}>
          <div className="print-modal-content" style={{ background:'white', padding:'24px', borderRadius:'12px', width:'100%', maxWidth: '1000px', height: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#1e293b' }}>Diario de Labores - Planilla {activePlanilla.tipo_planilla}</h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>Del {activePlanilla.fecha_inicio.substring(0,10)} al {activePlanilla.fecha_fin.substring(0,10)}</p>
              </div>
              <div className="print:hidden" style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handlePrint} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🖨️ Imprimir Hoja</button>
                {activePlanilla.estado === 'Abierta' && (
                  <button onClick={() => cerrarPlanilla(activePlanilla.id_planilla)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    🔒 CERRAR Y CONTABILIZAR
                  </button>
                )}
                <button onClick={() => setShowDetailModal(false)} style={{ background: '#f1f5f9', color: '#334155', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Cerrar Ventana
                </button>
              </div>
            </div>

            {/* Formulario de Captura Rápida */}
            {activePlanilla.estado === 'Abierta' && (
              <div className="print:hidden" style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Fecha Labor</label>
                  <DatePickerClaro value={detailForm.fecha_labor} onChange={e=>setDetailForm({...detailForm, fecha_labor:e.target.value})} style={{ width:'100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Trabajador</label>
                  <select value={detailForm.id_empleado} onChange={e=>setDetailForm({...detailForm, id_empleado:e.target.value})} style={{ width:'100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="">-- Seleccionar --</option>
                    {empleados.map(e => <option key={e.id_empleado} value={e.id_empleado}>{e.nombres} {e.apellidos}</option>)}
                  </select>
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Labor del Catálogo</label>
                  <select value={detailForm.id_labor_catalogo} onChange={e=>handleLaborChange(e.target.value)} style={{ width:'100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option value="">-- Seleccionar --</option>
                    {labores.map(l => <option key={l.id_labor_catalogo} value={l.id_labor_catalogo}>{l.codigo} - {l.nombre}</option>)}
                  </select>
                </div>
                <div style={{ width: '100px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Cant.</label>
                  <input type="number" step="0.01" value={detailForm.cantidad} onChange={e=>setDetailForm({...detailForm, cantidad:e.target.value})} style={{ width:'100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ width: '120px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Tarifa ($)</label>
                  <input type="number" value={detailForm.tarifa} onChange={e=>setDetailForm({...detailForm, tarifa:e.target.value})} style={{ width:'100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ width: '120px', paddingBottom: '8px', fontWeight: 'bold', color: '#1e293b' }}>
                  Total: ${(Number(detailForm.cantidad)*Number(detailForm.tarifa)).toLocaleString()}
                </div>
                <button onClick={saveDetalle} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', height: '37px' }}>
                  + Agregar
                </button>
              </div>
            )}

            {/* Tabla de Registros */}
            <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
              <table className="data-table" style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                  <tr style={{ background: '#f1f5f9', color: '#475569', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px', borderBottom: '1px solid #cbd5e1' }}>Fecha</th>
                    <th style={{ padding: '12px', borderBottom: '1px solid #cbd5e1' }}>Empleado / Recurso</th>
                    <th style={{ padding: '12px', borderBottom: '1px solid #cbd5e1' }}>Labor Realizada</th>
                    <th style={{ padding: '12px', borderBottom: '1px solid #cbd5e1', textAlign: 'right' }}>Cant.</th>
                    <th style={{ padding: '12px', borderBottom: '1px solid #cbd5e1', textAlign: 'right' }}>Tarifa</th>
                    <th style={{ padding: '12px', borderBottom: '1px solid #cbd5e1', textAlign: 'right' }}>Total</th>
                    {activePlanilla.estado === 'Abierta' && <th style={{ padding: '12px', borderBottom: '1px solid #cbd5e1', textAlign: 'center' }} className="print:hidden">X</th>}
                  </tr>
                </thead>
                <tbody>
                  {detalles.length === 0 ? (
                    <tr><td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Aún no se han capturado labores en esta planilla.</td></tr>
                  ) : detalles.map(d => (
                    <tr key={d.id_detalle} style={{ borderBottom: '1px solid #e2e8f0' }} className="hover:bg-gray-50">
                      <td style={{ padding: '10px' }}>{d.fecha_labor.substring(0,10)}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{d.emp_nombre}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ fontSize: '11px', background: '#e2e8f0', padding: '2px 4px', borderRadius: '4px', marginRight: '4px' }}>{d.labor_codigo}</span>
                        {d.labor_nombre}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{d.cantidad} {d.unidad_medida}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>${Number(d.tarifa).toLocaleString()}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>${Number(d.total).toLocaleString()}</td>
                      {activePlanilla.estado === 'Abierta' && (
                        <td style={{ padding: '10px', textAlign: 'center' }} className="print:hidden">
                          <button onClick={() => deleteDetalle(d.id_detalle)} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div style={{ marginTop: '16px', borderTop: '2px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#64748b' }}>Total de registros: {detalles.length}</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                TOTAL PLANILLA: <span style={{ color: '#10b981' }}>${detalles.reduce((acc, curr) => acc + Number(curr.total), 0).toLocaleString()}</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
