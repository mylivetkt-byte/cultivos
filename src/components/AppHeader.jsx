import React from 'react';

function AppHeader({ toggleSidebar,
  selectedFinca,
  selectedNucleo,
  fincasList,
  nucleosList,
  handleFincaChange,
  handleNucleoChange,
  user,
  logout,
  handleNavigateHome,
}) {
  return (
    <header className="top-bar">
      <button className="hamburger-btn" onClick={toggleSidebar}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>
      <div className="filter-select-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>🟢 Finca:</span>
        <select
          value={selectedFinca}
          onChange={(e) => handleFincaChange(e.target.value)}
          style={{ padding: '6px 12px', fontSize: '13px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', maxWidth: '150px', outline: 'none', fontWeight: 500 }}
        >
          <option value="">-- Todas --</option>
          {fincasList.map(f => (
            <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>
          ))}
        </select>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>🟢 Núcleo:</span>
        <select
          value={selectedNucleo}
          onChange={(e) => handleNucleoChange(e.target.value)}
          disabled={!selectedFinca}
          style={{ padding: '6px 12px', fontSize: '13px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', maxWidth: '150px', outline: 'none', opacity: selectedFinca ? 1 : 0.6, cursor: selectedFinca ? 'pointer' : 'not-allowed', fontWeight: 500 }}
        >
          <option value="">-- Todos --</option>
          {nucleosList.map(n => (
            <option key={n.id_nucleo} value={n.id_nucleo}>{n.nombre}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{user.username}</span>
        <button onClick={logout} className="btn btn-sm" style={{ fontSize: '12px', padding: '4px 10px', background: 'var(--danger, #d32f2f)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
          Salir
        </button>
      </div>
    </header>
  );
}

export default AppHeader;
