import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { authFetch } from '../../utils/api';
import './AtecDashboard.css';

const COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#8884d8'];

export default function AtecDashboard({ tenantId, fincaId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        let url = `/api/atec/dashboard-stats?tenantId=${tenantId || 1}`;
        if (fincaId) url += `&fincaId=${fincaId}`;
        const response = await authFetch(url);
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError('Error al cargar datos del dashboard ATEC.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [tenantId, fincaId]);

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;
  if (error) return <div className="error-container">{error}</div>;
  if (!stats) return null;

  const pieData = [
    { name: 'Aplicadas', value: stats.recetasAplicadas },
    { name: 'Pendientes', value: stats.recetasPendientes }
  ].filter(d => d.value > 0);

  return (
    <div className="atec-dashboard-container">
      <h2 style={{ marginBottom: '24px', color: 'var(--text)' }}> Dashboard ATEC (Asistencia Técnica)</h2>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>👨‍🏫</div>
          <div className="kpi-content">
            <h3>{stats.totalCapacitaciones}</h3>
            <p>Capacitaciones</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>🚜</div>
          <div className="kpi-content">
            <h3>{stats.totalVisitas}</h3>
            <p>Visitas Técnicas</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>⭐</div>
          <div className="kpi-content">
            <h3>{Number(stats.avgCapacitacionRating).toFixed(1)}/5.0</h3>
            <p>Rating Capacitaciones</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>🧪</div>
          <div className="kpi-content">
            <h3>{stats.recetasPendientes}</h3>
            <p>Recetas Pendientes</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        <div className="chart-card">
          <h3>Enfermedades y Plagas Detectadas</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topEnfermedades} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <RechartsTooltip contentStyle={{ background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                <Bar dataKey="count" fill="#8884d8" name="Casos Detectados" radius={[0, 4, 4, 0]}>
                  {stats.topEnfermedades.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>Estado de Recetario (Aplicaciones)</h3>
          <div style={{ height: '300px' }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Aplicadas' ? '#10b981' : '#f59e0b'} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No hay datos de recetas
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Grid: Recomendaciones Pendientes */}
      <div className="chart-card">
        <h3>Últimas Recomendaciones Pendientes de Implementar</h3>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha Visita</th>
                <th>Finca</th>
                <th>Recomendación</th>
                <th>Prioridad</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {stats.recomendacionesPendientes.map(r => (
                <tr key={r.id_recomendacion}>
                  <td>{new Date(r.fecha_visita).toLocaleDateString()}</td>
                  <td>{r.finca_nombre}</td>
                  <td style={{ maxWidth: '300px', whiteSpace: 'normal' }}>{r.descripcion_detallada}</td>
                  <td>
                    <span className={`badge badge-${r.prioridad?.toLowerCase()}`}>
                      {r.prioridad}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${r.estado_implementacion?.toLowerCase()}`}>
                      {r.estado_implementacion?.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
              {stats.recomendacionesPendientes.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                    No hay recomendaciones pendientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
