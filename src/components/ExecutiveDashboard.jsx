import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { API_BASE } from '../utils/api';
import { authFetch } from '../utils/api';
const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

function ExecutiveDashboard({ tenantId, fincaId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningCompliance, setRunningCompliance] = useState(false);
  const [complianceResult, setComplianceResult] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tenantId: tenantId || 1 });
      if (fincaId) params.append('fincaId', fincaId);
      
      const res = await authFetch(`${API_BASE}/reports/dashboard?${params.toString()}`);
      if (!res.ok) throw new Error('Error fetching dashboard');
      const jsonData = await res.json();
      setData(jsonData);
    } catch (err) {
      console.error('Error fetching dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [tenantId, fincaId]);

  const handleRunCompliance = async () => {
    setRunningCompliance(true);
    setComplianceResult(null);
    try {
      const res = await authFetch(`${API_BASE}/reports/run-compliance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenantId || 1 })
      });
      if (!res.ok) throw new Error('Error ejecutando compliance');
      const jsonData = await res.json();
      setComplianceResult(jsonData);
      // Reload dashboard data to show new alerts
      fetchDashboardData();
    } catch (err) {
      alert('Error ejecutando compliance: ' + err.message);
    } finally {
      setRunningCompliance(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container" style={{ padding: '24px', color: 'white' }}>
        <div className="spinner" /> Cargando Dashboard Gerencial...
      </div>
    );
  }

  if (!data) return <div style={{ color: 'white' }}>Error al cargar dashboard</div>;

  return (
    <div className="dashboard-container" style={{ padding: '24px' }}>
      <h2 style={{ color: '#00F0FF', marginBottom: '8px' }}>📊 Dashboard Gerencial & Compliance</h2>
      <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
        Análisis de inteligencia de negocio y auditoría de reglas laborales/agrícolas.
      </p>

      {/* Acciones Superiores */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <button 
          className="btn btn-primary" 
          onClick={handleRunCompliance} 
          disabled={runningCompliance}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)' }}
        >
          {runningCompliance ? <div className="spinner" style={{width: 14, height: 14, borderWidth: 2}} /> : '🔍'} 
          Ejecutar Auditoría Compliance
        </button>
        {complianceResult && (
          <span style={{ color: complianceResult.alertsGenerated > 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
            {complianceResult.alertsGenerated > 0 
              ? `⚠️ Se encontraron ${complianceResult.alertsGenerated} infracciones.` 
              : '✅ Todo en regla. Sin infracciones.'}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* KPI: Empleados */}
        <div className="kpi-card" style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ color: '#94a3b8', margin: '0 0 16px 0', fontSize: '14px', textTransform: 'uppercase' }}>Fuerza Laboral</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
            <span style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>{data.employees?.activos || 0}</span>
            <span style={{ fontSize: '16px', color: '#64748b', marginBottom: '6px' }}>/ {data.employees?.total || 0} activos</span>
          </div>
        </div>

        {/* Gráfico: Tareas */}
        <div className="kpi-card" style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ color: '#94a3b8', margin: '0 0 16px 0', fontSize: '14px', textTransform: 'uppercase' }}>Estado de Labores (Asignadas)</h3>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.taskStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.taskStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alertas Críticas */}
        <div className="kpi-card" style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid #ef4444', gridColumn: 'span 2' }}>
          <h3 style={{ color: '#ef4444', margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚠️ Alertas Críticas (Top 5 no leídas)
          </h3>
          
          {data.alerts && data.alerts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.alerts.map(a => (
                <div key={a.id_alerta} style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', padding: '12px', borderRadius: '0 8px 8px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ color: 'white' }}>{a.titulo}</strong>
                    <span style={{ fontSize: '12px', color: '#ef4444' }}>{new Date(a.fecha_creacion).toLocaleString()}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#cbd5e1' }}>{a.mensaje}</p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
              ✓ Ninguna alerta de compliance detectada.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default ExecutiveDashboard;
