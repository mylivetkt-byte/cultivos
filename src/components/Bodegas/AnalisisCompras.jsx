import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { authFetch } from '../../utils/api';
import { customStyles } from '../PremiumSelect';

function AnalisisCompras({ tenantId }) {
  const [insumos, setInsumos] = useState([]);
  const [selectedInsumo, setSelectedInsumo] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Cargar insumos
    authFetch(`/api/table/insumos/data?tenantId=${tenantId}&pageSize=200`)
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          setInsumos(data.data.map(i => ({
            value: i.id_insumo,
            label: `${i.codigo} - ${i.nombre}`
          })));
        }
      })
      .catch(err => console.error(err));
  }, [tenantId]);

  const fetchAnalisis = async () => {
    if (!selectedInsumo) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/compras/analisis?id_tenant=${tenantId}&id_insumo=${selectedInsumo.value}`);
      const data = await res.json();
      if (data.success) {
        // Transform for chart
        const sorted = data.data.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        
        // Group by date to have multiple lines if needed, or just a simple timeline
        const chartData = sorted.map(d => ({
          fecha: new Date(d.fecha).toLocaleDateString(),
          precio: Number(d.precio_unitario),
          proveedor: d.proveedor,
          orden: d.numero_orden
        }));

        setHistorial(chartData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalisis();
  }, [selectedInsumo]);

  const selectStyles = {
    control: (base) => ({ ...base, background: 'var(--bg-color)', borderColor: 'var(--border)', color: 'var(--text)' }),
    singleValue: (base) => ({ ...base, color: 'var(--text)' }),
    input: (base) => ({ ...base, color: 'var(--text)' }),
    menu: (base) => ({ ...base, background: 'var(--bg-card)' }),
    option: (base, state) => ({ ...base, background: state.isFocused ? 'var(--primary)' : 'transparent', color: state.isFocused ? 'white' : 'var(--text)' })
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip" style={{ background: 'var(--bg-card)', padding: '10px', border: '1px solid #ccc', color: 'var(--text-primary)' }}>
          <p className="label" style={{ fontWeight: 'bold', margin: '0 0 5px 0' }}>{label}</p>
          <p style={{ margin: 0 }}><strong>Proveedor:</strong> {data.proveedor}</p>
          <p style={{ margin: 0 }}><strong>Orden:</strong> {data.orden}</p>
          <p style={{ margin: 0, color: '#0088FE', fontWeight: 'bold' }}>Precio: ${data.precio.toLocaleString('es-CO')}</p>
        </div>
      );
    }
    return null;
  };

  // Encontrar el mejor precio
  const bestPrice = historial.length > 0 ? historial.reduce((min, p) => p.precio < min.precio ? p : min, historial[0]) : null;

  return (
    <div className="module-container">
      <div className="module-header">
        <h1>📊 Análisis de Compras y Precios</h1>
        <p>Evalúa el historial de compras para encontrar a los proveedores con los mejores precios del mercado.</p>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="form-group" style={{ maxWidth: '500px' }}>
          <label>Buscar Insumo a Analizar</label>
          <Select 
            options={insumos} 
            value={selectedInsumo} 
            onChange={setSelectedInsumo} 
            placeholder="Seleccione un insumo..."
            styles={selectStyles}
          />
        </div>
      </div>

      {loading && <p>Cargando datos...</p>}

      {!loading && selectedInsumo && historial.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '18px', color: '#888' }}>No hay historial de compras para este insumo.</p>
        </div>
      )}

      {!loading && historial.length > 0 && (
        <>
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginBottom: '20px' }}>
            <div className="stat-card" style={{ borderLeft: '4px solid #00C49F' }}>
              <div className="stat-title">🏆 Mejor Precio Histórico</div>
              <div className="stat-value" style={{ color: '#00C49F' }}>${bestPrice.precio.toLocaleString('es-CO')}</div>
              <div style={{ marginTop: '10px', fontSize: '14px', color: '#888' }}>
                Ofrecido por: <strong>{bestPrice.proveedor}</strong> <br/>
                Fecha: {bestPrice.fecha}
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-title">Último Precio Comprado</div>
              <div className="stat-value">${historial[historial.length - 1].precio.toLocaleString('es-CO')}</div>
              <div style={{ marginTop: '10px', fontSize: '14px', color: '#888' }}>
                Proveedor: <strong>{historial[historial.length - 1].proveedor}</strong>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>📈 Tendencia de Precios en el Tiempo</h3>
            <div style={{ height: '400px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historial} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="fecha" stroke="#888" />
                  <YAxis stroke="#888" tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="precio" name="Precio Unitario ($)" stroke="#0088FE" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ marginTop: '20px' }}>
            <h3>📜 Historial Detallado de Compras</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Orden N°</th>
                  <th>Proveedor</th>
                  <th>Precio Unitario</th>
                </tr>
              </thead>
              <tbody>
                {historial.slice().reverse().map((h, i) => (
                  <tr key={i} style={h.precio === bestPrice.precio ? { background: 'rgba(0, 196, 159, 0.1)' } : {}}>
                    <td>{h.fecha}</td>
                    <td>{h.orden}</td>
                    <td>{h.proveedor} {h.precio === bestPrice.precio && '🏆'}</td>
                    <td style={{ fontWeight: h.precio === bestPrice.precio ? 'bold' : 'normal', color: h.precio === bestPrice.precio ? '#00C49F' : 'inherit' }}>
                      ${h.precio.toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default AnalisisCompras;
