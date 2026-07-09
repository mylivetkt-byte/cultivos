import React, { useState, useEffect } from 'react';
import { fetchTableData } from '../utils/api';
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons';

const API_BASE = 'http://localhost:3002/api';

function CentralVerificacion({ tenantId }) {
  const [labores, setLabores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/labores/verificacion_diaria?tenantId=${tenantId}&date=${date}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error loading verification data');
        const data = await res.json();
        setLabores(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tenantId, date]);

  const handleEvaluate = async (laborId, estado) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/labores/${laborId}/evaluar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ estado, observaciones: 'Evaluado por el Centro de Verificación', evaluador: 'Jefe de Área' })
      });
      if (!res.ok) throw new Error('Error evaluating');
      
      setLabores(prev => prev.map(l => l.id_labor === laborId ? { ...l, estado } : l));
    } catch (err) {
      alert('Error evaluando labor: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Centro de Verificación de Labores y Nómina</h2>
        <input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)} 
          className="form-control"
          style={{ width: '200px' }}
        />
      </div>

      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '20px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
      }}>
        {loading ? <p>Cargando labores del día...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '10px' }}>Labor</th>
                <th style={{ padding: '10px' }}>Categoría</th>
                <th style={{ padding: '10px' }}>Operario Asignado</th>
                <th style={{ padding: '10px' }}>Asistencia / Nómina</th>
                <th style={{ padding: '10px' }}>Estado Labor</th>
                <th style={{ padding: '10px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {labores.map(l => {
                const isAbsent = l.id_empleado && !l.hora_entrada;
                return (
                  <tr key={l.id_labor} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px' }}>{l.descripcion_labor}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                        {l.categoria}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      {l.id_empleado ? `${l.empleado_nombres} ${l.empleado_apellidos}` : <span style={{ color: '#94a3b8' }}>Sin asignar</span>}
                      {l.cargo && <div style={{ fontSize: '11px', color: '#64748b' }}>{l.cargo}</div>}
                    </td>
                    <td style={{ padding: '10px' }}>
                      {l.id_empleado ? (
                        isAbsent ? (
                          <div style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <WarningOutlined /> <strong>AUSENTE</strong>
                          </div>
                        ) : (
                          <div style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <CheckCircleOutlined /> Presente ({l.hora_entrada})
                          </div>
                        )
                      ) : '-'}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ 
                        color: l.estado === 'Completada' ? '#059669' : l.estado === 'Incumplida' ? '#dc2626' : '#f59e0b',
                        fontWeight: 'bold'
                      }}>
                        {l.estado}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '4px 8px', fontSize: '12px', marginRight: '5px', opacity: isAbsent ? 0.5 : 1 }}
                        disabled={isAbsent}
                        onClick={() => handleEvaluate(l.id_labor, 'Completada')}
                      >
                        ✓ Cumplió
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '4px 8px', fontSize: '12px', borderColor: '#dc2626', color: '#dc2626' }}
                        onClick={() => handleEvaluate(l.id_labor, 'Incumplida')}
                      >
                        ✕ No Cumplió
                      </button>
                    </td>
                  </tr>
                );
              })}
              {labores.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                    No hay labores registradas para esta fecha.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default CentralVerificacion;
