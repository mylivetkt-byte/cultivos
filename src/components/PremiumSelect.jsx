import React from 'react';
import Select from 'react-select';

// Estilos premium oscuros para react-select
export const customStyles = {
  control: (provided, state) => ({
    ...provided,
    background: 'var(--card-bg, #fff)',
    border: '1px solid var(--border, #ccc)',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none',
    color: 'var(--text, #333)',
    padding: '2px',
    borderRadius: '6px',
    cursor: 'pointer',
    minHeight: '42px',
    '&:hover': {
      border: '1px solid var(--primary, #3b82f6)',
    }
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'var(--text, #333)',
    fontSize: '1rem'
  }),
  input: (provided) => ({
    ...provided,
    color: 'var(--text, #333)',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'var(--text-secondary, #888)',
    fontSize: '0.95rem'
  }),
  menu: (provided) => ({
    ...provided,
    background: 'var(--card-bg, #fff)',
    border: '1px solid var(--border, #ccc)',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    zIndex: 9999
  }),
  option: (provided, state) => ({
    ...provided,
    background: state.isSelected 
      ? 'var(--primary, #3B82F6)' 
      : state.isFocused 
        ? 'rgba(59, 130, 246, 0.1)' 
        : 'transparent',
    color: state.isSelected ? '#fff' : 'var(--text, #333)',
    cursor: 'pointer',
    padding: '10px 15px',
    fontSize: '0.95rem',
    '&:active': {
      background: 'var(--primary-dark, #2563EB)'
    }
  }),
  menuList: (provided) => ({
    ...provided,
    padding: 0
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: 9999
  })
};

export default function PremiumSelect({ options, value, onChange, placeholder = 'Buscar...', isClearable = true, ...props }) {
  // Find selected object to pass to React-Select
  const selectedOption = options.find(opt => opt.value === value) || null;

  const handleChange = (selected) => {
    // Return standard event-like object for compatibility with onChange(e)
    const e = {
      target: {
        value: selected ? selected.value : ''
      }
    };
    onChange(e);
  };

  return (
    <Select
      styles={customStyles}
      options={options}
      value={selectedOption}
      onChange={handleChange}
      placeholder={placeholder}
      isClearable={isClearable}
      noOptionsMessage={() => "No se encontraron resultados"}
      menuPortalTarget={document.body}
      menuPosition="fixed"
      {...props}
    />
  );
}
