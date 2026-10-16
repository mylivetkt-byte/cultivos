import React, { useState, useEffect } from 'react';
import { Key, DollarSign, Clock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authFetch } from '../../utils/api';
import Pagination from '../Pagination';

function POSArqueo() {
  const { tenantId, user } = useAuth();
  const [arqueoActivo, setArqueoActivo] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [saldoInicialInput, setSaldoInicialInput] = useState('');
  const [turnoInput, setTurnoInput] = useState('General');
  const [saldoRealInput, setSaldoRealInput] = useState('');
  const [desglose, setDesglose] = useState({
    efectivo: 0, credito: 0, bancos: 0, tc: 0, td: 0, nequi: 0, otros: 0,
    ingresosAdicionales: 0, egresosCaja: 0
  });
  const [showCierre, setShowCierre] = useState(false);
  
  // Retiros (Sangrías)
  const [showRetiro, setShowRetiro] = useState(false);
  const [retiroData, setRetiroData] = useState({ monto: '', observaciones: '', clave: '' });
  const [listaRetiros, setListaRetiros] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [resumenTurno, setResumenTurno] = useState(null);

  const fetchArqueoEstado = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await authFetch(`/api/pos/arqueo/estado/${user.id_usuario}?tenantId=${tenantId || 1}`);
      const data = await res.json();
      if (data.success) {
        setArqueoActivo(data.arqueo || null);
        if (data.arqueo) {
          fetchRetiros(data.arqueo.id_arqueo);
          fetchResumen(data.arqueo.id_arqueo);
        }
      } else {
        setErrorMsg(data.error || 'Error al consultar estado de arqueo.');
      }
    } catch (e) {
      setErrorMsg('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const fetchResumen = async (id_arqueo) => {
    try {
      const res = await authFetch(`/api/pos/arqueo/${id_arqueo}/resumen`);
      const data = await res.json();
      if (data.success) {
        setResumenTurno(data.resumen);
      }
    } catch (e) {
      console.error('Error fetching resumen:', e);
    }
  };

  const fetchHistorial = async () => {
    try {
      const res = await authFetch(`/api/pos/arqueo/historial?tenantId=${tenantId || 1}&id_usuario=${user.id_usuario}`);
      const data = await res.json();
      if (data.success) {
        setHistorial(data.arqueos || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRetiros = async (id_arqueo) => {
    try {
      const res = await authFetch(`/api/pos/retiros/arqueo/${id_arqueo}`);
      const data = await res.json();
      if (data.success) {
        setListaRetiros(data.retiros || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchArqueoEstado();
      fetchHistorial();
    }
  }, [user]);

  const handleApertura = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await authFetch('/api/pos/arqueo/apertura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenantId || 1,
          id_usuario: user.id_usuario,
          turno: turnoInput,
          saldo_inicial: parseFloat(saldoInicialInput) || 0
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaldoInicialInput('');
        fetchArqueoEstado();
        fetchHistorial();
      } else {
        setErrorMsg(data.error || 'Error al abrir caja.');
      }
    } catch (err) {
      setErrorMsg('Error de conexión.');
    }
  };

  const handleCierre = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!arqueoActivo) return;
    try {
      const totalReal = Number(desglose.efectivo) + Number(desglose.bancos) + Number(desglose.tc) + Number(desglose.td) + Number(desglose.nequi) + Number(desglose.otros);
      
      const res = await authFetch('/api/pos/arqueo/cierre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_arqueo: arqueoActivo.id_arqueo,
          saldo_final_real: totalReal,
          ventas_efectivo: Number(desglose.efectivo),
          ventas_credito: Number(desglose.credito),
          ventas_bancos: Number(desglose.bancos),
          ventas_tc: Number(desglose.tc),
          ventas_td: Number(desglose.td),
          ventas_nequi: Number(desglose.nequi),
          ventas_otros: Number(desglose.otros),
          ingresos_adicionales: Number(desglose.ingresosAdicionales),
          egresos_caja: Number(desglose.egresosCaja)
        })
      });
      const data = await res.json();
      if (data.success) {
        const arq = data.arqueo;
        const diffColor = arq.diferencia >= 0 ? '#10b981' : '#ef4444';
        alert(`Caja cerrada exitosamente.\n\nSaldo inicial: $${Number(arq.saldo_inicial).toLocaleString()}\nVentas efectivo: $${Number(arq.total_ventas_efectivo).toLocaleString()}\nIngresos Adicionales: $${Number(desglose.ingresosAdicionales).toLocaleString()}\nPagos a Proveedores: $${Number(desglose.egresosCaja).toLocaleString()}\nSaldo sistema: $${Number(arq.saldo_final_sistema).toLocaleString()}\nSaldo real reportado: $${Number(arq.saldo_final_real).toLocaleString()}\nDiferencia: $${Number(arq.diferencia).toLocaleString()}`);
        window.location.href = '/comercializacion/pos';
      } else {
        setErrorMsg(data.error || 'Error al cerrar caja.');
      }
    } catch (err) {
      setErrorMsg('Error de conexión con el servidor.');
    }
  };

  const handleRetiro = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await authFetch('/api/pos/retiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_arqueo: arqueoActivo.id_arqueo,
          monto: Number(retiroData.monto),
          observaciones: retiroData.observaciones,
          clave_supervisor: retiroData.clave
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Retiro registrado exitosamente. Ticket #${data.id_retiro}`);
        
        // Formato para ticket
        const ticket = `
=================================
       RETIRO DE EFECTIVO
=================================
Ticket Nro: ${data.id_retiro}
Fecha: ${new Date().toLocaleString()}
Caja: ${arqueoActivo.caja_nombre || 'Principal'}
Cajero: ${user.username}

Monto Retirado: $${Number(retiroData.monto).toLocaleString()}
Obs: ${retiroData.observaciones}

_________________________________
       Firma Supervisor
=================================
        `;
        
        console.log(ticket);
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<pre>${ticket}</pre><script>window.print();window.close();</script>`);
        
        setShowRetiro(false);
        setRetiroData({ monto: '', observaciones: '', clave: '' });
        fetchRetiros(arqueoActivo.id_arqueo);
      } else {
        setErrorMsg(data.error || 'Error al registrar el retiro.');
      }
    } catch (err) {
      setErrorMsg('Error de conexión.');
    }
  };

  const cardStyle = {
    background: '#1e293b',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '24px'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    background: '#0f172a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px'
  };

  if (loading) {
    return <div style={{ color: '#94a3b8', padding: '40px', textAlign: 'center' }}>Cargando estado de caja...</div>;
  }

  return (
    <div style={{ padding: '20px', color: '#fff', background: '#0f172a', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Key size={24} style={{ color: '#38bdf8' }} />
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Arqueo de Caja</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Apertura, cierre y conciliación de turnos de caja POS</p>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#fca5a5', fontSize: '13px' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>

        {/* Estado Actual */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {arqueoActivo ? <CheckCircle size={18} style={{ color: '#10b981' }} /> : <Clock size={18} style={{ color: '#f59e0b' }} />}
            Estado Actual
          </h3>

          {arqueoActivo ? (
            <div>
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 600, marginBottom: '8px' }}>✅ Caja Abierta</div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span><strong>Turno desde:</strong> {new Date(arqueoActivo.fecha_apertura).toLocaleString()} ({arqueoActivo.turno || 'General'})</span>
                  <span><strong>Saldo inicial:</strong> ${Number(arqueoActivo.saldo_inicial).toLocaleString()} COP</span>
                  <span><strong>Cajero:</strong> {user.username}</span>
                </div>
              </div>

              {listaRetiros.length > 0 && (
                <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#f59e0b', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Retiros Parciales / Sangrías</span>
                    <span>Total: ${listaRetiros.reduce((acc, r) => acc + Number(r.monto), 0).toLocaleString()}</span>
                  </h4>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {listaRetiros.map(r => (
                      <li key={r.id_retiro} style={{ fontSize: '12px', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '6px 0' }}>
                        <span>{new Date(r.fecha_retiro).toLocaleTimeString()} - {r.observaciones}</span>
                        <strong style={{ color: '#fca5a5' }}>-${Number(r.monto).toLocaleString()}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!showCierre && !showRetiro && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setShowRetiro(true)}
                    style={{
                      flex: 1, padding: '12px', background: '#f59e0b', color: '#fff',
                      border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
                    }}
                  >
                    Retirar Efectivo
                  </button>
                  <button
                    onClick={() => setShowCierre(true)}
                    style={{
                      flex: 1, padding: '12px', background: '#ef4444', color: '#fff',
                      border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
                    }}
                  >
                    Cerrar Caja
                  </button>
                </div>
              )}

              {showRetiro && (
                <form onSubmit={handleRetiro} style={{ background: 'rgba(245,158,11,0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)', marginBottom: '15px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#f59e0b' }}>Retiro de Efectivo (Sangría)</h4>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Monto a retirar</label>
                  <input type="number" required min="1" value={retiroData.monto} onChange={e => setRetiroData({...retiroData, monto: e.target.value})} style={{...inputStyle, marginBottom: '10px'}} />
                  
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Observaciones / Entregado a</label>
                  <input type="text" required value={retiroData.observaciones} onChange={e => setRetiroData({...retiroData, observaciones: e.target.value})} style={{...inputStyle, marginBottom: '10px'}} />
                  
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Clave de Supervisor</label>
                  <input type="password" required value={retiroData.clave} onChange={e => setRetiroData({...retiroData, clave: e.target.value})} style={{...inputStyle, marginBottom: '15px'}} />
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" style={{ flex: 1, padding: '10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      Autorizar e Imprimir
                    </button>
                    <button type="button" onClick={() => setShowRetiro(false)} style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}>
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {showCierre && (
                <form onSubmit={handleCierre}>
                  {resumenTurno && (
                    <div style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#38bdf8' }}>Resumen del Sistema (Esperado)</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Base Inicial:</span> <strong>${Number(resumenTurno.saldo_inicial).toLocaleString()}</strong></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>+ Ventas Efectivo:</span> <strong>${Number(resumenTurno.ventas_efectivo).toLocaleString()}</strong></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>- Retiros (Sangrías):</span> <strong>${Number(resumenTurno.total_retiros).toLocaleString()}</strong></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>+ Otros Medios (Banco/TC/TD):</span> <strong>${(Number(resumenTurno.ventas_bancos) + Number(resumenTurno.ventas_tc) + Number(resumenTurno.ventas_td) + Number(resumenTurno.ventas_nequi)).toLocaleString()}</strong></div>
                      </div>
                      <div style={{ borderTop: '1px solid rgba(56,189,248,0.2)', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>
                        <span>Total Efectivo Esperado en Cajón:</span>
                        <span>${(Number(resumenTurno.saldo_inicial) + Number(resumenTurno.ventas_efectivo) - Number(resumenTurno.total_retiros)).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Efectivo (Billetes+Monedas)</label>
                      <input type="number" required min="0" value={desglose.efectivo} onChange={e => setDesglose({...desglose, efectivo: e.target.value})} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Crédito (A clientes)</label>
                      <input type="number" required min="0" value={desglose.credito} onChange={e => setDesglose({...desglose, credito: e.target.value})} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Transferencias Banco</label>
                      <input type="number" required min="0" value={desglose.bancos} onChange={e => setDesglose({...desglose, bancos: e.target.value})} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Nequi / Daviplata</label>
                      <input type="number" required min="0" value={desglose.nequi} onChange={e => setDesglose({...desglose, nequi: e.target.value})} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Tarjeta Crédito</label>
                      <input type="number" required min="0" value={desglose.tc} onChange={e => setDesglose({...desglose, tc: e.target.value})} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Tarjeta Débito</label>
                      <input type="number" required min="0" value={desglose.td} onChange={e => setDesglose({...desglose, td: e.target.value})} style={inputStyle} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Otros (Cheques, Bonos...)</label>
                      <input type="number" required min="0" value={desglose.otros} onChange={e => setDesglose({...desglose, otros: e.target.value})} style={inputStyle} />
                    </div>
                  </div>
                  
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '10px', paddingTop: '15px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#38bdf8', marginBottom: '4px', fontWeight: 'bold' }}>+ Ingresos Adicionales</label>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>Base extra, cambio recibido, etc.</div>
                      <input type="number" required min="0" value={desglose.ingresosAdicionales} onChange={e => setDesglose({...desglose, ingresosAdicionales: e.target.value})} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#f87171', marginBottom: '4px', fontWeight: 'bold' }}>- Pagos / Egresos de Caja</label>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>Pago a proveedores, gastos diarios.</div>
                      <input type="number" required min="0" value={desglose.egresosCaja} onChange={e => setDesglose({...desglose, egresosCaja: e.target.value})} style={inputStyle} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="submit"
                      style={{
                        flex: 1, padding: '10px', background: '#ef4444', color: '#fff',
                        border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                      }}
                    >
                      Confirmar Cierre
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCierre(false)}
                      style={{
                        padding: '10px 16px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div>
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 600, marginBottom: '4px' }}>🔒 Caja Cerrada</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  No hay un turno de caja activo. Abre uno nuevo para comenzar a vender.
                </div>
              </div>
              <form onSubmit={handleApertura}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Turno de Caja
                </label>
                <select
                  value={turnoInput}
                  onChange={(e) => setTurnoInput(e.target.value)}
                  style={{ ...inputStyle, marginBottom: '12px' }}
                >
                  <option value="General">General (Todo el día)</option>
                  <option value="Mañana">Mañana (6 AM - 2 PM)</option>
                  <option value="Tarde">Tarde (2 PM - 10 PM)</option>
                  <option value="Noche">Noche (10 PM - 6 AM)</option>
                </select>

                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Saldo Inicial Efectivo (COP)
                </label>
                <input
                  type="number"
                  value={saldoInicialInput}
                  onChange={(e) => setSaldoInicialInput(e.target.value)}
                  placeholder="Ej: 150000"
                  style={{ ...inputStyle, marginBottom: '12px' }}
                  required
                />
                <button
                  type="submit"
                  style={{
                    width: '100%', padding: '12px', background: '#38bdf8', color: '#0f172a',
                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
                  }}
                >
                  Abrir Caja
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Resumen Rápido */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={18} style={{ color: '#10b981' }} />
            Resumen de Turnos Recientes
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {historial.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                No hay arqueos registrados aún.
              </p>
            ) : (
              historial.slice(0, 5).map((arq, idx) => {
                const diff = Number(arq.diferencia || 0);
                return (
                  <div key={arq.id_arqueo || idx} style={{
                    background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '12px',
                    border: `1px solid ${diff === 0 ? 'rgba(16,185,129,0.2)' : diff > 0 ? 'rgba(56,189,248,0.2)' : 'rgba(239,68,68,0.2)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>
                        {new Date(arq.fecha_apertura).toLocaleDateString()} - {arq.turno || 'General'}
                        <span style={{ color: '#64748b', fontWeight: 400, marginLeft: '8px' }}>
                          {new Date(arq.fecha_apertura).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {arq.fecha_cierre && ` → ${new Date(arq.fecha_cierre).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </span>
                      </span>
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                        background: arq.estado === 'Abierta' ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.1)',
                        color: arq.estado === 'Abierta' ? '#10b981' : '#94a3b8'
                      }}>
                        {arq.estado}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' }}>
                      <span>Inicial: ${Number(arq.saldo_inicial).toLocaleString()}</span>
                      {arq.estado === 'Cerrada' && (
                        <span style={{ color: diff === 0 ? '#10b981' : diff > 0 ? '#38bdf8' : '#ef4444' }}>
                          {diff === 0 ? '✓ Cuadra' : `Dif: $${diff.toLocaleString()}`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Historial Completo */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} style={{ color: '#94a3b8' }} />
            Historial Completo de Arqueos
          </h3>
          <button
            onClick={fetchHistorial}
            style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
          >
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>

        {historial.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '30px' }}>Sin registros de arqueo.</p>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Fecha Apertura</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Fecha Cierre</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px' }}>Saldo Inicial</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px' }}>Saldo Sistema</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px' }}>Saldo Real</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px' }}>Diferencia</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {historial.slice((currentPage - 1) * 20, currentPage * 20).map((arq) => {
                  const diff = Number(arq.diferencia || 0);
                  return (
                    <tr key={arq.id_arqueo} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '10px 8px' }}>{new Date(arq.fecha_apertura).toLocaleString()}</td>
                      <td style={{ padding: '10px 8px' }}>{arq.fecha_cierre ? new Date(arq.fecha_cierre).toLocaleString() : '—'}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>${Number(arq.saldo_inicial).toLocaleString()}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>${Number(arq.saldo_final_sistema || 0).toLocaleString()}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>${Number(arq.saldo_final_real || 0).toLocaleString()}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: diff === 0 ? '#10b981' : diff > 0 ? '#38bdf8' : '#ef4444' }}>
                        {arq.estado === 'Cerrada' ? `$${diff.toLocaleString()}` : '—'}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                          background: arq.estado === 'Abierta' ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.1)',
                          color: arq.estado === 'Abierta' ? '#10b981' : '#94a3b8'
                        }}>
                          {arq.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {historial.length > 0 && (
              <Pagination 
                currentPage={currentPage}
                totalItems={historial.length}
                pageSize={20}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default POSArqueo;
