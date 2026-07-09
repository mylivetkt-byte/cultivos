import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

function HistorialRepuestosModal({ machine, onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (machine) {
      setLoading(true);
      // Fetch data filtering by id_maquinaria
      // The generic API /api/table/:name/data might not support exact column filtering out of the box
      // except if we pass it as a query param or use search. We'll use search for prototyping.
      const machineId = machine.id_maq_agro || machine.id_maquinaria || machine.id_vehiculo;
      authFetch(`/api/table/inv_repuestos_cambiados/data?search=${machineId}`)
        .then(res => res.json())
        .then(json => {
          // Filter strictly in frontend just in case search brought extra matches
          const filtered = (json.data || []).filter(item => String(item.id_maquinaria) === String(machineId));
          setData(filtered);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [machine]);

  if (!machine) return null;

  const displayMachineName = machine.marca_modelo || machine.nombre || 'Máquina';
  const displayMachineCode = machine.placa || machine.codigo || '';

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '900px', width: '90vw' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0 }}>📦 Historial de Repuestos - {displayMachineName} {displayMachineCode ? `(${displayMachineCode})` : ''}</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Finca ID: {machine.id_finca || 'N/A'} | Máquina ID: {machine.id_maq_agro || machine.id_maquinaria}</span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body table-scroll">
          {loading ? (
            <div className="loading-container"><div className="spinner"/></div>
          ) : data.length === 0 ? (
             <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <p>No se han registrado cambios de repuestos para esta máquina.</p>
             </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID Cambio</th>
                  <th>Insumo ID</th>
                  <th>Fecha Entrega</th>
                  <th>Pieza Vieja</th>
                  <th>Estado</th>
                  <th>Empleado ID</th>
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <tr key={row.id_cambio}>
                    <td>{row.id_cambio}</td>
                    <td>{row.id_insumo}</td>
                    <td>{row.fecha_entrega_pieza ? new Date(row.fecha_entrega_pieza).toLocaleDateString() : 'N/A'}</td>
                    <td>{row.pieza_vieja_entregada ? 'Entregada' : 'No'}</td>
                    <td><span className={`badge ${row.estado_devolucion === 'Entregado_Bodega' ? 'badge-success' : 'badge-warning'}`}>{row.estado_devolucion}</span></td>
                    <td>{row.id_empleado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default HistorialRepuestosModal;
