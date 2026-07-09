import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

const FlujoEfectivo = ({ tenantId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [anio, setAnio] = useState(new Date().getFullYear());

  const fetchFlujo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/estados-financieros/flujo-efectivo?tenantId=${tenantId || 1}&anio=${anio}`);
      if (!res.ok) throw new Error("Error consultando el Flujo de Efectivo");
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlujo();
  }, [tenantId, anio]);

  const handlePrint = () => {
    const printContent = document.querySelector('.printable-flujo');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Estado de Flujos de Efectivo - ${anio}</title>
          <style>
            @media print {
              @page { margin: 15mm; size: portrait; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: system-ui, -apple-system, sans-serif; font-size: 12px; }
              table { page-break-inside: auto; border-collapse: collapse; width: 100%; }
              tr    { page-break-inside: avoid; page-break-after: auto; }
              th    { text-align: left; padding: 8px; border-bottom: 2px solid #000; }
              td    { padding: 8px; border-bottom: 1px solid #ccc; }
              .header-row { font-weight: bold; background-color: #f1f5f9; }
              .total-row { font-weight: bold; background-color: #e2e8f0; }
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
    <div style={{ margin: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
      <div className="no-print">
        <div style={{ background: 'linear-gradient(90deg, #047857 0%, #065f46 100%)', padding: '24px', color: 'white', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
          <h2 style={{ margin: '0 0 8px 0' }}>💸 Estado de Flujos de Efectivo (Método Directo)</h2>
          <p style={{ margin: 0, color: '#d1fae5' }}>Análisis de la liquidez de la empresa: Operación, Inversión y Financiación.</p>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Año Fiscal</label>
              <input type="number" value={anio} onChange={e => setAnio(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '120px' }} />
            </div>
            <div>
              <button onClick={fetchFlujo} style={{ background: '#3b82f6', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px' }}>
                {loading ? 'Calculando...' : '📊 Generar Flujo'}
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
        <div className="printable-flujo" style={{ padding: '40px', background: 'white' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '22px', color: '#0f172a' }}>ESTADO DE FLUJOS DE EFECTIVO (MÉTODO DIRECTO)</h1>
            <p style={{ margin: '0', color: '#64748b' }}>Por el año terminado el 31 de Diciembre de {anio}</p>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '11px' }}>Expresado en Pesos Colombianos (COP)</p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              {/* OPERACIÓN */}
              <tr className="header-row" style={{ background: '#f1f5f9' }}>
                <td colSpan="2" style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a', borderTop: '2px solid #000' }}>Flujos de Efectivo por Actividades de Operación</td>
              </tr>
              {data.operacion.map((item, idx) => (
                <tr key={'op'+idx}>
                  <td style={{ padding: '8px 12px', paddingLeft: '24px', borderBottom: '1px solid #f1f5f9' }}>{item.categoria}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>{formatCurrency(item.flujo_neto)}</td>
                </tr>
              ))}
              <tr className="total-row" style={{ background: '#e2e8f0', fontWeight: 'bold' }}>
                <td style={{ padding: '12px', color: '#334155' }}>Flujo Neto de Efectivo por Actividades de Operación</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#0f172a' }}>{formatCurrency(data.total_operacion)}</td>
              </tr>
              
              {/* INVERSIÓN */}
              <tr><td colSpan="2" style={{ height: '20px' }}></td></tr>
              <tr className="header-row" style={{ background: '#f1f5f9' }}>
                <td colSpan="2" style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a', borderTop: '1px solid #cbd5e1' }}>Flujos de Efectivo por Actividades de Inversión</td>
              </tr>
              {data.inversion.map((item, idx) => (
                <tr key={'inv'+idx}>
                  <td style={{ padding: '8px 12px', paddingLeft: '24px', borderBottom: '1px solid #f1f5f9' }}>{item.categoria}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>{formatCurrency(item.flujo_neto)}</td>
                </tr>
              ))}
              <tr className="total-row" style={{ background: '#e2e8f0', fontWeight: 'bold' }}>
                <td style={{ padding: '12px', color: '#334155' }}>Flujo Neto de Efectivo por Actividades de Inversión</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#0f172a' }}>{formatCurrency(data.total_inversion)}</td>
              </tr>

              {/* FINANCIACIÓN */}
              <tr><td colSpan="2" style={{ height: '20px' }}></td></tr>
              <tr className="header-row" style={{ background: '#f1f5f9' }}>
                <td colSpan="2" style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a', borderTop: '1px solid #cbd5e1' }}>Flujos de Efectivo por Actividades de Financiación</td>
              </tr>
              {data.financiacion.map((item, idx) => (
                <tr key={'fin'+idx}>
                  <td style={{ padding: '8px 12px', paddingLeft: '24px', borderBottom: '1px solid #f1f5f9' }}>{item.categoria}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>{formatCurrency(item.flujo_neto)}</td>
                </tr>
              ))}
              <tr className="total-row" style={{ background: '#e2e8f0', fontWeight: 'bold' }}>
                <td style={{ padding: '12px', color: '#334155' }}>Flujo Neto de Efectivo por Actividades de Financiación</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#0f172a' }}>{formatCurrency(data.total_financiacion)}</td>
              </tr>

              {/* RESUMEN */}
              <tr><td colSpan="2" style={{ height: '30px' }}></td></tr>
              <tr style={{ background: '#f8fafc' }}>
                <td style={{ padding: '12px', fontWeight: 'bold', fontSize: '14px' }}>Aumento (Disminución) Neto de Efectivo</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>{formatCurrency(data.flujo_neto_periodo)}</td>
              </tr>
              <tr>
                <td style={{ padding: '12px' }}>Efectivo y Equivalentes de Efectivo al Principio del Año</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(data.saldo_inicial)}</td>
              </tr>
              <tr style={{ background: '#1e293b', color: 'white' }}>
                <td style={{ padding: '12px', fontWeight: 'bold', fontSize: '15px' }}>Efectivo y Equivalentes de Efectivo al Final del Año</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '15px' }}>{formatCurrency(data.saldo_final)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-around', color: '#0f172a' }}>
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

export default FlujoEfectivo;
