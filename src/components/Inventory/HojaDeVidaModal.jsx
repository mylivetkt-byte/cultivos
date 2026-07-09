import React from 'react';

function HojaDeVidaModal({ employee, onClose }) {
  if (!employee) return null;

  // For demo purposes, we'll use a placeholder photo if none exists
  const photoUrl = employee.fotografia || 'https://i.pravatar.cc/150?img=11';

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '700px', padding: 0, overflow: 'hidden' }}>
        
        {/* Header Banner */}
        <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>Hoja de Vida Profesional</h2>
            <p style={{ margin: 0, opacity: 0.8 }}>Módulo de Recursos Humanos</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
        </div>

        <div className="modal-body" style={{ padding: '30px' }}>
          
          {/* Profile Section */}
          <div style={{ display: 'flex', gap: '30px', marginBottom: '30px', alignItems: 'center' }}>
            <div style={{ 
              width: '140px', height: '140px', 
              borderRadius: '50%', 
              overflow: 'hidden',
              border: '4px solid #e2e8f0',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <img src={photoUrl} alt="Foto de Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: '0 0 10px 0', fontSize: '28px', color: '#1e293b' }}>{employee.nombres} {employee.apellidos}</h1>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
                  {employee.cargo || 'Mecánico'}
                </span>
                <span style={{ backgroundColor: employee.estado === 'Activo' ? '#dcfce7' : '#fee2e2', color: employee.estado === 'Activo' ? '#166534' : '#991b1b', padding: '4px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
                  {employee.estado || 'Activo'}
                </span>
              </div>
              <p style={{ margin: '0 0 5px 0', color: '#64748b' }}><strong>Documento Identidad:</strong> {employee.documento || 'N/A'}</p>
              <p style={{ margin: '0 0 5px 0', color: '#64748b' }}><strong>ID Empleado:</strong> {employee.id_empleado}</p>
              <p style={{ margin: '0 0 5px 0', color: '#64748b' }}><strong>Teléfono / Celular:</strong> {employee.telefono || 'No registrado'}</p>
            </div>
          </div>
          
          {/* Details Grid */}
          <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#334155', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>Información Profesional y Académica</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>Fecha Ingreso</div>
                <div style={{ fontSize: '16px', color: '#0f172a' }}>{employee.fecha_ingreso ? new Date(employee.fecha_ingreso).toLocaleDateString() : 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>Área Asignada</div>
                <div style={{ fontSize: '16px', color: '#0f172a' }}>{employee.area_asignada || 'Taller de Maquinaria'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>Especialidad</div>
                <div style={{ fontSize: '16px', color: '#0f172a' }}>{employee.especialidad_agricola || 'Mantenimiento General / Motores Diesel'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>Formación Académica</div>
                <div style={{ fontSize: '16px', color: '#0f172a' }}>{employee.estudios || 'Técnico SENA en Mantenimiento Automotriz'}</div>
              </div>
            </div>
          </div>

        </div>
        <div style={{ padding: '15px 30px', backgroundColor: '#f1f5f9', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>Cerrar Hoja de Vida</button>
        </div>
      </div>
    </div>
  );
}

export default HojaDeVidaModal;
