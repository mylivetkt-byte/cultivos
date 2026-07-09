import React, { useState, useEffect } from 'react';
import Select from 'react-select';

function ProgramadorPrenez() {
  const [data, setData] = useState({
    kanban: { enEspera: [], prenadas: [], vacias: [] },
    metricas: { tasaPrenez: 0, prenadas: 0, proximas_a_parir: 0, totalServidas: 0 }
  });
  const [candidatas, setCandidatas] = useState([]);
  const [toros, setToros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('Todas');
  
  // Formulario
  const [formData, setFormData] = useState({
    id_animal: '', tipo_evento: 'Servicio', fecha: new Date().toISOString().split('T')[0], 
    metodo_servicio: 'Monta Natural', id_toro: '', pajilla_ia: '', resultado_diagnostico: 'Positivo', observaciones: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resDash, resCand, resToros] = await Promise.all([
        fetch('/api/ganado_reproduccion/dashboard', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/ganado_reproduccion/candidatas', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/ganado_reproduccion/toros', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      ]);
      
      if (resDash.ok) setData(await resDash.json());
      if (resCand.ok) setCandidatas(await resCand.json());
      if (resToros.ok) setToros(await resToros.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/ganado_reproduccion/evento', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        fetchData();
      } else {
        alert('Error al registrar evento');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getDaysDiff = (dateStr) => {
    const diff = new Date(dateStr) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Helper for Kanban Card
  const KanbanCard = ({ r }) => {
    let daysToCalving = null;
    let progress = 0;
    if (r.fecha_probable_parto) {
      daysToCalving = getDaysDiff(r.fecha_probable_parto);
      progress = Math.max(0, Math.min(100, 100 - (daysToCalving / 283) * 100));
    }

    return (
      <div style={{ background: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: '#1e293b' }}>{r.nombre || r.arete_crotal}</strong>
          <span style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#64748b' }}>{r.arete_crotal}</span>
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', margin: '8px 0' }}>
          <strong>Servicio:</strong> {r.metodo_servicio === 'Inseminación Artificial' ? `🧬 IA (${r.pajilla_ia})` : `Semental (Padre): 🐂 ${r.toro_nombre || r.toro_arete}`}
        </div>
        
        {r.estado_gestacion === 'Preñada' && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', color: daysToCalving <= 30 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
              <span>Faltan {daysToCalving} días</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: daysToCalving <= 30 ? '#ef4444' : '#10b981' }}></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Filtrado
  const filterList = (list) => {
    if (filter === 'IA') return list.filter(r => r.metodo_servicio === 'Inseminación Artificial');
    if (filter === 'Monta') return list.filter(r => r.metodo_servicio === 'Monta Natural');
    return list;
  };

  if (loading) return <div className="p-4">Cargando programador...</div>;

  const selectedCard = formData.id_animal ? candidatas.find(c => c.id_animal === parseInt(formData.id_animal)) || 
    data.kanban.enEspera.concat(data.kanban.vacias).concat(data.kanban.prenadas).find(c => c.id_animal === parseInt(formData.id_animal)) : null;

  return (
    <div className="p-4 dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>🧬 Programador de Preñez y Partos</h2>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)' }}>Control predictivo de gestación por Inseminación y Monta Natural.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: '#10b981', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          + Registrar Nuevo Servicio / Chequeo
        </button>
      </div>

      {/* METRICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
        <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tasa de Preñez Efectiva</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: data.metricas.tasaPrenez > 60 ? '#10b981' : '#f59e0b' }}>{data.metricas.tasaPrenez}%</div>
        </div>
        <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Vacas Gestantes</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>{data.metricas.prenadas}</div>
        </div>
        <div className="card" style={{ padding: '20px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
          <div style={{ fontSize: '13px', color: '#b91c1c' }}>Próximas a Parir (&lt; 30 días)</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef4444' }}>{data.metricas.proximas_a_parir}</div>
          <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '5px' }}>🚨 Requieren traslado a maternidad</div>
        </div>
        <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Filtro de Visualización</div>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
            <option value="Todas">Mostrar Todo (IA + Toro)</option>
            <option value="IA">Solo Inseminación Artificial</option>
            <option value="Monta">Solo Monta Natural (Toro)</option>
          </select>
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {/* COLUMNA 1 */}
        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '15px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: '10px', color: '#475569', margin: '0 0 15px 0' }}>
            🕒 En Espera de Chequeo ({filterList(data.kanban.enEspera).length})
          </h3>
          {filterList(data.kanban.enEspera).map(r => <KanbanCard key={r.id_reproduccion} r={r} />)}
        </div>
        
        {/* COLUMNA 2 */}
        <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '15px', border: '1px solid #bbf7d0' }}>
          <h3 style={{ borderBottom: '2px solid #86efac', paddingBottom: '10px', color: '#166534', margin: '0 0 15px 0' }}>
            🤰 Preñadas / Gestantes ({filterList(data.kanban.prenadas).length})
          </h3>
          {filterList(data.kanban.prenadas).map(r => <KanbanCard key={r.id_reproduccion} r={r} />)}
        </div>

        {/* COLUMNA 3 */}
        <div style={{ background: '#fef2f2', borderRadius: '8px', padding: '15px', border: '1px solid #fecaca' }}>
          <h3 style={{ borderBottom: '2px solid #fca5a5', paddingBottom: '10px', color: '#991b1b', margin: '0 0 15px 0' }}>
            ❌ Vacías (Fallo) ({filterList(data.kanban.vacias).length})
          </h3>
          {filterList(data.kanban.vacias).map(r => <KanbanCard key={r.id_reproduccion} r={r} />)}
        </div>
      </div>

      {/* MODAL EVENTO */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '500px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0, color: 'var(--primary)' }}>Registrar Evento Reproductivo</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tipo de Evento</label>
                <select value={formData.tipo_evento} onChange={e => setFormData({...formData, tipo_evento: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  <option value="Servicio">Nuevo Servicio (Preñar Vaca)</option>
                  <option value="Diagnostico_Gestacion">Diagnóstico de Gestación (Tacto/Ecografía)</option>
                  <option value="Parto">Parto Exitoso</option>
                  <option value="Aborto">Aborto</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Hembra (Vaca candidata) {formData.tipo_evento === 'Servicio' ? '- Filtro automático: Solo > 14 meses' : ''}</label>
                <select value={formData.id_animal} onChange={e => setFormData({...formData, id_animal: e.target.value})} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  <option value="">Seleccione una vaca...</option>
                  {formData.tipo_evento === 'Servicio' 
                    ? candidatas.map(c => <option key={c.id_animal} value={c.id_animal}>Hembra: {c.arete_crotal} - {c.nombre}</option>)
                    : data.kanban.enEspera.concat(data.kanban.prenadas).map(c => <option key={c.id_animal} value={c.id_animal}>Hembra: {c.arete_crotal} - {c.nombre}</option>)
                  }
                </select>
              </div>

              {/* RECORD DE PARTOS / DESCARTE ALERTA */}
              {selectedCard && formData.tipo_evento === 'Servicio' && (
                <div style={{ background: selectedCard.numero_partos >= 8 ? '#fef2f2' : '#f8fafc', padding: '10px', borderRadius: '4px', border: selectedCard.numero_partos >= 8 ? '1px solid #fca5a5' : '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}><strong>Edad:</strong> {selectedCard.edad_meses} meses</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}><strong>Historial:</strong> {selectedCard.numero_partos} partos previos.</div>
                  {selectedCard.numero_partos >= 8 && (
                    <div style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 'bold', marginTop: '5px' }}>
                      ⚠️ ALERTA: Esta vaca tiene un historial de partos muy alto. Sugerencia: Considerar para DESCARTE o VENTA en lugar de nuevo servicio.
                    </div>
                  )}
                </div>
              )}

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Fecha del Evento</label>
                <input type="date" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
              </div>

              {formData.tipo_evento === 'Servicio' && (
                <>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Método de Servicio</label>
                    <select value={formData.metodo_servicio} onChange={e => setFormData({...formData, metodo_servicio: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                      <option value="Monta Natural">Monta Natural (Toro de Finca)</option>
                      <option value="Inseminación Artificial">Inseminación Artificial (IA)</option>
                    </select>
                  </div>
                  
                  {formData.metodo_servicio === 'Monta Natural' && (
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Toro Seleccionado</label>
                      <select value={formData.id_toro} onChange={e => setFormData({...formData, id_toro: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                        <option value="">Seleccione un toro...</option>
                        {toros.map(t => <option key={t.id_animal} value={t.id_animal}>{t.arete_crotal} - {t.nombre}</option>)}
                      </select>
                    </div>
                  )}

                  {formData.metodo_servicio === 'Inseminación Artificial' && (
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Número de Pajilla / Lote</label>
                      <input type="text" value={formData.pajilla_ia} onChange={e => setFormData({...formData, pajilla_ia: e.target.value})} placeholder="Ej: PAJ-8822" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    </div>
                  )}
                </>
              )}

              {formData.tipo_evento === 'Diagnostico_Gestacion' && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Resultado del Diagnóstico (Tacto)</label>
                  <select value={formData.resultado_diagnostico} onChange={e => setFormData({...formData, resultado_diagnostico: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                    <option value="Positivo">✅ Positivo (Preñada)</option>
                    <option value="Negativo">❌ Negativo (Vacía)</option>
                  </select>
                </div>
              )}

              {formData.tipo_evento === 'Parto' && (
                <div style={{ background: '#dcfce7', padding: '10px', borderRadius: '4px', fontSize: '12px', color: '#166534' }}>
                  Al registrar este parto, se sumará +1 automáticamente al Record de Partos de la madre, y su estado reproductivo se reiniciará.
                </div>
              )}

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Observaciones</label>
                <textarea value={formData.observaciones} onChange={e => setFormData({...formData, observaciones: e.target.value})} rows="2" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}></textarea>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={{ flex: 1, background: 'var(--primary)', color: 'white', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Guardar Evento</button>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, background: '#e2e8f0', color: '#475569', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgramadorPrenez;
