// src/components/Payroll/LaborBoard.jsx
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import './Payroll.css';
import { authFetch } from '../../utils/api';

function LaborBoard({ tenantId }) {
  const [labores, setLabores] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState({});

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resLabores, resEmp] = await Promise.all([
        authFetch(`http://localhost:3002/api/labores?tenantId=${tenantId || 1}`),
        authFetch(`http://localhost:3002/api/rrhh/empleados?tenantId=${tenantId || 1}`)
      ]);
      const dataLab = await resLabores.json();
      const dataEmp = await resEmp.json();
      
      setLabores(Array.isArray(dataLab) ? dataLab : []);
      setEmpleados(Array.isArray(dataEmp) ? dataEmp : []);
    } catch (err) {
      console.error(err);
      showToast('❌ Error cargando datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenantId]);

  const handleAsignar = async (id_labor, id_empleado) => {
    if (!id_empleado) {
      showToast('⚠️ Seleccione un empleado primero.');
      return;
    }
    showToast('⏳ Asignando empleado...');
    try {
      const res = await authFetch(`http://localhost:3002/api/labores/${id_labor}/asignar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_empleado })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('✅ Empleado asignado y labor En Progreso.');
        fetchData();
      } else {
        showToast(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      showToast('❌ Error de conexión.');
    }
  };

  return (
    <div className="payroll-labor-board glass-card" style={{ padding: '20px', borderRadius: 'var(--radius)', background: 'var(--card-bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>🚜 Programador de Labores (RRHH)</h2>
        <button className="btn-filled" onClick={fetchData}>🔄 Refrescar</button>
      </div>
      
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
        Asigna el personal disponible a las labores despachadas desde alertas satelitales o generadas manualmente.
      </p>

      {loading ? <p>Cargando labores...</p> : (
        <div className="labor-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {labores.map(labor => (
            <div key={labor.id_labor} className="labor-card" style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '15px', background: 'var(--bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span className="badge blue">{labor.categoria}</span>
                <span className={`badge ${labor.estado === 'Planificada' ? 'orange' : labor.estado === 'En Progreso' ? 'green' : 'gray'}`}>
                  {labor.estado}
                </span>
              </div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '15px' }}>{labor.descripcion_labor}</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>📍 {labor.lote_nombre || 'N/A'}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '15px' }}>📅 {new Date(labor.fecha_planificada).toLocaleDateString()}</p>
              
              {labor.estado === 'Planificada' || !labor.id_empleado ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Asignar Empleado:</label>
                  <Select 
                    placeholder="-- Buscar empleado --"
                    options={empleados.map(emp => ({ value: emp.id_empleado, label: `${emp.nombres} ${emp.apellidos} (${emp.cargo}) - ${emp.identificacion}` }))}
                    value={selectedEmployees[labor.id_labor] ? { value: selectedEmployees[labor.id_labor].value, label: selectedEmployees[labor.id_labor].label } : null}
                    onChange={(option) => setSelectedEmployees(prev => ({ ...prev, [labor.id_labor]: option }))}
                    styles={{
                      control: (base) => ({ ...base, background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text)' }),
                      menu: (base) => ({ ...base, background: 'var(--card-bg)', color: 'var(--text)' }),
                      option: (base, state) => ({ ...base, background: state.isFocused ? 'var(--primary-light)' : 'transparent', color: 'var(--text)' }),
                      singleValue: (base) => ({ ...base, color: 'var(--text)' })
                    }}
                  />
                  <button 
                    className="btn-outline" 
                    style={{ padding: '8px' }}
                    onClick={() => {
                      const sel = selectedEmployees[labor.id_labor];
                      if (sel) {
                        handleAsignar(labor.id_labor, sel.value);
                      } else {
                        showToast('⚠️ Seleccione un empleado primero.');
                      }
                    }}
                  >
                    ✔️ Asignar Labor
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(0,128,0,0.1)', borderRadius: '4px', border: '1px solid rgba(0,128,0,0.2)' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'green' }}>✓ Asignado a:</span>
                  <p style={{ margin: '5px 0 0 0', fontSize: '13px' }}>{labor.empleado_nombre}</p>
                </div>
              )}
            </div>
          ))}
        </div>
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

export default LaborBoard;
