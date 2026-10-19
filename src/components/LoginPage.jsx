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

      {/* CABECERA SUPERIOR CENTRADA: MARCA LLAMATIVA Y ESLOGAN */}
      <header className="login-top-header">
        <h1 className="brand-title">
          <span className="brand-agro">Agro</span><span className="brand-paccioli">Paccioli</span>
        </h1>
        <p className="brand-slogan">
          Cosechando números claros, cultivando un futuro rentable
        </p>
      </header>

      {/* CUERPO CENTRAL RESPONSIVO CON TARJETA DE ACCESO */}
      <main className="login-main-content">
        <div className="login-card">
          <div className="login-logo">
            <img 
              src="/logo-agropaccioli.png" 
              alt="AgroPaccioli" 
              className="logo-img"
            />
            <h2 className="card-access-title">
              Acceso al Sistema
            </h2>
            <p className="card-access-subtitle">
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
                autoComplete="username"
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
                  autoComplete="current-password"
                />
                <button 
                  type="button" 
                  className="password-toggle-btn" 
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-label="Alternar visibilidad de contraseña"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button 
              type="submit" 
              className="btn btn-primary btn-block" 
              disabled={loading}
            >
              {loading ? 'Ingresando a la Plataforma...' : 'Entrar a AgroPaccioli 🚀'}
            </button>

            {/* INDICADOR DE CONEXIÓN */}
            <div className="db-status-bar">
              <Database size={14} />
              {serverStatus === 'error' ? (
                <span style={{ color: '#ef4444' }}>⚠️ Sin conexión con el servidor (Puerto 3002)</span>
              ) : (
                <span style={{ color: '#15803d' }}>🟢 Servidor y Base de Datos Conectados</span>
              )}
            </div>

            <p className="register-footer-text">
              ¿No tienes empresa? <button type="button" onClick={onRegister} className="register-link-btn">Crear mi empresa</button>
            </p>
          </form>
        </div>
      </main>

      {/* PIE DE PÁGINA: DERECHOS DE AUTOR */}
      <footer className="login-bottom-footer">
        <p className="copyright-text">
          Agropaccioli © 2026. Todos los derechos reservados. Desarrollado en Colombia.
        </p>
        <p className="copyright-subtext">
          Este software y su código fuente se encuentran protegidos por la legislación colombiana de derechos de autor (Ley 23 de 1982) y la Decisión Andina 351. Prohibida su reproducción, distribución o uso no autorizado en el territorio de la República de Colombia o el exterior sin previa autorización expresa del titular.
        </p>
      </footer>

      <style>{`
        /* CONTENEDOR PRINCIPAL FLUIDO Y MULTIDISPOSITIVO */
        .login-page-wrapper {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          min-height: 100vh;
          min-height: 100dvh; /* Altura dinámica para celulares Android e iOS */
          width: 100%;
          background-image: url('/bg-agropaccioli-2.jpg');
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
          position: relative;
          padding: clamp(14px, 2.5vh, 28px) clamp(14px, 2.5vw, 32px);
          box-sizing: border-box;
          overflow-x: hidden;
        }

        /* OVERLAY OSCURO CINEMATOGRÁFICO PARA MÁXIMO CONTRASTE */
        .login-background-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(
            180deg, 
            rgba(4, 25, 12, 0.76) 0%, 
            rgba(15, 23, 42, 0.52) 45%, 
            rgba(4, 20, 10, 0.88) 100%
          );
          backdrop-filter: blur(1.5px);
          -webkit-backdrop-filter: blur(1.5px);
          pointer-events: none;
        }

        /* CABECERA SUPERIOR: TITULAR GRANDE Y PROPORCIONAL */
        .login-top-header {
          position: relative;
          z-index: 10;
          text-align: center;
          width: 100%;
          max-width: 900px;
          padding-top: 4px;
        }

        .brand-title {
          font-size: clamp(36px, 5.8vw, 68px);
          font-weight: 900;
          line-height: 1.08;
          letter-spacing: -0.5px;
          margin: 0;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
          filter: drop-shadow(0 4px 18px rgba(0, 0, 0, 0.85));
        }

        .brand-agro {
          color: #22c55e; /* Verde brillante característico de AgroPaccioli */
          text-shadow: 0 0 25px rgba(34, 197, 94, 0.55), 0 2px 6px rgba(0, 0, 0, 0.9);
        }

        .brand-paccioli {
          color: #ffffff; /* Blanco puro corporativo */
          text-shadow: 0 4px 16px rgba(0, 0, 0, 0.9), 0 2px 4px rgba(0, 0, 0, 0.7);
        }

        .brand-slogan {
          font-size: clamp(14px, 1.8vw, 21px);
          font-weight: 500;
          color: #dcfce7;
          margin: clamp(6px, 1vh, 10px) auto 0;
          max-width: 92%;
          line-height: 1.35;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.9);
          letter-spacing: 0.2px;
        }

        /* CUERPO CENTRAL FLUIDO (CENTRA VERTICALMENTE EN CUALQUIER PANTALLA) */
        .login-main-content {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          margin: auto 0; /* Auto margin para centrado perfecto entre header y footer */
          padding: clamp(12px, 2vh, 24px) 0;
        }

        /* TARJETA DE LOGIN GLASSMORPHISM ADAPTABLE */
        .login-card {
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          padding: clamp(22px, 3.5vw, 34px) clamp(20px, 3.5vw, 36px);
          border-radius: clamp(16px, 2.5vw, 24px);
          box-shadow: 
            0 24px 60px rgba(0, 0, 0, 0.55), 
            0 0 0 1px rgba(255, 255, 255, 0.5);
          width: 100%;
          max-width: 430px;
          box-sizing: border-box;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .login-logo {
          text-align: center;
        }

        .logo-img {
          width: clamp(130px, 25vw, 160px);
          height: auto;
          display: block;
          margin: 0 auto clamp(6px, 1vh, 10px);
          filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.08));
        }

        .card-access-title {
          margin: 0 0 4px 0;
          color: #14532d;
          font-weight: 900;
          letter-spacing: -0.4px;
          font-size: clamp(19px, 2.2vw, 22px);
        }

        .card-access-subtitle {
          margin: 0 0 clamp(12px, 1.8vh, 18px) 0;
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }

        /* CAMPOS DEL FORMULARIO TOUCH-FRIENDLY */
        .form-group {
          margin-bottom: clamp(12px, 1.6vh, 16px);
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
          min-height: 44px; /* Estándar mínimo recomendado por Apple y Google para táctil */
          padding: 10px 14px;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          font-size: 15px;
          box-sizing: border-box;
          outline: none;
          background: #f8fafc;
          transition: all 0.2s ease;
          -webkit-appearance: none;
        }

        /* Prevenir zoom no deseado en iOS Safari cuando font-size es menor a 16px */
        @media (max-width: 640px) {
          .form-group input {
            font-size: 16px;
          }
        }

        .form-group input:focus {
          border-color: #16a34a;
          background: #ffffff;
          box-shadow: 0 0 0 3.5px rgba(22, 163, 74, 0.18);
        }

        .password-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .password-input-wrapper input {
          padding-right: 44px;
        }

        .password-toggle-btn {
          position: absolute;
          right: 6px;
          min-width: 40px;
          min-height: 40px;
          background: none;
          border: none;
          cursor: pointer;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: 8px;
          transition: color 0.15s;
        }

        .password-toggle-btn:hover {
          color: #1e293b;
        }

        .login-error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fca5a5;
          padding: 10px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 12px;
          text-align: center;
          font-weight: 600;
        }

        /* BOTÓN PRINCIPAL */
        .btn-primary {
          min-height: 48px;
          width: 100%;
          font-size: 15px;
          font-weight: 800;
          border-radius: 10px;
          background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
          border: 1px solid #15803d;
          color: #ffffff;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(22, 163, 74, 0.4);
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-primary:hover:not(:disabled) {
          filter: brightness(1.08);
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(22, 163, 74, 0.5);
        }

        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* ESTADO DE LA BASE DE DATOS */
        .db-status-bar {
          margin-top: clamp(12px, 1.8vh, 16px);
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .register-footer-text {
          text-align: center;
          margin: 10px 0 0 0;
          font-size: 13px;
          color: #64748b;
        }

        .register-link-btn {
          border: none;
          background: none;
          color: #16a34a;
          cursor: pointer;
          font-weight: 700;
          text-decoration: underline;
          padding: 0;
          font-size: 13px;
        }

        /* PIE DE PÁGINA RESPONSIVO */
        .login-bottom-footer {
          position: relative;
          z-index: 10;
          text-align: center;
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
          padding: 6px 12px 2px;
          box-sizing: border-box;
        }

        .copyright-text {
          font-size: clamp(12px, 1.25vw, 13.5px);
          color: #f8fafc;
          margin: 0 0 4px 0;
          font-weight: 700;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.95);
          letter-spacing: 0.2px;
        }

        .copyright-subtext {
          font-size: clamp(10px, 0.95vw, 11.5px);
          color: #cbd5e1;
          margin: 0;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.95);
          line-height: 1.45;
          opacity: 0.92;
        }

        /* AJUSTES PARA PANTALLAS MUY PEQUEÑAS (MÓVILES ANTIGUOS O PANTALLAS COMPACTAS) */
        @media (max-height: 700px) {
          .login-page-wrapper {
            padding-top: 10px;
            padding-bottom: 10px;
          }
          .brand-title {
            font-size: clamp(28px, 5vw, 44px);
          }
          .brand-slogan {
            font-size: 13px;
            margin-top: 4px;
          }
          .card-access-subtitle {
            margin-bottom: 10px;
          }
          .form-group {
            margin-bottom: 10px;
          }
          .logo-img {
            width: 120px;
            margin-bottom: 6px;
          }
          .copyright-subtext {
            display: none; /* Ocultar línea secundaria en pantallas de poca altura para evitar scroll */
          }
        }
      `}</style>
    </div>
  );
}
