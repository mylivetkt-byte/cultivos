import React, { useState, useEffect } from 'react';
import DatePickerClaro from '../Common/DatePickerClaro';
import { authFetch } from '../../utils/api.js';
import { formatCurrency } from '../../utils/format';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { getJsPDFConstructor, runAutoTable, downloadPdfDoc } from '../../utils/exportPdf';

import * as XLSX from 'xlsx';
import { downloadExcelWorkbook } from '../../utils/exportExcel';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#06b6d4'];

export default function ViveroDashboard() {
  const [stats, setStats] = useState(null);
  const [filtrosCatalog, setFiltrosCatalog] = useState({ fincas: [], viveros: [], plantas: [] });
  
  // Filter States
  const [selectedFinca, setSelectedFinca] = useState('');
  const [selectedVivero, setSelectedVivero] = useState('');
  const [selectedPlanta, setSelectedPlanta] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch Filters Catalog
  useEffect(() => {
    authFetch('/api/semillero/filtros?tenantId=1')
      .then(res => res.json())
      .then(data => setFiltrosCatalog(data))
      .catch(err => console.error('Error fetching catalog:', err));
  }, []);

  const loadDashboard = () => {
    console.log('[ViveroDashboard] loadDashboard started');
    setLoading(true);
    const params = new URLSearchParams({ tenantId: 1 });
    if (selectedFinca) params.append('id_finca', selectedFinca);
    if (selectedVivero) params.append('id_vivero', selectedVivero);
    if (selectedPlanta) params.append('id_semilla', selectedPlanta);
    if (fechaInicio) params.append('fecha_inicio', fechaInicio);
    if (fechaFin) params.append('fecha_fin', fechaFin);

    console.log('[ViveroDashboard] Fetching:', `/api/semillero/dashboard?${params.toString()}`);
    authFetch(`/api/semillero/dashboard?${params.toString()}`)
      .then(res => {
        console.log('[ViveroDashboard] Response status:', res.status);
        if (!res.ok) throw new Error('Error al cargar dashboard del vivero');
        return res.json();
      })
      .then(data => {
        console.log('[ViveroDashboard] Data received:', data);
        setStats(data);
        console.log('[ViveroDashboard] Calling setLoading(false)');
        setLoading(false);
      })
      .catch(err => {
        console.error('[ViveroDashboard] Fetch error:', err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDashboard();
  }, [selectedFinca, selectedVivero, selectedPlanta]); // Auto-reload on select change. Date requires explicit button or just auto-reload.

  if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--primary)', fontSize: '18px', fontWeight: 'bold' }}>Cargando Inteligencia de Negocio del Vivero...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444', fontSize: '18px', fontWeight: 'bold' }}>Error: {error}</div>;

  // Process data for Recharts
  const pieData = stats.destinos.length 
    ? stats.destinos.map(d => ({ name: d.tipo, value: Number(d.total) }))
    : [{ name: 'Sin Movimientos', value: 1 }];

  const barData = stats.estadosCamadas.length 
    ? stats.estadosCamadas.map(e => ({ name: e.estado, cantidad: Number(e.cantidad) }))
    : [{ name: 'Sin Camadas', cantidad: 0 }];

  const doughnutData = stats.valorInventario.length 
    ? stats.valorInventario.map(v => ({ name: v.tipo, value: Number(v.valor_total) }))
    : [{ name: 'Sin Inventario', value: 1 }];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #334155', padding: '10px', borderRadius: '8px', color: '#fff' }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{label || payload[0].name}</p>
          {payload.map((p, idx) => (
            <p key={idx} style={{ margin: 0, color: p.color || p.fill }}>
              Valor: {p.name.includes('Valor') || payload[0].name?.includes('Insumo') ? `$${Number(p.value).toLocaleString('es-CO')}` : p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const exportToPDF = () => {
    const doc = new (getJsPDFConstructor())();
    const fincaName = filtrosCatalog.fincas.find(f => f.id_finca == selectedFinca)?.nombre || 'Todas las Fincas';
    const viveroName = filtrosCatalog.viveros.find(v => v.id_vivero == selectedVivero)?.nombre || 'Todos los Viveros';

    doc.setFontSize(18);
    doc.text('AgroPaccioli - Reporte Gerencial de Viveros', 14, 20);
    doc.setFontSize(11);
    doc.text(`Finca: ${fincaName} | Vivero: ${viveroName}`, 14, 28);
    if (fechaInicio && fechaFin) doc.text(`Periodo: ${fechaInicio} a ${fechaFin}`, 14, 34);

    runAutoTable(doc, {
      startY: 40,
      head: [['Insumo/Semilla', 'Tipo', 'Existencia', 'Consumido', 'Valor Total Inmovilizado']],
      body: (stats.kardex || []).map(k => [
        k.nombre, k.tipo, k.existencia, k.consumo, `$${k.valor_total.toLocaleString()}`
      ]),
      theme: 'grid',
      styles: { fontSize: 9 }
    });

    downloadPdfDoc(doc, `Reporte_Vivero_${new Date().getTime()}.pdf`);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const kardexSheet = XLSX.utils.json_to_sheet(stats.kardex || []);
    XLSX.utils.book_append_sheet(wb, kardexSheet, "Inventario y Consumos");
    
    const camadasSheet = XLSX.utils.json_to_sheet(stats.camadasTimeline || []);
    XLSX.utils.book_append_sheet(wb, camadasSheet, "Desarrollo Camadas");

    downloadExcelWorkbook(wb, `Reporte_Vivero_${new Date().getTime()}.xlsx`);
  };

  if (!stats) return null;

  const destinosList = Array.isArray(stats.destinos) ? stats.destinos : [];
  const kardexList = Array.isArray(stats.kardex) ? stats.kardex : [];
  const totalSembrado = destinosList.find(d => d.tipo === 'Salida_Siembra')?.total || 0;
  const totalVendido = destinosList.find(d => d.tipo === 'Venta')?.total || 0;
  const totalBajas = destinosList.find(d => d.tipo === 'Baja_Enfermedad')?.total || 0;
  const totalInsumos = kardexList.reduce((sum, item) => sum + Number(item.valor_total || 0), 0);

  return (
    <div className="p-4 dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-color)', minHeight: '100vh' }}>
      
      {/* Header & Export */}
      <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', margin: '0 0 5px 0', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🌱 Inteligencia Gerencial Vivero & Semillero
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>Estadísticas y valorización del ciclo de propagación de cultivos.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-action-base btn-excel" onClick={exportToExcel}>📄 Excel</button>
          <button className="btn-action-base btn-pdf" onClick={exportToPDF}>🖨️ PDF</button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: 'var(--card-bg)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '5px' }}>Finca</label>
          <select value={selectedFinca} onChange={e => { setSelectedFinca(e.target.value); setSelectedVivero(''); }} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text)' }}>
            <option value="">-- Todas las Fincas --</option>
            {filtrosCatalog.fincas.map(f => <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>)}
          </select>
        </div>
        
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '5px' }}>Vivero Físico</label>
          <select value={selectedVivero} onChange={e => setSelectedVivero(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text)' }}>
            <option value="">-- Todos los Viveros --</option>
            {filtrosCatalog.viveros.filter(v => !selectedFinca || v.id_finca == selectedFinca).map(v => 
              <option key={v.id_vivero} value={v.id_vivero}>{v.nombre}</option>
            )}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '5px' }}>Semilla / Planta</label>
          <select value={selectedPlanta} onChange={e => setSelectedPlanta(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text)' }}>
            <option value="">-- Todas --</option>
            {filtrosCatalog.plantas.map(p => <option key={p.id_item} value={p.id_item}>{p.nombre}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '130px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '5px' }}>Desde</label>
          <DatePickerClaro value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text)' }} />
        </div>

        <div style={{ flex: 1, minWidth: '130px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '5px' }}>Hasta</label>
          <DatePickerClaro value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text)' }} />
        </div>

        <button onClick={loadDashboard} style={{ padding: '8px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', height: '37px', fontWeight: 'bold' }}>
          Filtrar
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div style={{ padding: '20px', background: 'linear-gradient(135deg, #10b981, #047857)', color: 'white', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Total Sembrado</h4>
          <h2 style={{ margin: 0, fontSize: '36px', fontWeight: 'bold' }}>{totalSembrado}</h2>
          <div style={{ fontSize: '12px', marginTop: '10px', opacity: 0.8 }}>Plántulas enviadas a campo</div>
        </div>
        
        <div style={{ padding: '20px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: 'white', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Total Vendido</h4>
          <h2 style={{ margin: 0, fontSize: '36px', fontWeight: 'bold' }}>{totalVendido}</h2>
          <div style={{ fontSize: '12px', marginTop: '10px', opacity: 0.8 }}>Ventas a terceros</div>
        </div>

        <div style={{ padding: '20px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: 'white', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Bajas / Enfermedad</h4>
          <h2 style={{ margin: 0, fontSize: '36px', fontWeight: 'bold' }}>{totalBajas}</h2>
          <div style={{ fontSize: '12px', marginTop: '10px', opacity: 0.8 }}>Pérdidas operativas</div>
        </div>

        <div style={{ padding: '20px', background: 'linear-gradient(135deg, #a855f7, #7e22ce)', color: 'white', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(168, 85, 247, 0.3)' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Insumos Disponibles</h4>
          <h2 style={{ margin: 0, fontSize: '36px', fontWeight: 'bold' }}>{formatCurrency(totalInsumos)}</h2>
          <div style={{ fontSize: '12px', marginTop: '10px', opacity: 0.8 }}>Capital inmovilizado</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        
        {/* Card 1: Distribución de Destinos */}
        <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text)' }}>📊 Destino de Plántulas Histórico</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={0} outerRadius={100} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '15px', textAlign: 'center' }}>Proporción de salidas por concepto de siembra, ventas o bajas.</p>
        </div>

        {/* Card 2: Valorización de Inventario */}
        <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text)' }}>💰 Valorización de Inventario</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={doughnutData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {doughnutData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '15px', textAlign: 'center' }}>Capital inmovilizado en el vivero agrupado por tipo de insumo.</p>
        </div>

        {/* Card 3: Estado Actual de Camadas */}
        <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', gridColumn: '1 / -1' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text)' }}>📈 Crecimiento Biológico (Pipeline de Camadas)</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="cantidad" name="Plántulas Vivas" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '15px', textAlign: 'center' }}>Clasificación dinámica calculada según fecha de siembra y curva teórica de la semilla.</p>
        </div>

        {/* Card 4: Kardex - Inventario vs Consumo */}
        <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', gridColumn: '1 / -1', overflowX: 'auto' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text)' }}>📦 Inventario de Insumos y Herramientas (Kardex)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-color)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px' }}>Artículo</th>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px' }}>Tipo</th>
                <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>En Existencia</th>
                <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>Sembrado/Consumido</th>
                <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>Resiembra (Reemplazo)</th>
                <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>Mortalidad Vivero</th>
                <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>Capital Inmovilizado</th>
              </tr>
            </thead>
            <tbody>
              {(stats.kardex || []).length === 0 ? (
                <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay inventario en este vivero</td></tr>
              ) : stats.kardex.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', fontSize: '13px' }}>{item.nombre}</td>
                  <td style={{ padding: '10px', fontSize: '13px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#334155', fontSize: '11px' }}>{item.tipo}</span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: item.existencia > 0 ? '#10b981' : '#ef4444' }}>{item.existencia}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#3b82f6' }}>{item.consumo + item.siembra}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#f59e0b' }}>{item.resiembra}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#ef4444' }}>{item.mortalidad}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>{formatCurrency(item.valor_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card 5: Trazabilidad de Lotes */}
        <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', gridColumn: '1 / -1', overflowX: 'auto' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text)' }}>🗺️ Trazabilidad de Siembra y Resiembra en Lotes Agrícolas</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-color)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px' }}>Lote Destino</th>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px' }}>Planta / Semilla</th>
                <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>Siembra Nueva</th>
                <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>Resiembra (Mortalidad Lote)</th>
                <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px' }}>Total Enviado</th>
              </tr>
            </thead>
            <tbody>
              {(stats.siembrasPorLote || []).length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay registros de salidas hacia lotes agrícolas en este periodo</td></tr>
              ) : stats.siembrasPorLote.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', fontSize: '13px', fontWeight: 'bold', color: 'var(--primary)' }}>{item.lote}</td>
                  <td style={{ padding: '10px', fontSize: '13px' }}>{item.planta}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#10b981' }}>{item.siembra}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#f59e0b' }}>{item.resiembra}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold' }}>{item.siembra + item.resiembra}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
