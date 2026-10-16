import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function GeneradorNomina({ tenantId, fincaId }) {
  const [activeTab, setActiveTab] = useState('simulador');
  
  // Tab: Simulador
  const [ciclo, setCiclo] = useState('Semanal');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [preLiquidacion, setPreLiquidacion] = useState(null);
  const [loadingSim, setLoadingSim] = useState(false);
  const [generando, setGenerando] = useState(false);
  
  // Tab: Historial
  const [historial, setHistorial] = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [detallesModal, setDetallesModal] = useState(null);
  
  const [toast, setToast] = useState('');
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [generandoWhatsapp, setGenerandoWhatsapp] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // --- LOGICA SIMULADOR ---
  const handleSimular = async () => {
    if (!fechaInicio || !fechaFin) return showToast('⚠️ Ingresa fecha de inicio y fin.');
    try {
      setLoadingSim(true);
      const url = `/api/rrhh/pre-liquidacion?tenantId=${tenantId || 1}${fincaId ? '&fincaId='+fincaId : ''}&ciclo=${ciclo}&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
      const res = await axios.get(url);
      
      const data = Array.isArray(res.data) ? res.data : [];
      // Agregar campos para horas extras y otros bonos
      const newData = data.map(r => ({
        ...r, 
        horas_extras: 0,
        otros_bonos: 0,
        horas_extras_val: 0, // calculado
      }));
      setPreLiquidacion(newData);
    } catch (err) {
      console.error('Error calculando pre-liquidación:', err);
      showToast('❌ Error calculando pre-liquidación.');
    } finally {
      setLoadingSim(false);
    }
  };

  const recalcRow = (row) => {
    // Calculo básico de horas extras: (Salario Base / 240) * 1.25 * horas
    // Esto es un aproximado estándar para la simulación
    const valorHora = (row.salario_base / 240);
    row.horas_extras_val = Math.round(valorHora * 1.25 * row.horas_extras);
    
    row.total_devengos = row.total_devengos_original + row.horas_extras_val + row.otros_bonos;
    // Recalcular deducciones (8% del total devengado como simulación rápida)
    row.total_deducciones = Math.round(row.total_devengos * 0.08);
    row.neto_pagar = row.total_devengos - row.total_deducciones;
    return row;
  };

  const handleChangeRow = (id_empleado, field, value) => {
    const valNum = Number(value) || 0;
    setPreLiquidacion(prev => prev.map(row => {
      if (row.id_empleado === id_empleado) {
        if (!row.total_devengos_original) {
          row.total_devengos_original = row.total_devengos;
        }
        let newRow = { ...row, [field]: valNum };
        if (field === 'horas_extras' || field === 'otros_bonos') {
           newRow = recalcRow(newRow);
        } else {
           newRow.neto_pagar = newRow.total_devengos - newRow.total_deducciones;
        }
        return newRow;
      }
      return row;
    }));
  };

  const handleGenerar = async () => {
    if (!preLiquidacion || preLiquidacion.length === 0) return;
    try {
      setGenerando(true);
      const res = await axios.post(`/api/rrhh/generar`, {
        tenantId: tenantId || 1,
        fincaId,
        ciclo,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        detalles: preLiquidacion
      });
      showToast(`✅ ¡Nómina Generada Exitosamente! (Planilla #${res.data.id_planilla})`);
      setPreLiquidacion(null);
      // Refrescar historial
      fetchHistorial();
      setActiveTab('historial');
    } catch (err) {
      console.error(err);
      showToast('❌ Error al asentar la nómina.');
    } finally {
      setGenerando(false);
    }
  };

  // --- LOGICA HISTORIAL ---
  const fetchHistorial = async () => {
    try {
      setLoadingHist(true);
      const res = await axios.get(`/api/rrhh/historial-nominas?tenantId=${tenantId || 1}`);
      setHistorial(res.data || []);
    } catch (err) {
      console.error(err);
      showToast('❌ Error cargando historial.');
    } finally {
      setLoadingHist(false);
    }
  };

  const handleVerDetalles = async (idPlanilla) => {
    try {
      const res = await axios.get(`/api/rrhh/historial-nominas/${idPlanilla}/detalles`);
      setDetallesModal({ id: idPlanilla, data: res.data });
    } catch (err) {
      console.error(err);
      showToast('❌ Error cargando detalles.');
    }
  };

  const handleImprimirDesprendibles = async (idPlanilla) => {
    try {
      setGenerandoPdf(true);
      const res = await axios.get(`/api/rrhh/historial-nominas/${idPlanilla}/desprendibles-pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Desprendibles_Planilla_${idPlanilla}.pdf`);
      document.body.appendChild(link);
      link.click();
      showToast('✅ Desprendibles descargados.');
    } catch (err) {
      console.error(err);
      showToast('❌ Error descargando desprendibles.');
    } finally {
      setGenerandoPdf(false);
    }
  };

  const handleReporteBancario = async (idPlanilla) => {
    try {
      setGenerandoPdf(true);
      const res = await axios.get(`/api/rrhh/historial-nominas/${idPlanilla}/reporte-bancario-pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Reporte_Bancario_Planilla_${idPlanilla}.pdf`);
      document.body.appendChild(link);
      link.click();
      showToast('✅ Reporte Bancario descargado.');
    } catch (err) {
      console.error(err);
      showToast('❌ Error descargando reporte bancario.');
    } finally {
      setGenerandoPdf(false);
    }
  };

  const handleSabanaNomina = async (idPlanilla) => {
    try {
      setGenerandoPdf(true);
      const res = await axios.get(`/api/rrhh/historial-nominas/${idPlanilla}/planilla-maestra-pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Sabana_Nomina_Planilla_${idPlanilla}.pdf`);
      document.body.appendChild(link);
      link.click();
      showToast('✅ Sábana de Nómina descargada.');
    } catch (err) {
      console.error(err);
      showToast('❌ Error descargando sábana de nómina.');
    } finally {
      setGenerandoPdf(false);
    }
  };

  const handleEnviarWhatsapp = async (idPlanilla) => {
    try {
      setGenerandoWhatsapp(true);
      await axios.post(`/api/rrhh/historial-nominas/${idPlanilla}/whatsapp`);
      showToast('✅ Notificaciones enviadas por WhatsApp.');
    } catch (err) {
      console.error(err);
      showToast('❌ Error enviando WhatsApps.');
    } finally {
      setGenerandoWhatsapp(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'historial') {
      fetchHistorial();
    }
  }, [activeTab]);

  return (
    <div className="catalog-container">
      <div className="catalog-header" style={{ marginBottom: '0' }}>
        <h2>⚙️ Gestión Profesional de Nómina</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', padding: '0 20px', borderBottom: '1px solid var(--border)', marginBottom: '20px', background: 'var(--card-bg)' }}>
        <button 
          onClick={() => setActiveTab('simulador')}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'simulador' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'simulador' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
        >
          📝 Simulador / Generador
        </button>
        <button 
          onClick={() => setActiveTab('historial')}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'historial' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'historial' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
        >
          📚 Historial de Nóminas
        </button>
      </div>

      {/* --- TAB SIMULADOR --- */}
      {activeTab === 'simulador' && (
        <>
          <div className="catalog-toolbar" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '20px', padding: '20px', background: 'var(--card-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Ciclo de Liquidación</label>
              <select 
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)' }}
                value={ciclo}
                onChange={(e) => setCiclo(e.target.value)}
              >
                <option value="Semanal">Semanal (Jornaleros / Campo)</option>
                <option value="Quincenal">Quincenal (Administrativos)</option>
                <option value="Mensual">Mensual (Gerencia)</option>
                <option value="Contratos">Contratos / Avances de Obra</option>
                <option value="Liquidacion">Liquidación Definitiva (Retiro)</option>
              </select>
            </div>
            <div style={{ flex: '1', minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Fecha Inicio</label>
              <input 
                type="date" 
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)' }}
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div style={{ flex: '1', minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Fecha Fin</label>
              <input 
                type="date" 
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)' }}
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
            <div>
              <button 
                onClick={handleSimular}
                className="btn btn-primary"
                disabled={loadingSim}
              >
                {loadingSim ? 'Calculando...' : 'Simular Nómina'}
              </button>
            </div>
          </div>

          {preLiquidacion && (
            <div className="table-container" style={{ marginTop: '20px' }}>
              <div style={{ background: 'var(--primary)', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#fff' }}>Matriz Editable de Nómina</h3>
                <span style={{ fontSize: '13px', opacity: 0.9 }}>{preLiquidacion.length} Empleados calculados</span>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Documento</th>
                      <th>Empleado / Área</th>
                      <th style={{ textAlign: 'center' }}>Días</th>
                      <th style={{ textAlign: 'center' }}>Horas Extras</th>
                      <th style={{ textAlign: 'center' }}>Otros Bonos ($)</th>
                      <th style={{ textAlign: 'right' }}>Devengos ($)</th>
                      <th style={{ textAlign: 'right' }}>Deducciones ($)</th>
                      <th style={{ textAlign: 'right' }}>Neto a Pagar ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preLiquidacion.length === 0 && (
                      <tr>
                        <td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No se encontraron empleados activos para los filtros indicados.
                        </td>
                      </tr>
                    )}
                    {preLiquidacion.map(row => (
                      <tr key={row.id_empleado}>
                        <td style={{ fontFamily: 'monospace' }}>{row.documento}</td>
                        <td>
                          <strong>{row.nombre_completo}</strong>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.cargo_nombre || row.cargo || 'Sin Cargo'}</div>
                          {row.es_contrato && (
                            <span className="badge blue" style={{ fontSize: '10px', padding: '2px 6px', marginTop:'4px' }}>Por Contrato</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="number" 
                            value={row.dias_trabajados} 
                            onChange={(e) => handleChangeRow(row.id_empleado, 'dias_trabajados', e.target.value)}
                            style={{ width: '60px', padding: '6px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text)' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="number" 
                            value={row.horas_extras} 
                            onChange={(e) => handleChangeRow(row.id_empleado, 'horas_extras', e.target.value)}
                            placeholder="0"
                            style={{ width: '60px', padding: '6px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg)', color: 'var(--primary)', fontWeight: 'bold' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="number" 
                            value={row.otros_bonos} 
                            onChange={(e) => handleChangeRow(row.id_empleado, 'otros_bonos', e.target.value)}
                            placeholder="$0"
                            style={{ width: '90px', padding: '6px', textAlign: 'right', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg)', color: 'var(--success)', fontWeight: 'bold' }}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>
                          ${row.total_devengos.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--danger)' }}>
                          ${row.total_deducciones.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '16px', background: 'var(--bg-secondary)' }}>
                          ${row.neto_pagar.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '24px', alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Total a Pagar (Neto)</p>
                  <p style={{ fontSize: '26px', fontWeight: 'bold', margin: 0, color: 'var(--text)' }}>
                    ${preLiquidacion.reduce((acc, r) => acc + r.neto_pagar, 0).toLocaleString()}
                  </p>
                </div>
                <button 
                  onClick={handleGenerar}
                  disabled={generando || preLiquidacion.length === 0}
                  className="btn"
                  style={{ background: generando ? 'var(--text-secondary)' : 'var(--success)', color: '#fff', padding: '14px 28px', fontSize: '16px', fontWeight: 'bold', borderRadius: 'var(--radius)' }}
                >
                  {generando ? 'Guardando...' : 'Guardar y Generar Nómina Definitiva'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* --- TAB HISTORIAL --- */}
      {activeTab === 'historial' && (
        <div style={{ padding: '0 20px' }}>
          {loadingHist ? (
            <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Cargando historial...</p>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID Planilla</th>
                    <th>Ciclo</th>
                    <th>Período</th>
                    <th>Finca</th>
                    <th style={{ textAlign: 'right' }}>Devengos</th>
                    <th style={{ textAlign: 'right' }}>Deducciones</th>
                    <th style={{ textAlign: 'right' }}>Neto Pagado</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                        No hay nóminas generadas históricamente en este tenant.
                      </td>
                    </tr>
                  ) : historial.map(h => (
                    <tr key={h.id_planilla}>
                      <td><strong>#{h.id_planilla}</strong></td>
                      <td>
                         <span className="badge" style={{ background: h.ciclo === 'Semanal' ? 'var(--warning-light)' : 'var(--info-light)', color: h.ciclo === 'Semanal' ? 'var(--warning)' : 'var(--info)' }}>
                           {h.ciclo}
                         </span>
                      </td>
                      <td>{h.fecha_inicio.substring(0, 10)} / {h.fecha_fin.substring(0, 10)}</td>
                      <td>{h.finca_nombre || 'Todas'}</td>
                      <td style={{ textAlign: 'right', color: 'var(--success)' }}>${Number(h.total_devengado).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: 'var(--danger)' }}>${Number(h.total_deducido).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '15px' }}>${Number(h.total_neto).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${h.estado === 'Aprobada' ? 'green' : h.estado === 'Contabilizada' ? 'purple' : 'gray'}`}>
                          {h.estado || 'Cerrada'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm" onClick={() => handleVerDetalles(h.id_planilla)}>
                          Ver Detalles
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Detalles */}
      {detallesModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--card-bg)', width: '90%', maxWidth: '1000px', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '20px', background: 'var(--primary)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Desglose de Nómina #{detallesModal.id}</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => handleImprimirDesprendibles(detallesModal.id)}
                  disabled={generandoPdf}
                  className="btn" style={{ background: 'var(--bg-card)', color: 'var(--primary)', fontWeight: 'bold' }}
                >
                  {generandoPdf ? 'Generando...' : '🖨️ Desprendibles PDF'}
                </button>
                <button 
                  onClick={() => handleSabanaNomina(detallesModal.id)}
                  disabled={generandoPdf}
                  className="btn" style={{ background: 'var(--bg-card)', color: 'var(--primary)', fontWeight: 'bold' }}
                >
                  {generandoPdf ? 'Generando...' : '📊 Sábana Maestra PDF'}
                </button>
                <button 
                  onClick={() => handleReporteBancario(detallesModal.id)}
                  disabled={generandoPdf}
                  className="btn" style={{ background: 'var(--bg-card)', color: 'var(--primary)', fontWeight: 'bold' }}
                >
                  {generandoPdf ? 'Generando...' : '🏦 Autorización Bancaria PDF'}
                </button>
                <button 
                  onClick={() => handleEnviarWhatsapp(detallesModal.id)}
                  disabled={generandoWhatsapp}
                  className="btn" style={{ background: '#25D366', color: '#fff', fontWeight: 'bold', border: 'none' }}
                >
                  {generandoWhatsapp ? 'Enviando...' : '📱 Enviar WhatsApp'}
                </button>
                <button onClick={() => setDetallesModal(null)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', marginLeft: '10px' }}>✖</button>
              </div>
            </div>
            <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Empleado</th>
                    <th style={{ textAlign: 'center' }}>Días</th>
                    <th style={{ textAlign: 'right' }}>Salario Base</th>
                    <th style={{ textAlign: 'right' }}>Devengos</th>
                    <th style={{ textAlign: 'right' }}>Deducciones</th>
                    <th style={{ textAlign: 'right' }}>Neto Pagado</th>
                  </tr>
                </thead>
                <tbody>
                  {detallesModal.data.map(d => (
                    <tr key={d.id_detalle}>
                      <td style={{ fontFamily: 'monospace' }}>{d.documento}</td>
                      <td>{d.nombre_completo}</td>
                      <td style={{ textAlign: 'center' }}>{d.dias_trabajados}</td>
                      <td style={{ textAlign: 'right' }}>${Number(d.salario_base).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: 'var(--success)' }}>${Number(d.total_devengos).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: 'var(--danger)' }}>${Number(d.total_deducciones).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>${Number(d.neto_pagar).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid var(--border)', textAlign: 'right', background: 'var(--bg-secondary)' }}>
              <button className="btn" onClick={() => setDetallesModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: 'var(--text)', color: 'var(--bg)', padding: '12px 24px', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', fontWeight: 'bold', zIndex: 1000 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
