import React, { useState, useEffect } from 'react';
import { getProgramacion, createProgramacion, completeProgramacion } from '../../services/aplicacionesApi';
import { authFetch } from '../../utils/api';
import '../../components/dashboard.css';

export default function RegistroAplicacion({ tenantId, fincaId }) {
  const [programaciones, setProgramaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ id_finca: fincaId || '', id_lote: '', id_receta: '', fecha_programada: '', metodo_aplicacion: '', id_maquinaria: '', responsable_aplicacion: '', insumos: [] });
  const [saving, setSaving] = useState(false);
  const [completeData, setCompleteData] = useState(null);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await getProgramacion({ tenantId });
      setProgramaciones(res || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.id_finca || !form.id_lote || !form.id_receta || !form.fecha_programada) return alert('Finca, lote, receta y fecha son requeridos');
    setSaving(true);
    try {
      await createProgramacion({ ...form, tenantId, id_finca: Number(form.id_finca), id_lote: Number(form.id_lote), id_receta: Number(form.id_receta) });
      setShowModal(false);
      setForm({ id_finca: fincaId || '', id_lote: '', id_receta: '', fecha_programada: '', metodo_aplicacion: '', id_maquinaria: '', responsable_aplicacion: '', insumos: [] });
      cargar();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = (prog) => {
    setCompleteData({
      id_programacion: prog.id_programacion,
      insumos_aplicados: (prog.insumos || []).map((ins) => ({ id_insumo: ins.id_insumo, cantidad_real_aplicada: ins.cantidad_proyectada || 0, costo_total: 0 })),
      envases: [],
      mantenimiento_notas: '',
    });
  };

  const submitComplete = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await completeProgramacion(completeData.id_programacion, { ...completeData, tenantId });
      setCompleteData(null);
      cargar();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const actualizarInsumo = (idx, campo, valor) => {
    const lista = [...completeData.insumos_aplicados];
    lista[idx] = { ...lista[idx], [campo]: valor };
    setCompleteData({ ...completeData, insumos_aplicados: lista });
  };

  return (
    <div className="dashboard-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>🚜 Registro Diario de Aplicación</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Nueva Programación</button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading-container"><div className="spinner" /><span>Cargando…</span></div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead>
              <tr><th>ID</th><th>Receta</th><th>Finca</th><th>Lote</th><th>Fecha Prog.</th><th>Método</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {programaciones.length === 0 ? (
                <tr><td colSpan="8" className="text-center text-muted">Sin programaciones</td></tr>
              ) : programaciones.map((p) => (
                <tr key={p.id_programacion}>
                  <td>{p.id_programacion}</td>
                  <td>{p.nombre_receta}</td>
                  <td>{p.finca_nombre}</td>
                  <td>{p.lote_nombre}</td>
                  <td>{p.fecha_programada}</td>
                  <td>{p.metodo_aplicacion}</td>
                  <td>
                    <span className={`badge ${p.estado === 'Completada' ? 'badge-success' : 'badge-warning'}`}>{p.estado}</span>
                  </td>
                  <td>
                    {p.estado !== 'Completada' && (
                      <button className="btn btn-success btn-xs" onClick={() => handleComplete(p)}>✅ Completar</button>
                    )}
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
            <div className="modal-header"><h3>Nueva Programación</h3><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group">
                  <label>Finca ID *</label>
                  <input className="form-control" type="number" value={form.id_finca} onChange={(e) => setForm({ ...form, id_finca: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Lote ID *</label>
                  <input className="form-control" type="number" value={form.id_lote} onChange={(e) => setForm({ ...form, id_lote: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>ID Receta *</label>
                  <input className="form-control" type="number" value={form.id_receta} onChange={(e) => setForm({ ...form, id_receta: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Fecha Programada *</label>
                  <input className="form-control" type="date" value={form.fecha_programada} onChange={(e) => setForm({ ...form, fecha_programada: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Método Aplicación</label>
                  <input className="form-control" value={form.metodo_aplicacion} onChange={(e) => setForm({ ...form, metodo_aplicacion: e.target.value })} placeholder="Aspersión, Riego, etc." />
                </div>
                <div className="form-group">
                  <label>Responsable</label>
                  <input className="form-control" value={form.responsable_aplicacion} onChange={(e) => setForm({ ...form, responsable_aplicacion: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: '16px', textAlign: 'right' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Guardando…' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {completeData && (
        <div className="modal-overlay" onClick={() => setCompleteData(null)}>
          <div className="modal-content" style={{ maxWidth: '750px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Completar Aplicación #{completeData.id_programacion}</h3><button className="modal-close" onClick={() => setCompleteData(null)}>×</button></div>
            <form onSubmit={submitComplete}>
              <h5>Insumos Aplicados</h5>
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead><tr><th>Insumo ID</th><th>Cant. Real Aplicada</th><th>Costo Total ($)</th></tr></thead>
                  <tbody>
                    {completeData.insumos_aplicados.map((ins, idx) => (
                      <tr key={idx}>
                        <td>{ins.id_insumo}</td>
                        <td>
                          <input className="form-control" type="number" step="0.01" value={ins.cantidad_real_aplicada} onChange={(e) => actualizarInsumo(idx, 'cantidad_real_aplicada', e.target.value)} />
                        </td>
                        <td>
                          <input className="form-control" type="number" step="0.01" value={ins.costo_total} onChange={(e) => actualizarInsumo(idx, 'costo_total', e.target.value)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="form-group" style={{ marginTop: '10px' }}>
                <label>Notas de Mantenimiento</label>
                <textarea className="form-control" rows="2" value={completeData.mantenimiento_notas} onChange={(e) => setCompleteData({ ...completeData, mantenimiento_notas: e.target.value })} />
              </div>
              <div className="modal-footer" style={{ marginTop: '16px', textAlign: 'right' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCompleteData(null)}>Cancelar</button>
                <button type="submit" className="btn btn-success btn-sm" disabled={saving}>{saving ? 'Guardando…' : 'Cerrar Aplicación'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
