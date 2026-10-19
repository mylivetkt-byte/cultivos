import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Database } from 'lucide-react';

export default function LoginPage({ onRegister }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
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

  return (
    <div className="login-page-wrapper">
      <div className="login-background-overlay"></div>

      {/* CABECERA SUPERIOR CENTRADA: MARCA Y ESLOGAN */}
      <header className="login-top-header">
        <h1 className="brand-title">AgroPaccioli</h1>
        <p className="brand-slogan">
          Cosechando números claros, cultivando un futuro rentable
        </p>
      </header>

      {/* CUERPO CENTRAL CON TARJETA DE ACCESO */}
      <main className="login-main-content">
        <div className="login-card">
          <div className="login-logo">
            <img 
              src="/logo-agropaccioli.png" 
              alt="AgroPaccioli" 
              style={{ width: '160px', display: 'block', margin: '0 auto 10px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.08))' }} 
            />
            <h2 style={{ textAlign: 'center', margin: '0 0 4px 0', color: '#14532d', fontWeight: 900, letterSpacing: '-0.5px', fontSize: '22px' }}>
              Acceso al Sistema
            </h2>
            <p style={{ textAlign: 'center', margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
              Ingrese sus credenciales de usuario
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Usuario o Correo Corporativo</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Ingrese su usuario"
                required
              />
            </div>
            <div className="form-group">
              <label>Contraseña del Sistema</label>
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
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                borderColor: '#15803d',
                marginTop: '10px',
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)'
              }}
            >
              {loading ? 'Ingresando a la Plataforma...' : 'Entrar a AgroPaccioli 🚀'}
            </button>

            {/* INDICADOR DE CONEXIÓN */}
            <div style={{ 
              marginTop: '16px', 
              paddingTop: '12px', 
              borderTop: '1px solid #e2e8f0', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '6px',
              fontSize: '12px',
              color: serverStatus === 'error' ? '#ef4444' : '#15803d',
              fontWeight: 600
            }}>
              <Database size={14} />
              {serverStatus === 'error' ? (
                <span>⚠️ No hay conexión con el servidor (Puerto 3002)</span>
              ) : (
                <span>🟢 Servidor y Base de Datos (MySQL) Conectados</span>
              )}
            </div>

            <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: '#64748b' }}>
              ¿No tienes empresa? <button type="button" onClick={onRegister} style={{ border: 'none', background: 'none', color: '#16a34a', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}>Crear mi empresa</button>
            </p>
          </form>
        </div>
      </main>

      {/* PIE DE PÁGINA: DERECHOS DE AUTOR */}
      <footer className="login-bottom-footer">
        <p className="copyright-text">
          © 2023 - 2026 AgroPaccioli S.A.S. • Todos los derechos reservados
        </p>
        <p className="copyright-subtext">
          Plataforma Empresarial de Gestión Integral Agrícola, Ganadera y Acuícola • Versión Enterprise
        </p>
      </footer>

      <style>{`
        .login-page-wrapper {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          min-height: 100vh;
          background-image: url('/bg-agropaccioli-2.jpg');
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
          position: relative;
          padding: 24px 20px 20px;
          box-sizing: border-box;
        }

        .login-background-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(180deg, rgba(5, 30, 15, 0.72) 0%, rgba(15, 23, 42, 0.55) 50%, rgba(5, 25, 12, 0.85) 100%);
          backdrop-filter: blur(1.5px);
          pointer-events: none;
        }

        /* CABECERA SUPERIOR */
        .login-top-header {
          position: relative;
          z-index: 10;
          text-align: center;
          padding-top: 8px;
        }

        .brand-title {
          font-size: 42px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #ffffff;
          margin: 0 0 6px 0;
          text-shadow: 0 4px 18px rgba(0, 0, 0, 0.7), 0 2px 4px rgba(0, 0, 0, 0.5);
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .brand-slogan {
          font-size: 18px;
          font-weight: 500;
          color: #bbf7d0;
          margin: 0;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.75);
          letter-spacing: 0.2px;
        }

        @media (max-width: 640px) {
          .brand-title {
            font-size: 32px;
          }
          .brand-slogan {
            font-size: 15px;
          }
        }

        /* CUERPO CENTRAL */
        .login-main-content {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          padding: 20px 0;
        }

        .login-card {
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(16px);
          padding: 30px 34px;
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.4);
          width: 100%;
          max-width: 420px;
          box-sizing: border-box;
        }

        .form-group {
          margin-bottom: 14px;
        }
        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 5px;
        }
        .form-group input {
          width: 100%;
          padding: 10px 12px;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          font-size: 14px;
          box-sizing: border-box;
          outline: none;
          background: #f8fafc;
          transition: all 0.2s;
        }
        .form-group input:focus {
          border-color: #16a34a;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.18);
        }

        .password-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .password-input-wrapper input {
          padding-right: 42px;
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
          padding: 9px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 12px;
          text-align: center;
          font-weight: 500;
        }

        .btn-primary {
          color: #fff;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }
        .btn-block {
          width: 100%;
        }

        /* PIE DE PÁGINA */
        .login-bottom-footer {
          position: relative;
          z-index: 10;
          text-align: center;
          padding-bottom: 4px;
        }

        .copyright-text {
          font-size: 13px;
          color: #f1f5f9;
          margin: 0 0 3px 0;
          font-weight: 600;
          text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
          letter-spacing: 0.2px;
        }

        .copyright-subtext {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
          text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
        }

        @media (max-width: 640px) {
          .copyright-text {
            font-size: 12px;
          }
          .copyright-subtext {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}
