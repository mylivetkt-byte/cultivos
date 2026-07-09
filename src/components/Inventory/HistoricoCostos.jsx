import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/format';
import { authFetch } from '../../utils/api';

export default function HistoricoCostos({ tenantId }) {
  const [stats, setStats] = useState({ totalCost: 0, byBodega: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tenantId) fetchStats();
  }, [tenantId]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Re-use existencias endpoint and aggregate data on client for simplicity
      const res = await authFetch(`/api/inventario/existencias?tenantId=${tenantId}`);
      const data = await res.json();
      
      let total = 0;
      const bodegaMap = {};

      data.forEach(e => {
        const cost = parseFloat(e.cantidad) * parseFloat(e.costo_promedio);
        total += cost;
        
        if (!bodegaMap[e.id_bodega]) {
          bodegaMap[e.id_bodega] = {
            id_bodega: e.id_bodega,
            nombre: e.bodega_nombre,
            es_principal: e.es_principal,
            costo_total: 0,
            items: 0
          };
        }
        bodegaMap[e.id_bodega].costo_total += cost;
        bodegaMap[e.id_bodega].items += 1;
      });

      setStats({
        totalCost: total,
        byBodega: Object.values(bodegaMap).sort((a, b) => b.costo_total - a.costo_total)
      });

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0 }}>Resumen Contable (Valorizado)</h3>
        <button className="btn btn-outline" onClick={fetchStats} disabled={loading}>
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        <div className="stat-card blue">
          <div className="stat-card-label">Total Valorizado en Inventario</div>
          <div className="stat-card-value">{formatCurrency(stats.totalCost)}</div>
          <div className="stat-card-sub">Costo Promedio Total</div>
        </div>
        <div className="stat-card green">
          <div className="stat-card-label">Bodegas con Stock</div>
          <div className="stat-card-value">{stats.byBodega.length}</div>
          <div className="stat-card-sub">Activas</div>
        </div>
      </div>

      <h4 style={{ marginBottom: '16px' }}>Costo Histórico por Bodega (Finca)</h4>
      <div className="table-wrapper table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Bodega</th>
              <th>Tipo</th>
              <th>Items Diferentes</th>
              <th>Valor Total Estimado</th>
            </tr>
          </thead>
          <tbody>
            {stats.byBodega.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center' }}>No hay datos contables.</td></tr>
            ) : stats.byBodega.map(b => (
              <tr key={b.id_bodega}>
                <td style={{ fontWeight: 600 }}>{b.nombre}</td>
                <td>{b.es_principal ? 'Principal' : 'Subbodega (Finca)'}</td>
                <td>{b.items} tipos de insumos</td>
                <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                  {formatCurrency(b.costo_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
