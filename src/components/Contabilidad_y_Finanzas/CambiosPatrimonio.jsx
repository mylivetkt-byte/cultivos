import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

const CambiosPatrimonio = ({ tenantId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [anio, setAnio] = useState(new Date().getFullYear());

  const fetchPatrimonio = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/estados-financieros/cambios-patrimonio?tenantId=${tenantId || 1}&anio=${anio}`);
      if (!res.ok) throw new Error("Error consultando el Estado de Cambios en el Patrimonio");
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatrimonio();
  }, [tenantId, anio]);

  const handlePrint = () => {
    const printContent = document.querySelector('.printable-patrimonio');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Estado de Cambios en el Patrimonio - ${anio}</title>
          <style>
            @media print {
              @page { margin: 15mm; size: landscape;   table, th, td { color: black !important; border-color: #ccc !important; }
}
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: system-ui, -apple-system, sans-serif; font-size: 11px; }
              table { page-break-inside: auto; border-collapse: collapse; width: 100%; }
              tr    { page-break-inside: avoid; page-break-after: auto; }
              th    { text-align: right; padding: 10px; border-bottom: 2px solid #000; background: #f8fafc; }
              th:first-child { text-align: left; }
              td    { padding: 10px; border-bottom: 1px solid #ccc; text-align: right; }
              td:first-child { text-align: left; font-weight: bold; }
              thead { display: table-header-group; }
              .total-col { background: #f1f5f9; font-weight: bold; }
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

  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  return (
    <div style={{ margin: '20px', background: 'var(--card-bg)', color: 'var(--text)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
      <div className="no-print">
        <div style={{ background: 'linear-gradient(90deg, #9333ea 0%, #a855f7 100%)', padding: '24px', color: 'white', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
          <h2 style={{ margin: '0 0 8px 0' }}>📈 Estado de Cambios en el Patrimonio</h2>
          <p style={{ margin: 0, color: '#f3e8ff' }}>Evolución de las cuentas patrimoniales, reservas y utilidades retenidas durante el ejercicio contable.</p>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' }}>Año Fiscal</label>
              <input type="number" value={anio} onChange={e => setAnio(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', width: '120px' }} />
            </div>
            <div>
              <button onClick={fetchPatrimonio} style={{ background: '#3b82f6', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px' }}>
                {loading ? 'Calculando...' : '📊 Generar Estado'}
              </button>
              {data && (
                <button onClick={handlePrint} style={{ background: '#0f172a', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  🖨️ Imprimir Estado Financiero
                </button>
              )}
            </div>
          </div>
          {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '6px', border: '1px solid #fca5a5' }}>{error}</div>}
        </div>
      </div>

      {data && (
        <div className="printable-patrimonio" style={{ padding: '40px', background: 'var(--card-bg)', color: 'var(--text)' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '22px', color: 'var(--text)' }}>ESTADO DE CAMBIOS EN EL PATRIMONIO</h1>
            <p style={{ margin: '0', color: 'var(--text-muted)' }}>Por el año terminado el 31 de Diciembre de {anio}</p>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '11px' }}>Expresado en Pesos Colombianos (COP)</p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>Concepto</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid var(--border)' }}>Saldo al 31 Dic {anio - 1}</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid var(--border)' }}>Aumentos (Aportes/Utilidades)</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid var(--border)' }}>Disminuciones (Dividendos/Pérdidas)</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid var(--border)', background: 'var(--border)' }}>Saldo al 31 Dic {anio}</th>
              </tr>
            </thead>
            <tbody>
              {data.cuentas.map((c, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '12px', borderBottom: '1px solid var(--border)', fontWeight: 'bold', color: '#7dd3fc' }}>{c.nombre}</td>
                  <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{formatCurrency(c.saldo_inicial)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border)', color: '#16a34a' }}>{c.aumentos > 0 ? formatCurrency(c.aumentos) : '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border)', color: '#dc2626' }}>{c.disminuciones > 0 ? `(${formatCurrency(c.disminuciones)})` : '-'}</td>
                  <td className="total-col" style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 'bold', background: 'var(--bg-main)' }}>{formatCurrency(c.saldo_final)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#1e293b', color: 'white', fontWeight: 'bold' }}>
                <td style={{ padding: '12px' }}>TOTAL PATRIMONIO</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {formatCurrency(data.cuentas.reduce((acc, c) => acc + c.saldo_inicial, 0))}
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {formatCurrency(data.cuentas.reduce((acc, c) => acc + c.aumentos, 0))}
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {formatCurrency(data.cuentas.reduce((acc, c) => acc + c.disminuciones, 0))}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontSize: '15px' }}>
                  {formatCurrency(data.cuentas.reduce((acc, c) => acc + c.saldo_final, 0))}
                </td>
              </tr>
            </tfoot>
          </table>

          <div style={{ marginTop: '30px', padding: '16px', border: '1px dashed #cbd5e1', borderRadius: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <strong>Nota NIIF:</strong> El rubro de "Superávit por Valorización" corresponde a la medición posterior a Valor Razonable de los Activos Biológicos (NIC 41) y Propiedades de Inversión (NIC 40). Este valor no es distribuible como dividendo hasta la realización del activo.
          </div>

          <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-around', color: 'var(--text)' }}>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ borderBottom: '1px solid #000', height: '40px' }}></div>
              <div style={{ marginTop: '8px', fontWeight: 'bold' }}>Representante Legal</div>
            </div>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ borderBottom: '1px solid #000', height: '40px' }}></div>
              <div style={{ marginTop: '8px', fontWeight: 'bold' }}>Contador Público</div>
            </div>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ borderBottom: '1px solid #000', height: '40px' }}></div>
              <div style={{ marginTop: '8px', fontWeight: 'bold' }}>Revisor Fiscal</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CambiosPatrimonio;
