import React, { useState, useEffect } from 'react';
import { getRecetas, createReceta } from '../../services/aplicacionesApi';
import { authFetch } from '../../utils/api';
import '../../components/dashboard.css';

export default function Recetas({ tenantId }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre_receta: '',
    tipo: '',
    id_cultivo: 1,
    id_enfermedad_plaga: '',
    autor_tecnico: '',
    instrucciones_preparacion: '',
    recomendaciones_seguridad: '',
    detalles: [],
  });
  const [newDetalle, setNewDetalle] = useState({ id_insumo: '', dosis_recomendada: '', unidad_medida: 'Lts/Ha', notas: '' });
  const [insumos, setInsumos] = useState([]);
  const [library, setLibrary] = useState([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [recetas, libRes, insRes] = await Promise.all([
        getRecetas({ tenantId }),
        authFetch('/api/applications/ica'),
        authFetch('/api/table/insumos/data?tenantId=' + tenantId + '&pageSize=200'),
      ]);
      setRecipes(recetas);
      if (libRes.ok) setLibrary(await libRes.json());
      if (insRes.ok) {
        const d = await insRes.json();
        setInsumos(d.data || []);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre_receta) return alert('Nombre de receta requerido');
    if (form.detalles.length === 0) return alert('Agregue al menos un insumo a la receta');
    setSaving(true);
    try {
      await createReceta({ ...form, tenantId });
      setShowModal(false);
      setForm({ nombre_receta: '', tipo: 'Fitosanitario', id_cultivo: 1, id_enfermedad_plaga: '', autor_tecnico: '', instrucciones_preparacion: '', recomendaciones_seguridad: '', detalles: [] });
      cargarDatos();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const agregarDetalle = () => {
    if (!newDetalle.id_insumo || !newDetalle.dosis_recomendada) return alert('Seleccione insumo y dosis');
    setForm({
      ...form,
      detalles: [...form.detalles, { ...newDetalle }],
    });
    setNewDetalle({ id_insumo: '', dosis_recomendada: '', unidad_medida: 'Lts/Ha', notas: '' });
  };

  const quitarDetalle = (idx) => {
    setForm({ ...form, detalles: form.detalles.filter((_, i) => i !== idx) });
  };

  return (
    <div className="dashboard-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>🧪 Recetario General</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Nueva Receta</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading-container"><div className="spinner" /><span>Cargando recetas…</span></div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Autor</th>
                <th>Fecha</th>
                <th>Insumos</th>
              </tr>
            </thead>
            <tbody>
              {recipes.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-muted">Sin recetas registradas</td></tr>
              ) : recipes.map((r) => (
                <tr key={r.id_receta}>
                  <td>{r.id_receta}</td>
                  <td><strong>{r.nombre_receta}</strong></td>
                  <td><span className={`badge ${r.tipo === 'Quimico' ? 'badge-warning' : r.tipo === 'Organico' ? 'badge-success' : 'badge-info'}`}>{r.tipo}</span></td>
                  <td>{r.autor_tecnico || '—'}</td>
                  <td>{r.fecha_creacion}</td>
                  <td>{r.detalles?.length || 0}</td>
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
              <h3>Nueva Receta</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre Receta *</label>
                <input className="form-control" value={form.nombre_receta} onChange={(e) => setForm({ ...form, nombre_receta: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tipo</label>
                  <select className="form-control" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                    <option value="Fitosanitario">Fitosanitario</option>
                    <option value="Quimico">Químico</option>
                    <option value="Organico">Orgánico</option>
                    <option value="Mixto">Mixto</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Autor Técnico</label>
                  <input className="form-control" value={form.autor_tecnico} onChange={(e) => setForm({ ...form, autor_tecnico: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Instrucciones de Preparación</label>
                <textarea className="form-control" rows="2" value={form.instrucciones_preparacion} onChange={(e) => setForm({ ...form, instrucciones_preparacion: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Recomendaciones de Seguridad</label>
                <textarea className="form-control" rows="2" value={form.recomendaciones_seguridad} onChange={(e) => setForm({ ...form, recomendaciones_seguridad: e.target.value })} />
              </div>

              <div className="card" style={{ marginTop: '10px', padding: '10px' }}>
                <h5>Insumos de la Receta</h5>
                <div className="form-row" style={{ gap: '8px', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>Insumo</label>
                    <select className="form-control" value={newDetalle.id_insumo} onChange={(e) => setNewDetalle({ ...newDetalle, id_insumo: Number(e.target.value) })}>
                      <option value="">— Seleccione —</option>
                      {insumos.map((i) => (
                        <option key={i.id_insumo} value={i.id_insumo}>{i.nombre} ({i.codigo})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Dosis</label>
                    <input className="form-control" type="number" step="0.01" value={newDetalle.dosis_recomendada} onChange={(e) => setNewDetalle({ ...newDetalle, dosis_recomendada: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Unidad</label>
                    <select className="form-control" value={newDetalle.unidad_medida} onChange={(e) => setNewDetalle({ ...newDetalle, unidad_medida: e.target.value })}>
                      <option>Lts/Ha</option>
                      <option>Kg/Ha</option>
                      <option>Gr/Ha</option>
                      <option>Ml/Ha</option>
                    </select>
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={agregarDetalle}>Agregar</button>
                </div>
                {form.detalles.length > 0 && (
                  <table className="table table-sm" style={{ marginTop: '8px' }}>
                    <thead><tr><th>Insumo</th><th>Dosis</th><th>Unidad</th><th></th></tr></thead>
                    <tbody>
                      {form.detalles.map((d, idx) => {
                        const ins = insumos.find((i) => i.id_insumo === d.id_insumo);
                        return (
                          <tr key={idx}>
                            <td>{ins?.nombre || d.id_insumo}</td>
                            <td>{d.dosis_recomendada}</td>
                            <td>{d.unidad_medida}</td>
                            <td><button type="button" className="btn btn-danger btn-xs" onClick={() => quitarDetalle(idx)}>×</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="modal-footer" style={{ marginTop: '16px', textAlign: 'right' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Guardando…' : 'Guardar Receta'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
