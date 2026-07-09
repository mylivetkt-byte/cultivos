import React, { useEffect, useState } from 'react';
import { API_BASE } from '../utils/api.js';
import { Bar, Line, Doughnut, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import './dashboard.css';
import { authFetch } from '../utils/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend
);

// Global defaults for premium dark mode aesthetics
ChartJS.defaults.color = '#94a3b8';
ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.plugins.legend.labels.usePointStyle = true;

function GerenciaDashboard({ tenantId }) {
  const [data, setData] = useState({
    timeline: null,
    salud: null,
    cosechas: null,
    abonos: null,
    siembras: null,
    ganado: null,
    acuicola: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const base = `${API_BASE}/dashboard-gerencia`;
      const tQ = tenantId ? `?tenantId=${tenantId}` : '';

      const safeFetch = async (url) => {
        try {
          const res = await authFetch(url, { headers });
          const json = await res.json();
          return Array.isArray(json) ? json : [];
        } catch {
          return [];
        }
      };

      try {
        const [timeline, salud, cosechas, abonos, siembras, ganado, acuicola] = await Promise.all([
          safeFetch(`${base}/cultivos-timeline${tQ}`),
          safeFetch(`${base}/lotes-salud${tQ}`),
          safeFetch(`${base}/cosechas-ciclo${tQ}`),
          safeFetch(`${base}/abonos-produccion${tQ}`),
          safeFetch(`${base}/siembras-inventario${tQ}`),
          safeFetch(`${base}/ganado-stats${tQ}`),
          safeFetch(`${base}/acuicola-stats${tQ}`)
        ]);

        setData({ timeline, salud, cosechas, abonos, siembras, ganado, acuicola });
      } catch (err) {
        console.error('Error fetching gerencia stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tenantId]);

  if (loading || !Array.isArray(data.salud) || data.salud.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando inteligencia de negocio...</div>;
  }

  // 1. Salud (Doughnut)
  const chartSalud = {
    labels: data.salud.map(d => d.name),
    datasets: [{
      data: data.salud.map(d => d.value),
      backgroundColor: data.salud.map(d => d.color),
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  const optionsSalud = {
    cutout: '75%',
    plugins: {
      legend: { position: 'bottom' }
    }
  };

  // 2. Cosechas (Line with Gradient - Simulated via context in real setup, but basic here)
  const chartCosechas = {
    labels: data.cosechas.map(d => d.mes),
    datasets: [
      {
        label: 'Real (kg/ha)',
        data: data.cosechas.map(d => d.real_kg),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#1d4ed8'
      },
      {
        label: 'Proyectado (kg/ha)',
        data: data.cosechas.map(d => d.proyectado_kg),
        borderColor: '#64748b',
        borderDash: [5, 5],
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0
      }
    ]
  };

  const optionsCosechas = {
    responsive: true,
    scales: {
      y: { grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { grid: { display: false } }
    }
  };

  // 3. Abonos Orgánicos (Bar)
  const chartAbonos = {
    labels: data.abonos.map(d => d.mes),
    datasets: [
      {
        label: 'Compost (ton)',
        data: data.abonos.map(d => d.compost_ton),
        backgroundColor: '#10b981',
        borderRadius: 4
      },
      {
        label: 'Humus Lombriz (ton)',
        data: data.abonos.map(d => d.humus_ton),
        backgroundColor: '#f59e0b',
        borderRadius: 4
      },
      {
        label: 'Biol (Lt / 100)',
        // Escalar para visualización
        data: data.abonos.map(d => d.biol_lt / 100),
        backgroundColor: '#8b5cf6',
        borderRadius: 4
      }
    ]
  };

  const optionsAbonos = {
    responsive: true,
    scales: {
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, stacked: true },
      x: { grid: { display: false }, stacked: true }
    }
  };

  // 4. Siembras e Inventario (Radar)
  const chartSiembras = {
    labels: data.siembras.map(d => d.categoria),
    datasets: [{
      label: 'Volumen',
      data: data.siembras.map(d => d.valor),
      backgroundColor: 'rgba(236, 72, 153, 0.2)',
      borderColor: '#ec4899',
      pointBackgroundColor: '#be185d',
      borderWidth: 2
    }]
  };

  const optionsSiembras = {
    scales: {
      r: {
        angleLines: { color: 'rgba(255,255,255,0.1)' },
        grid: { color: 'rgba(255,255,255,0.1)' },
        pointLabels: { color: '#cbd5e1', font: { size: 11 } },
        ticks: { display: false }
      }
    }
  };

  // 5. Ganado Censo (Doughnut)
  const chartGanado = {
    labels: data.ganado?.map(d => d.name) || [],
    datasets: [{
      data: data.ganado?.map(d => d.value) || [],
      backgroundColor: data.ganado?.map(d => d.color) || [],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  const optionsGanado = {
    cutout: '75%',
    plugins: {
      legend: { position: 'bottom' }
    }
  };

  // 6. Acuícola Biomasa (Bar)
  const totalBiomasaAcuicola = data.acuicola?.reduce((acc, curr) => acc + (curr.biomasa_actual_kg || 0), 0) || 0;
  const chartAcuicola = {
    labels: data.acuicola?.map(d => d.lago) || [],
    datasets: [{
      label: 'Biomasa Actual (kg)',
      data: data.acuicola?.map(d => d.biomasa_actual_kg) || [],
      backgroundColor: '#0ea5e9',
      borderRadius: 4
    }]
  };

  const optionsAcuicola = {
    responsive: true,
    scales: {
      y: { grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { grid: { display: false } }
    }
  };

  return (
    <div className="gerencia-dashboard" style={{ marginTop: '30px' }}>
      
      {/* KPI Header Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        {/* Salud Fitosanitaria */}
        <div className="glass-card" style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🛡️</span> Salud Fitosanitaria
          </h3>
          <div style={{ height: '220px', display: 'flex', justifyContent: 'center' }}>
            <Doughnut data={chartSalud} options={optionsSalud} />
          </div>
        </div>

        {/* Cosechas por Ciclo */}
        <div className="glass-card" style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📈</span> Comparativo de Cosechas por Ciclo
          </h3>
          <div style={{ height: '220px' }}>
            <Line data={chartCosechas} options={optionsCosechas} />
          </div>
        </div>
        
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        
        {/* Producción Abonos */}
        <div className="glass-card" style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>♻️</span> Producción de Abonos Orgánicos
          </h3>
          <div style={{ height: '260px' }}>
            <Bar data={chartAbonos} options={optionsAbonos} />
          </div>
        </div>

        {/* Radar Inventario */}
        <div className="glass-card" style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🌱</span> Inventario: Siembras y Semillas
          </h3>
          <div style={{ height: '260px', display: 'flex', justifyContent: 'center' }}>
            <Radar data={chartSiembras} options={optionsSiembras} />
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
        
        {/* Ganado Censo */}
        <div className="glass-card" style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🐄</span> Censo Ganadero
          </h3>
          <div style={{ height: '220px', display: 'flex', justifyContent: 'center' }}>
            {data.ganado && data.ganado.length > 0 && data.ganado.some(g => g.value > 0) ? (
              <Doughnut data={chartGanado} options={optionsGanado} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                No hay datos de ganado
              </div>
            )}
          </div>
        </div>

        {/* Acuícola Biomasa */}
        <div className="glass-card" style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🐟</span> Biomasa Acuícola por Lago
            </h3>
            <div style={{ background: 'rgba(14, 165, 233, 0.1)', border: '1px solid #0ea5e9', padding: '4px 12px', borderRadius: '20px', color: '#0ea5e9', fontWeight: 'bold' }}>
              Total Fincas: {totalBiomasaAcuicola.toLocaleString()} kg
            </div>
          </div>
          <div style={{ height: '220px' }}>
            {data.acuicola && data.acuicola.length > 0 ? (
              <Bar data={chartAcuicola} options={optionsAcuicola} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                No hay datos acuícolas
              </div>
            )}
          </div>
        </div>
        
      </div>

      {/* Gantt de Cultivos */}
      <div className="glass-card" style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⏳</span> Ciclo de Cultivos Activos
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {data.timeline.map((c, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ fontWeight: '500', color: '#e2e8f0' }}>{c.cultivo}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{c.progreso}% (Cosecha: {new Date(c.fecha_cosecha).toLocaleDateString()})</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${c.progreso}%`, 
                  background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
                  borderRadius: '4px'
                }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default GerenciaDashboard;
