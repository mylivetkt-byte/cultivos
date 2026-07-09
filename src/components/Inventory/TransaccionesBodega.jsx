import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/format';
import { authFetch } from '../../utils/api';

export default function TransaccionesBodega({ tenantId, currentUserId }) {
  const [tiposDoc, setTiposDoc] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [documentos, setDocumentos] = useState([]);

  const [formData, setFormData] = useState({
    id_tipo: '',
    id_bodega_origen: '',
    id_bodega_destino: '',
    peso_bascula_entrada: '',
    peso_bascula_salida: '',
    id_empleado_entrega: '',
    id_empleado_recibe: '',
    observaciones: '',
    detalles: []
  });

  const [currentDetalle, setCurrentDetalle] = useState({ id_insumo: '', cantidad: '', costo_unitario: '', id_unidad: '', id_maquinaria: '' });
  const [unidades, setUnidades] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [maquinarias, setMaquinarias] = useState([]);

  useEffect(() => {
    if (!tenantId) return;
    fetchTipos();
    fetchBodegas();
    fetchInsumos();
    fetchDocumentos();
    fetchExtras();
  }, [tenantId]);

  const fetchExtras = async () => {
    try {
      const resU = await authFetch(`/api/inventario/unidades?tenantId=${tenantId}`);
      setUnidades(await resU.json());

      const resE = await authFetch(`/api/table/empleados?tenantId=${tenantId}`);
      const dataE = await resE.json();
      setEmpleados(dataE.data || []);

      const resM = await authFetch(`/api/table/agroind_maquinaria_equipo`);
      const dataM = await resM.json();
      setMaquinarias(dataM.data || []);
    } catch (e) {}
  };

  const fetchTipos = async () => {
    try {
      const res = await authFetch(`/api/inventario/tipos_documento?tenantId=${tenantId}`);
      setTiposDoc(await res.json());
    } catch (e) {}
  };

  const fetchBodegas = async () => {
    try {
      const res = await authFetch(`/api/table/bod_bodegas?tenantId=${tenantId}`);
      const data = await res.json();
      setBodegas(data.data || []);
    } catch (e) {}
  };

  const fetchInsumos = async () => {
    try {
      const res = await authFetch(`/api/table/insumos?tenantId=${tenantId}`);
      const data = await res.json();
      setInsumos(data.data || []);
    } catch (e) {}
  };

  const fetchDocumentos = async () => {
    try {
      const res = await authFetch(`/api/inventario/documentos?tenantId=${tenantId}`);
      setDocumentos(await res.json());
    } catch (e) {}
  };

  const selectedTipo = tiposDoc.find(t => t.id_tipo.toString() === formData.id_tipo);

  const handleAddDetalle = () => {
    if (!currentDetalle.id_insumo || !currentDetalle.cantidad) return;
      setFormData(prev => ({
      ...prev,
      detalles: [...prev.detalles, currentDetalle]
    }));
    setCurrentDetalle({ id_insumo: '', cantidad: '', costo_unitario: '', id_unidad: '', id_maquinaria: '' });
  };

  const handleRemoveDetalle = (index) => {
    setFormData(prev => ({
      ...prev,
      detalles: prev.detalles.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.id_tipo || formData.detalles.length === 0) {
      alert("Selecciona un tipo de documento y agrega al menos un detalle.");
      return;
    }

    try {
      const payload = { ...formData, id_tenant: tenantId, id_usuario: currentUserId || null };
      const res = await authFetch(`/api/inventario/documentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Documento creado exitosamente. Consecutivo: ${data.consecutivo}`);
        setFormData({ id_tipo: '', id_bodega_origen: '', id_bodega_destino: '', peso_bascula_entrada: '', peso_bascula_salida: '', id_empleado_entrega: '', id_empleado_recibe: '', observaciones: '', detalles: [] });
        fetchDocumentos();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert("Error de red");
    }
  };

  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      <div style={{ flex: 1 }}>
        <h3 style={{ marginTop: 0 }}>Nuevo Documento</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label>Tipo de Documento</label>
            <select 
              value={formData.id_tipo} 
              onChange={e => setFormData({...formData, id_tipo: e.target.value})}
              required
              className="form-control"
            >
              <option value="">-- Seleccionar --</option>
              {tiposDoc.map(t => <option key={t.id_tipo} value={t.id_tipo}>{t.codigo} - {t.nombre} ({t.naturaleza})</option>)}
            </select>
          </div>

          {selectedTipo && (selectedTipo.naturaleza === 'Salida' || selectedTipo.naturaleza === 'Transferencia') && (
            <div className="form-group">
              <label>Bodega Origen</label>
              <select value={formData.id_bodega_origen} onChange={e => setFormData({...formData, id_bodega_origen: e.target.value})} required className="form-control">
                <option value="">-- Seleccionar --</option>
                {bodegas.map(b => <option key={b.id_bodega} value={b.id_bodega}>{b.nombre}</option>)}
              </select>
            </div>
          )}

          {selectedTipo && (selectedTipo.naturaleza === 'Entrada' || selectedTipo.naturaleza === 'Transferencia') && (
            <div className="form-group">
              <label>Bodega Destino</label>
              <select value={formData.id_bodega_destino} onChange={e => setFormData({...formData, id_bodega_destino: e.target.value})} required className="form-control">
                <option value="">-- Seleccionar --</option>
                {bodegas.map(b => <option key={b.id_bodega} value={b.id_bodega}>{b.nombre}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Empleado que Entrega (Opcional)</label>
              <select value={formData.id_empleado_entrega} onChange={e => setFormData({...formData, id_empleado_entrega: e.target.value})} className="form-control">
                <option value="">-- Seleccionar --</option>
                {empleados.map(emp => <option key={emp.id_empleado} value={emp.id_empleado}>{emp.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Empleado que Recibe (Obligatorio para Repuestos)</label>
              <select value={formData.id_empleado_recibe} onChange={e => setFormData({...formData, id_empleado_recibe: e.target.value})} className="form-control">
                <option value="">-- Seleccionar --</option>
                {empleados.map(emp => <option key={emp.id_empleado} value={emp.id_empleado}>{emp.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Peso Báscula Entrada (Kg)</label>
              <input type="number" step="0.01" className="form-control" value={formData.peso_bascula_entrada} onChange={e => setFormData({...formData, peso_bascula_entrada: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Peso Báscula Salida (Kg)</label>
              <input type="number" step="0.01" className="form-control" value={formData.peso_bascula_salida} onChange={e => setFormData({...formData, peso_bascula_salida: e.target.value})} />
            </div>
          </div>

          <div className="form-group">
            <label>Observaciones</label>
            <textarea 
              value={formData.observaciones} 
              onChange={e => setFormData({...formData, observaciones: e.target.value})}
              className="form-control"
              rows="2"
            />
          </div>

          <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
            <h4>Detalle del Documento</h4>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ fontSize: '12px' }}>Insumo / Repuesto</label>
                <select className="form-control" value={currentDetalle.id_insumo} onChange={e => setCurrentDetalle({...currentDetalle, id_insumo: e.target.value})}>
                  <option value="">-- Seleccionar --</option>
                  {insumos.map(i => <option key={i.id_insumo} value={i.id_insumo}>{i.codigo} - {i.nombre}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 100px' }}>
                <label style={{ fontSize: '12px' }}>Unidad de Medida (Opc)</label>
                <select className="form-control" value={currentDetalle.id_unidad} onChange={e => setCurrentDetalle({...currentDetalle, id_unidad: e.target.value})}>
                  <option value="">Base</option>
                  {unidades.map(u => <option key={u.id_unidad} value={u.id_unidad}>{u.nombre} ({u.codigo})</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 100px' }}>
                <label style={{ fontSize: '12px' }}>Cantidad</label>
                <input type="number" step="0.01" className="form-control" value={currentDetalle.cantidad} onChange={e => setCurrentDetalle({...currentDetalle, cantidad: e.target.value})} />
              </div>
              {selectedTipo && selectedTipo.naturaleza === 'Entrada' && (
                <div style={{ flex: '1 1 100px' }}>
                  <label style={{ fontSize: '12px' }}>Costo Unit.</label>
                  <input type="number" step="0.01" className="form-control" value={currentDetalle.costo_unitario} onChange={e => setCurrentDetalle({...currentDetalle, costo_unitario: e.target.value})} />
                </div>
              )}
              {currentDetalle.id_insumo && insumos.find(i => i.id_insumo.toString() === currentDetalle.id_insumo)?.codigo?.includes('REP') && (
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--warning)' }}>Máquina/Equipo (Por ser Repuesto)</label>
                  <select className="form-control" value={currentDetalle.id_maquinaria} onChange={e => setCurrentDetalle({...currentDetalle, id_maquinaria: e.target.value})}>
                    <option value="">-- Seleccionar Máquina --</option>
                    {maquinarias.map(m => <option key={m.id_maq_agro} value={m.id_maq_agro}>{m.tipo} {m.marca_modelo}</option>)}
                  </select>
                </div>
              )}
              <div style={{ flex: '1 1 100px' }}>
                <button type="button" className="btn btn-primary" onClick={handleAddDetalle} style={{ width: '100%' }}>Agregar</button>
              </div>
            </div>

            <table className="data-table">
              <thead><tr><th>Insumo</th><th>Cant.</th><th>Unidad</th>{selectedTipo?.naturaleza === 'Entrada' && <th>Costo</th>}<th>X</th></tr></thead>
              <tbody>
                {formData.detalles.map((d, i) => {
                  const ins = insumos.find(x => x.id_insumo.toString() === d.id_insumo.toString());
                  const und = unidades.find(x => x.id_unidad.toString() === d.id_unidad.toString());
                  return (
                    <tr key={i}>
                      <td>{ins?.nombre}</td>
                      <td>{d.cantidad}</td>
                      <td>{und ? und.codigo : 'Base'}</td>
                      {selectedTipo?.naturaleza === 'Entrada' && <td>{formatCurrency(parseFloat(d.costo_unitario))}</td>}
                      <td><button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemoveDetalle(i)}>x</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <button type="submit" className="btn btn-success" style={{ width: '100%', marginTop: '16px' }}>
            Guardar y Procesar Documento
          </button>
        </form>
      </div>

      <div style={{ flex: 1, borderLeft: '1px solid var(--border)', paddingLeft: '24px' }}>
        <h3 style={{ marginTop: 0 }}>Documentos Recientes</h3>
        <div className="table-scroll" style={{ maxHeight: '600px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Consecutivo</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Origen</th>
                <th>Destino</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map(d => (
                <tr key={d.id_documento}>
                  <td style={{ fontWeight: 600 }}>{d.consecutivo}</td>
                  <td><span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '2px 6px', borderRadius: '4px' }}>{d.naturaleza}</span></td>
                  <td>{new Date(d.fecha).toLocaleDateString()}</td>
                  <td>{d.origen_nombre || '-'}</td>
                  <td>{d.destino_nombre || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
