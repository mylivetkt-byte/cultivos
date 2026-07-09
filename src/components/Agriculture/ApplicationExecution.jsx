import React, { useState, useEffect } from 'react';
import PremiumSelect from '../PremiumSelect';
import { authFetch } from '../../utils/api.js';
import '../dashboard.css';

const ApplicationExecution = () => {
  const [schedules, setSchedules] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProg, setSelectedProg] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    lote: '',
    empleado: '',
    fecha_desde: '',
    fecha_hasta: ''
  });

  // Form State
  const [responsableBodega, setResponsableBodega] = useState('');
  const [responsableMezcla, setResponsableMezcla] = useState('');
  const [realInsumos, setRealInsumos] = useState([]);
  const [envases, setEnvases] = useState([]);
  const [mantenimientoNotas, setMantenimientoNotas] = useState('');
  
  // Clima
  const [clima, setClima] = useState({
    temperatura: '',
    viento: '',
    humedad: ''
  });

  // Two stage mix
  const [mezclaTotalRecibida, setMezclaTotalRecibida] = useState(0);
  const [mezclaTotalAplicada, setMezclaTotalAplicada] = useState(0);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [resProg, resLote, resEmp] = await Promise.all([
        authFetch('/api/applications/schedule'),
        authFetch('/api/table/lotes/data?tenantId=1'),
        authFetch('/api/table/rrhh_empleados/data?tenantId=1')
      ]);
      
      if (resProg.ok) {
        const data = await resProg.json();
        setSchedules(data.filter(s => s.estado === 'Programada' || s.estado === 'En Proceso'));
      }
      if (resLote.ok) {
        const lData = await resLote.json();
        setLotes(lData.data || []);
      }
      if (resEmp.ok) {
        const eData = await resEmp.json();
        setEmpleados(eData.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = () => {
    let result = schedules;
    if (filters.lote) result = result.filter(s => (s.lote_nombre || '').toLowerCase().includes(filters.lote.toLowerCase()));
    if (filters.empleado) result = result.filter(s => (s.responsable_aplicacion || '').toLowerCase().includes(filters.empleado.toLowerCase()));
    if (filters.fecha_desde) result = result.filter(s => new Date(s.fecha_programada) >= new Date(filters.fecha_desde));
    if (filters.fecha_hasta) result = result.filter(s => new Date(s.fecha_programada) <= new Date(filters.fecha_hasta));
    setFiltered(result);
  };

  const handleSelect = (prog) => {
    setSelectedProg(prog);
    setRealInsumos(prog.insumos.map(i => ({
      id_insumo: i.id_insumo,
      insumo_nombre: i.insumo_nombre,
      cantidad_proyectada: parseFloat(i.cantidad_proyectada),
      cantidad_recibida_puro: parseFloat(i.cantidad_proyectada), 
      cantidad_real_aplicada: parseFloat(i.cantidad_proyectada), 
      costo_total: 0
    })));
    setEnvases(prog.insumos.filter(i => i.es_nocivo).map(i => ({
      id_insumo: i.id_insumo,
      insumo_nombre: i.insumo_nombre,
      cantidad_envases_vacios: 0,
      lavado_triple_realizado: false,
      entregado_centro_acopio: false
    })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const sobrante = mezclaTotalRecibida - mezclaTotalAplicada;
      const notasFinales = `
        === AUDITORÍA DE INSUMOS ===
        Entregó Insumo Puro: ${responsableBodega}
        Preparó Mezcla: ${responsableMezcla}
        Mezcla Preparada: ${mezclaTotalRecibida} Lts
        Mezcla Aplicada: ${mezclaTotalAplicada} Lts
        Sobrante de Mezcla (Inventario Virtual): ${sobrante} Lts
        
        === CONDICIONES CLIMÁTICAS ===
        Temperatura: ${clima.temperatura || 'N/A'} °C
        Velocidad Viento: ${clima.viento || 'N/A'} km/h
        Humedad Relativa: ${clima.humedad || 'N/A'} %
        
        === BITÁCORA EQUIPOS ===
        Notas Mantenimiento: ${mantenimientoNotas}
      `;

      const payload = {
        insumos_aplicados: realInsumos.map(ri => ({
          id_insumo: ri.id_insumo,
          // Calculate the applied amount proportional to the mix applied
          cantidad_real_aplicada: mezclaTotalRecibida > 0 ? (ri.cantidad_recibida_puro * (mezclaTotalAplicada / mezclaTotalRecibida)).toFixed(2) : ri.cantidad_real_aplicada,
          costo_total: 0 // If we had cost calculation here
        })),
        envases: envases,
        mantenimiento_notas: notasFinales
      };

      const res = await authFetch(`/api/applications/complete/${selectedProg.id_programacion}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSelectedProg(null);
        fetchInitialData();
        alert("Aplicación ejecutada y Kárdex actualizado con éxito.");
      } else {
        alert("Error al guardar.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Cargando Programaciones Activas...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Ejecución en Campo (Check-in de Aplicación)</h1>
        <p style={{ color: 'var(--text-muted)' }}>Auditoría de Insumos: Bodega → Mezcla → Aplicación</p>
      </div>

      {!selectedProg ? (
        <>
          <div className="card" style={{ marginBottom: '25px', padding: '0', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2em' }}>🔍</span>
              <h4 style={{ margin: 0, color: '#60A5FA' }}>Buscador Maestro de Ejecución en Campo</h4>
            </div>
            
            <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', background: 'rgba(0,0,0,0.15)' }}>
              <div>
                <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Lote / Potrero</label>
                <PremiumSelect
                  options={lotes.map(l => ({ value: l.nombre, label: l.nombre }))}
                  value={filters.lote}
                  onChange={e => setFilters({...filters, lote: e.target.value})}
                  placeholder="-- Todos los Lotes --"
                />
              </div>
              <div>
                <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Responsable de Aplicar</label>
                <PremiumSelect
                  options={empleados.map(e => ({ value: e.nombres, label: e.nombres }))}
                  value={filters.empleado}
                  onChange={e => setFilters({...filters, empleado: e.target.value})}
                  placeholder="-- Todos los Empleados --"
                />
              </div>
              <div>
                <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Fecha Programada Desde</label>
                <input type="date" className="form-control" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px', fontSize: '1rem', borderRadius: '6px' }} value={filters.fecha_desde} onChange={e => setFilters({...filters, fecha_desde: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '0.95em', fontWeight: 'bold', color: '#fff', marginBottom: '8px', display: 'block' }}>Fecha Programada Hasta</label>
                <input type="date" className="form-control" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px', fontSize: '1rem', borderRadius: '6px' }} value={filters.fecha_hasta} onChange={e => setFilters({...filters, fecha_hasta: e.target.value})} />
              </div>
            </div>
            
            <div style={{ padding: '15px 20px', background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleProcess} style={{ padding: '10px 25px', fontSize: '1.05em', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                ⚙️ Procesar Consulta
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID Prog.</th>
                  <th>Fecha</th>
                  <th>Finca / Lote</th>
                  <th>Método</th>
                  <th>Responsable</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      Presione 'Procesar Consulta' para ver programaciones activas o ajuste sus filtros.
                    </td>
                  </tr>
                ) : (
                  filtered.map(s => (
                    <tr key={s.id_programacion} style={{ cursor: 'pointer' }}>
                      <td onClick={() => handleSelect(s)}><strong>PROG-{s.id_programacion}</strong></td>
                      <td onClick={() => handleSelect(s)}>{new Date(s.fecha_programada).toLocaleDateString()}</td>
                      <td onClick={() => handleSelect(s)}>{s.finca_nombre} - {s.lote_nombre}</td>
                      <td onClick={() => handleSelect(s)}>{s.metodo_aplicacion}</td>
                      <td onClick={() => handleSelect(s)}>{s.responsable_aplicacion}</td>
                      <td>
                        <button className="btn btn-primary" onClick={() => handleSelect(s)} style={{ padding: '5px 15px', fontSize: '0.85em' }}>
                          Comenzar Ejecución
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: 'var(--primary)', margin: 0 }}>Ejecución PROG-{selectedProg.id_programacion}</h2>
            <button className="btn btn-outline" onClick={() => setSelectedProg(null)}>Volver</button>
          </div>

          <form onSubmit={handleSubmit}>
            
            {/* ETAPA A: BODEGA Y MEZCLAS */}
            <h4 style={{ color: '#F59E0B', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>Etapa A: Salida de Bodega y Preparación de Mezcla</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label>Responsable de Entrega (Bodeguero)</label>
                <input type="text" className="form-control" required placeholder="Quién entregó el puro" value={responsableBodega} onChange={e => setResponsableBodega(e.target.value)} />
              </div>
              <div>
                <label>Responsable de Mezcla</label>
                <input type="text" className="form-control" required placeholder="Quién preparó" value={responsableMezcla} onChange={e => setResponsableMezcla(e.target.value)} />
              </div>
            </div>

            <table className="data-table">
              <thead><tr><th>Insumo</th><th>Requerido (Puro)</th><th>Entregado (Puro)</th></tr></thead>
              <tbody>
                {realInsumos.map((ri, idx) => (
                  <tr key={idx}>
                    <td>{ri.insumo_nombre}</td>
                    <td>{ri.cantidad_proyectada}</td>
                    <td>
                      <input 
                        type="number" step="0.01" style={{ width: '100px', padding: '4px' }}
                        value={ri.cantidad_recibida_puro} 
                        onChange={e => {
                          const newRI = [...realInsumos];
                          newRI[idx].cantidad_recibida_puro = parseFloat(e.target.value);
                          setRealInsumos(newRI);
                        }} 
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ETAPA B: APLICACION EN CAMPO */}
            <h4 style={{ color: '#10B981', borderBottom: '1px solid var(--border)', paddingBottom: '5px', marginTop: '30px' }}>Etapa B: Aplicación en Campo</h4>
            
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid var(--border)' }}>
              <h5 style={{ margin: '0 0 10px 0', color: 'var(--primary-light)' }}>1. Condiciones Climáticas (Obligatorio para Auditoría ICA)</h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                <div>
                  <label>Temperatura (°C)</label>
                  <input type="number" step="0.1" required className="form-control" placeholder="Ej. 24.5" value={clima.temperatura} onChange={e => setClima({...clima, temperatura: e.target.value})} />
                </div>
                <div>
                  <label>Viento (km/h)</label>
                  <input type="number" step="0.1" required className="form-control" placeholder="Ej. 12" value={clima.viento} onChange={e => setClima({...clima, viento: e.target.value})} />
                </div>
                <div>
                  <label>Humedad (%)</label>
                  <input type="number" step="0.1" required className="form-control" placeholder="Ej. 85" value={clima.humedad} onChange={e => setClima({...clima, humedad: e.target.value})} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px', background: 'rgba(16,185,129,0.05)', padding: '15px', borderRadius: '8px' }}>
              <div>
                <label>Volumen Total de Mezcla Preparada (Lts)</label>
                <input type="number" step="0.1" required className="form-control" value={mezclaTotalRecibida} onChange={e => setMezclaTotalRecibida(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label>Volumen Total Aplicado en Lote (Lts)</label>
                <input type="number" step="0.1" required className="form-control" value={mezclaTotalAplicada} onChange={e => setMezclaTotalAplicada(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label>Sobrante de Mezcla (Inventario)</label>
                <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: (mezclaTotalRecibida - mezclaTotalAplicada) > 0 ? '#F59E0B' : '#10B981' }}>
                  {(mezclaTotalRecibida - mezclaTotalAplicada).toFixed(1)} Lts
                </div>
              </div>
            </div>

            {/* BPA */}
            {envases.length > 0 && (
              <>
                <h4 style={{ color: '#EF4444', borderBottom: '1px solid var(--border)', paddingBottom: '5px', marginTop: '30px' }}>Control BPA (Envases Peligrosos)</h4>
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '15px', borderRadius: '8px' }}>
                  {envases.map((e, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', alignItems: 'center', marginBottom: '10px' }}>
                      <strong>{e.insumo_nombre}</strong>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85em' }}>Envases Vacíos Generados</label>
                        <input 
                          type="number" style={{ width: '80px', padding: '4px' }}
                          value={e.cantidad_envases_vacios}
                          onChange={ev => {
                            const newE = [...envases];
                            newE[idx].cantidad_envases_vacios = parseInt(ev.target.value);
                            setEnvases(newE);
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85em' }}>
                          <input type="checkbox" checked={e.lavado_triple_realizado} onChange={ev => {
                            const newE = [...envases]; newE[idx].lavado_triple_realizado = ev.target.checked; setEnvases(newE);
                          }}/> Triple Lavado + Perforado
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85em' }}>
                          <input type="checkbox" checked={e.entregado_centro_acopio} onChange={ev => {
                            const newE = [...envases]; newE[idx].entregado_centro_acopio = ev.target.checked; setEnvases(newE);
                          }}/> Entregado a Acopio
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <h4 style={{ color: '#3B82F6', borderBottom: '1px solid var(--border)', paddingBottom: '5px', marginTop: '30px' }}>Bitácora de Equipos (Mantenimiento)</h4>
            <div className="form-group full-width">
              <label>Novedades de la Máquina / Tractor / Dron durante la labor:</label>
              <textarea 
                rows="3" 
                placeholder="Ej. La bomba presentó fugas, limpieza de boquillas realizada..."
                value={mantenimientoNotas}
                onChange={e => setMantenimientoNotas(e.target.value)}
              />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 25px', fontSize: '1.1em' }} disabled={submitting}>
                {submitting ? 'Guardando...' : 'Finalizar Aplicación (Egreso de Bodega)'}
              </button>
            </div>

          </form>
        </div>
      )}
    </div>
  );
};

export default ApplicationExecution;
