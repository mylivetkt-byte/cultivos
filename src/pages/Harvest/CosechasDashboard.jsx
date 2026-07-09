import React, { useEffect, useState } from 'react';
import { Card, Spin, message } from 'antd';
import { Line, Bar } from 'react-chartjs-2';
import { fetchHarvSummary, fetchHarvestTrend } from '../../utils/api';
import './Harvest.css';

export default function CosechasDashboard() {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [sum, tr] = await Promise.all([fetchHarvSummary(), fetchHarvestTrend()]);
        setSummary(sum);
        setTrend(tr);
      } catch (err) {
        message.error('Error cargando datos del dashboard');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <Spin size="large" />;

  const barData = {
    labels: summary?.map(item => item.id_lote) || [],
    datasets: [
      {
        label: 'Producción (kg)',
        data: summary?.map(item => item.total) || [],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const lineData = {
    labels: trend?.map(item => item.date) || [],
    datasets: [
      {
        label: 'Producción diaria (kg)',
        data: trend?.map(item => item.total) || [],
        fill: false,
        borderColor: '#ff6384',
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="harvest-dashboard glass">
      <h2 className="title">Dashboard de Cosechas</h2>
      <Card className="chart-card" style={{ marginBottom: '24px' }}>
        <Bar data={barData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
      </Card>
      <Card className="chart-card">
        <Line data={lineData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
      </Card>
    </div>
  );
}
