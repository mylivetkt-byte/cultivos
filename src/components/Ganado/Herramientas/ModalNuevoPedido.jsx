import React, { useState, useEffect } from 'react';
import { authFetch, fetchApi } from '../../../utils/api';
import { Input, Button, DatePicker, Select, Space, AutoComplete } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

function ModalNuevoPedido({ isOpen, onClose, onRefresh, fincaId, fincas }) {
  const [form, setForm] = useState({
    id_finca: fincaId || '',
    id_bodega_destino: '',
    fecha_pedido: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    solicitante: '',
    detalles: [{ herr: '', desc: '', cant: 1 }]
  });
  const [loading, setLoading] = useState(false);
  const [inventario, setInventario] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [bodegas, setBodegas] = useState([]);

  useEffect(() => {
    fetchApi('/ganado_herramientas/inventario')
      .then(res => setInventario(res.data || []))
      .catch(console.error);

    authFetch('/api/rrhh/empleados?tenantId=1')
      .then(res => res.json())
      .then(data => {
        const arr = data.data || data || [];
        setEmpleados(arr.map(e => ({ 
          value: e.nombre_completo || (e.nombres ? `${e.nombres} ${e.apellidos || ''}`.trim() : null) || e.nombre 
        })).filter(o => o.value));
      })
      .catch(console.error);

    authFetch('/api/table/bod_bodegas/data?tenantId=1&pageSize=100')
      .then(res => res.json())
      .then(data => {
        setBodegas(data.data || data || []);
      })
      .catch(console.error);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.id_finca) return alert("Seleccione una finca");
    if (!form.id_bodega_destino) return alert("Seleccione la bodega a la que solicita");
    if (!form.solicitante) return alert("Ingrese el solicitante");
    setLoading(true);
    try {
      const res = await authFetch('/api/ganado_herramientas/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        alert("Pedido solicitado correctamente");
        onRefresh();
        onClose();
      } else {
        const error = await res.json();
        alert("Error: " + (error.error || error.message));
      }
    } catch (err) {
      console.error(err);
      alert("Error al guardar");
    }
    setLoading(false);
  };

  const addRow = () => setForm({ ...form, detalles: [...form.detalles, { herr: '', desc: '', cant: 1 }] });
  const removeRow = (idx) => setForm({ ...form, detalles: form.detalles.filter((_, i) => i !== idx) });
  const updateRow = (idx, field, val) => {
    const newDetalles = [...form.detalles];
    newDetalles[idx][field] = val;
    setForm({ ...form, detalles: newDetalles });
  };

  const handleSelectOption = (idx, val) => {
    const parts = val.split(' - ');
    if (parts.length > 1) {
      const newDetalles = [...form.detalles];
      newDetalles[idx].herr = parts[0];
      newDetalles[idx].desc = parts.slice(1).join(' - ');
      setForm({ ...form, detalles: newDetalles });
    } else {
      updateRow(idx, 'desc', val);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '700px', maxWidth: '95%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#d97706', fontSize: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Solicitar Insumos a Central</h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '5px', display: 'block' }}>Finca Solicitante</label>
              <select value={form.id_finca} onChange={e => setForm({...form, id_finca: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}>
                <option value="">Seleccione Finca</option>
                {fincas?.map(f => <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '5px', display: 'block' }}>Bodega a Solicitar</label>
              <select required value={form.id_bodega_destino} onChange={e => setForm({...form, id_bodega_destino: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}>
                <option value="">Seleccione Bodega</option>
                {bodegas?.map(b => <option key={b.id_bodega} value={b.id_bodega}>{b.nombre}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '5px', display: 'block' }}>Solicitante</label>
              <AutoComplete
                options={empleados}
                placeholder="Busque solicitante..."
                value={form.solicitante}
                onChange={val => setForm({...form, solicitante: val})}
                style={{ width: '100%' }}
                filterOption={(inputValue, option) =>
                  option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                }
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '10px', display: 'block' }}>Ítems Requeridos</label>
            {form.detalles.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                <AutoComplete
                  options={inventario.map(item => ({ value: `${item.codigo} - ${item.nombre}` }))}
                  placeholder="Código (Opcional)"
                  value={d.herr}
                  onChange={val => updateRow(i, 'herr', val)}
                  onSelect={val => handleSelectOption(i, val)}
                  style={{ width: '150px' }}
                  filterOption={(inputValue, option) =>
                    option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                  }
                />
                <AutoComplete
                  options={inventario.map(item => ({ value: `${item.codigo} - ${item.nombre}` }))}
                  placeholder="Descripción de herramienta / insumo"
                  value={d.desc}
                  onChange={val => updateRow(i, 'desc', val)}
                  onSelect={val => handleSelectOption(i, val)}
                  style={{ flex: 1 }}
                  filterOption={(inputValue, option) =>
                    option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                  }
                />
                <Input type="number" min="1" step="0.01" required value={d.cant} onChange={e => updateRow(i, 'cant', e.target.value)} style={{ width: '100px' }} placeholder="Cant." />
                <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => removeRow(i)} disabled={form.detalles.length === 1} />
              </div>
            ))}
            <Button type="dashed" onClick={addRow} block icon={<PlusOutlined />}>Agregar Ítem</Button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '15px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>Cancelar</button>
            <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: '#d97706', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
              {loading ? 'Guardando...' : 'Enviar Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalNuevoPedido;
