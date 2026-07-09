import React from 'react';
import { FileWarning, AlertTriangle } from 'lucide-react';

const VetDescartes = ({ onBack }) => {
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #ef4444', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 5px', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '5px' }}><AlertTriangle size={16} /> Descartes Clínicos</h4>
        <p style={{ margin: 0, fontSize: '12px', color: '#7f1d1d' }}>Animales sugeridos para salida por edad o problemas de salud crónicos.</p>
      </div>

      <div style={{ background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: '#1e293b' }}>Vaca Manchada</strong>
          <span style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>ARETE: 033</span>
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
          <div><strong>Motivo:</strong> Mastitis crónica (Incurable)</div>
          <div style={{ marginTop: '5px' }}><strong>Sugerencia:</strong> Venta para beneficio inmediato.</div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button style={{ flex: 1, padding: '8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>Aprobar Descarte</button>
          <button style={{ flex: 1, padding: '8px', background: 'white', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>Revisar Historia</button>
        </div>
      </div>
    </div>
  );
};

export default VetDescartes;
