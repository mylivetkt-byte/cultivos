import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Clock, FileWarning, Search } from 'lucide-react';
import { authFetch } from '../../utils/api';
import CorregirFacturaModal from './CorregirFacturaModal';
import DetallesErrorModal from './DetallesErrorModal';
import Pagination from '../Pagination';

function POSDianPendientes() {
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [facturaErrorDetalles, setFacturaErrorDetalles] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchPendientes = async () => {
    setLoading(true);
    try {
      const data = await authFetch('/api/pos/ventas/dian-pendientes');
      setPendientes(data);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching pendientes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendientes();
  }, []);

  const handleSyncLote = async () => {
    setSyncing(true);
    try {
      await authFetch('/api/pos/ventas/dian-reintentar-lote', { method: 'POST' });
      alert('Sincronización masiva iniciada en segundo plano.');
      // Refrescamos en unos segundos para ver si cambiaron
      setTimeout(fetchPendientes, 3000);
    } catch (error) {
      alert('Error iniciando sincronización: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileWarning className="text-orange-500" /> Facturas Pendientes DIAN
          </h1>
          <p className="text-slate-400 text-sm mt-1">Facturas que fallaron por red o datos inválidos.</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={fetchPendientes}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
          
          <button 
            onClick={handleSyncLote}
            disabled={syncing || pendientes.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} /> Forzar Sincronización
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-900/50 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Factura</th>
                <th className="px-6 py-4 font-medium">Fecha Emisión</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium text-right">Total</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium">Intentos</th>
                <th className="px-6 py-4 font-medium text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-400">Cargando...</td>
                </tr>
              ) : pendientes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    <CheckCircle size={40} className="mx-auto text-green-500 mb-3 opacity-50" />
                    <p>No hay facturas pendientes. Todo está sincronizado.</p>
                  </td>
                </tr>
              ) : (
                pendientes.slice((currentPage - 1) * 20, currentPage * 20).map(doc => (
                  <tr key={doc.id_documento} className="hover:bg-slate-700/20 transition-colors group">
                    <td className="px-6 py-4 font-medium text-white">{doc.numero_documento}</td>
                    <td className="px-6 py-4">
                      {new Date(doc.fecha_emision).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-200">{doc.nombre_completo}</div>
                      <div className="text-xs text-slate-500">{doc.nit_cliente}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-green-400">
                      ${Number(doc.total).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {doc.dian_status === 'Rechazado' ? (
                          <AlertTriangle size={16} className="text-red-500" />
                        ) : (
                          <Clock size={16} className="text-orange-500" />
                        )}
                        <span className={doc.dian_status === 'Rechazado' ? 'text-red-400' : 'text-orange-400'}>
                          {doc.dian_status}
                        </span>
                      </div>
                      {doc.dian_error_msg && (
                        <div className="text-xs text-red-400/80 mt-1 max-w-[200px] truncate" title={doc.dian_error_msg}>
                          {doc.dian_error_msg}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full bg-slate-700 text-slate-300">
                        {doc.dian_retry_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {doc.dian_status === 'Rechazado' ? (
                        <button 
                          onClick={() => setFacturaSeleccionada(doc)}
                          className="px-3 py-1.5 text-xs font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors"
                        >
                          Corregir
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500">Esperando reintento...</span>
                      )}
                      {doc.dian_error_msg && (
                        <button 
                          onClick={() => setFacturaErrorDetalles(doc)}
                          className="ml-2 px-3 py-1.5 text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-600 rounded-lg transition-colors"
                        >
                          Ver Detalles
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination 
          currentPage={currentPage}
          totalItems={pendientes.length}
          pageSize={20}
          onPageChange={setCurrentPage}
        />
      </div>

      {facturaSeleccionada && (
        <CorregirFacturaModal
          factura={facturaSeleccionada}
          onClose={() => setFacturaSeleccionada(null)}
          onSuccess={() => {
            setFacturaSeleccionada(null);
            fetchPendientes();
          }}
        />
      )}

      {facturaErrorDetalles && (
        <DetallesErrorModal
          factura={facturaErrorDetalles}
          onClose={() => setFacturaErrorDetalles(null)}
        />
      )}
    </div>
  );
}

export default POSDianPendientes;
