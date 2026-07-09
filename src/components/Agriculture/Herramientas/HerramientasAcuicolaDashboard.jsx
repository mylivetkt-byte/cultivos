import React, { useState, useEffect } from 'react';
import TabInventario from './TabInventario';
import TabMovimientos from './TabMovimientos';
import TabPedidos from './TabPedidos';
import { fetchApi } from '../../../utils/api';

function HerramientasAcuicolaDashboard({ fincaId: globalFincaId }) {
  const [activeTab, setActiveTab] = useState('inventario');
  const [fincaId, setFincaId] = useState(globalFincaId || '');
  const [fincas, setFincas] = useState([]);

  useEffect(() => {
    fetchApi('/table/fincas/data?pageSize=100')
      .then(d => setFincas(d.data || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setFincaId(globalFincaId || '');
  }, [globalFincaId]);

  return (
    <div className="p-4" style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b' }}>
      {/* Header & Global Filters */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
        <h2 style={{ color: '#0ea5e9', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🛠️ Inventario de Herramientas Acuícolas
        </h2>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ flex: '1', maxWidth: '300px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Finca Operativa</label>
            <select value={fincaId} onChange={e => setFincaId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#1e293b' }}>
              <option value="">-- Todas las Fincas --</option>
              {fincas.map(f => <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
        <button 
          onClick={() => setActiveTab('inventario')}
          style={{ padding: '10px 20px', background: 'transparent', border: 'none', borderBottom: activeTab === 'inventario' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'inventario' ? '#0ea5e9' : '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>
          📦 Catálogo y Existencias
        </button>
        <button 
          onClick={() => setActiveTab('movimientos')}
          style={{ padding: '10px 20px', background: 'transparent', border: 'none', borderBottom: activeTab === 'movimientos' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'movimientos' ? '#0ea5e9' : '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>
          🔄 Entradas, Salidas y Asignaciones
        </button>
        <button 
          onClick={() => setActiveTab('pedidos')}
          style={{ padding: '10px 20px', background: 'transparent', border: 'none', borderBottom: activeTab === 'pedidos' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'pedidos' ? '#0ea5e9' : '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>
          🚚 Pedidos a Bodega Principal
        </button>
      </div>

      {/* Active Tab Content */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', minHeight: '500px' }}>
        {activeTab === 'inventario' && <TabInventario fincaId={fincaId} fincas={fincas} />}
        {activeTab === 'movimientos' && <TabMovimientos fincaId={fincaId} fincas={fincas} />}
        {activeTab === 'pedidos' && <TabPedidos fincaId={fincaId} fincas={fincas} />}
      </div>
    </div>
  );
}

export default HerramientasAcuicolaDashboard;
