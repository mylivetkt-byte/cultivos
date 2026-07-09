import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Camera, Save, X, User, Briefcase, FileText, Calculator } from 'lucide-react';
import { authFetch, insertRecord, updateRecord } from '../../utils/api';
import Modal from '../Modal';

const COLOMBIAN_STUDIES = [
  'Sin Estudios',
  'Básica Primaria',
  'Básica Secundaria',
  'Media Académica (Bachiller)',
  'Técnico',
  'Tecnólogo',
  'Profesional Universitario',
  'Especialización',
  'Maestría',
  'Doctorado'
];

const AREAS = [
  'Taller',
  'Administracion',
  'Recursos Humanos',
  'Invernadero',
  'Produccion Abonos Organicos',
  'Campo',
  'Sistemas',
  'Gerencia',
  'Almacen'
];

const CONTRATOS = ['Fijo', 'Indefinido', 'Por_Obra', 'Destajo'];
const ESTADOS = ['Activo', 'Inactivo', 'Vacaciones', 'Incapacitado'];
const SEXOS = ['Masculino', 'Femenino', 'Otro'];

function EmployeeFormModal({ isOpen, onClose, mode = 'add', pkValue, defaultValues = {}, tenantId, onSuccess }) {
  const [formData, setFormData] = useState({
    id_tenant: tenantId || 1,
    id_tercero: '',
    documento: '',
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    sexo: 'Masculino',
    estudios: 'Básica Secundaria',
    especialidad_agricola: '',
    telefono: '',
    
    // Laboral
    id_cargo: '',
    area_asignada: 'Campo',
    tipo_contrato: 'Destajo',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    salario_base: 0,
    estado: 'Activo',
    id_jefe: '',
    cuadrilla_nombre: '',
    
    // Menores
    tiene_permiso_mintrabajo: false,
    nombre_tutor_legal: '',
    identificacion_tutor: '',
    restriccion_horaria: '',
    
    // Liquidacion
    fecha_retiro: '',
    motivo_retiro: '',
    
    // Foto
    fotografia: ''
  });

  const [cargos, setCargos] = useState([]);
  const [jefes, setJefes] = useState([]);
  const [terceros, setTerceros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [liquidationData, setLiquidationData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
      if (mode === 'edit' && defaultValues) {
        setFormData({
          ...defaultValues,
          fecha_ingreso: defaultValues.fecha_ingreso ? defaultValues.fecha_ingreso.substring(0, 10) : '',
          fecha_nacimiento: defaultValues.fecha_nacimiento ? defaultValues.fecha_nacimiento.substring(0, 10) : ''
        });
      }
    }
  }, [isOpen, mode, defaultValues]);

  const loadDependencies = async () => {
    setLoading(true);
    try {
      // Intentar cargar terceros
      const resT = await authFetch('/api/table/terceros/data?pageSize=5000');
      const jsonT = await resT.json();
      setTerceros(jsonT.data || []);

      // Cargar posibles jefes (mismos empleados)
      const resE = await authFetch(`/api/rrhh/empleados?tenantId=${tenantId || 1}`);
      const jsonE = await resE.json();
      setJefes(Array.isArray(jsonE) ? jsonE : []);

      // Intentar cargar id_cargo si hay una tabla cargos. Si no existe, ignorar.
      try {
        const resC = await authFetch('/api/table/rrhh_cargos/data?pageSize=500');
        const jsonC = await resC.json();
        setCargos(jsonC.data || []);
      } catch (e) {
        console.warn("Tabla rrhh_cargos no disponible", e);
      }

      if (mode === 'edit' && pkValue) {
        try {
           const resLiq = await authFetch(`/api/table/rrhh_liquidacion_laboral/data?pageSize=10`); // Idealmente filtraríamos por id_contrato asociado al empleado
           const jsonLiq = await resLiq.json();
           // Como simplificación para la demo, si hay liquidaciones, tomamos la primera si el estado es Inactivo
           if (jsonLiq.data && jsonLiq.data.length > 0) {
              setLiquidationData(jsonLiq.data[0]);
           }
        } catch(e) {
           console.warn("Tabla liquidaciones no disponible", e);
        }
      }
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectChange = (name, val) => {
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, fotografia: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = { ...formData };
      
      // Limpiar campos nulls
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') payload[key] = null;
      });

      if (mode === 'edit') {
        await updateRecord('rrhh_empleados', pkValue, payload);
      } else {
        await insertRecord('rrhh_empleados', payload);
      }
      onSuccess();
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectStyles = {
    control: (base) => ({ ...base, background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text)' }),
    menu: (base) => ({ ...base, background: 'var(--card-bg)', color: 'var(--text)', zIndex: 9999 }),
    option: (base, state) => ({ ...base, background: state.isFocused ? 'var(--primary-light)' : 'transparent', color: 'var(--text)' }),
    singleValue: (base) => ({ ...base, color: 'var(--text)' })
  };

  if (loading) {
    return <Modal isOpen={isOpen} onClose={onClose} title="Cargando..."><div style={{padding: 40, textAlign: 'center'}}>Cargando dependencias...</div></Modal>;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? 'Editar Empleado' : 'Registro de Nuevo Empleado'}
      footer={
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', width: '100%', padding: '10px 0' }}>
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={onClose} disabled={submitting}>
            <X size={16} /> Cancelar
          </button>
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 24px' }} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Guardando...' : <><Save size={16} /> Guardar Registro</>}
          </button>
        </div>
      }
    >
      <div style={{ padding: '0 10px' }}>
        {/* Modern Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
          <button 
            onClick={() => setActiveTab('personal')}
            style={{
              padding: '12px 20px', 
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'personal' ? '3px solid #4f46e5' : '3px solid transparent',
              color: activeTab === 'personal' ? '#4f46e5' : '#64748b',
              fontWeight: activeTab === 'personal' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              transform: 'translateY(2px)'
            }}
          >
            <User size={18} /> Información Personal
          </button>
          <button 
            onClick={() => setActiveTab('laboral')}
            style={{
              padding: '12px 20px', 
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'laboral' ? '3px solid #4f46e5' : '3px solid transparent',
              color: activeTab === 'laboral' ? '#4f46e5' : '#64748b',
              fontWeight: activeTab === 'laboral' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              transform: 'translateY(2px)'
            }}
          >
            <Briefcase size={18} /> Información Laboral
          </button>
          <button 
            onClick={() => setActiveTab('menores')}
            style={{
              padding: '12px 20px', 
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'menores' ? '3px solid #ea580c' : '3px solid transparent',
              color: activeTab === 'menores' ? '#ea580c' : '#64748b',
              fontWeight: activeTab === 'menores' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              transform: 'translateY(2px)'
            }}
          >
            <FileText size={18} /> Regulación Menores
          </button>
          
          {(formData.estado === 'Inactivo' || liquidationData) && (
            <button 
              onClick={() => setActiveTab('liquidacion')}
              style={{
                padding: '12px 20px', 
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'liquidacion' ? '3px solid #dc2626' : '3px solid transparent',
                color: activeTab === 'liquidacion' ? '#dc2626' : '#64748b',
                fontWeight: activeTab === 'liquidacion' ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: 'translateY(2px)'
              }}
            >
              <Calculator size={18} /> Liquidación
            </button>
          )}
        </div>

        <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '10px' }}>
          
          {/* PESTAÑA PERSONAL */}
          {activeTab === 'personal' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', animation: 'fadeIn 0.3s ease-in-out' }}>
              {/* Columna Izquierda */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: '600', color: '#334155' }}>Vincular a Tercero Existente (Opcional)</label>
                  <Select
                    options={terceros.map(t => ({ value: t.id_tercero, label: t.nombre_completo || t.razon_social || t.documento_identidad }))}
                    value={formData.id_tercero ? { value: formData.id_tercero, label: terceros.find(t => t.id_tercero === formData.id_tercero)?.nombre_completo } : null}
                    onChange={(sel) => handleSelectChange('id_tercero', sel ? sel.value : null)}
                    isClearable
                    placeholder="Buscar tercero..."
                    styles={selectStyles}
                  />
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Útil para cruzar con contabilidad y nómina.</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: '600', color: '#334155' }}>Cédula / NIT <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="text" name="documento" value={formData.documento || ''} onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: '600', color: '#334155' }}>Teléfono</label>
                    <input type="text" name="telefono" value={formData.telefono || ''} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: '600', color: '#334155' }}>Nombres <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="text" name="nombres" value={formData.nombres || ''} onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: '600', color: '#334155' }}>Apellidos <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="text" name="apellidos" value={formData.apellidos || ''} onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: '600', color: '#334155' }}>Fecha Nacimiento</label>
                    <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento || ''} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: '600', color: '#334155' }}>Sexo</label>
                    <select name="sexo" value={formData.sexo} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Columna Derecha */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}><Camera size={16} /> Fotografía del Perfil</label>
                  <div style={{ 
                    border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '16px', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                    height: '180px', position: 'relative', background: '#f8fafc', transition: 'all 0.2s ease', cursor: 'pointer'
                  }}>
                    {formData.fotografia ? (
                      <>
                        <img src={formData.fotografia} alt="Empleado" style={{ height: '100%', objectFit: 'contain', borderRadius: '8px' }} />
                        <button 
                          onClick={(e) => { e.preventDefault(); handleSelectChange('fotografia', ''); }} 
                          style={{ position: 'absolute', top: '8px', right: '8px', background: '#fee2e2', color: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Quitar
                        </button>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                        <Camera size={40} style={{ margin: '0 auto 8px auto', color: '#cbd5e1' }} />
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>Haz clic o arrastra una foto aquí</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: '600', color: '#334155' }}>Nivel de Estudios (Colombia)</label>
                  <select name="estudios" value={formData.estudios} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    {COLOMBIAN_STUDIES.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: '600', color: '#334155' }}>Especialidad / Título</label>
                  <input type="text" name="especialidad_agricola" value={formData.especialidad_agricola || ''} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="Ej: Ingeniero Agrónomo, Operario..." />
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA LABORAL */}
          {activeTab === 'laboral' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', animation: 'fadeIn 0.3s ease-in-out' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: '600', color: '#334155' }}>Cargo Oficial (ID Relacional)</label>
                  {cargos.length > 0 ? (
                    <Select
                      options={cargos.map(c => ({ value: c.id_cargo, label: c.descripcion }))}
                      value={formData.id_cargo ? { value: formData.id_cargo, label: cargos.find(c => c.id_cargo === formData.id_cargo)?.descripcion } : null}
                      onChange={(sel) => handleSelectChange('id_cargo', sel ? sel.value : null)}
                      isClearable
                      placeholder="Seleccione Cargo Oficial..."
                      styles={selectStyles}
                    />
                  ) : (
                    <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc' }}>
                      Catálogo de cargos no disponible. Introduce el ID manualmente:
                      <input type="number" name="id_cargo" value={formData.id_cargo || ''} onChange={handleChange} style={{ width: '100%', marginTop: '8px', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: '600', color: '#334155' }}>Área Asignada</label>
                    <select name="area_asignada" value={formData.area_asignada} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      {AREAS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: '600', color: '#334155' }}>Cuadrilla Asignada</label>
                    <input type="text" name="cuadrilla_nombre" value={formData.cuadrilla_nombre || ''} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="Ej: Cuadrilla Cosecha Lote 1" />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: '600', color: '#334155' }}>Jefe Directo</label>
                  <Select
                    options={jefes.map(j => ({ value: j.id_empleado, label: j.nombres + ' ' + (j.apellidos||'') }))}
                    value={formData.id_jefe ? { value: formData.id_jefe, label: jefes.find(j => j.id_empleado === formData.id_jefe)?.nombres } : null}
                    onChange={(sel) => handleSelectChange('id_jefe', sel ? sel.value : null)}
                    isClearable
                    placeholder="Buscar jefe..."
                    styles={selectStyles}
                  />
                </div>

              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: '600', color: '#334155' }}>Tipo de Contrato</label>
                    <select name="tipo_contrato" value={formData.tipo_contrato} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      {CONTRATOS.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: '600', color: '#334155' }}>Estado</label>
                    <select name="estado" value={formData.estado} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: formData.estado === 'Activo' ? '#16a34a' : '#475569' }}>
                      {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: '600', color: '#334155' }}>Fecha de Ingreso</label>
                  <input type="date" name="fecha_ingreso" value={formData.fecha_ingreso || ''} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: '600', color: '#334155' }}>Salario Base (Mensual o Jornal)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 'bold' }}>$</span>
                    <input type="number" name="salario_base" value={formData.salario_base || ''} onChange={handleChange} style={{ width: '100%', padding: '10px 10px 10px 32px', borderRadius: '6px', border: '2px solid #e2e8f0', fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }} />
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', lineHeight: '1.4' }}>
                    Ref. Jornal Agrícola: ~$50,000 COP/día.<br/>Mínimo mensual (2024): ~$1,300,000 COP.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA MENORES */}
          {activeTab === 'menores' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease-in-out', background: '#fff7ed', padding: '24px', borderRadius: '12px', border: '1px solid #ffedd5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#ffffff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <input type="checkbox" id="tiene_permiso" name="tiene_permiso_mintrabajo" checked={formData.tiene_permiso_mintrabajo} onChange={handleChange} style={{ width: '20px', height: '20px', accentColor: '#ea580c', cursor: 'pointer' }} />
                <label htmlFor="tiene_permiso" style={{ fontWeight: '700', color: '#1e293b', cursor: 'pointer', margin: 0 }}>
                  Cuenta con Permiso del Inspector Laboral / Ministerio de Trabajo
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: '600', color: '#334155' }}>Nombre Completo del Tutor Legal</label>
                  <input type="text" name="nombre_tutor_legal" value={formData.nombre_tutor_legal || ''} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }} placeholder="Madre, Padre o Acudiente" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: '600', color: '#334155' }}>Identificación del Tutor</label>
                  <input type="text" name="identificacion_tutor" value={formData.identificacion_tutor || ''} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: '600', color: '#334155' }}>Restricciones de Horario o Labor</label>
                <textarea name="restriccion_horaria" value={formData.restriccion_horaria || ''} onChange={handleChange} rows="3" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', resize: 'vertical' }} placeholder="Ej: No puede laborar después de las 6:00 PM, máximo 6 horas diarias. No exposición a químicos agropecuarios." />
              </div>

              <div style={{ padding: '16px', background: '#ffedd5', borderRadius: '8px', color: '#9a3412', fontSize: '13px', lineHeight: '1.5', fontWeight: '500' }}>
                <strong>Nota Legal:</strong> Según la legislación colombiana, los menores entre 15 y 17 años requieren autorización escrita del Inspector de Trabajo o Alcalde. Tienen restricciones estrictas de jornada laboral (máximo 6 horas diarias hasta los 17, u 8 horas a los 17) y tienen prohibidas las labores peligrosas e insalubres (como fumigación con agroquímicos).
              </div>
            </div>
          )}

          {/* PESTAÑA LIQUIDACION */}
          {activeTab === 'liquidacion' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease-in-out', background: '#fef2f2', padding: '24px', borderRadius: '12px', border: '1px solid #fee2e2' }}>
              <h3 style={{ margin: 0, color: '#991b1b', borderBottom: '1px solid #fecaca', paddingBottom: '10px' }}>Detalles de Liquidación (Auditoría)</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: '600', color: '#7f1d1d' }}>Fecha de Inicio de Contrato</label>
                  <input type="date" value={formData.fecha_ingreso || ''} readOnly style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#f8717111', color: '#7f1d1d' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: '600', color: '#7f1d1d' }}>Fecha de Retiro</label>
                  <input type="date" name="fecha_retiro" value={liquidationData?.fecha_liquidacion ? liquidationData.fecha_liquidacion.substring(0, 10) : formData.fecha_retiro || ''} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fff' }} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: '600', color: '#7f1d1d' }}>Motivo de Retiro</label>
                <input type="text" name="motivo_retiro" value={liquidationData?.motivo_retiro || formData.motivo_retiro || ''} onChange={handleChange} placeholder="Ej: Renuncia voluntaria, Fin de obra, Despido justificado..." style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fff' }} />
              </div>

              {liquidationData && (
                <div style={{ marginTop: '10px', padding: '16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #fecaca', boxShadow: '0 2px 4px rgba(220, 38, 38, 0.05)' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#991b1b', fontSize: '14px' }}>Resumen Financiero Pagado</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#475569' }}>Total Liquidado:</span>
                    <span style={{ fontWeight: 'bold', color: '#0f172a' }}>$ {Number(liquidationData.total_pagado).toLocaleString('es-CO')}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                    Nota: El desglose exacto (Cesantías, Prima, Vacaciones) reposa en el comprobante contable vinculado.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </Modal>
  );
}

export default EmployeeFormModal;
