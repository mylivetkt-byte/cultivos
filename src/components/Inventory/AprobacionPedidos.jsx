import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

export default function AprobacionPedidos({ tenantId }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tenantId) fetchPedidos();
  }, [tenantId]);

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/inventario/pedidos?tenantId=${tenantId}`);
      setPedidos(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (pedido) => {
    if (!window.confirm(`¿Aprobar el pedido #${pedido.id_pedido}?`)) return;

    // By default, approve the requested amount
    const detalles = pedido.detalles.map(d => ({
      id_detalle: d.id_detalle,
      cantidad_aprobada: d.cantidad_solicitada
    }));

    try {
      const res = await authFetch(`/api/inventario/pedidos/${pedido.id_pedido}/aprobar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detalles, id_usuario_aprueba: 1 })
      });
      if (res.ok) {
        alert('Pedido aprobado.');
        fetchPedidos();
      }
    } catch (err) {
      alert('Error aprobando pedido.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Pedidos Automáticos (Desabastecimiento)</h3>
        <button className="btn btn-outline" onClick={fetchPedidos} disabled={loading}>
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      <div className="table-wrapper table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID Pedido</th>
              <th>Fecha</th>
              <th>Bodega Solicitante</th>
              <th>Bodega Provee (Principal)</th>
              <th>Insumos Solicitados</th>
              <th>Estado</th>
              <th>Aprobación</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center' }}>No hay pedidos ni alertas registradas.</td></tr>
            ) : pedidos.map(p => (
              <tr key={p.id_pedido}>
                <td style={{ fontWeight: 600 }}>
                  #{p.id_pedido}
                  {p.es_alerta_automatica ? <span title="Alerta Automática de Desabastecimiento" style={{marginLeft: '4px'}}>🚨</span> : ''}
                </td>
                <td>{new Date(p.fecha_solicitud).toLocaleString()}</td>
                <td>{p.solicita_nombre}</td>
                <td>{p.provee_nombre || '-'}</td>
                <td>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px' }}>
                    {p.detalles?.map(d => (
                      <li key={d.id_detalle}>
                        {d.cantidad_solicitada} {d.unidad_medida} de {d.insumo_nombre}
                      </li>
                    ))}
                  </ul>
                </td>
                <td>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                    background: p.estado === 'Aprobado' ? 'var(--success)' : 'var(--warning)', 
                    color: p.estado === 'Aprobado' ? 'white' : 'black'
                  }}>
                    {p.estado.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  {p.estado === 'Pendiente_Aprobacion' && (
                    <button className="btn btn-sm btn-success" onClick={() => handleAprobar(p)}>
                      Aprobar (Gerencia)
                    </button>
                  )}
                  {p.estado === 'Aprobado' && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      <div>Aprobado el {new Date(p.fecha_aprobacion).toLocaleDateString()}</div>
                      <div style={{ marginTop: '4px' }}>
                        <button className="btn btn-sm btn-primary" onClick={() => alert('Funcionalidad de Despacho en construcción: registrará usuario entrega y recibe')}>
                          Marcar Despachado / Entregado
                        </button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
