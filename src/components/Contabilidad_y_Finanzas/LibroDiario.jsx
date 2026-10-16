import React, { useState } from 'react';
import { authFetch } from '../../utils/api';
import Pagination from '../Pagination';

const LibroDiario = ({ tenantId }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [fincas, setFincas] = useState([]);
  const [idFinca, setIdFinca] = useState('');

  React.useEffect(() => {
    fetchFincas();
  }, [tenantId]);

  const fetchFincas = async () => {
    try {
      const res = await authFetch(`/api/contabilidad/subempresas?tenantId=${tenantId || 1}`);
      if (res.ok) setFincas(await res.json());
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
      let url = `/api/contabilidad/reportes/libro-diario?tenantId=${tenantId || 1}&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
      if (idFinca) url += `&id_finca=${idFinca}`;
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Error al consultar el reporte");
      const result = await res.json();
      
      processReport(result);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processReport = (movs) => {
    // Agrupar por Fecha -> Comprobante
    const dateMap = {};

    movs.forEach(m => {
      const f = m.fecha.substring(0, 10);
      const compKey = `${m.comprobante_tipo} #${m.comprobante_numero}`;
      
      if (!dateMap[f]) {
        dateMap[f] = {
          fecha: f,
          comprobantes: {},
          totalDebitoDia: 0,
          totalCreditoDia: 0
        };
      }
      
      if (!dateMap[f].comprobantes[compKey]) {
        dateMap[f].comprobantes[compKey] = {
          llave: compKey,
          lineas: [],
          totalDebito: 0,
          totalCredito: 0
        };
      }

      const debito = parseFloat(m.total_debito || 0);
      const credito = parseFloat(m.total_credito || 0);

      dateMap[f].comprobantes[compKey].lineas.push({
        codigo: m.codigo,
        nombre: m.cuenta_nombre,
        debito,
        credito
      });

      dateMap[f].comprobantes[compKey].totalDebito += debito;
      dateMap[f].comprobantes[compKey].totalCredito += credito;

      dateMap[f].totalDebitoDia += debito;
      dateMap[f].totalCreditoDia += credito;
    });

    const datesSorted = Object.values(dateMap).sort((a, b) => a.fecha.localeCompare(b.fecha));
    datesSorted.forEach(d => {
      d.comprobantesList = Object.values(d.comprobantes).sort((a, b) => a.llave.localeCompare(b.llave));
    });

    setData(datesSorted);
    setCurrentPage(1);
  };

  const handlePrint = () => {
    const printContent = document.querySelector('.printable-report');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Libro Diario</title>
          <style>
            @media print {
              @page { margin: 10mm; size: portrait;   table, th, td { color: black !important; border-color: #ccc !important; }
}
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: system-ui, -apple-system, sans-serif; font-size: 11px; }
              table { page-break-inside: auto; }
              tr    { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
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
  const tdStyle = { padding: '6px 8px', borderBottom: '1px dotted #e2e8f0' };

  let granTotalDebito = 0;
  let granTotalCredito = 0;
  data.forEach(d => {
    granTotalDebito += d.totalDebitoDia;
    granTotalCredito += d.totalCreditoDia;
  });

  return (
    <div style={{ margin: '20px', background: 'var(--card-bg)', color: 'var(--text)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
      <div className="no-print">
        <div style={{ background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)', padding: '24px', color: 'white', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
          <h2 style={{ margin: '0 0 8px 0' }}>📘 Libro Diario (Columnario)</h2>
          <p style={{ margin: 0, color: '#94a3b8' }}>Registro cronológico de transacciones con validación de sumas iguales.</p>
        </div>
        
        <div style={{ padding: '24px' }}>
          <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Fecha Desde *</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Fecha Hasta *</label>
              <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Finca (Consolidado)</label>
              <select value={idFinca} onChange={e => setIdFinca(e.target.value)} style={inputStyle}>
                <option value="">-- Toda la Empresa --</option>
                {fincas.map(f => <option key={f.id_finca} value={f.id_finca}>{f.codigo} - {f.nombre}</option>)}
              </select>
            </div>
            <div>
              <button onClick={fetchReporte} style={{ background: '#22c55e', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px' }}>
                {loading ? 'Generando...' : '▶ Generar Diario'}
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
            <h1 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>LIBRO DIARIO DE CONTABILIDAD</h1>
            <p style={{ margin: '0', color: 'var(--text-muted)' }}>Periodo: {fechaInicio} a {fechaFin}</p>
            {idFinca && <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>Finca Filtro: {fincas.find(f => f.id_finca.toString() === idFinca)?.nombre}</p>}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px', textAlign: 'left', background: 'var(--bg-main)', borderBottom: '2px solid var(--border)' }}>CÓDIGO</th>
                <th style={{ padding: '8px', textAlign: 'left', background: 'var(--bg-main)', borderBottom: '2px solid var(--border)' }}>CUENTA MAYOR / DETALLE</th>
                <th style={{ padding: '8px', textAlign: 'right', background: 'var(--bg-main)', borderBottom: '2px solid var(--border)' }}>DÉBITOS</th>
                <th style={{ padding: '8px', textAlign: 'right', background: 'var(--bg-main)', borderBottom: '2px solid var(--border)' }}>CRÉDITOS</th>
              </tr>
            </thead>
            <tbody>
              {data.slice((currentPage - 1) * 20, currentPage * 20).map(dia => (
                <React.Fragment key={dia.fecha}>
                  <tr style={{ background: 'var(--border)' }}>
                    <td colSpan="4" style={{ padding: '8px', fontWeight: 'bold', fontSize: '12px' }}>
                      FECHA: {dia.fecha}
                    </td>
                  </tr>
                  
                  {dia.comprobantesList.map((comp, cIdx) => (
                    <React.Fragment key={cIdx}>
                      <tr>
                        <td colSpan="4" style={{ padding: '6px 8px', fontWeight: 'bold', color: 'var(--text)', background: 'var(--bg-main)' }}>
                          COMPROBANTE: {comp.llave}
                        </td>
                      </tr>
                      {comp.lineas.map((l, lIdx) => (
                        <tr key={lIdx}>
                          <td style={tdStyle}>{l.codigo}</td>
                          <td style={tdStyle}>{l.nombre}</td>
                          <td style={{...tdStyle, textAlign: 'right'}}>{l.debito > 0 ? formatCurrency(l.debito) : ''}</td>
                          <td style={{...tdStyle, textAlign: 'right'}}>{l.credito > 0 ? formatCurrency(l.credito) : ''}</td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan="2" style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', color: 'var(--text-muted)' }}>Suma Comprobante:</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', color: 'var(--text)' }}>{formatCurrency(comp.totalDebito)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', color: 'var(--text)' }}>{formatCurrency(comp.totalCredito)}</td>
                      </tr>
                    </React.Fragment>
                  ))}
                  
                  <tr style={{ background: 'var(--bg-main)' }}>
                    <td colSpan="2" style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#7dd3fc' }}>
                      TOTAL MOVIMIENTO DEL DÍA:
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                      {formatCurrency(dia.totalDebitoDia)}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                      {formatCurrency(dia.totalCreditoDia)}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#0f172a', color: 'white' }}>
                <td colSpan="2" style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>
                  GRAN TOTAL PERIODO:
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>
                  {formatCurrency(granTotalDebito)}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>
                  {formatCurrency(granTotalCredito)}
                </td>
              </tr>
            </tfoot>
          </table>

          {data.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <Pagination 
                currentPage={currentPage}
                totalItems={data.length}
                pageSize={20}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
          
          <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-around', color: 'var(--text-muted)' }}>
            <div style={{ textAlign: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '8px', width: '250px' }}>
              <strong>Representante Legal</strong>
            </div>
            <div style={{ textAlign: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '8px', width: '250px' }}>
              <strong>Contador Público</strong><br/>
              <span>T.P. No. _________</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibroDiario;
