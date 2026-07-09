import React, { useState, useEffect } from 'react';
import { Filter, Search } from 'lucide-react';

const VetConsulta = ({ onBack }) => {
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '15px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
          <Search size={20} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Buscar por arete o nombre..." 
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '16px' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
          <button style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #3b82f6', background: '#eff6ff', color: '#1d4ed8', fontSize: '12px', whiteSpace: 'nowrap' }}>Preñadas</button>
          <button style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>Para Venta</button>
          <button style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>Enfermas</button>
          <button style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>Todas</button>
        </div>
      </div>

      <div style={{ background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Vaca Rosita</strong>
          <span style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>001-A</span>
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>Gestación: 6 meses | Última vacuna: Hace 2 meses</div>
      </div>
      <div style={{ background: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Vaca Lola</strong>
          <span style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>002-B</span>
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>Gestación: 1 mes | Tratamiento activo: Mastitis</div>
      </div>
    </div>
  );
};

export default VetConsulta;
