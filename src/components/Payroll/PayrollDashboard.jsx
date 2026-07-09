// src/components/Payroll/PayrollDashboard.jsx
import React from 'react';

function PayrollDashboard({ tenantId }) {
  return (
    <div className="payroll-dashboard glass-card" style={{ padding: '20px', borderRadius: 'var(--radius)', background: 'var(--card-bg)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <h2>💰 Nómina Dashboard</h2>
      <p>Resumen de nómina para el cliente (tenant) {tenantId}.</p>
      {/* Add premium cards, charts, etc. later */}
    </div>
  );
}

export default PayrollDashboard;
