import React from 'react';
import { Pill, Search, PlusCircle, MessageCircle } from 'lucide-react';

const VetFarmacia = ({ onBack }) => {
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '15px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Search size={20} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Buscar medicamento..." 
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '16px' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Botiquín de la Finca</h3>
        <button style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <PlusCircle size={14} /> Nueva Receta
        </button>
      </div>

      <div style={{ background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: '#1e293b' }}>Oxitetraciclina L.A.</strong>
          <span style={{ fontSize: '12px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>Stock: 24 Frascos</span>
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>Categoría: Antibiótico | Dosis: 1ml/10kg</div>
      </div>

      <div style={{ background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: '#1e293b' }}>Bálsamo Blanco (Ubre)</strong>
          <span style={{ fontSize: '12px', background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>Stock: 0 Potes</span>
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px', marginBottom: '10px' }}>Categoría: Tópico | Agotado en bodega local</div>
        <button style={{ width: '100%', padding: '10px', background: '#25D366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
          <MessageCircle size={16} /> Pedir a Bodega Central (WhatsApp)
        </button>
      </div>
    </div>
  );
};

export default VetFarmacia;
