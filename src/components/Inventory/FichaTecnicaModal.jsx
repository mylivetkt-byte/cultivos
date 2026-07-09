import React from 'react';
import FichaTecnicaEditor from './FichaTecnicaEditor';

function FichaTecnicaModal({ machine, onClose, onSave }) {
  if (!machine) return null;

  const handleSave = async () => {
    // Save is handled directly by the editor if we want, or we can just call onSave
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h3>📋 Ficha Técnica - {machine.marca_modelo || 'Maquinaria'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Gestiona la lista de repuestos, lubricantes y filtros necesarios para esta máquina.
          </p>
          <FichaTecnicaEditor 
            value={machine.ficha_tecnica} 
            onChange={(val) => onSave(machine.id_maq_agro, 'ficha_tecnica', val)} 
          />
        </div>
        <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

export default FichaTecnicaModal;
