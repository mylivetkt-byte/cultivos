import React, { useState, useEffect } from 'react';
import './ParametrosContables.css';
import { authFetch } from '../../utils/api';
import Pagination from '../Pagination';

function ParametrosContables() {
  const [activeTab, setActiveTab] = useState('subempresas');
  
  const [subempresas, setSubempresas] = useState([]);
  const [lapsos, setLapsos] = useState([]);
  const [comprobantes, setComprobantes] = useState([]);
  const [tiposDoc, setTiposDoc] = useState([]);
  const [puc, setPuc] = useState([]);
  const [centros, setCentros] = useState([]);
  const [terceros, setTerceros] = useState([]);
  const [plantillas, setPlantillas] = useState([]);

  const [currentPageTerceros, setCurrentPageTerceros] = useState(1);

  const [selectedComprobante, setSelectedComprobante] = useState(null);
  
  // Plantillas Add Account State
  const [acPlantilla, setAcPlantilla] = useState({ id_plantilla: null, text: '', id_cuenta: null, naturaleza: 'Debito' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const endpoints = {
        'subempresas': '/api/parametros/subempresas?tenantId=1',
        'lapsos': '/api/parametros/periodos',
        'comprobantes': '/api/parametros/comprobantes',
        'puc': '/api/parametros/puc?tenantId=1',
        'centros': '/api/parametros/centros',
        'terceros': '/api/parametros/terceros',
        'plantillas': '/api/contabilidad/plantillas?tenantId=1'
      };
      
      // If we are on comprobantes tab, fetch both comprobantes and tipos doc
      if (activeTab === 'comprobantes') {
        const [resC, resTD] = await Promise.all([
          authFetch(endpoints['comprobantes']),
          authFetch('/api/parametros/tiposdoc')
        ]);
        if(resC.ok) setComprobantes(await resC.json());
        if(resTD.ok) setTiposDoc(await resTD.json());
        return;
      }

      if (!endpoints[activeTab]) return;

      const res = await authFetch(endpoints[activeTab]);
      if (res.ok) {
        const data = await res.json();
        if(activeTab === 'subempresas') setSubempresas(data);
        if(activeTab === 'lapsos') setLapsos(data);
        if(activeTab === 'puc') setPuc(data);
        if(activeTab === 'centros') setCentros(data);
        if(activeTab === 'terceros') {
          setTerceros(data);
          setCurrentPageTerceros(1);
        }
        if(activeTab === 'plantillas') setPlantillas(data);
      }
    } catch (e) { console.error("Error fetching data:", e); }
  };

  const deleteItem = async (id, endpoint) => {
    if(!window.confirm("¿Seguro de eliminar este registro?")) return;
    try {
      let url = `/api/parametros/${endpoint}/${id}`;
      if (endpoint === 'plantillas') url = `/api/contabilidad/plantillas/${id}`;
      const res = await authFetch(url, { method: 'DELETE' });
      if(res.ok) fetchData();
    } catch (e) { alert("Error al eliminar"); }
  };

  // Plantillas actions
  const createEmptyPlantilla = async () => {
    const nombre = window.prompt("Nombre de la nueva plantilla (Ej: Pago Nómina):");
    if(!nombre) return;
    
    // Optional Document linking
    const linkDoc = window.confirm("¿Deseas amarrar esta plantilla a un Tipo de Documento para que se aplique automáticamente?\n(Click en Cancelar si la prefieres genérica)");
    let id_tipo_doc_defecto = null;
    if (linkDoc) {
      const docCode = window.prompt("Ingresa el CÓDIGO del Tipo de Documento (Ej: CE, FV, NC):");
      if (docCode) {
        const found = tiposDoc.find(t => t.codigo.toUpperCase() === docCode.toUpperCase());
        if (found) id_tipo_doc_defecto = found.id_tipo_doc;
        else alert("Código no encontrado. Se creará como plantilla genérica.");
      }
    }

    await authFetch('/api/contabilidad/plantillas', {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id_tenant: 1, nombre, id_tipo_doc_defecto, detalles: [] })
    });
    fetchData();
  };

  const addDetallePlantilla = async (id_plantilla) => {
    if (!acPlantilla.id_cuenta) return alert('Seleccione una cuenta del listado predictivo.');
    try {
      const res = await authFetch(`/api/contabilidad/plantillas/${id_plantilla}/detalles`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ id_cuenta: acPlantilla.id_cuenta, naturaleza: acPlantilla.naturaleza })
      });
      if (res.ok) {
        setAcPlantilla({ id_plantilla: null, text: '', id_cuenta: null, naturaleza: 'Debito' });
        fetchData();
      }
    } catch(e) { alert('Error añadiendo cuenta'); }
  };

  const deleteDetallePlantilla = async (id_detalle) => {
    if (!window.confirm("¿Quitar esta cuenta de la plantilla?")) return;
    await authFetch(`/api/contabilidad/plantillas_detalles/${id_detalle}`, { method: 'DELETE' });
    fetchData();
  };

  const tabs = [
    { id: 'subempresas', label: '1. SubEmpresas (Fincas)' },
    { id: 'lapsos', label: '2. Lapsos (Periodos)' },
    { id: 'comprobantes', label: '3. Comprobantes y Tipos Doc' },
    { id: 'puc', label: '4. Plan Único de Cuentas (PUC)' },
    { id: 'centros', label: '5. Centros de Costo' },
    { id: 'terceros', label: '6. Terceros' },
    { id: 'plantillas', label: '7. Plantillas Contables 🪄' }
  ];

  return (
    <div className="parametros-container">
      <div className="parametros-header">
        <h1>⚙️ Configuración y Catálogos Contables</h1>
        <p>Alineación estricta de parámetros SaaS y reglas contables (Niveles, CXC/CXP, Impuestos).</p>
      </div>

      <div className="tabs-nav">
        {tabs.map(t => (
          <button 
            key={t.id} 
            className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(t.id); setSelectedComprobante(null); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {/* =========================================
            TAB 1: SUBEMPRESAS (FINCAS)
        ========================================= */}
        {activeTab === 'subempresas' && (
          <div className="catalog-panel">
            <div className="panel-toolbar">
              <h2>Catálogo de SubEmpresas (Fincas)</h2>
              <button className="btn-modern primary">+ Nueva SubEmpresa</button>
            </div>
            <table className="modern-table">
              <thead><tr><th>Código</th><th>Nombre de SubEmpresa / Finca</th><th>Hectáreas</th><th>Activo</th><th>Acciones</th></tr></thead>
              <tbody>
                {subempresas.map(s => (
                  <tr key={s.id_finca}>
                    <td><strong>{s.codigo}</strong></td>
                    <td>{s.nombre}</td>
                    <td>{s.hectareas_totales || '-'} ha</td>
                    <td>{s.activo ? <span className="badge bg-green">Sí</span> : <span className="badge bg-red">No</span>}</td>
                    <td><button className="btn-sm del" onClick={()=>deleteItem(s.id_finca, 'subempresas')}>Eliminar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* =========================================
            TAB 2: LAPSOS
        ========================================= */}
        {activeTab === 'lapsos' && (
          <div className="catalog-panel">
            <div className="panel-toolbar">
              <h2>Lapsos Contables (Periodos 1 al 14)</h2>
              <button className="btn-modern primary">+ Nuevo Lapso</button>
            </div>
            <table className="modern-table">
              <thead><tr><th>Lapso</th><th>Nombre</th><th>Fecha Inicial</th><th>Fecha Final</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {lapsos.map(l => (
                  <tr key={l.id_periodo}>
                    <td>{l.ano}{String(l.mes).padStart(2,'0')}</td>
                    <td>MES {l.mes} DE {l.ano} {l.mes === 13 ? '(CIERRE PARCIAL)' : l.mes === 14 ? '(CIERRE FINAL)' : ''}</td>
                    <td>{l.fecha_inicio ? new Date(l.fecha_inicio).toLocaleDateString() : '-'}</td>
                    <td>{l.fecha_fin ? new Date(l.fecha_fin).toLocaleDateString() : '-'}</td>
                    <td><span className={`badge ${l.estado === 'Abierto' ? 'bg-green' : 'bg-red'}`}>{l.estado}</span></td>
                    <td><button className="btn-sm del" onClick={()=>deleteItem(l.id_periodo, 'periodos')}>Eliminar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* =========================================
            TAB 3: COMPROBANTES Y TIPOS DOCUMENTOS
        ========================================= */}
        {activeTab === 'comprobantes' && (
          <div className="comprobantes-layout">
            <div className="catalog-panel left-panel">
              <div className="panel-toolbar">
                <h2>1. Comprobantes</h2>
                <button className="btn-modern primary">+ Comp</button>
              </div>
              <ul className="comp-list">
                {comprobantes.map(c => (
                  <li 
                    key={c.id_tipo_comp} 
                    className={`comp-item ${selectedComprobante === c.id_tipo_comp ? 'selected' : ''}`}
                    onClick={() => setSelectedComprobante(c.id_tipo_comp)}
                  >
                    <span className="comp-code">{c.codigo}</span>
                    <span className="comp-name">{c.nombre}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="catalog-panel right-panel">
              {selectedComprobante ? (
                <>
                  <div className="panel-toolbar">
                    <h2>2. Tipos de Documentos para Comprobante</h2>
                    <button className="btn-modern primary">+ Nuevo Doc</button>
                  </div>
                  <table className="modern-table">
                    <thead><tr><th>Tipo</th><th>Nombre</th><th>Consecutivo</th><th>Es Manual</th><th>Acciones</th></tr></thead>
                    <tbody>
                      {tiposDoc.filter(t => t.id_tipo_comp === selectedComprobante).map(t => (
                        <tr key={t.id_tipo_doc}>
                          <td><strong>{t.codigo}</strong></td>
                          <td>{t.nombre}</td>
                          <td>{t.consecutivo_actual}</td>
                          <td>{t.es_manual ? 'Sí (Prefijos)' : 'Auto'}</td>
                          <td><button className="btn-sm del" onClick={()=>deleteItem(t.id_tipo_doc, 'tiposdoc')}>Borrar</button></td>
                        </tr>
                      ))}
                      {tiposDoc.filter(t => t.id_tipo_comp === selectedComprobante).length === 0 && (
                        <tr><td colSpan="5" className="text-center empty-state">No hay documentos para este comprobante.</td></tr>
                      )}
                    </tbody>
                  </table>
                </>
              ) : (
                <div className="empty-state">
                  <p>Selecciona un Comprobante de la izquierda para ver y gestionar sus Tipos de Documentos correspondientes.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================
            TAB 4: PLAN DE CUENTAS (PUC)
        ========================================= */}
        {activeTab === 'puc' && (
          <div className="catalog-panel">
            <div className="panel-toolbar">
              <h2>Plan Único de Cuentas (Niveles y Cruces)</h2>
              <button className="btn-modern primary">+ Nueva Cuenta</button>
            </div>
            <div className="table-responsive">
              <table className="modern-table puc-table">
                <thead>
                  <tr>
                    <th>Cuenta</th><th>Nombre</th><th>Nivel</th>
                    <th>Centro Costo</th><th>Tercero</th>
                    <th>CXC</th><th>CXP</th><th>IVA</th><th>ReteF.</th><th>ReteIca</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {puc.map(p => {
                    const isMovimiento = p.nivel === 5;
                    return (
                      <tr key={p.id_cuenta} className={isMovimiento ? 'movimiento-row' : 'acumulado-row'}>
                        <td style={{paddingLeft: `${(p.nivel - 1) * 15}px`}}>
                          <strong>{p.codigo}</strong>
                        </td>
                        <td>{p.nombre}</td>
                        <td>{isMovimiento ? <span className="badge bg-blue">Niv 5 (Movimiento)</span> : <span className="badge bg-gray">Niv {p.nivel} (Acum)</span>}</td>
                        
                        <td>{p.requiere_centro_costo ? <span className="check">✓</span> : '-'}</td>
                        <td>{p.requiere_tercero ? <span className="check">✓</span> : '-'}</td>
                        <td>{p.requiere_cxc ? <span className="check cxc">CXC</span> : '-'}</td>
                        <td>{p.requiere_cxp ? <span className="check cxp">CXP</span> : '-'}</td>
                        <td>{p.maneja_iva ? <span className="check tax">IVA</span> : '-'}</td>
                        <td>{p.maneja_retefuente ? <span className="check tax">RTF</span> : '-'}</td>
                        <td>{p.maneja_reteica ? <span className="check tax">RTI</span> : '-'}</td>
                        
                        <td><button className="btn-sm del" onClick={()=>deleteItem(p.id_cuenta, 'puc')}>Eliminar</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================
            TAB 5: CENTROS DE COSTO
        ========================================= */}
        {activeTab === 'centros' && (
          <div className="catalog-panel">
            <div className="panel-toolbar">
              <h2>Centros de Costo (4 Niveles)</h2>
              <button className="btn-modern primary">+ Nuevo Centro de Costo</button>
            </div>
            <table className="modern-table">
              <thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Activo</th><th>Acciones</th></tr></thead>
              <tbody>
                {centros.map(c => {
                  const numDots = (c.codigo.match(/\./g) || []).length;
                  return (
                  <tr key={c.id_centro_costo}>
                    <td style={{paddingLeft: `${numDots * 20}px`}}><strong>{c.codigo}</strong></td>
                    <td>{c.nombre}</td>
                    <td>{c.tipo}</td>
                    <td>{c.activo ? 'Sí' : 'No'}</td>
                    <td><button className="btn-sm del" onClick={()=>deleteItem(c.id_centro_costo, 'centros')}>Eliminar</button></td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}

        {/* =========================================
            TAB 6: TERCEROS
        ========================================= */}
        {activeTab === 'terceros' && (
          <div className="catalog-panel">
            <div className="panel-toolbar">
              <h2>Terceros (Clientes, Proveedores, Empleados)</h2>
              <button className="btn-modern primary">+ Nuevo Tercero</button>
            </div>
            <table className="modern-table">
              <thead><tr><th>Identificación</th><th>Razón Social / Nombre</th><th>Tipo</th><th>Acciones</th></tr></thead>
              <tbody>
                {terceros.slice((currentPageTerceros - 1) * 20, currentPageTerceros * 20).map(t => (
                  <tr key={t.id_tercero}>
                    <td>{t.documento} {t.dv ? `-${t.dv}` : ''}</td>
                    <td>{t.razon_social || t.nombre_completo}</td>
                    <td>{t.tipo_tercero}</td>
                    <td><button className="btn-sm del" onClick={()=>deleteItem(t.id_tercero, 'terceros')}>Eliminar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {terceros.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <Pagination 
                  currentPage={currentPageTerceros}
                  totalItems={terceros.length}
                  pageSize={20}
                  onPageChange={setCurrentPageTerceros}
                />
              </div>
            )}
          </div>
        )}

        {/* =========================================
            TAB 7: PLANTILLAS CONTABLES
        ========================================= */}
        {activeTab === 'plantillas' && (
          <div className="catalog-panel">
            <div className="panel-toolbar">
              <div>
                <h2>Plantillas y Modelos de Asiento 🪄</h2>
                <p style={{fontSize:'12px', color: 'var(--text-muted)'}}>Pre-configura esqueletos contables para agilizar la digitación.</p>
              </div>
              <button className="btn-modern primary" onClick={createEmptyPlantilla}>+ Crear Nueva Plantilla</button>
            </div>
            <div className="modelos-grid" style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(400px, 1fr))', gap:'20px'}}>
              {plantillas.map(p => {
                const docName = tiposDoc.find(t => t.id_tipo_doc === p.id_tipo_doc_defecto);
                return (
                <div key={p.id_plantilla} style={{background: 'var(--card-bg)', color: 'var(--text)', padding:'20px', borderRadius:'12px', border: '1px solid var(--border)', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', borderBottom: '1px solid var(--border)', paddingBottom:'10px', marginBottom:'10px'}}>
                    <div>
                      <h3 style={{margin:0, color: 'var(--text)', fontSize:'16px'}}>{p.nombre}</h3>
                      {docName && <span className="badge bg-green" style={{marginTop:'5px', display:'inline-block'}}>Auto-Aplica en: {docName.codigo}</span>}
                    </div>
                    <button className="btn-sm del" style={{height:'30px'}} onClick={()=>deleteItem(p.id_plantilla, 'plantillas')}>Borrar Plantilla</button>
                  </div>
                  <table style={{width:'100%', fontSize:'12px', borderCollapse:'collapse', marginBottom:'10px'}}>
                    <thead>
                      <tr style={{borderBottom: '1px solid var(--border-color)'}}><th style={{textAlign:'left', paddingBottom:'4px'}}>Cuenta</th><th>Naturaleza</th><th></th></tr>
                    </thead>
                    <tbody>
                      {p.detalles?.map((d, i) => (
                        <tr key={i} style={{borderBottom:'1px solid #f8fafc'}}>
                          <td style={{padding:'6px 0'}}>{d.codigo} - {d.cuenta_nombre}</td>
                          <td style={{textAlign:'center'}}><span className={`badge ${d.naturaleza === 'Debito' ? 'bg-blue' : 'bg-red'}`}>{d.naturaleza}</span></td>
                          <td style={{textAlign:'right'}}><button className="btn-sm del" onClick={()=>deleteDetallePlantilla(d.id_detalle_plantilla)}>X</button></td>
                        </tr>
                      ))}
                      {(!p.detalles || p.detalles.length === 0) && (
                        <tr><td colSpan="3" style={{textAlign:'center', padding:'10px', color:'#94a3b8'}}>Sin cuentas agregadas.</td></tr>
                      )}
                    </tbody>
                  </table>
                  
                  {/* Inline Form to add account */}
                  <div style={{display:'flex', gap:'8px', marginTop:'10px', padding:'10px', background: 'var(--bg-main)', borderRadius:'8px', position:'relative'}}>
                    <div style={{flex:1}}>
                      <input 
                        type="text" 
                        placeholder="Buscar cuenta (ej: 5105)..."
                        className="mod-input" 
                        style={{width:'100%', fontSize:'12px'}}
                        value={acPlantilla.id_plantilla === p.id_plantilla ? acPlantilla.text : ''}
                        onChange={(e) => {
                          const text = e.target.value;
                          setAcPlantilla({ id_plantilla: p.id_plantilla, text, id_cuenta: null, naturaleza: 'Debito' });
                        }}
                      />
                      {/* AC Dropdown */}
                      {acPlantilla.id_plantilla === p.id_plantilla && acPlantilla.text.length > 1 && !acPlantilla.id_cuenta && (
                        <ul className="ac-list" style={{position:'absolute', top:'100%', left:0, width:'100%', zIndex:100, background: 'var(--card-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius:'4px', maxHeight:'200px', overflowY:'auto', padding:0, margin:0, listStyle:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}}>
                          {puc.filter(cta => cta.nivel === 5 && (cta.codigo.includes(acPlantilla.text) || cta.nombre.toLowerCase().includes(acPlantilla.text.toLowerCase())))
                             .slice(0, 15).map(cta => (
                            <li key={cta.id_cuenta} style={{padding:'8px 12px', cursor:'pointer', borderBottom: '1px solid var(--border)', fontSize:'12px'}} onMouseEnter={(e)=>e.target.style.background='#f1f5f9'} onMouseLeave={(e)=>e.target.style.background='white'} onClick={() => {
                              setAcPlantilla({ ...acPlantilla, text: `${cta.codigo} - ${cta.nombre}`, id_cuenta: cta.id_cuenta });
                            }}>{cta.codigo} - {cta.nombre}</li>
                          ))}
                          {puc.filter(cta => cta.nivel === 5 && (cta.codigo.includes(acPlantilla.text) || cta.nombre.toLowerCase().includes(acPlantilla.text.toLowerCase()))).length === 0 && (
                            <li style={{padding:'8px 12px', fontSize:'12px', color: 'var(--text-muted)'}}>No se encontraron cuentas.</li>
                          )}
                        </ul>
                      )}
                    </div>
                    <select 
                      className="mod-input" 
                      style={{width:'90px', fontSize:'12px'}}
                      value={acPlantilla.id_plantilla === p.id_plantilla ? acPlantilla.naturaleza : 'Debito'}
                      onChange={e=>setAcPlantilla({...acPlantilla, naturaleza: e.target.value})}
                    >
                      <option value="Debito">DÉB</option>
                      <option value="Credito">CRÉ</option>
                    </select>
                    <button 
                      className="btn-modern primary" 
                      style={{padding:'4px 8px'}}
                      onClick={() => addDetallePlantilla(p.id_plantilla)}
                    >+</button>
                  </div>

                </div>
                );
              })}
              {plantillas.length === 0 && <p style={{color: 'var(--text-muted)'}}>No hay plantillas creadas. Usa el botón superior para crear una.</p>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default ParametrosContables;
