import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

const LibroMayor = ({ tenantId }) => {
  const [data, setData] = useState([]);
  const [catalogo, setCatalogo] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [fincas, setFincas] = useState([]);
  const [idFinca, setIdFinca] = useState('');
  const [nivelMaximo, setNivelMaximo] = useState('4');

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
    if (!fechaInicio || !fechaFin) {
      setError("Por favor seleccione fecha inicial y final");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let url = `/api/contabilidad/reportes/libro-mayor?tenantId=${tenantId || 1}&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
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
      
      // Roll up values to parents
      const niveles = [1, 2, 4, 6, 8];
      
      niveles.forEach(len => {
        if (code.length >= len) {
          let pCode = code.substring(0, len);
          if (!finalMap[pCode]) {
            finalMap[pCode] = {
              codigo: pCode,
              nombre: catalogo[pCode]?.nombre || row.nombre || 'SIN NOMBRE',
              nivel: len === 1 ? 1 : (len === 2 ? 2 : (len === 4 ? 3 : (len === 6 ? 4 : 5))),
              naturaleza: row.naturaleza,
              saldo_anterior: 0,
              debito: 0,
              credito: 0,
              saldo_final: 0
            };
          }
          finalMap[pCode].saldo_anterior += parseFloat(row.saldo_anterior_bruto || 0);
          finalMap[pCode].debito += parseFloat(row.total_debito || 0);
          finalMap[pCode].credito += parseFloat(row.total_credito || 0);
        }
      });
    });

    const nivelesHabilitados = [];
    if (nivelMaximo >= 1) nivelesHabilitados.push(1); // Clase
    if (nivelMaximo >= 2) nivelesHabilitados.push(2); // Grupo
    if (nivelMaximo >= 4) nivelesHabilitados.push(4); // Cuenta Mayor
    if (nivelMaximo >= 6) nivelesHabilitados.push(6); // Subcuenta
    if (nivelMaximo >= 8) nivelesHabilitados.push(8); // Auxiliar

    const listSorted = Object.values(finalMap).filter(a => nivelesHabilitados.includes(a.codigo.length)).sort((a, b) => a.codigo.localeCompare(b.codigo));
    
    // Calculate saldo final based on naturaleza
    listSorted.forEach(acc => {
      if (acc.naturaleza === 'Debito') {
        acc.saldo_final = acc.saldo_anterior + acc.debito - acc.credito;
      } else {
        acc.saldo_final = acc.saldo_anterior + acc.credito - acc.debito;
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
          <title>Libro Mayor y Balances</title>
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

  return (
    <div style={{ margin: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
      <div className="no-print">
        <div style={{ background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)', padding: '24px', color: 'white', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
          <h2 style={{ margin: '0 0 8px 0' }}>📚 Libro Mayor y Balances</h2>
          <p style={{ margin: 0, color: '#94a3b8' }}>Resumen mensual obligatorio de Cuentas Mayores.</p>
        </div>
        
        <div style={{ padding: '24px' }}>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
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
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Nivel Máximo de Cuenta</label>
              <select value={nivelMaximo} onChange={e => setNivelMaximo(e.target.value)} style={inputStyle}>
                <option value="1">Clase (1 dígito)</option>
                <option value="2">Grupo (2 dígitos)</option>
                <option value="4">Cuenta Mayor (4 dígitos)</option>
                <option value="6">Subcuenta (6 dígitos)</option>
                <option value="8">Auxiliares (8 dígitos)</option>
              </select>
            </div>
            <div>
              <button onClick={fetchReporte} style={{ background: '#22c55e', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px' }}>
                {loading ? 'Generando...' : '▶ Generar Libro Mayor'}
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
            <h1 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>LIBRO MAYOR Y BALANCES</h1>
            <p style={{ margin: '0', color: '#64748b' }}>Periodo: {fechaInicio} a {fechaFin}</p>
            {idFinca && <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>Finca Filtro: {fincas.find(f => f.id_finca.toString() === idFinca)?.nombre}</p>}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>CÓDIGO</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>CUENTA MAYOR</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>SALDO ANTERIOR</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>DÉBITOS MES</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>CRÉDITOS MES</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>SALDO FINAL</th>
              </tr>
            </thead>
            <tbody>
              {data.map(acc => {
                let fw = acc.nivel === 1 ? 'bold' : (acc.nivel === 2 ? '600' : 'normal');
                let color = acc.nivel === 1 ? '#0f172a' : '#334155';
                let pl = acc.nivel === 1 ? '8px' : (acc.nivel === 2 ? '16px' : '24px');
                let bg = acc.nivel === 1 ? '#f1f5f9' : 'transparent';
                
                return (
                  <tr key={acc.codigo} style={{ borderBottom: '1px solid #f1f5f9', background: bg }}>
                    <td style={{ padding: '6px 8px', paddingLeft: pl, fontWeight: fw, color }}>{acc.codigo}</td>
                    <td style={{ padding: '6px 8px', paddingLeft: pl, fontWeight: fw, color }}>{acc.nombre}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: acc.saldo_anterior !== 0 ? color : '#cbd5e1', fontWeight: fw }}>
                      {formatCurrency(acc.saldo_anterior)}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: acc.debito !== 0 ? color : '#cbd5e1', fontWeight: fw }}>
                      {formatCurrency(acc.debito)}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: acc.credito !== 0 ? color : '#cbd5e1', fontWeight: fw }}>
                      {formatCurrency(acc.credito)}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                      {formatCurrency(acc.saldo_final)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-around', color: '#64748b' }}>
            <div style={{ textAlign: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '8px', width: '250px' }}>
              <strong>Representante Legal</strong>
            </div>
            <div style={{ textAlign: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '8px', width: '250px' }}>
              <strong>Revisor Fiscal / Contador</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibroMayor;
