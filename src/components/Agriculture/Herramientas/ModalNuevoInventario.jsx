import React, { useState } from 'react';

function ModalNuevoInventario({ isOpen, onClose, onRefresh, fincaId, fincas }) {
  const [form, setForm] = useState({
    id_finca: fincaId || '',
    codigo: '',
    nombre: '',
    tipo: 'Herramienta',
    unidad_medida: 'Unidad',
    cantidad_actual: 0,
    costo_unitario: 0,
    notas: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/acuicola_herramientas/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        alert("Herramienta/Insumo registrado con éxito.");
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
      <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '8px', width: '500px', maxWidth: '90%' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>Registrar Nueva Herramienta / Insumo</h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Finca</label>
            <select required value={form.id_finca} onChange={e => setForm({...form, id_finca: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="">Seleccione Finca...</option>
              {fincas.map(f => <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Código</label>
              <input type="text" placeholder="Ej: AC-RED-001" required value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Nombre del Ítem</label>
              <input type="text" placeholder="Ej: Atarraya Monofilamento" required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Categoría</label>
              <select required value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <option value="Herramienta">Herramienta</option>
                <option value="Equipos">Equipos / Motores</option>
                <option value="Insumos">Insumos Químicos</option>
                <option value="Repuestos">Repuestos</option>
              </select>
            </div>
            <div style={{ width: '100px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>U. Medida</label>
              <select required value={form.unidad_medida} onChange={e => setForm({...form, unidad_medida: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <option value="Unidad">Unidad</option>
                <option value="Kg">Kg</option>
                <option value="Litro">Litro</option>
                <option value="Metro">Metro</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Stock Inicial</label>
              <input type="number" step="0.01" required value={form.cantidad_actual} onChange={e => setForm({...form, cantidad_actual: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Costo Unitario Promedio</label>
              <input type="number" step="0.01" required value={form.costo_unitario} onChange={e => setForm({...form, costo_unitario: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Notas</label>
            <textarea value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} rows={2}></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 15px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={loading} style={{ padding: '8px 15px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {loading ? 'Guardando...' : 'Guardar Inventario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalNuevoInventario;
