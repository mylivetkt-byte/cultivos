import React, { useState, useEffect } from 'react';
import DatePickerClaro from '../Common/DatePickerClaro';
import Select from 'react-select';
import { authFetch } from '../../utils/api';
import { customStyles } from '../PremiumSelect';

function PaymentCapturer({ tenantId, fincaId, currentUserId }) {
  const [terceros, setTerceros] = useState([]);
  const [selectedTercero, setSelectedTercero] = useState(null);
  const [tipoCartera, setTipoCartera] = useState('CxC'); // CxC o CxP
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pago, setPago] = useState({ monto: '', forma_pago: 'Efectivo', referencia: '', observaciones: '', fecha: new Date().toISOString().split('T')[0] });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (tenantId) {
      authFetch(`/api/table/terceros/data?tenantId=${tenantId}&pageSize=1000`)
        .then(res => res.json())
        .then(data => {
          setTerceros(data.data.map(t => ({
            value: t.id_tercero,
            label: `${t.documento} - ${t.nombre_completo}`
          })));
        })
        .catch(err => console.error(err));
    }
  }, [tenantId]);

  useEffect(() => {
    if (selectedTercero && tenantId) {
      setLoading(true);
      authFetch(`/api/cartera/pendientes/${tipoCartera}/${selectedTercero.value}?id_tenant=${tenantId}`)
        .then(res => res.json())
        .then(data => setFacturas(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setFacturas([]);
    }
  }, [selectedTercero, tipoCartera, tenantId]);

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePagar = async (factura) => {
    if (!pago.monto || pago.monto <= 0) {
      return showToast('Ingrese un monto válido', 'error');
    }
    if (pago.monto > Number(factura.saldo_pendiente)) {
      return showToast('El monto no puede superar el saldo pendiente', 'error');
    }

    try {
      const res = await authFetch('/api/cartera/abono', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_tenant: tenantId,
          id_finca: fincaId, // needed for accounting cross
          id_tercero: selectedTercero.value,
          tipo: tipoCartera,
          id_cartera: factura.id_cartera,
          monto: pago.monto,
          forma_pago: pago.forma_pago,
          referencia: pago.referencia,
          observaciones: pago.observaciones,
          fecha: pago.fecha,
          id_usuario: currentUserId || null
        })
      });
      const result = await res.json();
      if (result.success) {
        showToast('Pago registrado correctamente y contabilizado.');
        setPago({ ...pago, monto: '', referencia: '', observaciones: '' });
        // Refresh
        setFacturas(facturas.map(f => f.id_cartera === factura.id_cartera 
            ? { ...f, saldo_pendiente: Number(f.saldo_pendiente) - pago.monto }
            : f
        ).filter(f => f.saldo_pendiente > 0));
      } else {
        showToast(result.error, 'error');
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  return (
    <div className="module-container">
      {toast && (
        <div className={`toast toast-${toast.type}`} style={{ position: 'fixed', top: 20, right: 20, padding: '12px 20px', borderRadius: 8, background: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white', zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}
      
      <div className="module-header">
        <h1>💰 Capturador de Pagos</h1>
        <p>Registra abonos y recibos de caja integrados a contabilidad.</p>
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Tipo de Cartera</label>
            <select 
              value={tipoCartera} 
              onChange={e => setTipoCartera(e.target.value)}
              className="filter-select"
              style={{ width: '100%', padding: '10px' }}
            >
              <option value="CxC">Cuentas por Cobrar (Clientes/Préstamos)</option>
              <option value="CxP">Cuentas por Pagar (Proveedores)</option>
            </select>
          </div>
          
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Buscar Tercero (Cliente/Proveedor)</label>
            <Select 
              options={terceros}
              value={selectedTercero}
              onChange={setSelectedTercero}
              placeholder="Ej: 900123456 - Agrícola del Norte"
              styles={{
                control: (base) => ({ ...base, background: 'var(--card-bg)', borderColor: 'var(--border)' }),
                menu: (base) => ({ ...base, background: 'var(--card-bg)', zIndex: 999 }),
                singleValue: (base) => ({ ...base, color: 'var(--text)' }),
                option: (base, state) => ({ ...base, background: state.isFocused ? 'var(--primary-light)' : 'transparent' })
              }}
            />
          </div>
        </div>
      </div>

      {selectedTercero && (
        <div style={{ display: 'flex', gap: '20px' }}>
          {/* Facturas Pendientes Panel */}
          <div className="card" style={{ flex: 2, padding: '20px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--primary)' }}>Facturas Pendientes</h2>
            {loading ? <p>Cargando facturas...</p> : (
              facturas.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No hay facturas pendientes para este tercero.</p> : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {facturas.map(f => (
                    <div key={f.id_cartera} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-color)', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Documento: {f.numero_documento}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Emitida: {new Date(f.fecha_emision).toLocaleDateString()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Saldo Pendiente</div>
                        <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#ef4444' }}>
                          ${Number(f.saldo_pendiente).toLocaleString('es-CO')}
                        </div>
                        <button 
                          onClick={() => handlePagar(f)}
                          className="btn btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '13px', marginTop: '8px' }}
                        >
                          Aplicar Pago Aquí
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Panel de Datos del Pago */}
          <div className="card" style={{ flex: 1, padding: '20px', height: 'fit-content' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--primary)' }}>Datos del Pago</h2>
            <div className="form-group">
              <label>Monto a Abonar</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748b' }}>$</span>
                <input 
                  type="number" 
                  value={pago.monto} 
                  onChange={e => setPago({...pago, monto: e.target.value})}
                  style={{ width: '100%', paddingLeft: '28px' }}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Forma de Pago</label>
              <select 
                value={pago.forma_pago}
                onChange={e => setPago({...pago, forma_pago: e.target.value})}
                style={{ width: '100%' }}
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia Bancaria</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
            <div className="form-group">
              <label>Fecha del Pago</label>
              <DatePickerClaro value={pago.fecha}
                onChange={e => setPago({...pago, fecha: e.target.value})}
                style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label>Referencia / Nro Comprobante</label>
              <input 
                type="text" 
                value={pago.referencia}
                onChange={e => setPago({...pago, referencia: e.target.value})}
                style={{ width: '100%' }}
                placeholder="Ej. TRANSF-4921"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Observaciones</label>
              <textarea 
                value={pago.observaciones}
                onChange={e => setPago({...pago, observaciones: e.target.value})}
                style={{ width: '100%' }}
                rows={3}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentCapturer;
