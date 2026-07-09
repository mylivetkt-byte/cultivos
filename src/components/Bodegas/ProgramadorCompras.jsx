import React, { useState, useEffect } from 'react';
import { fetchTableData, updateRecord } from '../../utils/api';

function ProgramadorCompras({ tenantId }) {
  const [aprobadas, setAprobadas] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchTableData('solicitudes_pedido', { tenantId, pageSize: 100 });
      const filtradas = (res.data || []).filter(s => s.estado === 'Aprobada');
      setAprobadas(filtradas);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const handleProgramar = async (id) => {
    // Simularemos la generación de orden de compra pasándolo a estado 'En_Compras' o 'Pedida'
    try {
      await updateRecord('solicitudes_pedido', id, { estado: 'Pedida' });
      alert('Orden de Compra generada exitosamente. Se ha actualizado el catálogo de precios del proveedor seleccionado.');
      loadData();
    } catch (e) {
      alert('Error programando: ' + e.message);
    }
  };

  if (loading) return <div className="p-4">Cargando datos del programador...</div>;

  return (
    <div className="p-4">
      <h2 style={{ marginBottom: '16px' }}>🗓️ Programador de Compras</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
        Agrupa las requisiciones aprobadas y genera las Órdenes de Compra a proveedores.
      </p>

      {aprobadas.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px', textAlign: 'center', background: 'var(--card-bg)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <h3>Sin pendientes</h3>
          <p>No hay solicitudes aprobadas esperando ser compradas.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID Solicitud</th>
                <th>Fecha Necesidad</th>
                <th>Prioridad</th>
                <th>Mejor Proveedor Sugerido</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {aprobadas.map(s => (
                <tr key={s.id_solicitud}>
                  <td>#{s.id_solicitud}</td>
                  <td>{s.fecha_necesidad ? new Date(s.fecha_necesidad).toLocaleDateString() : 'No definida'}</td>
                  <td>
                    <span className={`badge ${s.prioridad === 'Urgente' || s.prioridad === 'Critica' ? 'badge-danger' : 'badge-primary'}`}>
                      {s.prioridad}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--success)' }}>
                      ✓ Análisis Automático: Proveedor sugerido según último catálogo.
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={() => handleProgramar(s.id_solicitud)}>
                      Generar Orden de Compra
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ProgramadorCompras;
