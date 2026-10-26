import React, { useState, useEffect } from 'react';
import DatePickerClaro from '../Common/DatePickerClaro';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import Modal from '../Modal';
import { fetchFKLookup } from '../../utils/api';
import { authFetch } from '../../utils/api';
import { customStyles } from '../PremiumSelect';

function SolicitudCompraModal({ isOpen, onClose, onSuccess, tenantId, fincaId, nucleoId }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Cabecera
  const [headerData, setHeaderData] = useState({
    id_finca: fincaId || '',
    id_empleado_solicitante: '',
    area_solicitante: '',
    prioridad: 'Normal',
    fecha_necesidad: '',
    observaciones: ''
  });

  const [fincas, setFincas] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  // Detalle (Carrito)
  const [cart, setCart] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadDropdowns();
    }
  }, [isOpen]);

  const loadDropdowns = async () => {
    setLoading(true);
    try {
      // Fincas
      const fData = await fetchFKLookup('solicitudes_pedido', 'id_finca', { tenantId });
      setFincas(fData.options || []);

      // Empleados
      const eData = await fetchFKLookup('solicitudes_pedido', 'id_empleado_solicitante', { tenantId });
      setEmpleados(eData.options || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmpleadoChange = async (selected) => {
    const id = selected ? selected.value : '';
    setHeaderData(prev => ({ ...prev, id_empleado_solicitante: id }));
    
    if (id) {
      try {
        const res = await authFetch(`/api/compras/empleado-area/${id}`);
        const data = await res.json();
        if (data.area) {
          setHeaderData(prev => ({ ...prev, area_solicitante: data.area }));
        }
      } catch (e) {
        console.error('Error auto-filling area:', e);
      }
    } else {
      setHeaderData(prev => ({ ...prev, area_solicitante: '' }));
    }
  };

  const loadInsumos = async (inputValue) => {
    if (!inputValue || inputValue.length < 2) return [];
    try {
      const res = await authFetch(`/api/compras/insumos/search?tenantId=${tenantId || ''}&q=${encodeURIComponent(inputValue)}`);
      const data = await res.json();
      return data.map(i => ({
        value: i.id_insumo,
        label: `${i.codigo} - ${i.nombre} (${i.unidad_medida})`,
        insumo: i
      }));
    } catch {
      return [];
    }
  };

  const handleAddInsumo = (selected) => {
    if (!selected) return;
    const { insumo } = selected;
    
    // Check if already in cart
    if (cart.find(c => c.id_insumo === insumo.id_insumo)) {
      alert('El insumo ya está en la lista.');
      return;
    }

    setCart(prev => [...prev, {
      id_insumo: insumo.id_insumo,
      codigo: insumo.codigo,
      nombre: insumo.nombre,
      unidad_medida: insumo.unidad_medida,
      cantidad: 1,
      costo_unitario: insumo.costo_unitario || 0,
      observaciones: ''
    }]);
  };

  const handleUpdateCartItem = (id_insumo, field, value) => {
    setCart(prev => prev.map(item => item.id_insumo === id_insumo ? { ...item, [field]: value } : item));
  };

  const handleRemoveCartItem = (id_insumo) => {
    setCart(prev => prev.filter(item => item.id_insumo !== id_insumo));
  };

  const handleSubmit = async () => {
    if (!headerData.id_empleado_solicitante || !headerData.area_solicitante || !headerData.fecha_necesidad) {
      setError('Empleado, Área y Fecha de Necesidad son obligatorios.');
      return;
    }
    if (cart.length === 0) {
      setError('Debe agregar al menos un insumo.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...headerData,
        tenantId,
        items: cart
      };

      const response = await authFetch('/api/compras/solicitud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error al guardar');
      
      if (onSuccess) onSuccess(result.id_solicitud);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderDropdown = (options, value, onChange, placeholder) => {
    const selected = options.find(o => String(o.id) === String(value));
    return (
      <Select styles={customStyles}
        placeholder={placeholder}
        options={options.map(o => ({ value: o.id, label: o.display || String(o.id) }))}
        value={selected ? { value: selected.id, label: selected.display } : null}
        onChange={onChange}
        menuPortalTarget={document.body}
        styles={{
          menuPortal: base => ({ ...base, zIndex: 9999 }),
          control: (base) => ({ ...base, background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text)' }),
          menu: (base) => ({ ...base, background: 'var(--card-bg)', color: 'var(--text)' }),
          option: (base, state) => ({ ...base, background: state.isFocused ? 'var(--primary-light)' : 'transparent', color: 'var(--text)' }),
          singleValue: (base) => ({ ...base, color: 'var(--text)' })
        }}
      />
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🛒 Crear Solicitud de Pedido"
      width="900px"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose} disabled={submitting}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || loading}>
            {submitting ? 'Procesando...' : '✓ Guardar Pedido'}
          </button>
        </>
      }
    >
      {loading ? (
        <div className="p-4">Cargando datos...</div>
      ) : (
        <div className="p-4" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {error && <div className="form-error" style={{ padding: '12px', background: 'var(--danger-light)', borderRadius: '4px' }}>{error}</div>}
          
          <div className="card" style={{ padding: '20px', background: 'var(--card-bg)' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>1. Datos de la Solicitud</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Finca</label>
                {renderDropdown(fincas, headerData.id_finca, (s) => setHeaderData({ ...headerData, id_finca: s ? s.value : '' }), '-- Seleccione Finca --')}
              </div>
              <div className="form-group">
                <label>Empleado Solicitante *</label>
                <Select styles={customStyles}
                  placeholder="Buscar empleado..."
                  options={empleados.map(o => ({ value: o.id, label: o.display }))}
                  value={headerData.id_empleado_solicitante ? { value: headerData.id_empleado_solicitante, label: empleados.find(e => String(e.id) === String(headerData.id_empleado_solicitante))?.display } : null}
                  onChange={handleEmpleadoChange}
                  menuPortalTarget={document.body}
                  styles={{
                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                    control: (base) => ({ ...base, background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text)' }),
                    menu: (base) => ({ ...base, background: 'var(--card-bg)', color: 'var(--text)' }),
                    option: (base, state) => ({ ...base, background: state.isFocused ? 'var(--primary-light)' : 'transparent', color: 'var(--text)' }),
                    singleValue: (base) => ({ ...base, color: 'var(--text)' })
                  }}
                />
              </div>
              <div className="form-group">
                <label>Área Operativa *</label>
                <select 
                  value={headerData.area_solicitante} 
                  onChange={(e) => setHeaderData({...headerData, area_solicitante: e.target.value})}
                >
                  <option value="">-- Seleccionar Área --</option>
                  {['Taller', 'Administracion', 'Recursos Humanos', 'Invernadero', 'Produccion Abonos Organicos', 'Campo', 'Sistemas', 'Gerencia', 'Almacen'].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Fecha de Necesidad *</label>
                <DatePickerClaro value={headerData.fecha_necesidad} 
                  onChange={(e) => setHeaderData({...headerData, fecha_necesidad: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Prioridad</label>
                <select value={headerData.prioridad} onChange={(e) => setHeaderData({...headerData, prioridad: e.target.value})}>
                  <option value="Normal">Normal</option>
                  <option value="Urgente">Urgente</option>
                  <option value="Critica">Crítica</option>
                </select>
              </div>
              <div className="form-group">
                <label>Observaciones (Cabecera)</label>
                <input type="text" value={headerData.observaciones} onChange={(e) => setHeaderData({...headerData, observaciones: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '20px', background: 'var(--card-bg)' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>2. Lista de Insumos</h3>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>🔍 Buscar Producto (Nombre o Código)</label>
              <AsyncSelect
                cacheOptions
                defaultOptions={false}
                loadOptions={loadInsumos}
                onChange={handleAddInsumo}
                placeholder="Escribe para buscar..."
                value={null}
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: base => ({ ...base, zIndex: 9999 }),
                  control: (base) => ({ ...base, background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }),
                  menu: (base) => ({ ...base, background: 'var(--card-bg)', color: 'var(--text)' }),
                  option: (base, state) => ({ ...base, background: state.isFocused ? 'var(--primary-light)' : 'transparent', color: 'var(--text)' }),
                  singleValue: (base) => ({ ...base, color: 'var(--text)' })
                }}
              />
            </div>

            {cart.length > 0 ? (
              <table className="data-table" style={{ marginTop: '10px' }}>
                <thead>
                  <tr style={{ background: 'var(--primary-light)', color: 'var(--text)' }}>
                    <th style={{ padding: '8px' }}>Código</th>
                    <th style={{ padding: '8px' }}>Producto</th>
                    <th style={{ padding: '8px' }}>Cant.</th>
                    <th style={{ padding: '8px' }}>Costo Est. ($)</th>
                    <th style={{ padding: '8px' }}>Observación (Ítem)</th>
                    <th style={{ padding: '8px' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.id_insumo}>
                      <td>{item.codigo}</td>
                      <td>{item.nombre} <small style={{display:'block', color:'var(--text-muted)'}}>{item.unidad_medida}</small></td>
                      <td>
                        <input 
                          type="number" 
                          value={item.cantidad} 
                          onChange={(e) => handleUpdateCartItem(item.id_insumo, 'cantidad', parseFloat(e.target.value) || 0)}
                          style={{ width: '80px', padding: '4px' }}
                          min="1"
                          step="1"
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          value={item.costo_unitario} 
                          onChange={(e) => handleUpdateCartItem(item.id_insumo, 'costo_unitario', parseFloat(e.target.value) || 0)}
                          style={{ width: '100px', padding: '4px' }}
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          value={item.observaciones} 
                          onChange={(e) => handleUpdateCartItem(item.id_insumo, 'observaciones', e.target.value)}
                          placeholder="Nota..."
                          style={{ width: '100%', padding: '4px' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="btn btn-sm btn-danger" onClick={() => handleRemoveCartItem(item.id_insumo)} title="Eliminar">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                No hay productos en el carrito. Utiliza el buscador de arriba.
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default SolicitudCompraModal;
