import React, { useState } from 'react';
import { fetchApi } from '../../utils/api';
import TenantForm from './TenantForm';

export default function TenantDetail({ tenant, onBack, onRefresh }) {
  const [view, setView] = useState('detail');
  const [resetPass, setResetPass] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  const handleResetPassword = async () => {
    if (!resetPass || resetPass.length < 6) {
      setResetMsg('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      await fetchApi(`/sistemas/tenant/${tenant.id_tenant}/reset-admin`, {
        method: 'POST',
        body: JSON.stringify({ admin_password: resetPass }),
      });
      setResetMsg('Contraseña actualizada exitosamente');
      setResetPass('');
    } catch (err) {
      setResetMsg(err.message);
    }
  };

  if (view === 'edit') {
    return <TenantForm editTenant={tenant} onBack={() => setView('detail')} onSaved={() => { setView('detail'); onRefresh?.(); }} />;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '900px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}>←</button>
        <h2 style={{ margin: 0, flex: 1 }}>{tenant.razon_social}</h2>
        <button onClick={() => setView('edit')} style={{ padding: '6px 14px', border: '1px solid #1976d2', borderRadius: '6px', background: '#e3f2fd', color: '#1976d2', cursor: 'pointer' }}>Editar</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px' }}>
          <h4 style={{ marginTop: 0, color: 'var(--text-secondary)' }}>Información General</h4>
          <p><strong>NIT:</strong> {tenant.nit}</p>
          <p><strong>Nombre Comercial:</strong> {tenant.nombre_comercial}</p>
          <p><strong>País:</strong> {tenant.pais}</p>
          <p><strong>Moneda:</strong> {tenant.moneda_local}</p>
          <p><strong>DB Name:</strong> {tenant.db_name}</p>
        </div>
        <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px' }}>
          <h4 style={{ marginTop: 0, color: 'var(--text-secondary)' }}>Suscripción</h4>
          <p><strong>Plan:</strong> {tenant.plan_suscripcion}</p>
          <p><strong>Estado:</strong> {tenant.estado_suscripcion}</p>
          <p><strong>Límite Hectáreas:</strong> {tenant.limite_hectareas}</p>
          <p><strong>Límite Usuarios:</strong> {tenant.limite_usuarios}</p>
          <p><strong>Creado:</strong> {tenant.fecha_creacion ? new Date(tenant.fecha_creacion).toLocaleDateString() : 'N/A'}</p>
        </div>
      </div>

      {tenant.stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#e3f2fd', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1976d2' }}>{tenant.stats.fincas}</div>
            <div style={{ color: 'var(--text-secondary)' }}>Fincas</div>
          </div>
          <div style={{ background: '#e8f5e9', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#388e3c' }}>{tenant.stats.lotes}</div>
            <div style={{ color: 'var(--text-secondary)' }}>Lotes</div>
          </div>
          <div style={{ background: '#fff3e0', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f57c00' }}>{tenant.stats.hectareas}</div>
            <div style={{ color: 'var(--text-secondary)' }}>Hectáreas</div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <h3>Usuarios ({tenant.usuarios?.length || 0})</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-card)', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: 'var(--bg-main)', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px' }}>Username</th>
              <th style={{ padding: '10px 12px' }}>Email</th>
              <th style={{ padding: '10px 12px' }}>Rol</th>
              <th style={{ padding: '10px 12px' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {tenant.usuarios?.map(u => (
              <tr key={u.id_usuario} style={{ borderTop: '1px solid var(--border-color)' }}>
                <td style={{ padding: '8px 12px' }}>{u.username}</td>
                <td style={{ padding: '8px 12px' }}>{u.email}</td>
                <td style={{ padding: '8px 12px' }}>{u.rol}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '12px', background: u.activo ? '#c8e6c9' : '#ffcdd2' }}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0 }}>Resetear Contraseña Admin</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="password" placeholder="Nueva contraseña" value={resetPass} onChange={(e) => setResetPass(e.target.value)} style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px' }} />
          <button onClick={handleResetPassword} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', background: '#f57c00', color: '#fff', cursor: 'pointer' }}>Resetear</button>
        </div>
        {resetMsg && <p style={{ marginTop: '8px', color: resetMsg.includes('exitosamente') ? '#388e3c' : '#d32f2f', fontSize: '13px' }}>{resetMsg}</p>}
      </div>
    </div>
  );
}
