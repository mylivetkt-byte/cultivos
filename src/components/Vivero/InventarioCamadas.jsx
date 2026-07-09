import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api.js';
import { formatCurrency } from '../../utils/format';

export default function InventarioCamadas({ tenantId = 1 }) {
  const [inventario, setInventario] = useState([]);
  const [camadas, setCamadas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showInvModal, setShowInvModal] = useState(false);
  const [invForm, setInvForm] = useState({ tipo: 'Semilla', nombre: '', proveedor: '', cantidad: 0, unidad: 'kg', costo: 0 });

  const [showMovModal, setShowMovModal] = useState(false);
  const [movForm, setMovForm] = useState({ id_camada: '', tipo_movimiento: 'Salida_Siembra', cantidad: 0, precio_venta_total: 0, id_empleado: '', observaciones: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const safeJson = async (res) => {
        const json = await res.json();
        return Array.isArray(json) ? json : [];
      };
      const [invRes, camRes, empRes, movRes] = await Promise.all([
        authFetch(`/api/semillero/inventario?tenantId=${tenantId}`).then(safeJson),
        authFetch(`/api/semillero/camadas?tenantId=${tenantId}`).then(safeJson),
        authFetch(`/api/rrhh/empleados?tenantId=${tenantId}`).then(safeJson),
        authFetch(`/api/semillero/movimientos?tenantId=${tenantId}`).then(safeJson).catch(() => []),
      ]);
      setInventario(invRes);
      setCamadas(camRes);
      setEmpleados(empRes);
      setMovimientos(movRes);
    } catch (err) {
      console.error('Error cargando datos vivero:', err);
      alert('Error cargando datos operativos del vivero: ' + err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const handleCreateInventario = async (e) => {
    e.preventDefault();
    try {
      await authFetch('/api/semillero/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          tipo: invForm.tipo,
          nombre: invForm.nombre,
          proveedor: invForm.proveedor,
          cantidad_disponible: invForm.cantidad,
          unidad_medida: invForm.unidad,
          costo_unitario: invForm.costo
        })
      });
      setShowInvModal(false);
      loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleRegistrarMovimiento = async (e) => {
    e.preventDefault();
    try {
      await authFetch('/api/semillero/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          id_camada: movForm.id_camada,
          id_item: null, // Asumimos movimiento de camada por ahora
          tipo_movimiento: movForm.tipo_movimiento,
          cantidad: movForm.cantidad,
          id_empleado_responsable: movForm.id_empleado || null,
          observaciones: movForm.observaciones,
          precio_venta_total: movForm.precio_venta_total
        })
      });
      setShowMovModal(false);
      loadData();
      if(movForm.tipo_movimiento === 'Venta') {
        alert('Movimiento registrado exitosamente. Se ha generado automáticamente el Asiento de Ingreso en Contabilidad.');
      } else {
        alert('Movimiento registrado exitosamente.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) return <div className="p-8 text-slate-400">Cargando inventario de vivero...</div>;

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Control Operativo Vivero</h1>
          <p className="text-slate-500">Gestión de insumos y camadas (lotes) de plántulas.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setShowInvModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
            + Nuevo Insumo
          </button>
          <button onClick={() => setShowMovModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
            Registrar Salida/Movimiento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tabla Inventario Insumos */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-100 px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-700">Inventario Base (Semillas y Abonos)</h2>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                  <th className="p-4 font-medium">Tipo</th>
                  <th className="p-4 font-medium">Nombre/Variedad</th>
                  <th className="p-4 font-medium">Stock Disponible</th>
                  <th className="p-4 font-medium">Costo Promedio</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 text-sm">
                {inventario.map(item => (
                  <tr key={item.id_item} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4"><span className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-semibold">{item.tipo}</span></td>
                    <td className="p-4 font-medium">{item.nombre}</td>
                    <td className="p-4">{item.cantidad_disponible} {item.unidad_medida}</td>
                    <td className="p-4">{formatCurrency(Number(item.costo_unitario))}</td>
                  </tr>
                ))}
                {inventario.length === 0 && (
                  <tr><td colSpan="4" className="p-4 text-center text-slate-400">No hay insumos registrados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla Camadas Activas */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-100 px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-700">Camadas en Crecimiento</h2>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                  <th className="p-4 font-medium">Código</th>
                  <th className="p-4 font-medium">Semilla</th>
                  <th className="p-4 font-medium">Estado</th>
                  <th className="p-4 font-medium">Plántulas Actuales</th>
                  <th className="p-4 font-medium">Edad</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 text-sm">
                {camadas.filter(c => c.estado !== 'Agotada' && c.estado !== 'Descartada').map(camada => (
                  <tr key={camada.id_camada} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-mono font-medium text-blue-600">{camada.codigo_camada}</td>
                    <td className="p-4">{camada.nombre_semilla}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        camada.estado === 'Lista para Siembra' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {camada.estado}
                      </span>
                    </td>
                    <td className="p-4 font-medium">{camada.cantidad_actual}</td>
                    <td className="p-4">{camada.dias_crecimiento} días</td>
                  </tr>
                ))}
                {camadas.length === 0 && (
                  <tr><td colSpan="5" className="p-4 text-center text-slate-400">No hay camadas activas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tabla Historial de Movimientos */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-100 px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-700">Historial de Movimientos</h2>
          <p className="text-sm text-slate-500">Movimientos realizados con responsable y estado de cumplimiento en nómina.</p>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="p-4 font-medium">Fecha</th>
                <th className="p-4 font-medium">Tipo</th>
                <th className="p-4 font-medium">Camada</th>
                <th className="p-4 font-medium">Cantidad</th>
                <th className="p-4 font-medium">Empleado Responsable</th>
                <th className="p-4 font-medium">Estado Nómina</th>
                <th className="p-4 font-medium">Observaciones</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 text-sm">
              {movimientos.map(mov => (
                <tr key={mov.id_movimiento} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 whitespace-nowrap">{mov.fecha ? new Date(mov.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      mov.tipo_movimiento === 'Salida_Siembra' ? 'bg-emerald-100 text-emerald-700' :
                      mov.tipo_movimiento === 'Venta' ? 'bg-blue-100 text-blue-700' :
                      mov.tipo_movimiento === 'Baja_Enfermedad' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {mov.tipo_movimiento?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-xs">{mov.codigo_camada || '-'}</td>
                  <td className="p-4 font-medium">{mov.cantidad}</td>
                  <td className="p-4">
                    {mov.empleado_nombres ? (
                      <div>
                        <span className="font-medium">{mov.empleado_nombres} {mov.empleado_apellidos}</span>
                        <span className="block text-xs text-slate-400">{mov.empleado_cargo}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Sin asignar</span>
                    )}
                  </td>
                  <td className="p-4">
                    {mov.labor_estado ? (
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        mov.labor_estado === 'Completada' ? 'bg-green-100 text-green-700' :
                        mov.labor_estado === 'En Progreso' ? 'bg-yellow-100 text-yellow-700' :
                        mov.labor_estado === 'Incumplida' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {mov.labor_estado}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-500 text-xs max-w-[200px] truncate">{mov.observaciones || '-'}</td>
                </tr>
              ))}
              {movimientos.length === 0 && (
                <tr><td colSpan="7" className="p-4 text-center text-slate-400">No hay movimientos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Insumo */}
      {showInvModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Registrar Insumo de Vivero</h3>
              <button onClick={() => setShowInvModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <form onSubmit={handleCreateInventario} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select className="w-full border border-slate-300 rounded-lg p-2" value={invForm.tipo} onChange={e => setInvForm({...invForm, tipo: e.target.value})}>
                    <option>Semilla</option>
                    <option>Abono Químico</option>
                    <option>Abono Orgánico</option>
                    <option>Plántula</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre / Variedad</label>
                  <input type="text" required className="w-full border border-slate-300 rounded-lg p-2" value={invForm.nombre} onChange={e => setInvForm({...invForm, nombre: e.target.value})} />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad Inicial</label>
                    <input type="number" required min="0" step="0.01" className="w-full border border-slate-300 rounded-lg p-2" value={invForm.cantidad} onChange={e => setInvForm({...invForm, cantidad: e.target.value})} />
                  </div>
                  <div className="w-1/3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label>
                    <input type="text" required placeholder="kg, lb, und" className="w-full border border-slate-300 rounded-lg p-2" value={invForm.unidad} onChange={e => setInvForm({...invForm, unidad: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Costo Unitario ($)</label>
                  <input type="number" required min="0" step="0.01" className="w-full border border-slate-300 rounded-lg p-2" value={invForm.costo} onChange={e => setInvForm({...invForm, costo: e.target.value})} />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowInvModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">Guardar Insumo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Movimiento */}
      {showMovModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Despacho de Camada (Salida)</h3>
              <button onClick={() => setShowMovModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <form onSubmit={handleRegistrarMovimiento} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Camada de Origen</label>
                  <select required className="w-full border border-slate-300 rounded-lg p-2" value={movForm.id_camada} onChange={e => setMovForm({...movForm, id_camada: e.target.value})}>
                    <option value="">Seleccione una camada activa...</option>
                    {camadas.filter(c => c.cantidad_actual > 0).map(c => (
                      <option key={c.id_camada} value={c.id_camada}>{c.codigo_camada} ({c.cantidad_actual} disp.)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Movimiento</label>
                  <select className="w-full border border-slate-300 rounded-lg p-2" value={movForm.tipo_movimiento} onChange={e => setMovForm({...movForm, tipo_movimiento: e.target.value})}>
                    <option value="Salida_Siembra">Sembrar en Lote de Campo</option>
                    <option value="Venta">Venta a Terceros (Genera Ingreso Contable)</option>
                    <option value="Obsequio">Obsequio / Muestra</option>
                    <option value="Baja_Enfermedad">Baja por Plaga/Enfermedad</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad a Despachar</label>
                  <input type="number" required min="1" className="w-full border border-slate-300 rounded-lg p-2" value={movForm.cantidad} onChange={e => setMovForm({...movForm, cantidad: e.target.value})} />
                </div>
                {movForm.tipo_movimiento === 'Venta' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Precio de Venta Total ($)</label>
                    <input type="number" required min="1" step="0.01" className="w-full border border-slate-300 rounded-lg p-2" value={movForm.precio_venta_total} onChange={e => setMovForm({...movForm, precio_venta_total: e.target.value})} />
                    <p className="text-xs text-blue-600 mt-1">Este valor generará un Comprobante de Ingreso automático.</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Responsable / Empleado</label>
                  <select required className="w-full border border-slate-300 rounded-lg p-2" value={movForm.id_empleado} onChange={e => setMovForm({...movForm, id_empleado: e.target.value})}>
                    <option value="">Seleccione...</option>
                    {empleados.map(emp => (
                      <option key={emp.id_empleado} value={emp.id_empleado}>{emp.nombres} {emp.apellidos}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones / Lote Destino</label>
                  <input type="text" className="w-full border border-slate-300 rounded-lg p-2" placeholder="Ej: Sembrado en Lote Norte, o Cliente XYZ" value={movForm.observaciones} onChange={e => setMovForm({...movForm, observaciones: e.target.value})} />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowMovModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Ejecutar Despacho</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
