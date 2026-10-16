import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';
import { Tractor, Play, Square, Clock, Fuel, PenTool } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RadarMaquinaria() {
  const [activas, setActivas] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(null); // id_bitacora
  
  // Forms state
  const [checkInForm, setCheckInForm] = useState({ id_maq_agro: '', id_lote: '', id_empleado: '', horometro_inicial: '' });
  const [checkOutForm, setCheckOutForm] = useState({ horometro_final: '', combustible_consumido_gal: '', novedades: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [activasRes, maqRes, lotesRes, empRes] = await Promise.all([
        fetchApi('/radar-maquinaria/activas').catch(() => []),
        fetchApi('/table/agroind_maquinaria_equipo/data').catch(() => ({ data: [] })),
        fetchApi('/table/lotes/data').catch(() => ({ data: [] })),
        fetchApi('/table/rrhh_empleados/data').catch(() => ({ data: [] }))
      ]);
      setActivas(Array.isArray(activasRes) ? activasRes : []);
      setMaquinas(maqRes.data || []);
      setLotes(lotesRes.data || []);
      setEmpleados(empRes.data || []);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refrescar cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const handleCheckIn = async (e) => {
    e.preventDefault();
    try {
      await fetchApi('/radar-maquinaria/checkin', {
        method: 'POST',
        body: JSON.stringify(checkInForm)
      });
      setShowCheckIn(false);
      setCheckInForm({ id_maq_agro: '', id_lote: '', id_empleado: '', horometro_inicial: '' });
      loadData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleCheckOut = async (e) => {
    e.preventDefault();
    try {
      await fetchApi('/radar-maquinaria/checkout', {
        method: 'POST',
        body: JSON.stringify({ id_bitacora: showCheckOut, ...checkOutForm })
      });
      setShowCheckOut(null);
      setCheckOutForm({ horometro_final: '', combustible_consumido_gal: '', novedades: '' });
      loadData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  if (loading && activas.length === 0) return <div className="p-4">Cargando radar...</div>;

  return (
    <div className="radar-container p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center text-green-800">
          <span className="relative flex h-3 w-3 mr-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          El Radar de Maquinaria
        </h2>
        <button className="btn btn-primary flex items-center" onClick={() => setShowCheckIn(true)}>
          <Play size={16} className="mr-2" />
          Check-in (Iniciar Labor)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activas.map(activa => (
          <div key={activa.id_bitacora} className="card bg-white shadow-lg rounded-xl border border-green-200 overflow-hidden">
            <div className="bg-green-600 text-white p-3 flex justify-between items-center">
              <div className="font-bold flex items-center">
                <Tractor size={18} className="mr-2" /> {activa.marca_modelo} ({activa.placa})
              </div>
              <span className="text-xs bg-green-800 px-2 py-1 rounded-full animate-pulse">EN CAMPO</span>
            </div>
            <div className="p-4">
              <p className="mb-2"><strong>Operario:</strong> {activa.nombres} {activa.apellidos}</p>
              <p className="mb-2"><strong>Lote:</strong> {activa.lote_nombre}</p>
              <p className="mb-2"><strong>Inicio:</strong> {new Date(activa.fecha_hora_inicio).toLocaleTimeString()}</p>
              <p className="mb-4"><strong>Horómetro Inicial:</strong> {activa.horometro_inicial}</p>
              
              <button 
                className="w-full btn btn-danger flex justify-center items-center py-2"
                onClick={() => setShowCheckOut(activa.id_bitacora)}
              >
                <Square size={16} className="mr-2" />
                Check-out (Finalizar)
              </button>
            </div>
          </div>
        ))}
        {activas.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-500">
            <Tractor size={48} className="mx-auto mb-4 opacity-50" />
            <p>No hay maquinaria operando en campo en este momento.</p>
          </div>
        )}
      </div>

      {/* Check-in Modal */}
      {showCheckIn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Iniciar Labor (Check-in)</h3>
            <form onSubmit={handleCheckIn}>
              <div className="mb-3">
                <label className="block text-sm font-semibold mb-1">Máquina/Tractor</label>
                <select className="form-control w-full p-2 border rounded" required
                  value={checkInForm.id_maq_agro} onChange={e => setCheckInForm({...checkInForm, id_maq_agro: e.target.value})}>
                  <option value="">Seleccione...</option>
                  {maquinas.map(m => <option key={m.id_maq_agro} value={m.id_maq_agro}>{m.marca_modelo} ({m.placa})</option>)}
                </select>
              </div>
              <div className="mb-3">
                <label className="block text-sm font-semibold mb-1">Lote</label>
                <select className="form-control w-full p-2 border rounded" required
                  value={checkInForm.id_lote} onChange={e => setCheckInForm({...checkInForm, id_lote: e.target.value})}>
                  <option value="">Seleccione...</option>
                  {lotes.map(l => <option key={l.id_lote} value={l.id_lote}>{l.nombre}</option>)}
                </select>
              </div>
              <div className="mb-3">
                <label className="block text-sm font-semibold mb-1">Operario</label>
                <select className="form-control w-full p-2 border rounded" required
                  value={checkInForm.id_empleado} onChange={e => setCheckInForm({...checkInForm, id_empleado: e.target.value})}>
                  <option value="">Seleccione...</option>
                  {empleados.map(emp => <option key={emp.id_empleado} value={emp.id_empleado}>{emp.nombres} {emp.apellidos}</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-1">Horómetro Inicial</label>
                <input type="number" step="0.01" className="form-control w-full p-2 border rounded" required
                  value={checkInForm.horometro_inicial} onChange={e => setCheckInForm({...checkInForm, horometro_inicial: e.target.value})} />
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCheckIn(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Iniciar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Check-out Modal */}
      {showCheckOut && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Finalizar Labor (Check-out)</h3>
            <form onSubmit={handleCheckOut}>
              <div className="mb-3">
                <label className="block text-sm font-semibold mb-1">Horómetro Final</label>
                <div className="flex items-center">
                  <Clock size={16} className="mr-2 text-gray-500" />
                  <input type="number" step="0.01" className="form-control w-full p-2 border rounded" required
                    value={checkOutForm.horometro_final} onChange={e => setCheckOutForm({...checkOutForm, horometro_final: e.target.value})} />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-sm font-semibold mb-1">Combustible Recargado (Galones)</label>
                <div className="flex items-center">
                  <Fuel size={16} className="mr-2 text-gray-500" />
                  <input type="number" step="0.01" className="form-control w-full p-2 border rounded"
                    value={checkOutForm.combustible_consumido_gal} onChange={e => setCheckOutForm({...checkOutForm, combustible_consumido_gal: e.target.value})} />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-1">Novedades / Observaciones</label>
                <div className="flex items-start">
                  <PenTool size={16} className="mr-2 mt-2 text-gray-500" />
                  <textarea className="form-control w-full p-2 border rounded" rows="3" placeholder="Ej: Falla en llanta, terreno muy húmedo..."
                    value={checkOutForm.novedades} onChange={e => setCheckOutForm({...checkOutForm, novedades: e.target.value})}></textarea>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCheckOut(null)}>Cancelar</button>
                <button type="submit" className="btn btn-danger">Finalizar Labor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
