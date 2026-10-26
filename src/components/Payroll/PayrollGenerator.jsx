import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/format';
import './Payroll.css';
import { authFetch } from '../../utils/api';

function PayrollGenerator({ tenantId }) {
  const [planillas, setPlanillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  const [formAnio, setFormAnio] = useState(new Date().getFullYear());
  const [formSemana, setFormSemana] = useState(1);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchPlanillas = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/nomina/planillas?tenantId=${tenantId || 1}`);
      const data = await res.json();
      setPlanillas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast('❌ Error cargando planillas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanillas();
  }, [tenantId]);

  const handleGenerar = async () => {
    showToast('⏳ Generando planilla semanal...');
    try {
      const res = await authFetch(`/api/nomina/planillas/generar-semana`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anio: formAnio, semana: formSemana, tenantId: tenantId || 1 })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('✅ Planilla generada exitosamente.');
        fetchPlanillas();
      } else {
        showToast(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      showToast('❌ Error de conexión al generar.');
    }
  };

  const handleAprobar = async (id_planilla) => {
    showToast('⏳ Aprobando planilla...');
    try {
      const res = await authFetch(`/api/nomina/planillas/${id_planilla}/approve`, {
        method: 'PUT'
      });
      if (res.ok) {
        showToast('✅ Planilla aprobada.');
        fetchPlanillas();
      } else {
        showToast(`❌ Error aprobando planilla.`);
      }
    } catch (err) {
      showToast('❌ Error de conexión.');
    }
  };

  const handleContabilizar = async (id_planilla) => {
    showToast('⏳ Integrando a Contabilidad...');
    try {
      const res = await authFetch(`/api/nomina/planillas/${id_planilla}/contabilizar`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ ${data.message} (Comp #${data.id_comprobante})`);
        fetchPlanillas();
      } else {
        showToast(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      showToast('❌ Error de conexión.');
    }
  };

  return (
    <div className="payroll-generator glass-card" style={{ padding: '20px', borderRadius: 'var(--radius)', background: 'var(--card-bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>💸 Generador de Nómina (Planilla Semanal)</h2>
        <button className="btn-filled" onClick={fetchPlanillas}>🔄 Refrescar</button>
      </div>

      <div style={{ background: 'var(--bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '20px' }}>
        <h3>⚙️ Nuevo Cálculo de Planilla</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
          El motor de nómina calculará el valor devengado (según salario base) y restará las deducciones de ley para generar la pre-liquidación semanal.
        </p>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Año:</label>
            <input 
              type="number" 
              value={formAnio} 
              onChange={e => setFormAnio(Number(e.target.value))}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Semana del Año:</label>
            <input 
              type="number" 
              value={formSemana} 
              onChange={e => setFormSemana(Number(e.target.value))}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}
            />
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button className="btn-filled" onClick={handleGenerar}>🚀 Generar Nómina Semanal</button>
          </div>
        </div>
      </div>

      <h3>📜 Historial de Planillas</h3>
      {loading ? <p>Cargando planillas...</p> : planillas.length === 0 ? <p>No hay planillas generadas.</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="premium-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '10px' }}>ID</th>
                <th style={{ padding: '10px' }}>Periodo</th>
                <th style={{ padding: '10px' }}>Fechas</th>
                <th style={{ padding: '10px' }}>Salarios</th>
                <th style={{ padding: '10px' }}>Deducciones</th>
                <th style={{ padding: '10px' }}>Total a Pagar (Neto)</th>
                <th style={{ padding: '10px' }}>Estado</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {planillas.map(p => (
                <tr key={p.id_planilla} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px' }}>#{p.id_planilla}</td>
                  <td style={{ padding: '10px' }}><strong>{p.anio} - Semana {p.semana_numero}</strong></td>
                  <td style={{ padding: '10px', fontSize: '12px' }}>{new Date(p.fecha_inicio).toLocaleDateString()} a {new Date(p.fecha_fin).toLocaleDateString()}</td>
                  <td style={{ padding: '10px' }}>{formatCurrency(p.total_salarios)}</td>
                  <td style={{ padding: '10px', color: 'red' }}>-{formatCurrency(p.total_deducciones)}</td>
                  <td style={{ padding: '10px', color: 'green', fontWeight: 'bold' }}>{formatCurrency(p.total_neto)}</td>
                  <td style={{ padding: '10px' }}>
                    <span className={`badge ${p.estado === 'Borrador' ? 'gray' : p.estado === 'Aprobada' ? 'blue' : p.estado === 'Contabilizada' ? 'green' : 'orange'}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    {p.estado === 'Borrador' && (
                      <button className="btn-outline" onClick={() => handleAprobar(p.id_planilla)}>✅ Aprobar</button>
                    )}
                    {p.estado === 'Aprobada' && (
                      <button className="btn-action green" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleContabilizar(p.id_planilla)}>Integrar Contabilidad</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TOAST */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px', background: 'var(--primary)', color: 'white', 
          padding: '12px 24px', borderRadius: '8px', zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', fontWeight: 'bold'
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default PayrollGenerator;
