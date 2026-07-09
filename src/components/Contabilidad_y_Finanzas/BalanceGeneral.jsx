import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

const BalanceGeneral = ({ tenantId }) => {
  const [dataBalance, setDataBalance] = useState([]);
  const [dataResultados, setDataResultados] = useState([]);
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

      // Hacemos ambas peticiones en paralelo
      const [resBalance, resResultados] = await Promise.all([
        authFetch(`/api/contabilidad/reportes/balance-general?${queryParams}`),
        authFetch(`/api/contabilidad/reportes/estado-resultados?${queryParams}`)
      ]);

      const jsBalance = await resBalance.json();
      const jsResultados = await resResultados.json();

      if (!resBalance.ok) throw new Error(jsBalance.error || 'Error cargando balance');
      
      setDataBalance(Array.isArray(jsBalance) ? jsBalance : []);
      setDataResultados(Array.isArray(jsResultados) ? jsResultados : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(amount);
  };

  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
  const inputStyle = { padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', width: '100%' };

  // CALCULAR UTILIDAD DEL EJERCICIO (desde estado de resultados)
  const ingresos = dataResultados.filter(d => d.clase === '4');
  const gastos = dataResultados.filter(d => d.clase === '5');
  const costos = dataResultados.filter(d => d.clase === '6' || d.clase === '7');

  const calcTotalRaw = (arr, factor = 1) => arr.reduce((acc, row) => acc + (parseFloat(row.total_credito) - parseFloat(row.total_debito)) * factor, 0);
  const totalIngresos = calcTotalRaw(ingresos, 1);
  const totalGastos = calcTotalRaw(gastos, -1);
  const totalCostos = calcTotalRaw(costos, -1);
  const utilidadNeta = totalIngresos - totalCostos - totalGastos;

  // AGRUPACIÓN DE BALANCE
  const activos = dataBalance.filter(d => d.clase === '1');
  const pasivos = dataBalance.filter(d => d.clase === '2');
  const patrimonio = dataBalance.filter(d => d.clase === '3');

  // Activos son naturaleza débito
  const totalActivos = calcTotalRaw(activos, -1); 
  // Pasivos y Patrimonio son naturaleza crédito
  const totalPasivos = calcTotalRaw(pasivos, 1);
  const totalPatrimonioCuentas = calcTotalRaw(patrimonio, 1);

  // El patrimonio real incluye la utilidad del ejercicio
  const totalPatrimonioReal = totalPatrimonioCuentas + utilidadNeta;
  const totalPasivoPatrimonio = totalPasivos + totalPatrimonioReal;

  const diferencia = Math.abs(totalActivos - totalPasivoPatrimonio);
  const estaCuadrado = diferencia < 0.1; // Margen de error por decimales

  const renderSection = (title, items, isDebitNormal = false) => {
    if (items.length === 0) return null;
    return (
      <>
        <tr>
          <td colSpan="2" style={{ fontWeight: 'bold', padding: '12px 8px', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>{title}</td>
        </tr>
        {items.map((item, idx) => {
          const debito = parseFloat(item.total_debito);
          const credito = parseFloat(item.total_credito);
          const saldo = isDebitNormal ? (debito - credito) : (credito - debito);
          // Ocultar cuentas en cero
          if (Math.abs(saldo) < 0.01) return null;
          return (
            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px 8px 8px 24px' }}>{item.cuenta_codigo} - {item.cuenta_nombre}</td>
              <td style={{ textAlign: 'right', padding: '8px' }}>{formatCurrency(saldo)}</td>
            </tr>
          );
        })}
      </>
    );
  };

  return (
    <div style={{ margin: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
      {/* HEADER NO IMPRIMIBLE */}
      <div className="no-print">
        <div style={{ background: 'linear-gradient(90deg, #1e293b 0%, #334155 100%)', padding: '24px', color: 'white' }}>
          <h2 style={{ margin: '0 0 8px 0' }}>⚖️ Estado de Situación Financiera</h2>
          <p style={{ margin: 0, color: '#cbd5e1' }}>Balance General Consolidado</p>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={labelStyle}>Finca (Subempresa)</label>
                <select value={idFinca} onChange={(e) => setIdFinca(e.target.value)} style={inputStyle}>
                  <option value="">-- Toda la Empresa --</option>
                  {fincas.map(f => (
                    <option key={f.id_finca} value={f.id_finca}>{f.codigo} - {f.nombre}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                  <button onClick={() => setModoTiempo('fechas')} style={{ padding: '8px 16px', border: 'none', background: modoTiempo === 'fechas' ? '#2563eb' : 'transparent', color: modoTiempo === 'fechas' ? 'white' : '#475569', fontWeight: 'bold', cursor: 'pointer' }}>📅 Fechas</button>
                  <button onClick={() => setModoTiempo('lapsos')} style={{ padding: '8px 16px', border: 'none', background: modoTiempo === 'lapsos' ? '#2563eb' : 'transparent', color: modoTiempo === 'lapsos' ? 'white' : '#475569', fontWeight: 'bold', cursor: 'pointer' }}>⏱️ Lapsos</button>
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
                  <div>
                    <label style={labelStyle}>Lapso Inicial</label>
                    <select value={idLapsoInicio} onChange={(e) => setIdLapsoInicio(e.target.value)} style={inputStyle}>
                      <option value="">-- Seleccionar --</option>
                      {lapsos.map(L => <option key={L.id_periodo} value={L.id_periodo}>{L.ano}-{String(L.mes).padStart(2,'0')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Lapso Final</label>
                    <select value={idLapsoFin} onChange={(e) => setIdLapsoFin(e.target.value)} style={inputStyle}>
                      <option value="">-- Seleccionar --</option>
                      {lapsos.map(L => <option key={L.id_periodo} value={L.id_periodo}>{L.ano}-{String(L.mes).padStart(2,'0')}</option>)}
                    </select>
                  </div>
                </>
              )}
              <button onClick={fetchReporte} style={{ background: '#22c55e', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginLeft: 'auto' }}>
                {loading ? 'Consultando...' : '▶ Generar Balance'}
              </button>
              <button onClick={() => window.print()} style={{ background: '#3b82f6', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                🖨️ Imprimir
              </button>
            </div>
          </div>
          {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #fca5a5' }}>{error}</div>}
          
          {dataBalance.length > 0 && !estaCuadrado && (
            <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #fca5a5', fontWeight: 'bold' }}>
              ⚠️ ADVERTENCIA: El balance no está cuadrado. Diferencia: {formatCurrency(diferencia)}. Verifica que todos los comprobantes estén balanceados.
            </div>
          )}
        </div>
      </div>

      {/* REPORTE IMPRIMIBLE */}
      <div className="printable-report" style={{ padding: '40px', background: 'white' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>ESTADO DE SITUACIÓN FINANCIERA</h1>
          <h3 style={{ margin: 0, fontWeight: 'normal', color: '#475569' }}>
            {idFinca ? `Finca/Subempresa: ${fincas.find(f => f.id_finca.toString() === idFinca)?.nombre}` : 'Empresa Consolidada'}
          </h3>
          <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
            {modoTiempo === 'fechas' ? `Al ${fechaFin}` : `Corte al lapso ${idLapsoFin}`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '40px' }}>
          {/* COLUMNA ACTIVO */}
          <div style={{ flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <tbody>
                {renderSection('ACTIVOS', activos, true)}
                <tr>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold', textAlign: 'right', fontSize: '16px' }}>TOTAL ACTIVO</td>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold', textAlign: 'right', fontSize: '16px', borderTop: '2px solid #334155' }}>{formatCurrency(totalActivos)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* COLUMNA PASIVO Y PATRIMONIO */}
          <div style={{ flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <tbody>
                {renderSection('PASIVOS', pasivos, false)}
                <tr>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold', textAlign: 'right', fontSize: '15px' }}>TOTAL PASIVO</td>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold', textAlign: 'right', fontSize: '15px', borderTop: '2px solid #334155' }}>{formatCurrency(totalPasivos)}</td>
                </tr>

                <tr><td colSpan="2" style={{ height: '20px' }}></td></tr>

                {renderSection('PATRIMONIO', patrimonio, false)}
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 8px 8px 24px' }}>3605 - Utilidad (Pérdida) del Ejercicio</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>{formatCurrency(utilidadNeta)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold', textAlign: 'right', fontSize: '15px' }}>TOTAL PATRIMONIO</td>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold', textAlign: 'right', fontSize: '15px', borderTop: '2px solid #334155' }}>{formatCurrency(totalPatrimonioReal)}</td>
                </tr>

                <tr><td colSpan="2" style={{ height: '30px' }}></td></tr>
                
                <tr>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold', textAlign: 'right', fontSize: '16px', color: '#1e293b' }}>TOTAL PASIVO + PATRIMONIO</td>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold', textAlign: 'right', fontSize: '16px', borderTop: '3px double #334155', color: '#1e293b' }}>{formatCurrency(totalPasivoPatrimonio)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-around' }}>
          <div style={{ textAlign: 'center', width: '250px', borderTop: '1px solid #334155', paddingTop: '8px' }}>Representante Legal</div>
          <div style={{ textAlign: 'center', width: '250px', borderTop: '1px solid #334155', paddingTop: '8px' }}>Contador Público</div>
        </div>
      </div>
    </div>
  );
};

export default BalanceGeneral;
