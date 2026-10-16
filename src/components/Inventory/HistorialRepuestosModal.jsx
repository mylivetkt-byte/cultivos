import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';
import Pagination from '../Pagination';

function HistorialRepuestosModal({ machine, onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Dictionaries for ID resolution
  const [insumos, setInsumos] = useState({});
  const [empleados, setEmpleados] = useState({});

  useEffect(() => {
    const fetchDicts = async () => {
      try {
        const [insRes, empRes] = await Promise.all([
          authFetch('/api/table/insumos/data'),
          authFetch('/api/table/rrhh_empleados/data')
        ]);
        if (insRes.ok) {
          const insData = await insRes.json();
          const insMap = {};
          (insData.data || []).forEach(i => insMap[i.id_insumo] = i.nombre);
          setInsumos(insMap);
        }
        if (empRes.ok) {
          const empData = await empRes.json();
          const empMap = {};
          (empData.data || []).forEach(e => empMap[e.id_empleado] = `${e.nombres} ${e.apellidos || ''}`.trim());
          setEmpleados(empMap);
        }
      } catch (e) {
        console.error("Error loading dictionaries", e);
      }
    };
    fetchDicts();
  }, []);

  useEffect(() => {
    if (machine) {
      setLoading(true);
      const machineId = machine.id_maq_agro || machine.id_maquinaria || machine.id_vehiculo;
      authFetch(`/api/table/inv_repuestos_cambiados/data?search=${machineId}`)
        .then(res => res.json())
        .then(json => {
          const filtered = (json.data || []).filter(item => String(item.id_maquinaria) === String(machineId));
          setData(filtered);
          setCurrentPage(1);
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
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID Cambio</th>
                    <th>Insumo / Repuesto</th>
                    <th>Fecha Entrega</th>
                    <th>Pieza Vieja</th>
                    <th>Estado</th>
                    <th>Mecánico / Empleado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice((currentPage - 1) * 20, currentPage * 20).map(row => (
                    <tr key={row.id_cambio}>
                      <td>{row.id_cambio}</td>
                      <td style={{ fontWeight: 'bold' }}>{insumos[row.id_insumo] || `ID: ${row.id_insumo}`}</td>
                      <td>{row.fecha_entrega_pieza ? new Date(row.fecha_entrega_pieza).toLocaleDateString() : 'N/A'}</td>
                      <td>{row.pieza_vieja_entregada ? 'Entregada' : 'No'}</td>
                      <td><span className={`badge ${row.estado_devolucion === 'Entregado_Bodega' ? 'badge-success' : 'badge-warning'}`}>{row.estado_devolucion}</span></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{empleados[row.id_empleado] || `ID: ${row.id_empleado}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length > 0 && (
                <Pagination 
                  currentPage={currentPage}
                  totalItems={data.length}
                  pageSize={20}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default HistorialRepuestosModal;
