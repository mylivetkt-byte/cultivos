import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import EmpresaManager from './EmpresaManager';

export default function TenantManager() {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTenant = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/sistemas/tenants');
      if (res.data && res.data.length > 0) {
        const tenantId = res.data[0].id_tenant;
        const detailRes = await fetchApi(`/sistemas/tenant/${tenantId}`);
        setTenant(detailRes.data);
      } else {
        setError('No se encontró información de la empresa.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTenant(); }, []);

  if (loading) return <div style={{ padding: '20px' }}>Cargando datos de la empresa...</div>;
  if (error) return <div style={{ padding: '20px', color: '#d32f2f' }}>{error}</div>;

  return (
    <EmpresaManager onSaved={loadTenant} editTenant={tenant} onBack={null} />
  );
}
