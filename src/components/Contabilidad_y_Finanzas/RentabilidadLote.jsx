import React, { useState } from 'react';

function RentabilidadLote() {
  const [filtros, setFiltros] = useState({ finca: '', lote: '', cosecha: '' });

  const mockData = [
    { concepto: 'Preparación de Suelo', costo: 1500000, ingreso: 0 },
    { concepto: 'Siembra', costo: 2300000, ingreso: 0 },
    { concepto: 'Fertilización', costo: 4100000, ingreso: 0 },
    { concepto: 'Mantenimiento (Malezas, Riego)', costo: 1800000, ingreso: 0 },
    { concepto: 'Cosecha (Mano de Obra)', costo: 3200000, ingreso: 0 },
    { concepto: 'Venta de Cosecha (Primera)', costo: 0, ingreso: 18500000 },
    { concepto: 'Venta de Cosecha (Segunda)', costo: 0, ingreso: 4200000 }
  ];

  const totalCosto = mockData.reduce((acc, row) => acc + row.costo, 0);
  const totalIngreso = mockData.reduce((acc, row) => acc + row.ingreso, 0);
  const utilidad = totalIngreso - totalCosto;
  const margen = totalIngreso > 0 ? ((utilidad / totalIngreso) * 100).toFixed(1) : 0;

  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="p-4 dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--primary)', margin: 0 }}>🌾 Rentabilidad Agro-Financiera por Lote</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ background: '#10b981', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📊 Excel</button>
          <button style={{ background: '#ef4444', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📄 PDF</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px', padding: '15px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Finca</label>
          <select value={filtros.finca} onChange={(e) => setFiltros({ ...filtros, finca: e.target.value })} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
            <option value="">Seleccione Finca</option>
            <option value="1">Hacienda El Sol</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Lote</label>
          <select value={filtros.lote} onChange={(e) => setFiltros({ ...filtros, lote: e.target.value })} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
            <option value="">Seleccione Lote</option>
            <option value="1">Lote Norte 1 (Café)</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cosecha / Ciclo</label>
          <select value={filtros.cosecha} onChange={(e) => setFiltros({ ...filtros, cosecha: e.target.value })} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
            <option value="">Seleccione Ciclo</option>
            <option value="1">Ciclo 2026-A</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <button style={{ background: 'var(--primary)', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Procesar</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderLeft: '5px solid #ef4444' }}>
          <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '14px' }}>Costos Totales</h4>
          <h2 style={{ color: '#ef4444', margin: 0 }}>{formatCurrency(totalCosto)}</h2>
        </div>
        <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderLeft: '5px solid #10b981' }}>
          <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '14px' }}>Ingresos Totales</h4>
          <h2 style={{ color: '#10b981', margin: 0 }}>{formatCurrency(totalIngreso)}</h2>
        </div>
        <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderLeft: '5px solid #3b82f6' }}>
          <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '14px' }}>Utilidad Bruta</h4>
          <h2 style={{ color: '#3b82f6', margin: 0 }}>{formatCurrency(utilidad)}</h2>
        </div>
        <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderLeft: '5px solid #8b5cf6' }}>
          <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '14px' }}>Margen (%)</h4>
          <h2 style={{ color: '#8b5cf6', margin: 0 }}>{margen}%</h2>
        </div>
      </div>

      <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--border)', color: 'var(--text)' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Concepto (Labor/Venta)</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Costos (Cta 7)</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Ingresos (Cta 4)</th>
            </tr>
          </thead>
          <tbody>
            {mockData.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px', color: 'var(--text)' }}>{row.concepto}</td>
                <td style={{ padding: '10px', textAlign: 'right', color: row.costo > 0 ? '#ef4444' : 'inherit' }}>{row.costo > 0 ? formatCurrency(row.costo) : '-'}</td>
                <td style={{ padding: '10px', textAlign: 'right', color: row.ingreso > 0 ? '#10b981' : 'inherit' }}>{row.ingreso > 0 ? formatCurrency(row.ingreso) : '-'}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 'bold', background: 'rgba(0,0,0,0.02)' }}>
              <td style={{ padding: '10px', textAlign: 'right' }}>TOTAL:</td>
              <td style={{ padding: '10px', textAlign: 'right', color: '#ef4444' }}>{formatCurrency(totalCosto)}</td>
              <td style={{ padding: '10px', textAlign: 'right', color: '#10b981' }}>{formatCurrency(totalIngreso)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RentabilidadLote;
