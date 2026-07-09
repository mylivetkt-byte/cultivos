import React, { useState, useEffect } from 'react';
import { authFetch } from '../../../utils/api';

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
      const res = await authFetch(`/api/ganado_herramientas/inventario?${q.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
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
          placeholder="🔍 Buscar por código o nombre de insumo..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '300px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text)' }}
        />
        <button onClick={() => setShowModal(true)} style={{ padding: '8px 15px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          + Nuevo Insumo / Herramienta
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
        <div style={{ textAlign: 'center', padding: '20px' }}>Cargando inventario...</div>
      ) : (
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px' }}>CÓDIGO</th>
              <th style={{ padding: '10px' }}>Finca</th>
              <th style={{ padding: '10px' }}>Insumo / Herramienta</th>
              <th style={{ padding: '10px' }}>Categoría</th>
              <th style={{ padding: '10px' }}>Stock Actual</th>
              <th style={{ padding: '10px' }}>U.M</th>
              <th style={{ padding: '10px' }}>Costo Promedio</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No hay registros encontrados</td></tr>
            ) : (
              data.map(item => (
                <tr key={item.id_herr_inv} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px' }}>{item.codigo}</td>
                  <td style={{ padding: '10px' }}>{item.finca_nombre}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.nombre}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' }}>
                      {item.tipo}
                    </span>
                  </td>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: item.cantidad_actual <= 0 ? 'var(--danger)' : 'var(--text)' }}>
                    {item.cantidad_actual}
                  </td>
                  <td style={{ padding: '10px' }}>{item.unidad_medida}</td>
                  <td style={{ padding: '10px' }}>${Number(item.costo_unitario).toLocaleString('es-CO')}</td>
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
