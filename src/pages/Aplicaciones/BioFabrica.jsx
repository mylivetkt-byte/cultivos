import React, { useState, useEffect } from 'react';
import { getProduccion, createProduccion, updateProduccion, deleteProduccion } from '../../services/aplicacionesApi';
import '../../components/dashboard.css';

export default function BioFabrica({ tenantId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ lote_id: '', producto: '', cantidad_litros: '', costo_materiales: 0, costo_jornales: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await getProduccion({ tenantId });
      setItems(res.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.lote_id || !form.producto || !form.cantidad_litros) return alert('Lote, producto y cantidad son requeridos');
    setSaving(true);
    try {
      if (editItem) {
        await updateProduccion(editItem.id_produccion, { ...form, tenantId, cantidad_litros: Number(form.cantidad_litros), costo_materiales: Number(form.costo_materiales), costo_jornales: Number(form.costo_jornales) });
      } else {
        await createProduccion({ ...form, tenantId, cantidad_litros: Number(form.cantidad_litros), costo_materiales: Number(form.costo_materiales), costo_jornales: Number(form.costo_jornales) });
      }
      setShowModal(false);
      setEditItem(null);
      setForm({ lote_id: '', producto: '', cantidad_litros: '', costo_materiales: 0, costo_jornales: 0 });
      cargar();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setForm({ lote_id: item.lote_id, producto: item.producto, cantidad_litros: item.cantidad_litros, costo_materiales: item.costo_materiales, costo_jornales: item.costo_jornales });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar registro de producción?')) return;
    try {
      await deleteProduccion(id);
      cargar();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>🏭 Bio-Fábrica (Abonos y Bioles)</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setForm({ lote_id: '', producto: '', cantidad_litros: '', costo_materiales: 0, costo_jornales: 0 }); setShowModal(true); }}>+ Registrar Producción</button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <div className="loading-container"><div className="spinner" /><span>Cargando…</span></div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead>
              <tr><th>ID</th><th>Lote</th><th>Producto</th><th>Cant. Litros</th><th>Costo Materiales</th><th>Costo Jornales</th><th>Total</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan="8" className="text-center text-muted">Sin registros</td></tr>
              ) : items.map((it) => (
                <tr key={it.id_produccion}>
                  <td>{it.id_produccion}</td>
                  <td>{it.lote_id}</td>
                  <td><strong>{it.producto}</strong></td>
                  <td>{Number(it.cantidad_litros).toFixed(1)}</td>
                  <td>{Number(it.costo_materiales || 0).toFixed(2)}</td>
                  <td>{Number(it.costo_jornales || 0).toFixed(2)}</td>
                  <td>{(Number(it.costo_materiales || 0) + Number(it.costo_jornales || 0)).toFixed(2)}</td>
                  <td>
                    <button className="btn btn-info btn-xs" onClick={() => handleEdit(it)}>✏️</button>{' '}
                    <button className="btn btn-danger btn-xs" onClick={() => handleDelete(it.id_produccion)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editItem ? 'Editar Producción' : 'Registrar Producción'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Lote ID *</label>
                  <input className="form-control" type="number" value={form.lote_id} onChange={(e) => setForm({ ...form, lote_id: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Producto *</label>
                  <input className="form-control" value={form.producto} onChange={(e) => setForm({ ...form, producto: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Cant. Litros *</label>
                  <input className="form-control" type="number" step="0.01" value={form.cantidad_litros} onChange={(e) => setForm({ ...form, cantidad_litros: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Costo Materiales ($)</label>
                  <input className="form-control" type="number" step="0.01" value={form.costo_materiales} onChange={(e) => setForm({ ...form, costo_materiales: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Costo Jornales ($)</label>
                  <input className="form-control" type="number" step="0.01" value={form.costo_jornales} onChange={(e) => setForm({ ...form, costo_jornales: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: '16px', textAlign: 'right' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
