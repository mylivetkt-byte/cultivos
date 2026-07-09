import React, { useState, useEffect } from 'react';

function HistoriaClinicaModal({ animalId, onClose }) {
  const [animal, setAnimal] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Formulario nuevo evento
  const [moduloSeleccionado, setModuloSeleccionado] = useState('Sanidad');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState({});

  const fetchHistoria = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ganado_avanzado/historia/${animalId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if(res.ok) {
        const data = await res.json();
        setAnimal(data.animal);
        setHistorial(data.historial);
      } else {
        alert('Error al cargar la historia clínica. Asegúrate de reiniciar el servidor.');
      }
    } catch(e) {
      console.error(e);
      alert('Error de conexión al cargar la historia clínica.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if(animalId) fetchHistoria();
  }, [animalId]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/ganado_avanzado/historia/${animalId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ modulo: moduloSeleccionado, fecha, ...formData })
      });
      if(res.ok) {
        setFormData({});
        fetchHistoria();
      } else {
        alert('Error al guardar el evento.');
      }
    } catch(err) {
      console.error(err);
      alert('Error de conexión.');
    }
  };

  if(loading) return (
    <div className="modal-backdrop" style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>Cargando Historia Clínica...</div>
    </div>
  );

  if(!animal) return null;

  return (
    <div className="modal-backdrop" style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="modal-content" style={{ background: 'white', padding: '25px', borderRadius: '8px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border)', paddingBottom: '15px' }}>
          <h2 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🏥 Historia Clínica y Reproductiva
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
        </div>

        {/* Resumen Animal */}
        <div style={{ display: 'flex', gap: '20px', background: 'var(--bg-color)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '40px' }}>{animal.especie === 'Equino' ? '🐴' : animal.especie === 'Porcino' ? '🐷' : '🐄'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', width: '100%', fontSize: '14px' }}>
            <div><strong style={{ color: 'var(--text-muted)' }}>ID / Nombre:</strong><br/>{animal.arete_crotal} - {animal.nombre}</div>
            <div><strong style={{ color: 'var(--text-muted)' }}>Especie / Raza:</strong><br/>{animal.especie} / {animal.raza}</div>
            <div><strong style={{ color: 'var(--text-muted)' }}>Sexo:</strong><br/>{animal.sexo}</div>
            <div><strong style={{ color: 'var(--text-muted)' }}>Edad Actual:</strong><br/>{animal.edad_meses} meses</div>
            <div><strong style={{ color: 'var(--text-muted)' }}>Estado:</strong><br/><span style={{ background: animal.estado === 'Activo' ? '#10b981' : '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{animal.estado}</span></div>
            <div><strong style={{ color: 'var(--text-muted)' }}>Peso:</strong><br/>{animal.peso_actual_kg} kg</div>
            <div style={{ gridColumn: 'span 2' }}><strong style={{ color: 'var(--text-muted)' }}>Ubicación:</strong><br/>{animal.finca} - {animal.potrero}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px' }}>
          
          {/* Formulario Nuevo Evento */}
          <div style={{ flex: '1', background: 'var(--card-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>📝 Registrar Nuevo Evento</h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tipo de Evento</label><br/>
                <select value={moduloSeleccionado} onChange={e => { setModuloSeleccionado(e.target.value); setFormData({}); }} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <option value="Sanidad">Sanidad (Operaciones, Enfermedades)</option>
                  <option value="Reproduccion">Reproducción (Partos, Servicios)</option>
                  <option value="Vacunacion">Vacunación / Desparasitación</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Fecha</label><br/>
                <input type="date" required value={fecha} onChange={e => setFecha(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
              </div>

              {moduloSeleccionado === 'Sanidad' && (
                <>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Diagnóstico / Procedimiento</label><br/>
                    <input type="text" required placeholder="Ej: Cólico, Operación hernia..." value={formData.diagnostico || ''} onChange={e => setFormData({...formData, diagnostico: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tratamiento / Medicamentos</label><br/>
                    <textarea required rows="3" placeholder="Ej: Se aplicó antibiótico..." value={formData.tratamiento || ''} onChange={e => setFormData({...formData, tratamiento: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', resize: 'none' }}></textarea>
                  </div>
                </>
              )}

              {moduloSeleccionado === 'Reproduccion' && (
                <>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Evento Reproductivo</label><br/>
                    <select required value={formData.tipo_evento || ''} onChange={e => setFormData({...formData, tipo_evento: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                      <option value="">-- Seleccionar --</option>
                      <option value="Servicio">Servicio / Inseminación</option>
                      <option value="Diagnostico_Gestacion">Diagnóstico de Gestación</option>
                      <option value="Parto">Parto</option>
                      <option value="Aborto">Aborto</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Observaciones</label><br/>
                    <textarea rows="3" placeholder="Ej: Parto normal, cría macho..." value={formData.observaciones || ''} onChange={e => setFormData({...formData, observaciones: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', resize: 'none' }}></textarea>
                  </div>
                </>
              )}

              {moduloSeleccionado === 'Vacunacion' && (
                <>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tipo de Vacuna/Medio</label><br/>
                    <input type="text" required placeholder="Ej: Aftosa, Ivermectina..." value={formData.tipo_vacuna || ''} onChange={e => setFormData({...formData, tipo_vacuna: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: '1' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Dosis</label><br/>
                      <input type="text" value={formData.dosis || ''} onChange={e => setFormData({...formData, dosis: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                    </div>
                    <div style={{ flex: '1' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Próxima Dosis</label><br/>
                      <input type="date" value={formData.proxima_fecha || ''} onChange={e => setFormData({...formData, proxima_fecha: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Veterinario</label><br/>
                    <input type="text" value={formData.veterinario || ''} onChange={e => setFormData({...formData, veterinario: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                  </div>
                </>
              )}

              <button type="submit" style={{ marginTop: '10px', background: 'var(--primary)', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>➕ Guardar Registro</button>
            </form>
          </div>

          {/* Historial Timeline */}
          <div style={{ flex: '2', background: 'var(--card-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)', maxHeight: '500px', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>⏳ Historial (Línea de Tiempo)</h3>
            {historial.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '40px' }}>No hay registros clínicos o reproductivos.</p>
            ) : (
              <div style={{ position: 'relative', borderLeft: '2px solid #e2e8f0', marginLeft: '10px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {historial.map((ev, idx) => {
                  let color = '#94a3b8';
                  let titulo = '';
                  let descripcion = '';

                  if (ev.modulo === 'Reproduccion') {
                    color = '#ec4899'; // Pink
                    titulo = `[Reproducción] ${ev.tipo_evento}`;
                    descripcion = ev.observaciones;
                  } else if (ev.modulo === 'Sanidad') {
                    color = '#ef4444'; // Red
                    titulo = `[Sanidad] ${ev.diagnostico}`;
                    descripcion = ev.tratamiento;
                  } else if (ev.modulo === 'Vacunacion') {
                    color = '#3b82f6'; // Blue
                    titulo = `[Vacunación] ${ev.tipo_vacuna}`;
                    descripcion = `Dosis: ${ev.dosis || 'N/A'}. Vet: ${ev.veterinario || 'N/A'}`;
                  }

                  return (
                    <div key={idx} style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '-27px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', background: color, border: '2px solid white' }}></div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold' }}>{ev.fecha?.split('T')[0]}</div>
                      <div style={{ fontSize: '14px', color: color, fontWeight: 'bold', marginTop: '2px' }}>{titulo}</div>
                      {descripcion && <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '4px', background: '#f8fafc', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>{descripcion}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default HistoriaClinicaModal;
