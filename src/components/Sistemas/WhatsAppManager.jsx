import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

function WhatsAppManager() {
  const [status, setStatus] = useState({
    connected: false,
    provider: 'baileys',
    qr: '',
    phone: null,
    verifiedName: null,
    configured: true,
    error: null
  });
  const [loading, setLoading] = useState(true);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hola! Este es un mensaje de prueba desde AgroPaccioli.');
  const [sending, setSending] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await authFetch('/api/whatsapp/status');
      const data = await res.json();
      if (data.success) {
        setStatus({
          connected: data.connected,
          provider: data.provider || 'baileys',
          qr: data.qr || '',
          phone: data.phone || null,
          verifiedName: data.verifiedName || null,
          configured: data.configured !== undefined ? data.configured : true,
          error: data.error || null
        });
      }
    } catch (err) {
      console.error('Error consultando estado de WhatsApp:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll cada 4 segundos para actualizar estado o refrescar QR
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    if (!window.confirm('¿Seguro que deseas desconectar este dispositivo de WhatsApp?')) return;
    setLoading(true);
    try {
      await authFetch('/api/whatsapp/logout', { method: 'POST' });
      await fetchStatus();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleTestSend = async (e) => {
    e.preventDefault();
    if (!testPhone) return alert('Por favor ingresa un número de teléfono celular.');
    setSending(true);
    try {
      const res = await authFetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone, text: testMessage })
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Mensaje de prueba enviado con éxito por WhatsApp.');
      } else {
        alert('❌ Error al enviar mensaje: ' + (data.error || 'Desconocido'));
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión con el servidor.');
    } finally {
      setSending(false);
    }
  };

  const isMetaCloud = status.provider === 'meta_cloud';

  return (
    <div className="module-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div className="module-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '24px' }}>
              <span>💬</span> Canal Oficial WhatsApp AgroPaccioli
            </h1>
            <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '14px' }}>
              Gestión de envíos automáticos de reportes PDF, órdenes de compra, alertas fitosanitarias y asistencia en campo.
            </p>
          </div>

          {/* Badge del Proveedor Activo */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: isMetaCloud ? 'rgba(56, 189, 248, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            border: `1px solid ${isMetaCloud ? 'rgba(56, 189, 248, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
          }}>
            <span style={{ fontSize: '14px' }}>{isMetaCloud ? '☁️' : '📱'}</span>
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              color: isMetaCloud ? '#38bdf8' : '#10b981',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {isMetaCloud ? 'Meta Cloud API Oficial' : 'Modo QR Local (Baileys)'}
            </span>
          </div>
        </div>
      </div>

      <div className="module-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* TARJETA 1: ESTADO DE LA CONEXIÓN */}
        <div className="card" style={{ padding: '28px', backgroundColor: '#ffffff', borderRadius: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '18px', margin: '0 0 18px 0', color: '#0f172a' }}>Estado de la Conexión</h2>
          
          {loading && !status.qr ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Consultando estado...</div>
          ) : isMetaCloud ? (
            /* VISTA META CLOUD API */
            <div>
              {status.connected ? (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ fontSize: '56px', marginBottom: '12px' }}>🏢</div>
                  <h3 style={{ color: '#16a34a', margin: '0 0 6px 0', fontSize: '20px' }}>
                    {status.verifiedName || 'Meta Cloud API Conectada'}
                  </h3>
                  <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 20px 0' }}>
                    Línea oficial empresarial activa 24/7 sin necesidad de celular físico.
                  </p>
                  {status.phone && (
                    <div style={{
                      display: 'inline-block',
                      background: '#f1f5f9',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: '20px'
                    }}>
                      📞 {status.phone}
                    </div>
                  )}
                  <div style={{ textAlign: 'left', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
                    <div style={{ fontWeight: 600, color: '#334155', marginBottom: '4px' }}>📌 URL de Webhook para Meta Developers:</div>
                    <code style={{ wordBreak: 'break-all', color: '#0284c7' }}>
                      {window.location.origin}/api/whatsapp/webhook
                    </code>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ fontSize: '56px', marginBottom: '12px' }}>⚙️</div>
                  <h3 style={{ color: '#d97706', margin: '0 0 6px 0', fontSize: '18px' }}>
                    Credenciales de Meta Pendientes
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.5, marginBottom: '20px' }}>
                    {status.error || 'Para activar la Cloud API oficial, ingresa tu META_WA_ACCESS_TOKEN y META_WA_PHONE_NUMBER_ID en el archivo .env.'}
                  </p>
                  <div style={{ textAlign: 'left', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
                    <strong>Variables requeridas en .env:</strong>
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px' }}>
                      <li><code>WHATSAPP_PROVIDER=meta_cloud</code></li>
                      <li><code>META_WA_ACCESS_TOKEN=EAAG...</code></li>
                      <li><code>META_WA_PHONE_NUMBER_ID=109283...</code></li>
                      <li><code>META_WA_VERIFY_TOKEN=tu_token_secreto</code></li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* VISTA BAILEYS (QR LOCAL) */
            <div style={{ textAlign: 'center' }}>
              {status.connected ? (
                <div>
                  <div style={{ fontSize: '56px', marginBottom: '12px' }}>✅</div>
                  <h3 style={{ color: '#16a34a', margin: '0 0 6px 0' }}>Bot Conectado y Activo</h3>
                  <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '14px' }}>
                    Sesión de WhatsApp Web vinculada correctamente. El sistema está listo para enviar mensajes y documentos.
                  </p>
                  <button className="btn btn-danger" onClick={handleLogout} style={{ padding: '8px 18px', borderRadius: '8px' }}>
                    Desvincular Dispositivo
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>📱</div>
                  <h3 style={{ color: '#ea580c', margin: '0 0 6px 0', fontSize: '18px' }}>Esperando Escaneo</h3>
                  <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '13px' }}>
                    Abre WhatsApp en tu teléfono ➔ Dispositivos Vinculados y escanea este código:
                  </p>
                  
                  {status.qr ? (
                    <div style={{ padding: '12px', background: 'white', display: 'inline-block', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                      <img src={status.qr} alt="WhatsApp QR Code" style={{ width: '220px', height: '220px', display: 'block' }} />
                    </div>
                  ) : (
                    <div style={{ padding: '40px 20px', background: '#f1f5f9', borderRadius: '12px', color: '#64748b', fontSize: '13px' }}>
                      ⏳ Iniciando socket de WhatsApp... Si tarda, asegúrate de que <code>npm run dev:whatsapp</code> esté corriendo.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selector / Nota explicativa */}
          <div style={{ marginTop: '22px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
            💡 <strong>Tip de Arquitectura:</strong> Puedes alternar entre <code>baileys</code> (modo local con QR) y <code>meta_cloud</code> (producción institucional oficial) cambiando la variable <code>WHATSAPP_PROVIDER</code> en tu archivo <code>.env</code>.
          </div>
        </div>

        {/* TARJETA 2: PRUEBA DE MENSAJERÍA */}
        <div className="card" style={{ padding: '28px', backgroundColor: '#ffffff', borderRadius: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '18px', margin: '0 0 10px 0', color: '#0f172a' }}>Prueba de Envío Directo</h2>
          <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '14px' }}>
            Envía un mensaje de prueba a tu número celular personal para confirmar que el proveedor activo está entregando mensajes.
          </p>

          <form onSubmit={handleTestSend}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: '#334155' }}>
                Número Celular (Ej: 3001234567)
              </label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Ingresa los 10 dígitos de tu celular"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                disabled={(!status.connected && !isMetaCloud) || sending}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <small style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                El código de país Colombia (+57) se añade de forma automática.
              </small>
            </div>
            
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: '#334155' }}>
                Texto del Mensaje
              </label>
              <textarea 
                className="form-control" 
                rows="4"
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
                disabled={(!status.connected && !isMetaCloud) || sending}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'inherit' }}
              ></textarea>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px',
                fontWeight: 600,
                borderRadius: '8px',
                backgroundColor: '#10b981',
                borderColor: '#10b981',
                color: 'white',
                cursor: ((!status.connected && !isMetaCloud) || sending) ? 'not-allowed' : 'pointer'
              }}
              disabled={(!status.connected && !isMetaCloud) || sending}
            >
              {sending ? '⏳ Enviando por WhatsApp...' : '🚀 Enviar Mensaje de Prueba'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

export default WhatsAppManager;
