import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import Select from 'react-select';
import { authFetch } from '../../utils/api';

export default function ControlPermisos({ tenantId, fincaId }) {
  const [permisos, setPermisos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [yaBuscado, setYaBuscado] = useState(false);
  const [error, setError] = useState(null);
  
  // Catálogos
  const [empleados, setEmpleados] = useState([]);
  const [fincasList, setFincasList] = useState([]);

  // Filtros
  const [fincaFiltro, setFincaFiltro] = useState(fincaId ? fincaId.toString() : 'Todas');
  const [empleadoFiltro, setEmpleadoFiltro] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Modal Nuevo Permiso
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    id_empleado: '',
    tipo_permiso: '',
    fecha_inicio: '',
    fecha_fin: '',
    dias_solicitados: 1,
    motivo: '',
    estado: 'Pendiente'
  });

  useEffect(() => {
    fetchCatalogos();
  }, [tenantId]);

  const fetchCatalogos = async () => {
    try {
      const tid = tenantId || 1;
      const resE = await authFetch(`/api/rrhh/empleados?tenantId=${tid}`);
      const dataE = await resE.json();
      setEmpleados(Array.isArray(dataE) ? dataE.filter(e => e.estado === 'Activo') : []);

      const resF = await authFetch(`/api/table/fincas/data`);
      const dataF = await resF.json();
      setFincasList(dataF.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPermisos = async () => {
    setLoading(true);
    setYaBuscado(true);
    try {
      const tid = tenantId || 1;
      let url = `/api/rrhh/permisos?tenantId=${tid}`;
      if (fincaFiltro !== 'Todas') url += `&fincaId=${fincaFiltro}`;
      if (empleadoFiltro) url += `&empleadoId=${empleadoFiltro}`;
      if (fechaDesde) url += `&fechaDesde=${fechaDesde}`;
      if (fechaHasta) url += `&fechaHasta=${fechaHasta}`;

      const res = await authFetch(url);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setPermisos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      message.error('No se pudieron cargar los permisos.');
    } finally {
      setLoading(false);
    }
  };

  const savePermiso = async () => {
    if (!form.id_empleado || !form.tipo_permiso || !form.fecha_inicio || !form.fecha_fin || !form.motivo) {
      return message.error('Por favor complete todos los campos obligatorios');
    }
    setSaving(true);
    try {
      const res = await authFetch('/api/rrhh/permisos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenantId || 1, permiso: form })
      });
      if (!res.ok) throw new Error('Error al guardar');
      const data = await res.json();
      
      message.success('Permiso registrado correctamente');
      
      if (data.whatsapp_sent) {
        message.success(`📱 WhatsApp enviado al jefe inmediato (${data.manager_phone})`, 5);
      } else {
        message.info('ℹ️ El empleado no tiene jefe asignado o el jefe no tiene teléfono para WhatsApp.', 4);
      }
      
      setShowModal(false);
      if (yaBuscado) fetchPermisos();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (field, value) => {
    const newForm = { ...form, [field]: value };
    
    if (newForm.fecha_inicio && newForm.fecha_fin) {
      const start = new Date(newForm.fecha_inicio);
      const end = new Date(newForm.fecha_fin);
      if (end >= start) {
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        newForm.dias_solicitados = diffDays;
      } else {
        newForm.dias_solicitados = 0;
      }
    }
    
    setForm(newForm);
  };

  const selectStyles = {
    control: (base) => ({ ...base, borderRadius: '8px', borderColor: '#cbd5e1', minHeight: '40px' })
  };

  const permisosFiltrados = permisos.filter(p => {
    if (!busqueda) return true;
    const b = busqueda.toLowerCase();
    return String(p.id_permiso).includes(b) || 
           (p.nombre_completo || '').toLowerCase().includes(b) ||
           (p.tipo_permiso || '').toLowerCase().includes(b);
  });

  const getTipoPermisoConfig = (tipo) => {
    switch(tipo) {
      case 'No Remunerado': return { label: 'Permiso No Remunerado', color: '#ef4444', text: 'Descuento en Nómina' };
      case 'Remunerado': return { label: 'Permiso Remunerado', color: '#3b82f6', text: 'Pagado por la Empresa' };
      case 'Calamidad': return { label: 'Calamidad Doméstica', color: '#8b5cf6', text: 'Licencia Remunerada' };
      case 'Cita Médica': return { label: 'Cita Médica', color: '#0ea5e9', text: 'Justificado / Remunerado' };
      case 'Luto': return { label: 'Licencia de Luto', color: '#1e293b', text: '5 días Remunerados (Ley)' };
      case 'Paternidad/Maternidad': return { label: 'Lic. Paternidad/Maternidad', color: '#ec4899', text: 'Pagado por EPS' };
      default: return { label: tipo, color: '#64748b', text: '' };
    }
  };

  return (
    <div className="catalog-container">
      <div className="catalog-header print:hidden">
        <h2>📅 Control de Permisos y Licencias</h2>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => {
          setForm({ id_empleado: '', tipo_permiso: '', fecha_inicio: '', fecha_fin: '', dias_solicitados: 1, motivo: '', estado: 'Pendiente' });
          setShowModal(true);
        }}>
          <span>+</span> Registrar Permiso
        </button>
      </div>
      
      {/* Panel de Filtros */}
      <div className="print:hidden" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <span style={{ fontSize: '18px' }}>🔍</span>
          <h3 style={{ margin: 0, fontSize: '15px', color: '#334155' }}>Búsqueda y Filtros</h3>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Búsqueda General</label>
            <input 
              type="text" 
              placeholder="Buscar código, nombre..." 
              value={busqueda} 
              onChange={e => setBusqueda(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Rango de Fechas</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Finca / Hacienda</label>
            <Select 
              options={[{ value: 'Todas', label: '-- Todas --' }, ...fincasList.map(f => ({ value: f.id_finca.toString(), label: f.nombre }))]}
              value={{ value: fincaFiltro, label: fincaFiltro === 'Todas' ? '-- Todas --' : fincasList.find(f => f.id_finca.toString() === fincaFiltro)?.nombre || '-- Todas --' }}
              onChange={(sel) => setFincaFiltro(sel.value)}
              styles={selectStyles}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Empleado</label>
            <Select 
              options={empleados.map(e => ({ value: e.id_empleado, label: e.nombres + ' ' + (e.apellidos || '') }))}
              value={form.id_empleado ? { value: empleadoFiltro, label: empleados.find(e => e.id_empleado === empleadoFiltro)?.nombres } : null}
              onChange={(sel) => setEmpleadoFiltro(sel ? sel.value : '')}
              isClearable
              placeholder="Buscar empleado..."
              styles={selectStyles}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
          <button onClick={fetchPermisos} className="btn btn-primary" style={{ padding: '10px 24px', fontWeight: 'bold', fontSize: '14px', background: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚙️</span> {loading ? 'Procesando...' : 'Procesar / Consultar'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner"></div><span className="loading-text">Cargando permisos...</span></div>
      ) : !yaBuscado ? (
        <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', color: '#64748b' }}>
          👆 Presione <strong>Procesar / Consultar</strong> para cargar los permisos según los filtros.
        </div>
      ) : permisosFiltrados.length === 0 ? (
        <p style={{ padding: '20px', textAlign: 'center', color: '#64748b', background: 'white', borderRadius: '12px' }}>No hay permisos registrados con estos filtros.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {['Pendiente', 'Aprobado', 'Rechazado'].map(status => (
            <div key={status} style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px' }}>{status}</h3>
                <span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                  {permisosFiltrados.filter(p => p.estado === status).length}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {permisosFiltrados.filter(p => p.estado === status).map(p => {
                  const conf = getTipoPermisoConfig(p.tipo_permiso);
                  return (
                    <div key={p.id_permiso} style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ background: conf.color + '20', color: conf.color, padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          {conf.label}
                        </span>
                        <span style={{ fontSize: '12px', color: '#475569', fontWeight: 'bold', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {p.dias_solicitados} días
                        </span>
                      </div>
                      
                      <h4 style={{ margin: '8px 0 4px 0', color: '#1e293b', fontSize: '14px' }}>{p.nombre_completo}</h4>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', background: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>{p.finca_nombre || 'Sin Finca'}</span>
                        <span style={{ fontSize: '11px', background: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>{p.cargo || 'Sin Cargo'}</span>
                      </div>
                      
                      <div style={{ fontSize: '12px', color: '#475569', marginBottom: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                        <div><strong style={{ display: 'block', color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase' }}>Desde</strong> {p.fecha_inicio.substring(0,10)}</div>
                        <div><strong style={{ display: 'block', color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase' }}>Hasta</strong> {p.fecha_fin.substring(0,10)}</div>
                      </div>
                      
                      <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '6px', borderLeft: `3px solid ${conf.color}`, fontSize: '12px', color: '#334155', fontStyle: 'italic', marginBottom: '12px' }}>
                        "{p.motivo}"
                      </div>
                      
                      {conf.text && (
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: conf.color, textAlign: 'right', marginBottom: '8px' }}>
                          ℹ️ {conf.text}
                        </div>
                      )}
                      
                      {status === 'Pendiente' && (
                        <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                          <button className="btn btn-outline" style={{ flex: 1, borderColor: '#10b981', color: '#10b981', padding: '6px' }}>Aprobar</button>
                          <button className="btn btn-outline" style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444', padding: '6px' }}>Rechazar</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR PERMISO */}
      {showModal && (
        <div style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(15, 23, 42, 0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding: '20px' }}>
          <div style={{ background:'white', padding:'24px', borderRadius:'12px', width:'100%', maxWidth: '500px' }}>
            <h3 style={{ marginTop: 0, borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', color: '#1e293b' }}>Registrar Permiso o Licencia</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Trabajador *</label>
                <Select 
                  options={empleados.map(e => ({ 
                    value: e.id_empleado, 
                    label: (e.t_documento || e.identificacion || e.numero_documento || 'CC') + ' - ' + e.nombres + ' ' + (e.apellidos || ''),
                    id_finca: e.id_finca
                  }))}
                  value={form.id_empleado ? { value: form.id_empleado, label: empleados.find(e => e.id_empleado === form.id_empleado) ? ((empleados.find(e => e.id_empleado === form.id_empleado).t_documento || 'CC') + ' - ' + empleados.find(e => e.id_empleado === form.id_empleado).nombres) : '' } : null}
                  onChange={(sel) => setForm({...form, id_empleado: sel ? sel.value : ''})}
                  isClearable
                  placeholder="Seleccione el empleado..."
                  styles={selectStyles}
                />
                {form.id_empleado && (
                  <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 'bold', marginTop: '4px', paddingLeft: '4px' }}>
                    📍 Finca / Área actual: {fincasList.find(f => f.id_finca === empleados.find(e => e.id_empleado === form.id_empleado)?.id_finca)?.nombre || 'General / Sin Asignar'}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Tipo de Licencia/Permiso (Ley Colombia) *</label>
                <Select 
                  options={[
                    { value: 'Luto', label: 'Licencia de Luto (5 días hábiles - Remunerado)' },
                    { value: 'Paternidad/Maternidad', label: 'Licencia Paternidad/Maternidad' },
                    { value: 'Calamidad', label: 'Calamidad Doméstica (Remunerado)' },
                    { value: 'Cita Médica', label: 'Cita Médica (Remunerado)' },
                    { value: 'No Remunerado', label: 'Permiso Personal NO Remunerado' },
                    { value: 'Remunerado', label: 'Permiso Especial Remunerado' }
                  ]}
                  value={form.tipo_permiso ? { value: form.tipo_permiso, label: form.tipo_permiso } : null}
                  onChange={(sel) => setForm({...form, tipo_permiso: sel ? sel.value : ''})}
                  styles={selectStyles}
                />
                {form.tipo_permiso === 'No Remunerado' && (
                  <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold', marginTop: '4px' }}>⚠️ Al aprobarse, se descontará automáticamente de la nómina.</div>
                )}
                {['Luto', 'Calamidad', 'Cita Médica', 'Remunerado'].includes(form.tipo_permiso) && (
                  <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold', marginTop: '4px' }}>✅ Ausencia justificada. No afecta el salario básico.</div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Fecha Inicio *</label>
                  <input type="date" value={form.fecha_inicio} onChange={e=>handleDateChange('fecha_inicio', e.target.value)} style={{ width:'100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Fecha Fin *</label>
                  <input type="date" value={form.fecha_fin} onChange={e=>handleDateChange('fecha_fin', e.target.value)} style={{ width:'100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Días Solicitados *</label>
                <input type="number" min="1" value={form.dias_solicitados} onChange={e=>setForm({...form, dias_solicitados: e.target.value})} style={{ width:'100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Motivo / Observaciones *</label>
                <textarea rows="3" value={form.motivo} onChange={e=>setForm({...form, motivo: e.target.value})} style={{ width:'100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'none' }} placeholder="Detalle el motivo del permiso..." />
              </div>
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end', gap:'12px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-outline" disabled={saving}>Cancelar</button>
              <button onClick={savePermiso} className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Registrar Permiso'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
