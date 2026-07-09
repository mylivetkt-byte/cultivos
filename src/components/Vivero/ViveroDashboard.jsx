import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api.js';
import { formatCurrency } from '../../utils/format';
import { Pie, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function ViveroDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    authFetch('/api/semillero/dashboard?tenantId=1')
      .then(res => {
        if (!res.ok) throw new Error('Error al cargar dashboard del vivero');
        return res.json();
      })
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando Inteligencia de Negocio del Vivero...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  // Process data for charts
  const destinosLabels = stats.destinos.map(d => d.tipo);
  const destinosData = stats.destinos.map(d => Number(d.total));

  const pieData = {
    labels: destinosLabels.length ? destinosLabels : ['Sin Movimientos'],
    datasets: [{
      data: destinosData.length ? destinosData : [1],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',   // Green for Siembra
        'rgba(59, 130, 246, 0.8)',  // Blue for Ventas
        'rgba(245, 158, 11, 0.8)',  // Yellow for Resiembra
        'rgba(239, 68, 68, 0.8)',   // Red for Bajas
        'rgba(168, 85, 247, 0.8)'   // Purple for Obsequios
      ],
      borderWidth: 1,
      borderColor: '#1e293b' // Dark mode border
    }]
  };

  const estadosLabels = stats.estadosCamadas.map(e => e.estado);
  const estadosData = stats.estadosCamadas.map(e => Number(e.cantidad));

  const barData = {
    labels: estadosLabels.length ? estadosLabels : ['Sin Camadas'],
    datasets: [{
      label: 'Plántulas (Cantidad)',
      data: estadosData.length ? estadosData : [0],
      backgroundColor: 'rgba(16, 185, 129, 0.8)', // Emerald
      borderRadius: 8,
    }]
  };

  const valorLabels = stats.valorInventario.map(v => v.tipo);
  const valorData = stats.valorInventario.map(v => Number(v.valor_total));

  const doughnutData = {
    labels: valorLabels.length ? valorLabels : ['Sin Inventario'],
    datasets: [{
      data: valorData.length ? valorData : [1],
      backgroundColor: [
        'rgba(217, 70, 239, 0.8)', // Fuchsia for Seeds
        'rgba(14, 165, 233, 0.8)', // Light Blue for Chemicals
        'rgba(132, 204, 22, 0.8)', // Lime for Organics
        'rgba(251, 146, 60, 0.8)', // Orange for Plants
      ],
      borderWidth: 1,
      borderColor: '#1e293b'
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { family: 'Inter', size: 12 } } }
    }
  };

  const barOptions = {
    ...chartOptions,
    scales: {
      y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
      x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-light text-emerald-400 mb-2 tracking-wide">Inteligencia Gerencial <span className="font-bold text-white">Vivero & Semillero</span></h1>
        <p className="text-slate-400 text-sm">Estadísticas y valorización del ciclo de propagación de cultivos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Distribución de Destinos (Salidas) */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 hover:border-slate-600 transition-all">
          <h2 className="text-lg font-semibold mb-4 text-slate-100 border-b border-slate-700 pb-2">Destino de Plántulas Histórico</h2>
          <div className="h-64 relative">
            <Pie data={pieData} options={chartOptions} />
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center">Proporción de salidas por concepto de siembra, ventas o bajas.</p>
        </div>

        {/* Card 2: Estado Actual de Camadas */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 hover:border-slate-600 transition-all">
          <h2 className="text-lg font-semibold mb-4 text-slate-100 border-b border-slate-700 pb-2">Pipeline de Crecimiento (Camadas Activas)</h2>
          <div className="h-64 relative">
            <Bar data={barData} options={barOptions} />
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center">Cantidad de plántulas vivas según su fase de crecimiento actual.</p>
        </div>

        {/* Card 3: Valorización de Inventario */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 hover:border-slate-600 transition-all">
          <h2 className="text-lg font-semibold mb-4 text-slate-100 border-b border-slate-700 pb-2">Valorización de Inventario ($)</h2>
          <div className="h-64 relative">
            <Doughnut data={doughnutData} options={chartOptions} />
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center">Capital inmovilizado en el vivero agrupado por tipo de insumo.</p>
        </div>

      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <div className="bg-gradient-to-br from-emerald-900 to-slate-800 p-6 rounded-xl border border-emerald-800/50">
          <h3 className="text-emerald-400 text-sm uppercase tracking-wider mb-1">Total Sembrado</h3>
          <p className="text-3xl font-bold text-white">
            {stats.destinos.find(d => d.tipo === 'Salida_Siembra')?.total || 0}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-900 to-slate-800 p-6 rounded-xl border border-blue-800/50">
          <h3 className="text-blue-400 text-sm uppercase tracking-wider mb-1">Total Vendido</h3>
          <p className="text-3xl font-bold text-white">
            {stats.destinos.find(d => d.tipo === 'Venta')?.total || 0}
          </p>
        </div>
        <div className="bg-gradient-to-br from-red-900 to-slate-800 p-6 rounded-xl border border-red-800/50">
          <h3 className="text-red-400 text-sm uppercase tracking-wider mb-1">Bajas / Enfermedad</h3>
          <p className="text-3xl font-bold text-white">
            {stats.destinos.find(d => d.tipo === 'Baja_Enfermedad')?.total || 0}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-900 to-slate-800 p-6 rounded-xl border border-purple-800/50">
          <h3 className="text-purple-400 text-sm uppercase tracking-wider mb-1">Insumos Disponibles</h3>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(stats.valorInventario.reduce((acc, curr) => acc + Number(curr.valor_total), 0))}
          </p>
        </div>
      </div>
    </div>
  );
}
