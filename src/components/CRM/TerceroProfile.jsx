import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

function TerceroProfile({ tenantId, terceroId, onBack }) {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch(`/api/terceros-stats/${terceroId}?id_tenant=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPerfil(data.data);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [terceroId, tenantId]);

  if (loading) return <div className="module-container"><p>Cargando Perfil...</p></div>;
  if (!perfil) return <div className="module-container"><p>Tercero no encontrado.</p></div>;

  const cupoUtilizado = (perfil.saldo_actual / perfil.cupo_credito) * 100;
  
  return (
    <div className="module-container">
      <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>👤 Perfil Comercial: {perfil.nombre_completo}</h1>
          <p>{perfil.tipo_documento} {perfil.documento} - {perfil.tipo_tercero}</p>
        </div>
        <button className="btn btn-secondary" onClick={onBack}>⬅ Volver al Dashboard</button>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Información de Contacto</h3>
          <p><strong>Dirección:</strong> {perfil.direccion || 'N/A'}</p>
          <p><strong>Teléfono:</strong> {perfil.telefono || 'N/A'}</p>
          <p><strong>Email:</strong> {perfil.email || 'N/A'}</p>
          <hr />
          <p><strong>Contacto Principal:</strong> {perfil.contacto || 'N/A'}</p>
          <p><strong>Tel. Contacto:</strong> {perfil.telefono_contacto || 'N/A'}</p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <h3>Estado de Crédito</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span>Cupo Aprobado:</span>
            <strong>${Number(perfil.cupo_credito).toLocaleString('es-CO')}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span>Días de Plazo:</span>
            <strong>{perfil.dias_plazo} días</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', color: perfil.saldo_actual > 0 ? '#ff4d4f' : '#00c49f' }}>
            <span>Saldo Actual:</span>
            <strong style={{ fontSize: '1.2em' }}>${Number(perfil.saldo_actual).toLocaleString('es-CO')}</strong>
          </div>
          
          {perfil.cupo_credito > 0 && (
            <div>
              <div style={{ fontSize: '12px', marginBottom: '5px' }}>Uso de Cupo: {cupoUtilizado.toFixed(1)}%</div>
              <div style={{ width: '100%', height: '10px', background: '#e0e0e0', borderRadius: '5px' }}>
                <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, cupoUtilizado))}%`, background: cupoUtilizado > 90 ? '#ff4d4f' : cupoUtilizado > 70 ? '#faad14' : '#00c49f', borderRadius: '5px' }}></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Historial de Transacciones (Compras, Ventas y Pagos)</h3>
        {perfil.historial && perfil.historial.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Operación</th>
                <th>Referencia</th>
                <th>Cargo (Deuda)</th>
                <th>Abono (Pago)</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {perfil.historial.map((h, i) => (
                <tr key={i}>
                  <td>{new Date(h.fecha).toLocaleDateString()}</td>
                  <td><strong>{h.tipo_operacion}</strong></td>
                  <td>{h.referencia}</td>
                  <td style={{ color: '#ff4d4f' }}>{h.cargo > 0 ? `$${Number(h.cargo).toLocaleString('es-CO')}` : '-'}</td>
                  <td style={{ color: '#00c49f' }}>{h.abono > 0 ? `$${Number(h.abono).toLocaleString('es-CO')}` : '-'}</td>
                  <td><span className={`status-badge ${h.estado === 'Borrador' ? 'secondary' : h.estado === 'Pagado' ? 'primary' : 'warning'}`}>{h.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No hay transacciones registradas para este tercero.</p>
        )}
      </div>
    </div>
  );
}

export default TerceroProfile;
