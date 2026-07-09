import React, { useState, useEffect } from 'react';
import { fetchTableData, insertRecord, updateRecord } from '../../utils/api';
import '../../components/dashboard.css';

export default function ControlPlagas({ tenantId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    id_plaga: '',
    id_enfermedad: '',
    id_insumo: '',
    fecha_aplicacion: '',
    metodo_aplicacion: '',
    dosis: '',
    responsable: '',
    observaciones: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTableData('control_plagas', { tenantId, pageSize: 200 });
      setData(res.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        tenantId,
        id_plaga: form.id_plaga ? Number(form.id_plaga) : null,
        id_enfermedad: form.id_enfermedad ? Number(form.id_enfermedad) : null,
        id_insumo: form.id_insumo ? Number(form.id_insumo) : null,
        dosis: form.dosis ? Number(form.dosis) : 0,
      };
      if (editItem) {
        await updateRecord('control_plagas', editItem.id_control_plagas, payload);
      } else {
        await insertRecord('control_plagas', payload);
      }
      setShowModal(false);
      setEditItem(null);
      setForm({ id_plaga: '', id_enfermedad: '', id_insumo: '', fecha_aplicacion: '', metodo_aplicacion: '', dosis: '', responsable: '', observaciones: '' });
      cargar();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setForm({
      id_plaga: item.id_plaga || '',
      id_enfermedad: item.id_enfermedad || '',
      id_insumo: item.id_insumo || '',
      fecha_aplicacion: item.fecha_aplicacion || '',
      metodo_aplicacion: item.metodo_aplicacion || '',
      dosis: item.dosis || '',
      responsable: item.responsable || '',
      observaciones: item.observaciones || '',
    });
    setShowModal(true);
  };

  return (
    <div className="dashboard-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>🛡️ Aplicaciones Sanitarias</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setForm({ id_plaga: '', id_enfermedad: '', id_insumo: '', fecha_aplicacion: '', metodo_aplicacion: '', dosis: '', responsable: '', observaciones: '' }); setShowModal(true); }}>+ Nueva Aplicación</button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <div className="loading-container"><div className="spinner" /><span>Cargando…</span></div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead>
              <tr><th>ID</th><th>Plaga</th><th>Enfermedad</th><th>Insumo</th><th>Fecha</th><th>Método</th><th>Dosis</th><th>Responsable</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan="9" className="text-center text-muted">Sin registros</td></tr>
              ) : data.map((it) => (
                <tr key={it.id_control_plagas || it.id_control_plagas}>
                  <td>{it.id_control_plagas}</td>
                  <td>{it.id_plaga || '—'}</td>
                  <td>{it.id_enfermedad || '—'}</td>
                  <td>{it.id_insumo || '—'}</td>
                  <td>{it.fecha_aplicacion}</td>
                  <td>{it.metodo_aplicacion}</td>
                  <td>{it.dosis}</td>
                  <td>{it.responsable || '—'}</td>
                  <td>
                    <button className="btn btn-info btn-xs" onClick={() => handleEdit(it)}>✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editItem ? 'Editar Aplicación' : 'Nueva Aplicación Sanitaria'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>ID Plaga</label>
                  <input className="form-control" type="number" value={form.id_plaga} onChange={(e) => setForm({ ...form, id_plaga: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>ID Enfermedad</label>
                  <input className="form-control" type="number" value={form.id_enfermedad} onChange={(e) => setForm({ ...form, id_enfermedad: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>ID Insumo</label>
                  <input className="form-control" type="number" value={form.id_insumo} onChange={(e) => setForm({ ...form, id_insumo: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Fecha Aplicación *</label>
                  <input className="form-control" type="date" value={form.fecha_aplicacion} onChange={(e) => setForm({ ...form, fecha_aplicacion: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Método Aplicación *</label>
                  <input className="form-control" value={form.metodo_aplicacion} onChange={(e) => setForm({ ...form, metodo_aplicacion: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Dosis</label>
                  <input className="form-control" type="number" step="0.01" value={form.dosis} onChange={(e) => setForm({ ...form, dosis: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Responsable</label>
                <input className="form-control" value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Observaciones</label>
                <textarea className="form-control" rows="2" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
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
