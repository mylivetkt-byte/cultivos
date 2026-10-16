import React from 'react';
import DynamicCatalog from '../DynamicCatalog';

export default function BodegasTab({ tenantId }) {
  if (!tenantId) {
    return <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>Guarda la empresa primero para poder agregar bodegas.</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)' }}>Gestión de Bodegas</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>Administra las bodegas y almacenes asociados a las fincas de esta empresa.</p>
      
      <DynamicCatalog 
        tableName="bod_bodegas" 
        tenantId={tenantId} 
      />
    </div>
  );
}
