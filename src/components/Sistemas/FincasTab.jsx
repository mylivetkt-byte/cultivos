import React from 'react';
import DynamicCatalog from '../DynamicCatalog';

export default function FincasTab({ tenantId }) {
  if (!tenantId) {
    return <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>Guarda la empresa primero para poder agregar fincas.</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)' }}>Gestión de Fincas</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>Administra las fincas y propiedades asociadas a esta empresa.</p>
      
      {/* Use the generic CRUD component for 'fincas' table, scoped to this tenant */}
      <DynamicCatalog 
        tableName="fincas" 
        tenantId={tenantId} 
      />
    </div>
  );
}
