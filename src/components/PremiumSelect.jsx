import React from 'react';
import Select from 'react-select';

// Estilos premium oscuros para react-select
const customStyles = {
  control: (provided, state) => ({
    ...provided,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none',
    color: '#fff',
    padding: '2px',
    borderRadius: '6px',
    cursor: 'pointer',
    minHeight: '42px',
    '&:hover': {
      border: '1px solid rgba(255,255,255,0.3)',
    }
  }),
  singleValue: (provided) => ({
    ...provided,
    color: '#fff',
    fontSize: '1rem'
  }),
  input: (provided) => ({
    ...provided,
    color: '#fff',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.95rem'
  }),
  menu: (provided) => ({
    ...provided,
    background: '#1f2937', // dark background for options popup
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    zIndex: 9999
  }),
  option: (provided, state) => ({
    ...provided,
    background: state.isSelected 
      ? '#3B82F6' 
      : state.isFocused 
        ? 'rgba(255,255,255,0.1)' 
        : 'transparent',
    color: '#fff',
    cursor: 'pointer',
    padding: '10px 15px',
    fontSize: '0.95rem',
    '&:active': {
      background: '#2563EB'
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
