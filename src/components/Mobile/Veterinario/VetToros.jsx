import React from 'react';
import { Dna, Activity } from 'lucide-react';

const VetToros = ({ onBack }) => {
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ background: '#fef3c7', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #f59e0b', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 5px', color: '#b45309' }}>Control de Sementales</h4>
        <p style={{ margin: 0, fontSize: '12px', color: '#92400e' }}>Monitoreo de efectividad y desgaste reproductivo de toros.</p>
      </div>

      <div style={{ background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px' }}><Dna size={16} color="#f59e0b"/> Toro Sultán</strong>
          <span style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>Raza: Brahman</span>
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div><strong>Edad:</strong> 4 años</div>
          <div><strong>Total Montas:</strong> 124</div>
          <div><strong>Efectividad:</strong> 88%</div>
          <div><strong>Estado:</strong> <span style={{color: '#166534', fontWeight:'bold'}}>Activo</span></div>
        </div>
      </div>

      <div style={{ background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px' }}><Dna size={16} color="#f59e0b"/> Toro Relámpago</strong>
          <span style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>Raza: Angus</span>
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div><strong>Edad:</strong> 7 años</div>
          <div><strong>Total Montas:</strong> 412</div>
          <div><strong>Efectividad:</strong> 62%</div>
          <div><strong>Estado:</strong> <span style={{color: '#991b1b', fontWeight:'bold'}}>Descanso Sugerido</span></div>
        </div>
      </div>
    </div>
  );
};

export default VetToros;
