import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, AlertCircle } from 'lucide-react';

export default function CambioClaveObligatorio() {
  const { cambiarClaveObligatorio, logout } = useAuth();
  const [nuevaClave, setNuevaClave] = useState('');
  const [confirmarClave, setConfirmarClave] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (nuevaClave.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (nuevaClave !== confirmarClave) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const res = await cambiarClaveObligatorio(nuevaClave);
      if (!res.success) {
        setError(res.error || 'Error al cambiar la contraseña');
      }
    } catch (err) {
      setError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-main)',
      padding: '20px'
    }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ 
            width: '64px', height: '64px', borderRadius: '50%', 
            background: 'rgba(255,166,0,0.1)', color: '#ffa600',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            <Lock size={32} />
          </div>
          <h2 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Cambio de Contraseña Requerido</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
            Por razones de seguridad, debes actualizar tu contraseña antes de continuar.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244, 67, 54, 0.1)',
            color: '#f44336',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>Nueva Contraseña</label>
            <input 
              type="password" 
              className="form-control" 
              style={{ width: '100%' }}
              value={nuevaClave}
              onChange={(e) => setNuevaClave(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>Confirmar Contraseña</label>
            <input 
              type="password" 
              className="form-control" 
              style={{ width: '100%' }}
              value={confirmarClave}
              onChange={(e) => setConfirmarClave(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '16px' }} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>

          <button type="button" onClick={logout} style={{ 
            width: '100%', background: 'none', border: 'none', color: 'var(--text-secondary)', 
            cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' 
          }}>
            Cancelar y cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
