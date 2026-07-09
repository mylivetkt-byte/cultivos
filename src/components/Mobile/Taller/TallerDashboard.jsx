import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle } from 'lucide-react';
import { authFetch } from '../../../utils/api';

const TallerDashboard = ({ onBack, tenantId }) => {
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
        setOrdenes(data.data.filter(o => o.estado !== 'Completada'));
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginTop: 0, color: '#1e293b' }}>Próximos Mantenimientos</h3>
      {loading ? <p>Cargando plan...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {ordenes.length === 0 ? <p style={{ color: '#64748b' }}>No hay tareas pendientes.</p> : null}
          {ordenes.map(ot => (
            <div key={ot.id_orden_trabajo} style={{ background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{ot.numero_orden}</span>
                <span style={{ fontSize: '0.8rem', padding: '3px 8px', background: ot.tipo_orden==='Preventivo'?'#dbeafe':'#fee2e2', color: ot.tipo_orden==='Preventivo'?'#1d4ed8':'#b91c1c', borderRadius: '12px' }}>{ot.tipo_orden}</span>
              </div>
              <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#475569' }}><strong>Máquina:</strong> {ot.maquina_nombre}</p>
              <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#475569' }}><strong>Técnico:</strong> {ot.mecanico_nombre} {ot.mecanico_apellido}</p>
              <p style={{ margin: '0', fontSize: '0.85rem', color: '#64748b' }}>{ot.descripcion_problema}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TallerDashboard;
