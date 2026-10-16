import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

function WhatsAppManager() {
  const [status, setStatus] = useState({ connected: false, qr: '' });
  const [loading, setLoading] = useState(true);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hola! Este es un mensaje de prueba desde AgroPaccioli.');
  const [sending, setSending] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await authFetch('/api/whatsapp/status');
      const data = await res.json();
      if (data.success) {
        setStatus({ connected: data.connected, qr: data.qr });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 3 seconds to update QR or connection status
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    if (!window.confirm("¿Seguro que deseas desconectar este dispositivo de WhatsApp?")) return;
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
    if (!testPhone) return alert("Ingresa un número");
    setSending(true);
    try {
      const res = await authFetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone, text: testMessage })
      });
      const data = await res.json();
      if (data.success) {
        alert("Mensaje enviado con éxito");
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <h1>🟢 Conexión WhatsApp Bot</h1>
        <p>Vincula un número de WhatsApp escaneando el código QR para permitir el envío automático de notificaciones y reportes PDF.</p>
      </div>

      <div className="module-content" style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        
        <div className="card" style={{ flex: '1 1 400px', padding: '30px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
          <h2>Estado de la Conexión</h2>
          {loading && !status.qr ? (
            <div style={{ padding: '50px' }}>Cargando estado...</div>
          ) : status.connected ? (
            <div>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
              <h3 style={{ color: '#16a34a' }}>Bot Conectado y Activo</h3>
              <p style={{ color: '#64748b', marginBottom: '30px' }}>El sistema está listo para enviar mensajes y documentos.</p>
              <button className="btn btn-danger" onClick={handleLogout}>Desvincular Dispositivo</button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>📱</div>
              <h3 style={{ color: '#ea580c' }}>Esperando Escaneo</h3>
              <p style={{ color: '#64748b', marginBottom: '20px' }}>Abre WhatsApp en tu teléfono, ve a Dispositivos Vinculados y escanea este código:</p>
              
              {status.qr ? (
                <div style={{ padding: '15px', background: 'white', display: 'inline-block', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                  <img src={status.qr} alt="WhatsApp QR Code" style={{ width: '250px', height: '250px' }} />
                </div>
              ) : (
                <div style={{ padding: '50px', background: '#e2e8f0', borderRadius: '12px', color: '#64748b' }}>
                  Generando QR... (asegúrate de que el servidor esté activo)
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card" style={{ flex: '1 1 400px', padding: '30px' }}>
          <h2>Prueba de Mensajería</h2>
          <p style={{ color: '#64748b', marginBottom: '20px' }}>
            Si el bot está conectado, puedes enviarte un mensaje de prueba para verificar que AgroPaccioli tiene acceso.
          </p>

          <form onSubmit={handleTestSend}>
            <div className="form-group">
              <label>Número de Teléfono (Ej: 3001234567)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Número celular sin el +57"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                disabled={!status.connected || sending}
              />
              <small style={{ color: '#94a3b8' }}>El prefijo de Colombia (+57) se añade automáticamente.</small>
            </div>
            
            <div className="form-group">
              <label>Mensaje de Prueba</label>
              <textarea 
                className="form-control" 
                rows="4"
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
                disabled={!status.connected || sending}
              ></textarea>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px', fontSize: '16px' }}
              disabled={!status.connected || sending}
            >
              {sending ? 'Enviando...' : '📩 Enviar Mensaje'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

export default WhatsAppManager;
