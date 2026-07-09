import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../../utils/api';

import ModalNuevoInventario from './ModalNuevoInventario';

function TabInventario({ fincaId, fincas }) {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchInventario = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (fincaId) q.append('id_finca', fincaId);
      if (search) q.append('search', search);
      const res = await fetchApi(`/acuicola_herramientas/inventario?${q.toString()}`);
      setData(res.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInventario();
  }, [fincaId, search]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="🔍 Buscar por código o nombre de herramienta..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '300px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
        />
        <button onClick={() => setShowModal(true)} style={{ padding: '8px 15px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          + Nueva Herramienta / Insumo
        </button>
      </div>
      
      <ModalNuevoInventario 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onRefresh={fetchInventario} 
        fincaId={fincaId} 
        fincas={fincas} 
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Cargando inventario de herramientas...</div>
      ) : (
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#64748b' }}>
              <th style={{ padding: '10px' }}>CÓDIGO</th>
              <th style={{ padding: '10px' }}>Finca</th>
              <th style={{ padding: '10px' }}>Herramienta / Insumo</th>
              <th style={{ padding: '10px' }}>Categoría</th>
              <th style={{ padding: '10px' }}>Stock Base</th>
              <th style={{ padding: '10px' }}>U.M</th>
              <th style={{ padding: '10px' }}>Costo Promedio</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No hay registros encontrados</td></tr>
            ) : (
              data.map(item => (
                <tr key={item.id_herr_inv} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px', color: '#64748b' }}>{item.codigo}</td>
                  <td style={{ padding: '10px' }}>{item.finca_nombre}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#1e293b' }}>{item.nombre}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: '#e0f2fe', color: '#0284c7' }}>
                      {item.tipo}
                    </span>
                  </td>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: item.cantidad_actual <= 0 ? '#e11d48' : '#1e293b' }}>
                    {item.cantidad_actual}
                  </td>
                  <td style={{ padding: '10px', color: '#64748b' }}>{item.unidad_medida}</td>
                  <td style={{ padding: '10px', color: '#64748b' }}>${Number(item.costo_unitario).toLocaleString('es-CO')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default TabInventario;
