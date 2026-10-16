import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

const ActivosBiologicos = ({ tenantId }) => {
  const [activos, setActivos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [periodo, setPeriodo] = useState('2026-05');
  const [selected, setSelected] = useState(null);
  
  // Form fields
  const [valorRazonable, setValorRazonable] = useState('');
  const [deterioro, setDeterioro] = useState('0');
  const [observaciones, setObservaciones] = useState('');

  const fetchActivos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/finanzas-agro/activos-biologicos?tenantId=${tenantId || 1}&periodo=${periodo}`);
      if (!res.ok) throw new Error("Error consultando activos biológicos");
      const result = await res.json();
      setActivos(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivos();
    setSelected(null);
  }, [tenantId, periodo]);

  const handleSelect = (activo) => {
    setSelected(activo);
    setValorRazonable(activo.ultimo_valor_razonable || activo.costo_acumulado || '');
    setDeterioro(activo.deterioro || '0');
    setObservaciones('');
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      const res = await authFetch(`/api/finanzas-agro/activos-biologicos/valorar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_siembra: selected.id_siembra,
          tenantId: tenantId || 1,
          periodo: periodo,
          costo_acumulado: selected.costo_acumulado,
          valor_razonable: parseFloat(valorRazonable),
          deterioro: parseFloat(deterioro),
          observaciones: observaciones
        })
      });
      if (!res.ok) throw new Error("Error al guardar valoración");
      alert("Valoración guardada correctamente");
      fetchActivos();
      setSelected(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  return (
    <div style={{ margin: '20px', background: 'var(--card-bg)', color: 'var(--text)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
      <div style={{ background: 'linear-gradient(90deg, #15803d 0%, #166534 100%)', padding: '24px', color: 'white', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>🌳 Valoración de Activos Biológicos (NIC 41)</h2>
        <p style={{ margin: 0, color: '#bbf7d0' }}>Reconocimiento y medición de cultivos en crecimiento a su Valor Razonable menos costos de venta.</p>
      </div>

      <div style={{ padding: '24px' }}>
        <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, maxWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' }}>Periodo de Cierre (Mes)</label>
            <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', width: '100%' }} />
          </div>
          <div>
            <button onClick={fetchActivos} style={{ background: '#3b82f6', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              {loading ? 'Consultando...' : '🔄 Actualizar Portafolio'}
            </button>
          </div>
        </div>

        {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '24px' }}>
          
          {/* List of Biological Assets */}
          <div style={{ flex: 2 }}>
            <h3 style={{ color: 'var(--text)', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginTop: 0 }}>Portafolio de Siembras Activas</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
              {activos.length === 0 && !loading && <p style={{ color: '#94a3b8' }}>No hay siembras activas en este periodo.</p>}
              
              {activos.map(a => (
                <div 
                  key={a.id_siembra} 
                  onClick={() => handleSelect(a)}
                  style={{ 
                    border: selected?.id_siembra === a.id_siembra ? '2px solid #16a34a' : '1px solid #cbd5e1', 
                    borderRadius: '8px', 
                    padding: '16px', 
                    cursor: 'pointer',
                    background: selected?.id_siembra === a.id_siembra ? 'rgba(22, 163, 74, 0.15)' : 'var(--card-bg)',
                    boxShadow: selected?.id_siembra === a.id_siembra ? '0 4px 6px -1px rgba(22, 163, 74, 0.2)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>{a.lote_nombre}</span>
                    <span style={{ fontSize: '11px', background: 'var(--border)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px' }}>{a.dias_crecimiento} días</span>
                  </div>
                  <div style={{ color: '#166534', fontWeight: '600', marginBottom: '12px' }}>{a.cultivo_nombre}</div>
                  
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Plantas:</span> <span style={{ fontWeight: 'bold' }}>{a.plantas_vivas}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Costo Acumulado:</span> <span style={{ fontWeight: 'bold', color: '#dc2626' }}>{formatCurrency(a.costo_acumulado)}</span>
                  </div>
                  
                  {a.id_valoracion ? (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
                      <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 'bold', textAlign: 'center' }}>
                        ✅ Valorado: {formatCurrency(a.ultimo_valor_razonable)}
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
                      <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 'bold', textAlign: 'center' }}>
                        ⏳ Pendiente por valorar
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Valuation Panel */}
          {selected && (
            <div style={{ flex: 1, background: 'var(--bg-main)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border)', minWidth: '300px' }}>
              <h3 style={{ marginTop: 0, color: 'var(--text)', borderBottom: '1px solid #cbd5e1', paddingBottom: '12px' }}>
                Medición a Valor Razonable
              </h3>
              
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Siembra / Lote Seleccionado:</div>
                <div style={{ fontWeight: 'bold', color: '#7dd3fc' }}>{selected.lote_nombre} ({selected.cultivo_nombre})</div>
              </div>

              <div style={{ marginBottom: '20px', padding: '12px', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: 'bold', marginBottom: '4px' }}>Costo Histórico Acumulado</div>
                <div style={{ fontSize: '18px', color: '#7f1d1d', fontWeight: 'bold' }}>{formatCurrency(selected.costo_acumulado)}</div>
                <div style={{ fontSize: '10px', color: '#b91c1c', marginTop: '4px' }}>Suma de MO, Insumos, Maquinaria, etc.</div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '6px' }}>Valor Razonable Estimado (Mercado)</label>
                <input 
                  type="number" 
                  value={valorRazonable} 
                  onChange={e => setValorRazonable(e.target.value)} 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text)', fontSize: '16px', fontWeight: 'bold', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '6px' }}>Deterioro Detectado (Pérdida por plaga/clima)</label>
                <input 
                  type="number" 
                  value={deterioro} 
                  onChange={e => setDeterioro(e.target.value)} 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: '#dc2626', fontSize: '16px', fontWeight: 'bold', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '6px' }}>Observaciones del Revisor / Ingeniero</label>
                <textarea 
                  value={observaciones} 
                  onChange={e => setObservaciones(e.target.value)} 
                  rows="3"
                  placeholder="Ej. Valorización acorde a peritaje de mercado. Deterioro por granizada..."
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text)', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <button 
                onClick={handleSave} 
                style={{ width: '100%', background: '#16a34a', color: 'white', padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.2)' }}
              >
                💾 Guardar Valoración (NIC 41)
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ActivosBiologicos;
