import React, { useState, useEffect } from 'react';
import { updateRecord } from '../../utils/api';
import { authFetch } from '../../utils/api';

function ValidadorCompras({ tenantId }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/compras/solicitudes?tenantId=${tenantId || ''}`);
      const data = await res.json();
      setSolicitudes(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const handleApprove = async (id) => {
    try {
      await updateRecord('solicitudes_pedido', id, { estado: 'Aprobada' });
      loadData();
    } catch (e) {
      alert('Error aprobando: ' + e.message);
    }
  };

  const handleReject = async (id) => {
    try {
      await updateRecord('solicitudes_pedido', id, { estado: 'Rechazada' });
      loadData();
    } catch (e) {
      alert('Error rechazando: ' + e.message);
    }
  };

  const toggleRow = (id) => {
    if (expandedRow === id) setExpandedRow(null);
    else setExpandedRow(id);
  };

  if (loading) return <div className="p-4">Cargando solicitudes...</div>;

  return (
    <div className="p-4">
      <h2 style={{ marginBottom: '16px' }}>✅ Validador de Compras</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
        Revisa y aprueba las requisiciones solicitadas por las diferentes áreas. Haz clic en una solicitud para ver los artículos pedidos.
      </p>

      {solicitudes.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px', textAlign: 'center', background: 'var(--card-bg)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👍</div>
          <h3>Todo al día</h3>
          <p>No hay solicitudes registradas.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr style={{ background: 'var(--primary-dark)', color: 'white' }}>
                <th></th>
                <th>ID</th>
                <th>Fecha</th>
                <th>Solicitante</th>
                <th>Área</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map(s => (
                <React.Fragment key={s.id_solicitud}>
                  <tr 
                    style={{ cursor: 'pointer', background: expandedRow === s.id_solicitud ? 'var(--primary-light)' : 'transparent' }} 
                    onClick={() => toggleRow(s.id_solicitud)}
                  >
                    <td>{expandedRow === s.id_solicitud ? '▼' : '▶'}</td>
                    <td><b>#{s.id_solicitud}</b></td>
                    <td>{s.fecha_solicitud ? new Date(s.fecha_solicitud).toLocaleDateString() : '-'}</td>
                    <td>{s.empleado_nombre || `Empleado #${s.id_empleado_solicitante}`}</td>
                    <td>{s.area_solicitante}</td>
                    <td>
                      <span className={`badge ${s.prioridad === 'Urgente' || s.prioridad === 'Critica' ? 'badge-danger' : 'badge-primary'}`}>
                        {s.prioridad}
                      </span>
                    </td>
                    <td><b>{s.estado}</b></td>
                    <td>
                      {s.estado === 'Borrador' || s.estado === 'Enviada' ? (
                        <>
                          <button className="btn btn-sm btn-success" onClick={(e) => { e.stopPropagation(); handleApprove(s.id_solicitud); }} style={{ marginRight: '8px' }}>
                            Aprobar
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleReject(s.id_solicitud); }}>
                            Rechazar
                          </button>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                  </tr>
                  
                  {expandedRow === s.id_solicitud && (
                    <tr style={{ background: 'var(--bg)' }}>
                      <td colSpan="8" style={{ padding: '20px' }}>
                        <h4 style={{ marginBottom: '10px', color: 'var(--primary)' }}>📦 Detalle de Artículos Solicitados</h4>
                        {s.observaciones && <p style={{ marginBottom: '10px' }}><strong>Nota general:</strong> {s.observaciones}</p>}
                        
                        <table className="data-table" style={{ width: '100%', background: 'var(--card-bg)' }}>
                          <thead>
                            <tr style={{ background: 'var(--border)' }}>
                              <th style={{ padding: '6px' }}>Código</th>
                              <th style={{ padding: '6px' }}>Producto</th>
                              <th style={{ padding: '6px' }}>Cant. Pedida</th>
                              <th style={{ padding: '6px' }}>Costo Est. Total</th>
                              <th style={{ padding: '6px' }}>Notas del Ítem</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(s.detalles || []).map(d => (
                              <tr key={d.id_detalle}>
                                <td>{d.codigo}</td>
                                <td>{d.nombre} <span style={{ color: 'var(--text-muted)' }}>({d.unidad_medida})</span></td>
                                <td><b>{d.cantidad_solicitada}</b></td>
                                <td>${(parseFloat(d.costo_unitario_estimado) * parseFloat(d.cantidad_solicitada)).toLocaleString()}</td>
                                <td>{d.observaciones || '-'}</td>
                              </tr>
                            ))}
                            {!s.detalles || s.detalles.length === 0 ? (
                              <tr><td colSpan="5" style={{ textAlign: 'center' }}>No hay detalles registrados.</td></tr>
                            ) : null}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ValidadorCompras;
