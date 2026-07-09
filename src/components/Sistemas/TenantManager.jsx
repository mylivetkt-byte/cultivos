import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import TenantForm from './TenantForm';
import TenantDetail from './TenantDetail';

export default function TenantManager() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('list');
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  const loadTenants = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/sistemas/tenants');
      setTenants(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTenants(); }, []);

  const handleToggleState = async (tenant) => {
    const newEstado = tenant.estado_suscripcion === 'Activo' ? 'Suspendido' : 'Activo';
    try {
      await fetchApi(`/sistemas/tenant/${tenant.id_tenant}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ estado_suscripcion: newEstado }),
      });
      loadTenants();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleView = async (tenant) => {
    try {
      const res = await fetchApi(`/sistemas/tenant/${tenant.id_tenant}`);
      setSelectedTenant(res.data);
      setView('detail');
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = tenants.filter(t => {
    if (search && !t.razon_social?.toLowerCase().includes(search.toLowerCase()) &&
        !t.nit?.toLowerCase().includes(search.toLowerCase()) &&
        !t.nombre_comercial?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterEstado && t.estado_suscripcion !== filterEstado) return false;
    return true;
  });

  if (view === 'form') {
    return <TenantForm onBack={() => setView('list')} onSaved={() => { setView('list'); loadTenants(); }} />;
  }

  if (view === 'detail' && selectedTenant) {
    return <TenantDetail tenant={selectedTenant} onBack={() => setView('list')} onRefresh={() => { loadTenants(); handleView(selectedTenant); }} />;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Gestión de Empresas (Tenants)</h2>
        <button className="btn btn-primary" onClick={() => setView('form')}>+ Nueva Empresa</button>
      </div>

      {error && <div style={{ color: '#d32f2f', background: '#ffebee', padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Buscar por nombre, NIT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px' }}
        />
        <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px' }}>
          <option value="">Todos los estados</option>
          <option value="Activo">Activo</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Suspendido">Suspendido</option>
          <option value="Vencido">Vencido</option>
        </select>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Código</th>
                <th style={{ padding: '12px' }}>NIT</th>
                <th style={{ padding: '12px' }}>Razón Social</th>
                <th style={{ padding: '12px' }}>Plan</th>
                <th style={{ padding: '12px' }}>Estado</th>
                <th style={{ padding: '12px' }}>Usuarios</th>
                <th style={{ padding: '12px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id_tenant} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '10px 12px' }}>{t.codigo_tenant || `T-${String(t.id_tenant).padStart(3, '0')}`}</td>
                  <td style={{ padding: '10px 12px' }}>{t.nit}</td>
                  <td style={{ padding: '10px 12px' }}>{t.razon_social}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '12px', background: t.plan_suscripcion === 'Enterprise' ? '#e3f2fd' : t.plan_suscripcion === 'Professional' ? '#e8f5e9' : '#fff3e0', color: '#333' }}>
                      {t.plan_suscripcion}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '12px', background: t.estado_suscripcion === 'Activo' ? '#c8e6c9' : t.estado_suscripcion === 'Pendiente' ? '#fff9c4' : '#ffcdd2', color: '#333' }}>
                      {t.estado_suscripcion}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{t.total_usuarios || 0}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => handleView(t)} style={{ marginRight: '6px', padding: '4px 10px', border: '1px solid #1976d2', borderRadius: '4px', background: '#e3f2fd', color: '#1976d2', cursor: 'pointer' }}>Ver</button>
                    <button onClick={() => handleToggleState(t)} style={{ padding: '4px 10px', border: `1px solid ${t.estado_suscripcion === 'Activo' ? '#d32f2f' : '#388e3c'}`, borderRadius: '4px', background: t.estado_suscripcion === 'Activo' ? '#ffebee' : '#e8f5e9', color: t.estado_suscripcion === 'Activo' ? '#d32f2f' : '#388e3c', cursor: 'pointer' }}>
                      {t.estado_suscripcion === 'Activo' ? 'Suspender' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No se encontraron empresas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
