import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import Select from 'react-select';
import { authFetch } from '../../utils/api';

export default function ProgramadorVacaciones({ tenantId }) {
  const [vacaciones, setVacaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [yaBuscado, setYaBuscado] = useState(false);
  const [error, setError] = useState(null);

  // Catálogos
  const [empleados, setEmpleados] = useState([]);
  
  // Filtros
  const [empleadoFiltro, setEmpleadoFiltro] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Modal Programar Vacaciones
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    id_empleado: '',
    fecha_inicio: '',
    fecha_fin: '',
    dias_disfrutados: 1, // Hábiles
    observaciones: '',
    estado: 'Programada'
  });

  const [preliquidador, setPreliquidador] = useState({
    salarioBase: 0,
    diasCalendario: 0,
    valorEstimado: 0
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
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVacaciones = async () => {
    setLoading(true);
    setYaBuscado(true);
    try {
      const tid = tenantId || 1;
      let url = `/api/rrhh/vacaciones?tenantId=${tid}`;
      if (empleadoFiltro) url += `&empleadoId=${empleadoFiltro}`;
      if (fechaDesde) url += `&fechaDesde=${fechaDesde}`;
      if (fechaHasta) url += `&fechaHasta=${fechaHasta}`;

      const res = await authFetch(url);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setVacaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      message.error('No se pudieron cargar las vacaciones.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (field, value) => {
    const newForm = { ...form, [field]: value };
    setForm(newForm);
    recalcularPreliquidador(newForm.id_empleado, newForm.fecha_inicio, newForm.fecha_fin);
  };

  const handleEmpleadoChange = (empleadoId) => {
    const newForm = { ...form, id_empleado: empleadoId };
    setForm(newForm);
    recalcularPreliquidador(empleadoId, newForm.fecha_inicio, newForm.fecha_fin);
  };

  const recalcularPreliquidador = (empId, fInicio, fFin) => {
    if (!empId) {
      setPreliquidador({ salarioBase: 0, diasCalendario: 0, valorEstimado: 0 });
      return;
    }
    
    const emp = empleados.find(e => e.id_empleado === empId);
    const salarioBase = emp ? (parseFloat(emp.salario_base) || 0) : 0;
    
    let diasCal = 0;
    let valorEst = 0;

    if (fInicio && fFin) {
      const start = new Date(fInicio);
      const end = new Date(fFin);
      if (end >= start) {
        const diffTime = Math.abs(end - start);
        diasCal = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        valorEst = (salarioBase / 30) * diasCal;
      }
    }

    setPreliquidador({
      salarioBase,
      diasCalendario: diasCal,
      valorEstimado: valorEst
    });
  };

  const saveVacaciones = async () => {
    if (!form.id_empleado || !form.fecha_inicio || !form.fecha_fin || !form.dias_disfrutados) {
      return message.error('Por favor complete todos los campos obligatorios');
    }
    setSaving(true);
    try {
      const res = await authFetch('/api/rrhh/vacaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenantId || 1, vacacion: form })
      });
      if (!res.ok) throw new Error('Error al programar vacaciones');
      message.success('Vacaciones programadas correctamente');
      setShowModal(false);
      if (yaBuscado) fetchVacaciones();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const selectStyles = {
    control: (base) => ({ ...base, borderRadius: '8px', borderColor: '#cbd5e1', minHeight: '40px' })
  };

  const vacacionesFiltradas = vacaciones.filter(v => {
    if (!busqueda) return true;
    const b = busqueda.toLowerCase();
    return String(v.id_vacacion).includes(b) || 
           (v.nombre_completo || '').toLowerCase().includes(b);
  });

  return (
    <div className="catalog-container">
      <div className="catalog-header print:hidden">
        <h2>🏖️ Programador de Vacaciones</h2>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => {
          setForm({ id_empleado: '', fecha_inicio: '', fecha_fin: '', dias_disfrutados: 1, observaciones: '', estado: 'Programada' });
          setPreliquidador({ salarioBase: 0, diasCalendario: 0, valorEstimado: 0 });
          setShowModal(true);
        }}>
          <span>+</span> Programar Vacaciones
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
              placeholder="Buscar código o nombre..." 
              value={busqueda} 
              onChange={e => setBusqueda(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Empleado</label>
            <Select 
              options={empleados.map(e => ({ 
                value: e.id_empleado, 
                label: (e.t_documento || e.identificacion || e.numero_documento || 'CC') + ' - ' + e.nombres + ' ' + (e.apellidos || '')
              }))}
              value={empleadoFiltro ? { value: empleadoFiltro, label: empleados.find(e => e.id_empleado === empleadoFiltro) ? ((empleados.find(e => e.id_empleado === empleadoFiltro).t_documento || 'CC') + ' - ' + empleados.find(e => e.id_empleado === empleadoFiltro).nombres) : '' } : null}
              onChange={(sel) => setEmpleadoFiltro(sel ? sel.value : '')}
              isClearable
              placeholder="Buscar empleado..."
              styles={selectStyles}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Rango de Fechas</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
          <button onClick={fetchVacaciones} className="btn btn-primary" style={{ padding: '10px 24px', fontWeight: 'bold', fontSize: '14px', background: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚙️</span> {loading ? 'Procesando...' : 'Procesar / Consultar'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner"></div><span className="loading-text">Cargando vacaciones...</span></div>
      ) : !yaBuscado ? (
        <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', color: '#64748b' }}>
          👆 Presione <strong>Procesar / Consultar</strong> para cargar la programación según los filtros.
        </div>
      ) : vacacionesFiltradas.length === 0 ? (
        <p style={{ padding: '20px', textAlign: 'center', color: '#64748b', background: 'white', borderRadius: '12px' }}>No hay vacaciones programadas con estos filtros.</p>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Fecha Inicio</th>
                <th>Fecha Fin</th>
                <th>Días a Disfrutar (Hábiles)</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {vacacionesFiltradas.map(v => {
                const isEnCurso = v.estado === 'En Curso';
                return (
                  <tr key={v.id_vacacion}>
                    <td>
                      <strong>{v.nombre_completo}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{v.cargo || 'Sin Cargo'} • {v.finca_nombre || 'Sin Finca'}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: '#334155' }}>{v.fecha_inicio.substring(0, 10)}</td>
                    <td style={{ fontFamily: 'monospace', color: '#334155' }}>{v.fecha_fin.substring(0, 10)}</td>
                    <td><strong>{v.dias_disfrutados} días</strong></td>
                    <td>
                      <span className={`badge ${
                        isEnCurso ? 'orange' :
                        v.estado === 'Programada' ? 'blue' :
                        'gray'
                      }`}>
                        {v.estado}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL PROGRAMAR VACACIONES */}
      {showModal && (
        <div style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(15, 23, 42, 0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding: '20px' }}>
          <div style={{ background:'white', padding:'24px', borderRadius:'12px', width:'100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', color: '#1e293b' }}>🏖️ Programar Vacaciones y Preliquidador</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Trabajador *</label>
                <Select 
                  options={empleados.map(e => ({ 
                    value: e.id_empleado, 
                    label: (e.t_documento || e.identificacion || e.numero_documento || 'CC') + ' - ' + e.nombres + ' ' + (e.apellidos || '')
                  }))}
                  value={form.id_empleado ? { value: form.id_empleado, label: empleados.find(e => e.id_empleado === form.id_empleado) ? ((empleados.find(e => e.id_empleado === form.id_empleado).t_documento || 'CC') + ' - ' + empleados.find(e => e.id_empleado === form.id_empleado).nombres) : '' } : null}
                  onChange={(sel) => handleEmpleadoChange(sel ? sel.value : '')}
                  isClearable
                  placeholder="Seleccione el empleado..."
                  styles={selectStyles}
                />
              </div>

              {form.id_empleado && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🧾</span> Preliquidador de Vacaciones (Ley Colombia)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '12px' }}>
                    <div>
                      <span style={{ display: 'block', color: '#64748b', marginBottom: '2px' }}>Salario Base:</span>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                        ${preliquidador.salarioBase.toLocaleString('es-CO')}
                      </strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: '#64748b', marginBottom: '2px' }}>Días Calendario (Pagos):</span>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                        {preliquidador.diasCalendario} días
                      </strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: '#64748b', marginBottom: '2px' }}>Valor Estimado Vacaciones:</span>
                      <strong style={{ fontSize: '15px', color: '#10b981' }}>
                        ${Math.round(preliquidador.valorEstimado).toLocaleString('es-CO')}
                      </strong>
                    </div>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                    * Cálculo orientativo: (Salario Base / 30) * Días Calendario. No incluye promedios de horas extras o recargos del último año.
                  </div>
                </div>
              )}

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
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Días Hábiles a Disfrutar (Descontables) *</label>
                <input type="number" min="1" value={form.dias_disfrutados} onChange={e=>setForm({...form, dias_disfrutados: e.target.value})} style={{ width:'100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                  Días hábiles laborables que descontarán del saldo de 15 días anuales de ley.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Observaciones</label>
                <textarea rows="2" value={form.observaciones} onChange={e=>setForm({...form, observaciones: e.target.value})} style={{ width:'100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'none' }} placeholder="Opcional..." />
              </div>
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end', gap:'12px', marginTop: '24px' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-outline" disabled={saving}>Cancelar</button>
              <button onClick={saveVacaciones} className="btn btn-primary" disabled={saving}>{saving ? 'Programando...' : 'Programar Vacaciones'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
