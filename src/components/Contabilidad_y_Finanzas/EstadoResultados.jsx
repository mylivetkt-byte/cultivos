import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';
import { Select } from 'antd';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const { Option } = Select;

const darkSelectStyles = `
  .dark-select .ant-select-selector {
    background-color: var(--card-bg) !important;
    border-color: var(--border) !important;
    color: var(--text) !important;
    height: 38px !important;
    padding-top: 3px !important;
    border-radius: 4px !important;
  }
  .dark-select .ant-select-selection-search-input {
    color: var(--text) !important;
    height: 36px !important;
  }
  .dark-select .ant-select-selection-item {
    color: var(--text) !important;
    line-height: 30px !important;
  }
  .dark-select .ant-select-arrow {
    color: var(--text-muted) !important;
  }
  .dark-select-dropdown {
    background-color: var(--card-bg) !important;
  }
  .dark-select-dropdown .ant-select-item {
    color: var(--text-muted) !important;
  }
  .dark-select-dropdown .ant-select-item-option-active,
  .dark-select-dropdown .ant-select-item-option-selected {
    background-color: var(--border) !important;
    color: var(--text) !important;
  }
`;

const EstadoResultados = ({ tenantId }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [modoTiempo, setModoTiempo] = useState('fechas'); // 'fechas' o 'lapsos'
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  
  const [idFinca, setIdFinca] = useState('');
  const [idLapsoInicio, setIdLapsoInicio] = useState('');
  const [idLapsoFin, setIdLapsoFin] = useState('');

  const [fincas, setFincas] = useState([]);
  const [lapsos, setLapsos] = useState([]);

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const resFincas = await authFetch(`/api/contabilidad/subempresas?tenantId=${tenantId || 1}`);
        const resLapsos = await authFetch(`/api/contabilidad/periodos?tenantId=${tenantId || 1}`);
        if (resFincas.ok) {
          const js = await resFincas.json();
          setFincas(js || []);
        }
        if (resLapsos.ok) {
          setLapsos(await resLapsos.json());
        }
      } catch (err) {
        console.error("Error cargando catálogos:", err);
      }
    };
    fetchCatalogs();
  }, [tenantId]);

  const fetchReporte = async () => {
    setLoading(true);
    setError(null);
    try {
      let queryParams = `tenantId=${tenantId || 1}`;
      if (idFinca) queryParams += `&id_finca=${idFinca}`;
      
      if (modoTiempo === 'fechas') {
        queryParams += `&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
      } else {
        if (!idLapsoInicio || !idLapsoFin) throw new Error("Debes seleccionar un lapso inicial y final");
        queryParams += `&id_periodo_inicio=${idLapsoInicio}&id_periodo_fin=${idLapsoFin}`;
      }

      const response = await authFetch(`/api/contabilidad/reportes/estado-resultados?${queryParams}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error al cargar el reporte');
      setData(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(amount);
  };

  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' };
  const inputStyle = { padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', width: '100%', height: '38px' };

  // Agrupación de datos
  const ingresos = data.filter(d => d.clase === '4');
  const gastos = data.filter(d => d.clase === '5');
  const costos = data.filter(d => d.clase === '6' || d.clase === '7');

  const calcTotal = (arr, factor = 1) => arr.reduce((acc, row) => acc + (parseFloat(row.total_credito) - parseFloat(row.total_debito)) * factor, 0);

  // Ingresos son naturaleza crédito (crédito - débito)
  const totalIngresos = calcTotal(ingresos, 1);
  // Gastos y costos son naturaleza débito (débito - crédito) => factor -1
  const totalGastos = calcTotal(gastos, -1);
  const totalCostos = calcTotal(costos, -1);
  
  const utilidadBruta = totalIngresos - totalCostos;
  const utilidadNeta = utilidadBruta - totalGastos;

  const renderSection = (title, items, isDebitNormal = false) => {
    if (items.length === 0) return null;
    return (
      <>
        <tr>
          <td colSpan="2" style={{ fontWeight: 'bold', padding: '12px 8px', background: 'var(--bg-main)', borderBottom: '1px solid #cbd5e1' }}>{title}</td>
        </tr>
        {items.map((item, idx) => {
          const debito = parseFloat(item.total_debito);
          const credito = parseFloat(item.total_credito);
          const saldo = isDebitNormal ? (debito - credito) : (credito - debito);
          return (
            <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px 8px 8px 24px' }}>{item.cuenta_codigo} - {item.cuenta_nombre}</td>
              <td style={{ textAlign: 'right', padding: '8px' }}>{formatCurrency(saldo)}</td>
            </tr>
          );
        })}
      </>
    );
  };

  const chartData = [
    { name: 'Ingresos Operacionales', value: totalIngresos > 0 ? totalIngresos : 0, color: '#10b981' },
    { name: 'Costos de Producción/Ventas', value: totalCostos > 0 ? totalCostos : 0, color: '#f59e0b' },
    { name: 'Gastos Operacionales', value: totalGastos > 0 ? totalGastos : 0, color: '#ef4444' }
  ].filter(item => item.value > 0);

  return (
    <div style={{ margin: '20px', background: 'var(--card-bg)', color: 'var(--text)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
      <style>{darkSelectStyles}</style>
      {/* HEADER NO IMPRIMIBLE */}
      <div className="no-print">
        <div style={{ background: 'linear-gradient(90deg, #1e293b 0%, #334155 100%)', padding: '24px', color: 'white', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
          <h2 style={{ margin: '0 0 8px 0' }}>📊 Estado de Resultados</h2>
          <p style={{ margin: 0, color: '#cbd5e1' }}>Reporte de Pérdidas y Ganancias</p>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={labelStyle}>Finca (Subempresa)</label>
                <Select
                  showSearch
                  optionFilterProp="children"
                  value={idFinca || undefined}
                  onChange={(val) => setIdFinca(val || '')}
                  className="w-full dark-select"
                  placeholder="-- Toda la Empresa --"
                  allowClear
                >
                  <Option value="">-- Toda la Empresa --</Option>
                  {fincas.map(f => (
                    <Option key={f.id_finca} value={f.id_finca}>{f.codigo} - {f.nombre}</Option>
                  ))}
                </Select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', background: 'var(--border)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)', height: '38px' }}>
                  <button onClick={() => setModoTiempo('fechas')} style={{ padding: '0 16px', height: '100%', border: 'none', background: modoTiempo === 'fechas' ? '#2563eb' : 'transparent', color: modoTiempo === 'fechas' ? 'white' : '#475569', fontWeight: 'bold', cursor: 'pointer' }}>📅 Fechas</button>
                  <button onClick={() => setModoTiempo('lapsos')} style={{ padding: '0 16px', height: '100%', border: 'none', background: modoTiempo === 'lapsos' ? '#2563eb' : 'transparent', color: modoTiempo === 'lapsos' ? 'white' : '#475569', fontWeight: 'bold', cursor: 'pointer' }}>⏱️ Lapsos</button>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {modoTiempo === 'fechas' ? (
                <>
                  <div><label style={labelStyle}>Desde</label><input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Hasta</label><input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} style={inputStyle} /></div>
                </>
              ) : (
                <>
                  <div style={{ width: '150px' }}>
                    <label style={labelStyle}>Lapso Inicial</label>
                    <Select
                      showSearch
                      optionFilterProp="children"
                      value={idLapsoInicio || undefined}
                      onChange={(val) => setIdLapsoInicio(val || '')}
                      className="w-full dark-select"
                      placeholder="-- Seleccionar --"
                    >
                      {lapsos.map(L => <Option key={L.id_periodo} value={L.id_periodo}>{L.ano}-{String(L.mes).padStart(2,'0')}</Option>)}
                    </Select>
                  </div>
                  <div style={{ width: '150px' }}>
                    <label style={labelStyle}>Lapso Final</label>
                    <Select
                      showSearch
                      optionFilterProp="children"
                      value={idLapsoFin || undefined}
                      onChange={(val) => setIdLapsoFin(val || '')}
                      className="w-full dark-select"
                      placeholder="-- Seleccionar --"
                    >
                      {lapsos.map(L => <Option key={L.id_periodo} value={L.id_periodo}>{L.ano}-{String(L.mes).padStart(2,'0')}</Option>)}
                    </Select>
                  </div>
                </>
              )}
              <button onClick={fetchReporte} style={{ background: '#22c55e', color: 'white', padding: '0 24px', height: '38px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginLeft: 'auto' }}>
                {loading ? 'Consultando...' : '▶ Generar Reporte'}
              </button>
              <button onClick={() => window.print()} style={{ background: '#3b82f6', color: 'white', padding: '0 24px', height: '38px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                🖨️ Imprimir
              </button>
            </div>
          </div>
          {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #fca5a5' }}>{error}</div>}
        </div>
      </div>

      {/* REPORTE IMPRIMIBLE */}
      <div className="printable-report" style={{ padding: '0 40px 40px 40px', background: 'var(--card-bg)', color: 'var(--text)' }}>
        
        {/* GRÁFICO VISUAL (Se oculta al imprimir por defecto, pero aporta UX interactiva) */}
        {data.length > 0 && chartData.length > 0 && (
          <div className="no-print" style={{ marginBottom: '30px', padding: '20px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-main)' }}>
            <h3 style={{ margin: '0 0 16px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Composición de Resultados</h3>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>ESTADO DE RESULTADOS INTEGRAL</h1>
          <h3 style={{ margin: 0, fontWeight: 'normal', color: 'var(--text-muted)' }}>
            {idFinca ? `Finca/Subempresa: ${fincas.find(f => f.id_finca.toString() === idFinca)?.nombre}` : 'Empresa Consolidada'}
          </h3>
          <p style={{ margin: '8px 0 0 0', color: 'var(--text-muted)' }}>
            {modoTiempo === 'fechas' ? `Desde ${fechaInicio} hasta ${fechaFin}` : `Lapso ${idLapsoInicio} a ${idLapsoFin}`}
          </p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <tbody>
            {renderSection('INGRESOS OPERACIONALES', ingresos, false)}
            <tr>
              <td style={{ padding: '12px 8px', fontWeight: 'bold', textAlign: 'right' }}>TOTAL INGRESOS</td>
              <td style={{ padding: '12px 8px', fontWeight: 'bold', textAlign: 'right', borderTop: '2px solid var(--border)' }}>{formatCurrency(totalIngresos)}</td>
            </tr>

            {renderSection('COSTOS DE VENTAS Y PRODUCCIÓN', costos, true)}
            <tr>
              <td style={{ padding: '12px 8px', fontWeight: 'bold', textAlign: 'right' }}>TOTAL COSTOS</td>
              <td style={{ padding: '12px 8px', fontWeight: 'bold', textAlign: 'right', borderTop: '2px solid var(--border)' }}>{formatCurrency(totalCostos)}</td>
            </tr>

            <tr style={{ background: 'var(--bg-main)' }}>
              <td style={{ padding: '16px 8px', fontWeight: 'bold', fontSize: '16px' }}>UTILIDAD BRUTA</td>
              <td style={{ padding: '16px 8px', fontWeight: 'bold', fontSize: '16px', textAlign: 'right' }}>{formatCurrency(utilidadBruta)}</td>
            </tr>

            {renderSection('GASTOS OPERACIONALES', gastos, true)}
            <tr>
              <td style={{ padding: '12px 8px', fontWeight: 'bold', textAlign: 'right' }}>TOTAL GASTOS</td>
              <td style={{ padding: '12px 8px', fontWeight: 'bold', textAlign: 'right', borderTop: '2px solid var(--border)' }}>{formatCurrency(totalGastos)}</td>
            </tr>

            <tr>
              <td style={{ padding: '20px 8px', fontWeight: 'bold', fontSize: '18px', color: utilidadNeta >= 0 ? '#16a34a' : '#dc2626' }}>UTILIDAD (PÉRDIDA) NETA DEL EJERCICIO</td>
              <td style={{ padding: '20px 8px', fontWeight: 'bold', fontSize: '18px', textAlign: 'right', color: utilidadNeta >= 0 ? '#16a34a' : '#dc2626', borderTop: '3px double var(--border)' }}>{formatCurrency(utilidadNeta)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-around' }}>
          <div style={{ textAlign: 'center', width: '250px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>Representante Legal</div>
          <div style={{ textAlign: 'center', width: '250px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>Contador Público</div>
        </div>
      </div>
    </div>
  );
};

export default EstadoResultados;
