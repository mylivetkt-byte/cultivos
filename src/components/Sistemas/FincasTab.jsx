import React from 'react';
import DynamicCatalog from '../DynamicCatalog';

export default function FincasTab({ tenantId }) {
  if (!tenantId) {
    return <div style={{ padding: '20px', color: '#666' }}>Guarda la empresa primero para poder agregar fincas.</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#2c3e50' }}>Gestión de Fincas</h3>
      <p style={{ color: '#7f8c8d', marginBottom: '24px', fontSize: '14px' }}>Administra las fincas y propiedades asociadas a esta empresa.</p>
      
      {/* Use the generic CRUD component for 'fincas' table, scoped to this tenant */}
      <DynamicCatalog 
        tableName="fincas" 
        tenantId={tenantId} 
      />
    </div>
  );
}
