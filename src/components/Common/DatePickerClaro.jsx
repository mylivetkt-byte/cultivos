import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';

/**
 * Componente unificado de selector de fecha de alta visibilidad y claridad.
 * Proporciona un botón prominente en azul con icono de calendario blanco
 * y abre el selector de fechas moderno nativo del navegador al hacer clic.
 */
const DatePickerClaro = ({
  label,
  value = '',
  onChange,
  name,
  id,
  min,
  max,
  disabled = false,
  required = false,
  style = {},
  inputStyle = {},
  className = '',
  onBlur,
  onFocus,
  ...rest
}) => {
  const inputRef = useRef(null);

  const openPicker = (e) => {
    if (disabled) return;
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (inputRef.current) {
      if (typeof inputRef.current.showPicker === 'function') {
        try {
          inputRef.current.showPicker();
        } catch {
          inputRef.current.focus();
        }
      } else {
        inputRef.current.focus();
      }
    }
  };

  // Filtrar estilos legados que puedan arruinar el diseño estándar
  const {
    border: _ignoredBorder,
    borderWidth: _ignoredBw,
    borderColor: _ignoredBc,
    padding: _ignoredPadding,
    paddingLeft: _ignoredPl,
    paddingRight: _ignoredPr,
    paddingTop: _ignoredPt,
    paddingBottom: _ignoredPb,
    background: _ignoredBg,
    backgroundColor: _ignoredBgColor,
    color: _ignoredColor,
    height: customHeight,
    ...cleanWrapperStyle
  } = style || {};

  const content = (
    <>
      <style>{`
        .high-clarity-datepicker-input::-webkit-calendar-picker-indicator {
          display: none !important;
          -webkit-appearance: none !important;
          opacity: 0 !important;
          width: 0 !important;
          height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          pointer-events: none !important;
        }
      `}</style>
      <div
        className={`datepicker-claro-wrapper ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#1e293b',
          border: '1.5px solid rgba(56, 189, 248, 0.45)',
        borderRadius: '8px',
        height: customHeight || '40px',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
        minWidth: cleanWrapperStyle.width === '100%' ? '100%' : '180px',
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...cleanWrapperStyle
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = '#38bdf8';
          e.currentTarget.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.35)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.45)';
          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';
        }
      }}
    >
      <input
        ref={inputRef}
        type="date"
        name={name}
        id={id}
        value={value || ''}
        min={min}
        max={max}
        disabled={disabled}
        required={required}
        onChange={onChange}
        onClick={openPicker}
        onBlur={onBlur}
        onFocus={onFocus}
        className="high-clarity-datepicker-input"
        style={{
          flex: 1,
          height: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: '600',
          padding: '0 10px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          letterSpacing: '0.5px',
          minWidth: 0,
          ...inputStyle
        }}
        {...rest}
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        title="Abrir calendario para seleccionar fecha"
        style={{
          background: disabled
            ? '#334155'
            : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          border: 'none',
          borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
          height: '100%',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          color: '#ffffff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: '600',
          transition: 'all 0.2s ease',
          flexShrink: 0
        }}
        onMouseEnter={(e) => {
          if (!disabled) e.currentTarget.style.background = '#0ea5e9';
        }}
        onMouseLeave={(e) => {
          if (!disabled)
            e.currentTarget.style.background =
              'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
        }}
      >
        <Calendar size={16} strokeWidth={2.4} color="#ffffff" />
      </button>
    </div>
  </>
  );

  if (label) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label
          style={{
            fontSize: '13px',
            fontWeight: '700',
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Calendar size={14} color="#38bdf8" /> {label}
        </label>
        {content}
      </div>
    );
  }

  return content;
};

export default DatePickerClaro;
