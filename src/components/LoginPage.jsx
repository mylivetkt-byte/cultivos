import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage({ onRegister }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-icon">🌿</span>
          <h1>SAS Agrícolas</h1>
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
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Ingrese su contraseña"
              required
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
          <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#666' }}>
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
          background: linear-gradient(135deg, #1a5f2a 0%, #2d8a3e 100%);
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
