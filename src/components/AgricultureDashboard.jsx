import React, { useEffect, useState } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { fetchHarvSummary, fetchHarvestTrend, fetchLaborStats } from '../utils/api';

// Register Chart.js components, including line elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
);

function AgricultureDashboard() {
  const [harvestData, setHarvestData] = useState(null);
  const [laborStats, setLaborStats] = useState(null);
  const [harvestTrend, setHarvestTrend] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHarvSummary()
      .then(setHarvestData)
      .catch(err => setError(err.message));
    fetchLaborStats()
      .then(setLaborStats)
      .catch(err => setError(err.message));
    fetchHarvestTrend()
      .then(setHarvestTrend)
      .catch(err => setError(err.message));
  }, []);

  if (error) {
    return <div className="error">Error cargando datos: {error}</div>;
  }

  if (!harvestData || !laborStats || !harvestTrend) {
    return <div className="loading">Cargando datos...</div>;
  }

  // Prepare data for labor stats (pie chart)
  const pieData = {
    labels: laborStats.map(item => item.type),
    datasets: [
      {
        data: laborStats.map(item => item.percentage),
        backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff'],
        hoverBackgroundColor: ['#ff6384aa', '#36a2ebaa', '#ffce56aa', '#4bc0c0aa', '#9966ffaa'],
      },
    ],
  };

  // Prepare data for harvest trend (line chart)
  const lineData = {
    labels: harvestTrend.map(item => item.date),
    datasets: [
      {
        label: 'Producción de cosecha',
        data: harvestTrend.map(item => item.total),
        fill: true,
        backgroundColor: 'rgba(75,192,192,0.2)',
        borderColor: 'rgba(75,192,192,1)',
        tension: 0.4,
      },
    ],
  };

  // Prepare data for harvest summary (bar chart)
  const barData = {
    labels: harvestData.map(item => item.id_lote),
    datasets: [
      {
        label: 'Resumen de cosecha',
        data: harvestData.map(item => item.total),
        backgroundColor: 'rgba(255,99,132,0.6)',
        borderColor: 'rgba(255,99,132,1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="agri-dashboard">
      <h2>Estadísticas de Labor</h2>
      <Pie data={pieData} />
      <h2>Tendencia de Cosecha</h2>
      <Line data={lineData} />
      <h2>Resumen de Cosecha</h2>
      <Bar data={barData} />
    </div>
  );
}

export default AgricultureDashboard;
