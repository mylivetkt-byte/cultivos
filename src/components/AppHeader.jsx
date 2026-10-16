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
  const isAdmin = user?.rol === 'Super_Admin' || user?.rol === 'Administrador_Empresa';
  
  // Filtrar fincas permitidas si no es admin
  const allowedFincas = isAdmin 
    ? fincasList 
    : fincasList.filter(f => user?.fincas?.includes(f.id_finca));

  // Si no es admin y solo tiene 1 finca, forzar la selección a esa finca y deshabilitar el dropdown
  React.useEffect(() => {
    if (!isAdmin && allowedFincas.length === 1 && selectedFinca !== allowedFincas[0].id_finca.toString()) {
      handleFincaChange(allowedFincas[0].id_finca.toString());
    }
  }, [isAdmin, allowedFincas, selectedFinca, handleFincaChange]);

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
          disabled={!isAdmin && allowedFincas.length <= 1}
          style={{ padding: '6px 12px', fontSize: '13px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', maxWidth: '150px', outline: 'none', fontWeight: 500, opacity: (!isAdmin && allowedFincas.length <= 1) ? 0.6 : 1 }}
        >
          {isAdmin || allowedFincas.length > 1 ? <option value="">-- Todas --</option> : null}
          {allowedFincas.map(f => (
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
        {user?.tenant_nombre && (
          <div style={{
            background: 'var(--primary)',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 'bold',
            letterSpacing: '0.5px',
            marginRight: '10px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
              <rect x="9" y="9" width="6" height="6"></rect>
              <line x1="9" y1="1" x2="9" y2="4"></line>
              <line x1="15" y1="1" x2="15" y2="4"></line>
              <line x1="9" y1="20" x2="9" y2="23"></line>
              <line x1="15" y1="20" x2="15" y2="23"></line>
              <line x1="20" y1="9" x2="23" y2="9"></line>
              <line x1="20" y1="14" x2="23" y2="14"></line>
              <line x1="1" y1="9" x2="4" y2="9"></line>
              <line x1="1" y1="14" x2="4" y2="14"></line>
            </svg>
            {user.tenant_nombre}
          </div>
        )}
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{user?.username}</span>
        <button onClick={logout} className="btn btn-sm" style={{ fontSize: '12px', padding: '4px 10px', background: 'var(--danger, #d32f2f)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
          Salir
        </button>
      </div>
    </header>
  );
}

export default AppHeader;
