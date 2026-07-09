import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';

export default function GlobalStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchApi('/sistemas/stats');
        setStats(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <p style={{ padding: '20px' }}>Cargando estadísticas...</p>;
  if (!stats) return <p style={{ padding: '20px' }}>Error cargando estadísticas</p>;

  const cardStyle = { background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' };

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '24px' }}>Estadísticas Globales del Sistema</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ ...cardStyle, borderLeft: '4px solid #1976d2' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1976d2' }}>{stats.totalTenants || 0}</div>
          <div style={{ color: '#666' }}>Total Empresas</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: '4px solid #388e3c' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#388e3c' }}>{stats.tenantsActivos || 0}</div>
          <div style={{ color: '#666' }}>Empresas Activas</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: '4px solid #f57c00' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f57c00' }}>{stats.tenantsPendientes || 0}</div>
          <div style={{ color: '#666' }}>Pendientes</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: '4px solid #7b1fa2' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#7b1fa2' }}>{stats.totalUsuarios || 0}</div>
          <div style={{ color: '#666' }}>Total Usuarios</div>
        </div>
      </div>

      {stats.distribucionPlanes && Object.keys(stats.distribucionPlanes).length > 0 && (
        <div>
          <h3>Distribución por Planes</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {Object.entries(stats.distribucionPlanes).map(([plan, count]) => (
              <div key={plan} style={{ background: '#f5f5f5', padding: '12px 20px', borderRadius: '8px', minWidth: '120px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{count}</div>
                <div style={{ color: '#666', fontSize: '13px' }}>{plan}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
