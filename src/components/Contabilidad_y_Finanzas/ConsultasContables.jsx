import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';

const ConsultasContables = ({ tenantId }) => {
  const [activeTab, setActiveTab] = useState('saldos-cuentas');
  const [modoTiempo, setModoTiempo] = useState('fechas'); // 'fechas' o 'lapsos'
  
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  
  const [idFinca, setIdFinca] = useState('');
  const [idCentroCosto, setIdCentroCosto] = useState('');
  const [idLapsoInicio, setIdLapsoInicio] = useState('');
  const [idLapsoFin, setIdLapsoFin] = useState('');
  const [anioBalance, setAnioBalance] = useState(new Date().getFullYear());

  const [fincas, setFincas] = useState([]);
  const [centrosCosto, setCentrosCosto] = useState([]);
  const [lapsos, setLapsos] = useState([]);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val || 0);

  useEffect(() => {
    const fetchSelects = async () => {
      try {
        const resCC = await authFetch(`/api/contabilidad/catalogos?tableName=centros_costo&tenantId=${tenantId || 1}`);
        const resLapsos = await authFetch(`/api/contabilidad/periodos?tenantId=${tenantId || 1}`);
        if (resCC.ok) {
          const js = await resCC.json();
          setFincas(js.fincas || []);
          setCentrosCosto(js.centros || []);
        }
        if (resLapsos.ok) {
          const jl = await resLapsos.json();
          setLapsos(Array.isArray(jl) ? jl : []);
        }
      } catch (err) {
        console.error("Error cargando filtros:", err);
      }
    };
    fetchSelects();
  }, [tenantId]);

  const fetchConsulta = async () => {
    setLoading(true);
    setError(null);
    try {
      let queryParams = `tenantId=${tenantId || 1}`;
      if (idFinca) queryParams += `&id_finca=${idFinca}`;
      if (idCentroCosto) queryParams += `&id_centro_costo=${idCentroCosto}`;
      
      if (activeTab === 'balance-mensual') {
        queryParams += `&anio=${anioBalance}`;
      } else if (modoTiempo === 'fechas') {
        queryParams += `&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
      } else {
        if (!idLapsoInicio || !idLapsoFin) throw new Error("Debes seleccionar un lapso inicial y final");
        queryParams += `&id_periodo_inicio=${idLapsoInicio}&id_periodo_fin=${idLapsoFin}`;
      }

      const response = await authFetch(`/api/contabilidad/consultas/${activeTab}?${queryParams}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error al cargar la consulta');
      setData(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsulta();
  }, [activeTab]);

  const renderTabs = () => {
    const tabs = [
      { id: 'saldos-cuentas', name: 'Saldos de Cuentas' },
      { id: 'saldos-terceros', name: 'Saldos de Terceros' },
      { id: 'saldos-centros-costos', name: 'Centros de Costo' },
      { id: 'balance-cuentas-terceros', name: 'Balance Cuentas y Terceros' },
      { id: 'balance-mensual', name: 'Balance Mensual' }
    ];

    return (
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === t.id ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === t.id ? '#1e40af' : '#64748b',
              fontWeight: activeTab === t.id ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '-2px',
              whiteSpace: 'nowrap'
            }}
          >
            {t.name}
          </button>
        ))}
      </div>
    );
  };

  const renderTableHeaders = () => {
    if (activeTab === 'balance-mensual') return (
      <tr>
        <th style={{padding:'12px', borderBottom:'2px solid #cbd5e1'}}>Mes</th>
        <th style={{padding:'12px', borderBottom:'2px solid #cbd5e1', textAlign:'right'}}>Movto. Débito</th>
        <th style={{padding:'12px', borderBottom:'2px solid #cbd5e1', textAlign:'right'}}>Movto. Crédito</th>
        <th style={{padding:'12px', borderBottom:'2px solid #cbd5e1', textAlign:'right'}}>Saldo Débito</th>
        <th style={{padding:'12px', borderBottom:'2px solid #cbd5e1', textAlign:'right'}}>Saldo Crédito</th>
        <th style={{padding:'12px', borderBottom:'2px solid #cbd5e1', textAlign:'right'}}>Diferencia Débit</th>
        <th style={{padding:'12px', borderBottom:'2px solid #cbd5e1', textAlign:'right'}}>Diferencia Créd</th>
      </tr>
    );

    switch (activeTab) {
      case 'saldos-cuentas':
        return <tr><th>Código</th><th>Cuenta</th><th style={{textAlign:'right'}}>Débito</th><th style={{textAlign:'right'}}>Crédito</th><th style={{textAlign:'right'}}>Saldo</th></tr>;
      case 'saldos-terceros':
        return <tr><th>Identificación</th><th>Tercero</th><th style={{textAlign:'right'}}>Débito</th><th style={{textAlign:'right'}}>Crédito</th><th style={{textAlign:'right'}}>Saldo</th></tr>;
      case 'saldos-centros-costos':
        return <tr><th>Código CC</th><th>Centro de Costo</th><th style={{textAlign:'right'}}>Débito</th><th style={{textAlign:'right'}}>Crédito</th><th style={{textAlign:'right'}}>Saldo</th></tr>;
      case 'balance-cuentas-terceros':
        return <tr><th>Cuenta</th><th>Identificación</th><th>Tercero</th><th style={{textAlign:'right'}}>Débito</th><th style={{textAlign:'right'}}>Crédito</th><th style={{textAlign:'right'}}>Saldo</th></tr>;
      default: return null;
    }
  };

  const renderTableRows = () => {
    if (!Array.isArray(data) || data.length === 0) {
      return <tr><td colSpan="6" style={{textAlign:'center', padding:'20px', color:'#64748b'}}>No se encontraron registros para los filtros seleccionados.</td></tr>;
    }

    if (activeTab === 'balance-mensual') {
      const mesesNombres = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
      return mesesNombres.map((mesNombre, index) => {
        const mesData = data.find(d => parseInt(d.mes) === index + 1) || { total_debito: 0, total_credito: 0 };
        const debito = parseFloat(mesData.total_debito);
        const credito = parseFloat(mesData.total_credito);
        const saldoDebito = debito > credito ? debito - credito : 0;
        const saldoCredito = credito > debito ? credito - debito : 0;
        const diffDebit = 0; // Se pueden calcular según fórmula Paccioli si se requiere
        const diffCred = 0;

        return (
          <tr key={index} style={{ borderBottom: '1px solid #e2e8f0', background: index % 2 === 0 ? 'white' : '#f8fafc' }}>
            <td style={{padding:'8px', fontWeight:'bold', color:'#334155'}}>{mesNombre}</td>
            <td style={{textAlign:'right', padding:'8px'}}>{debito > 0 ? formatCurrency(debito) : ''}</td>
            <td style={{textAlign:'right', padding:'8px'}}>{credito > 0 ? formatCurrency(credito) : ''}</td>
            <td style={{textAlign:'right', padding:'8px'}}>{saldoDebito > 0 ? formatCurrency(saldoDebito) : ''}</td>
            <td style={{textAlign:'right', padding:'8px'}}>{saldoCredito > 0 ? formatCurrency(saldoCredito) : ''}</td>
            <td style={{textAlign:'right', padding:'8px'}}>{diffDebit > 0 ? formatCurrency(diffDebit) : ''}</td>
            <td style={{textAlign:'right', padding:'8px'}}>{diffCred > 0 ? formatCurrency(diffCred) : ''}</td>
          </tr>
        );
      });
    }

    return data.map((row, idx) => {
      let isNegative = parseFloat(row.saldo) < 0;
      return (
        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
          {activeTab === 'saldos-cuentas' && (
            <>
              <td>{row.codigo}</td>
              <td>{row.cuenta_nombre}</td>
            </>
          )}
          {activeTab === 'saldos-terceros' && (
            <>
              <td>{row.identificacion}</td>
              <td>{row.tercero_nombre}</td>
            </>
          )}
          {activeTab === 'saldos-centros-costos' && (
            <>
              <td>{row.codigo}</td>
              <td>{row.cc_nombre}</td>
            </>
          )}
          {activeTab === 'balance-cuentas-terceros' && (
            <>
              <td>{row.cuenta_codigo} - {row.cuenta_nombre}</td>
              <td>{row.tercero_id}</td>
              <td>{row.tercero_nombre}</td>
            </>
          )}
          
          <td style={{textAlign:'right', color:'#16a34a', padding:'8px'}}>{formatCurrency(row.total_debito)}</td>
          <td style={{textAlign:'right', color:'#dc2626', padding:'8px'}}>{formatCurrency(row.total_credito)}</td>
          <td style={{textAlign:'right', fontWeight:'bold', color: isNegative ? '#dc2626' : '#2563eb', padding:'8px'}}>{formatCurrency(row.saldo)}</td>
        </tr>
      );
    });
  };

  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
  const inputStyle = { padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white' };

  return (
    <div style={{ margin: '20px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', background: 'white', borderRadius: '8px' }}>
      <div className="no-print" style={{ background: 'linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%)', borderBottom: '1px solid #e2e8f0', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#0f172a', margin: '0 0 8px 0' }}>🔎 Consultas Contables (Avanzadas)</h2>
            <p style={{ color: '#64748b', margin: 0 }}>Análisis financiero con segmentación por Centro de Costo (Finca) y Periodos Fiscales.</p>
          </div>
        </div>
      </div>
      <div style={{ padding: '24px' }}>
        
        {/* Filters Panel */}
        <div className="no-print" style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {/* Filtro Finca */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={labelStyle}>Finca (Subempresa)</label>
              <select value={idFinca} onChange={(e) => setIdFinca(e.target.value)} style={{...inputStyle, width: '100%'}}>
                <option value="">-- Toda la Empresa --</option>
                {fincas.map(f => (
                  <option key={f.id_finca} value={f.id_finca}>{f.codigo} - {f.nombre}</option>
                ))}
              </select>
            </div>

            {/* Filtro Centro de Costo */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={labelStyle}>Centro de Costo</label>
              <select value={idCentroCosto} onChange={(e) => setIdCentroCosto(e.target.value)} style={{...inputStyle, width: '100%'}}>
                <option value="">-- Todos los Centros --</option>
                {centrosCosto.map(cc => (
                  <option key={cc.id_centro_costo} value={cc.id_centro_costo}>{cc.codigo} - {cc.nombre}</option>
                ))}
              </select>
            </div>

            {/* Toggle Modo Tiempo */}
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              {activeTab === 'balance-mensual' ? null : (
                <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                  <button 
                    onClick={() => setModoTiempo('fechas')} 
                    style={{ padding: '8px 16px', border: 'none', background: modoTiempo === 'fechas' ? '#2563eb' : 'transparent', color: modoTiempo === 'fechas' ? 'white' : '#475569', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                  >📅 Por Fechas</button>
                  <button 
                    onClick={() => setModoTiempo('lapsos')} 
                    style={{ padding: '8px 16px', border: 'none', background: modoTiempo === 'lapsos' ? '#2563eb' : 'transparent', color: modoTiempo === 'lapsos' ? 'white' : '#475569', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                  >⏱️ Por Lapsos</button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {activeTab === 'balance-mensual' ? (
              <div>
                <label style={labelStyle}>Año Contable</label>
                <select value={anioBalance} onChange={(e) => setAnioBalance(e.target.value)} style={inputStyle}>
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            ) : modoTiempo === 'fechas' ? (
              <>
                <div>
                  <label style={labelStyle}>Desde</label>
                  <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Hasta</label>
                  <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} style={inputStyle} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label style={labelStyle}>Lapso Inicial</label>
                  <select value={idLapsoInicio} onChange={(e) => setIdLapsoInicio(e.target.value)} style={inputStyle}>
                    <option value="">-- Seleccionar --</option>
                    {lapsos.map(L => (
                      <option key={L.id_periodo} value={L.id_periodo}>{L.ano}-{String(L.mes).padStart(2,'0')} ({L.estado})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Lapso Final</label>
                  <select value={idLapsoFin} onChange={(e) => setIdLapsoFin(e.target.value)} style={inputStyle}>
                    <option value="">-- Seleccionar --</option>
                    {lapsos.map(L => (
                      <option key={L.id_periodo} value={L.id_periodo}>{L.ano}-{String(L.mes).padStart(2,'0')} ({L.estado})</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <button onClick={fetchConsulta} style={{ background: '#22c55e', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginLeft: 'auto', boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.4)' }}>
              {loading ? 'Consultando...' : '▶ Generar Consulta'}
            </button>
              
            {data.length > 0 && (
              <>
                <button onClick={() => window.print()} style={{ background: '#3b82f6', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)' }}>
                  🖨️ Imprimir
                </button>
                <button onClick={() => {
                  const csv = data.map(row => Object.values(row).join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Consulta_${activeTab}.csv`;
                  a.click();
                }} style={{ background: '#f59e0b', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.4)' }}>
                  📊 Exportar CSV
                </button>
              </>
            )}
          </div>
        </div>

        <div className="no-print">
          {renderTabs()}
        </div>

        {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #fca5a5' }}>{error}</div>}

        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead style={{ background: '#f1f5f9', color: '#334155' }}>
              {renderTableHeaders()}
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{textAlign:'center', padding:'40px'}}>Calculando agrupaciones y acumulados...</td></tr>
              ) : (
                renderTableRows()
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default ConsultasContables;
