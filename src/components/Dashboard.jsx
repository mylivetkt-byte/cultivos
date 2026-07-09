import React, { useState, useEffect } from 'react';
import { fetchDashboardStats } from '../utils/api';
import GerenciaDashboard from './GerenciaDashboard';
import './dashboard.css';

function Dashboard({ modules, loading, onSelectTable, tenantId, fincaId, nucleoId }) {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    setLoadingStats(true);
    fetchDashboardStats({ tenantId, fincaId, nucleoId })
      .then(setStats)
      .catch((err) => setStatsError(err.message))
      .finally(() => setLoadingStats(false));
  }, [tenantId, fincaId, nucleoId]);

  return (
    <div className="dashboard">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Dashboard Alta Gerencia</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Métricas e indicadores clave de rendimiento agrícola (KPIs)</p>
        </div>
        {(tenantId || fincaId || nucleoId) && (
          <span style={{
            background: 'rgba(74, 144, 226, 0.1)',
            color: '#4a90e2',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            🔍 Filtros Activos
          </span>
        )}
      </div>

      {statsError && (
        <div className="dashboard-section" style={{ marginBottom: '16px' }}>
          <div style={{ padding: '16px 20px', background: '#FFF3E0', color: '#E65100', fontSize: '14px', borderRadius: 'var(--radius)' }}>
            ⚠️ No se pudo conectar a la base de datos: <strong>{statsError}</strong>
            <br />
            <span style={{ fontSize: '13px', color: '#BF360C' }}>
              Asegúrese de que MySQL esté ejecutándose en localhost:3307 o 3306 con la base de datos sas_agricolas
            </span>
          </div>
        </div>
      )}

      {/* Top Summaries */}
      <div className="summary-cards" style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <div className="summary-card" style={{ flex: 1, padding: '20px', borderRadius: '16px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          <h4 style={{ color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Fincas Activas</h4>
          <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '10px 0 0 0', color: '#fff' }}>{stats?.fincasCount ?? '--'}</p>
        </div>
        <div className="summary-card" style={{ flex: 1, padding: '20px', borderRadius: '16px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          <h4 style={{ color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Hectáreas Totales</h4>
          <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '10px 0 0 0', color: '#10b981' }}>{stats?.totalHectareas?.toLocaleString('es-ES', { maximumFractionDigits: 1 }) ?? '--'} <span style={{fontSize: '14px', color: '#64748b'}}>ha</span></p>
        </div>
        <div className="summary-card" style={{ flex: 1, padding: '20px', borderRadius: '16px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          <h4 style={{ color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Personal de Campo</h4>
          <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '10px 0 0 0', color: '#3b82f6' }}>{stats?.empleadosCount ?? '--'} <span style={{fontSize: '14px', color: '#64748b'}}>ops</span></p>
        </div>
      </div>

      {loadingStats && !statsError && (
        <div className="loading-container" style={{ margin: '30px 0' }}>
          <div className="spinner" />
          <span className="loading-text">Cargando métricas...</span>
        </div>
      )}

      {/* Premium Agriculture Stats from Gerencia */}
      <GerenciaDashboard tenantId={tenantId} />

    </div>
  );
}

export default Dashboard;
