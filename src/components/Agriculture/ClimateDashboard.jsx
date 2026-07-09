import React, { useState, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  ReferenceLine
} from 'recharts';
import { authFetch } from '../../utils/api';
import './ClimateDashboard.css';

export default function ClimateDashboard({ tenantId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEstacion, setSelectedEstacion] = useState('');

  const fetchStats = async (estacionId) => {
    try {
      setLoading(true);
      let url = `/api/clima/dashboard-stats?tenantId=${tenantId || 1}`;
      if (estacionId) url += `&estacionId=${estacionId}`;
      const response = await authFetch(url);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error al cargar datos del dashboard de Clima.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(selectedEstacion);
  }, [tenantId, selectedEstacion]);

  if (loading && !stats) return <div className="loading-container"><div className="spinner" /></div>;
  if (error) return <div className="error-container">{error}</div>;
  if (!stats) return null;

  return (
    <div className="climate-dashboard-container">
      <div className="dashboard-header">
        <h2 style={{ margin: 0, color: 'var(--text)' }}>🌤️ Intelligence Agro-Climática</h2>
        <select 
          className="station-select"
          value={selectedEstacion} 
          onChange={e => setSelectedEstacion(e.target.value)}
        >
          <option value="">Consolidado de Finca (Todas las Estaciones)</option>
          {stats.estaciones.map(est => (
            <option key={est.id_estacion} value={est.id_estacion}>{est.nombre}</option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card glass-card">
          <div className="kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>🌧️</div>
          <div className="kpi-content">
            <h3>{Number(stats.kpis.totalLluviaYtd || 0).toFixed(1)} <span className="unit">mm</span></h3>
            <p>Precipitación YTD</p>
          </div>
        </div>
        <div className="kpi-card glass-card">
          <div className="kpi-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>🌡️</div>
          <div className="kpi-content">
            <h3>{Number(stats.kpis.avgTempYtd || 0).toFixed(1)} <span className="unit">°C</span></h3>
            <p>Temperatura Promedio</p>
          </div>
        </div>
        <div className="kpi-card glass-card">
          <div className="kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>☀️</div>
          <div className="kpi-content">
            <h3>{Number(stats.kpis.avgRadiacionYtd || 0).toFixed(1)} <span className="unit">kWh/m²</span></h3>
            <p>Radiación Solar Avg</p>
          </div>
        </div>
        <div className="kpi-card glass-card alert-card" style={stats.kpis.diasSecos > 15 ? { borderLeft: '4px solid #ef4444' } : {}}>
          <div className="kpi-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>🏜️</div>
          <div className="kpi-content">
            <h3>{stats.kpis.diasSecos} <span className="unit">Días</span></h3>
            <p>Racha Seca (Sin lluvia)</p>
          </div>
        </div>
      </div>

      {/* Main Complex Chart */}
      <div className="charts-grid" style={{ gridTemplateColumns: '1fr', marginBottom: '24px' }}>
        <div className="chart-card glass-card premium-chart">
          <h3>Balance Hídrico vs Temperatura (Año en curso)</h3>
          <p className="chart-subtitle">Precipitación (mm) vs Temperatura (°C)</p>
          <div style={{ height: '400px', width: '100%', marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={stats.mergedTrends}
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="mes" scale="band" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                
                {/* Right Axis for Temp */}
                <YAxis yAxisId="right" type="number" orientation="right" domain={['dataMin - 2', 'dataMax + 2']} tick={{ fill: '#ef4444' }} axisLine={false} tickLine={false} />
                {/* Left Axis for Rain */}
                <YAxis yAxisId="left" type="number" orientation="left" tick={{ fill: '#3b82f6' }} axisLine={false} tickLine={false} />
                
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                
                {/* Rain */}
                <Bar yAxisId="left" dataKey="precipitacion" name="Precipitación (mm)" barSize={20} fill="url(#colorRain)" radius={[4, 4, 0, 0]} />
                {/* Evaporation */}
                <Area yAxisId="left" type="monotone" dataKey="evaporacion" name="Evaporación (mm)" fill="rgba(168, 85, 247, 0.2)" stroke="#a855f7" />
                {/* Temp */}
                <Line yAxisId="right" type="monotone" dataKey="temp_max" name="Temp Máx (°C)" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="temp_min" name="Temp Mín (°C)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />

                <defs>
                  <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Secondary Chart */}
      <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        <div className="chart-card glass-card">
          <h3>Comparativa de Precipitación Interanual</h3>
          <p className="chart-subtitle">Año en curso vs Año anterior (mm)</p>
          <div style={{ height: '300px', marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.mergedTrends}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="precipitacion_anterior" name="Año Anterior" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="precipitacion" name="Año Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card glass-card summary-box">
          <h3>Resumen Hídrico</h3>
          <div className="summary-content">
            <div className="summary-item">
              <span className="summary-label">Acumulado Actual</span>
              <span className="summary-value text-green">{Number(stats.kpis.totalLluviaYtd || 0).toFixed(1)} mm</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Acumulado Año Pasado</span>
              <span className="summary-value text-slate">{Number(stats.kpis.totalLluviaAnterior || 0).toFixed(1)} mm</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-item">
              <span className="summary-label">Diferencial (Delta)</span>
              <span className={`summary-value ${Number(stats.kpis.totalLluviaYtd || 0) >= Number(stats.kpis.totalLluviaAnterior || 0) ? 'text-green' : 'text-red'}`}>
                {((Number(stats.kpis.totalLluviaYtd || 0) - Number(stats.kpis.totalLluviaAnterior || 0)) > 0 ? '+' : '')}
                {(Number(stats.kpis.totalLluviaYtd || 0) - Number(stats.kpis.totalLluviaAnterior || 0)).toFixed(1)} mm
              </span>
            </div>
          </div>
          <p className="summary-note">
            El monitoreo de las variaciones interanuales permite anticipar las necesidades de riego o drenaje en la plantación.
          </p>
        </div>
      </div>

    </div>
  );
}
