import React, { useState, useEffect } from 'react';
import EmployeeFormModal from './EmployeeFormModal';
import './Payroll.css';
import { authFetch } from '../../utils/api';

function EmployeesGrid({ tenantId }) {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const [modalState, setModalState] = useState({ isOpen: false, mode: 'add', pkValue: null, defaultValues: {} });
  const [sortConfig, setSortConfig] = useState({ key: 'nombres', direction: 'ascending' });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const sortedEmpleados = React.useMemo(() => {
    let sortableItems = [...empleados];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [empleados, sortConfig]);

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const fetchEmpleados = async () => {
    setLoading(true);
    try {
      // Fetch empleados
      const url = `/api/rrhh/empleados${tenantId ? `?tenantId=${tenantId}` : ''}`;
      const res = await authFetch(url);
      const data = await res.json();
      let empleadosData = Array.isArray(data) ? data : [];

      // Fetch terceros
      const tercerosUrl = `/api/table/terceros/data?pageSize=5000`;
      const resTerceros = await authFetch(tercerosUrl);
      const dataTerceros = await resTerceros.json();
      const terceros = Array.isArray(dataTerceros.data) ? dataTerceros.data : [];
      
      const tercerosMap = {};
      terceros.forEach(t => {
        tercerosMap[t.id_tercero || t.id] = t;
      });

      // Map names manually if the backend hasn't been restarted
      empleadosData = empleadosData.map(emp => {
        if (!emp.nombres && emp.id_tercero && tercerosMap[emp.id_tercero]) {
          const tercero = tercerosMap[emp.id_tercero];
          
          let nombres = tercero.nombre_completo || tercero.nombre_comercial || tercero.razon_social || '';
          let apellidos = '';
          
          // Try to split nombre_completo into nombres and apellidos if it's a natural person
          if (tercero.tipo_persona !== 'Juridica' && nombres.includes(' ')) {
             const parts = nombres.split(' ');
             apellidos = parts.slice(0, 2).join(' '); // Often Last Last First Middle
             nombres = parts.slice(2).join(' ') || nombres; // very naive split, but better than nothing
          }

          return {
            ...emp,
            nombres: tercero.nombre_completo || tercero.nombre_comercial || tercero.razon_social || '',
            apellidos: '', // Third party table often merges them into nombre_completo
            documento: tercero.documento_identidad || tercero.documento || emp.documento
          };
        }
        return emp;
      });

      setEmpleados(empleadosData);
    } catch (err) {
      console.error('Error fetching empleados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpleados();
  }, [tenantId]);

  const handleSimularBiometria = async (id_empleado, nombre) => {
    try {
      const res = await authFetch('/api/rrhh/biometria/simular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_empleado })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ ${data.tipo_marcacion} registrada para ${nombre}`);
      } else {
        showToast(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      showToast('❌ Error de conexión al simular.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este empleado?')) return;
    try {
      const res = await authFetch(`/api/table/rrhh_empleados/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('✅ Empleado eliminado');
        fetchEmpleados();
      } else {
        showToast('❌ Error al eliminar');
      }
    } catch (err) {
      showToast('❌ Error de conexión al eliminar');
    }
  };

  return (
    <div className="payroll-employees catalog-container" style={{ padding: '20px', borderRadius: 'var(--radius)', background: 'var(--card-bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>👥 Control de Personal y Biometría</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={fetchEmpleados}>🔄 Refrescar</button>
          <button className="btn btn-primary" onClick={() => setModalState({ isOpen: true, mode: 'add', pkValue: null, defaultValues: {} })}>+ Nuevo Empleado</button>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-container"><div className="spinner"></div><span className="loading-text">Cargando personal...</span></div>
      ) : empleados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No se encontraron empleados en la base de datos.</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('documento')} style={{ cursor: 'pointer' }}>
                Documento {sortConfig.key === 'documento' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('nombres')} style={{ cursor: 'pointer' }}>
                Nombres {sortConfig.key === 'nombres' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('apellidos')} style={{ cursor: 'pointer' }}>
                Apellidos {sortConfig.key === 'apellidos' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('cargo')} style={{ cursor: 'pointer' }}>
                Cargo {sortConfig.key === 'cargo' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('area_asignada')} style={{ cursor: 'pointer' }}>
                Área {sortConfig.key === 'area_asignada' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('estado')} style={{ cursor: 'pointer' }}>
                Estado {sortConfig.key === 'estado' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
              </th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedEmpleados.map(emp => (
              <tr key={emp.id_empleado}>
                <td>{emp.documento}</td>
                <td>
                  <div className="flex items-center gap-3">
                    {emp.fotografia ? (
                      <img src={emp.fotografia} alt="Foto" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748b' }}>
                        {emp.nombres ? emp.nombres.charAt(0) : 'E'}
                      </div>
                    )}
                    <strong>{emp.nombres}</strong>
                  </div>
                </td>
                <td><strong>{emp.apellidos}</strong></td>
                <td>{emp.cargo}</td>
                <td>{emp.area_asignada || 'Campo'}</td>
                <td>
                  <span className={`badge ${emp.estado === 'Activo' ? 'green' : 'gray'}`}>
                    {emp.estado}
                  </span>
                </td>
                  <td>
                    <div className="cell-actions" style={{ justifyContent: 'center' }}>
                      <button 
                        className="btn btn-outline btn-sm" 
                        onClick={() => handleSimularBiometria(emp.id_empleado, emp.nombres)}
                        title="Simular Biometría"
                      >
                        👆 <span className="btn-text">Huella</span>
                      </button>
                      <button 
                        className="btn btn-outline btn-sm btn-edit" 
                        onClick={() => setModalState({ isOpen: true, mode: 'edit', pkValue: emp.id_empleado, defaultValues: emp })}
                        title="Editar"
                      >
                        ✏️ <span className="btn-text">Editar</span>
                      </button>
                      <button 
                        className="btn btn-outline btn-sm btn-delete" 
                        onClick={() => handleDelete(emp.id_empleado)}
                        title="Eliminar"
                      >
                        🗑️ <span className="btn-text">Eliminar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Employee Form Modal */}
      {modalState.isOpen && (
        <EmployeeFormModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ ...modalState, isOpen: false })}
          tenantId={tenantId}
          mode={modalState.mode}
          pkValue={modalState.pkValue}
          defaultValues={modalState.defaultValues}
          onSuccess={() => {
            setModalState({ ...modalState, isOpen: false });
            fetchEmpleados();
            showToast(`✅ Empleado ${modalState.mode === 'add' ? 'creado' : 'actualizado'} con éxito`);
          }}
        />
      )}

      {/* TOAST */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px', background: 'var(--primary)', color: 'white', 
          padding: '12px 24px', borderRadius: '8px', zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', fontWeight: 'bold'
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default EmployeesGrid;
