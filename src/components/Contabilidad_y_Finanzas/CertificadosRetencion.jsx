import React, { useState } from 'react';

function CertificadosRetencion() {
  const [filtros, setFiltros] = useState({ nit: '', anio: '2026', tipo: 'retefuente' });

  return (
    <div className="p-4 dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--primary)', margin: 0 }}>📜 Certificados de Retención</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ background: '#ef4444', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📄 Generar PDF</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px', padding: '15px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tercero (NIT o Razón Social)</label>
          <input type="text" placeholder="Ej: 800123456" value={filtros.nit} onChange={(e) => setFiltros({ ...filtros, nit: e.target.value })} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', width: '250px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Año Gravable</label>
          <select value={filtros.anio} onChange={(e) => setFiltros({ ...filtros, anio: e.target.value })} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tipo de Retención</label>
          <select value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
            <option value="retefuente">Retención en la Fuente</option>
            <option value="reteiva">Retención de IVA</option>
            <option value="reteica">Retención de ICA</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <button style={{ background: 'var(--primary)', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Procesar</button>
        </div>
      </div>

      <div className="card" style={{ padding: '40px', background: 'var(--card-bg)', color: 'var(--text)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ margin: 0 }}>CERTIFICADO DE RETENCIÓN EN LA FUENTE</h2>
          <p style={{ margin: '5px 0 0 0' }}>Por el Año Gravable {filtros.anio}</p>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <p><strong>AGENTE RETENEDOR:</strong> AgroPaccioli - NIT 900.123.456-7</p>
          <p><strong>DIRECCIÓN:</strong> Vereda El Sol, Finca La Esperanza</p>
        </div>
        <p>Certificamos que durante el año {filtros.anio} practicamos las siguientes retenciones en la fuente a nombre de:</p>
        <div style={{ marginBottom: '20px' }}>
          <p><strong>CONTRIBUYENTE:</strong> {filtros.nit || '[Ingrese NIT para buscar]'}</p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginTop: '20px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-main)' }}>
              <th style={{ border: '1px solid var(--border)', padding: '10px', textAlign: 'left' }}>Concepto de Retención</th>
              <th style={{ border: '1px solid var(--border)', padding: '10px', textAlign: 'center' }}>%</th>
              <th style={{ border: '1px solid var(--border)', padding: '10px', textAlign: 'right' }}>Monto Base</th>
              <th style={{ border: '1px solid var(--border)', padding: '10px', textAlign: 'right' }}>Valor Retenido</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid var(--border)', padding: '10px' }}>Honorarios</td>
              <td style={{ border: '1px solid var(--border)', padding: '10px', textAlign: 'center' }}>11%</td>
              <td style={{ border: '1px solid var(--border)', padding: '10px', textAlign: 'right' }}>$ 5.000.000</td>
              <td style={{ border: '1px solid var(--border)', padding: '10px', textAlign: 'right' }}>$ 550.000</td>
            </tr>
            <tr style={{ fontWeight: 'bold', background: 'var(--bg-main)' }}>
              <td colSpan="3" style={{ border: '1px solid var(--border)', padding: '10px', textAlign: 'right' }}>TOTAL:</td>
              <td style={{ border: '1px solid var(--border)', padding: '10px', textAlign: 'right' }}>$ 550.000</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '50px', textAlign: 'center' }}>
          <p>_____________________________________</p>
          <p><strong>Firma Agente Retenedor</strong></p>
        </div>
      </div>
    </div>
  );
}

export default CertificadosRetencion;
