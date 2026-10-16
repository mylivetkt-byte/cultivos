import React, { useState } from 'react';
import { fetchApi } from '../utils/api';

export default function RegisterPage({ onBack }) {
  const [form, setForm] = useState({
    razon_social: '',
    nombre_comercial: '',
    nit: '',
    pais: 'Colombia',
    moneda_local: 'COP',
    admin_username: '',
    admin_email: '',
    admin_password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await fetchApi('/auth/register-tenant', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '4px', fontWeight: '600', color: 'var(--text-primary)', fontSize: '13px' };
  const groupStyle = { marginBottom: '14px' };

  return (
    <div className="login-container">
      <div style={{ background: 'var(--bg-card)', padding: '40px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span style={{ fontSize: '40px' }}>🌿</span>
          <h1 style={{ margin: '8px 0 0', color: '#1a5f2a', fontSize: '22px' }}>Crear Mi Empresa</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>Registra tu empresa para comenzar a usar AgroPaccioli</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <h3 style={{ color: '#388e3c' }}>Empresa Creada</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Tu empresa ha sido registrada exitosamente. Un administrador del sistema la activará pronto.</p>
            <button onClick={onBack} style={{ marginTop: '16px', padding: '10px 24px', border: 'none', borderRadius: '6px', background: '#1976d2', color: '#fff', cursor: 'pointer' }}>Volver al Login</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Datos de la Empresa</h3>
            <div style={groupStyle}>
              <label style={labelStyle}>Razón Social *</label>
              <input name="razon_social" value={form.razon_social} onChange={handleChange} required style={inputStyle} placeholder="Ej: Mi Empresa S.A.S." />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Nombre Comercial *</label>
              <input name="nombre_comercial" value={form.nombre_comercial} onChange={handleChange} required style={inputStyle} placeholder="Ej: MiEmpresa" />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>NIT *</label>
              <input name="nit" value={form.nit} onChange={handleChange} required style={inputStyle} placeholder="Ej: 901234567-1" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={groupStyle}>
                <label style={labelStyle}>País</label>
                <select name="pais" value={form.pais} onChange={handleChange} style={inputStyle}>
                  <option value="Colombia">Colombia</option>
                  <option value="Mexico">México</option>
                  <option value="Peru">Perú</option>
                  <option value="Chile">Chile</option>
                </select>
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Moneda</label>
                <select name="moneda_local" value={form.moneda_local} onChange={handleChange} style={inputStyle}>
                  <option value="COP">COP</option>
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border-color)' }} />
            <h3 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Tu Cuenta de Administrador</h3>
            <div style={groupStyle}>
              <label style={labelStyle}>Username *</label>
              <input name="admin_username" value={form.admin_username} onChange={handleChange} required style={inputStyle} placeholder="admin" />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Email *</label>
              <input name="admin_email" type="email" value={form.admin_email} onChange={handleChange} required style={inputStyle} placeholder="admin@miempresa.com" />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Contraseña *</label>
              <input name="admin_password" type="password" value={form.admin_password} onChange={handleChange} required minLength={6} style={inputStyle} placeholder="Mínimo 6 caracteres" />
            </div>

            {error && <div style={{ color: '#d32f2f', background: '#ffebee', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' }}>{error}</div>}

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '6px', background: '#1a5f2a', color: '#fff', fontSize: '15px', cursor: 'pointer' }}>
              {loading ? 'Creando...' : 'Crear Empresa'}
            </button>

            <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              ¿Ya tienes cuenta? <button type="button" onClick={onBack} style={{ border: 'none', background: 'none', color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }}>Iniciar Sesión</button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
