import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

function ConciliacionFiscal() {
  const [filtros, setFiltros] = useState({ anio: '2026' });
  const [conciliacionData, setConciliacionData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchConciliacion = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/contabilidad/conciliacion-fiscal?anio=${filtros.anio}`);
      if (res.ok) {
        const data = await res.json();
        setConciliacionData(data);
      }
    } catch (err) {
      console.error('Error cargando conciliacion fiscal:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConciliacion();
  }, [filtros.anio]);

  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="p-4 dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--primary)', margin: 0 }}>⚖️ Conciliación Fiscal (NIIF vs Local)</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ background: '#10b981', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📊 Exportar Formato 2516</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px', padding: '15px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Año a Conciliar</label>
          <select value={filtros.anio} onChange={(e) => setFiltros({ ...filtros, anio: e.target.value })} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <button onClick={fetchConciliacion} disabled={loading} style={{ background: 'var(--primary)', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {loading ? 'Consultando BD...' : 'Procesar Conciliación'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '15px' }}>Diferencias temporarias y permanentes entre el marco normativo contable (NIIF) y las bases fiscales (Datos reales de Base de Datos).</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--border)', color: 'var(--text)' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Cuenta Contable</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Saldo Contable (NIIF)</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Saldo Fiscal (DIAN)</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Diferencia</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Observación / Causa</th>
            </tr>
          </thead>
          <tbody>
            {conciliacionData.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {loading ? 'Cargando datos contables desde MySQL...' : 'No se encontraron diferencias contables registradas para el periodo.'}
                </td>
              </tr>
            ) : (
              conciliacionData.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px', color: 'var(--text)' }}>{row.cuenta}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: 'var(--text)' }}>{formatCurrency(row.saldoNIIF)}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: 'var(--text)' }}>{formatCurrency(row.saldoFiscal)}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: row.diferencia > 0 ? '#ef4444' : 'inherit' }}>{formatCurrency(row.diferencia)}</td>
                  <td style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '11px' }}>{row.observacion}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ConciliacionFiscal;
