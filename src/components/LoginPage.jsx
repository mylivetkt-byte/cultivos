import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage({ onRegister }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(form.username, form.password);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Credenciales inválidas');
    }
  };

  return (
    <div className="login-container">
      <div className="login-background-overlay"></div>
      <div className="login-card">
        <div className="login-logo">
          <img src="/logo-agropaccioli.png" alt="AgroPaccioli" style={{ width: '180px', display: 'block', margin: '0 auto 15px', mixBlendMode: 'darken', filter: 'contrast(1.2) brightness(1.05)' }} />
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
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
          <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
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
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          width: 100%;
          max-width: 400px;
        }
        .login-logo {
          text-align: center;
          margin-bottom: 30px;
        }
        .login-logo .logo-icon {
          font-size: 48px;
        }
        .login-logo h1 {
          margin: 10px 0 0;
          color: #1a5f2a;
          font-size: 24px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 600;
          color: #333;
        }
        .form-group input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 15px;
          transition: border-color 0.3s;
        }
        .form-group input:focus {
          outline: none;
          border-color: #2d8a3e;
          box-shadow: 0 0 0 2px rgba(45,138,62,0.1);
        }
        .password-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .password-input-wrapper input {
          padding-right: 45px;
        }
        .password-toggle-btn {
          position: absolute;
          right: 10px;
          background: none;
          border: none;
          color: #777;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }
        .password-toggle-btn:hover {
          color: #333;
        }
        .login-error {
          color: #d32f2f;
          background: #ffebee;
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 15px;
          font-size: 14px;
        }
        .btn-block {
          width: 100%;
          padding: 12px;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}
