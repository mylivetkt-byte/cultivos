import React, { useState, useEffect } from 'react';
import { fetchApi, API_BASE } from '../../utils/api';
import { calcularDV } from '../../utils/dian';

export default function TenantForm({ onBack, onSaved, editTenant = null, isEmbedded = false }) {
  const [form, setForm] = useState({
    razon_social: editTenant?.razon_social || '',
    nombre_comercial: editTenant?.nombre_comercial || '',
    tipo_documento: editTenant?.tipo_documento || 'NIT',
    nit: editTenant?.nit || '',
    dv: editTenant?.dv || '',
    tipo_contribuyente: editTenant?.tipo_contribuyente || 'Persona Jurídica',
    regimen_tributario: editTenant?.regimen_tributario || '',
    responsabilidades_fiscales: editTenant?.responsabilidades_fiscales || '',
    codigo_ciiu: editTenant?.codigo_ciiu || '',
    pais: editTenant?.pais || 'Colombia',
    departamento_fiscal: editTenant?.departamento_fiscal || '',
    municipio_fiscal: editTenant?.municipio_fiscal || '',
    direccion_fiscal: editTenant?.direccion_fiscal || '',
    telefono_contacto: editTenant?.telefono_contacto || '',
    correo_facturacion: editTenant?.correo_facturacion || '',
    moneda_local: editTenant?.moneda_local || 'COP',
    huso_horario: editTenant?.huso_horario || 'America/Bogota',
    plan_suscripcion: editTenant?.plan_suscripcion || 'Basic',
    limite_hectareas: editTenant?.limite_hectareas || 50,
    limite_usuarios: editTenant?.limite_usuarios || 3,
    admin_username: '',
    admin_email: '',
    admin_password: '',
    logo_path: editTenant?.logo_path || '',
  });
  const [logoPreview, setLogoPreview] = useState(editTenant?.logo_path ? (editTenant.logo_path.startsWith('http') ? editTenant.logo_path : `${API_BASE.replace('/api', '')}${editTenant.logo_path.startsWith('/') ? '' : '/'}${editTenant.logo_path}`) : null);
  const [logoBase64, setLogoBase64] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [departamentos, setDepartamentos] = useState([]);
  const [municipios, setMunicipios] = useState([]);

  useEffect(() => {
    fetchApi('/municipios/departamentos')
      .then(res => setDepartamentos(res))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (form.departamento_fiscal) {
      fetchApi(`/municipios/departamentos/${form.departamento_fiscal}/municipios`)
        .then(res => setMunicipios(res.map(m => m.municipio)))
        .catch(console.error);
    } else {
      setMunicipios([]);
    }
  }, [form.departamento_fiscal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'nit') {
        updated.dv = calcularDV(value);
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = editTenant ? `/sistemas/tenant/${editTenant.id_tenant}` : '/sistemas/tenant';
      const method = editTenant ? 'PUT' : 'POST';
      const body = editTenant
        ? { 
            razon_social: form.razon_social, nombre_comercial: form.nombre_comercial, tipo_documento: form.tipo_documento,
            nit: form.nit, dv: form.dv, tipo_contribuyente: form.tipo_contribuyente, regimen_tributario: form.regimen_tributario,
            responsabilidades_fiscales: form.responsabilidades_fiscales, codigo_ciiu: form.codigo_ciiu, pais: form.pais,
            departamento_fiscal: form.departamento_fiscal, municipio_fiscal: form.municipio_fiscal, direccion_fiscal: form.direccion_fiscal,
            telefono_contacto: form.telefono_contacto, correo_facturacion: form.correo_facturacion, moneda_local: form.moneda_local, 
            huso_horario: form.huso_horario, plan_suscripcion: form.plan_suscripcion, limite_hectareas: form.limite_hectareas, 
            limite_usuarios: form.limite_usuarios 
          }
        : form;

      const result = await fetchApi(endpoint, { method, body: JSON.stringify(body) });
      const savedTenantId = editTenant ? editTenant.id_tenant : result.tenantId;

      if (logoBase64 && savedTenantId) {
        await fetchApi('/config/logo', {
          method: 'POST',
          body: JSON.stringify({ tenantId: savedTenantId, base64: logoBase64 })
        });
      }

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

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result);
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ padding: isEmbedded ? '0px' : '20px', maxWidth: '700px' }}>
      {!isEmbedded && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={onBack} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}>←</button>
          <h2 style={{ margin: 0 }}>{editTenant ? 'Editar Empresa' : 'Nueva Empresa'}</h2>
        </div>
      )}

      {error && <div style={{ color: '#d32f2f', background: '#ffebee', padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <h3 style={{ color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '8px', marginBottom: '16px' }}>Información General</h3>
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
          <div style={{ ...groupStyle, gridColumn: 'span 2' }}>
            <label style={labelStyle}>Logo de la Empresa (PNG/JPG)</label>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <input type="file" accept="image/*" onChange={handleLogoChange} style={{ ...inputStyle, flex: 1, padding: '4px' }} />
              {logoPreview && (
                <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd', background: '#f5f5f5' }}>
                  <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              )}
            </div>
          </div>
        </div>

        <h3 style={{ color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '8px', marginTop: '24px', marginBottom: '16px' }}>Datos Tributarios (DIAN)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={groupStyle}>
            <label style={labelStyle}>Tipo de Documento</label>
            <select name="tipo_documento" value={form.tipo_documento} onChange={handleChange} style={inputStyle}>
              <option value="NIT">NIT</option>
              <option value="CC">Cédula de Ciudadanía</option>
              <option value="CE">Cédula de Extranjería</option>
              <option value="Pasaporte">Pasaporte</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '8px' }}>
            <div style={groupStyle}>
              <label style={labelStyle}>Número / NIT *</label>
              <input name="nit" value={form.nit} onChange={handleChange} required style={inputStyle} />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>DV</label>
              <input name="dv" value={form.dv} onChange={handleChange} maxLength={1} style={inputStyle} />
            </div>
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Tipo Contribuyente</label>
            <select name="tipo_contribuyente" value={form.tipo_contribuyente} onChange={handleChange} style={inputStyle}>
              <option value="Persona Jurídica">Persona Jurídica</option>
              <option value="Persona Natural">Persona Natural</option>
            </select>
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Régimen Tributario</label>
            <select name="regimen_tributario" value={form.regimen_tributario} onChange={handleChange} style={inputStyle}>
              <option value="">-- Seleccionar --</option>
              <option value="48 - Impuesto sobre las ventas (Responsable de IVA)">48 - Impuesto sobre las ventas (Responsable de IVA)</option>
              <option value="49 - No responsable de IVA">49 - No responsable de IVA</option>
              <option value="47 - Régimen simple de tributación">47 - Régimen simple de tributación</option>
            </select>
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Responsabilidades Fiscales</label>
            <select name="responsabilidades_fiscales" value={form.responsabilidades_fiscales} onChange={handleChange} style={inputStyle}>
              <option value="">-- Seleccionar --</option>
              <option value="O-13 Gran contribuyente">O-13 Gran contribuyente</option>
              <option value="O-15 Autorretenedor">O-15 Autorretenedor</option>
              <option value="O-23 Agente de retención IVA">O-23 Agente de retención IVA</option>
              <option value="O-47 Régimen simple de tributación">O-47 Régimen simple de tributación</option>
              <option value="R-99-PN No aplica / Otros">R-99-PN No aplica / Otros</option>
            </select>
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Código CIIU</label>
            <input name="codigo_ciiu" value={form.codigo_ciiu} onChange={handleChange} placeholder="Ej: 0111" style={inputStyle} />
          </div>
        </div>

        <h3 style={{ color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '8px', marginTop: '24px', marginBottom: '16px' }}>Ubicación y Contacto Fiscal</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ ...groupStyle, gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Dirección Fiscal</label>
            <input name="direccion_fiscal" value={form.direccion_fiscal} onChange={handleChange} style={inputStyle} />
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Departamento</label>
            <select name="departamento_fiscal" value={form.departamento_fiscal} onChange={handleChange} style={inputStyle}>
              <option value="">-- Seleccionar --</option>
              {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Municipio</label>
            <select name="municipio_fiscal" value={form.municipio_fiscal} onChange={handleChange} style={inputStyle} disabled={!form.departamento_fiscal}>
              <option value="">-- Seleccionar --</option>
              {municipios.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Teléfono de Contacto</label>
            <input name="telefono_contacto" value={form.telefono_contacto} onChange={handleChange} style={inputStyle} />
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Correo Facturación Electrónica</label>
            <input name="correo_facturacion" value={form.correo_facturacion} onChange={handleChange} style={inputStyle} />
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
