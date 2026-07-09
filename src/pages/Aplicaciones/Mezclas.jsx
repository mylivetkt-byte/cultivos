import React, { useState, useEffect } from 'react';
import { getMezclas, createMezcla, updateMezcla, deleteMezcla } from '../../services/aplicacionesApi';
import '../../components/dashboard.css';

export default function Mezclas({ tenantId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ id_receta: '', lote_id: '', producto: '', cantidad_litros: '', costo: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await getMezclas({ tenantId });
      setItems(res.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.id_receta || !form.lote_id || !form.producto || !form.cantidad_litros || !form.costo) return alert('Todos los campos son requeridos');
    setSaving(true);
    try {
      if (editItem) {
        await updateMezcla(editItem.id_preparacion, { ...form, tenantId, id_receta: Number(form.id_receta), lote_id: Number(form.lote_id), cantidad_litros: Number(form.cantidad_litros), costo: Number(form.costo) });
      } else {
        await createMezcla({ ...form, tenantId, id_receta: Number(form.id_receta), lote_id: Number(form.lote_id), cantidad_litros: Number(form.cantidad_litros), costo: Number(form.costo) });
      }
      setShowModal(false);
      setEditItem(null);
      setForm({ id_receta: '', lote_id: '', producto: '', cantidad_litros: '', costo: '' });
      cargar();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setForm({ id_receta: item.id_receta, lote_id: item.lote_id, producto: item.producto, cantidad_litros: item.cantidad_litros, costo: item.costo });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta preparación?')) return;
    try {
      await deleteMezcla(id);
      cargar();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>⚗️ Centro de Mezclas (Químicos)</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setForm({ id_receta: '', lote_id: '', producto: '', cantidad_litros: '', costo: '' }); setShowModal(true); }}>+ Nueva Preparación</button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <div className="loading-container"><div className="spinner" /><span>Cargando…</span></div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead>
              <tr><th>ID</th><th>Receta ID</th><th>Lote</th><th>Producto</th><th>Cant. Litros</th><th>Costo (€)</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan="7" className="text-center text-muted">Sin preparaciones registradas</td></tr>
              ) : items.map((it) => (
                <tr key={it.id_preparacion}>
                  <td>{it.id_preparacion}</td>
                  <td>{it.id_receta}</td>
                  <td>{it.lote_id}</td>
                  <td><strong>{it.producto}</strong></td>
                  <td>{Number(it.cantidad_litros).toFixed(1)}</td>
                  <td>{Number(it.costo || 0).toFixed(2)}</td>
                  <td>
                    <button className="btn btn-info btn-xs" onClick={() => handleEdit(it)}>✏️</button>{' '}
                    <button className="btn btn-danger btn-xs" onClick={() => handleDelete(it.id_preparacion)}>🗑️</button>
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
              <h3>{editItem ? 'Editar Preparación' : 'Nueva Preparación'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>ID Receta *</label>
                  <input className="form-control" type="number" value={form.id_receta} onChange={(e) => setForm({ ...form, id_receta: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Lote ID *</label>
                  <input className="form-control" type="number" value={form.lote_id} onChange={(e) => setForm({ ...form, lote_id: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Producto *</label>
                  <input className="form-control" value={form.producto} onChange={(e) => setForm({ ...form, producto: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Cant. Litros *</label>
                  <input className="form-control" type="number" step="0.01" value={form.cantidad_litros} onChange={(e) => setForm({ ...form, cantidad_litros: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Costo ($) *</label>
                  <input className="form-control" type="number" step="0.01" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} required />
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
