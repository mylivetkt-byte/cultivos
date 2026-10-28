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
import { useAuth } from '../context/AuthContext';
import { getJsPDFConstructor, runAutoTable, downloadPdfDoc } from '../utils/exportPdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { downloadExcelWorkbook } from '../utils/exportExcel';

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

function GerenciaDashboard({ tenantId, fincaId, startDate, endDate }) {
  const [data, setData] = useState({
    timeline: null,
    salud: null,
    cosechas: null,
    abonos: null,
    siembras: null,
    ganado: null,
    acuicola: null,
    almacenes: null
  });
  const [loading, setLoading] = useState(true);
  const dashboardRef = React.useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const base = `${API_BASE}/dashboard-gerencia`;
      
      const queryParams = new URLSearchParams();
      if (tenantId) queryParams.append('tenantId', tenantId);
      if (fincaId) queryParams.append('fincaId', fincaId);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const tQ = `?${queryParams.toString()}`;

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
        const [timeline, salud, cosechas, abonos, siembras, ganado, acuicola, almacenes] = await Promise.all([
          safeFetch(`${base}/cultivos-timeline${tQ}`),
          safeFetch(`${base}/lotes-salud${tQ}`),
          safeFetch(`${base}/cosechas-ciclo${tQ}`),
          safeFetch(`${base}/abonos-produccion${tQ}`),
          safeFetch(`${base}/siembras-inventario${tQ}`),
          safeFetch(`${base}/ganado-stats${tQ}`),
          safeFetch(`${base}/acuicola-stats${tQ}`),
          safeFetch(`${base}/almacenes-valoracion${tQ}`)
        ]);

        setData({ timeline, salud, cosechas, abonos, siembras, ganado, acuicola, almacenes });
      } catch (err) {
        console.error('Error fetching gerencia stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tenantId, fincaId, startDate, endDate]);

  if (loading || !Array.isArray(data.salud) || data.salud.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando inteligencia de negocio...</div>;
  }

  const exportToPDF = async () => {
    if (!dashboardRef.current) return;
    try {
      const canvas = await html2canvas(dashboardRef.current, { scale: 2, useCORS: true, backgroundColor: '#0f172a' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new (getJsPDFConstructor())('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      // Fetch Logo
      let logoBase64 = null;
      try {
        const resPath = await fetch(`${API_BASE}/config/logo`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        if (resPath.ok) {
          const { logo_path } = await resPath.json();
          if (logo_path) {
            const imgUrl = logo_path.startsWith('http') ? logo_path : `${API_BASE.replace('/api', '')}${logo_path.startsWith('/') ? '' : '/'}${logo_path}`;
            const imgRes = await fetch(imgUrl);
            if (imgRes.ok) {
               const blob = await imgRes.blob();
               logoBase64 = await new Promise((resolve) => {
                 const reader = new FileReader();
                 reader.onloadend = () => resolve(reader.result);
                 reader.readAsDataURL(blob);
               });
            }
          }
        }
      } catch (e) {
        console.warn("Could not load logo", e);
      }

      let startX = 14;
      if (logoBase64) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const logoWidth = 25;
        const logoX = pageWidth - 14 - logoWidth;
        try { pdf.addImage(logoBase64, 'PNG', logoX, 15, logoWidth, 25); } catch(e) {
          try { pdf.addImage(logoBase64, 'JPEG', logoX, 15, logoWidth, 25); } catch(err) {}
        }
      }

      const rolStr = user?.rol ? ` (Rol: ${user.rol})` : '';
      pdf.setFontSize(16);
      pdf.text('AgroPaccioli', startX, 20);
      pdf.setFontSize(14);
      pdf.text('Reporte: Dashboard Alta Gerencia', startX, 26);
      pdf.setFontSize(10);
      pdf.text(`Finca Operativa: ${fincaId ? `Finca ID ${fincaId}` : 'Todas las Fincas'}`, startX, 32);
      pdf.text(`Generado por: ${user?.nombre || user?.username || 'Usuario del Sistema'}${rolStr}`, startX, 37);
      pdf.text(`Fecha y Hora: ${new Date().toLocaleString('es-ES')}`, startX, 42);

      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      // Draw dashboard image below the header
      pdf.addImage(imgData, 'PNG', 0, 50, pdfWidth, pdfHeight);
      downloadPdfDoc(pdf, 'Dashboard_Gerencia.pdf');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Hubo un error al exportar el PDF');
    }
  };

  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      const rolStr = user?.rol ? ` (Rol: ${user.rol})` : '';
      const headerRows = [
        ['Empresa: AgroPaccioli'],
        ['Reporte: Dashboard Alta Gerencia'],
        [`Finca Operativa: ${fincaId ? `Finca ID ${fincaId}` : 'Todas las Fincas'}`],
        [`Generado por: ${user?.nombre || user?.username || 'Usuario del Sistema'}${rolStr}`],
        [`Fecha y Hora: ${new Date().toLocaleString('es-ES')}`],
        []
      ];

      const addSheet = (dataList, name) => {
         const ws = XLSX.utils.aoa_to_sheet(headerRows);
         XLSX.utils.sheet_add_json(ws, dataList, { origin: 'A7' });
         XLSX.utils.book_append_sheet(wb, ws, name);
      };

      if (data.salud) addSheet(data.salud.map(s => ({ Categoría: s.name, Cantidad: s.value })), 'Salud Fitosanitaria');
      if (data.cosechas) addSheet(data.cosechas.map(c => ({ Mes: c.mes, 'Proyectado (kg)': c.proyectado_kg, 'Real (kg)': c.real_kg })), 'Cosechas');
      if (data.abonos) addSheet(data.abonos, 'Abonos Orgánicos');
      if (data.siembras) addSheet(data.siembras, 'Inventario Semillas');
      if (data.ganado && data.ganado.length > 0) addSheet(data.ganado.map(g => ({ Categoría: g.name, Cantidad: g.value })), 'Ganado');
      if (data.acuicola && data.acuicola.length > 0) addSheet(data.acuicola, 'Acuícola');
      if (data.almacenes && data.almacenes.length > 0) addSheet(data.almacenes, 'Almacenes Valoración');

      downloadExcelWorkbook(wb, 'Dashboard_Datos.xlsx');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Hubo un error al exportar Excel');
    }
  };

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
  const acuicolaList = Array.isArray(data.acuicola) ? data.acuicola : [];
  const totalBiomasaAcuicola = acuicolaList.reduce((acc, curr) => acc + (curr.biomasa_actual_kg || 0), 0);
  const chartAcuicola = {
    labels: acuicolaList.map(d => d.lago),
    datasets: [{
      label: 'Biomasa Actual (kg)',
      data: acuicolaList.map(d => d.biomasa_actual_kg),
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

  // 7. Almacenes Valoración (Bar)
  const almacenesList = Array.isArray(data.almacenes) ? data.almacenes : [];
  const totalValorAlmacen = almacenesList.reduce((acc, curr) => acc + (curr.valor_total || 0), 0);
  const chartAlmacenes = {
    labels: almacenesList.map(d => d.bodega),
    datasets: [{
      label: 'Valoración Actual ($)',
      data: almacenesList.map(d => d.valor_total),
      backgroundColor: '#10b981',
      borderRadius: 4
    }]
  };

  const optionsAlmacenes = {
    responsive: true,
    scales: {
      y: { grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { grid: { display: false } }
    }
  };

  return (
    <div style={{ marginTop: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '20px' }}>
        <button className="btn-action-base btn-excel" onClick={exportToExcel}>
          <span>📊</span> Exportar Excel
        </button>
        <button className="btn-action-base btn-pdf" onClick={exportToPDF}>
          <span>📄</span> Exportar PDF
        </button>
      </div>

      <div className="gerencia-dashboard" ref={dashboardRef} style={{ background: 'var(--bg-main)', padding: '20px', borderRadius: '16px' }}>
        
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', marginTop: '20px' }}>
        {/* Almacenes Valoración */}
        <div className="glass-card" style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>📦</span> Valorización de Almacenes e Inventario
            </h3>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', padding: '4px 12px', borderRadius: '20px', color: '#10b981', fontWeight: 'bold' }}>
              Total Valorizado: ${totalValorAlmacen.toLocaleString()}
            </div>
          </div>
          <div style={{ height: '220px' }}>
            {data.almacenes && data.almacenes.length > 0 ? (
              <Bar data={chartAlmacenes} options={optionsAlmacenes} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                No hay datos de almacenes
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
    </div>
  );
}

export default GerenciaDashboard;
