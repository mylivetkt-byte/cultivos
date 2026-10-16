import React, { useState, useEffect, useRef } from 'react';
import './CapturadorContable.css';
import { authFetch } from '../../utils/api';
import { Select } from 'antd';
const { Option } = Select;

function CapturadorContable({ tenantId }) {
  // 1. Data Source
  const [fincas, setFincas] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [tiposComp, setTiposComp] = useState([]);
  const [tiposDoc, setTiposDoc] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [terceros, setTerceros] = useState([]);
  const [centros, setCentros] = useState([]);
  const [plantillas, setPlantillas] = useState([]);

  // 2. Flow State
  const [filtro, setFiltro] = useState({ id_finca: '', id_periodo: '', id_tipo_comp: '' });
  const [lotes, setLotes] = useState([]); // contab_comprobantes
  const [selectedLote, setSelectedLote] = useState(null);
  
  const [documentos, setDocumentos] = useState([]); // contab_documentos
  const [selectedDoc, setSelectedDoc] = useState(null);
  
  // Inline editing state for grid
  const [editCell, setEditCell] = useState(null);

  const [detalles, setDetalles] = useState([]); // contab_detalles

  // 3. Forms State
  const [formDoc, setFormDoc] = useState({ id_tipo_doc: '', numero_doc: '', fecha: '', concepto: '', id_tercero: '' });
  const [formDet, setFormDet] = useState({ id_cuenta: '', id_tercero: '', id_centro_costo: '', descripcion: '', debito: '', credito: '' });

  // Autocomplete UI state
  const [acText, setAcText] = useState('');
  const [acOpen, setAcOpen] = useState(false);
  const [selectedCuenta, setSelectedCuenta] = useState(null);
  const debitRef = useRef(null);
  const creditRef = useRef(null);

  useEffect(() => {
    fetchCatalogs();
  }, [tenantId]);

  const fetchCatalogs = async () => {
    try {
      const res = await authFetch(`/api/contabilidad/catalogos?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setCuentas(data.cuentas || []);
        setTiposComp(data.tipos || []);
        setTiposDoc(data.tiposDoc || []);
        setCentros(data.centros || []);
        setTerceros(data.terceros || []);
        setFincas(data.fincas || []);
        setPlantillas(data.plantillas || []);
      }
      const resP = await authFetch(`/api/contabilidad/periodos?tenantId=${tenantId}`);
      if (resP.ok) setPeriodos(await resP.json());
    } catch (e) { console.error('Error fetching catalogs'); }
  };

  useEffect(() => {
    if (filtro.id_periodo) loadLotes();
  }, [filtro.id_periodo]);

  const loadLotes = async () => {
    if (!filtro.id_periodo) return;
    try {
      const res = await authFetch(`/api/contabilidad/comprobantes/${filtro.id_periodo}`);
      if (res.ok) {
        const data = await res.json();
        setLotes(data);
      }
    } catch (e) { console.error(e); }
  };

  const loadDocumentos = async (id_lote) => {
    try {
      const res = await authFetch(`/api/contabilidad/comprobantes/${id_lote}/documentos`);
      if (res.ok) setDocumentos(await res.json());
    } catch (e) { console.error(e); }
  };

  const loadDetalles = async (id_doc) => {
    try {
      const res = await authFetch(`/api/contabilidad/documentos/${id_doc}/detalles`);
      if (res.ok) setDetalles(await res.json());
    } catch (e) { console.error(e); }
  };

  // --- ACTIONS ---

  const handleCreateLote = async () => {
    if (!filtro.id_finca || !filtro.id_periodo || !filtro.id_tipo_comp) return alert('Seleccione Finca, Lapso y Tipo de Comprobante.');
    const per = periodos.find(p => p.id_periodo == filtro.id_periodo);
    const tc = tiposComp.find(t => t.id_tipo_comp == filtro.id_tipo_comp);
    if (per.estado === 'Cerrado') return alert('Este periodo está cerrado. No se puede alterar.');

    const numero = `${per.ano}${String(per.mes).padStart(2,'0')}${tc.codigo}`;
    
    try {
      const res = await authFetch('/api/contabilidad/comprobantes', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          id_tenant: tenantId,
          id_periodo: filtro.id_periodo,
          id_tipo_comp: filtro.id_tipo_comp,
          numero: numero,
          descripcion: `Comprobante de ${tc.nombre} - ${per.mes}/${per.ano}`
        })
      });
      if (res.ok) {
        loadLotes();
      }
    } catch(e) { alert('Error al crear lote'); }
  };

  const handleCreateDoc = async () => {
    if(!selectedLote) return;
    if(!formDoc.id_tipo_doc || !formDoc.fecha || !formDoc.concepto) return alert('Llene tipo, fecha y concepto');
    const td = tiposDoc.find(t => t.id_tipo_doc == formDoc.id_tipo_doc);
    if(td.es_manual && !formDoc.numero_doc) return alert('Debe digitar el número de consecutivo manual (Ej. Prefijo de Proveedor).');
    
    const numeroFinal = td.es_manual ? formDoc.numero_doc : `AUTO-${Date.now().toString().slice(-4)}`;

    try {
      const res = await authFetch(`/api/contabilidad/comprobantes/${selectedLote.id_comprobante}/documentos`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          id_tenant: tenantId,
          id_tipo_doc: formDoc.id_tipo_doc,
          numero_doc: numeroFinal,
          fecha: formDoc.fecha,
          concepto: formDoc.concepto,
          id_tercero: formDoc.id_tercero || null
        })
      });
      if(res.ok) {
        const newDoc = await res.json();
        // Check for auto-apply template
        const matchingPlantilla = plantillas.find(p => p.id_tipo_doc_defecto == formDoc.id_tipo_doc);
        if (matchingPlantilla) {
          await authFetch(`/api/contabilidad/documentos/${newDoc.id_documento}/aplicar-plantilla`, {
            method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id_plantilla: matchingPlantilla.id_plantilla})
          });
        }

        setFormDoc({ id_tipo_doc: '', numero_doc: '', fecha: '', concepto: '', id_tercero: '' });
        loadDocumentos(selectedLote.id_comprobante);
      }
    } catch(e) { alert('Error al crear documento'); }
  };

  const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits:0}).format(val || 0);

  // --- AUTOCOMPLETE LOGIC ---
  const filteredCuentas = acText ? cuentas.filter(c => c.nivel === 5 && (c.codigo.includes(acText) || c.nombre.toLowerCase().includes(acText.toLowerCase()))).slice(0, 10) : [];

  const selectCuenta = (c) => {
    setSelectedCuenta(c);
    setFormDet({...formDet, id_cuenta: c.id_cuenta, descripcion: c.nombre});
    setAcText(`${c.codigo} - ${c.nombre}`);
    setAcOpen(false);
    
    // Autofocus UX
    setTimeout(() => {
      if (c.naturaleza === 'Debito' && debitRef.current) debitRef.current.focus();
      if (c.naturaleza === 'Credito' && creditRef.current) creditRef.current.focus();
    }, 100);
  };

  const handleAddDetalle = async () => {
    if(!selectedDoc || !selectedCuenta) return alert('Seleccione cuenta');
    if(!formDet.debito && !formDet.credito) return alert('Digite débito o crédito');
    
    // Validaciones Estrictas (Banderas)
    if(selectedCuenta.requiere_tercero && !formDet.id_tercero) return alert(`La cuenta ${selectedCuenta.codigo} exige Tercero.`);
    if(selectedCuenta.requiere_centro_costo && !formDet.id_centro_costo) return alert(`La cuenta exige Centro de Costo.`);

    try {
      const res = await authFetch(`/api/contabilidad/documentos/${selectedDoc.id_documento}/detalles`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(formDet)
      });
      if(res.ok) {
        // Reset form but keep same Tercero/CC to speed up entry
        setFormDet({ ...formDet, id_cuenta: '', descripcion: '', debito: '', credito: '' });
        setAcText('');
        setSelectedCuenta(null);
        loadDetalles(selectedDoc.id_documento);
        loadDocumentos(selectedLote.id_comprobante); // refresh headers
        loadLotes(); // refresh parent comprobante totals
      }
    } catch(e) { alert('Error insertando detalle'); }
  };

  // --- CASCADING DELETES ---
  const handleDeleteDetalle = async (id_detalle) => {
    if(!window.confirm('¿Borrar asiento?')) return;
    await authFetch(`/api/contabilidad/detalles/${id_detalle}`, {method: 'DELETE'});
    loadDetalles(selectedDoc.id_documento);
    loadDocumentos(selectedLote.id_comprobante);
    loadLotes();
  };

  const handleDeleteDoc = async (id_doc) => {
    if(!window.confirm('¿ELIMINAR documento completo? Esto borrará todos sus asientos.')) return;
    await authFetch(`/api/contabilidad/documentos/${id_doc}`, {method: 'DELETE'});
    setSelectedDoc(null);
    loadDocumentos(selectedLote.id_comprobante);
    loadLotes();
  };

  const handleDeleteLote = async (id_lote) => {
    if(!window.confirm('¿Borrar TODO el lote de documentos?')) return;
    await authFetch(`/api/contabilidad/comprobantes/${id_lote}`, {method: 'DELETE'});
    setSelectedLote(null);
    loadLotes();
  };

  const saveCellValue = async (id_detalle, field, valStr) => {
    const val = parseFloat(valStr) || 0;
    const det = detalles.find(d => d.id_detalle === id_detalle);
    if (!det) return;
    
    // We only update debito or credito, the other stays the same
    const body = {
      debito: field === 'debito' ? val : det.debito,
      credito: field === 'credito' ? val : det.credito
    };

    try {
      await authFetch(`/api/contabilidad/detalles/${id_detalle}`, {
        method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)
      });
      setEditCell(null);
      loadDetalles(selectedDoc.id_documento);
      loadLotes(); // To update total amounts in parent lists if needed
    } catch(e) { alert('Error actualizando valor'); }
  };

  const aplicarPlantilla = async (id_plantilla) => {
    if(!window.confirm('¿Aplicar esta plantilla al documento actual?')) return;
    try {
      const res = await authFetch(`/api/contabilidad/documentos/${selectedDoc.id_documento}/aplicar-plantilla`, {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id_plantilla})
      });
      if(res.ok) {
        loadDetalles(selectedDoc.id_documento);
        loadLotes();
      }
    } catch (e) { alert('Error aplicando plantilla'); }
  };

  // --- RENDERS ---
  const visibleLotes = lotes.filter(l => (filtro.id_tipo_comp ? l.id_tipo_comp == filtro.id_tipo_comp : true));
  const currentLapso = periodos.find(p => p.id_periodo == filtro.id_periodo);
  const isPeriodClosed = currentLapso?.estado === 'Cerrado';
  
  const totalDebitoDoc = detalles.reduce((sum, d) => sum + Number(d.debito), 0);
  const totalCreditoDoc = detalles.reduce((sum, d) => sum + Number(d.credito), 0);
  const diff = totalDebitoDoc - totalCreditoDoc;

  return (
    <div className="capturador-container">
      <div className="cap-header">
        <h1>📑 Capturador Contable de Movimientos</h1>
        <p>Flujo: Subempresa &gt; Lapso &gt; Comprobante &gt; Documento &gt; Detalle. (Periodo: {currentLapso ? currentLapso.estado : 'No seleccionado'})</p>
      </div>

      <div className="wizard-filters">
        <div className="filter-group">
          <label>1. SubEmpresa (Finca)</label>
          <select value={filtro.id_finca} onChange={e=>setFiltro({...filtro, id_finca:e.target.value})}>
            <option value="">Seleccione Finca...</option>
            {fincas.map(f => <option key={f.id_finca} value={f.id_finca}>{f.codigo} - {f.nombre}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>2. Lapso Contable</label>
          <select value={filtro.id_periodo} onChange={e=>setFiltro({...filtro, id_periodo:e.target.value})}>
            <option value="">Seleccione Lapso...</option>
            {periodos.map(p => <option key={p.id_periodo} value={p.id_periodo}>{p.ano}-{String(p.mes).padStart(2,'0')} {p.estado==='Cerrado'?'(CERRADO)':''}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>3. Comprobante Padre</label>
          <select value={filtro.id_tipo_comp} onChange={e=>setFiltro({...filtro, id_tipo_comp:e.target.value})}>
            <option value="">Todos los Comprobantes...</option>
            {tiposComp.map(t => <option key={t.id_tipo_comp} value={t.id_tipo_comp}>{t.codigo} - {t.nombre}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={handleCreateLote} disabled={isPeriodClosed}>
          + Abrir Lote de Comprobante
        </button>
      </div>

      <div className="cap-content">
        {/* PANEL IZQUIERDO: LOTES */}
        <div className="lotes-sidebar">
          <div className="lotes-toolbar">
            <strong>Lotes Abiertos (Periodo {currentLapso?.mes}/{currentLapso?.ano})</strong>
          </div>
          <div className="lotes-list">
            {visibleLotes.length === 0 && <div className="empty-msg text-center">No hay lotes en este filtro. Abre uno nuevo.</div>}
            {visibleLotes.map(l => {
              const diffLote = l.total_debito - l.total_credito;
              const isDescuadrado = Math.abs(diffLote) > 0.01;
              return (
                <div key={l.id_comprobante} className={`lote-card ${selectedLote?.id_comprobante === l.id_comprobante ? 'active' : ''}`} 
                     onClick={() => { setSelectedLote(l); setSelectedDoc(null); loadDocumentos(l.id_comprobante); }}>
                  <div className="lote-header-info">
                    <span className="lote-type">{l.tipo_codigo}</span>
                    <span className="lote-num">{l.numero}</span>
                  </div>
                  <div className="lote-desc">{l.descripcion}</div>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px', marginTop:'4px'}}>
                    <span style={{color: '#16a34a'}}>Db: {formatMoney(l.total_debito)}</span>
                    <span style={{color: '#dc2626'}}>Cr: {formatMoney(l.total_credito)}</span>
                  </div>
                  <div style={{fontSize:'12px', marginTop:'4px', fontWeight:'bold', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <span style={{color: isDescuadrado ? '#dc2626' : '#16a34a'}}>
                      {isDescuadrado ? `DESCUADRE: ${formatMoney(diffLote)}` : 'CUADRADO'}
                    </span>
                    {isDescuadrado && <span className="badge bg-red" style={{fontSize:'9px', padding:'2px 4px', animation:'pulse 2s infinite'}}>¡REVISAR!</span>}
                  </div>
                  <div style={{marginTop:'8px', textAlign:'right'}}>
                    <button className="btn-icon del" disabled={isPeriodClosed} onClick={(e)=>{e.stopPropagation(); handleDeleteLote(l.id_comprobante)}}>Borrar Lote</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL DERECHO: DOCUMENTOS Y CAPTURA */}
        <div className="docs-main">
          {!selectedLote ? (
             <div className="empty-msg text-center" style={{marginTop:'100px'}}>
               <h3>Seleccione un Lote de Comprobante a la izquierda.</h3>
               <p>Para ver o crear los documentos (Facturas, Recibos, etc.) de ese lote.</p>
             </div>
          ) : !selectedDoc ? (
            <>
              <div className="docs-toolbar">
                <h2>Documentos en Lote: {selectedLote.numero}</h2>
                <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                  <select className="mod-input" style={{width:'150px'}} value={formDoc.id_tipo_doc} onChange={e=>setFormDoc({...formDoc, id_tipo_doc:e.target.value})}>
                    <option value="">4. Tipo Doc...</option>
                    {tiposDoc.filter(t => t.id_tipo_comp === selectedLote.id_tipo_comp).map(t => (
                      <option key={t.id_tipo_doc} value={t.id_tipo_doc}>{t.codigo} - {t.nombre}</option>
                    ))}
                  </select>
                  {formDoc.id_tipo_doc && tiposDoc.find(t=>t.id_tipo_doc==formDoc.id_tipo_doc)?.es_manual && (
                    <input type="text" className="mod-input" placeholder="Núm/Prefijo..." value={formDoc.numero_doc} onChange={e=>setFormDoc({...formDoc, numero_doc:e.target.value})} style={{width:'100px'}}/>
                  )}
                  <input type="date" className="mod-input" value={formDoc.fecha} onChange={e=>setFormDoc({...formDoc, fecha:e.target.value})} />
                  <input type="text" className="mod-input" placeholder="Concepto..." value={formDoc.concepto} onChange={e=>setFormDoc({...formDoc, concepto:e.target.value})} />
                  <button className="btn-primary" onClick={handleCreateDoc} disabled={isPeriodClosed}>+ Agregar Doc</button>
                </div>
              </div>
              <div className="docs-list">
                {documentos.length === 0 && <div className="empty-msg text-center">Lote vacío. Agrega un documento arriba.</div>}
                {documentos.map(d => {
                  const diffDoc = d.total_debito - d.total_credito;
                  const isDocDescuadrado = Math.abs(diffDoc) > 0.01;
                  return (
                    <div key={d.id_documento} className="doc-card" style={{ borderLeft: isDocDescuadrado ? '4px solid #dc2626' : '4px solid #16a34a' }}>
                      <div className="doc-header">
                        <div className="doc-info">
                          <span className="doc-title">{d.tipo_codigo} - {d.numero_doc}</span>
                          <span className="doc-subtitle">{new Date(d.fecha).toLocaleDateString()} | {d.concepto}</span>
                          {isDocDescuadrado && <span className="badge bg-red" style={{marginTop:'4px', display:'inline-block'}}>Descuadrado</span>}
                        </div>
                        <div className="doc-amounts">
                          <div className="amt-box">
                            <span className="lbl">Débitos</span>
                            <span className="val">{formatMoney(d.total_debito)}</span>
                          </div>
                          <div className="amt-box">
                            <span className="lbl">Créditos</span>
                            <span className="val">{formatMoney(d.total_credito)}</span>
                          </div>
                          <div className={`amt-box diff ${isDocDescuadrado ? 'error' : 'ok'}`} style={{background: isDocDescuadrado ? '#fef2f2' : '#f0fdf4'}}>
                            <span className="lbl">Diferencia</span>
                            <span className="val">{formatMoney(diffDoc)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="doc-actions" style={{display:'flex', gap:'8px'}}>
                        <button className="btn-outline" onClick={() => { setSelectedDoc(d); loadDetalles(d.id_documento); }}>Capturar / Editar</button>
                        <button className="btn-icon del" disabled={isPeriodClosed} onClick={()=>handleDeleteDoc(d.id_documento)}>Eliminar Doc</button>
                      </div>
                    </div>
                  )})}
              </div>
            </>
          ) : (
            <>
              {/* VISTA DE CAPTURA DE DETALLES */}
              <div className="docs-toolbar no-print">
                <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
                  <button className="btn-outline" onClick={() => { setSelectedDoc(null); loadDocumentos(selectedLote.id_comprobante); }}>&larr; Volver / Nuevo Doc</button>
                  <button className="btn-outline" onClick={() => window.print()}>🖨️ Imprimir</button>
                  <h2>Capturando: {selectedDoc.tipo_codigo}-{selectedDoc.numero_doc}</h2>
                  {plantillas.length > 0 && (
                    <select className="mod-input" style={{marginLeft:'20px'}} onChange={(e) => {
                      if(e.target.value) { aplicarPlantilla(e.target.value); e.target.value=''; }
                    }}>
                      <option value="">🪄 Cargar Plantilla...</option>
                      {plantillas.map(p => <option key={p.id_plantilla} value={p.id_plantilla}>{p.nombre}</option>)}
                    </select>
                  )}
                </div>
                <div style={{display:'flex', gap:'20px'}}>
                  <div className="amt-box">
                    <span className="lbl">DÉBITOS DOC:</span>
                    <span className="val" style={{color:'#0284c7'}}>{formatMoney(totalDebitoDoc)}</span>
                  </div>
                  <div className="amt-box">
                    <span className="lbl">CRÉDITOS DOC:</span>
                    <span className="val" style={{color:'#c2410c'}}>{formatMoney(totalCreditoDoc)}</span>
                  </div>
                  <div className={`amt-box diff ${diff !== 0 ? 'error' : 'ok'}`} style={{flexDirection:'row', gap:'12px', alignItems:'center', borderLeft:'2px solid #e2e8f0', paddingLeft:'20px'}}>
                    <span className="lbl">DIFERENCIA:</span>
                    <span className="val">{formatMoney(diff)}</span>
                    {diff === 0 && detalles.length > 0 && <span className="badge" style={{background:'#16a34a', color:'white', padding:'4px 8px', borderRadius:'4px', fontSize:'11px', fontWeight:'bold'}}>¡CUADRADO!</span>}
                  </div>
                </div>
              </div>

              {/* Cabecera solo para impresión */}
              <div className="print-only">
                <h2 style={{borderBottom:'2px solid #000', paddingBottom:'10px'}}>COMPROBANTE CONTABLE</h2>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px', fontSize:'14px'}}>
                  <div>
                    <strong>Finca:</strong> {fincas.find(f=>f.id_finca==filtro.id_finca)?.nombre}<br/>
                    <strong>Documento:</strong> {selectedDoc.tipo_codigo} - {selectedDoc.numero_doc}<br/>
                    <strong>Concepto:</strong> {selectedDoc.concepto}
                  </div>
                  <div style={{textAlign:'right'}}>
                    <strong>Fecha:</strong> {new Date(selectedDoc.fecha).toLocaleDateString()}<br/>
                    <strong>Estado:</strong> {diff === 0 ? 'Cuadrado' : 'Descuadrado'}
                  </div>
                </div>
              </div>
              
              <div className="doc-body" style={{flex:1, overflowY:'auto', padding: '0 20px 20px 20px'}}>
                <style>{`
                  .excel-grid { width: 100%; border-collapse: collapse; font-size: 12px; background: var(--bg-main); }
                  .excel-grid th { background: var(--card-bg); color: var(--text-muted); padding: 8px; border: 1px solid var(--border); text-align: left; font-weight: 600; }
                  .excel-grid td { padding: 0; border: 1px solid var(--border); position: relative; height: 36px; }
                  .excel-input { width: 100%; height: 100%; border: none; background: transparent; padding: 4px 8px; color: var(--text); outline: none; }
                  .excel-input:focus { background: #1e293b; box-shadow: inset 0 0 0 2px #3b82f6; }
                  .excel-grid td.focused { box-shadow: inset 0 0 0 2px #3b82f6; }
                  .excel-select .ant-select-selector { border: none !important; background: transparent !important; box-shadow: none !important; height: 34px !important; padding-top: 2px !important; }
                  .excel-select.ant-select-focused .ant-select-selector { background: #1e293b !important; }
                  .excel-row:hover td { background: var(--card-bg); }
                `}</style>
                <table className="excel-grid">
                  <thead>
                    <tr>
                      <th style={{width: '25%'}}>Cuenta (F2 para buscar)</th>
                      <th style={{width: '15%'}}>Tercero</th>
                      <th style={{width: '15%'}}>C. Costo</th>
                      <th style={{width: '20%'}}>Concepto</th>
                      <th style={{width: '10%'}}>Débito</th>
                      <th style={{width: '10%'}}>Crédito</th>
                      <th style={{width: '5%', textAlign: 'center'}}>X</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.map(d => (
                      <tr key={d.id_detalle} className="excel-row">
                        <td style={{padding: '4px 8px'}}>
                          <strong>{d.cuenta_codigo}</strong> - <span style={{color:'var(--text-muted)'}}>{d.cuenta_nombre}</span>
                        </td>
                        <td style={{padding: '4px 8px', fontSize: '11px'}}>{d.tercero_nit || '-'}</td>
                        <td style={{padding: '4px 8px', fontSize: '11px'}}>{d.cc_codigo || '-'}</td>
                        <td style={{padding: '4px 8px'}}>{d.descripcion}</td>
                        <td className="val-deb" onClick={() => !isPeriodClosed && setEditCell({id: d.id_detalle, field: 'debito', val: d.debito})}>
                          {editCell?.id === d.id_detalle && editCell?.field === 'debito' ? (
                            <input autoFocus type="number" className="excel-input"
                              value={editCell.val} 
                              onChange={e=>setEditCell({...editCell, val:e.target.value})}
                              onBlur={()=>saveCellValue(d.id_detalle, 'debito', editCell.val)}
                              onKeyDown={e=>{if(e.key==='Enter') saveCellValue(d.id_detalle, 'debito', editCell.val)}}
                            />
                          ) : (
                            <div style={{padding: '4px 8px', textAlign: 'right', cursor: 'pointer', color: d.debito > 0 ? '#10b981' : 'inherit'}}>{d.debito > 0 ? formatMoney(d.debito) : ''}</div>
                          )}
                        </td>
                        <td className="val-cred" onClick={() => !isPeriodClosed && setEditCell({id: d.id_detalle, field: 'credito', val: d.credito})}>
                          {editCell?.id === d.id_detalle && editCell?.field === 'credito' ? (
                            <input autoFocus type="number" className="excel-input"
                              value={editCell.val} 
                              onChange={e=>setEditCell({...editCell, val:e.target.value})}
                              onBlur={()=>saveCellValue(d.id_detalle, 'credito', editCell.val)}
                              onKeyDown={e=>{if(e.key==='Enter') saveCellValue(d.id_detalle, 'credito', editCell.val)}}
                            />
                          ) : (
                            <div style={{padding: '4px 8px', textAlign: 'right', cursor: 'pointer', color: d.credito > 0 ? '#ef4444' : 'inherit'}}>{d.credito > 0 ? formatMoney(d.credito) : ''}</div>
                          )}
                        </td>
                        <td style={{textAlign: 'center'}}>
                          <button className="btn-icon del" onClick={()=>handleDeleteDetalle(d.id_detalle)} disabled={isPeriodClosed} style={{margin: '0 auto', display: 'block'}}>✕</button>
                        </td>
                      </tr>
                    ))}
                    
                    {/* FILA DE CAPTURA (NUEVA LÍNEA) */}
                    {!isPeriodClosed && (
                      <tr className="excel-row">
                        <td>
                          <Select
                            showSearch
                            optionFilterProp="children"
                            value={formDet.id_cuenta || undefined}
                            onChange={(val) => {
                              const c = cuentas.find(x => x.id_cuenta === val);
                              if(c) {
                                setSelectedCuenta(c);
                                setFormDet({...formDet, id_cuenta: c.id_cuenta, descripcion: c.nombre});
                                setTimeout(() => {
                                  if (c.naturaleza === 'Debito' && debitRef.current) debitRef.current.focus();
                                  if (c.naturaleza === 'Credito' && creditRef.current) creditRef.current.focus();
                                }, 50);
                              } else {
                                setSelectedCuenta(null);
                                setFormDet({...formDet, id_cuenta: '', descripcion: ''});
                              }
                            }}
                            className="w-full dark-select excel-select"
                            placeholder="Buscar cuenta..."
                            style={{width: '100%'}}
                            filterOption={(input, option) => 
                              (option?.children ?? '').toLowerCase().includes(input.toLowerCase()) ||
                              (option?.value ?? '').toString().toLowerCase().includes(input.toLowerCase())
                            }
                          >
                            {cuentas.filter(c => c.nivel === 5).map(c => (
                              <Option key={c.id_cuenta} value={c.id_cuenta}>{c.codigo} - {c.nombre}</Option>
                            ))}
                          </Select>
                        </td>
                        <td>
                          <Select 
                            showSearch
                            optionFilterProp="children"
                            className={`w-full dark-select excel-select ${selectedCuenta?.requiere_tercero ? 'required-select' : ''}`}
                            value={formDet.id_tercero || undefined} 
                            onChange={val=>setFormDet({...formDet, id_tercero:val || ''})}
                            disabled={!selectedCuenta?.requiere_tercero}
                            placeholder={selectedCuenta?.requiere_tercero ? "Requerido..." : ""}
                            allowClear
                            style={{width: '100%'}}
                          >
                            {terceros.map(t => <Option key={t.id_tercero} value={t.id_tercero}>{t.numero_identificacion} - {t.razon_social}</Option>)}
                          </Select>
                        </td>
                        <td>
                          <Select 
                            showSearch
                            optionFilterProp="children"
                            className={`w-full dark-select excel-select ${selectedCuenta?.requiere_centro_costo ? 'required-select' : ''}`}
                            value={formDet.id_centro_costo || undefined} 
                            onChange={val=>setFormDet({...formDet, id_centro_costo:val || ''})}
                            disabled={!selectedCuenta?.requiere_centro_costo}
                            placeholder={selectedCuenta?.requiere_centro_costo ? "Requerido..." : ""}
                            allowClear
                            style={{width: '100%'}}
                          >
                            {centros.map(c => <Option key={c.id_centro_costo} value={c.id_centro_costo}>{c.codigo} - {c.nombre}</Option>)}
                          </Select>
                        </td>
                        <td>
                          <input type="text" className="excel-input" value={formDet.descripcion} onChange={e=>setFormDet({...formDet, descripcion:e.target.value})} placeholder="Detalle (opcional)" />
                        </td>
                        <td>
                          <input type="number" ref={debitRef} className="excel-input" style={{textAlign: 'right'}} placeholder="$ 0" value={formDet.debito} onChange={e=>setFormDet({...formDet, debito:e.target.value, credito: e.target.value>0?0:formDet.credito})} onKeyDown={e=>{if(e.key==='Enter') handleAddDetalle()}} />
                        </td>
                        <td>
                          <input type="number" ref={creditRef} className="excel-input" style={{textAlign: 'right'}} placeholder="$ 0" value={formDet.credito} onChange={e=>setFormDet({...formDet, credito:e.target.value, debito: e.target.value>0?0:formDet.debito})} onKeyDown={e=>{if(e.key==='Enter') handleAddDetalle()}} />
                        </td>
                        <td style={{textAlign: 'center'}}>
                          <button className="btn-primary" style={{padding: '4px 8px', fontSize: '10px'}} onClick={handleAddDetalle}>&crarr;</button>
                        </td>
                      </tr>
                    )}
                    {/* Fila de Totales */}
                    <tr style={{background: 'var(--bg-main)'}}>
                      <td colSpan="4" style={{textAlign: 'right', padding: '8px', fontWeight: 'bold'}}>TOTALES:</td>
                      <td style={{textAlign: 'right', padding: '8px', fontWeight: 'bold', color: '#10b981'}}>{formatMoney(totalDebitoDoc)}</td>
                      <td style={{textAlign: 'right', padding: '8px', fontWeight: 'bold', color: '#ef4444'}}>{formatMoney(totalCreditoDoc)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CapturadorContable;
