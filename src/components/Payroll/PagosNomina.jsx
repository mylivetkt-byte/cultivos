import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function PagosNomina({ tenantId, fincaId }) {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState(null);

  // Tipos de cuenta fijos para simplificar (idealmente vendrían del backend /api/cuentas)
  const cuentaCaja = 4; // id_cuenta = 4 (1.1.1.01 Caja General)
  const cuentaBanco = 5; // id_cuenta = 5 (1.1.1.02 Banco Bancolombia)

  useEffect(() => {
    fetchPagos();
  }, [tenantId, fincaId]);

  const fetchPagos = async () => {
    try {
      setLoading(true);
      const url = `/api/rrhh/pagos?tenantId=${tenantId || 1}${fincaId ? '&fincaId='+fincaId : ''}`;
      const res = await axios.get(url);
      setPagos(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEjecutarPago = async (id, idCuenta) => {
    if (!window.confirm(`¿Confirmas el pago/egreso desde la cuenta seleccionada?`)) return;
    try {
      setProcesandoId(id);
      const res = await axios.post(`/api/rrhh/pagos/${id}/ejecutar`, {
        cuenta_origen_id: idCuenta
      });
      alert(res.data.message);
      fetchPagos();
    } catch (err) {
      console.error(err);
      alert('Error ejecutando el pago.');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleDescargarArchivo = (id) => {
    window.open(`/api/rrhh/pagos/${id}/archivo-banco`, '_blank');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <span>💸</span>
          Tesorería: Dispersión de Nómina
        </h1>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-blue-800 text-sm">
        <strong>Info:</strong> Aquí aparecen únicamente las planillas que han sido <em>Contabilizadas</em> (cerradas y causadas contablemente).
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-8 text-center text-gray-500">Cargando órdenes de pago...</div>
        ) : pagos.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
            No hay nóminas pendientes de pago en este momento.
          </div>
        ) : pagos.map(p => {
          const isPagada = p.estado === 'Pagada';
          return (
            <div key={p.id_planilla} className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col gap-4 ${isPagada ? 'border-green-200' : 'border-gray-100'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Nómina #{p.id_planilla}</h2>
                  <p className="text-sm font-bold text-blue-600">Ciclo {p.ciclo}</p>
                  <p className="text-xs text-gray-500 mt-1">{p.fecha_inicio.substring(0,10)} al {p.fecha_fin.substring(0,10)}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${isPagada ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                  {isPagada ? 'PAGADA' : 'PENDIENTE PAGO'}
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Monto a Pagar</p>
                  <p className="text-2xl font-bold text-gray-900">${Number(p.total_neto).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Empleados</p>
                  <p className="text-lg font-bold text-gray-700">{p.num_empleados}</p>
                </div>
              </div>

              {isPagada ? (
                <div className="pt-2 text-center text-sm font-bold text-green-600">
                  ✓ El Comprobante de Egreso ya fue generado.
                </div>
              ) : (
                <div className="pt-4 border-t space-y-3">
                  <p className="text-sm font-bold text-gray-700">Opciones de Dispersión:</p>
                  
                  {/* Opción 1: Banco */}
                  <div className="border rounded p-3 bg-gray-50 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold">🏢 Consignación Bancaria</span>
                      <button 
                        onClick={() => handleDescargarArchivo(p.id_planilla)}
                        className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 font-bold"
                      >
                        ↓ Bajar PAB
                      </button>
                    </div>
                    <button 
                      onClick={() => handleEjecutarPago(p.id_planilla, cuentaBanco)}
                      disabled={procesandoId === p.id_planilla}
                      className="w-full bg-blue-600 text-white text-sm py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      Generar Egreso desde Bancolombia
                    </button>
                  </div>

                  {/* Opción 2: Caja */}
                  <div className="border rounded p-3 bg-gray-50 flex flex-col gap-2">
                    <span className="text-sm font-bold">💵 Efectivo Físico</span>
                    <button 
                      onClick={() => handleEjecutarPago(p.id_planilla, cuentaCaja)}
                      disabled={procesandoId === p.id_planilla}
                      className="w-full bg-gray-600 text-white text-sm py-2 rounded hover:bg-gray-700 transition disabled:opacity-50"
                    >
                      Generar Egreso desde Caja General
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
