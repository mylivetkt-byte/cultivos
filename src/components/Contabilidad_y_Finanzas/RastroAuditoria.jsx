import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

const RastroAuditoria = ({ tenantId }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [modulo, setModulo] = useState('');

  const fetchReporte = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/auditoria/rastro-auditoria?tenantId=${tenantId || 1}`;
      if (fechaInicio) url += `&fecha_inicio=${fechaInicio}`;
      if (fechaFin) url += `&fecha_fin=${fechaFin}`;
      if (modulo) url += `&modulo=${modulo}`;

      const res = await authFetch(url);
      if (!res.ok) throw new Error("Error al consultar el rastro de auditoría");
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.querySelector('.printable-report');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Rastro de Auditoría</title>
          <style>
            @media print {
              @page { margin: 10mm; size: landscape;   table, th, td { color: black !important; border-color: #ccc !important; }
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

  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' };
  const inputStyle = { padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ margin: '20px', background: 'var(--card-bg)', color: 'var(--text)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
      <div className="no-print">
        <div style={{ background: 'linear-gradient(90deg, #1e293b 0%, #334155 100%)', padding: '24px', color: 'white', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
          <h2 style={{ margin: '0 0 8px 0' }}>👣 Rastro de Auditoría (Audit Trail)</h2>
          <p style={{ margin: 0, color: '#94a3b8' }}>Registro inmutable de acciones críticas realizadas por los usuarios en el sistema.</p>
        </div>
        
        <div style={{ padding: '24px' }}>
          <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Fecha Desde</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Fecha Hasta</label>
              <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Módulo Afectado</label>
              <select value={modulo} onChange={e => setModulo(e.target.value)} style={inputStyle}>
                <option value="">-- Todos --</option>
                <option value="Contabilidad">Contabilidad</option>
                <option value="Parámetros">Parámetros</option>
                <option value="Inventarios">Inventarios</option>
              </select>
            </div>
            <div>
              <button onClick={fetchReporte} style={{ background: '#22c55e', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px' }}>
                {loading ? 'Consultando...' : '▶ Buscar Logs'}
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
            <h1 style={{ margin: '0 0 8px 0', fontSize: '20px', color: 'var(--text)' }}>REPORTE DE RASTRO DE AUDITORÍA</h1>
            <p style={{ margin: '0', color: 'var(--text-muted)' }}>
              Periodo Consultado: {fechaInicio || 'Inicio'} a {fechaFin || 'Actualidad'}
            </p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left', width: '130px' }}>FECHA Y HORA</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', width: '120px' }}>MÓDULO</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', width: '120px' }}>ACCIÓN</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', width: '150px' }}>REGISTRO / ID</th>
                <th style={{ padding: '10px 8px', textAlign: 'left' }}>DETALLE TÉCNICO</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', width: '130px' }}>USUARIO RESPONSABLE</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => {
                let badgeColor = '#e2e8f0';
                let textColor = 'var(--text-muted)';
                if (item.accion === 'Anulación' || item.accion === 'Eliminación') {
                  badgeColor = '#fee2e2'; textColor = '#991b1b';
                } else if (item.accion === 'Modificación') {
                  badgeColor = '#fef3c7'; textColor = '#92400e';
                }

                return (
                  <tr key={item.id_log} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>
                      {new Date(item.fecha).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 8px', fontWeight: 'bold', color: 'var(--text)' }}>{item.modulo}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ background: badgeColor, color: textColor, padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        {item.accion}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', color: 'var(--text)', fontWeight: '500' }}>{item.registro_id}</td>
                    <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>{item.detalle}</td>
                    <td style={{ padding: '10px 8px', color: '#0369a1', fontWeight: '600' }}>{item.usuario}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <div style={{ marginTop: '50px', color: '#94a3b8', fontSize: '10px', textAlign: 'center' }}>
            <p>Documento generado confidencialmente para Revisoría Fiscal. Prohibida su reproducción no autorizada.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RastroAuditoria;
