import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { fetchApi } from '../../utils/api';
import './CultivosDashboard.css';

const COLORS = ['#2ecc71', '#3498db', '#e67e22', '#9b59b6', '#f1c40f'];

export default function CultivosDashboard() {
  const [kpis, setKpis] = useState(null);
  const [distribucion, setDistribucion] = useState([]);
  const [produccion, setProduccion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpisData, distData, prodData] = await Promise.all([
          fetchApi('/dashboard-cultivos/kpis'),
          fetchApi('/dashboard-cultivos/distribucion'),
          fetchApi('/dashboard-cultivos/produccion')
        ]);
        
        setKpis(kpisData);
        setDistribucion(distData);
        setProduccion(prodData);
      } catch (error) {
        console.error('Error fetching cultivos data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Cargando datos de la plantación...</p>
      </div>
    );
  }

  const distData = Array.isArray(distribucion) ? distribucion : [];
  const prodData = Array.isArray(produccion?.tendencia) ? produccion.tendencia : [];

  return (
    <div className="cultivos-dashboard-container">
      <div className="dashboard-header">
        <h1>Monitoreo Agrícola</h1>
        <p>Visión global de cultivos y tendencia de producción (1300 Plazas)</p>
      </div>

      <div className="kpi-cards-grid">
        <div className="kpi-card">
          <div className="kpi-icon">🌍</div>
          <div className="kpi-content">
            <h3>Total Hectáreas (Activas)</h3>
            <p>{kpis?.totalHectareas?.toLocaleString() || 0} Ha</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">🌱</div>
          <div className="kpi-content">
            <h3>Plazas / Lotes</h3>
            <p>{kpis?.totalLotes?.toLocaleString() || 0}</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">📈</div>
          <div className="kpi-content">
            <h3>Producción MTD</h3>
            <p>
              {produccion?.tendencia?.length > 0 
                ? Math.round(Object.values(produccion.tendencia[produccion.tendencia.length - 1]).reduce((a,b) => typeof b === 'number' ? a+b : a, 0)).toLocaleString() 
                : 0} Ton
            </p>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h2>Distribución de Cultivos</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="hectareas"
                  nameKey="cultivo"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {distData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value) => [`${value} Ha`, 'Área']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h2>Tendencia de Producción (Toneladas)</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prodData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  cursor={{fill: 'rgba(0,0,0,0.05)'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                />
                <Legend />
                {produccion?.cultivos?.map((cultivo, idx) => (
                  <Bar 
                    key={cultivo} 
                    dataKey={cultivo} 
                    stackId="a" 
                    fill={COLORS[idx % COLORS.length]} 
                    radius={idx === produccion.cultivos.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
