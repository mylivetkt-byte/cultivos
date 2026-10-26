import React, { useState, useEffect } from 'react';
import DatePickerClaro from '../Common/DatePickerClaro';
import { exportToPdf } from '../../utils/exportPdf';
import { exportToExcel } from '../../utils/exportExcel';
import { authFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../Pagination';

function HistorialMantenimientosModal({ machine, onClose }) {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = () => {
    if (!machine) return;
    setLoading(true);
    const isMecanico = !!machine.cargo;
    const machineId = machine.id_maq_agro || machine.id_maquinaria || machine.id_vehiculo || machine.id_empleado;
    let url = isMecanico ? `/api/table/mecanicos/${machineId}/mantenimientos?` : `/api/table/maquinaria/${machineId}/mantenimientos?`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    
    authFetch(url)
      .then(res => res.json())
      .then(json => {
        setData(json.data || []);
        setCurrentPage(1);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (machine) {
      loadData();
    }
  }, [machine]);

  const getMetadata = () => {
    return {
      empresa: 'AgroPaccioli',
      finca: machine?.id_finca ? `Finca ID ${machine.id_finca}` : 'N/A',
      fechaDesde: startDate,
      fechaHasta: endDate,
      usuario: user?.nombre || user?.username || 'Usuario del Sistema',
      rol: user?.rol || 'No asignado',
      reportName: `Mantenimientos - ${machine.marca_modelo || machine.nombre} (${machine.placa || machine.codigo || ''})`
    };
  };

  const handleExportPdf = () => {
    const columns = [
      { name: 'numero_orden', type: 'varchar' },
      { name: 'tipo_orden', type: 'varchar' },
      { name: 'prioridad', type: 'varchar' },
      { name: 'fecha_solicitud', type: 'date' },
      { name: 'fecha_fin', type: 'date' },
      { name: 'estado', type: 'varchar' },
      { name: 'costo_total', type: 'decimal' },
      { name: 'tecnico_nombre', type: 'varchar' }
    ];
    const machineName = machine.marca_modelo || machine.nombre;
    const machineIdentifier = machine.placa || machine.codigo || '';
    exportToPdf(`Mantenimientos - ${machineName} (${machineIdentifier})`, columns, data, getMetadata());
  };

  const handleExportExcel = () => {
    const columns = [
      { name: 'numero_orden', type: 'varchar' },
      { name: 'tipo_orden', type: 'varchar' },
      { name: 'prioridad', type: 'varchar' },
      { name: 'fecha_solicitud', type: 'date' },
      { name: 'fecha_fin', type: 'date' },
      { name: 'estado', type: 'varchar' },
      { name: 'costo_total', type: 'decimal' },
      { name: 'tecnico_nombre', type: 'varchar' }
    ];
    const machineName = machine.marca_modelo || machine.nombre;
    const machineIdentifier = machine.placa || machine.codigo || '';
    exportToExcel(`Manttos_${machineName}_${machineIdentifier}`, columns, data, getMetadata());
  };

  if (!machine) return null;

  const displayMachineName = machine.marca_modelo || machine.nombre || 'Máquina';
  const displayMachineCode = machine.placa || machine.codigo || '';

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '1200px', width: '95vw', display: 'flex', flexDirection: 'column', height: '90vh' }}>
        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔧 Historial de Mantenimientos
            </h3>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Máquina: {displayMachineName} {displayMachineCode ? `[${displayMachineCode}]` : ''} | Finca ID: {machine.id_finca || 'N/A'}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-toolbar" style={{ display: 'flex', padding: '16px 24px', gap: '16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', flexShrink: 0, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '12px' }}>Desde</label>
            <DatePickerClaro className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '12px' }}>Hasta</label>
            <DatePickerClaro className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={loadData}>🔍 Filtrar</button>

          <div style={{ flex: 1 }} />
          
          <button className="btn-action-base btn-pdf" onClick={handleExportPdf}>
            📄 PDF
          </button>
          <button className="btn-action-base btn-excel" onClick={handleExportExcel}>
            📊 Excel
          </button>
        </div>

        <div className="modal-body table-scroll" style={{ padding: 0, overflow: 'auto', flex: 1 }}>
          {loading ? (
            <div className="loading-container"><div className="spinner"/></div>
          ) : data.length === 0 ? (
             <div className="empty-state" style={{ padding: '60px 0' }}>
                <div className="empty-state-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                <p>No se encontraron órdenes de trabajo en este rango de fechas.</p>
             </div>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Orden #</th>
                    <th>Tipo</th>
                    <th>Prioridad</th>
                    <th>Fecha Solicitud</th>
                    <th>Fecha Fin</th>
                    <th>Estado</th>
                    <th>Costo</th>
                    <th>Activo/Vehículo</th>
                    <th>Técnico / Taller</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice((currentPage - 1) * 20, currentPage * 20).map((row, index) => (
                    <tr key={row.id_mantenimiento || row.id_orden_trabajo || index}>
                      <td><strong>{row.numero_orden || '-'}</strong></td>
                      <td>{row.tipo_orden}</td>
                      <td>
                        <span style={{ 
                          color: row.prioridad === 'Alta' || row.prioridad === 'Critica' ? 'var(--danger)' : 
                                 row.prioridad === 'Media' ? 'var(--warning)' : 'var(--text-muted)'
                        }}>
                          {row.prioridad}
                        </span>
                      </td>
                      <td>{row.fecha_solicitud ? new Date(row.fecha_solicitud).toLocaleDateString() : '-'}</td>
                      <td>{row.fecha_fin ? new Date(row.fecha_fin).toLocaleDateString() : 'En proceso'}</td>
                      <td>
                        <span className={`badge ${row.estado === 'Completada' || row.estado === 'Verificada' ? 'badge-success' : 'badge-info'}`}>
                          {row.estado}
                        </span>
                      </td>
                      <td className="number-cell">
                        {row.costo_total ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(row.costo_total) : '-'}
                      </td>
                      <td>{row.activo_nombre ? `${row.activo_nombre} (${row.activo_codigo || ''})` : 'Este Equipo'}</td>
                      <td>{row.tecnico_nombre ? `${row.tecnico_nombre} ${row.tecnico_apellido || ''}` : '-'}</td>
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

export default HistorialMantenimientosModal;
