import React, { useEffect, useState } from 'react';
import { fetchStock, fetchCamadas, fetchVentas, fetchLaboresSemillero } from '../utils/api';
import Chart from 'chart.js/auto'; // assuming chart.js is available

function SemilleroDashboard({ tenantId, fincaId, nucleoId }) {
  const [stock, setStock] = useState([]);
  const [camadas, setCamadas] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [labores, setLabores] = useState([]);

  useEffect(() => {
    fetchStock({ tenantId }).then(setStock).catch(console.error);
    fetchCamadas({ tenantId }).then(setCamadas).catch(console.error);
    fetchVentas({ tenantId }).then(setVentas).catch(console.error);
    fetchLaboresSemillero({ tenantId }).then(setLabores).catch(console.error);
  }, [tenantId]);

  // Simple bar chart for stock by age bracket
  useEffect(() => {
    if (!stock.length) return;
    const ctx = document.getElementById('stockAgeChart')?.getContext('2d');
    if (!ctx) return;
    const ages = stock.map(s => s.edad_dias);
    const qty = stock.map(s => s.cantidad_actual);
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ages,
        datasets: [{
          label: 'Cantidad por edad (días)',
          data: qty,
          backgroundColor: 'rgba(59,130,246,0.6)'
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }, [stock]);

  return (
    <div className="semillero-dashboard" style={{ padding: '20px', display: 'grid', gap: '20px' }}>
      <h2>📊 Dashboard Vivero</h2>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '1 1 200px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' }}>
          <h4>🪴 Stock total</h4>
          <p>{stock.reduce((a, s) => a + (s.cantidad_actual || 0), 0)} plantas</p>
        </div>
        <div className="card" style={{ flex: '1 1 200px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' }}>
          <h4>🌱 Camadas activas</h4>
          <p>{camadas.filter(c => c.estado !== 'Cancelado').length}</p>
        </div>
        <div className="card" style={{ flex: '1 1 200px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' }}>
          <h4>💰 Ventas del mes</h4>
          <p>{ventas.reduce((a, v) => a + v.cantidad * parseFloat(v.precio_unitario), 0).toFixed(2)} €</p>
        </div>
        <div className="card" style={{ flex: '1 1 200px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' }}>
          <h4>🔧 Labores pendientes</h4>
          <p>{labores.filter(l => l.estado === 'Planificada' || l.estado === 'En Progreso').length}</p>
        </div>
      </div>

      <div style={{ height: '300px' }}>
        <canvas id="stockAgeChart"></canvas>
      </div>
    </div>
  );
}

export default SemilleroDashboard;
