import React from 'react';

function Modal({ isOpen, onClose, title, subtitle, children, footer }) {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} onKeyDown={handleKeyDown}>
      <div 
        className="modal" 
        style={{ 
          background: '#1e293b', 
          border: '1px solid rgba(255, 255, 255, 0.12)', 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.55)',
          overflow: 'hidden'
        }}
      >
        <div 
          className="modal-header" 
          style={{ 
            background: '#162032', 
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)', 
            padding: '16px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, marginRight: '16px' }}>
            <h3 
              style={{ 
                margin: 0, 
                fontSize: '18px', 
                fontWeight: '700', 
                color: '#ffffff', 
                letterSpacing: '0.2px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px' 
              }}
            >
              {title || 'Formulario de Registro'}
            </h3>
            {subtitle && (
              <span style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                {subtitle}
              </span>
            )}
          </div>
          <button 
            className="modal-close" 
            onClick={onClose}
            title="Cerrar ventana (Esc)"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '6px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              cursor: 'pointer',
              color: '#94a3b8',
              lineHeight: 1,
              flexShrink: 0,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            ×
          </button>
        </div>
        <div className="modal-body" style={{ background: '#1e293b', color: '#f8fafc', padding: '20px 24px' }}>
          {children}
        </div>
        {footer && (
          <div 
            className="modal-footer" 
            style={{ 
              background: '#162032', 
              borderTop: '1px solid rgba(255, 255, 255, 0.12)', 
              padding: '14px 22px',
              borderBottomLeftRadius: '12px',
              borderBottomRightRadius: '12px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
