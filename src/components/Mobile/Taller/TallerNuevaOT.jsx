import React, { useState, useEffect } from 'react';
import { authFetch } from '../../../utils/api';

const TallerNuevaOT = ({ onBack, tenantId }) => {
  const [maquinas, setMaquinas] = useState([]);
  const [contactos, setContactos] = useState([]); // para mecánicos
  const [form, setForm] = useState({
    id_activo: '',
    descripcion_problema: '',
    prioridad: 'Alta',
    id_tecnico: '',
    enviar_wsp: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMaquinas();
    loadContactos();
  }, []);

  const loadMaquinas = async () => {
    try {
      const res = await authFetch(`/api/taller/maquinas?tenantId=${tenantId}`);
      const data = await res.json();
      if(data.success) setMaquinas(data.data);
    } catch(e) {}
  };

  const loadContactos = async () => {
    try {
      const res = await authFetch(`/api/taller/contactos?tenantId=${tenantId}`);
      const data = await res.json();
      if(data.success) {
        // Filtrar solo mecánicos internos para simplificar
        setContactos(data.data.filter(c => c.tipo === 'Mecánico Interno'));
      }
    } catch(e) {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!form.id_activo || !form.id_tecnico || !form.descripcion_problema) {
      alert("Por favor completa los campos obligatorios.");
      return;
    }
    
    setSaving(true);
    try {
      const mecanico = contactos.find(c => String(c.id) === String(form.id_tecnico) || c.nombre === form.id_tecnico);
      const res = await authFetch(`/api/taller/ordenes-trabajo?tenantId=${tenantId || 1}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_maquina: form.id_activo,
          tipo_orden: 'Correctivo Emergencia',
          id_mecanico_asignado: mecanico ? mecanico.id : null,
          descripcion_problema: form.descripcion_problema
        })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Error al registrar la orden en la base de datos');
      }

      alert("✅ Orden de Trabajo generada y guardada en la base de datos con éxito.");
      
      if(form.enviar_wsp && mecanico && mecanico.telefono) {
        const mensaje = encodeURIComponent(`🚨 *EMERGENCIA TALLER* 🚨\n\nSe te ha asignado una nueva OT de emergencia.\n\n*Problema:* ${form.descripcion_problema}`);
        window.open(`https://wa.me/${mecanico.telefono.replace(/\D/g, '')}?text=${mensaje}`, '_blank');
      }
      
      onBack();
    } catch(err) {
      console.error(err);
      alert("Error al guardar la OT: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>Crea una OT de emergencia y notifica al mecánico inmediatamente.</p>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Máquina Varada *</label>
          <select 
            value={form.id_activo} 
            onChange={e => setForm({...form, id_activo: e.target.value})}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          >
            <option value="">Selecciona una máquina...</option>
            {maquinas.map(m => (
              <option key={m.id_maq_agro} value={m.id_maq_agro}>[{m.placa}] {m.marca_modelo}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Problema Reportado *</label>
          <textarea 
            rows={4}
            value={form.descripcion_problema}
            onChange={e => setForm({...form, descripcion_problema: e.target.value})}
            placeholder="Ej: Fuga de aceite hidráulico masiva..."
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Asignar a Mecánico *</label>
          <select 
            value={form.id_tecnico} 
            onChange={e => setForm({...form, id_tecnico: e.target.value})}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
          >
            <option value="">Selecciona mecánico...</option>
            {contactos.map((c, i) => (
              <option key={c.id || i} value={c.id}>{c.nombre} ({c.telefono})</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
          <input 
            type="checkbox" 
            id="sendwsp"
            checked={form.enviar_wsp}
            onChange={e => setForm({...form, enviar_wsp: e.target.checked})}
            style={{ width: '20px', height: '20px' }}
          />
          <label htmlFor="sendwsp">Enviar alerta por WhatsApp al mecánico</label>
        </div>

        <button 
          type="submit" 
          disabled={saving}
          style={{ width: '100%', padding: '15px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', marginTop: '15px' }}
        >
          {saving ? 'Guardando...' : 'Generar Orden de Emergencia'}
        </button>
      </form>
    </div>
  );
};

export default TallerNuevaOT;
