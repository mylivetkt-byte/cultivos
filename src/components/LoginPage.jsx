import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ShieldCheck, Database, Image as ImageIcon, Sparkles, ChevronRight } from 'lucide-react';

export default function LoginPage({ onRegister }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: 'admin', password: 'Admin123*' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking'); // 'checking', 'connected', 'error'
  const [bgOption, setBgOption] = useState(1); // 1: Ingeniera y campesino en campo, 2: Balcón panorámico con dron

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

  const currentBgUrl = bgOption === 1 ? '/bg-agropaccioli-1.jpg' : '/bg-agropaccioli-2.jpg';

  return (
    <div 
      className="login-container" 
      style={{ backgroundImage: `url(${currentBgUrl})` }}
    >
      <div className="login-background-overlay"></div>

      {/* BOTÓN FLOTANTE PARA CAMBIAR FONDO */}
      <button 
        type="button"
        className="bg-switcher-btn"
        onClick={() => setBgOption(prev => prev === 1 ? 2 : 1)}
        title="Cambiar fotografía de fondo"
      >
        <ImageIcon size={16} />
        <span>Fondo {bgOption === 1 ? 'Foto 1: Campo y Telemetría' : 'Foto 2: Panorámica con Dron'}</span>
        <ChevronRight size={14} />
      </button>

      {/* BANNER INFORMATIVO LATERAL DE MARCA (Visible en pantallas medianas y grandes) */}
      <div className="login-hero-text">
        <div className="hero-pill">
          <Sparkles size={16} color="#4ade80" />
          <span>El Software Agrícola Más Avanzado de Latinoamérica</span>
        </div>
        <h1 className="hero-title">
          Tecnología de Precisión para el Campo
        </h1>
        <p className="hero-subtitle">
          Control integral en tiempo real: desde el suelo y las siembras, hasta el pastoreo rotacional de ganado y la biomasa de peces.
        </p>
        <div className="hero-features">
          <div className="hero-feature-item">
            <span className="feature-icon">🌱</span>
            <div>
              <strong>Agrícola & Riego</strong>
              <small>Clima, NDVI Satelital y Centro de Mezclas</small>
            </div>
          </div>
          <div className="hero-feature-item">
            <span className="feature-icon">🐄</span>
            <div>
              <strong>Ganadería Élite</strong>
              <small>Aforo Voisin, Cinta Barzonera y Retiro</small>
            </div>
          </div>
          <div className="hero-feature-item">
            <span className="feature-icon">🐟</span>
            <div>
              <strong>Acuicultura Inteligente</strong>
              <small>Disco Secchi, Ración Diaria y Biomasa</small>
            </div>
          </div>
        </div>
      </div>

      {/* TARJETA DE LOGIN GLASSMORPHISM */}
      <div className="login-card">
        <div className="login-logo">
          <img 
            src="/logo-agropaccioli.png" 
            alt="AgroPaccioli" 
            style={{ width: '170px', display: 'block', margin: '0 auto 10px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }} 
          />
          <h2 style={{ textAlign: 'center', margin: '0 0 4px 0', color: '#14532d', fontWeight: 900, letterSpacing: '-0.5px' }}>
            AgroPaccioli ERP
          </h2>
          <p style={{ textAlign: 'center', margin: '0 0 16px 0', fontSize: '13px', color: '#475569', fontWeight: 500 }}>
            Plataforma Integral de Gestión y Control
          </p>
        </div>

        {/* TARJETA DE CREDENCIALES OFICIALES */}
        <div style={{
          background: 'rgba(240, 253, 244, 0.95)',
          border: '1px solid #86efac',
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '16px',
          fontSize: '13px',
          boxShadow: '0 2px 8px rgba(22, 163, 74, 0.1)'
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
                borderRadius: '6px',
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              Autocompletar
            </button>
          </div>
          <div style={{ color: '#1e293b' }}>
            👤 <b>Usuario:</b> <code style={{ background: '#dcfce7', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>admin</code>
          </div>
          <div style={{ color: '#1e293b', marginTop: '3px' }}>
            🔑 <b>Contraseña:</b> <code style={{ background: '#dcfce7', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Admin123*</code>
          </div>
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
              height: '48px',
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

      <style>{`
        .login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
          position: relative;
          padding: 24px;
          box-sizing: border-box;
          gap: 60px;
          transition: background-image 0.6s ease-in-out;
        }

        .login-background-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, rgba(5, 46, 22, 0.72) 0%, rgba(15, 23, 42, 0.65) 100%);
          backdrop-filter: blur(2px);
          pointer-events: none;
        }

        .bg-switcher-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          z-index: 30;
          background: rgba(15, 23, 42, 0.75);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(12px);
          padding: 8px 16px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
        }
        .bg-switcher-btn:hover {
          background: rgba(22, 163, 74, 0.9);
          border-color: #86efac;
          transform: translateY(-1px);
        }

        .login-hero-text {
          position: relative;
          z-index: 10;
          color: #fff;
          max-width: 540px;
          display: none;
        }
        @media (min-width: 1024px) {
          .login-hero-text {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
        }

        .hero-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(22, 163, 74, 0.25);
          border: 1px solid rgba(74, 222, 128, 0.4);
          backdrop-filter: blur(8px);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          color: #bbf7d0;
          width: fit-content;
        }

        .hero-title {
          font-size: 42px;
          font-weight: 900;
          line-height: 1.15;
          margin: 0;
          color: #fff;
          text-shadow: 0 2px 10px rgba(0,0,0,0.5);
        }

        .hero-subtitle {
          font-size: 17px;
          color: #e2e8f0;
          line-height: 1.5;
          margin: 0;
          text-shadow: 0 1px 4px rgba(0,0,0,0.5);
        }

        .hero-features {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 10px;
        }

        .hero-feature-item {
          display: flex;
          align-items: center;
          gap: 14px;
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(10px);
          padding: 12px 16px;
          border-radius: 12px;
        }
        .hero-feature-item strong {
          display: block;
          font-size: 14px;
          color: #fff;
        }
        .hero-feature-item small {
          color: #94a3b8;
          font-size: 12px;
        }
        .feature-icon {
          font-size: 26px;
        }

        .login-card {
          position: relative;
          z-index: 20;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          padding: 34px 36px;
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.3);
          width: 100%;
          max-width: 430px;
          box-sizing: border-box;
        }

        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 6px;
        }
        .form-group input {
          width: 100%;
          padding: 11px 14px;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          font-size: 14px;
          box-sizing: border-box;
          outline: none;
          background: #f8fafc;
          transition: all 0.2s;
        }
        .form-group input:focus {
          border-color: #16a34a;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.2);
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
          right: 12px;
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
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 14px;
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
      `}</style>
    </div>
  );
}
