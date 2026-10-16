import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

function DetallesErrorModal({ factura, onClose }) {
  const [copied, setCopied] = useState(false);
  
  let jsonString = '';
  try {
    if (typeof factura.dian_payload_json === 'string') {
      jsonString = JSON.stringify(JSON.parse(factura.dian_payload_json), null, 2);
    } else {
      jsonString = JSON.stringify(factura.dian_payload_json, null, 2);
    }
  } catch (e) {
    jsonString = String(factura.dian_payload_json || 'No hay JSON guardado.');
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-800/50">
          <div>
            <h2 className="text-xl font-bold text-white">Detalles del Error DIAN</h2>
            <p className="text-sm text-slate-400 mt-1">Factura #{factura.numero_documento}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 flex flex-col">
          <div>
            <h3 className="text-sm font-semibold text-red-400 mb-2">Mensaje de Error devuelto por la DIAN:</h3>
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-slate-300 text-sm whitespace-pre-wrap">
              {factura.dian_error_msg || 'El proveedor tecnológico no devolvió un mensaje específico.'}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-[300px]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-slate-300">Payload JSON Enviado:</h3>
              <button 
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? 'Copiado' : 'Copiar JSON'}
              </button>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex-1 overflow-auto">
              <pre className="text-xs text-green-400 font-mono">
                {jsonString}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DetallesErrorModal;
