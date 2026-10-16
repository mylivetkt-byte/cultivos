import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

const ControlConsecutivos = ({ tenantId }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tiposDoc, setTiposDoc] = useState([]);

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [idTipoDoc, setIdTipoDoc] = useState('');

  useEffect(() => {
    fetchTipos();
  }, [tenantId]);

  const fetchTipos = async () => {
    try {
      const res = await authFetch(`/api/contabilidad/catalogos?tableName=tipos_documentos&tenantId=${tenantId || 1}`);
      if (res.ok) {
        const d = await res.json();
        setTiposDoc(d.tipos || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReporte = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/auditoria/control-consecutivos?tenantId=${tenantId || 1}`;
      if (fechaInicio) url += `&fecha_inicio=${fechaInicio}`;
      if (fechaFin) url += `&fecha_fin=${fechaFin}`;
      if (idTipoDoc) url += `&id_tipo_doc=${idTipoDoc}`;

      const res = await authFetch(url);
      if (!res.ok) throw new Error("Error al consultar el control de consecutivos");
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
          <title>Control de Consecutivos - Auditoría</title>
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

  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' };
  const inputStyle = { padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ margin: '20px', background: 'var(--card-bg)', color: 'var(--text)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
      <div className="no-print">
        <div style={{ background: 'linear-gradient(90deg, #dc2626 0%, #991b1b 100%)', padding: '24px', color: 'white', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
          <h2 style={{ margin: '0 0 8px 0' }}>🔍 Auditoría: Control de Consecutivos</h2>
          <p style={{ margin: 0, color: '#fecaca' }}>Detección automática de "huecos" y saltos numéricos en la facturación y comprobantes.</p>
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
              <label style={labelStyle}>Tipo de Documento</label>
              <select value={idTipoDoc} onChange={e => setIdTipoDoc(e.target.value)} style={inputStyle}>
                <option value="">-- Todos --</option>
                {tiposDoc.map(t => <option key={t.id_tipo_doc} value={t.id_tipo_doc}>{t.codigo} - {t.nombre}</option>)}
              </select>
            </div>
            <div>
              <button onClick={fetchReporte} style={{ background: '#22c55e', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px' }}>
                {loading ? 'Auditando...' : '▶ Iniciar Auditoría'}
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
            <h1 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#991b1b' }}>INFORME DE CONTROL DE CONSECUTIVOS</h1>
            <p style={{ margin: '0', color: 'var(--text-muted)' }}>
              Periodo Evaluado: {fechaInicio || 'Inicio'} a {fechaFin || 'Actualidad'}
            </p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left' }}>TIPO DE DOCUMENTO</th>
                <th style={{ padding: '12px 8px', textAlign: 'center' }}>TOTAL REGISTROS</th>
                <th style={{ padding: '12px 8px', textAlign: 'center' }}>HUECOS DETECTADOS</th>
                <th style={{ padding: '12px 8px', textAlign: 'left' }}>NÚMEROS FALTANTES</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold', color: 'var(--text)' }}>{item.tipo_documento}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>{item.total_evaluados}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      background: item.huecos_encontrados > 0 ? '#fee2e2' : '#dcfce3', 
                      color: item.huecos_encontrados > 0 ? '#991b1b' : '#166534',
                      fontWeight: 'bold'
                    }}>
                      {item.huecos_encontrados}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', color: '#dc2626' }}>
                    {item.detalle_huecos.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {item.detalle_huecos.map((h, i) => (
                          <li key={i}><strong>{h.missing_number}</strong> (Falta entre {h.between})</li>
                        ))}
                      </ul>
                    ) : (
                      <span style={{ color: '#16a34a' }}>✓ Secuencia Perfecta</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-around', color: 'var(--text-muted)' }}>
            <div style={{ textAlign: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '8px', width: '250px' }}>
              <strong>Jefe de Contabilidad</strong>
            </div>
            <div style={{ textAlign: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '8px', width: '250px' }}>
              <strong>Auditor / Revisor Fiscal</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlConsecutivos;
