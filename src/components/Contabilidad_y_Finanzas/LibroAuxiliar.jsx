import React, { useState, useEffect } from 'react';
import DatePickerClaro from '../Common/DatePickerClaro';
import { authFetch } from '../../utils/api';

const LibroAuxiliar = ({ tenantId }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [fincas, setFincas] = useState([]);
  const [centrosCosto, setCentrosCosto] = useState([]);
  const [terceros, setTerceros] = useState([]);
  const [cuentas, setCuentas] = useState([]);

  // Filtros
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [idFinca, setIdFinca] = useState('');
  const [idCentroCosto, setIdCentroCosto] = useState('');
  const [idTercero, setIdTercero] = useState('');
  const [cuentaInicio, setCuentaInicio] = useState('');
  const [cuentaFin, setCuentaFin] = useState('');

  useEffect(() => {
    fetchMaestros();
  }, [tenantId]);

  useEffect(() => {
    fetchCentrosCosto(idFinca);
    setIdCentroCosto('');
  }, [idFinca, tenantId]);

  const fetchMaestros = async () => {
    try {
      const resFincas = await authFetch(`/api/contabilidad/catalogos?tableName=fincas&tenantId=${tenantId || 1}`);
      if (resFincas.ok) {
        const d = await resFincas.json();
        if (d.fincas) setFincas(d.fincas);
      }
      const resTerceros = await authFetch(`/api/contabilidad/catalogos?tableName=terceros&tenantId=${tenantId || 1}`);
      if (resTerceros.ok) {
        const d = await resTerceros.json();
        if (d.terceros) setTerceros(d.terceros);
      }
      const resCuentas = await authFetch(`/api/contabilidad/catalogos?tableName=plan_contable&tenantId=${tenantId || 1}`);
      if (resCuentas.ok) {
        const cat = await resCuentas.json();
        setCuentas((cat.cuentas || []).filter(c => c.nivel === 5).sort((a,b) => a.codigo.localeCompare(b.codigo)));
      }
    } catch (err) {
      console.error(err);
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
    if (!fechaInicio || !fechaFin) {
      setError("Por favor seleccione fecha inicial y final");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let url = `/api/contabilidad/reportes/libro-auxiliar?tenantId=${tenantId || 1}&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
      if (idFinca) url += `&id_finca=${idFinca}`;
      if (idCentroCosto) url += `&id_centro_costo=${idCentroCosto}`;
      if (idTercero) url += `&id_tercero=${idTercero}`;
      if (cuentaInicio) url += `&cuenta_inicio=${cuentaInicio}`;
      if (cuentaFin) url += `&cuenta_fin=${cuentaFin}`;

      const res = await authFetch(url);
      if (!res.ok) throw new Error("Error al consultar el reporte");
      const result = await res.json();
      
      processReport(result.saldosAnteriores, result.movimientos);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processReport = (saldosAnt, movs) => {
    // Group by account
    const accountsMap = {};

    const getOrCreateAcc = (codigo, nombre, naturaleza) => {
      if (!accountsMap[codigo]) {
        accountsMap[codigo] = {
          codigo,
          nombre,
          naturaleza,
          saldoAnterior: 0,
          movimientos: [],
          totalDebito: 0,
          totalCredito: 0,
          saldoFinal: 0
        };
      }
      return accountsMap[codigo];
    };

    // Add saldos
    (saldosAnt || []).forEach(s => {
      const acc = getOrCreateAcc(s.codigo, 'Cargando...', 'Debito'); 
      acc.saldoAnterior = parseFloat(s.saldo_anterior || 0);
    });

    // Add movs
    (movs || []).forEach(m => {
      const acc = getOrCreateAcc(m.codigo, m.cuenta_nombre, m.naturaleza);
      acc.nombre = m.cuenta_nombre;
      acc.naturaleza = m.naturaleza;
      acc.movimientos.push({
        fecha: m.fecha.substring(0, 10),
        comprobante: m.comprobante_numero,
        documento: m.numero_doc || m.tipo_doc_codigo,
        tercero: m.tercero_nit ? `${m.tercero_nit} - ${m.tercero_nombre}` : '',
        concepto: m.detalle_descripcion || m.documento_concepto,
        centroCosto: m.centro_costo_codigo ? `${m.centro_costo_codigo} - ${m.centro_costo_nombre}` : '',
        debito: parseFloat(m.debito || 0),
        credito: parseFloat(m.credito || 0)
      });
      acc.totalDebito += parseFloat(m.debito || 0);
      acc.totalCredito += parseFloat(m.credito || 0);
    });

    // Calculate saldos
    Object.values(accountsMap).forEach(acc => {
      let running = acc.saldoAnterior;
      acc.movimientos.forEach(m => {
        running += (m.debito - m.credito);
        m.saldo = running;
      });
      acc.saldoFinal = running;
    });

    // Only keep accounts with movement or balance
    const filtered = Object.values(accountsMap).filter(a => a.saldoAnterior !== 0 || a.movimientos.length > 0);
    filtered.sort((a, b) => a.codigo.localeCompare(b.codigo));
    
    setData(filtered);
  };

  const handlePrint = () => {
    const printContent = document.querySelector('.printable-report');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Libro Auxiliar</title>
          <style>
            @media print {
              @page { margin: 10mm; size: landscape;   table, th, td { color: black !important; border-color: #ccc !important; }
}
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: system-ui, -apple-system, sans-serif; font-size: 10px; }
              table { page-break-inside: auto; }
              tr    { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
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

  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' };
  const inputStyle = { padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', width: '100%', boxSizing: 'border-box' };
  const tdStyle = { padding: '6px 8px', borderBottom: '1px solid var(--border)' };
  const thStyle = { padding: '8px', textAlign: 'left', background: 'var(--bg-main)', borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontWeight: 'bold' };

  return (
    <div style={{ margin: '20px', background: 'var(--card-bg)', color: 'var(--text)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
      <div className="no-print">
        <div style={{ background: 'linear-gradient(90deg, #1e293b 0%, #334155 100%)', padding: '24px', color: 'white', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
          <h2 style={{ margin: '0 0 8px 0' }}>📓 Libro Auxiliar</h2>
          <p style={{ margin: 0, color: '#cbd5e1' }}>Detalle oficial de movimientos y saldos progresivos por cuenta.</p>
        </div>
        
        <div style={{ padding: '24px' }}>
          <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '24px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Fecha Desde *</label>
                <DatePickerClaro value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Fecha Hasta *</label>
                <DatePickerClaro value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Cuenta Desde</label>
                <select value={cuentaInicio} onChange={e => setCuentaInicio(e.target.value)} style={inputStyle}>
                  <option value="">-- Inicio --</option>
                  {cuentas.map(c => <option key={c.codigo} value={c.codigo}>{c.codigo} - {c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Cuenta Hasta</label>
                <select value={cuentaFin} onChange={e => setCuentaFin(e.target.value)} style={inputStyle}>
                  <option value="">-- Fin --</option>
                  {cuentas.map(c => <option key={c.codigo} value={c.codigo}>{c.codigo} - {c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tercero</label>
                <select value={idTercero} onChange={e => setIdTercero(e.target.value)} style={inputStyle}>
                  <option value="">-- Todos --</option>
                  {terceros.map(t => <option key={t.id_tercero} value={t.id_tercero}>{t.documento} - {t.nombre_completo}</option>)}
                </select>
              </div>
                <div>
                  <label style={labelStyle}>Finca (Cultivo)</label>
                  <select value={idFinca} onChange={e => setIdFinca(e.target.value)} style={inputStyle}>
                    <option value="">-- Todas --</option>
                    {fincas.map(f => <option key={f.id_finca} value={f.id_finca}>{f.codigo} - {f.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Centro de Costo</label>
                  <select value={idCentroCosto} onChange={e => setIdCentroCosto(e.target.value)} style={inputStyle}>
                    <option value="">-- Todos los Centros --</option>
                    {centrosCosto.map(c => <option key={c.id_centro_costo} value={c.id_centro_costo}>{c.codigo} - {c.nombre}</option>)}
                  </select>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
              <button onClick={fetchReporte} style={{ background: '#22c55e', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                {loading ? 'Consultando...' : '▶ Generar Auxiliar'}
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

      {data.length > 0 && (
        <div className="printable-report" style={{ padding: '40px', background: 'var(--card-bg)', color: 'var(--text)' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>LIBRO AUXILIAR DE CONTABILIDAD</h1>
            <p style={{ margin: '0', color: 'var(--text-muted)' }}>Desde: {fechaInicio} Hasta: {fechaFin}</p>
            {idFinca && <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>Finca Filtro: {fincas.find(f => f.id_finca.toString() === idFinca)?.nombre}</p>}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: '900px' }}>
            <thead>
              <tr>
                <th style={thStyle}>FECHA</th>
                <th style={thStyle}>COMP.</th>
                <th style={thStyle}>TERCERO</th>
                <th style={thStyle}>DETALLE</th>
                <th style={thStyle}>CENTRO COSTO</th>
                <th style={{...thStyle, textAlign: 'right'}}>DÉBITO</th>
                <th style={{...thStyle, textAlign: 'right'}}>CRÉDITO</th>
                <th style={{...thStyle, textAlign: 'right'}}>SALDO</th>
              </tr>
            </thead>
            <tbody>
              {data.map(acc => (
                <React.Fragment key={acc.codigo}>
                  <tr style={{ background: 'var(--bg-main)', borderTop: '2px solid #cbd5e1' }}>
                    <td colSpan="5" style={{ padding: '10px 8px', fontWeight: 'bold', color: 'var(--text)' }}>
                      CUENTA: {acc.codigo} - {acc.nombre.toUpperCase()}
                    </td>
                    <td colSpan="2" style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                      SALDO ANTERIOR:
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: 'var(--text)' }}>
                      {formatCurrency(acc.saldoAnterior)}
                    </td>
                  </tr>
                  
                  {acc.movimientos.map((m, idx) => (
                    <tr key={idx}>
                      <td style={tdStyle}>{m.fecha}</td>
                      <td style={tdStyle}>{m.comprobante}</td>
                      <td style={tdStyle}>{m.tercero}</td>
                      <td style={tdStyle}>{m.concepto}</td>
                      <td style={tdStyle}>{m.centroCosto}</td>
                      <td style={{...tdStyle, textAlign: 'right', color: m.debito > 0 ? '#1e293b' : '#cbd5e1'}}>{formatCurrency(m.debito)}</td>
                      <td style={{...tdStyle, textAlign: 'right', color: m.credito > 0 ? '#1e293b' : '#cbd5e1'}}>{formatCurrency(m.credito)}</td>
                      <td style={{...tdStyle, textAlign: 'right', fontWeight: '500'}}>{formatCurrency(m.saldo)}</td>
                    </tr>
                  ))}
                  
                  <tr style={{ background: 'var(--bg-main)' }}>
                    <td colSpan="5" style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                      TOTAL MOVIMIENTO MES:
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#7dd3fc' }}>
                      {formatCurrency(acc.totalDebito)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#7dd3fc' }}>
                      {formatCurrency(acc.totalCredito)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                      {formatCurrency(acc.saldoFinal)}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
          
          <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-around', color: 'var(--text-muted)' }}>
            <div style={{ textAlign: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '8px', width: '250px' }}>
              <strong>Preparó</strong>
            </div>
            <div style={{ textAlign: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '8px', width: '250px' }}>
              <strong>Contador / Revisor Fiscal</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibroAuxiliar;
