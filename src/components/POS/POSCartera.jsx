import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authFetch } from '../../utils/api';
import { Wallet, Search, CheckCircle, Clock, AlertTriangle, FileText, Plus, X } from 'lucide-react';
import Pagination from '../Pagination';

export default function POSCartera() {
  const { tenantId, user } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Abono Modal
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [abonoForm, setAbonoForm] = useState({
    monto: '',
    tipo_pago: 'Contado',
    referencia: ''
  });

  useEffect(() => {
    // Cargar lista de clientes para el buscador
    const loadClientes = async () => {
      try {
        const res = await authFetch(`/api/table/terceros/data?tenantId=${tenantId || 1}&pageSize=1000`);
        const data = await res.json();
        if (data.data) {
          setClientes(data.data.filter(c => c.es_cliente === 1));
        }
      } catch (e) {
        console.error("Error cargando clientes", e);
      }
    };
    loadClientes();
  }, [tenantId]);

  const loadCartera = async (cliente) => {
    if (!cliente) {
      setFacturas([]);
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch(`/api/pos/cartera/${cliente.id_tercero}?tenantId=${tenantId || 1}`);
      const data = await res.json();
      if (data.success) {
        setFacturas(data.data);
        setCurrentPage(1);
      } else {
        alert(data.error || 'Error cargando cartera');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión');
    }
    setLoading(false);
  };

  const handleSelectCliente = (cliente) => {
    setSelectedCliente(cliente);
    setSearchQuery('');
    loadCartera(cliente);
  };

  const handleRegistrarAbono = async (e) => {
    e.preventDefault();
    const monto = parseFloat(abonoForm.monto);
    if (!monto || monto <= 0) return alert('Monto inválido');
    
    try {
      const payload = {
        tenantId: tenantId || 1,
        id_tercero: selectedCliente.id_tercero,
        id_usuario: user.id_usuario,
        monto: monto,
        tipo_pago: abonoForm.tipo_pago,
        referencia: abonoForm.referencia
      };

      const res = await authFetch('/api/pos/cartera/abono', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        alert(`Abono registrado exitosamente. Recibo de Caja #${data.consecutivo}`);
        setShowAbonoModal(false);
        setAbonoForm({ monto: '', tipo_pago: 'Contado', referencia: '' });
        loadCartera(selectedCliente);
      } else {
        alert(data.error || 'Error registrando abono');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const saldoTotal = facturas.reduce((sum, f) => sum + Number(f.saldo_pendiente), 0);
  const facturasVencidas = facturas.filter(f => f.dias_mora > 0);
  const saldoVencido = facturasVencidas.reduce((sum, f) => sum + Number(f.saldo_pendiente), 0);

  return (
    <div style={{ padding: '20px', color: '#fff', background: '#0f172a', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
          <Wallet className="text-emerald-400" /> Cartera y Recaudos POS
        </h2>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Sidebar Buscador */}
        <div style={{ flex: '0 0 350px', background: '#1e293b', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#38bdf8' }}>Buscar Cliente</h3>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Cédula/NIT o Nombre..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
            />
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #334155', borderRadius: '6px', background: '#0f172a' }}>
            {searchQuery.length > 1 ? (
              clientes.filter(c => 
                String(c.documento).includes(searchQuery) || 
                String(c.nombre_completo || c.nombre_comercial).toLowerCase().includes(searchQuery.toLowerCase())
              ).map(c => (
                <div 
                  key={c.id_tercero} 
                  onClick={() => handleSelectCliente(c)}
                  style={{ padding: '12px', borderBottom: '1px solid #334155', cursor: 'pointer', background: selectedCliente?.id_tercero === c.id_tercero ? '#1e293b' : 'transparent' }}
                  className="hover:bg-slate-800 transition-colors"
                >
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#38bdf8' }}>{c.documento}</div>
                  <div style={{ fontSize: '13px', color: '#cbd5e1' }}>{c.nombre_completo || c.nombre_comercial}</div>
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                Ingrese nombre o documento para buscar
              </div>
            )}
          </div>
        </div>

        {/* Dashboard de Cartera */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!selectedCliente ? (
            <div style={{ background: '#1e293b', borderRadius: '8px', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#64748b' }}>
              Seleccione un cliente para ver su estado de cuenta
            </div>
          ) : (
            <>
              {/* Header Info */}
              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: '0 0 5px 0', color: '#fff' }}>{selectedCliente.nombre_completo || selectedCliente.nombre_comercial}</h2>
                  <div style={{ color: '#94a3b8', fontSize: '14px' }}>NIT/CC: {selectedCliente.documento} | Tel: {selectedCliente.telefono || 'N/A'}</div>
                </div>
                <button 
                  onClick={() => setShowAbonoModal(true)}
                  disabled={saldoTotal <= 0}
                  style={{ padding: '12px 24px', background: saldoTotal > 0 ? '#10b981' : '#334155', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '16px', cursor: saldoTotal > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Plus size={20}/> Registrar Abono
                </button>
              </div>

              {/* KPIS */}
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1, background: '#1e293b', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '5px' }}>Saldo Total Adeudado</div>
                  <div style={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }}>${saldoTotal.toLocaleString()}</div>
                </div>
                <div style={{ flex: 1, background: '#1e293b', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                  <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '5px' }}>Saldo Vencido (Mora)</div>
                  <div style={{ color: '#ef4444', fontSize: '28px', fontWeight: 'bold' }}>${saldoVencido.toLocaleString()}</div>
                </div>
                <div style={{ flex: 1, background: '#1e293b', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '5px' }}>Facturas en Mora</div>
                  <div style={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }}>{facturasVencidas.length} doc(s)</div>
                </div>
              </div>

              {/* Tabla de Facturas */}
              <div style={{ background: '#1e293b', borderRadius: '8px', padding: '20px', flex: 1, overflowY: 'auto' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18}/> Detalle de Facturas Pendientes
                </h3>
                {loading ? (
                  <div style={{ color: '#94a3b8' }}>Cargando facturas...</div>
                ) : facturas.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#10b981' }}>
                    <CheckCircle size={48} style={{ margin: '0 auto 10px auto', display: 'block' }} />
                    Este cliente no tiene deudas pendientes.
                  </div>
                ) : (
                  <>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          <th style={{ padding: '12px', color: '#94a3b8' }}>Documento</th>
                          <th style={{ padding: '12px', color: '#94a3b8' }}>Emisión</th>
                          <th style={{ padding: '12px', color: '#94a3b8' }}>Vencimiento</th>
                          <th style={{ padding: '12px', color: '#94a3b8' }}>Días Mora</th>
                          <th style={{ padding: '12px', color: '#94a3b8', textAlign: 'right' }}>Total Factura</th>
                          <th style={{ padding: '12px', color: '#94a3b8', textAlign: 'right' }}>Saldo Pendiente</th>
                          <th style={{ padding: '12px', color: '#94a3b8' }}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {facturas.slice((currentPage - 1) * 20, currentPage * 20).map(f => (
                          <tr key={f.id_cxc} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#fff' }}>{f.numero_documento}</td>
                            <td style={{ padding: '12px' }}>{new Date(f.fecha_emision).toLocaleDateString()}</td>
                            <td style={{ padding: '12px' }}>{new Date(f.fecha_vencimiento).toLocaleDateString()}</td>
                            <td style={{ padding: '12px' }}>
                              {f.dias_mora > 0 ? (
                                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{f.dias_mora} días</span>
                              ) : (
                                <span style={{ color: '#10b981' }}>Vigente</span>
                              )}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>${Number(f.total_factura).toLocaleString()}</td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#38bdf8' }}>${Number(f.saldo_pendiente).toLocaleString()}</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', background: f.dias_mora > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(56,189,248,0.2)', color: f.dias_mora > 0 ? '#fca5a5' : '#7dd3fc' }}>
                                {f.dias_mora > 0 ? 'Vencido' : 'Vigente'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {facturas.length > 0 && (
                      <Pagination 
                        currentPage={currentPage}
                        totalItems={facturas.length}
                        pageSize={20}
                        onPageChange={setCurrentPage}
                      />
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Abono */}
      {showAbonoModal && selectedCliente && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#1e293b', width: '450px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '20px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>Registrar Abono</h3>
              <button onClick={() => setShowAbonoModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={24}/></button>
            </div>
            
            <div style={{ padding: '20px', background: 'rgba(59,130,246,0.1)', borderBottom: '1px solid #334155' }}>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>Cliente</div>
              <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#fff' }}>{selectedCliente.nombre_completo}</div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '10px' }}>Deuda Total</div>
              <div style={{ fontWeight: 'bold', fontSize: '24px', color: '#ef4444' }}>${saldoTotal.toLocaleString()}</div>
            </div>

            <form onSubmit={handleRegistrarAbono} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Monto a Abonar (COP) *</label>
                <input 
                  type="number" 
                  required 
                  max={saldoTotal}
                  value={abonoForm.monto} 
                  onChange={e => setAbonoForm({...abonoForm, monto: e.target.value})} 
                  placeholder={`Máximo: $${saldoTotal}`}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '20px', fontWeight: 'bold' }} 
                />
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '5px' }}>El abono se aplicará a las facturas más antiguas primero (FIFO).</div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Método de Pago *</label>
                <select 
                  required 
                  value={abonoForm.tipo_pago} 
                  onChange={e => setAbonoForm({...abonoForm, tipo_pago: e.target.value})} 
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '15px' }}
                >
                  <option value="Contado">Efectivo</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Nequi">Nequi / Daviplata</option>
                  <option value="Tarjeta Debito">Tarjeta Débito</option>
                  <option value="Tarjeta Credito">Tarjeta Crédito</option>
                </select>
              </div>

              {abonoForm.tipo_pago !== 'Contado' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#cbd5e1' }}>Referencia / Comprobante</label>
                  <input 
                    type="text" 
                    value={abonoForm.referencia} 
                    onChange={e => setAbonoForm({...abonoForm, referencia: e.target.value})} 
                    placeholder="Ej: Aprobación 12345"
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '15px' }} 
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAbonoModal(false)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #64748b', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 2, padding: '14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>Aplicar Abono</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
