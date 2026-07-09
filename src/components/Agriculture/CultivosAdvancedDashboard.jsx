import React, { useState, useEffect } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Treemap
} from 'recharts';
import { fetchApi } from '../../utils/api';
import './CultivosAdvancedDashboard.css';

export default function CultivosAdvancedDashboard() {
  const [data, setData] = useState({ fenologia: [], proyeccion: [], zonas: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fetchApi('/dashboard-cultivos/avanzado');
        setData(result);
      } catch (error) {
        console.error('Error fetching advanced crops data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="advanced-dashboard-container" style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
        <h2 style={{color: '#4ade80'}}>Inicializando Subsistemas Gerenciales...</h2>
      </div>
    );
  }

  // Formatting Treemap data
  const treemapData = [{
    name: 'Zonas Agroecológicas',
    children: data.zonas.map(z => ({ name: z.zona, size: z.cantidad }))
  }];

  const totalEstimado = data.proyeccion.reduce((acc, curr) => acc + curr.Estimado, 0);
  const totalReal = data.proyeccion.reduce((acc, curr) => acc + curr.Real, 0);

  return (
    <div className="advanced-dashboard-container">
      <div className="advanced-header">
        <div>
          <h1>Tablero Avanzado (Gerencial)</h1>
          <p>Visión Estratégica Global del Portafolio Agrícola</p>
        </div>
      </div>

      <div className="advanced-kpis">
        <div className="glass-card kpi-stat">
          <h3>Producción Estimada Global</h3>
          <div className="value">
            {Math.round(totalEstimado).toLocaleString()} <span className="unit">Ton</span>
            <span className="trend-up">↑ 12%</span>
          </div>
        </div>
        <div className="glass-card kpi-stat">
          <h3>Producción Real (MTD)</h3>
          <div className="value">
            {Math.round(totalReal).toLocaleString()} <span className="unit">Ton</span>
          </div>
        </div>
        <div className="glass-card kpi-stat">
          <h3>Eficiencia Fenológica</h3>
          <div className="value">
            94 <span className="unit">%</span>
            <span className="trend-up">↑ 2.3%</span>
          </div>
        </div>
        <div className="glass-card kpi-stat">
          <h3>Zonas Activas</h3>
          <div className="value">
            {data.zonas.length} <span className="unit">Regiones</span>
          </div>
        </div>
      </div>

      <div className="advanced-charts">
        {/* Radar Chart for Phenology Requirements */}
        <div className="glass-card">
          <h2 className="chart-title">🌿 Requerimientos Hídricos por Etapa (Kc)</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.fenologia}>
                <PolarGrid stroke="rgba(255,255,255,0.2)" />
                <PolarAngleAxis dataKey="etapa" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#64748b' }} />
                <Radar name="Coeficiente Kc Promedio" dataKey="Kc" stroke="#4ade80" fill="#4ade80" fillOpacity={0.5} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Legend wrapperStyle={{ color: '#fff' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Treemap for Zones */}
        <div className="glass-card">
          <h2 className="chart-title">📍 Distribución Geográfica (Cultivos por Zona)</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={data.zonas.map(z => ({ name: z.zona, size: z.cantidad }))}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#fff"
                fill="#3b82f6"
              >
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              </Treemap>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Composed Chart for Yield */}
        <div className="glass-card full-width-chart">
          <h2 className="chart-title">📈 Rendimiento Proyectado vs Real por Cultivo (Toneladas)</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.proyeccion} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="cultivo" tick={{ fill: '#cbd5e1' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#cbd5e1' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Real" barSize={40} fill="#3b82f6" radius={[4, 4, 0, 0]} name="Producción Real" />
                <Line type="monotone" dataKey="Estimado" stroke="#4ade80" strokeWidth={3} name="Potencial Estimado" dot={{ r: 6, fill: '#1e293b', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="Estimado" fill="#4ade80" fillOpacity={0.1} stroke="none" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
