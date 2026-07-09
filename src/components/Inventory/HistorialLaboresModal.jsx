import React, { useState, useEffect } from 'react';
import { exportToPdf } from '../../utils/exportPdf';
import { exportToExcel } from '../../utils/exportExcel';
import { authFetch } from '../../utils/api';

function HistorialLaboresModal({ machine, onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [idFinca, setIdFinca] = useState('');
  const [idLote, setIdLote] = useState('');
  
  const [fincas, setFincas] = useState([]);
  const [lotes, setLotes] = useState([]);

  useEffect(() => {
    authFetch('/api/table/fincas/data?pageSize=100').then(r=>r.json()).then(j=>setFincas(j.data || []));
    authFetch('/api/table/lotes/data?pageSize=500').then(r=>r.json()).then(j=>setLotes(j.data || []));
  }, []);

  const loadData = () => {
    if (!machine) return;
    setLoading(true);
    const isMecanico = !!machine.cargo;
    const machineId = machine.id_maq_agro || machine.id_maquinaria || machine.id_vehiculo || machine.id_empleado;
    let url = isMecanico ? `/api/table/mecanicos/${machineId}/labores?` : `/api/table/maquinaria/${machineId}/labores?`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    if (idFinca) url += `&id_finca=${idFinca}`;
    if (idLote) url += `&id_lote=${idLote}`;
    
    authFetch(url)
      .then(res => res.json())
      .then(json => {
        setData(json.data || []);
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

  const handleExportPdf = () => {
    const columns = [
      { name: 'id_labor', type: 'int' },
      { name: 'fecha_planificada', type: 'date' },
      { name: 'categoria', type: 'varchar' },
      { name: 'descripcion_labor', type: 'varchar' },
      { name: 'estado', type: 'varchar' },
      { name: 'finca_nombre', type: 'varchar' },
      { name: 'lote_codigo', type: 'varchar' },
      { name: 'cultivo_nombre', type: 'varchar' },
      { name: 'empleado_nombre', type: 'varchar' }
    ];
    const machineName = machine.marca_modelo || machine.nombre;
    const machineIdentifier = machine.placa || machine.codigo || '';
    exportToPdf(`Labores - ${machineName} (${machineIdentifier})`, columns, data);
  };

  const handleExportExcel = () => {
    const columns = [
      { name: 'id_labor', type: 'int' },
      { name: 'fecha_planificada', type: 'date' },
      { name: 'categoria', type: 'varchar' },
      { name: 'descripcion_labor', type: 'varchar' },
      { name: 'estado', type: 'varchar' },
      { name: 'finca_nombre', type: 'varchar' },
      { name: 'lote_codigo', type: 'varchar' },
      { name: 'cultivo_nombre', type: 'varchar' },
      { name: 'empleado_nombre', type: 'varchar' }
    ];
    const machineName = machine.marca_modelo || machine.nombre;
    const machineIdentifier = machine.placa || machine.codigo || '';
    exportToExcel(`Labores_${machineName}_${machineIdentifier}`, columns, data);
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
              {isMecanico ? '👨‍🔧 Mano de Obra y Vehículos Atendidos' : '🚜 Historial de Labores'} - {displayMachineName} {displayMachineCode ? `(${displayMachineCode})` : ''}
            </h3>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Máquina: {displayMachineName} {displayMachineCode ? `[${displayMachineCode}]` : ''} | Finca ID: {machine.id_finca || 'N/A'}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-toolbar" style={{ display: 'flex', padding: '16px 24px', gap: '16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', flexShrink: 0, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '130px' }}>
            <label style={{ fontSize: '12px' }}>Desde</label>
            <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '130px' }}>
            <label style={{ fontSize: '12px' }}>Hasta</label>
            <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
            <label style={{ fontSize: '12px' }}>Finca</label>
            <select className="form-control" value={idFinca} onChange={e => setIdFinca(e.target.value)}>
              <option value="">Todas</option>
              {fincas.map(f => <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
            <label style={{ fontSize: '12px' }}>Lote</label>
            <select className="form-control" value={idLote} onChange={e => setIdLote(e.target.value)}>
              <option value="">Todos</option>
              {lotes.filter(l => !idFinca || String(l.id_finca) === String(idFinca) || true).map(l => (
                <option key={l.id_lote} value={l.id_lote}>{l.codigo || l.nombre}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={loadData}>🔍 Filtrar</button>

          <div style={{ flex: 1 }} />
          
          <button className="btn btn-outline" onClick={handleExportPdf} disabled={data.length === 0}>
            📄 PDF
          </button>
          <button className="btn btn-outline" onClick={handleExportExcel} disabled={data.length === 0}>
            📊 Excel
          </button>
        </div>

        <div className="modal-body table-scroll" style={{ padding: 0, overflow: 'auto', flex: 1 }}>
          {loading ? (
            <div className="loading-container"><div className="spinner"/></div>
          ) : data.length === 0 ? (
             <div className="empty-state" style={{ padding: '60px 0' }}>
                <div className="empty-state-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                <p>No se encontraron labores agrícolas en este rango de fechas.</p>
             </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Labor / Actividad</th>
                  <th>Estado</th>
                  {!isMecanico && <th>Finca</th>}
                  {!isMecanico && <th>Lote / Cultivo</th>}
                  <th>Vehículo / Máquina Atendida</th>
                  <th>{isMecanico ? 'Mecánico' : 'Operador'}</th>
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <tr key={row.id_labor}>
                    <td>{row.fecha_planificada ? new Date(row.fecha_planificada).toLocaleDateString() : ''}</td>
                    <td>{row.categoria}</td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'normal' }}>{row.descripcion_labor}</td>
                    <td>
                      <span className={`status-badge status-${row.estado?.toLowerCase() || 'default'}`}>
                        {row.estado}
                      </span>
                    </td>
                    {!isMecanico && <td>{row.finca_nombre || 'N/A'}</td>}
                    {!isMecanico && <td>
                      {row.lote_nombre} {row.lote_codigo ? `(${row.lote_codigo})` : ''}
                      {row.cultivo_nombre ? <><br/><small>{row.cultivo_nombre}</small></> : ''}
                    </td>}
                    <td>
                      <strong>{row.vehiculo_placa ? `Vehículo: ${row.vehiculo_placa}` : row.maquina_nombre ? `Máquina: ${row.maquina_nombre}` : 'N/A'}</strong>
                    </td>
                    <td>{row.empleado_nombre ? `${row.empleado_nombre} ${row.empleado_apellido || ''}` : '-'}</td>
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

export default HistorialLaboresModal;
