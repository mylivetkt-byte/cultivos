import React, { useState, useEffect } from 'react';
import { fetchTableData, fetchFKLookup } from '../../utils/api';

function CalendarioZoosanitario({ fincaId }) {
  const [vacunaciones, setVacunaciones] = useState([]);
  const [animalesMap, setAnimalesMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Load data from ganado_vacunacion
        const result = await fetchTableData('ganado_vacunacion', { page: 1, pageSize: 100 });
        const vacData = result.data || [];
        setVacunaciones(vacData);

        // Load animal names for FK
        try {
          const fkResult = await fetchFKLookup('ganado_vacunacion', 'id_animal');
          if (fkResult && fkResult.options) {
            const map = {};
            fkResult.options.forEach(opt => {
              map[opt.id] = opt.display || opt.label;
            });
            setAnimalesMap(map);
          }
        } catch (e) {
          console.error("Could not load FK lookup for id_animal", e);
        }

      } catch (error) {
        console.error("Error loading vaccination data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getDaysLeft = (dateString) => {
    if (!dateString) return null;
    const diffTime = new Date(dateString).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const proximas = vacunaciones.filter(v => {
    if (!v.proxima_fecha) return false;
    const days = getDaysLeft(v.proxima_fecha);
    return days !== null && days >= 0 && days <= 60; // Next 60 days
  }).sort((a, b) => new Date(a.proxima_fecha) - new Date(b.proxima_fecha));

  const countVacunadosAftosa = vacunaciones.filter(v => v.tipo_vacuna && v.tipo_vacuna.toLowerCase().includes('aftosa')).length;

  return (
    <div className="p-4 dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>💉 Calendario Zoosanitario (ICA Colombia)</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '5px 0 0 0' }}>Cumplimiento Legal y Programación de Ciclos de Vacunación</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* AFTOSA Y BRUCELOSIS */}
        <div className="card" style={{ padding: '20px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#e11d48', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🔴</span> Fiebre Aftosa
            </h3>
            <span style={{ background: '#e11d48', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>ALERTA ROJA ICA</span>
          </div>
          
          <div style={{ background: 'white', padding: '10px', borderRadius: '4px', border: '1px solid #fecdd3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
              <span>Dosis aplicadas registradas</span>
              <span style={{ fontWeight: 'bold', color: '#10b981' }}>{countVacunadosAftosa}</span>
            </div>
            <p style={{ fontSize: '11px', color: '#881337', textAlign: 'right', margin: '15px 0 0 0' }}>Sujeto a Ciclo Nacional</p>
          </div>
        </div>

        {/* BRUCELOSIS */}
        <div className="card" style={{ padding: '20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🟢</span> Brucelosis Bovina
            </h3>
            <span style={{ background: '#10b981', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>AL DÍA</span>
          </div>
          
          <div style={{ background: 'white', padding: '10px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#166534' }}>Registros de hembras de 3 a 9 meses de edad se pueden administrar desde Catálogos &gt; Ganado Vacunacion.</p>
          </div>
        </div>

      </div>

      <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <h3 style={{ marginTop: 0, color: 'var(--text)' }}>📋 Próximas Vacunaciones (Próximos 60 Días)</h3>
        {loading ? (
           <p>Cargando datos...</p>
        ) : proximas.length === 0 ? (
           <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No hay vacunaciones programadas para los próximos 60 días.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginTop: '15px' }}>
            <thead>
              <tr style={{ background: 'var(--border)', color: 'var(--text)' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Animal</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Tipo (Enfermedad)</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Dosis / Producto</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Fecha Límite</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Veterinario Asignado</th>
              </tr>
            </thead>
            <tbody>
              {proximas.map(v => {
                 const animalName = animalesMap[v.id_animal] || `Animal ID: ${v.id_animal}`;
                 const days = getDaysLeft(v.proxima_fecha);
                 const dateColor = days <= 7 ? '#ef4444' : days <= 15 ? '#f59e0b' : 'inherit';
                 
                 return (
                  <tr key={v.id_vacunacion} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px', color: 'var(--text)' }}>{animalName}</td>
                    <td style={{ padding: '10px' }}>{v.tipo_vacuna}</td>
                    <td style={{ padding: '10px' }}>{v.dosis}</td>
                    <td style={{ padding: '10px', textAlign: 'center', color: dateColor, fontWeight: days <= 7 ? 'bold' : 'normal' }}>
                      {new Date(v.proxima_fecha).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{v.veterinario || 'N/A'}</td>
                  </tr>
                 );
              })}
            </tbody>
          </table>
        )}
      </div>
      
      <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <h3 style={{ marginTop: 0, color: 'var(--text)' }}>📋 Historial Reciente de Vacunaciones</h3>
        {loading ? (
           <p>Cargando datos...</p>
        ) : vacunaciones.length === 0 ? (
           <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No hay vacunaciones registradas en la base de datos.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginTop: '15px' }}>
            <thead>
              <tr style={{ background: 'var(--border)', color: 'var(--text)' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Animal</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Tipo (Enfermedad)</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Fecha Aplicación</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Dosis / Producto</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Veterinario Asignado</th>
              </tr>
            </thead>
            <tbody>
              {vacunaciones.slice(0, 10).map(v => {
                 const animalName = animalesMap[v.id_animal] || `Animal ID: ${v.id_animal}`;
                 return (
                  <tr key={v.id_vacunacion} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px', color: 'var(--text)' }}>{animalName}</td>
                    <td style={{ padding: '10px' }}>{v.tipo_vacuna}</td>
                    <td style={{ padding: '10px' }}>{new Date(v.fecha).toLocaleDateString()}</td>
                    <td style={{ padding: '10px' }}>{v.dosis}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{v.veterinario || 'N/A'}</td>
                  </tr>
                 );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default CalendarioZoosanitario;
