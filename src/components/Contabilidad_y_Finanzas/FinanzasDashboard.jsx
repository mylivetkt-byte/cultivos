import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { authFetch } from '../../utils/api';

function FinanzasDashboard({ tenantId = 1 }) {
  const [data, setData] = useState({
    flujoMensual: [],
    gastosCategorias: [],
    resumen: { plataGastada: 0, plataEnterrada: 0, ventasReales: 0, proyeccionCosecha: 0 }
  });

  const [filters, setFilters] = useState({
    fechaDesde: '',
    fechaHasta: '',
    id_finca: '',
    id_lote: '',
    lapso: '',
    cosecha: ''
  });

  const loadData = () => {
    const params = new URLSearchParams({ tenantId, anio: new Date().getFullYear() });
    Object.keys(filters).forEach(k => {
      if (filters[k]) params.append(k, filters[k]);
    });
    
    authFetch(`/api/finanzas-agro/dashboard?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('Error cargando dashboard');
        return res.json();
      })
      .then(setData)
      .catch(err => console.error(err));
  };

  useEffect(() => {
    loadData();
  }, [tenantId, filters]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#64748b'];

  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);

  const exportExcel = () => { alert('Exportando a Excel...'); };
  const exportPDF = () => { alert('Generando PDF...'); };
  const shareWhatsApp = () => { 
    const msg = `*Resumen Financiero*\nGastado: ${formatCurrency(data.resumen.plataGastada)}\nInvertido: ${formatCurrency(data.resumen.plataEnterrada)}\nVentas: ${formatCurrency(data.resumen.ventasReales)}\nProyección: ${formatCurrency(data.resumen.proyeccionCosecha)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="p-4 dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--primary)', margin: 0 }}>📊 Bolsillo del Productor</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportExcel} style={{ background: '#10b981', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📊 Excel</button>
          <button onClick={exportPDF} style={{ background: '#ef4444', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📄 PDF</button>
          <button onClick={shareWhatsApp} style={{ background: '#25D366', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>💬 WhatsApp</button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ display: 'flex', gap: '15px', padding: '15px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Finca / Subempresa</label>
          <select name="id_finca" value={filters.id_finca} onChange={handleFilterChange} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
            <option value="">-- Todas las Fincas --</option>
            <option value="1">Finca La Esperanza</option>
            <option value="2">Hacienda El Sol</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Lote / Vivero</label>
          <select name="id_lote" value={filters.id_lote} onChange={handleFilterChange} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
            <option value="">-- Todos los Lotes --</option>
            <option value="1">Lote Norte 1</option>
            <option value="2">Vivero Central</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Lapso Contable</label>
          <select name="lapso" value={filters.lapso} onChange={handleFilterChange} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
            <option value="">-- Año Actual --</option>
            <option value="2026-05">Mayo 2026</option>
            <option value="2026-04">Abril 2026</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Desde</label>
          <input type="date" name="fechaDesde" value={filters.fechaDesde} onChange={handleFilterChange} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hasta</label>
          <input type="date" name="fechaHasta" value={filters.fechaHasta} onChange={handleFilterChange} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <button onClick={loadData} style={{ background: 'var(--primary)', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Procesar</button>
        </div>
      </div>

      {/* 4 KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderLeft: '5px solid #ef4444', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase' }}>💸 Plata Gastada</h4>
          <h2 style={{ color: '#ef4444', margin: 0 }}>{formatCurrency(data.resumen.plataGastada)}</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '5px 0 0 0' }}>Costos pagados e insumos</p>
        </div>
        <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderLeft: '5px solid #f59e0b', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase' }}>🌱 Plata Enterrada</h4>
          <h2 style={{ color: '#f59e0b', margin: 0 }}>{formatCurrency(data.resumen.plataEnterrada)}</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '5px 0 0 0' }}>Inversión en cultivos activos</p>
        </div>
        <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderLeft: '5px solid #10b981', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase' }}>💰 Ventas Reales</h4>
          <h2 style={{ color: '#10b981', margin: 0 }}>{formatCurrency(data.resumen.ventasReales)}</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '5px 0 0 0' }}>Ingresos por comercialización</p>
        </div>
        <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderLeft: '5px solid #8b5cf6', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase' }}>🔮 Proyección de Cosecha</h4>
          <h2 style={{ color: '#8b5cf6', margin: 0 }}>{formatCurrency(data.resumen.proyeccionCosecha)}</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '5px 0 0 0' }}>Ingreso esperado ciclo actual</p>
        </div>
      </div>

      {/* CHARTS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--text)' }}>Ventas vs Gastos (Mensual)</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={data.flujoMensual} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="periodo" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }} />
                <Legend />
                <Bar dataKey="ingresos" name="Ventas" fill="#10b981" />
                <Bar dataKey="egresos" name="Gastos" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--text)' }}>¿En qué se gasta la plata?</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.gastosCategorias}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.gastosCategorias.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinanzasDashboard;
