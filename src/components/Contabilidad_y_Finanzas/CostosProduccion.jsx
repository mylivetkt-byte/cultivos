import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

const CostosProduccion = ({ tenantId }) => {
  const [data, setData] = useState([]);
  const [resumen, setResumen] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [periodo, setPeriodo] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/finanzas-agro/costos-produccion?tenantId=${tenantId || 1}`;
      if (periodo) url += `&periodo=${periodo}`;

      const res = await authFetch(url);
      if (!res.ok) throw new Error("Error consultando costos de producción");
      const result = await res.json();
      
      setData(result.costos || []);
      setResumen(result.resumen_presupuesto || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenantId, periodo]);

  const handlePrint = () => {
    const printContent = document.querySelector('.printable-report');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Costos de Producción Agrícola</title>
          <style>
            @media print {
              @page { margin: 10mm; size: landscape; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: system-ui, -apple-system, sans-serif; font-size: 11px; }
              table { page-break-inside: auto; border-collapse: collapse; width: 100%; }
              tr    { page-break-inside: avoid; page-break-after: auto; border-bottom: 1px solid #e2e8f0; }
              th    { text-align: left; padding: 8px; background: #f8fafc; color: #475569; }
              td    { padding: 8px; color: #334155; }
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

  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  return (
    <div style={{ margin: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
      <div className="no-print">
        <div style={{ background: 'linear-gradient(90deg, #b45309 0%, #d97706 100%)', padding: '24px', color: 'white', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
          <h2 style={{ margin: '0 0 8px 0' }}>🌾 Tablero de Costos de Producción</h2>
          <p style={{ margin: 0, color: '#fef3c7' }}>Costos reales por Lote y Cultivo: Insumos, Mano de Obra, Riego y Maquinaria.</p>
        </div>
        
        <div style={{ padding: '24px' }}>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, maxWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Filtro de Periodo</label>
              <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '100%' }} />
            </div>
            <div>
              <button onClick={fetchData} style={{ background: '#f59e0b', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px' }}>
                {loading ? 'Consultando...' : '📊 Generar Tablero'}
              </button>
              {data.length > 0 && (
                <button onClick={handlePrint} style={{ background: '#3b82f6', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  🖨️ Imprimir Resumen
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
            <h1 style={{ margin: '0 0 8px 0', fontSize: '22px', color: '#0f172a' }}>REPORTE GERENCIAL: COSTOS DE PRODUCCIÓN AGRÍCOLA</h1>
            <p style={{ margin: '0', color: '#64748b' }}>
              Periodo Consultado: {periodo || 'Histórico Global'}
            </p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                <th>LOTE / FINCA</th>
                <th>CULTIVO</th>
                <th>HECTÁREAS</th>
                <th style={{ textAlign: 'right' }}>MANO DE OBRA</th>
                <th style={{ textAlign: 'right' }}>INSUMOS</th>
                <th style={{ textAlign: 'right' }}>MAQUINARIA / RIEGO</th>
                <th style={{ textAlign: 'right' }}>TOTAL COSTO LOTE</th>
                <th style={{ textAlign: 'right', background: '#eff6ff', color: '#1d4ed8' }}>COSTO / HECTÁREA</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => {
                const totalMaquinaria = parseFloat(item.costo_maquinaria || 0) + parseFloat(item.costo_riego || 0);
                return (
                  <tr key={item.id_costo_prod} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ fontWeight: 'bold', color: '#334155' }}>
                      {item.lote_nombre}<br/>
                      <span style={{ fontWeight: 'normal', fontSize: '10px', color: '#94a3b8' }}>{item.finca_nombre}</span>
                    </td>
                    <td style={{ color: '#047857', fontWeight: 'bold' }}>{item.cultivo_nombre}</td>
                    <td>{item.hectareas} ha</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.costo_mano_obra)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.costo_insumos)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(totalMaquinaria)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(item.costo_total)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', background: '#eff6ff', color: '#1d4ed8' }}>
                      {formatCurrency(item.costo_por_hectarea)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                <td colSpan="6" style={{ textAlign: 'right', padding: '12px 8px' }}>TOTAL COSTO PERIODO:</td>
                <td style={{ textAlign: 'right', padding: '12px 8px' }}>
                  {formatCurrency(data.reduce((acc, i) => acc + parseFloat(i.costo_total || 0), 0))}
                </td>
                <td style={{ background: '#eff6ff' }}></td>
              </tr>
            </tfoot>
          </table>

          {resumen && resumen.length > 0 && (
            <div style={{ marginTop: '40px' }}>
              <h3 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', color: '#334155' }}>Desempeño vs Presupuesto Anual</h3>
              <div style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
                {resumen.map(r => {
                  const ppto = parseFloat(r.total_ppto || 0);
                  const ejec = parseFloat(r.total_ejecutado || 0);
                  const varPct = ppto > 0 ? ((ejec - ppto) / ppto) * 100 : 0;
                  
                  return (
                    <div key={r.anio} style={{ flex: 1, padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>Año {r.anio}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>Presupuestado:</span> <span>{formatCurrency(ppto)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>Ejecutado:</span> <span>{formatCurrency(ejec)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #cbd5e1' }}>
                        <span>Desviación:</span> 
                        <span style={{ color: varPct > 0 ? '#dc2626' : '#16a34a' }}>
                          {varPct > 0 ? '+' : ''}{varPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <div style={{ marginTop: '50px', color: '#94a3b8', fontSize: '10px', textAlign: 'center' }}>
            <p>Generado automáticamente. Los valores mostrados corresponden a la distribución analítica de costos de las labores directas e indirectas.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostosProduccion;
