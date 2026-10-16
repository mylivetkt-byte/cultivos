import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import EmpresaManager from './EmpresaManager';
import { useAuth } from '../../context/AuthContext';

export default function TenantManager() {
  const { tenantId } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTenant = async () => {
    setLoading(true);
    try {
      if (!tenantId) {
        setError('No se pudo identificar tu empresa.');
        setLoading(false);
        return;
      }
      const detailRes = await fetchApi(`/sistemas/tenant/${tenantId}`);
      if (detailRes.data) {
        setTenant(detailRes.data);
      } else {
        setError('No se encontró información de tu empresa.');
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
