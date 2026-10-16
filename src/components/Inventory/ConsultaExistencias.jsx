import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/format';
import { authFetch } from '../../utils/api';
import Pagination from '../Pagination';

export default function ConsultaExistencias({ tenantId, fincaId }) {
  const [existencias, setExistencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bodegas, setBodegas] = useState([]);
  const [filterBodega, setFilterBodega] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!tenantId) return;
    fetchBodegas();
    fetchExistencias();
  }, [tenantId, filterBodega]);

  const fetchBodegas = async () => {
    try {
      const res = await authFetch(`/api/table/bod_bodegas?tenantId=${tenantId}`);
      const data = await res.json();
      setBodegas(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExistencias = async () => {
    setLoading(true);
    try {
      let url = `/api/inventario/existencias?tenantId=${tenantId}`;
      if (filterBodega) url += `&bodegaId=${filterBodega}`;
      
      const res = await authFetch(url);
      const data = await res.json();
      setExistencias(data);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePedir = async (insumo) => {
    const qty = prompt(`Cantidad a pedir de ${insumo.insumo_nombre}:`);
    if (!qty || isNaN(qty)) return;

    try {
      const res = await authFetch(`/api/inventario/pedidos/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_tenant: tenantId,
          id_bodega_solicita: insumo.id_bodega,
          id_insumo: insumo.id_insumo,
          cantidad_solicitada: parseFloat(qty)
        })
      });
      if (res.ok) {
        alert('Pedido automático generado y enviado a aprobación.');
      } else {
        alert('Error al generar pedido.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Stock Actual</h3>
        <select 
          value={filterBodega} 
          onChange={(e) => setFilterBodega(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}
        >
          <option value="">-- Todas las Bodegas --</option>
          {bodegas.map(b => (
            <option key={b.id_bodega} value={b.id_bodega}>{b.nombre} {b.es_principal ? '(Principal)' : ''}</option>
          ))}
        </select>
        <button className="btn btn-outline" onClick={fetchExistencias} disabled={loading}>
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      <div className="table-wrapper table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Bodega</th>
              <th>Código</th>
              <th>Insumo/Producto</th>
              <th>Cantidad</th>
              <th>Costo Prom.</th>
              <th>Última Actualización</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {existencias.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center' }}>No hay existencias registradas.</td></tr>
            ) : existencias.slice((currentPage - 1) * 20, currentPage * 20).map(e => (
              <tr key={e.id_existencia}>
                <td>{e.bodega_nombre} {e.es_principal ? '⭐' : ''}</td>
                <td>{e.codigo}</td>
                <td style={{ fontWeight: 600 }}>{e.insumo_nombre}</td>
                <td>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '12px', 
                    background: e.cantidad <= 0 ? 'var(--danger)' : 'var(--success)', 
                    color: 'white',
                    fontWeight: 'bold'
                  }}>
                    {e.cantidad} {e.unidad_medida}
                  </span>
                </td>
                <td>{formatCurrency(parseFloat(e.costo_promedio))}</td>
                <td>{new Date(e.fecha_ultima_actualizacion).toLocaleString()}</td>
                <td>
                  <button className="btn btn-sm btn-outline" onClick={() => handlePedir(e)}>
                    Pedir Reabastecimiento
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {existencias.length > 0 && (
          <Pagination 
            currentPage={currentPage}
            totalItems={existencias.length}
            pageSize={20}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}
