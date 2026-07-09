import React, { useState, useEffect } from 'react';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { fetchComercialStats } from '../../utils/api';
import './comercial.css';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ComercialDashboard({ tenantId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchComercialStats({ tenantId })
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [tenantId]);

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text)' }}>Cargando mercados...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  if (!stats) return null;

  const totalUSD = Number(stats.kpis.totalVentasUSD || 0);
  const trm = Number(stats.kpis.trmActual || 0);
  const totalCOP = totalUSD * trm;

  return (
    <div className="comercial-dashboard animate-fade-in">
      
      <div className="dashboard-header-premium">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Inteligencia Comercial y Mercados
          </h1>
          <p className="text-slate-500 mt-2">Plataforma de Trading Agroindustrial - Nivel LATAM</p>
        </div>
        <div className="live-indicators">
          <div className="live-badge">
            <span className="pulse-dot"></span> Mercado Abierto
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-grid-premium">
        <div className="kpi-card-glass">
          <div className="kpi-icon-wrap" style={{ color: '#10b981' }}>💵</div>
          <div className="kpi-data">
            <p className="kpi-title">Ingresos Brutos (YTD)</p>
            <h3 className="kpi-value text-green-600">
              ${(totalUSD / 1000000).toFixed(2)} <span className="kpi-unit">M USD</span>
            </h3>
            <p className="kpi-subtitle">≈ ${(totalCOP / 1000000000).toFixed(2)} Mil Millones COP</p>
          </div>
        </div>

        <div className="kpi-card-glass">
          <div className="kpi-icon-wrap" style={{ color: '#f59e0b' }}>📈</div>
          <div className="kpi-data">
            <p className="kpi-title">TRM Actual (Dólar)</p>
            <h3 className="kpi-value text-amber-600">
              ${trm.toLocaleString('es-CO')} <span className="kpi-unit">COP</span>
            </h3>
            <p className="kpi-subtitle">Tasa Representativa de Mercado</p>
          </div>
        </div>

        <div className="kpi-card-glass">
          <div className="kpi-icon-wrap" style={{ color: '#3b82f6' }}>🚢</div>
          <div className="kpi-data">
            <p className="kpi-title">Volumen Negociado</p>
            <h3 className="kpi-value text-blue-600">
              {Number(stats.kpis.volumenTotal).toLocaleString('es-CO', { maximumFractionDigits: 0 })} <span className="kpi-unit">Ton</span>
            </h3>
            <p className="kpi-subtitle">Aceite, RFF, PKO y Abonos</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Main Chart: Market Prices */}
        <div className="lg:col-span-2 chart-card-glass">
          <h3 className="chart-title">Comportamiento de Precios Internacionales vs Ventas (USD)</h3>
          <p className="chart-subtitle">Análisis comparativo de los últimos 6 meses</p>
          <div className="chart-container" style={{ height: '400px', marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stats.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: '#0f172a' }}
                />
                <Legend wrapperStyle={{ paddingTop: '15px' }} />
                <Area type="monotone" dataKey="mercado" name="Precio Prom. Mercado (USD)" fill="url(#colorMercado)" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="venta" name="Nuestra Venta (USD)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }} activeDot={{ r: 6 }} />
                
                <defs>
                  <linearGradient id="colorMercado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Buyers */}
        <div className="chart-card-glass">
          <h3 className="chart-title">Top Compradores Corporativos</h3>
          <p className="chart-subtitle">Por volumen facturado (USD)</p>
          <div className="buyer-list">
            {stats.topCompradores.map((comp, idx) => (
              <div key={comp.nombre} className="buyer-item">
                <div className="buyer-rank">{idx + 1}</div>
                <div className="buyer-info">
                  <h4>{comp.nombre}</h4>
                  <p>{Number(comp.total_volumen).toLocaleString('es-CO', { maximumFractionDigits: 0 })} Ton compradas</p>
                </div>
                <div className="buyer-value">
                  ${(Number(comp.total_compras) / 1000000).toFixed(2)}M
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transporters & Market Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        <div className="chart-card-glass">
          <h3 className="chart-title">Operadores Logísticos y Navieras</h3>
          <p className="chart-subtitle">Volumen de carga asignada por operador (Ton)</p>
          <div className="chart-container" style={{ height: '300px', marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.topTransportadoras}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="total_transportado"
                  nameKey="nombre"
                  label={({nombre, percent}) => `${nombre.substring(0,10)}... ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.topTransportadoras.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                  formatter={(value) => `${Number(value).toLocaleString('es-CO')} Ton`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card-glass flex flex-col justify-center">
          <div className="premium-alert-box mb-4">
            <div className="alert-icon">🌱</div>
            <div className="alert-content">
              <h4>Ventaja Competitiva de Exportación</h4>
              <p>Nuestras ventas de Aceite de Palmiste (PKO) y CPO cuentan con certificaciones internacionales ISCC/RSPO, permitiendo exportar a Europa y Estados Unidos con primas preferenciales.</p>
            </div>
          </div>
          <div className="premium-alert-box bg-slate-800 border-slate-700">
            <div className="alert-icon">✈️</div>
            <div className="alert-content">
              <h4>Diversificación Logística</h4>
              <p>Integramos modalidades terrestres, fluviales, marítimas y aéreas, garantizando el suministro continuo de Fruto Fresco, Harina y Subproductos a la refinería y puertos del país.</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
