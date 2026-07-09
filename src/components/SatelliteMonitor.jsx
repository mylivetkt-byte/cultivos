import React, { useState, useEffect, useRef } from 'react';
import { 
  fetchSatelliteConnections, 
  saveSatelliteToken, 
  validateSatelliteConnection, 
  refreshSatelliteToken,
  authenticateSatelliteConnection,
  fetchSatelliteStatus,
  fetchSatelliteWorkflows,
  fetchSatelliteOrders,
  createSatelliteOrder
} from '../utils/api';

function SatelliteMonitor() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Local states for inputs (to allow typing before saving)
  const [tokensInput, setTokensInput] = useState({});
  const [showTokens, setShowTokens] = useState({});
  
  // Credential-based authentication states
  const [emailInputs, setEmailInputs] = useState({});
  const [passwordInputs, setPasswordInputs] = useState({});
  const [showPasswords, setShowPasswords] = useState({});
  const [authenticating, setAuthenticating] = useState({});
  const [authTab, setAuthTab] = useState({}); // 'credentials' or 'token'
  
  // Status states for each connection
  const [statuses, setStatuses] = useState({});
  const [checking, setChecking] = useState({});
  const [refreshing, setRefreshing] = useState({});
  const [saving, setSaving] = useState({});
  
  // Auto-refresh timer
  const refreshTimerRef = useRef(null);
  
  // Toast notifications
  const [toast, setToast] = useState(null);
  
  // Tab control for documentation/analysis
  const [activeTab, setActiveTab] = useState('ndvi');

  // On-Demand Production (ODP) states
  const [activeConnId, setActiveConnId] = useState('');
  const [workflows, setWorkflows] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingODP, setLoadingODP] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [odpProductRef, setOdpProductRef] = useState('');
  const [odpWorkflowName, setOdpWorkflowName] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const loadConnections = async () => {
    setLoading(true);
    try {
      const data = await fetchSatelliteConnections();
      setConnections(data);
      
      // Initialize inputs and show states
      const inputs = {};
      const show = {};
      const emails = {};
      const passwords = {};
      const tabs = {};
      data.forEach(c => {
        inputs[c.id_conexion] = c.api_key || '';
        show[c.id_conexion] = false;
        emails[c.id_conexion] = c.email || '';
        passwords[c.id_conexion] = '';
        tabs[c.id_conexion] = c.token_type === 'real' ? 'credentials' : 'credentials';
      });
      setTokensInput(inputs);
      setShowTokens(show);
      setEmailInputs(emails);
      setPasswordInputs(passwords);
      setAuthTab(tabs);

      // Select first connection by default
      if (data.length > 0) {
        const connected = data.find(c => c.api_key);
        setActiveConnId(connected ? String(connected.id_conexion) : String(data[0].id_conexion));
      }
      
      // Check validation on load
      data.forEach(c => {
        if (c.api_key) {
          checkStatus(c.id_conexion, c.api_key, c.fecha_expiracion);
        } else {
          setStatuses(prev => ({
            ...prev,
            [c.id_conexion]: { status: 'disconnected', message: 'Sin credenciales' }
          }));
        }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadODPData = async (connId) => {
    if (!connId) return;
    setLoadingODP(true);
    try {
      const [wData, oData] = await Promise.all([
        fetchSatelliteWorkflows(connId),
        fetchSatelliteOrders(connId)
      ]);
      setWorkflows(Array.isArray(wData) ? wData : []);
      setOrders(Array.isArray(oData) ? oData : []);
      
      // Auto-select first workflow if available
      if (Array.isArray(wData) && wData.length > 0) {
        setOdpWorkflowName(wData[0].Name);
      }
    } catch (err) {
      console.error('Error loading ODP data:', err);
      showToast(`Error al cargar ODP de Copernicus: ${err.message}`, 'error');
    } finally {
      setLoadingODP(false);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!activeConnId) {
      showToast('Seleccione una conexión activa primero.', 'error');
      return;
    }
    if (!odpWorkflowName || !odpProductRef) {
      showToast('Complete todos los campos del formulario.', 'error');
      return;
    }
    setSubmittingOrder(true);
    try {
      const res = await createSatelliteOrder(activeConnId, odpWorkflowName, odpProductRef);
      showToast(`¡Orden de Producción enviada con éxito! ID: ${res.Id || 'Creada'}`);
      setOdpProductRef('');
      // Refresh orders list
      const oData = await fetchSatelliteOrders(activeConnId);
      setOrders(Array.isArray(oData) ? oData : []);
    } catch (err) {
      console.error('Error creating production order:', err);
      showToast(`Error al crear la orden: ${err.message}`, 'error');
    } finally {
      setSubmittingOrder(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
    if (activeConnId) {
      const conn = connections.find(c => String(c.id_conexion) === activeConnId);
      if (conn && conn.api_key) {
        loadODPData(activeConnId);
      } else {
        setWorkflows([]);
        setOrders([]);
      }
    }
  }, [activeConnId, connections]);

  const checkStatus = async (id, apiKey, fechaExpiracion) => {
    setChecking(prev => ({ ...prev, [id]: true }));
    try {
      // Check local expiration date first
      if (fechaExpiracion) {
        const expDate = new Date(fechaExpiracion);
        const today = new Date();
        // Set hours to 0 to compare dates
        expDate.setHours(0,0,0,0);
        today.setHours(0,0,0,0);

        if (expDate < today) {
          // Token is expired! Let's trigger auto-refresh
          setStatuses(prev => ({
            ...prev,
            [id]: { status: 'expired', message: 'Token de base de datos expirado. Intentando auto-refrescar...' }
          }));
          await triggerAutoRefresh(id);
          return;
        }
      }

      // If not locally expired, call backend validation against Copernicus
      const res = await validateSatelliteConnection(id);
      setStatuses(prev => ({
        ...prev,
        [id]: { 
          status: res.status, 
          message: res.message, 
          expires_at: res.expires_at || fechaExpiracion 
        }
      }));

      // If backend reports expired token, trigger auto-refresh
      if (res.status === 'expired') {
        await triggerAutoRefresh(id);
      }
    } catch (err) {
      setStatuses(prev => ({
        ...prev,
        [id]: { status: 'error', message: `Error: ${err.message}` }
      }));
    } finally {
      setChecking(prev => ({ ...prev, [id]: false }));
    }
  };

  const triggerAutoRefresh = async (id) => {
    setRefreshing(prev => ({ ...prev, [id]: true }));
    showToast('Iniciando auto-refrescar de token...', 'warning');
    try {
      const res = await refreshSatelliteToken(id);
      if (res.success) {
        showToast(`Auto-refrescar exitoso para el satélite.`, 'success');
        // Update connection item locally
        setConnections(prev => prev.map(c => c.id_conexion === id ? res.connection : c));
        setTokensInput(prev => ({ ...prev, [id]: res.connection.api_key }));
        setStatuses(prev => ({
          ...prev,
          [id]: { 
            status: 'connected', 
            message: '¡Conectado! Token auto-actualizado exitosamente.',
            expires_at: res.connection.fecha_expiracion 
          }
        }));
      }
    } catch (err) {
      console.error('Auto-refresh error:', err);
      setStatuses(prev => ({
        ...prev,
        [id]: { 
          status: 'expired', 
          message: `Rechazado por Copernicus: ${err.message}. Requiere nuevo Refresh Token.` 
        }
      }));
      showToast(`Error al auto-refrescar: ${err.message}`, 'error');
    } finally {
      setRefreshing(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleSaveToken = async (id) => {
    setSaving(prev => ({ ...prev, [id]: true }));
    const token = tokensInput[id];
    try {
      const res = await saveSatelliteToken(id, token);
      showToast('Token guardado localmente.');
      setConnections(prev => prev.map(c => c.id_conexion === id ? res.connection : c));
      
      // Perform validation immediately
      await checkStatus(id, token, res.connection.fecha_expiracion);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleManualValidate = async (id) => {
    const conn = connections.find(c => c.id_conexion === id);
    if (!conn) return;
    await checkStatus(id, tokensInput[id], conn.fecha_expiracion);
  };

  const toggleShowToken = (id) => {
    setShowTokens(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Handle real Copernicus authentication with email/password
  const handleAuthenticate = async (id) => {
    const email = emailInputs[id];
    const password = passwordInputs[id];
    if (!email || !password) {
      showToast('Ingrese email y contraseña de Copernicus Data Space.', 'error');
      return;
    }
    setAuthenticating(prev => ({ ...prev, [id]: true }));
    try {
      const res = await authenticateSatelliteConnection(id, email, password);
      if (res.success) {
        showToast(res.message || '¡Autenticación exitosa con Copernicus!', 'success');
        // Update connection locally
        if (res.connection) {
          setConnections(prev => prev.map(c => c.id_conexion === id ? res.connection : c));
          setTokensInput(prev => ({ ...prev, [id]: res.connection.api_key }));
        }
        setStatuses(prev => ({
          ...prev,
          [id]: {
            status: 'connected',
            message: res.message,
            expires_at: res.expires_at,
            access_token_expires: res.access_token_expires,
            token_type: 'real'
          }
        }));
        // Clear password from memory
        setPasswordInputs(prev => ({ ...prev, [id]: '' }));
        // Start auto-refresh timer
        scheduleAutoRefresh(id, res.access_token_expires);
      } else {
        showToast(res.message || 'Error de autenticación', 'error');
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
      setStatuses(prev => ({
        ...prev,
        [id]: { status: 'error', message: err.message }
      }));
    } finally {
      setAuthenticating(prev => ({ ...prev, [id]: false }));
    }
  };

  // Schedule auto-refresh based on access_token expiration
  const scheduleAutoRefresh = (id, expiresAt) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    if (!expiresAt) return;
    const expiresMs = new Date(expiresAt).getTime();
    const now = Date.now();
    // Refresh 60 seconds before expiry
    const refreshIn = Math.max((expiresMs - now) - 60000, 5000);
    console.log(`[Satellite] Auto-refresh programado en ${Math.round(refreshIn/1000)}s para conexión #${id}`);
    refreshTimerRef.current = setTimeout(async () => {
      console.log(`[Satellite] Ejecutando auto-refresh para conexión #${id}`);
      try {
        const res = await refreshSatelliteToken(id);
        if (res.success) {
          showToast(`🔄 Token auto-renovado para ${res.connection?.proveedor || 'satélite'}`, 'success');
          setConnections(prev => prev.map(c => c.id_conexion === id ? res.connection : c));
          setTokensInput(prev => ({ ...prev, [id]: res.connection.api_key }));
          // Check if there's a new access_token_expires to schedule next refresh
          if (res.access_token_expires) {
            scheduleAutoRefresh(id, res.access_token_expires);
          }
        }
      } catch (err) {
        console.error('[Satellite] Auto-refresh falló:', err);
        showToast(`⚠️ Auto-refresh falló: ${err.message}`, 'error');
      }
    }, refreshIn);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  return (
    <div className="catalog-container">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
      
      <div className="catalog-toolbar">
        <h2 className="catalog-title">📡 Centro de Control Satelital Copernicus</h2>
      </div>

      <p style={{ marginBottom: 20, color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
        Configure la autenticación y verifique el estado de las conexiones con los satélites 
        <strong> Sentinel-1 (Radar)</strong> y <strong>Sentinel-2 (Multiespectral)</strong>. 
        Este módulo interactúa directamente con el servidor Keycloak OIDC de 
        <strong> Copernicus Data Space Ecosystem (CDSE)</strong>.
      </p>

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          <span>Cargando conexiones...</span>
        </div>
      ) : error ? (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <div className="error-detail">{error}</div>
        </div>
      ) : (
        <div className="grid-satellite" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 30 }}>
          {connections.map(conn => {
            const state = statuses[conn.id_conexion] || { status: 'loading', message: 'Verificando...' };
            const isChecking = checking[conn.id_conexion];
            const isRefreshing = refreshing[conn.id_conexion];
            const isSaving = saving[conn.id_conexion];
            
            return (
              <div key={conn.id_conexion} className="dashboard-section" style={{ margin: 0, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                  <h3 style={{ fontSize: 18, margin: 0, color: 'var(--sb)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🛰️</span> {conn.proveedor}
                  </h3>
                  <span className={`badge-status status-${state.status}`} style={{
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    backgroundColor: 
                      state.status === 'connected' ? '#E8F5E9' : 
                      state.status === 'expired' ? '#FFF3E0' : 
                      state.status === 'disconnected' ? '#FFEBEE' : '#ECEFF1',
                    color: 
                      state.status === 'connected' ? '#2E7D32' : 
                      state.status === 'expired' ? '#E65100' : 
                      state.status === 'disconnected' ? '#C62828' : '#37474F'
                  }}>
                    {state.status === 'connected' && '🟢 Conectado'}
                    {state.status === 'expired' && '🟠 Token Expirado'}
                    {state.status === 'disconnected' && '🔴 Desconectado'}
                    {state.status === 'loading' && '⚪ Cargando...'}
                    {state.status === 'error' && '❌ Fallo de Red'}
                  </span>
                </div>

                <div style={{ fontSize: 13, color: '#666', marginBottom: 15 }}>
                  <strong>Copernicus OIDC Endpoint:</strong> 
                  <code style={{ display: 'block', background: 'var(--bg)', padding: '6px 10px', borderRadius: 4, marginTop: 4, wordBreak: 'break-all' }}>
                    {conn.endpoint_url}
                  </code>
                </div>

                {/* Auth Method Tabs */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 15, borderBottom: '2px solid var(--bd)' }}>
                  <button
                    onClick={() => setAuthTab(prev => ({ ...prev, [conn.id_conexion]: 'credentials' }))}
                    style={{
                      padding: '8px 16px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                      background: (authTab[conn.id_conexion] || 'credentials') === 'credentials' ? 'var(--card-bg)' : 'transparent',
                      color: (authTab[conn.id_conexion] || 'credentials') === 'credentials' ? '#10b981' : '#888',
                      borderBottom: (authTab[conn.id_conexion] || 'credentials') === 'credentials' ? '2px solid #10b981' : '2px solid transparent',
                      marginBottom: '-2px', transition: 'all 0.2s'
                    }}
                  >
                    🔐 Credenciales Copernicus
                  </button>
                  <button
                    onClick={() => setAuthTab(prev => ({ ...prev, [conn.id_conexion]: 'token' }))}
                    style={{
                      padding: '8px 16px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                      background: authTab[conn.id_conexion] === 'token' ? 'var(--card-bg)' : 'transparent',
                      color: authTab[conn.id_conexion] === 'token' ? '#3b82f6' : '#888',
                      borderBottom: authTab[conn.id_conexion] === 'token' ? '2px solid #3b82f6' : '2px solid transparent',
                      marginBottom: '-2px', transition: 'all 0.2s'
                    }}
                  >
                    🔑 Token Manual
                  </button>
                </div>

                {/* Credentials Tab */}
                {(authTab[conn.id_conexion] || 'credentials') === 'credentials' && (
                  <div style={{ marginBottom: 15 }}>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--txs)', marginBottom: 4 }}>
                        📧 Email de Copernicus Data Space
                      </label>
                      <input
                        type="email"
                        value={emailInputs[conn.id_conexion] || ''}
                        onChange={e => setEmailInputs(prev => ({ ...prev, [conn.id_conexion]: e.target.value }))}
                        placeholder="tu.email@ejemplo.com"
                        style={{
                          width: '100%', padding: '10px 12px',
                          border: '1px solid var(--bd)', borderRadius: 'var(--rs)',
                          fontSize: 14, background: 'var(--bg)', color: 'var(--text)'
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--txs)', marginBottom: 4 }}>
                        🔒 Contraseña
                      </label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type={showPasswords[conn.id_conexion] ? 'text' : 'password'}
                          value={passwordInputs[conn.id_conexion] || ''}
                          onChange={e => setPasswordInputs(prev => ({ ...prev, [conn.id_conexion]: e.target.value }))}
                          placeholder="Contraseña de Copernicus"
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAuthenticate(conn.id_conexion); }}}
                          style={{
                            flex: 1, padding: '10px 12px',
                            border: '1px solid var(--bd)', borderRadius: 'var(--rs)',
                            fontSize: 14, background: 'var(--bg)', color: 'var(--text)'
                          }}
                        />
                        <button
                          className="btn btn-outline"
                          onClick={() => setShowPasswords(prev => ({ ...prev, [conn.id_conexion]: !prev[conn.id_conexion] }))}
                          style={{ padding: '0 12px' }}
                        >
                          {showPasswords[conn.id_conexion] ? '👁️' : '👁️‍🗨️'}
                        </button>
                      </div>
                    </div>
                    <button
                      className="btn"
                      onClick={() => handleAuthenticate(conn.id_conexion)}
                      disabled={authenticating[conn.id_conexion] || !emailInputs[conn.id_conexion] || !passwordInputs[conn.id_conexion]}
                      style={{
                        width: '100%', padding: '10px 16px', fontWeight: 'bold', fontSize: 14,
                        background: authenticating[conn.id_conexion] ? '#555' : 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none', color: '#fff', borderRadius: 'var(--rs)', cursor: 'pointer',
                        opacity: (!emailInputs[conn.id_conexion] || !passwordInputs[conn.id_conexion]) ? 0.5 : 1
                      }}
                    >
                      {authenticating[conn.id_conexion] ? '⏳ Autenticando con Copernicus...' : '🚀 Conectar con Copernicus CDSE'}
                    </button>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 6, textAlign: 'center' }}>
                      La contraseña no se almacena. Solo se usa para obtener el token OAuth2.
                    </div>
                  </div>
                )}

                {/* Token Manual Tab */}
                {authTab[conn.id_conexion] === 'token' && (
                  <div style={{ marginBottom: 15 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--txs)', marginBottom: 6 }}>
                      OIDC Refresh Token
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type={showTokens[conn.id_conexion] ? 'text' : 'password'}
                        value={tokensInput[conn.id_conexion] || ''}
                        onChange={e => setTokensInput(prev => ({ ...prev, [conn.id_conexion]: e.target.value }))}
                        placeholder="Ingrese el Refresh Token de Copernicus CDSE..."
                        style={{
                          flex: 1, padding: '10px 12px',
                          border: '1px solid var(--bd)', borderRadius: 'var(--rs)',
                          fontSize: 13, fontFamily: 'monospace',
                          background: 'var(--bg)', color: 'var(--text)'
                        }}
                      />
                      <button
                        className="btn btn-outline"
                        onClick={() => toggleShowToken(conn.id_conexion)}
                        style={{ padding: '0 12px' }}
                      >
                        {showTokens[conn.id_conexion] ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleSaveToken(conn.id_conexion)}
                        disabled={isSaving || isChecking || isRefreshing}
                        style={{ flex: 1 }}
                      >
                        {isSaving ? 'Guardando...' : '💾 Guardar Token'}
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={() => handleManualValidate(conn.id_conexion)}
                        disabled={isSaving || isChecking || isRefreshing || !tokensInput[conn.id_conexion]}
                        style={{ flex: 1 }}
                      >
                        {isChecking ? 'Validando...' : '🔍 Validar'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Status Display */}
                <div style={{
                  fontSize: 13, color: '#ccc', marginBottom: 15, lineHeight: 1.6,
                  background: 'rgba(0,0,0,0.15)', padding: '10px 14px', borderRadius: 'var(--rs)',
                  border: '1px solid var(--bd)'
                }}>
                  <div><strong>Estado:</strong> {state.message}</div>
                  {state.expires_at && (
                    <div style={{ marginTop: 4 }}>
                      <strong>Refresh Token Expira:</strong>{' '}
                      <span style={{ color: new Date(state.expires_at) < new Date() ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                        {new Date(state.expires_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                  {state.access_token_expires && (
                    <div style={{ marginTop: 4 }}>
                      <strong>Access Token Expira:</strong>{' '}
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                        {new Date(state.access_token_expires).toLocaleTimeString('es-CO')}
                      </span>
                      <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>(auto-refresh activo)</span>
                    </div>
                  )}
                  {conn.email && (
                    <div style={{ marginTop: 4 }}>
                      <strong>Cuenta:</strong> {conn.email}
                    </div>
                  )}
                  {conn.token_type && (
                    <div style={{ marginTop: 4 }}>
                      <strong>Tipo:</strong>{' '}
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: conn.token_type === 'real' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                        color: conn.token_type === 'real' ? '#10b981' : '#3b82f6'
                      }}>
                        {conn.token_type === 'real' ? '🟢 Conexión Real CDSE' : '🔵 Sesión Demo'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => handleManualValidate(conn.id_conexion)}
                    disabled={isSaving || isChecking || isRefreshing}
                    style={{ flex: 1 }}
                  >
                    {isChecking ? '⏳ Validando...' : '🔍 Validar Conexión'}
                  </button>
                  {conn.api_key && (
                    <button
                      className="btn btn-outline"
                      style={{ flex: 1, borderColor: '#10b981', color: '#10b981' }}
                      onClick={() => triggerAutoRefresh(conn.id_conexion)}
                      disabled={isSaving || isChecking || isRefreshing}
                    >
                      {isRefreshing ? '⏳ Refrescando...' : '🔄 Refrescar Token'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Copernicus On-Demand Production (ODP) Section */}
      <div className="dashboard-section" style={{ padding: 25, marginBottom: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 18, margin: 0, color: 'var(--sb)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📦</span> Producción Bajo Demanda (Copernicus ODP)
            </h3>
            <span style={{ fontSize: 12, color: '#666' }}>
              Interactúe con la API OData ODP para procesar productos desde datos crudos (Level-0) a imágenes listas para análisis.
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Conexión Activa:</label>
            <select 
              value={activeConnId} 
              onChange={e => setActiveConnId(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid var(--bd)',
                borderRadius: 'var(--rs)',
                fontSize: 14,
                background: '#fff'
              }}
            >
              {connections.map(c => (
                <option key={c.id_conexion} value={c.id_conexion}>{c.proveedor}</option>
              ))}
            </select>
            {activeConnId && (
              <button 
                className="btn btn-outline" 
                onClick={() => loadODPData(activeConnId)}
                disabled={loadingODP}
                style={{ padding: '6px 12px', fontSize: 13 }}
              >
                🔄 Actualizar ODP
              </button>
            )}
          </div>
        </div>

        {loadingODP ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 15 }}>
            <div className="spinner" />
            <span style={{ fontSize: 14, color: '#666' }}>Conectando con Copernicus ODP y cargando workflows/órdenes...</span>
          </div>
        ) : !connections.find(c => String(c.id_conexion) === activeConnId)?.api_key ? (
          <div style={{
            background: '#FFF8E1',
            border: '1px solid #FFE082',
            color: '#B78103',
            padding: '20px',
            borderRadius: 8,
            textAlign: 'center',
            fontSize: 14
          }}>
            ⚠️ La conexión seleccionada no tiene un Refresh Token configurado. Ingrese y guarde un token arriba para poder consultar y crear órdenes en Copernicus ODP.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginTop: 20 }}>
            {/* Form to Create Order */}
            <div style={{ background: '#F9FBF9', border: '1px solid var(--bd)', padding: 20, borderRadius: 8 }}>
              <h4 style={{ margin: '0 0 15px 0', fontSize: 15, color: 'var(--sb)' }}>🔨 Crear Nueva Orden de Producción</h4>
              <form onSubmit={handleCreateOrder}>
                <div style={{ marginBottom: 15 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>
                    Workflow / Procesador:
                  </label>
                  <select
                    value={odpWorkflowName}
                    onChange={e => setOdpWorkflowName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--bd)',
                      borderRadius: 'var(--rs)',
                      fontSize: 14,
                      background: '#fff'
                    }}
                  >
                    {workflows.map(w => (
                      <option key={w.Id} value={w.Name}>{w.DisplayName || w.Name} ({w.OutputProductType})</option>
                    ))}
                    {workflows.length === 0 && (
                      <option value="">No hay workflows cargados de la API</option>
                    )}
                  </select>
                </div>

                <div style={{ marginBottom: 15 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>
                    Referencia de Producto SAFE (Input Product):
                  </label>
                  <input
                    type="text"
                    value={odpProductRef}
                    onChange={e => setOdpProductRef(e.target.value)}
                    placeholder="Ej. S1A_IW_GRDH_1SDV_20230404T162838_..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--bd)',
                      borderRadius: 'var(--rs)',
                      fontSize: 13,
                      fontFamily: 'monospace'
                    }}
                    required
                  />
                  <small style={{ display: 'block', color: '#888', marginTop: 4, fontSize: 11 }}>
                    Ingrese el nombre identificador del producto SAFE de referencia en el catálogo de Copernicus CDSE.
                  </small>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '10px 0', fontSize: 14 }}
                  disabled={submittingOrder || workflows.length === 0}
                >
                  {submittingOrder ? 'Enviando Orden...' : '🚀 Enviar Orden de Producción ODP'}
                </button>
              </form>
            </div>

            {/* List of Orders */}
            <div style={{ background: '#FDFDFD', border: '1px solid var(--bd)', padding: 20, borderRadius: 8, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <h4 style={{ margin: 0, fontSize: 15, color: 'var(--sb)' }}>📋 Historial de Órdenes en CDSE</h4>
                <span style={{ fontSize: 11, background: '#ECEFF1', color: '#455A64', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                  {orders.length} órdenes
                </span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', maxHeight: 280, border: '1px solid #F0F0F0', borderRadius: 4 }}>
                {orders.map(order => (
                  <div key={order.Id} style={{
                    padding: '12px 15px',
                    borderBottom: '1px solid #F0F0F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 13
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--txs)' }}>ID: {order.Id}</div>
                      <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>
                        {order.WorkflowName}
                      </div>
                      <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>
                        Enviada: {order.SubmissionDate ? new Date(order.SubmissionDate).toLocaleString() : 'N/A'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge-status status-${order.Status}`} style={{
                        padding: '3px 8px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: 
                          order.Status === 'completed' ? '#E8F5E9' : 
                          order.Status === 'failed' ? '#FFEBEE' : 
                          order.Status === 'running' ? '#E3F2FD' : '#ECEFF1',
                        color: 
                          order.Status === 'completed' ? '#2E7D32' : 
                          order.Status === 'failed' ? '#C62828' : 
                          order.Status === 'running' ? '#1565C0' : '#455A64',
                        textTransform: 'uppercase'
                      }}>
                        {order.Status}
                      </span>
                    </div>
                  </div>
                ))}

                {orders.length === 0 && (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: '#999', fontSize: 13 }}>
                    No hay órdenes de producción registradas para esta cuenta.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Satellite Vigilance Info Section */}
      <div className="dashboard-section" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 18, marginBottom: 15, color: 'var(--sb)' }}>📡 Centro de Vigilancia Satelital de Cultivos</h3>
        
        {/* Subtabs for navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--bd)', marginBottom: 20, gap: 5 }}>
          <button 
            onClick={() => setActiveTab('ndvi')}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'ndvi' ? '3px solid var(--p)' : '3px solid transparent',
              color: activeTab === 'ndvi' ? 'var(--p)' : '#666',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🌱 Salud Vegetal (NDVI)
          </button>
          <button 
            onClick={() => setActiveTab('water')}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'water' ? '3px solid var(--p)' : '3px solid transparent',
              color: activeTab === 'water' ? 'var(--p)' : '#666',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            💧 Estrés Hídrico (NDMI)
          </button>
          <button 
            onClick={() => setActiveTab('soil')}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'soil' ? '3px solid var(--p)' : '3px solid transparent',
              color: activeTab === 'soil' ? 'var(--p)' : '#666',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ⛰️ Humedad del Suelo (SAR)
          </button>
          <button 
            onClick={() => setActiveTab('pests')}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'pests' ? '3px solid var(--p)' : '3px solid transparent',
              color: activeTab === 'pests' ? 'var(--p)' : '#666',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🐛 Plagas y Anomalías
          </button>
          <button 
            onClick={() => setActiveTab('climate')}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'climate' ? '3px solid var(--p)' : '3px solid transparent',
              color: activeTab === 'climate' ? 'var(--p)' : '#666',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🌤️ Clima y Riego
          </button>
        </div>

        {/* Tab contents */}
        {activeTab === 'ndvi' && (
          <div>
            <h4>Vigilancia Vegetativa mediante NDVI (Sentinel-2)</h4>
            <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>
              El <strong>Índice de Vegetación de Diferencia Normalizada (NDVI)</strong> es la función patrón para medir la densidad y salud de la vegetación. Utiliza el contraste entre la banda de absorción de clorofila (Banda 4 - Roja, 665nm) y la banda de alta reflectancia de la estructura celular de las hojas (Banda 8 - Infrarrojo Cercano, 842nm).
            </p>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', margin: '15px 0' }}>
              <div style={{
                background: 'linear-gradient(90deg, #d73027 0%, #fee08b 50%, #1a9850 100%)',
                height: 25,
                flex: 1,
                borderRadius: 4,
                position: 'relative',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
              }}>
                <span style={{ position: 'absolute', left: '2%', top: 28, fontSize: 11, color: '#555' }}>-1.0 a 0.1 (Suelo desnudo/Agua)</span>
                <span style={{ position: 'absolute', left: '42%', top: 28, fontSize: 11, color: '#555' }}>0.2 a 0.5 (Estrés o brote)</span>
                <span style={{ position: 'absolute', right: '2%', top: 28, fontSize: 11, color: '#555' }}>0.6 a 1.0 (Vegetación densa/Sana)</span>
              </div>
            </div>
            
            <h5 style={{ marginTop: 25, marginBottom: 8 }}>Ecuación Matemática</h5>
            <code style={{ display: 'block', background: '#272822', color: '#f8f8f2', padding: '12px 16px', borderRadius: 6, fontSize: 15, fontFamily: 'monospace' }}>
              NDVI = (B08 - B04) / (B08 + B04)
            </code>

            <h5 style={{ marginTop: 20, marginBottom: 8 }}>Evalscript Real de Copernicus Sentinel Hub</h5>
            <pre style={{ background: '#272822', color: '#f8f8f2', padding: 15, borderRadius: 6, fontSize: 13, overflowX: 'auto' }}>{`// Sentinel-2 L2A Evalscript para calcular y visualizar NDVI
// https://services.sentinel-hub.com/ogc/wms/<INSTANCE_ID>
function setup() {
  return {
    input: ["B04", "B08", "dataMask"],
    output: { bands: 4 }
  };
}

function evaluatePixel(sample) {
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  
  // Asignar colores de escala visual (Verde: sano, Amarillo: medio, Rojo: estresado/seco)
  if (ndvi < 0.15) return [0.5, 0.2, 0.1, sample.dataMask]; // Suelo / Roca
  if (ndvi < 0.4)  return [0.9, 0.8, 0.3, sample.dataMask]; // Vegetación escasa
  return [0.1, 0.6, 0.1, sample.dataMask]; // Vegetación sana densa
}`}
            </pre>
          </div>
        )}

        {activeTab === 'water' && (
          <div>
            <h4>Análisis de Estrés Hídrico mediante NDMI / NDWI (Sentinel-2)</h4>
            <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>
              Para la vigilancia de estrés hídrico de cultivos, se utiliza el <strong>Índice de Humedad de Diferencia Normalizada (NDMI)</strong>, también conocido como NDWI en aplicaciones terrestres. Mide el contenido de agua de la copa del cultivo absorbiendo radiación en la banda SWIR (Banda 11, 1610nm) y reflejándola en la banda NIR (Banda 8, 842nm).
            </p>

            <h5 style={{ marginTop: 15, marginBottom: 8 }}>Fórmula de Índice de Humedad (NDMI)</h5>
            <code style={{ display: 'block', background: '#272822', color: '#f8f8f2', padding: '12px 16px', borderRadius: 6, fontSize: 15, fontFamily: 'monospace', marginBottom: 15 }}>
              NDMI = (B08 - B11) / (B08 + B11)
            </code>

            <h5 style={{ marginBottom: 8 }}>Fórmula de Índice de Agua Terrestre (NDWI)</h5>
            <code style={{ display: 'block', background: '#272822', color: '#f8f8f2', padding: '12px 16px', borderRadius: 6, fontSize: 15, fontFamily: 'monospace' }}>
              NDWI = (B03 - B08) / (B03 + B08)   // B03 = Green band
            </code>

            <h5 style={{ marginTop: 20, marginBottom: 8 }}>Evalscript de Copernicus para Estrés Hídrico (NDMI)</h5>
            <pre style={{ background: '#272822', color: '#f8f8f2', padding: 15, borderRadius: 6, fontSize: 13, overflowX: 'auto' }}>{`// Calcula NDMI para monitoreo de humedad en hojas y estrés hídrico
function setup() {
  return {
    input: ["B08", "B11", "dataMask"],
    output: { bands: 3 }
  };
}

function evaluatePixel(sample) {
  let ndmi = (sample.B08 - sample.B11) / (sample.B08 + sample.B11);
  
  // Escala de Estrés Hídrico:
  // ndmi < -0.1: Estrés Hídrico Severo (Rojo)
  // -0.1 a 0.2: Estrés Moderado (Amarillo)
  // ndmi > 0.2: Sin Estrés / Buena Humedad (Azul)
  if (ndmi < -0.1) return [0.8, 0.1, 0.1];
  if (ndmi < 0.2)  return [0.9, 0.9, 0.2];
  return [0.1, 0.3, 0.8];
}`}
            </pre>
          </div>
        )}

        {activeTab === 'soil' && (
          <div>
            <h4>Humedad del Suelo mediante Radar SAR (Sentinel-1)</h4>
            <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>
              A diferencia de las cámaras ópticas (Sentinel-2), el satélite de radar <strong>Sentinel-1 SAR</strong> puede penetrar las nubes y operar de noche. Emite pulsos de microondas y mide la retrodispersión (backscatter) de polarización <strong>VV</strong> (Vertical-Vertical) y <strong>VH</strong> (Vertical-Horizontal) que se alteran sensiblemente según la rugosidad y, crucialmente, la constante dieléctrica del suelo (que varía directamente con el contenido de humedad).
            </p>

            <h5 style={{ marginTop: 15, marginBottom: 8 }}>Copernicus Land Monitoring Service (CLMS) API</h5>
            <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>
              Copernicus provee el producto de <strong>Surface Soil Moisture (SSM)</strong> ya calibrado. Para consultar la humedad de suelo real de una finca sin procesar el radar de forma compleja, se hace un llamado al servicio de catálogo OData de Copernicus CDSE:
            </p>

            <pre style={{ background: '#272822', color: '#f8f8f2', padding: 15, borderRadius: 6, fontSize: 13, overflowX: 'auto' }}>{`# Consulta OData OGC API para buscar productos de Humedad de Suelo (SSM) en coordenadas de la finca
GET https://odata.dataspace.copernicus.eu/odata/v1/Products?$filter=Attributes/OData.Type.StringFilter/any(att:att/Name eq 'productType' and att/Value eq 'SSM_V1') and OData.Community.Files.Intersects(area=geography'SRID=4326;POLYGON((-90.5 14.2, -90.4 14.2, -90.4 14.3, -90.5 14.3, -90.5 14.2))')&$orderby=ContentDate/Start desc&$top=5`}
            </pre>
          </div>
        )}

        {activeTab === 'pests' && (
          <div>
            <h4>Detección de Plagas, Cambios y Alertas de Anomalías Terrestres</h4>
            <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>
              Para predecir y alertar sobre plagas, heladas o problemas futuros en el cultivo, se realiza un <strong>análisis multitemporal</strong> de la serie de tiempo satelital. Un ataque rápido de plagas (como langostas o defoliadores) o enfermedades fúngicas provocará una caída dramática en el NDVI en un intervalo de 5 a 15 días, mucho más rápido que la senescencia natural del cultivo.
            </p>

            <h5 style={{ marginTop: 15, marginBottom: 8 }}>Algoritmo de Detección en SQL y Node.js (Vigilancia Activa)</h5>
            <pre style={{ background: '#272822', color: '#f8f8f2', padding: 15, borderRadius: 6, fontSize: 13, overflowX: 'auto' }}>{`// Compara lecturas multitemporales consecutivas de NDVI en un lote
async function checkCropAnomalies(loteId) {
  // Obtener las últimas 2 imágenes procesadas para el lote
  const [rows] = await pool.query(\`
    SELECT fecha_captura, valor_promedio 
    FROM sat_lecturas_indices 
    JOIN sat_imagenes ON sat_lecturas_indices.id_imagen = sat_imagenes.id_imagen
    WHERE id_lote = ? AND id_indice = (SELECT id_indice FROM sat_indices_vegetacion WHERE codigo = 'NDVI')
    ORDER BY fecha_captura DESC LIMIT 2
  \`, [loteId]);

  if (rows.length < 2) return;

  const lecturaActual = rows[0].valor_promedio;
  const lecturaPrevia = rows[1].valor_promedio;

  // Variación porcentual
  const diffPct = ((lecturaActual - lecturaPrevia) / lecturaPrevia) * 100;

  // Si el NDVI cae más del 15% entre vuelos consecutivos (frecuencia normal de 5-10 días)
  if (diffPct < -15) {
    await pool.query(\`
      INSERT INTO sat_alertas_anomalias (id_lote, fecha_deteccion, tipo_anomalia, nivel_severidad, descripcion, estado)
      VALUES (?, NOW(), 'Pérdida Crítica de Biomasa', 'Alto', 'Alerta: Caída abrupta del NDVI en un ${diffPct.toFixed(1)}%. Posible ataque de plagas, hongo o helada.', 'Activa')
    \`, [loteId]);
  }
}`}
            </pre>
          </div>
        )}

        {activeTab === 'climate' && (
          <div>
            <h4>Vigilancia Climática y Programación del Riego</h4>
            <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>
              Para optimizar el uso del agua y calcular los requerimientos exactos de riego, no basta con la humedad de la superficie. El sistema calcula la <strong>Evapotranspiración del Cultivo (ETc)</strong> utilizando la ecuación estándar de la FAO-56 Penman-Monteith, multiplicando la Evapotranspiración de Referencia (ET0, que utiliza la temperatura, radiación solar, humedad y viento de estaciones meteorológicas) por el coeficiente de cultivo (Kc) estimado directamente a partir del NDVI satelital.
            </p>

            <h5 style={{ marginTop: 15, marginBottom: 8 }}>Ecuación de Estimación de Kc a partir de NDVI</h5>
            <code style={{ display: 'block', background: '#272822', color: '#f8f8f2', padding: '12px 16px', borderRadius: 6, fontSize: 15, fontFamily: 'monospace', marginBottom: 15 }}>
              Kc = 1.25 * NDVI + 0.1   // Relación lineal estándar FAO para cultivos agrícolas comunes
            </code>

            <h5 style={{ marginBottom: 8 }}>Cálculo de Necesidades Netas de Riego (Balance Hídrico Diario)</h5>
            <pre style={{ background: '#272822', color: '#f8f8f2', padding: 15, borderRadius: 6, fontSize: 13, overflowX: 'auto' }}>{`// Determina la dosis de riego necesaria para reponer el agua perdida en el suelo
function calculateIrrigationNeeds(ndviActual, tempMax, radiacionSolar, lluviaMm) {
  // 1. Calcular Coeficiente del Cultivo Kc basado en NDVI
  const Kc = Math.max(0.15, Math.min(1.2, 1.25 * ndviActual + 0.1));

  // 2. Estimar Evapotranspiración de Referencia (ET0 aproximada por Hargreaves o Penman)
  // Supongamos que ET0 promedio calculado por la estación meteorológica para hoy es:
  const ET0 = 0.0023 * (tempMax + 17.8) * Math.sqrt(radiacionSolar) * 4.5; // Hargreaves simplificado

  // 3. Evapotranspiración del Cultivo (Pérdida de agua diaria)
  const ETc = ET0 * Kc;

  // 4. Balance Hídrico Diario
  // Necesidad de Riego = Agua consumida (ETc) - Aporte de Lluvia efectiva
  const lluviaEfectiva = lluviaMm * 0.8; // 80% de la lluvia penetra
  const necesidadRiego = Math.max(0, ETc - lluviaEfectiva);

  return {
    coeficienteCultivo: Kc,
    perdidaAguaDiariaMm: ETc,
    riegoRecomendadoMm: necesidadRiego
  };
}`}
            </pre>
          </div>
        )}

      </div>
    </div>
  );
}

export default SatelliteMonitor;
