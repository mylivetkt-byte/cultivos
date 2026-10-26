import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

function AuditoriaExogena() {
  const [filtros, setFiltros] = useState({ formato: '1001', vigencia: '2026' });
  const [exogenaData, setExogenaData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchExogena = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/contabilidad/auditoria-exogena?formato=${filtros.formato}&vigencia=${filtros.vigencia}`);
      if (res.ok) {
        const data = await res.json();
        setExogenaData(data);
      }
    } catch (err) {
      console.error('Error cargando auditoria exogena:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExogena();
  }, [filtros.formato, filtros.vigencia]);

  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="p-4 dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--primary)', margin: 0 }}>🧾 Auditoría Información Exógena (DIAN)</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ background: '#10b981', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Generar XML DIAN</button>
          <button style={{ background: '#3b82f6', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Exportar Excel</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px', padding: '15px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Formato</label>
          <select value={filtros.formato} onChange={(e) => setFiltros({ ...filtros, formato: e.target.value })} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
            <option value="1001">1001 - Pagos y Retenciones</option>
            <option value="1003">1003 - Retenciones que le practicaron</option>
            <option value="1005">1005 - IVA Descontable</option>
            <option value="1007">1007 - Ingresos Recibidos</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Vigencia Fiscal</label>
          <select value={filtros.vigencia} onChange={(e) => setFiltros({ ...filtros, vigencia: e.target.value })} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <button onClick={fetchExogena} disabled={loading} style={{ background: 'var(--primary)', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {loading ? 'Consultando BD...' : 'Procesar'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '15px' }}>Vista previa de la pre-validación del prevalidador de la DIAN (Datos reales de Base de Datos).</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--border)', color: 'var(--text)' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Concepto</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>NIT / CC</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Razón Social</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Pago o Abono Cta</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Retención Practicada</th>
            </tr>
          </thead>
          <tbody>
            {exogenaData.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {loading ? 'Consultando registros contables en MySQL...' : 'No se registraron movimientos exógenos para este formato y vigencia.'}
                </td>
              </tr>
            ) : (
              exogenaData.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', color: 'var(--text)' }}>{row.concepto}</td>
                  <td style={{ padding: '10px', color: 'var(--text)' }}>{row.nit}</td>
                  <td style={{ padding: '10px', color: 'var(--text)' }}>{row.nombre}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: 'var(--text)' }}>{formatCurrency(row.pago)}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#ef4444' }}>{formatCurrency(row.retencion)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AuditoriaExogena;
