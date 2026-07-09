// src/components/Payroll/AttendanceTracker.jsx
import React from 'react';

function AttendanceTracker({ tenantId }) {
  return (
    <div className="payroll-attendance glass-card" style={{ padding: '20px', borderRadius: 'var(--radius)', background: 'var(--card-bg)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <h2>🕒 Asistencia</h2>
      <p>Registro de asistencia para el tenant {tenantId}.</p>
      {/* Future: clock‑in/out buttons, calendar view, biometric integration */}
    </div>
  );
}

export default AttendanceTracker;
