import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

const ConciliacionBancaria = ({ tenantId }) => {
  const [extractos, setExtractos] = useState([]);
  const [libros, setLibros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [mes, setMes] = useState('2026-05');
  const [selectedExtracto, setSelectedExtracto] = useState(null);
  const [selectedLibro, setSelectedLibro] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, [tenantId, mes]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resExt, resLib] = await Promise.all([
        authFetch(`/api/auditoria/conciliacion/extracto?tenantId=${tenantId || 1}&mes=${mes}`),
        authFetch(`/api/auditoria/conciliacion/libros?tenantId=${tenantId || 1}&mes=${mes}`)
      ]);

      if (!resExt.ok || !resLib.ok) throw new Error("Error fetching data");

      setExtractos(await resExt.json());
      setLibros(await resLib.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConciliar = async () => {
    if (!selectedExtracto || !selectedLibro) {
      alert("Selecciona un movimiento del extracto y un movimiento del libro para conciliar.");
      return;
    }

    // Verify amounts match roughly
    const extMonto = parseFloat(selectedExtracto.abono) > 0 ? parseFloat(selectedExtracto.abono) : parseFloat(selectedExtracto.cargo);
    const libMonto = parseFloat(selectedLibro.debito) > 0 ? parseFloat(selectedLibro.debito) : parseFloat(selectedLibro.credito);

    if (extMonto !== libMonto) {
      if (!window.confirm(`¡Atención! Los montos no coinciden exactamente (Extracto: ${extMonto}, Libro: ${libMonto}). ¿Conciliar de todos modos?`)) {
        return;
      }
    }

    try {
      const res = await authFetch(`/api/auditoria/conciliacion/conciliar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pares: [{ id_extracto: selectedExtracto.id_extracto, id_detalle_contable: selectedLibro.id_detalle }]
        })
      });

      if (!res.ok) throw new Error("Error al conciliar");
      const result = await res.json();
      setSuccessMsg(result.message);
      
      // Reset selection
      setSelectedExtracto(null);
      setSelectedLibro(null);
      
      // Refresh
      fetchData();
      
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  const pendientesExt = extractos.filter(e => e.estado_conciliacion === 'Pendiente');
  const conciliadosExt = extractos.filter(e => e.estado_conciliacion === 'Conciliado');

  return (
    <div style={{ margin: '20px', background: 'var(--card-bg)', color: 'var(--text)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
      <div style={{ background: 'linear-gradient(90deg, #047857 0%, #065f46 100%)', padding: '24px', color: 'white', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>🏦 Conciliación Bancaria</h2>
        <p style={{ margin: 0, color: '#a7f3d0' }}>Cruce automático y manual entre Extractos Bancarios y Libros Auxiliares.</p>
      </div>
      
      <div style={{ padding: '24px' }}>
        <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, maxWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' }}>Mes a Conciliar</label>
            <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', width: '100%' }} />
          </div>
          <div>
            <button onClick={fetchData} style={{ background: '#3b82f6', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              {loading ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>{error}</div>}
        {successMsg && <div style={{ background: '#f0fdf4', color: '#166534', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>{successMsg}</div>}

        <div style={{ display: 'flex', gap: '20px', height: '500px' }}>
          
          {/* Extracto Bancario */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--bg-main)', padding: '12px', borderBottom: '1px solid var(--border)', fontWeight: 'bold', textAlign: 'center' }}>
              Extracto Bancario (Pendientes: {pendientesExt.length})
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              {pendientesExt.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px' }}>No hay movimientos pendientes.</p>}
              {pendientesExt.map(e => (
                <div 
                  key={e.id_extracto} 
                  onClick={() => setSelectedExtracto(e)}
                  style={{ 
                    padding: '12px', 
                    marginBottom: '8px', 
                    borderRadius: '6px', 
                    border: selectedExtracto?.id_extracto === e.id_extracto ? '2px solid #3b82f6' : '1px solid var(--border)',
                    background: selectedExtracto?.id_extracto === e.id_extracto ? 'rgba(59, 130, 246, 0.15)' : 'var(--card-bg)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>{new Date(e.fecha).toLocaleDateString()}</span>
                    <span>Ref: {e.referencia}</span>
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>{e.descripcion}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#dc2626' }}>Cargo: {formatCurrency(e.cargo)}</span>
                    <span style={{ color: '#16a34a' }}>Abono: {formatCurrency(e.abono)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botón de Conciliar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button 
              onClick={handleConciliar}
              disabled={!selectedExtracto || !selectedLibro}
              style={{ 
                background: (!selectedExtracto || !selectedLibro) ? '#cbd5e1' : '#10b981', 
                color: 'white', 
                border: 'none', 
                borderRadius: '50%', 
                width: '60px', 
                height: '60px', 
                cursor: (!selectedExtracto || !selectedLibro) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}
              title="Vincular registros seleccionados"
            >
              🔗
            </button>
          </div>

          {/* Libros Auxiliares */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--bg-main)', padding: '12px', borderBottom: '1px solid var(--border)', fontWeight: 'bold', textAlign: 'center' }}>
              Libros Contables (Pendientes: {libros.length})
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              {libros.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px' }}>Todos los registros contables de bancos están conciliados.</p>}
              {libros.map(l => (
                <div 
                  key={l.id_detalle} 
                  onClick={() => setSelectedLibro(l)}
                  style={{ 
                    padding: '12px', 
                    marginBottom: '8px', 
                    borderRadius: '6px', 
                    border: selectedLibro?.id_detalle === l.id_detalle ? '2px solid #3b82f6' : '1px solid var(--border)',
                    background: selectedLibro?.id_detalle === l.id_detalle ? 'rgba(59, 130, 246, 0.15)' : 'var(--card-bg)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>{new Date(l.fecha).toLocaleDateString()}</span>
                    <span>Doc: {l.numero_doc}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>{l.cuenta_codigo} - {l.cuenta_nombre}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>{l.concepto}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    {parseFloat(l.debito) > 0 ? (
                      <span style={{ color: '#16a34a' }}>Débito (Ingreso): {formatCurrency(l.debito)}</span>
                    ) : (
                      <span style={{ color: '#dc2626' }}>Crédito (Salida): {formatCurrency(l.credito)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>

        <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
          <div>Total Extracto Conciliado: {conciliadosExt.length} registros</div>
          <div>Progreso: {extractos.length > 0 ? Math.round((conciliadosExt.length / extractos.length) * 100) : 0}%</div>
        </div>

      </div>
    </div>
  );
};

export default ConciliacionBancaria;
