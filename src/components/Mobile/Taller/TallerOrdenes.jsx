import React, { useState, useEffect } from 'react';
import { authFetch } from '../../../utils/api';
import { Play, Check, Trash2 } from 'lucide-react';

const TallerOrdenes = ({ onBack, tenantId }) => {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrdenes();
  }, []);

  const loadOrdenes = async () => {
    try {
      const res = await authFetch(`/api/taller/ordenes-trabajo?tenantId=${tenantId}`);
      const data = await res.json();
      if(data.success) {
        setOrdenes(data.data.filter(o => o.estado !== 'Completada' && o.estado !== 'Cancelada'));
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateEstado = async (id_ot, nuevoEstado) => {
    try {
      await authFetch(`/api/taller/ordenes-trabajo/${id_ot}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      loadOrdenes();
    } catch (e) {
      console.error(e);
      alert('Error al actualizar estado');
    }
  };

  const deleteOT = async (id_ot) => {
    if(!window.confirm('¿Estás seguro de eliminar esta orden de trabajo?')) return;
    try {
      await authFetch(`/api/taller/ordenes-trabajo/${id_ot}`, { method: 'DELETE' });
      loadOrdenes();
    } catch(e) {
      console.error(e);
      alert('Error al eliminar');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>Selecciona una orden para iniciarla, completarla o eliminarla.</p>
      
      {loading ? <p>Cargando órdenes...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {ordenes.length === 0 && <p>No tienes órdenes asignadas.</p>}
          {ordenes.map(ot => (
            <div key={ot.id_orden_trabajo} style={{ background: 'white', padding: '15px', borderRadius: '12px', borderLeft: `4px solid ${ot.prioridad === 'Alta' ? '#ef4444' : '#3b82f6'}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>{ot.numero_orden || `OT-#${ot.id_orden_trabajo}`}</span>
                <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '3px 8px', borderRadius: '12px' }}>{ot.estado}</span>
              </div>
              <button onClick={() => deleteOT(ot.id_orden_trabajo)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                <Trash2 size={18} />
              </button>
              
              <h4 style={{ margin: '0 0 5px 0', paddingRight: '20px' }}>{ot.maquina_nombre || 'Máquina No Especificada'}</h4>
              <p style={{ margin: '0 0 15px 0', fontSize: '0.85rem', color: '#64748b' }}>{ot.descripcion_problema}</p>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => updateEstado(ot.id_orden_trabajo, 'En_Ejecucion')}
                  style={{ flex: 1, padding: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', cursor: 'pointer' }}
                >
                  <Play size={16} /> Iniciar
                </button>
                <button 
                  onClick={() => updateEstado(ot.id_orden_trabajo, 'Completada')}
                  style={{ flex: 1, padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', cursor: 'pointer' }}
                >
                  <Check size={16} /> Terminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TallerOrdenes;
