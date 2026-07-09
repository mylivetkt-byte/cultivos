import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { authFetch } from '../../utils/api';
import './ComprasDashboard.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff7300', '#413ea0', '#f44236', '#9c27b0', '#3f51b5'];

export default function ComprasDashboard({ tenantId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await authFetch(`/api/compras/dashboard-stats?tenantId=${tenantId || 1}&year=${year}`);
        const result = await res.json();
        if (result.success) {
          setData(result);
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [tenantId, year]);

  if (loading) return <div style={{padding: '50px', textAlign: 'center'}}>Cargando dashboard...</div>;
  if (!data) return <div style={{padding: '50px', textAlign: 'center'}}>Error cargando dashboard de compras</div>;

  return (
    <div className="cd-container">
      <div className="cd-header">
        <div>
          <h1 className="cd-title">
            <span>🛒</span> Analytics de Compras
          </h1>
          <p className="cd-subtitle">Panel de control avanzado de adquisiciones</p>
        </div>
        <div>
          <select 
            value={year} 
            onChange={e => setYear(Number(e.target.value))}
            className="cd-year-select"
          >
            {[2023, 2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="cd-kpi-grid">
        <div className="cd-kpi-card bg-blue">
          <div className="cd-kpi-icon">📄</div>
          <div>
            <div className="cd-kpi-label">Total Órdenes</div>
            <h3 className="cd-kpi-value">{data.kpis?.total_ordenes || 0}</h3>
          </div>
        </div>
        <div className="cd-kpi-card bg-orange">
          <div className="cd-kpi-icon">⏳</div>
          <div>
            <div className="cd-kpi-label">Pendientes</div>
            <h3 className="cd-kpi-value">{(Number(data.kpis?.emitidas) + Number(data.kpis?.parciales)) || 0}</h3>
          </div>
        </div>
        <div className="cd-kpi-card bg-green">
          <div className="cd-kpi-icon">✅</div>
          <div>
            <div className="cd-kpi-label">Recibidas Total</div>
            <h3 className="cd-kpi-value">{data.kpis?.recibidas || 0}</h3>
          </div>
        </div>
        <div className="cd-kpi-card bg-purple">
          <div className="cd-kpi-icon">💰</div>
          <div>
            <div className="cd-kpi-label">Presupuesto Comprometido</div>
            <h3 className="cd-kpi-value">${Number(data.kpis?.costo_total || 0).toLocaleString()}</h3>
          </div>
        </div>
      </div>

      <div className="cd-charts-grid">
        <div className="cd-chart-card">
          <h2 className="cd-chart-title">📊 Tendencia de Gastos Mensual</h2>
          <div style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => `$${(val/1000000).toFixed(1)}M`} 
                />
                <Tooltip 
                  formatter={(val) => [`$${Number(val).toLocaleString()}`, 'Total Compras']}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="cd-chart-card">
          <h2 className="cd-chart-title">📦 Top 10 Insumos Más Comprados</h2>
          <div style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.topProducts}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="quantity"
                  nameKey="name"
                >
                  {data.topProducts?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val, name, props) => [`${val} uds. ($${Number(props.payload.total_cost).toLocaleString()})`, name]}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="cd-table-container">
        <div className="cd-table-header">
          <h2 className="cd-table-title">🤝 Top 5 Proveedores Estratégicos</h2>
        </div>
        <table className="cd-table">
          <thead>
            <tr>
              <th>Ranking</th>
              <th>Proveedor (Razón Social)</th>
              <th className="right">Monto Total Facturado</th>
            </tr>
          </thead>
          <tbody>
            {data.topSuppliers?.map((s, i) => (
              <tr key={i}>
                <td>
                  <span className={`cd-rank-badge ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other'}`}>
                    #{i+1}
                  </span>
                </td>
                <td>{s.name}</td>
                <td className="right">
                  ${Number(s.total_spent).toLocaleString()}
                </td>
              </tr>
            ))}
            {!data.topSuppliers?.length && (
              <tr><td colSpan="3" style={{ textAlign: 'center', padding: '30px' }}>No hay proveedores en el periodo actual.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
