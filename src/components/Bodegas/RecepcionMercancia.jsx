import React, { useState, useEffect } from 'react';
import DatePickerClaro from '../Common/DatePickerClaro';
import { authFetch } from '../../utils/api';
import Pagination from '../Pagination';

function RecepcionMercancia({ tenantId, fincaId }) {
  const [ordenes, setOrdenes] = useState([]);
  const [selectedOrden, setSelectedOrden] = useState(null);
  const [recepciones, setRecepciones] = useState({});
  const [bodegas, setBodegas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [selectedBodega, setSelectedBodega] = useState('');
  const [selectedEmpleado, setSelectedEmpleado] = useState('');
  const [loading, setLoading] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [view, setView] = useState('ordenes');
  const [currentOrdenesPage, setCurrentOrdenesPage] = useState(1);
  const [currentHistorialPage, setCurrentHistorialPage] = useState(1);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [productoFiltro, setProductoFiltro] = useState('');
  const [proveedorFiltro, setProveedorFiltro] = useState('');

  const [conductor, setConductor] = useState('');
  const [conductorCedula, setConductorCedula] = useState('');
  const [placa, setPlaca] = useState('');
  const [numGuias, setNumGuias] = useState('');
  const [numDocProveedor, setNumDocProveedor] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [selectedRecepcion, setSelectedRecepcion] = useState(null);

  useEffect(() => {
    fetchOrdenes();
    fetchBodegas();
    fetchEmpleados();
    fetchHistorial();
  }, [tenantId, fincaId]);

  const fetchOrdenes = async () => {
    try {
      let url = `/api/compras/ordenes-pendientes-recepcion?id_tenant=${tenantId}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (productoFiltro) url += `&producto=${encodeURIComponent(productoFiltro)}`;
      if (proveedorFiltro) url += `&proveedor=${encodeURIComponent(proveedorFiltro)}`;

      const res = await authFetch(url);
      const data = await res.json();
      setOrdenes(Array.isArray(data) ? data : []);
      setCurrentOrdenesPage(1);
    } catch (err) { console.error(err); }
  };

  const fetchBodegas = async () => {
    try {
      const res = await authFetch(`/api/table/bod_bodegas/data?tenantId=${tenantId}&pageSize=50`);
      const data = await res.json();
      if (data?.data) {
        setBodegas(data.data);
        if (data.data.length > 0) setSelectedBodega(data.data[0].id_bodega);
      }
    } catch (err) { console.error(err); }
  };

  const fetchEmpleados = async () => {
    try {
      const res = await authFetch(`/api/rrhh/empleados?tenantId=${tenantId}`);
      const data = await res.json();
      setEmpleados(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const fetchHistorial = async () => {
    try {
      const res = await authFetch(`/api/compras/recepciones?id_tenant=${tenantId}`);
      const data = await res.json();
      setHistorial(Array.isArray(data) ? data : []);
      setCurrentHistorialPage(1);
    } catch (err) { console.error(err); }
  };

  const fetchRecepcionDetalle = async (id) => {
    try {
      const res = await authFetch(`/api/compras/recepciones/${id}?id_tenant=${tenantId}`);
      const data = await res.json();
      setSelectedRecepcion(data);
      setView('detalle');
    } catch (err) { console.error(err); }
  };

  const handleSelectOrden = (o) => {
    setSelectedOrden(o);
    const initialRec = {};
    o.detalles.forEach(d => {
      initialRec[d.id_detalle] = Math.max(0, d.pendiente || (d.cantidad_pedida - d.cantidad_recibida));
    });
    setRecepciones(initialRec);
    setView('recepcion');
  };

  const handleCantidadChange = (id_detalle, val) => {
    setRecepciones({ ...recepciones, [id_detalle]: Number(val) });
  };

  const handleSubmit = async () => {
    if (!selectedBodega) return alert('Seleccione una bodega de destino.');
    if (!selectedEmpleado) return alert('Seleccione el empleado que recibe.');

    const recsToSend = selectedOrden.detalles.map(d => ({
      id_detalle_orden: d.id_detalle,
      id_insumo: d.id_insumo,
      cantidad_pedida: d.cantidad_pedida,
      cantidad_recibida: recepciones[d.id_detalle] || 0,
      precio_unitario: d.precio_unitario,
      observaciones_item: ''
    })).filter(r => r.cantidad_recibida > 0);

    if (recsToSend.length === 0) return alert('No hay cantidades a recibir.');

    setLoading(true);
    try {
      const res = await authFetch('/api/compras/recepciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_tenant: tenantId,
          id_orden_compra: selectedOrden.id_orden_compra,
          id_bodega_destino: selectedBodega,
          id_usuario_recibe: 1,
          id_empleado_recibe: selectedEmpleado,
          numero_guias_remision: numGuias,
          numero_documento_proveedor: numDocProveedor,
          conductor_nombre: conductor,
          conductor_cedula: conductorCedula,
          placa_vehiculo: placa,
          observaciones_generales: observaciones,
          detalles: recsToSend
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Entrada ${data.consecutivo} creada. Documento #${data.id_documento}`);
        setSelectedOrden(null);
        setView('ordenes');
        fetchOrdenes();
        fetchHistorial();
      } else {
        alert(data.error || 'Error al crear recepcion');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (f) => f ? new Date(f).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
  const fmtH = (f) => f ? new Date(f).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
  const fmtM = (v) => `$${Number(v || 0).toLocaleString('es-CO')}`;

  return (
    <div className="module-container">
      <div className="module-header">
        <h1>Recepcion de Mercancia</h1>
        <p>Confronta lo recibido contra la Orden de Compra. Documents en inv_documentos, movimientos en movimientos_inventario.</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button className={`btn btn-sm ${view === 'ordenes' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setView('ordenes'); setSelectedOrden(null); setSelectedRecepcion(null); }}>
          Ordenes Pendientes
        </button>
        <button className={`btn btn-sm ${view === 'historial' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setView('historial'); setSelectedOrden(null); setSelectedRecepcion(null); }}>
          Historial Entradas
        </button>
      </div>

      {view === 'ordenes' && (
        <div className="card">
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-end', background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
              <DatePickerClaro className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
              <DatePickerClaro className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Producto (Cod/Nombre)</label>
              <input type="text" className="form-control" placeholder="Ej: Fertilizante" value={productoFiltro} onChange={e => setProductoFiltro(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Proveedor (NIT/Razón)</label>
              <input type="text" className="form-control" placeholder="Ej: 900123..." value={proveedorFiltro} onChange={e => setProveedorFiltro(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={fetchOrdenes} style={{ height: '38px' }}>
              🔍 Buscar
            </button>
          </div>

          <h3>Ordenes de Compra Pendientes de Recepcion</h3>
          {ordenes.length === 0 ? (
            <p style={{ color: '#64748b', padding: '20px' }}>No hay ordenes pendientes.</p>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>N Orden</th>
                    <th>Fecha</th>
                    <th>Proveedor</th>
                    <th>NIT</th>
                    <th>Solicitante</th>
                    <th>Prioridad</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenes.slice((currentOrdenesPage - 1) * 20, currentOrdenesPage * 20).map(o => (
                    <tr key={o.id_orden_compra}>
                      <td><strong>{o.numero_orden}</strong></td>
                      <td>{fmt(o.fecha_emision)}</td>
                      <td>{o.proveedor}</td>
                      <td><code>{o.nit_proveedor}</code></td>
                      <td>
                        {o.empleado_solicitante ? (
                          <div>
                            <span>{o.empleado_solicitante} {o.apellido_solicitante}</span>
                            <span className="block text-xs text-slate-400">{o.area_solicitante}</span>
                          </div>
                        ) : <span className="text-slate-400">-</span>}
                      </td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          o.prioridad === 'Critica' ? 'bg-red-100 text-red-700' :
                          o.prioridad === 'Urgente' ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>{o.prioridad}</span>
                      </td>
                      <td>{fmtM(o.total)}</td>
                      <td><span className={`status-badge ${o.estado === 'Confirmada' ? 'warning' : 'primary'}`}>{o.estado}</span></td>
                      <td>
                        <button className="btn btn-sm btn-primary" onClick={() => handleSelectOrden(o)}>Recibir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ordenes.length > 0 && (
                <Pagination 
                  currentPage={currentOrdenesPage}
                  totalItems={ordenes.length}
                  pageSize={20}
                  onPageChange={setCurrentOrdenesPage}
                />
              )}
            </>
          )}
        </div>
      )}

      {view === 'recepcion' && selectedOrden && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>Recepcionando: {selectedOrden.numero_orden}</h3>
            <button className="btn btn-secondary" onClick={() => { setView('ordenes'); setSelectedOrden(null); }}>Volver</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '8px', marginBottom: '20px' }}>
            <div><strong>Proveedor:</strong><br />{selectedOrden.proveedor}</div>
            <div><strong>NIT:</strong><br />{selectedOrden.nit_proveedor}</div>
            <div><strong>Telefono:</strong><br />{selectedOrden.telefono_proveedor || '-'}</div>
            <div><strong>Creado por:</strong><br />{selectedOrden.nombres_creador} {selectedOrden.apellidos_creador}</div>
            <div><strong>Solicitante:</strong><br />{selectedOrden.empleado_solicitante || '-'}</div>
            <div><strong>Area:</strong><br />{selectedOrden.area_solicitante || '-'}</div>
          </div>

          <h4 style={{ marginBottom: '12px' }}>Datos de la Entrega Fisica</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Bodega Destino *</label>
              <select className="form-control" value={selectedBodega} onChange={e => setSelectedBodega(e.target.value)}>
                <option value="">-- Seleccione --</option>
                {bodegas.map(b => <option key={b.id_bodega} value={b.id_bodega}>{b.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Empleado que Recibe *</label>
              <select className="form-control" value={selectedEmpleado} onChange={e => setSelectedEmpleado(e.target.value)}>
                <option value="">-- Seleccione --</option>
                {empleados.map(e => <option key={e.id_empleado} value={e.id_empleado}>{e.nombres} {e.apellidos}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Conductor</label>
              <input className="form-control" value={conductor} onChange={e => setConductor(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Cedula Conductor</label>
              <input className="form-control" value={conductorCedula} onChange={e => setConductorCedula(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Placa Vehiculo</label>
              <input className="form-control" value={placa} onChange={e => setPlaca(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">N Guia de Remision</label>
              <input className="form-control" value={numGuias} onChange={e => setNumGuias(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">N Doc Proveedor</label>
              <input className="form-control" value={numDocProveedor} onChange={e => setNumDocProveedor(e.target.value)} />
            </div>
          </div>

          <h4 style={{ marginBottom: '12px' }}>Items de la Orden</h4>
          <table className="data-table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Unidad</th>
                <th>Pedida</th>
                <th>Ya Recibida</th>
                <th>Pendiente</th>
                <th>Precio Unit.</th>
                <th><strong>Cantidad que Ingresa HOY</strong></th>
              </tr>
            </thead>
            <tbody>
              {selectedOrden.detalles.map(d => {
                const pendiente = d.pendiente || Math.max(0, d.cantidad_pedida - d.cantidad_recibida);
                return (
                  <tr key={d.id_detalle}>
                    <td><strong>{d.insumo_nombre}</strong> <small className="text-slate-400">({d.insumo_codigo})</small></td>
                    <td>{d.unidad_medida}</td>
                    <td>{d.cantidad_pedida}</td>
                    <td>{d.cantidad_recibida}</td>
                    <td><strong className="text-orange-600">{pendiente}</strong></td>
                    <td>{fmtM(d.precio_unitario)}</td>
                    <td style={{ width: '180px' }}>
                      <input type="number" className="form-control" value={recepciones[d.id_detalle] || 0}
                        onChange={e => handleCantidadChange(d.id_detalle, e.target.value)} min="0" max={pendiente} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ marginTop: '12px' }}>
            <label className="block text-xs font-medium text-slate-500 mb-1">Observaciones</label>
            <textarea className="form-control" rows="2" value={observaciones} onChange={e => setObservaciones(e.target.value)} />
          </div>

          <div style={{ marginTop: '20px', textAlign: 'right' }}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ fontSize: '16px', padding: '10px 24px' }}>
              {loading ? 'Procesando...' : 'Confirmar Recepcion e Ingresar a Kardex'}
            </button>
          </div>
        </div>
      )}

      {view === 'historial' && (
        <div className="card">
          <h3>Historial de Entradas (inv_documentos)</h3>
          {historial.length === 0 ? (
            <p style={{ color: '#64748b', padding: '20px' }}>No hay entradas registradas.</p>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Consecutivo</th>
                    <th>Fecha</th>
                    <th>Bodega Destino</th>
                    <th>Recibido por</th>
                    <th>Empleado</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.slice((currentHistorialPage - 1) * 20, currentHistorialPage * 20).map(r => (
                    <tr key={r.id_documento}>
                      <td><strong>{r.consecutivo}</strong></td>
                      <td>{fmtH(r.fecha)}</td>
                      <td>{r.bodega_destino_nombre || '-'}</td>
                      <td>{r.usuario_crea_nombre}</td>
                      <td>{r.empleado_recibe_nombre || '-'}</td>
                      <td><span className={`px-2 py-1 rounded text-xs font-semibold ${
                        r.estado === 'Aplicado' ? 'bg-green-100 text-green-700' :
                        r.estado === 'Anulado' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>{r.estado}</span></td>
                      <td>
                        <button className="btn btn-sm btn-secondary" onClick={() => fetchRecepcionDetalle(r.id_documento)}>
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {historial.length > 0 && (
                <Pagination 
                  currentPage={currentHistorialPage}
                  totalItems={historial.length}
                  pageSize={20}
                  onPageChange={setCurrentHistorialPage}
                />
              )}
            </>
          )}
        </div>
      )}

      {view === 'detalle' && selectedRecepcion && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>Detalle: {selectedRecepcion.consecutivo}</h3>
            <button className="btn btn-secondary" onClick={() => { setView('historial'); setSelectedRecepcion(null); }}>Volver</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '8px', marginBottom: '20px' }}>
            <div><strong>Consecutivo:</strong><br />{selectedRecepcion.consecutivo}</div>
            <div><strong>Fecha:</strong><br />{fmtH(selectedRecepcion.fecha)}</div>
            <div><strong>Bodega Destino:</strong><br />{selectedRecepcion.bodega_destino_nombre || '-'}</div>
            <div><strong>Creado por:</strong><br />{selectedRecepcion.usuario_crea_nombre}</div>
            <div><strong>Empleado Recibe:</strong><br />{selectedRecepcion.empleado_recibe_nombre || '-'}</div>
            <div><strong>Persona Reclama:</strong><br />{selectedRecepcion.persona_reclama || '-'}</div>
            <div><strong>Estado:</strong><br />
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                selectedRecepcion.estado === 'Aplicado' ? 'bg-green-100 text-green-700' :
                selectedRecepcion.estado === 'Anulado' ? 'bg-red-100 text-red-700' :
                'bg-slate-100 text-slate-700'
              }`}>{selectedRecepcion.estado}</span>
            </div>
            <div><strong>Observaciones:</strong><br />{selectedRecepcion.observaciones || '-'}</div>
          </div>

          <h4 style={{ marginBottom: '12px' }}>Movimientos de Inventario (Kardex)</h4>
          <table className="data-table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Costo Unit.</th>
                <th>Bodega</th>
                <th>Documento</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {selectedRecepcion.movimientos?.map(m => (
                <tr key={m.id_movimiento}>
                  <td>{m.insumo_nombre} <small>({m.insumo_codigo})</small></td>
                  <td><span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">{m.tipo_movimiento}</span></td>
                  <td><strong className="text-green-600">{m.cantidad}</strong></td>
                  <td>{fmtM(m.costo_unitario)}</td>
                  <td>{bodegas.find(b => String(b.id_bodega) === String(m.id_bodega))?.nombre || `ID: ${m.id_bodega}`}</td>
                  <td><code>{m.documento_referencia}</code></td>
                  <td>{m.observaciones || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default RecepcionMercancia;
