import React, { useState, useEffect } from 'react';
import { fetchApi, authFetch } from '../../../utils/api';
import { Select, AutoComplete } from 'antd';
import AyudaCampesina from '../../Common/AyudaCampesina';

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
    // Cargar empleados y lagos para el autocompletado
    authFetch('/api/rrhh/empleados?tenantId=1')
      .then(res => res.json())
      .then(data => {
        const arr = data.data || data || [];
        setEmpleadosOpts(arr.map(e => ({ 
          value: e.nombre_completo || (e.nombres ? `${e.nombres} ${e.apellidos || ''}`.trim() : null) || e.nombre 
        })).filter(o => o.value));
      })
      .catch(console.error);

    fetchApi('/acuicola/filtros')
      .then(res => {
        if (res.estanques) setUbicacionesOpts(res.estanques.map(e => ({ value: 'Lago ' + e.codigo })));
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const q = form.id_finca ? `?id_finca=${form.id_finca}` : '';
      fetchApi(`/acuicola_herramientas/inventario${q}`)
        .then(res => setInventario(res.data || []))
        .catch(console.error);
    }
  }, [isOpen, form.id_finca]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.id_herr_inv) return alert("Seleccione una herramienta");
    if (!form.origen_destino) return alert("Ingrese el Lago / Origen");
    if (!form.responsable) return alert("Ingrese el Operario Responsable");
    setLoading(true);
    try {
      const res = await fetch('/api/acuicola_herramientas/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
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
      <div style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '12px', width: '720px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#0ea5e9', fontSize: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🪓</span> Registrar Movimiento / Custodia de Herramientas
        </h3>

        {/* Banner de Custodia */}
        <div style={{ background: 'rgba(14, 165, 233, 0.1)', border: '1px solid #0ea5e9', borderRadius: '8px', padding: '10px 14px', marginBottom: '15px' }}>
          <div style={{ fontWeight: 'bold', color: '#38bdf8', fontSize: '0.92em' }}>
            🛡️ Control y Custodia de Equipos Rurales:
          </div>
          <div style={{ fontSize: '0.84em', color: '#cbd5e1', marginTop: '3px', lineHeight: '1.4' }}>
            Registre si la herramienta sale prestada o si el jornalero la regresa limpia. Use el botón de voz 🔊 para escuchar las indicaciones de cada campo.
          </div>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '5px', display: 'block' }}>Finca Operativa (Filtro)</label>
              <select value={form.id_finca} onChange={e => setForm({...form, id_finca: e.target.value, id_herr_inv: ''})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#334155', color: '#fff', fontSize: '14px' }}>
                <option value="">Todas las Fincas</option>
                {fincas.map(f => <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>)}
              </select>
              <AyudaCampesina campo="id_finca" />
            </div>

            <div style={{ flex: 2, minWidth: 0 }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '5px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Herramienta / Insumo *</label>
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
              <AyudaCampesina campo="id_herr_inv" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '5px', display: 'block' }}>Tipo de Movimiento *</label>
              <select required value={form.tipo_movimiento} onChange={e => setForm({...form, tipo_movimiento: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#334155', color: '#fff', fontSize: '14px' }}>
                <option value="Prestamo">Préstamo (Entrega a Jornalero)</option>
                <option value="Entrada">Entrada (Devolución a Bodega / Compra)</option>
                <option value="Salida">Salida (Consumo / Desgaste)</option>
                <option value="Traslado">Traslado entre Fincas o Lotes</option>
                <option value="Baja_Daño">Baja / Daño o Rotura</option>
              </select>
              <AyudaCampesina campo="tipo_movimiento" />
            </div>
            <div style={{ width: '140px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '5px', display: 'block' }}>Cantidad *</label>
              <input type="number" step="0.01" required value={form.cantidad} onChange={e => setForm({...form, cantidad: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#334155', color: '#fff', fontSize: '14px' }} />
              <AyudaCampesina campo="cantidad_movimiento" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '5px', display: 'block' }}>Fecha *</label>
              <input type="date" required value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#334155', color: '#fff', fontSize: '14px' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '5px', display: 'block' }}>Lugar / Lote / Lago Destino *</label>
              <div style={{ marginTop: '2px' }}>
                <AutoComplete
                  options={ubicacionesOpts}
                  value={form.origen_destino}
                  onChange={val => setForm({...form, origen_destino: val})}
                  placeholder="Ej: Lote 2 o Estanque D1"
                  style={{ width: '100%', height: '40px' }}
                  filterOption={(inputValue, option) =>
                    option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                  }
                />
              </div>
              <AyudaCampesina campo="origen_destino" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '5px', display: 'block' }}>Jornalero / Operario Responsable *</label>
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
              <AyudaCampesina campo="responsable_herramienta" />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '5px', display: 'block' }}>Observaciones del Estado de la Herramienta</label>
            <textarea value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', background: '#334155', color: '#fff', fontSize: '14px' }} rows={2} placeholder="Ej: Se entrega afilado, sin fugas en la bomba..."></textarea>
            <AyudaCampesina campo="observaciones_herramienta" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', background: '#334155', color: '#cbd5e1', border: '1px solid #475569', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>Cancelar</button>
            <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
              {loading ? 'Guardando...' : '🪓 Guardar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalNuevoMovimiento;
