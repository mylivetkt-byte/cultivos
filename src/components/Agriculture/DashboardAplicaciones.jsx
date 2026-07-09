import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import PremiumSelect from '../PremiumSelect';
import { authFetch } from '../../utils/api.js';
import '../dashboard.css';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

const DashboardAplicaciones = ({ tenantId = 1 }) => {
  const [schedules, setSchedules] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    lote: '',
    empleado: '',
    fecha_desde: '',
    fecha_hasta: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [resProg, resLote, resEmp] = await Promise.all([
        authFetch(`/api/applications/schedule?tenantId=${tenantId}`),
        authFetch(`/api/table/lotes/data?tenantId=${tenantId}`),
        authFetch(`/api/table/rrhh_empleados/data?tenantId=${tenantId}`)
      ]);
      
      if (resProg.ok) {
        const data = await resProg.json();
        setSchedules(data);
      }
      if (resLote.ok) {
        const lData = await resLote.json();
        setLotes(lData.data || []);
      }
      if (resEmp.ok) {
        const eData = await resEmp.json();
        setEmpleados(eData.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = () => {
    let result = schedules;
    if (filters.lote) result = result.filter(s => (s.lote_nombre || '').toLowerCase().includes(filters.lote.toLowerCase()));
    if (filters.empleado) result = result.filter(s => (s.responsable_aplicacion || '').toLowerCase().includes(filters.empleado.toLowerCase()));
    if (filters.fecha_desde) result = result.filter(s => new Date(s.fecha_programada) >= new Date(filters.fecha_desde));
    if (filters.fecha_hasta) result = result.filter(s => new Date(s.fecha_programada) <= new Date(filters.fecha_hasta));
    setFiltered(result);
  };

  if (loading) return <div className="loading">Cargando Tablero de Control y Costos...</div>;

  // ANALYTICS LOGIC
  const completadas = filtered.filter(s => s.estado === 'Completada');
  const pendientes = filtered.length - completadas.length;
  
  let costoTotal = 0;
  
  // Group costs by Month (MoM / YoY Comparative)
  const costByMonth = {};
  const costByLote = {};

  completadas.forEach(s => {
    // Sum costs for this schedule
    let scheduleCost = 0;
    if (s.insumos && s.insumos.length > 0) {
      s.insumos.forEach(ins => {
        scheduleCost += parseFloat(ins.costo_total || 0);
      });
    }
    costoTotal += scheduleCost;

    // By Month
    const date = new Date(s.fecha_ejecucion || s.fecha_programada);
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    costByMonth[monthYear] = (costByMonth[monthYear] || 0) + scheduleCost;

    // By Lote
    const loteName = `${s.finca_nombre} - ${s.lote_nombre}`;
    costByLote[loteName] = (costByLote[loteName] || 0) + scheduleCost;
  });

  // Prepare Recharts Data
  const monthData = Object.keys(costByMonth).sort().map(k => ({
    name: k,
    Costo: parseFloat(costByMonth[k].toFixed(2))
  }));

  const loteData = Object.keys(costByLote).sort((a,b) => costByLote[b] - costByLote[a]).slice(0, 10).map(k => ({
    name: k,
    Costo: parseFloat(costByLote[k].toFixed(2))
  }));

  const statusData = [
    { name: 'Completadas', value: completadas.length },
    { name: 'Pendientes/En Proceso', value: pendientes }
  ].filter(d => d.value > 0);

  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Tablero de Control y Costos (Aplicaciones)</h1>
        <p style={{ color: 'var(--text-muted)' }}>Métricas Gerenciales, Evolución de Gasto y Auditoría de Costos</p>
      </div>

      <div className="card" style={{ marginBottom: '25px', padding: '0', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2em' }}>🔍</span>
          <h4 style={{ margin: 0, color: '#60A5FA' }}>Buscador Maestro de Auditoría y Control Financiero</h4>
        </div>
        
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', background: 'rgba(0,0,0,0.15)' }}>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Lote / Potrero</label>
            <PremiumSelect
              options={lotes.map(l => ({ value: l.nombre, label: l.nombre }))}
              value={filters.lote}
              onChange={e => setFilters({...filters, lote: e.target.value})}
              placeholder="-- Todos los Lotes --"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Agrónomo / Responsable</label>
            <PremiumSelect
              options={empleados.map(e => ({ value: e.nombres, label: e.nombres }))}
              value={filters.empleado}
              onChange={e => setFilters({...filters, empleado: e.target.value})}
              placeholder="-- Todos los Empleados --"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Fecha Desde</label>
            <input type="date" className="form-control" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px', fontSize: '1rem', borderRadius: '6px' }} value={filters.fecha_desde} onChange={e => setFilters({...filters, fecha_desde: e.target.value})} />
          </div>
          <div>
            <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Fecha Hasta</label>
            <input type="date" className="form-control" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px', fontSize: '1rem', borderRadius: '6px' }} value={filters.fecha_hasta} onChange={e => setFilters({...filters, fecha_hasta: e.target.value})} />
          </div>
        </div>
        
        <div style={{ padding: '15px 20px', background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleProcess} style={{ padding: '10px 25px', fontSize: '1.05em', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            ⚙️ Procesar Consulta
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3 style={{ color: 'var(--text-muted)' }}>Presione 'Procesar Consulta' para visualizar los KPIs gerenciales.</h3>
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div className="card" style={{ textAlign: 'center', padding: '20px', borderTop: '4px solid #EF4444' }}>
              <h2 style={{ fontSize: '2em', margin: '0 0 10px 0', color: '#EF4444' }}>{formatCurrency(costoTotal)}</h2>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Gasto Total en Insumos</p>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '20px', borderTop: '4px solid #3B82F6' }}>
              <h2 style={{ fontSize: '2em', margin: '0 0 10px 0', color: '#3B82F6' }}>{completadas.length > 0 ? formatCurrency(costoTotal / completadas.length) : '$0'}</h2>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Costo Promedio por Aplicación</p>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '20px', borderTop: '4px solid #10B981' }}>
              <h2 style={{ fontSize: '2em', margin: '0 0 10px 0', color: '#10B981' }}>{filtered.length}</h2>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Labores Procesadas ({completadas.length} Completadas)</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* Line Chart MoM */}
            <div className="card">
              <h3 style={{ marginBottom: '15px' }}>Evolución de Costos (Comparativo Mes a Mes)</h3>
              <div style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }} />
                    <Legend />
                    <Line type="monotone" dataKey="Costo" stroke="#EF4444" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="card">
              <h3 style={{ marginBottom: '15px' }}>Estado Operativo Global</h3>
              <div style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value" label>
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bar Chart Lotes */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '15px' }}>Top 10 Lotes con Mayor Gasto (Distribución de Inversión)</h3>
            <div style={{ height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={loteData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Legend />
                  <Bar dataKey="Costo" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Data Table Log */}
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ margin: 0, color: '#10B981' }}>Registros Individuales Consolidados</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha Prog. / Ejec.</th>
                  <th>Finca - Lote</th>
                  <th>Receta</th>
                  <th>Agrónomo Responsable</th>
                  <th>Estado</th>
                  <th>Costo Estimado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  let rowCost = 0;
                  if (s.insumos) s.insumos.forEach(i => rowCost += parseFloat(i.costo_total || 0));
                  return (
                    <tr key={s.id_programacion}>
                      <td><strong>PROG-{s.id_programacion}</strong></td>
                      <td>{s.fecha_ejecucion ? new Date(s.fecha_ejecucion).toLocaleDateString() : new Date(s.fecha_programada).toLocaleDateString()}</td>
                      <td>{s.finca_nombre} - {s.lote_nombre}</td>
                      <td>{s.nombre_receta}</td>
                      <td>{s.responsable_aplicacion}</td>
                      <td>
                        <span style={{ 
                          background: s.estado === 'Completada' ? '#10B981' : s.estado === 'Cancelada' ? '#EF4444' : '#F59E0B', 
                          padding: '4px 8px', borderRadius: '12px', fontSize: '0.85em', color: '#fff' 
                        }}>
                          {s.estado}
                        </span>
                      </td>
                      <td style={{ color: rowCost > 0 ? '#10B981' : 'inherit', fontWeight: rowCost > 0 ? 'bold' : 'normal' }}>
                        {formatCurrency(rowCost)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardAplicaciones;
