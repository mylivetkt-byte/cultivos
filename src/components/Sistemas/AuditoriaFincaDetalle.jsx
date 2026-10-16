import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, FileText, Download, Building, Users, Leaf, Fish, Calculator, CheckCircle2, XCircle } from 'lucide-react';
import { fetchApi } from '../../utils/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CFF', '#FF66B2'];

const AuditoriaFincaDetalle = () => {
  const [fincas, setFincas] = useState([]);
  const [selectedFinca, setSelectedFinca] = useState('');
  const [fechaInicio, setFechaInicio] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // API_BASE ya incluye '/api', por lo que solo mandamos el path final
    fetchApi('/sistemas/dashboard-finca-auditoria/fincas')
      .then(data => {
        if (Array.isArray(data)) setFincas(data);
      })
      .catch(err => {
        console.error('Error fetching fincas:', err);
        setError('No se pudieron cargar las fincas disponibles.');
      });
  }, []);

  const handleProcesar = async () => {
    if (!selectedFinca || !fechaInicio || !fechaFin) {
      setError('Por favor, selecciona una Finca y el rango de fechas.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const json = await fetchApi('/sistemas/dashboard-finca-auditoria', {
        method: 'POST',
        body: JSON.stringify({ id_finca: selectedFinca, fechaInicio, fechaFin })
      });
      setData(json);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error de conexión con el servidor.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // ESTILOS INLINE (MÁS PREMIUM Y MODERNOS - MODO OSCURO)
  const containerStyle = {
    padding: '30px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    color: 'var(--text-primary)'
  };

  const cardStyle = {
    background: 'var(--bg-card)',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
    marginBottom: '24px'
  };

  const headerPanelStyle = {
    padding: '20px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    alignItems: 'flex-end',
    background: 'rgba(255,255,255,0.02)',
    borderBottom: '1px solid var(--border-color)',
    borderLeft: '5px solid var(--primary)'
  };

  const inputGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  };

  const labelStyle = {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const inputStyle = {
    height: '42px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    padding: '0 14px',
    fontSize: '14px',
    outline: 'none',
    minWidth: '180px',
    transition: 'border-color 0.2s',
    background: 'var(--bg)',
    color: 'var(--text-primary)'
  };

  const btnStyle = {
    height: '42px',
    padding: '0 24px',
    background: 'var(--primary)',
    color: 'var(--text-primary)',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  };

  const sectionHeaderStyle = (bgColor, textColor) => ({
    padding: '16px 24px',
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--text-primary)',
    fontSize: '18px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: '1px solid var(--border-color)'
  });

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  };

  const thStyle = {
    padding: '16px 24px',
    background: 'rgba(0,0,0,0.2)',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    fontSize: '13px',
    borderBottom: '2px solid var(--border-color)'
  };

  const tdStyle = {
    padding: '16px 24px',
    borderBottom: '1px solid var(--border-color)',
    fontSize: '14px',
    color: 'var(--text-primary)'
  };

  const statBoxStyle = (borderColor, bgColor, textColor) => ({
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    background: 'rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  });

  return (
    <div style={containerStyle} id="dashboard-finca-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle color="#2563eb" size={32} />
            Auditoría Operativa por Finca
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0 0', fontSize: '15px' }}>
            Vista detallada para inspectores y gerencia general
          </p>
        </div>
      </div>

      {/* Panel de Filtros */}
      <div style={cardStyle}>
        <div style={headerPanelStyle}>
          <div style={{ ...inputGroupStyle, flex: 1, minWidth: '220px' }}>
            <label style={labelStyle}>Finca a Auditar</label>
            <select style={inputStyle} value={selectedFinca} onChange={e => setSelectedFinca(e.target.value)}>
              <option value="">Seleccione una finca...</option>
              {fincas.map(f => (
                <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>
              ))}
            </select>
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Desde</label>
            <input type="date" style={inputStyle} value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
          </div>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Hasta</label>
            <input type="date" style={inputStyle} value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
          </div>
          <button className="btn-action-base btn-procesar" onClick={handleProcesar}>
            {loading ? 'Procesando Data...' : 'Procesar Auditoría'}
          </button>
          
          {data && (
            <button 
              onClick={handlePrint} 
              style={{ ...btnStyle, background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', boxShadow: 'none' }}
            >
              <Download size={18} /> Exportar / Imprimir
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '16px', color: '#b91c1c', borderRadius: '6px', marginBottom: '24px', fontWeight: '500' }}>
          {error}
        </div>
      )}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header de la Hoja */}
          <div style={{ ...cardStyle, background: 'var(--bg-card)', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '24px', margin: 0, color: 'var(--text-primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building size={28} /> {data.finca?.nombre || 'Finca Desconocida'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '8px' }}>
                Hectáreas Totales Auditables: <strong>{data.finca?.hectareas_totales || 'N/A'} Ha</strong>
              </p>
            </div>
            <div style={{ background: '#eff6ff', padding: '16px 24px', borderRadius: '8px', textAlign: 'right' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 'bold', margin: '0 0 6px 0', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                <Users size={16}/> Mayordomo / Administrador
              </p>
              {data.mayordomo ? (
                <>
                  <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {data.mayordomo.nombres} {data.mayordomo.apellidos}
                  </p>
                  <p style={{ margin: '4px 0 0 0', color: '#2563eb', fontWeight: '600' }}>
                    {data.mayordomo.telefono || 'Sin teléfono registrado'}
                  </p>
                </>
              ) : (
                <p style={{ margin: 0, fontStyle: 'italic', color: '#94a3b8' }}>No asignado</p>
              )}
            </div>
          </div>

          {/* Sección Agricultura */}
          <div style={cardStyle}>
            <div style={sectionHeaderStyle('#f0fdf4', '#166534')}>
              <Leaf size={24} /> 1. Expediente Agrícola (Lotes y Tratamientos Fitosanitarios)
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Lote / Sector</th>
                    <th style={thStyle}>Ha</th>
                    <th style={thStyle}>Estado Lote</th>
                    <th style={thStyle}>Cultivo Activo</th>
                    <th style={thStyle}>Próx. Cosecha Est.</th>
                    <th style={thStyle}>Aplicaciones Registradas (Periodo)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agricultura.lotes.map((l, i) => {
                    const lTratamientos = data.agricultura.tratamientos.filter(t => t.id_lote === l.id_lote);
                    return (
                      <tr key={l.id_lote} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>{l.nombre}</td>
                        <td style={tdStyle}>{l.hectareas}</td>
                        <td style={tdStyle}>
                          <span style={{ 
                            padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                            background: l.estado === 'Activo' ? '#dcfce7' : (l.estado?.includes('Mantenimiento') ? '#fef3c7' : '#f1f5f9'),
                            color: l.estado === 'Activo' ? '#166534' : (l.estado?.includes('Mantenimiento') ? '#92400e' : '#475569')
                          }}>
                            {l.estado || 'N/A'}
                          </span>
                        </td>
                        <td style={tdStyle}>{l.cultivo || '-'}</td>
                        <td style={tdStyle}>{l.proxima_cosecha ? new Date(l.proxima_cosecha).toLocaleDateString() : '-'}</td>
                        <td style={tdStyle}>
                          {lTratamientos.length > 0 ? (
                            <ul style={{ paddingLeft: '16px', margin: 0, color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                              {lTratamientos.map((t, idx) => (
                                <li key={idx}>
                                  <strong>{t.producto_comercial}</strong> <span style={{ color: '#94a3b8' }}>({t.enfermedad || 'Prevención'})</span> - {new Date(t.fecha_creacion).toLocaleDateString()}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>Sin aplicaciones reportadas</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {data.agricultura.lotes.length === 0 && (
                    <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No hay lotes registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sección Ganadera */}
          <div style={cardStyle}>
            <div style={sectionHeaderStyle('#fff7ed', '#9a3412')}>
              <span style={{ fontSize: '24px' }}>🐄</span> 2. Demografía y Control Ganadero
            </div>
            <div style={{ padding: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
              <div>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text-primary)', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                  Distribución Censal por Razas
                </h3>
                {data.ganaderia.razas.length > 0 ? (
                  <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.ganaderia.razas} dataKey="cantidad" nameKey="raza" cx="50%" cy="50%" outerRadius={100} label>
                          {data.ganaderia.razas.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: '#94a3b8', padding: '50px 0', fontStyle: 'italic' }}>No hay ganado en esta finca</p>
                )}
              </div>
              
              <div>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text-primary)', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                  Categorización Auditada
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={statBoxStyle('#e2e8f0', '#f8fafc', '#334155')}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Toros (Machos &gt;1 año)</span>
                    <span style={{ fontSize: '36px', fontWeight: '900', color: 'var(--text-primary)' }}>{data.ganaderia.demografia.toros || 0}</span>
                  </div>
                  <div style={statBoxStyle('#e2e8f0', '#f8fafc', '#334155')}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Hembras (&gt;1 año)</span>
                    <span style={{ fontSize: '36px', fontWeight: '900', color: 'var(--text-primary)' }}>{data.ganaderia.demografia.hembras || 0}</span>
                  </div>
                  <div style={{ ...statBoxStyle('#e2e8f0', '#f8fafc', '#334155'), gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Terneros (≤1 año)</span>
                    <span style={{ fontSize: '36px', fontWeight: '900', color: 'var(--text-primary)' }}>{data.ganaderia.demografia.terneros || 0}</span>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                  <div style={statBoxStyle('#fce7f3', '#fdf2f8', '#be185d')}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#db2777', textTransform: 'uppercase' }}>Vacas Preñadas</span>
                    <span style={{ fontSize: '36px', fontWeight: '900', color: '#9d174d' }}>{data.ganaderia.demografia.prenadas || 0}</span>
                  </div>
                  <div style={statBoxStyle('#dbeafe', '#eff6ff', '#1d4ed8')}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#2563eb', textTransform: 'uppercase' }}>Vacas en Ordeño (Activas)</span>
                    <span style={{ fontSize: '36px', fontWeight: '900', color: '#1e3a8a' }}>{data.ganaderia.demografia.en_leche || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sección Acuícola */}
          <div style={cardStyle}>
            <div style={sectionHeaderStyle('#ecfeff', '#0f766e')}>
              <Fish size={24} /> 3. Expediente Acuícola (Lagos y Mortalidad)
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Estanque / Lago</th>
                    <th style={thStyle}>Área Especular</th>
                    <th style={thStyle}>Estado Auditado</th>
                    <th style={thStyle}>Especie</th>
                    <th style={thStyle}>Sembrados Originales</th>
                    <th style={thStyle}>Mortalidad Acumulada</th>
                    <th style={thStyle}>Reemplazos Efectuados</th>
                  </tr>
                </thead>
                <tbody>
                  {data.acuicola.estanques.map((e, i) => {
                    const eSiembras = data.acuicola.siembras.filter(s => s.id_estanque === e.id_estanque);
                    return eSiembras.length > 0 ? eSiembras.map(s => {
                      const novedad = data.acuicola.novedades.find(n => n.id_siembra_acui === s.id_siembra_acui) || {};
                      return (
                        <tr key={s.id_siembra_acui} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                          <td style={{ ...tdStyle, fontWeight: 'bold', fontSize: '15px' }}>{e.codigo}</td>
                          <td style={tdStyle}>{e.area_m2} m²</td>
                          <td style={tdStyle}>
                            <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', background: '#cffafe', color: '#0f766e' }}>
                              {e.estado_actual}
                            </span>
                          </td>
                          <td style={tdStyle}>{s.especie}</td>
                          <td style={tdStyle}>{s.cantidad_alevines}</td>
                          <td style={{ ...tdStyle, color: '#dc2626', fontWeight: 'bold' }}>{novedad.total_muertes || 0}</td>
                          <td style={{ ...tdStyle, color: '#16a34a', fontWeight: 'bold' }}>{novedad.total_repuestos || 0}</td>
                        </tr>
                      );
                    }) : (
                        <tr key={e.id_estanque} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                          <td style={{ ...tdStyle, fontWeight: 'bold', fontSize: '15px' }}>{e.codigo}</td>
                          <td style={tdStyle}>{e.area_m2} m²</td>
                          <td style={tdStyle}>
                            <span style={{ 
                              padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                              background: e.estado_actual?.includes('Mantenimiento') ? '#ffedd5' : '#f1f5f9',
                              color: e.estado_actual?.includes('Mantenimiento') ? '#c2410c' : '#475569'
                            }}>
                              {e.estado_actual}
                            </span>
                          </td>
                          <td colSpan="4" style={{ ...tdStyle, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
                            Sin siembra activa (En preparación)
                          </td>
                        </tr>
                    );
                  })}
                  {data.acuicola.estanques.length === 0 && (
                    <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No hay estanques auditables en esta finca</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Sección Contabilidad */}
          <div style={cardStyle}>
            <div style={sectionHeaderStyle('#f8fafc', '#334155')}>
              <Calculator size={24} color="#475569" /> 4. Integridad Financiera (Espejo Contable)
            </div>
            {data.contabilidad && data.contabilidad.id_centro_costo ? (
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                  <div style={{ ...statBoxStyle('#e2e8f0', '#ffffff', '#334155'), flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Débitos</span>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-primary)' }}>
                        ${new Intl.NumberFormat('es-CO').format(data.contabilidad.total_debito)}
                      </div>
                    </div>
                  </div>
                  <div style={{ ...statBoxStyle('#e2e8f0', '#ffffff', '#334155'), flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Créditos</span>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-primary)' }}>
                        ${new Intl.NumberFormat('es-CO').format(data.contabilidad.total_credito)}
                      </div>
                    </div>
                  </div>
                  <div style={{ ...statBoxStyle('#e2e8f0', data.contabilidad.total_debito === data.contabilidad.total_credito ? '#dcfce7' : '#fee2e2', '#334155'), flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: data.contabilidad.total_debito === data.contabilidad.total_credito ? '#166534' : '#991b1b', textTransform: 'uppercase' }}>Estado de Cuadratura</span>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: data.contabilidad.total_debito === data.contabilidad.total_credito ? '#15803d' : '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {data.contabilidad.total_debito === data.contabilidad.total_credito ? <><CheckCircle2 /> Cuadrado</> : <><XCircle /> Descuadrado</>}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Fecha</th>
                        <th style={thStyle}>Comprobante</th>
                        <th style={thStyle}>Cuenta</th>
                        <th style={thStyle}>Descripción</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Débito</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Crédito</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.contabilidad.detalles.map((d, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                          <td style={tdStyle}>{new Date(d.fecha).toLocaleDateString()}</td>
                          <td style={{ ...tdStyle, fontWeight: 'bold' }}>{d.numero_doc}</td>
                          <td style={tdStyle}>
                            <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>{d.codigo_cuenta}</span> - {d.nombre_cuenta}
                          </td>
                          <td style={tdStyle}>{d.descripcion}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                            {parseFloat(d.debito) > 0 ? `$${new Intl.NumberFormat('es-CO').format(d.debito)}` : '-'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                            {parseFloat(d.credito) > 0 ? `$${new Intl.NumberFormat('es-CO').format(d.credito)}` : '-'}
                          </td>
                        </tr>
                      ))}
                      {data.contabilidad.detalles.length === 0 && (
                        <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No hay registros contables en este periodo</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                Esta finca no tiene un Centro de Costo asociado o no hay registros financieros vinculados.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditoriaFincaDetalle;
