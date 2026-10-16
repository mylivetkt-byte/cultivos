import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { authFetch } from '../../utils/api';

function CorregirFacturaModal({ factura, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [terceros, setTerceros] = useState([]);
  const [selectedTerceroId, setSelectedTerceroId] = useState(factura.id_tercero || '');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTerceros();
  }, [searchQuery]);

  const fetchTerceros = async () => {
    try {
      // Buscar clientes (es_cliente = 1)
      const data = await authFetch(`/api/table/terceros?limit=20&search=${searchQuery}&es_cliente=1`);
      setTerceros(data.rows || []);
      
      // Asegurar que el tercero actual esté en la lista si no hemos buscado nada
      if (!searchQuery && factura.id_tercero && !(data.rows || []).some(t => t.id_tercero === factura.id_tercero)) {
        setTerceros([{
          id_tercero: factura.id_tercero,
          nombre_completo: factura.nombre_completo,
          documento: factura.nit_cliente
        }, ...(data.rows || [])]);
      }
    } catch (error) {
      console.error('Error fetching terceros:', error);
    }
  };

  const handleGuardar = async () => {
    if (!selectedTerceroId) return alert('Debes seleccionar un cliente.');
    
    setLoading(true);
    try {
      await authFetch(`/api/pos/ventas/${factura.id_documento}/corregir-dian`, {
        method: 'PUT',
        body: JSON.stringify({ id_tercero: selectedTerceroId })
      });
      alert('Factura corregida y encolada para reintento DIAN.');
      onSuccess();
    } catch (error) {
      alert(error.message || 'Error al corregir factura');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-800/50">
          <div>
            <h2 className="text-xl font-bold text-white">Corregir Factura DIAN</h2>
            <p className="text-sm text-slate-400 mt-1">Factura #{factura.numero_documento}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-red-400 mb-1">Motivo de Rechazo:</h3>
            <p className="text-sm text-slate-300">{factura.dian_error_msg || 'No especificado'}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Seleccionar Cliente Correcto</label>
              
              <div className="relative mb-3">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por NIT o Nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg max-h-48 overflow-y-auto">
                {terceros.map(t => (
                  <label key={t.id_tercero} className={`flex flex-col p-3 border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/50 transition-colors ${selectedTerceroId === t.id_tercero ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : ''}`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="tercero" 
                        value={t.id_tercero} 
                        checked={selectedTerceroId === t.id_tercero}
                        onChange={() => setSelectedTerceroId(t.id_tercero)}
                        className="text-blue-500 bg-slate-900 border-slate-600"
                      />
                      <div>
                        <div className="text-sm font-medium text-white">{t.nombre_completo || t.nombre_comercial}</div>
                        <div className="text-xs text-slate-400">NIT: {t.documento}</div>
                      </div>
                    </div>
                  </label>
                ))}
                {terceros.length === 0 && (
                  <div className="p-4 text-center text-sm text-slate-500">No se encontraron clientes.</div>
                )}
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
              <p className="text-sm text-blue-400 leading-relaxed">
                Al guardar, la factura actualizará su cliente y <strong>su fecha de emisión cambiará al día de hoy</strong>. Luego el sistema intentará retransmitirla automáticamente a la DIAN.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={loading || !selectedTerceroId}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? 'Guardando...' : 'Corregir y Reenviar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CorregirFacturaModal;
