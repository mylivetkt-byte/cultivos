import React, { useState, useEffect } from 'react';
import DatePickerClaro from '../../Common/DatePickerClaro';
import { authFetch } from '../../../utils/api';
import { Select, AutoComplete } from 'antd';

function ModalNuevoMovimiento({ isOpen, onClose, onRefresh, fincaId, fincas }) {
  const [inventario, setInventario] = useState([]);
  const [empleadosOpts, setEmpleadosOpts] = useState([]);
  const [ubicacionesOpts, setUbicacionesOpts] = useState([]);

  const [form, setForm] = useState({
    id_finca: fincaId || '',
    id_herr_inv: '',
    tipo_movimiento: 'Prestamo',
    fecha: new Date().toISOString().split('T')[0],
    cantidad: 1,
    origen_destino: '',
    responsable: '',
    observaciones: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Cargar empleados y lotes para el autocompletado
    authFetch('/api/rrhh/empleados?tenantId=1')
      .then(res => res.json())
      .then(data => {
        const arr = data.data || data || [];
        setEmpleadosOpts(arr.map(e => ({ 
          value: e.nombre_completo || (e.nombres ? `${e.nombres} ${e.apellidos || ''}`.trim() : null) || e.nombre 
        })).filter(o => o.value));
      })
      .catch(console.error);

    authFetch('/api/table/lotes/data?tenantId=1&pageSize=500')
      .then(res => res.json())
      .then(data => {
        const arr = data.data || data || [];
        setUbicacionesOpts(arr.map(l => ({ value: l.nombre })));
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const q = form.id_finca ? `?id_finca=${form.id_finca}` : '';
      authFetch(`/api/ganado_herramientas/inventario${q}`)
        .then(res => res.json())
        .then(res => setInventario(res.data || []))
        .catch(console.error);
    }
  }, [isOpen, form.id_finca]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.id_herr_inv) return alert("Seleccione una herramienta");
    if (!form.origen_destino) return alert("Ingrese el Lote / Origen");
    if (!form.responsable) return alert("Ingrese el Operario Responsable");
    setLoading(true);
    try {
      const res = await authFetch('/api/ganado_herramientas/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        alert("Movimiento registrado con éxito y firmado digitalmente.");
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

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg-color)', color: 'var(--text)', padding: '30px', borderRadius: '12px', width: '700px', maxWidth: '95%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: '0 0 20px 0', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>Registrar Movimiento / Asignación</h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Finca Operativa (Filtro)</label>
              <select value={form.id_finca} onChange={e => setForm({...form, id_finca: e.target.value, id_herr_inv: ''})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text)', fontSize: '14px' }}>
                <option value="">Todas las Fincas</option>
                {fincas?.map(f => <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>)}
              </select>
            </div>

            <div style={{ flex: 2, minWidth: 0 }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Herramienta / Insumo *</label>
              <Select
                showSearch
                placeholder="Busque por código o descripción..."
                optionFilterProp="children"
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                value={form.id_herr_inv || undefined}
                onChange={val => setForm({...form, id_herr_inv: val})}
                style={{ width: '100%' }}
                size="large"
                options={inventario.map(i => ({
                  value: i.id_herr_inv,
                  label: `${i.codigo} - ${i.nombre} (Stock: ${i.cantidad_actual})`
                }))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Tipo de Movimiento *</label>
              <select required value={form.tipo_movimiento} onChange={e => setForm({...form, tipo_movimiento: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text)', fontSize: '14px' }}>
                <option value="Entrada">Entrada (Compra/Suma Stock)</option>
                <option value="Salida">Salida (Consumo/Resta Stock)</option>
                <option value="Prestamo">Préstamo (Asignación a Empleado/Lote)</option>
                <option value="Traslado">Traslado</option>
                <option value="Baja_Daño">Baja / Daño</option>
              </select>
            </div>
            <div style={{ width: '120px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Cantidad *</label>
              <input type="number" step="0.01" required value={form.cantidad} onChange={e => setForm({...form, cantidad: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text)', fontSize: '14px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Fecha *</label>
              <DatePickerClaro required value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text)', fontSize: '14px' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Origen / Destino *</label>
              <div style={{ marginTop: '2px' }}>
                <AutoComplete
                  options={ubicacionesOpts}
                  value={form.origen_destino}
                  onChange={val => setForm({...form, origen_destino: val})}
                  placeholder="Ej: Lote 4"
                  style={{ width: '100%', height: '40px' }}
                  filterOption={(inputValue, option) =>
                    option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                  }
                />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Operario Responsable *</label>
              <div style={{ marginTop: '2px' }}>
                <AutoComplete
                  options={empleadosOpts}
                  value={form.responsable}
                  onChange={val => setForm({...form, responsable: val})}
                  placeholder="Ej: Juan Perez"
                  style={{ width: '100%', height: '40px' }}
                  filterOption={(inputValue, option) =>
                    option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                  }
                />
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>Observaciones</label>
            <textarea value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text)', fontSize: '14px' }} rows={3} placeholder="Detalles de la operación..."></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '15px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', background: 'var(--bg-color)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text)', fontWeight: 'bold', fontSize: '14px' }}>Cancelar</button>
            <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: 'var(--success)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
              {loading ? 'Guardando...' : 'Guardar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalNuevoMovimiento;
