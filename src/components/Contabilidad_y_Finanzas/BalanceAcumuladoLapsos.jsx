import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

const BalanceAcumuladoLapsos = ({ tenantId }) => {
  const [data, setData] = useState([]);
  const [catalogoCuentas, setCatalogoCuentas] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [fincas, setFincas] = useState([]);
  const [lapsos, setLapsos] = useState([]);
  const [centrosCosto, setCentrosCosto] = useState([]);

  const [idLapsoInicio, setIdLapsoInicio] = useState('');
  const [idLapsoFin, setIdLapsoFin] = useState('');
  const [idFinca, setIdFinca] = useState('');
  const [idCentroCosto, setIdCentroCosto] = useState('');

  // Extract unique periods (columns) from data
  const [columnasMeses, setColumnasMeses] = useState([]);

  useEffect(() => {
    fetchFincasAndLapsos();
  }, [tenantId]);

  useEffect(() => {
    fetchCentrosCosto(idFinca);
    setIdCentroCosto('');
  }, [idFinca, tenantId]);

  const fetchFincasAndLapsos = async () => {
    try {
      const [resFincas, resLapsos, resCuentas] = await Promise.all([
        authFetch(`/api/contabilidad/subempresas?tenantId=${tenantId || 1}`),
        authFetch(`/api/contabilidad/periodos?tenantId=${tenantId || 1}`),
        authFetch(`/api/contabilidad/catalogos?tableName=plan_contable&tenantId=${tenantId || 1}`)
      ]);
      
      if (resFincas.ok) {
        const f = await resFincas.json();
        setFincas(f);
      }
      if (resLapsos.ok) {
        let p = await resLapsos.json();
        p = p.sort((a, b) => {
          if (a.ano !== b.ano) return a.ano - b.ano;
          return a.mes - b.mes;
        });
        setLapsos(p);
        if (p.length > 0) {
          setIdLapsoInicio(p[0].id_periodo);
          setIdLapsoFin(p[p.length - 1].id_periodo);
        }
      }
      if (resCuentas.ok) {
        const cat = await resCuentas.json();
        const map = {};
        if (cat.cuentas) {
          cat.cuentas.forEach(c => map[c.codigo] = c);
        }
        setCatalogoCuentas(map);
      }
    } catch (err) {
      console.error("Error loading basic data:", err);
    }
  };

  const fetchCentrosCosto = async (fincaId) => {
    try {
      const res = await authFetch(`/api/contabilidad/catalogos?tenantId=${tenantId || 1}`);
      if (res.ok) {
        const d = await res.json();
        if (d.centros) {
          if (fincaId) {
            setCentrosCosto(d.centros.filter(c => c.id_finca?.toString() === fincaId.toString()));
          } else {
            setCentrosCosto(d.centros);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReporte = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/contabilidad/reportes/balance-acumulado-lapsos?tenantId=${tenantId || 1}`;
      if (idLapsoInicio) url += `&id_periodo_inicio=${idLapsoInicio}`;
      if (idLapsoFin) url += `&id_periodo_fin=${idLapsoFin}`;
      if (idFinca) url += `&id_finca=${idFinca}`;
      if (idCentroCosto) url += `&id_centro_costo=${idCentroCosto}`;

      const res = await authFetch(url);
      if (!res.ok) throw new Error("Error al consultar el reporte");
      const result = await res.json();
      
      processPivotData(result);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Convert raw rows (multiple rows per account) to pivoted objects
  const processPivotData = (rawRows) => {
    const accountMap = {};
    
    // Determine valid periods based on selected lapsos
    const idxStart = lapsos.findIndex(l => l.id_periodo.toString() === idLapsoInicio?.toString());
    const idxEnd = lapsos.findIndex(l => l.id_periodo.toString() === idLapsoFin?.toString());
    const validPeriodosMap = {};
    
    if (idxStart !== -1 && idxEnd !== -1) {
      const minIdx = Math.min(idxStart, idxEnd);
      const maxIdx = Math.max(idxStart, idxEnd);
      for (let i = minIdx; i <= maxIdx; i++) {
        const l = lapsos[i];
        validPeriodosMap[`${l.ano}-${String(l.mes).padStart(2, '0')}`] = true;
      }
    }

    rawRows.forEach(row => {
      if (!accountMap[row.codigo]) {
        accountMap[row.codigo] = {
          codigo: row.codigo,
          nombre: catalogoCuentas[row.codigo]?.nombre || row.nombre || 'SIN NOMBRE',
          nivel: row.nivel,
          naturaleza: row.naturaleza,
          saldo_anterior_bruto: 0,
          movimientos: {}
        };
      }
      
      // Accumulate saldo anterior from all rows of this account
      accountMap[row.codigo].saldo_anterior_bruto += parseFloat(row.saldo_anterior_bruto || 0);
      
      // Only record movimientos for months within the selected range
      if (row.mes_lapso && validPeriodosMap[row.mes_lapso]) {
        accountMap[row.codigo].movimientos[row.mes_lapso] = parseFloat(row.movimiento_neto || 0);
      }
    });

    const periodosSorted = Object.keys(validPeriodosMap).sort();
    setColumnasMeses(periodosSorted);

    const dataArray = Object.values(accountMap);
    
    // Add missing parent accounts (Nivel 1 to 4)
    const finalMap = {};
    dataArray.forEach(item => {
      let code = item.codigo;
      finalMap[code] = item;
      
      // Ensure parents exist
      for (let len = code.length - 2; len >= 1; len = len === 6 ? 4 : (len === 4 ? 2 : len - 1)) {
        let pCode = code.substring(0, len);
        if (!finalMap[pCode]) {
          finalMap[pCode] = {
            codigo: pCode,
            nombre: catalogoCuentas[pCode]?.nombre || 'SIN NOMBRE',
            nivel: pCode.length === 1 ? 1 : (pCode.length === 2 ? 2 : (pCode.length === 4 ? 3 : 4)),
            naturaleza: item.naturaleza,
            saldo_anterior_bruto: 0,
            movimientos: {}
          };
        }
      }
    });

    // Roll up values to parents
    const allCodes = Object.keys(finalMap).sort((a, b) => b.length - a.length); // Longest first
    allCodes.forEach(code => {
      const current = finalMap[code];
      
      // Find parent code
      let parentCode = null;
      if (code.length === 8) parentCode = code.substring(0, 6);
      else if (code.length === 6) parentCode = code.substring(0, 4);
      else if (code.length === 4) parentCode = code.substring(0, 2);
      else if (code.length === 2) parentCode = code.substring(0, 1);

      if (parentCode && finalMap[parentCode]) {
        // Roll up saldo anterior
        finalMap[parentCode].saldo_anterior_bruto += current.saldo_anterior_bruto;
        
        // Roll up periodos
        periodosSorted.forEach(mes => {
          const currentVal = current.movimientos[mes] || 0;
          finalMap[parentCode].movimientos[mes] = (finalMap[parentCode].movimientos[mes] || 0) + currentVal;
        });
      }
    });

    const listSorted = Object.values(finalMap).sort((a, b) => a.codigo.localeCompare(b.codigo));
    setData(listSorted);
  };

  const handlePrint = () => {
    const printContent = document.querySelector('.printable-report');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Balance Acumulado por Lapsos</title>
          <style>
            @media print {
              @page { margin: 10mm; size: landscape; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: system-ui, -apple-system, sans-serif; }
            }
          </style>
        </head>
        <body style="background: white; margin: 0;">
          ${printContent.innerHTML}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  };

  const formatLapsoLabel = (mesLapso) => {
    const [year, month] = mesLapso.split('-');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' };
  const inputStyle = { padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', width: '100%' };

  let totalActivos = 0, totalPasivos = 0, totalPatrimonio = 0, totalIngresos = 0, totalGastos = 0, totalCostos = 0;
  
  if (data.length > 0) {
    const getClaseSum = (clasePrefix) => {
      const cls = data.find(d => d.codigo === clasePrefix);
      let saldo = cls ? cls.saldo_anterior_bruto : 0;
      if (cls) {
        columnasMeses.forEach(m => saldo += (cls.movimientos[m] || 0));
      }
      return saldo;
    };
    totalActivos = getClaseSum('1');
    totalPasivos = getClaseSum('2');
    totalPatrimonio = getClaseSum('3');
    totalIngresos = getClaseSum('4');
    totalGastos = getClaseSum('5');
    totalCostos = getClaseSum('6') + getClaseSum('7');
  }

  const lapsoInicioObj = lapsos.find(l => l.id_periodo.toString() === idLapsoInicio?.toString());
  const lapsoFinObj = lapsos.find(l => l.id_periodo.toString() === idLapsoFin?.toString());
  const lapsoInicioName = lapsoInicioObj ? `${lapsoInicioObj.ano}-${String(lapsoInicioObj.mes).padStart(2,'0')}` : idLapsoInicio;
  const lapsoFinName = lapsoFinObj ? `${lapsoFinObj.ano}-${String(lapsoFinObj.mes).padStart(2,'0')}` : idLapsoFin;

  return (
    <div style={{ margin: '20px', background: 'var(--card-bg)', color: 'var(--text)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
      {/* HEADER NO IMPRIMIBLE */}
      <div className="no-print">
        <div style={{ background: 'linear-gradient(90deg, #1e293b 0%, #334155 100%)', padding: '24px', color: 'white', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
          <h2 style={{ margin: '0 0 8px 0' }}>📈 Balance Comparativo por Lapsos</h2>
          <p style={{ margin: 0, color: '#cbd5e1' }}>Vista matricial de saldos cruzada por meses, finca y centro de costo.</p>
        </div>
        
        <div style={{ padding: '24px' }}>
          <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '16px' }}>
              
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={labelStyle}>Finca (Consolidado)</label>
                <select value={idFinca} onChange={(e) => setIdFinca(e.target.value)} style={inputStyle}>
                  <option value="">-- Toda la Empresa --</option>
                  {fincas.map(f => (
                    <option key={f.id_finca} value={f.id_finca}>
                      {f.codigo} - {f.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={labelStyle}>Centro de Costo</label>
                <select value={idCentroCosto} onChange={(e) => setIdCentroCosto(e.target.value)} style={inputStyle}>
                  <option value="">-- Todos los Centros --</option>
                  {centrosCosto.map(c => (
                    <option key={c.id_centro_costo} value={c.id_centro_costo}>
                      {c.codigo} - {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={labelStyle}>Lapso Inicial</label>
                <select value={idLapsoInicio} onChange={(e) => setIdLapsoInicio(e.target.value)} style={inputStyle}>
                  {lapsos.map(l => (
                    <option key={l.id_periodo} value={l.id_periodo}>
                      {l.ano}-{String(l.mes).padStart(2,'0')}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={labelStyle}>Lapso Final</label>
                <select value={idLapsoFin} onChange={(e) => setIdLapsoFin(e.target.value)} style={inputStyle}>
                  {lapsos.map(l => (
                    <option key={l.id_periodo} value={l.id_periodo}>
                      {l.ano}-{String(l.mes).padStart(2,'0')}
                    </option>
                  ))}
                </select>
              </div>

              <button onClick={fetchReporte} style={{ background: '#22c55e', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                {loading ? 'Consultando...' : '▶ Generar Balance'}
              </button>

              {data.length > 0 && (
                <button onClick={handlePrint} style={{ background: '#3b82f6', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  🖨️ Imprimir
                </button>
              )}
            </div>
          </div>
          
          {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '6px', border: '1px solid #fca5a5' }}>{error}</div>}
        </div>
      </div>

      {/* REPORTE IMPRIMIBLE */}
      {data.length > 0 && (
        <div className="printable-report" style={{ padding: '40px', background: 'var(--card-bg)', color: 'var(--text)' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>BALANCE COMPARATIVO POR LAPSOS</h1>
            <h3 style={{ margin: 0, fontWeight: 'normal', color: 'var(--text-muted)' }}>
              {idFinca ? `Finca: ${fincas.find(f => f.id_finca.toString() === idFinca)?.nombre}` : 'Empresa Consolidada'}
              {idCentroCosto ? ` | Centro Costo: ${centrosCosto.find(c => c.id_centro_costo.toString() === idCentroCosto)?.nombre}` : ''}
            </h3>
            <p style={{ margin: '8px 0 0 0', color: 'var(--text-muted)' }}>
              Lapso {lapsoInicioName} a {lapsoFinName}
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: '800px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '8px', textAlign: 'left', width: '80px' }}>CÓDIGO</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>NOMBRE DE LA CUENTA</th>
                  <th style={{ padding: '8px', textAlign: 'right', borderLeft: '1px solid #e2e8f0' }}>SALDO ANTERIOR</th>
                  
                  {columnasMeses.map(mes => (
                    <th key={mes} style={{ padding: '8px', textAlign: 'right', borderLeft: '1px solid #e2e8f0', color: '#3b82f6' }}>
                      {formatLapsoLabel(mes).toUpperCase()}
                    </th>
                  ))}
                  
                  <th style={{ padding: '8px', textAlign: 'right', borderLeft: '1px solid #e2e8f0', background: 'var(--bg-main)' }}>SALDO FINAL</th>
                </tr>
              </thead>
              <tbody>
                {data.map(item => {
                  let fontWeight = 'normal';
                  let color = 'var(--text-primary)';
                  let paddingLeft = '8px';
                  let fontSize = '11px';
                  
                  if (item.nivel === 1) { fontWeight = 'bold'; color = '#38bdf8'; fontSize = '12px'; }
                  else if (item.nivel === 2) { fontWeight = 'bold'; color = '#7dd3fc'; paddingLeft = '16px'; }
                  else if (item.nivel === 3) { paddingLeft = '24px'; fontWeight = '500'; }
                  else if (item.nivel === 4) { paddingLeft = '32px'; }
                  else if (item.nivel === 5) { paddingLeft = '40px'; }

                  let currentSaldo = item.saldo_anterior_bruto;

                  return (
                    <tr key={item.codigo} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 8px', paddingLeft, fontWeight, color }}>{item.codigo}</td>
                      <td style={{ padding: '6px 8px', paddingLeft, fontWeight, color }}>{item.nombre}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', borderLeft: '1px solid #e2e8f0', color: 'var(--text-muted)' }}>
                        {formatCurrency(item.saldo_anterior_bruto)}
                      </td>
                      
                      {columnasMeses.map(mes => {
                        const mov = item.movimientos[mes] || 0;
                        currentSaldo += mov; // Acumular
                        return (
                          <td key={mes} style={{ padding: '6px 8px', textAlign: 'right', borderLeft: '1px solid #e2e8f0', color: mov !== 0 ? color : '#cbd5e1' }}>
                            {formatCurrency(mov)}
                          </td>
                        );
                      })}
                      
                      <td style={{ padding: '6px 8px', textAlign: 'right', borderLeft: '1px solid #e2e8f0', fontWeight: 'bold', background: 'var(--bg-main)' }}>
                        {formatCurrency(currentSaldo)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '40px' }}>
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold' }}>TOTAL ACTIVOS</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)' }}>{formatCurrency(totalActivos)}</div>
            </div>
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold' }}>PASIVO + PATRIMONIO</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)' }}>{formatCurrency(totalPasivos + totalPatrimonio)}</div>
            </div>
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold' }}>TOTAL INGRESOS</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>{formatCurrency(totalIngresos)}</div>
            </div>
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold' }}>TOTAL COSTOS Y GASTOS</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}>{formatCurrency(totalGastos + totalCostos)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceAcumuladoLapsos;
