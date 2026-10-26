import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

const MotorContable = ({ tenantId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/erp/log-integraciones?tenantId=${tenantId || 1}`);
      if (!res.ok) throw new Error('Error network');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error(err);
      alert('Error cargando logs de integración');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [tenantId]);

  const simularSalidaBodega = async () => {
    try {
      setLoading(true);
      const eventoRes = await authFetch(`/api/erp/evento-bodega-salida?tenantId=${tenantId || 1}`);
      if (!eventoRes.ok) throw new Error('No hay salida de bodega disponible');
      const payload = await eventoRes.json();
      
      const res = await authFetch('/api/erp/contabilizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Network error');
      
      fetchLogs();
    } catch (err) {
      console.error(err);
      alert('Error en simulación');
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Motor de Integración ERP</h2>
          <p className="text-gray-600">Sincronización en tiempo real desde la operación a la contabilidad</p>
        </div>
        <div className="space-x-3">
          <button 
            onClick={fetchLogs}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
          >
            🔄 Actualizar
          </button>
          <button 
            onClick={simularSalidaBodega}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            🧪 Simular Salida de Bodega
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">Log de Integraciones Automáticas</h3>
          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">En Tiempo Real</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-gray-500 text-xs uppercase tracking-wider border-b">
                <th className="p-4">Fecha / Hora</th>
                <th className="p-4">Origen (Módulo)</th>
                <th className="p-4">Tipo Documento</th>
                <th className="p-4">Consecutivo</th>
                <th className="p-4">Concepto Automático</th>
                <th className="p-4 text-right">Monto Contabilizado</th>
                <th className="p-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">Cargando integraciones...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">No hay integraciones automáticas registradas aún. ¡Haz una simulación!</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id_documento} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-600">
                      {new Date(log.fecha).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-800">{log.tabla_origen}</span>
                        <span className="text-xs text-gray-500">ID: {log.id_origen}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                        {log.tipo_doc_nombre || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-medium text-gray-700">{log.numero_doc}</td>
                    <td className="p-4 text-gray-600 truncate max-w-xs">{log.concepto}</td>
                    <td className="p-4 text-right font-medium text-gray-800">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(log.total_debito || 0)}
                    </td>
                    <td className="p-4 text-center">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                        Sincronizado
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MotorContable;
