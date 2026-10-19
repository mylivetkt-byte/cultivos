import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ShieldCheck, Database, CheckCircle, AlertCircle } from 'lucide-react';

export default function LoginPage({ onRegister }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: 'admin', password: 'Admin123*' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking'); // 'checking', 'connected', 'error'

  useEffect(() => {
    // Verificar si el servidor y la base de datos responden
    fetch('/api/auth/me')
      .then(() => setServerStatus('connected'))
      .catch(() => setServerStatus('error'));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(form.username, form.password);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Credenciales inválidas. Verifique usuario o contraseña.');
    }
  };

  const handleSetAdmin = () => {
    setForm({ username: 'admin', password: 'Admin123*' });
    setError('');
  };

  return (
    <div className="login-container">
      <div className="login-background-overlay"></div>
      <div className="login-card">
        <div className="login-logo">
          <img 
            src="/logo-agropaccioli.png" 
            alt="AgroPaccioli" 
            style={{ width: '180px', display: 'block', margin: '0 auto 12px', mixBlendMode: 'darken', filter: 'contrast(1.2) brightness(1.05)' }} 
          />
          <h3 style={{ textAlign: 'center', margin: '0 0 4px 0', color: '#166534', fontWeight: 800 }}>
            AgroPaccioli ERP
          </h3>
          <p style={{ textAlign: 'center', margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
            Sistema Integral Agrícola, Ganadero y Acuícola
          </p>
        </div>

        {/* TARJETA DE CREDENCIALES OFICIALES DEL SISTEMA */}
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '8px',
          padding: '12px 14px',
          marginBottom: '16px',
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontWeight: 'bold', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="#16a34a" /> Credenciales Oficiales:
            </span>
            <button
              type="button"
              onClick={handleSetAdmin}
              style={{
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Autocompletar
            </button>
          </div>
          <div style={{ color: '#1e293b' }}>
            👤 <b>Usuario:</b> <code style={{ background: '#dcfce7', padding: '1px 5px', borderRadius: '3px' }}>admin</code>
          </div>
          <div style={{ color: '#1e293b', marginTop: '2px' }}>
            🔑 <b>Contraseña:</b> <code style={{ background: '#dcfce7', padding: '1px 5px', borderRadius: '3px' }}>Admin123*</code>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Usuario o Email</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Ingrese su usuario"
              required
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Ingrese su contraseña"
                required
              />
              <button 
                type="button" 
                className="password-toggle-btn" 
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button 
            type="submit" 
            className="btn btn-primary btn-block" 
            disabled={loading}
            style={{
              height: '46px',
              fontSize: '15px',
              fontWeight: 'bold',
              borderRadius: '8px',
              background: '#16a34a',
              borderColor: '#15803d',
              marginTop: '10px'
            }}
          >
            {loading ? 'Ingresando al Sistema...' : 'Entrar a AgroPaccioli 🚀'}
          </button>

          {/* INDICADOR DE CONEXIÓN CON LA BASE DE DATOS */}
          <div style={{ 
            marginTop: '16px', 
            paddingTop: '12px', 
            borderTop: '1px solid #e2e8f0', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '6px',
            fontSize: '12px',
            color: serverStatus === 'error' ? '#ef4444' : '#16a34a'
          }}>
            <Database size={14} />
            {serverStatus === 'error' ? (
              <span>⚠️ No hay conexión con el servidor (Revise puerto 3002)</span>
            ) : (
              <span>🟢 Servidor y Base de Datos (MySQL) Conectados</span>
            )}
          </div>

          <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            ¿No tienes empresa? <button type="button" onClick={onRegister} style={{ border: 'none', background: 'none', color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }}>Crear mi empresa</button>
          </p>
        </form>
      </div>

      <style>{`
        .login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #0f4c20 0%, #1a8f3e 50%, #00b09b 100%);
          background-size: 200% 200%;
          animation: gradientShift 10s ease infinite;
          position: relative;
          overflow: hidden;
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .login-background-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: radial-gradient(circle at 15% 50%, rgba(255,255,255,0.1), transparent 25%),
                            radial-gradient(circle at 85% 30%, rgba(255,255,255,0.1), transparent 25%);
          pointer-events: none;
        }
        .login-card {
          background: #fff;
          padding: 36px;
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.25);
          width: 100%;
          max-width: 420px;
          position: relative;
          z-index: 10;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 6px;
        }
        .form-group input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 14px;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-group input:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15);
        }
        .password-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .password-input-wrapper input {
          padding-right: 40px;
        }
        .password-toggle-btn {
          position: absolute;
          right: 10px;
          background: none;
          border: none;
          cursor: pointer;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }
        .login-error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fca5a5;
          padding: 10px;
          border-radius: 6px;
          font-size: 13px;
          margin-bottom: 14px;
          text-align: center;
        }
        .btn-primary {
          background: #16a34a;
          color: #fff;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-primary:hover {
          background: #15803d;
        }
        .btn-block {
          width: 100%;
        }
      `}</style>
    </div>
  );
}
