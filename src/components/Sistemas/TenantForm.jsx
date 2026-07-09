import React, { useState } from 'react';
import { fetchApi } from '../../utils/api';

export default function TenantForm({ onBack, onSaved, editTenant = null }) {
  const [form, setForm] = useState({
    razon_social: editTenant?.razon_social || '',
    nombre_comercial: editTenant?.nombre_comercial || '',
    nit: editTenant?.nit || '',
    pais: editTenant?.pais || 'Colombia',
    moneda_local: editTenant?.moneda_local || 'COP',
    huso_horario: editTenant?.huso_horario || 'America/Bogota',
    plan_suscripcion: editTenant?.plan_suscripcion || 'Basic',
    limite_hectareas: editTenant?.limite_hectareas || 50,
    limite_usuarios: editTenant?.limite_usuarios || 3,
    admin_username: '',
    admin_email: '',
    admin_password: '',
  });
  const [error, setError] = useState('');
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
      const endpoint = editTenant ? `/sistemas/tenant/${editTenant.id_tenant}` : '/sistemas/tenant';
      const method = editTenant ? 'PUT' : 'POST';
      const body = editTenant
        ? { razon_social: form.razon_social, nombre_comercial: form.nombre_comercial, nit: form.nit, pais: form.pais, moneda_local: form.moneda_local, huso_horario: form.huso_horario, plan_suscripcion: form.plan_suscripcion, limite_hectareas: form.limite_hectareas, limite_usuarios: form.limite_usuarios }
        : form;

      await fetchApi(endpoint, { method, body: JSON.stringify(body) });
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' };
  const labelStyle = { display: 'block', marginBottom: '4px', fontWeight: '600', color: '#333', fontSize: '13px' };
  const groupStyle = { marginBottom: '16px' };

  return (
    <div style={{ padding: '20px', maxWidth: '700px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}>←</button>
        <h2 style={{ margin: 0 }}>{editTenant ? 'Editar Empresa' : 'Nueva Empresa'}</h2>
      </div>

      {error && <div style={{ color: '#d32f2f', background: '#ffebee', padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={groupStyle}>
            <label style={labelStyle}>Razón Social *</label>
            <input name="razon_social" value={form.razon_social} onChange={handleChange} required style={inputStyle} />
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Nombre Comercial *</label>
            <input name="nombre_comercial" value={form.nombre_comercial} onChange={handleChange} required style={inputStyle} />
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>NIT *</label>
            <input name="nit" value={form.nit} onChange={handleChange} required style={inputStyle} />
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>País</label>
            <select name="pais" value={form.pais} onChange={handleChange} style={inputStyle}>
              <option value="Colombia">Colombia</option>
              <option value="Mexico">México</option>
              <option value="Peru">Perú</option>
              <option value="Chile">Chile</option>
              <option value="Argentina">Argentina</option>
              <option value="Ecuador">Ecuador</option>
            </select>
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Moneda</label>
            <select name="moneda_local" value={form.moneda_local} onChange={handleChange} style={inputStyle}>
              <option value="COP">COP - Peso Colombiano</option>
              <option value="MXN">MXN - Peso Mexicano</option>
              <option value="USD">USD - Dólar</option>
              <option value="PEN">PEN - Sol Peruano</option>
            </select>
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Plan</label>
            <select name="plan_suscripcion" value={form.plan_suscripcion} onChange={handleChange} style={inputStyle}>
              <option value="Free">Free (50 ha, 3 usuarios)</option>
              <option value="Basic">Basic (500 ha, 10 usuarios)</option>
              <option value="Professional">Professional (2000 ha, 25 usuarios)</option>
              <option value="Enterprise">Enterprise (ilimitado)</option>
            </select>
          </div>
        </div>

        {!editTenant && (
          <>
            <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #eee' }} />
            <h3 style={{ marginBottom: '16px' }}>Datos del Administrador</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={groupStyle}>
                <label style={labelStyle}>Username *</label>
                <input name="admin_username" value={form.admin_username} onChange={handleChange} required style={inputStyle} />
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Email *</label>
                <input name="admin_email" type="email" value={form.admin_email} onChange={handleChange} required style={inputStyle} />
              </div>
              <div style={{ ...groupStyle, gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Contraseña *</label>
                <input name="admin_password" type="password" value={form.admin_password} onChange={handleChange} required minLength={6} style={inputStyle} />
              </div>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button type="button" onClick={onBack} style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>Cancelar</button>
          <button type="submit" disabled={loading} style={{ padding: '10px 20px', border: 'none', borderRadius: '6px', background: '#1976d2', color: '#fff', cursor: 'pointer' }}>
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
