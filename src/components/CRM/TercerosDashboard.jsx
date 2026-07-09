import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

function TercerosDashboard({ tenantId, onSelectTercero }) {
  const [terceros, setTerceros] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch(`/api/terceros-stats/all?id_tenant=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTerceros(data.data);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [tenantId]);

  if (loading) return <div className="module-container"><p>Cargando datos CRM...</p></div>;

  return (
    <div className="module-container">
      <div className="module-header">
        <h1>👥 Dashboard CRM & Terceros</h1>
        <p>Estadísticas y perfil comercial de Clientes, Proveedores y Empleados.</p>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Tercero</th>
              <th>Tipo</th>
              <th>Cupo de Crédito</th>
              <th>Saldo Actual</th>
              <th>Última Operación</th>
              <th>Último Pago</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {terceros.map(t => (
              <tr key={t.id_tercero}>
                <td>{t.documento}</td>
                <td>
                  <strong>{t.nombre_completo}</strong><br/>
                  <small style={{ color: '#888' }}>{t.contacto ? `📞 ${t.contacto} (${t.telefono_contacto})` : 'Sin contacto'}</small>
                </td>
                <td><span className={`status-badge ${t.tipo_tercero === 'Cliente' ? 'primary' : t.tipo_tercero === 'Proveedor' ? 'warning' : 'secondary'}`}>{t.tipo_tercero}</span></td>
                <td>${Number(t.cupo_credito).toLocaleString('es-CO')}</td>
                <td style={{ color: t.saldo_actual > 0 ? '#ff4d4f' : t.saldo_actual < 0 ? '#00c49f' : 'inherit' }}>
                  <strong>${Number(t.saldo_actual).toLocaleString('es-CO')}</strong>
                </td>
                <td>
                  {t.ultima_operacion ? (
                    <>
                      <div style={{ fontSize: '0.9em' }}>{t.ultima_operacion.tipo_operacion}</div>
                      <div style={{ color: '#888', fontSize: '0.8em' }}>{new Date(t.ultima_operacion.fecha).toLocaleDateString()}</div>
                      <strong>${Number(t.ultima_operacion.cargo).toLocaleString('es-CO')}</strong>
                    </>
                  ) : <span style={{ color: '#aaa' }}>-</span>}
                </td>
                <td>
                  {t.ultimo_pago ? (
                    <>
                      <div style={{ color: '#888', fontSize: '0.8em' }}>{new Date(t.ultimo_pago.fecha).toLocaleDateString()}</div>
                      <strong style={{ color: '#00c49f' }}>${Number(t.ultimo_pago.abono).toLocaleString('es-CO')}</strong>
                    </>
                  ) : <span style={{ color: '#aaa' }}>-</span>}
                </td>
                <td>
                  <button className="btn btn-sm btn-secondary" onClick={() => onSelectTercero(t.id_tercero)}>
                    Ver Perfil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TercerosDashboard;
