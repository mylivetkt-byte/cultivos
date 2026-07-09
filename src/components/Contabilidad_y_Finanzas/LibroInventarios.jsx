import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

const LibroInventarios = ({ tenantId }) => {
  const [data, setData] = useState([]);
  const [catalogo, setCatalogo] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [fechaCorte, setFechaCorte] = useState('');
  const [fincas, setFincas] = useState([]);
  const [idFinca, setIdFinca] = useState('');

  React.useEffect(() => {
    fetchCatalogo();
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

  const fetchCatalogo = async () => {
    try {
      const res = await authFetch(`/api/contabilidad/catalogos?tableName=plan_contable&tenantId=${tenantId || 1}`);
      if (res.ok) {
        const cat = await res.json();
        const map = {};
        if (cat.cuentas) {
          cat.cuentas.forEach(c => map[c.codigo] = c);
        }
        setCatalogo(map);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReporte = async () => {
    if (!fechaCorte) {
      setError("Por favor seleccione la fecha de corte");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let url = `/api/contabilidad/reportes/libro-inventarios?tenantId=${tenantId || 1}&fecha_corte=${fechaCorte}`;
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

  const processReport = (rows) => {
    const finalMap = {};

    rows.forEach(row => {
      let code = row.codigo;
      
      // Roll up values to parents up to Level 5
      const niveles = [1, 2, 4, 6, 8]; // Lengths in Colombia PUC (1: Clase, 2: Grupo, 4: Cuenta, 6: Subcuenta, 8: Auxiliar)
      
      niveles.forEach(len => {
        if (code.length >= len) {
          let pCode = code.substring(0, len);
          if (!finalMap[pCode]) {
            finalMap[pCode] = {
              codigo: pCode,
              nombre: catalogo[pCode]?.nombre || row.nombre || 'SIN NOMBRE',
              nivel: len === 1 ? 1 : (len === 2 ? 2 : (len === 4 ? 3 : (len === 6 ? 4 : 5))),
              naturaleza: row.naturaleza,
              saldo_final: 0
            };
          }
          finalMap[pCode].saldo_final += parseFloat(row.saldo_final || 0);
        }
      });
    });

    // We only care about accounts that have a balance > 0 or < 0
    let listSorted = Object.values(finalMap).filter(a => Math.abs(a.saldo_final) > 0.01);
    listSorted.sort((a, b) => a.codigo.localeCompare(b.codigo));
    
    // Adjust signs based on nature (Naturaleza Crédito is usually negative in raw debito-credito, so we flip it for display)
    listSorted.forEach(acc => {
      if (acc.naturaleza === 'Credito') {
        acc.saldo_final = acc.saldo_final * -1;
      }
    });

    setData(listSorted);
  };

  const handlePrint = () => {
    const printContent = document.querySelector('.printable-report');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Libro de Inventarios y Balances</title>
          <style>
            @media print {
              @page { margin: 10mm; size: portrait; }
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

  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
  const inputStyle = { padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white', width: '100%', boxSizing: 'border-box' };

  let sumActivo = 0;
  let sumPasivo = 0;
  let sumPatrimonio = 0;

  if (data.length > 0) {
    sumActivo = data.find(d => d.codigo === '1')?.saldo_final || 0;
    sumPasivo = data.find(d => d.codigo === '2')?.saldo_final || 0;
    sumPatrimonio = data.find(d => d.codigo === '3')?.saldo_final || 0;
  }

  return (
    <div style={{ margin: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
      <div className="no-print">
        <div style={{ background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)', padding: '24px', color: 'white', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
          <h2 style={{ margin: '0 0 8px 0' }}>📋 Libro de Inventarios y Balances</h2>
          <p style={{ margin: 0, color: '#94a3b8' }}>Saldos de cuentas reales (1, 2, 3) a una fecha de corte, excluyendo cuentas de resultado.</p>
        </div>
        
        <div style={{ padding: '24px' }}>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Fecha de Corte *</label>
              <input type="date" value={fechaCorte} onChange={e => setFechaCorte(e.target.value)} style={inputStyle} />
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
                {loading ? 'Generando...' : '▶ Generar Libro'}
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
        <div className="printable-report" style={{ padding: '40px', background: 'white' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>LIBRO DE INVENTARIOS Y BALANCES</h1>
            <p style={{ margin: '0', color: '#64748b' }}>A la fecha de corte: {fechaCorte}</p>
            {idFinca && <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>Finca Filtro: {fincas.find(f => f.id_finca.toString() === idFinca)?.nombre}</p>}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '8px', textAlign: 'left', width: '100px' }}>CÓDIGO</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>NOMBRE DE LA CUENTA</th>
                <th style={{ padding: '8px', textAlign: 'right', width: '150px' }}>SALDO AL CORTE</th>
              </tr>
            </thead>
            <tbody>
              {data.map(acc => {
                let fw = 'normal';
                let color = '#334155';
                let pl = '8px';
                
                if (acc.nivel === 1) { fw = 'bold'; color = '#0f172a'; }
                else if (acc.nivel === 2) { fw = '600'; pl = '20px'; }
                else if (acc.nivel === 3) { fw = '500'; pl = '30px'; }
                else if (acc.nivel === 4) { pl = '40px'; }
                else if (acc.nivel === 5) { pl = '50px'; color = '#64748b'; }

                return (
                  <tr key={acc.codigo} style={{ borderBottom: acc.nivel === 1 ? '2px solid #e2e8f0' : '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', paddingLeft: pl, fontWeight: fw, color }}>{acc.codigo}</td>
                    <td style={{ padding: '6px 8px', paddingLeft: pl, fontWeight: fw, color }}>{acc.nombre}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: fw, color: acc.nivel === 1 ? '#0f172a' : color }}>
                      {formatCurrency(acc.saldo_final)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <div style={{ marginTop: '40px', padding: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 16px 0', textAlign: 'center' }}>ECUACIÓN PATRIMONIAL</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
              <div>ACTIVO: <span style={{ color: '#0f172a' }}>{formatCurrency(sumActivo)}</span></div>
              <div>=</div>
              <div>PASIVO: <span style={{ color: '#0f172a' }}>{formatCurrency(sumPasivo)}</span></div>
              <div>+</div>
              <div>PATRIMONIO: <span style={{ color: '#0f172a' }}>{formatCurrency(sumPatrimonio)}</span></div>
            </div>
            {Math.abs(sumActivo - (sumPasivo + sumPatrimonio)) > 0.01 && (
              <div style={{ marginTop: '16px', color: '#dc2626', textAlign: 'center', fontSize: '12px' }}>
                ⚠️ Descuadre Patrimonial Detectado: {formatCurrency(sumActivo - (sumPasivo + sumPatrimonio))} (Cierre contable pendiente)
              </div>
            )}
          </div>

          <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-around', color: '#64748b' }}>
            <div style={{ textAlign: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '8px', width: '250px' }}>
              <strong>Representante Legal</strong>
            </div>
            <div style={{ textAlign: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '8px', width: '250px' }}>
              <strong>Revisor Fiscal</strong>
            </div>
            <div style={{ textAlign: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '8px', width: '250px' }}>
              <strong>Contador Público</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibroInventarios;
