// src/components/Payroll/ContractsGrid.jsx
import React from 'react';

function ContractsGrid({ tenantId }) {
  return (
    <div className="payroll-contracts glass-card" style={{ padding: '20px', borderRadius: 'var(--radius)', background: 'var(--card-bg)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <h2>📄 Contratos</h2>
      <p>Gestión de contratos para el tenant {tenantId}.</p>
      {/* TODO: Implement table with CRUD for contracts */}
    </div>
  );
}

export default ContractsGrid;
