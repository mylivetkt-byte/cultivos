import React from 'react';
import { Baby, Filter } from 'lucide-react';

const VetReproduccion = ({ onBack }) => {
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '15px' }}>
        <button style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: '#8b5cf6', color: 'white', fontSize: '13px', whiteSpace: 'nowrap', fontWeight: 'bold' }}>Próximas a Parir</button>
        <button style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '13px', whiteSpace: 'nowrap' }}>Candidatas a Preñar</button>
        <button style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '13px', whiteSpace: 'nowrap' }}>En Celo</button>
      </div>

      <div style={{ background: 'white', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #8b5cf6', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: '#1e293b' }}>Vaca Margarita</strong>
          <span style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>ARETE: 092</span>
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>Días de Gestación: 275 días</div>
        <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '2px', fontWeight: 'bold' }}>Alerta: Parto inminente (Próximos 5 días)</div>
      </div>

      <div style={{ background: 'white', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #8b5cf6', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: '#1e293b' }}>Vaca Lucero</strong>
          <span style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>ARETE: 104</span>
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>Días de Gestación: 260 días</div>
        <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '2px', fontWeight: 'bold' }}>Preparar para secado</div>
      </div>
    </div>
  );
};

export default VetReproduccion;
