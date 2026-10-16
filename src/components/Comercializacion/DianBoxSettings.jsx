import React, { useState, useEffect } from 'react';
import { Save, CheckCircle, XCircle, Activity } from 'lucide-react';
import { authFetch } from '../../utils/api';

export default function DianBoxSettings({ tenantId }) {
  const [config, setConfig] = useState({
    dianbox_api_key: '',
    dianbox_environment: 'Sandbox',
    dianbox_active: false
  });
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    // Fetch current settings from backend (we will simulate a generic tenant endpoint or just show mock loading)
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await authFetch(`/api/dian/settings?tenantId=${tenantId || 1}`);
      const data = await res.json();
      if (data.success && data.config) {
        setConfig({
          dianbox_api_key: data.config.dianbox_api_key || '',
          dianbox_environment: data.config.dianbox_environment || 'Sandbox',
          dianbox_active: data.config.dianbox_active === 1
        });
      }
    } catch (e) {
      console.error("Error loading DianBox settings");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authFetch(`/api/dian/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenantId || 1, ...config })
      });
      const data = await res.json();
      if (data.success) {
        alert('Configuración guardada exitosamente');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      alert('Error de red al guardar');
    }
    setLoading(false);
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    try {
      // Direct ping to our mock API
      const res = await authFetch('/api/dianbox/ping', {
        headers: { 'Authorization': `Bearer ${config.dianbox_api_key}` }
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: data.message });
      } else {
        setTestResult({ success: false, message: data.error });
      }
    } catch (e) {
      setTestResult({ success: false, message: 'Fallo de conexión HTTP' });
    }
  };

  return (
    <div style={{ padding: '20px', color: '#fff', background: '#0f172a', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: '#1e293b', borderRadius: '12px', padding: '30px', border: '1px solid #334155' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#38bdf8', marginTop: 0 }}>
          <Activity size={28} />
          Proveedor Tecnológico (DianBox)
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '30px' }}>
          Configura las credenciales de conexión con el proveedor tecnológico para la emisión de Facturación Electrónica y Nómina Electrónica ante la DIAN.
        </p>

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '20px', background: 'rgba(56, 189, 248, 0.1)', padding: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ display: 'block', fontSize: '16px' }}>Activar Facturación Electrónica</strong>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>Habilita el envío automático al facturar en el POS o módulo Comercial.</span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={config.dianbox_active} 
                onChange={e => setConfig({...config, dianbox_active: e.target.checked})}
                style={{ transform: 'scale(1.5)' }}
              />
            </label>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#cbd5e1' }}>API Key (Token de Autorización) *</label>
            <input 
              type="text" 
              required
              value={config.dianbox_api_key}
              onChange={e => setConfig({...config, dianbox_api_key: e.target.value})}
              placeholder="Ej: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontFamily: 'monospace' }}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#cbd5e1' }}>Entorno de Trabajo *</label>
            <select 
              value={config.dianbox_environment}
              onChange={e => setConfig({...config, dianbox_environment: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
            >
              <option value="Sandbox">Sandbox (Pruebas - Sin valor fiscal)</option>
              <option value="Production">Producción (Oficial DIAN)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', borderTop: '1px solid #334155', paddingTop: '20px' }}>
            <button 
              type="submit" 
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              <Save size={18} /> {loading ? 'Guardando...' : 'Guardar Configuración'}
            </button>
            
            <button 
              type="button" 
              onClick={handleTestConnection}
              style={{ padding: '12px 24px', background: 'transparent', color: '#38bdf8', border: '1px solid #38bdf8', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Probar Conexión
            </button>
          </div>
        </form>

        {testResult && (
          <div style={{ marginTop: '20px', padding: '15px', borderRadius: '8px', background: testResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${testResult.success ? '#22c55e' : '#ef4444'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
            {testResult.success ? <CheckCircle size={24} color="#4ade80" /> : <XCircle size={24} color="#f87171" />}
            <span style={{ color: testResult.success ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
              {testResult.message}
            </span>
          </div>
        )}

      </div>
    </div>
  );
}
