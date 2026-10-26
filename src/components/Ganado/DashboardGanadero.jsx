import React, { useState, useEffect } from 'react';
import DatePickerClaro from '../Common/DatePickerClaro';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  AreaChart, Area, LineChart, Line, ResponsiveContainer, ComposedChart 
} from 'recharts';
import { Modal, Button } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import { authFetch } from '../../utils/api';
import AsistenteGanaderoCampesino from './AsistenteGanaderoCampesino';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#ec4899', '#f59e0b', '#10b981'];

function DashboardGanadero({ fincaId: globalFincaId }) {
  const [showEscuelaGanadera, setShowEscuelaGanadera] = useState(false);
  const [data, setData] = useState({
    censo: { machos_ceba: 0, hembras_cria: 0, terneros: 0, total: 0 },
    demografia: { fincas: [], razas: [] },
    costos: [],
    salud: [],
    engorde: [],
    visitas: []
  });
  
  const [loading, setLoading] = useState(true);
  
  // Local Filters
  const [fincaId, setFincaId] = useState(globalFincaId || '');
  const [loteId, setLoteId] = useState('');
  const [razaId, setRazaId] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Options for filters
  const [fincas, setFincas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [razas, setRazas] = useState([]);

  // Load Filter Options
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [fRes, lRes, rRes] = await Promise.all([
          authFetch('/api/table/fincas/data?pageSize=100').then(r => r.json()),
          authFetch('/api/table/ganado_hatos/data?pageSize=100').then(r => r.json()),
          authFetch('/api/table/ganado_razas/data?pageSize=100').then(r => r.json())
        ]);
        setFincas(fRes.data || []);
        setLotes(lRes.data || []);
        setRazas(rRes.data || []);
      } catch (e) {
        console.error('Error loading filters:', e);
      }
    };
    loadFilters();
  }, []);

  // Sync global fincaId
  useEffect(() => {
    setFincaId(globalFincaId || '');
  }, [globalFincaId]);

  const fetchKPIs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (fincaId) query.append('id_finca', fincaId);
      if (loteId) query.append('id_hato', loteId);
      if (razaId) query.append('id_raza', razaId);
      if (fechaInicio) query.append('fecha_inicio', fechaInicio);
      if (fechaFin) query.append('fecha_fin', fechaFin);

      const res = await authFetch(`/api/ganado_avanzado/kpis?${query.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchKPIs();
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #334155', padding: '10px', borderRadius: '8px', color: '#fff' }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{label}</p>
          {payload.map((p, idx) => (
            <p key={idx} style={{ margin: 0, color: p.color }}>
              {p.name}: ${Number(p.value).toLocaleString('es-CO')}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-color)', minHeight: '100vh' }}>
      
      {/* Header & Filters */}
      <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ color: 'var(--primary)', margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📈 Inteligencia de Negocios Ganadera
          </h2>
          <Button
            type="primary"
            icon={<BookOutlined />}
            onClick={() => setShowEscuelaGanadera(true)}
            style={{
              background: '#059669',
              borderColor: '#10b981',
              fontWeight: 'bold',
              height: '38px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
            }}
          >
            🌾 Escuela Ganadera (Aforo, Cinta, Retiro)
          </Button>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Finca</label>
            <select value={fincaId} onChange={e => setFincaId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text)' }}>
              <option value="">-- Todas --</option>
              {fincas.map(f => <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>)}
            </select>
          </div>
          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Lote / Hato</label>
            <select value={loteId} onChange={e => setLoteId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text)' }}>
              <option value="">-- Todos --</option>
              {lotes.filter(l => !fincaId || String(l.id_finca) === String(fincaId)).map(l => <option key={l.id_hato} value={l.id_hato}>{l.nombre}</option>)}
            </select>
          </div>
          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Raza</label>
            <select value={razaId} onChange={e => setRazaId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text)' }}>
              <option value="">-- Todas --</option>
              {razas.map(r => <option key={r.id_raza} value={r.id_raza}>{r.nombre}</option>)}
            </select>
          </div>
          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Desde</label>
            <DatePickerClaro value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text)' }} />
          </div>
          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Hasta</label>
            <DatePickerClaro value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text)' }} />
          </div>
          <div style={{ flex: '1', minWidth: '150px', display: 'flex', alignItems: 'flex-end' }}>
            <button 
              onClick={fetchKPIs}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
              ⚡ Procesar Reporte
            </button>
          </div>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--primary)', fontSize: '18px', fontWeight: 'bold' }}>Cargando datos analíticos...</div>}

      {!loading && (
        <>
          {/* KPI Cards (Hero Section) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div style={{ padding: '20px', background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', color: 'white', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Machos Ceba</h4>
              <h2 style={{ margin: 0, fontSize: '36px', fontWeight: 'bold' }}>{data.censo?.machos_ceba || 0}</h2>
              <div style={{ fontSize: '12px', marginTop: '10px', opacity: 0.8 }}>{(data.censo?.total ? ((data.censo.machos_ceba / data.censo.total) * 100).toFixed(1) : 0)}% del rebaño</div>
            </div>
            
            <div style={{ padding: '20px', background: 'linear-gradient(135deg, #ec4899, #be185d)', color: 'white', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(236, 72, 153, 0.3)' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Hembras Cría</h4>
              <h2 style={{ margin: 0, fontSize: '36px', fontWeight: 'bold' }}>{data.censo?.hembras_cria || 0}</h2>
              <div style={{ fontSize: '12px', marginTop: '10px', opacity: 0.8 }}>{(data.censo?.total ? ((data.censo.hembras_cria / data.censo.total) * 100).toFixed(1) : 0)}% del rebaño</div>
            </div>

            <div style={{ padding: '20px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(245, 158, 11, 0.3)' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Terneros (Levante)</h4>
              <h2 style={{ margin: 0, fontSize: '36px', fontWeight: 'bold' }}>{data.censo?.terneros || 0}</h2>
              <div style={{ fontSize: '12px', marginTop: '10px', opacity: 0.8 }}>{(data.censo?.total ? ((data.censo.terneros / data.censo.total) * 100).toFixed(1) : 0)}% del rebaño</div>
            </div>

            <div style={{ padding: '20px', background: 'linear-gradient(135deg, #10b981, #047857)', color: 'white', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Inventario Total</h4>
              <h2 style={{ margin: 0, fontSize: '36px', fontWeight: 'bold' }}>{data.censo?.total || 0}</h2>
              <div style={{ fontSize: '12px', marginTop: '10px', opacity: 0.8 }}>Cabezas Activas</div>
            </div>
          </div>

          {/* Charts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '20px' }}>
            
            {/* 1. Demografia Razas (Pie Chart) */}
            <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text)' }}>🧬 Distribución por Razas</h3>
              <div style={{ height: '300px' }}>
                {data.demografia?.razas?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.demografia.razas} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value">
                        {data.demografia.razas.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Sin datos</div>
                )}
              </div>
            </div>

            {/* 2. Costos de Compra (Bar Chart) */}
            <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text)' }}>💰 Flujo Financiero (Compras, Ventas y Utilidad)</h3>
              <div style={{ height: '300px' }}>
                {data.costos?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.costos} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="mes" stroke="var(--text-muted)" />
                      <YAxis stroke="var(--text-muted)" tickFormatter={v => `$${v/1000}k`} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="compras" name="Compras" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="perdidas" name="Pérdidas (Muertes)" fill="#f97316" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="ventas" name="Ventas" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="utilidad" name="Utilidad Neta" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Sin datos en el periodo</div>
                )}
              </div>
            </div>

            {/* 3. Sanidad y Vacunacion (Area Chart) */}
            <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text)' }}>🩺 Tendencia Sanitaria y Preventiva</h3>
              <div style={{ height: '300px' }}>
                {data.salud?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.salud} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorEnf" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorVac" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="mes" stroke="var(--text-muted)" />
                      <YAxis stroke="var(--text-muted)" />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area type="monotone" dataKey="enfermedades" name="Eventos Enfermedad" stroke="#ef4444" fillOpacity={1} fill="url(#colorEnf)" strokeWidth={2} />
                      <Area type="monotone" dataKey="vacunas" name="Dosis Vacunación" stroke="#10b981" fillOpacity={1} fill="url(#colorVac)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Sin datos sanitarios</div>
                )}
              </div>
            </div>

            {/* 4. Engorde (Line Chart) */}
            <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text)' }}>⚖️ Promedio Engorde Mensual (g/día)</h3>
              <div style={{ height: '300px' }}>
                {data.engorde?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.engorde} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="mes" stroke="var(--text-muted)" />
                      <YAxis stroke="var(--text-muted)" />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="avg_ganancia" name="Promedio Ganancia (g/día)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Sin datos de pesaje</div>
                )}
              </div>
            </div>
            {/* 5. Visitas Técnicas (Bar Chart) */}
            <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text)' }}>📋 Visitas Técnicas por Ubicación (Año Actual)</h3>
              <div style={{ height: '300px' }}>
                {data.visitas?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.visitas} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="ubicacion" stroke="var(--text-muted)" tick={{fontSize: 10}} interval={0} angle={-15} textAnchor="end" height={60} />
                      <YAxis stroke="var(--text-muted)" />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar dataKey="cantidad" name="Visitas Realizadas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Sin visitas registradas</div>
                )}
              </div>
            </div>
            
          </div>
        </>
      )}

      {/* MODAL ESCUELA GANADERA */}
      <Modal
        open={showEscuelaGanadera}
        onCancel={() => setShowEscuelaGanadera(false)}
        footer={null}
        width={1040}
        destroyOnClose
        styles={{ body: { padding: '8px', background: '#0b1120' } }}
      >
        <AsistenteGanaderoCampesino 
          fincaId={fincaId} 
          onClose={() => setShowEscuelaGanadera(false)} 
        />
      </Modal>
    </div>
  );
}

export default DashboardGanadero;
