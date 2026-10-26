import React, { useState, useEffect } from 'react';
import DatePickerClaro from '../Common/DatePickerClaro';
import { message } from 'antd';
import Select from 'react-select';
import { authFetch } from '../../utils/api';
import { getJsPDFConstructor, runAutoTable, downloadPdfDoc } from '../../utils/exportPdf';


export default function ControlContratos({ tenantId, fincaId }) {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [yaBuscado, setYaBuscado] = useState(false);
  
  const [empleados, setEmpleados] = useState([]);
  const [lotes, setLotes] = useState([]);
  
  // Modal Único con Pestañas
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('datos'); 
  const [selectedContrato, setSelectedContrato] = useState(null);
  
  // Estado para Pagos
  const [pagos, setPagos] = useState([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [nuevoPago, setNuevoPago] = useState({
    fecha_pago: new Date().toISOString().split('T')[0],
    monto: '',
    tipo_pago: 'Parcial',
    observaciones: ''
  });
  const [savingPago, setSavingPago] = useState(false);

  // Filtros Avanzados
  const [filtroResponsable, setFiltroResponsable] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [formData, setFormData] = useState({
    nombre_obra: '',
    categoria: 'Cosechas',
    valor_total: '',
    finca_id: fincaId || '',
    id_lote: '',
    ubicacion_detalle: '',
    id_responsable: '',
    id_director: '', // Nuevo campo
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '',
    observaciones: '',
    estado: 'Activo'
  });

  const categoriasCompletas = [
    'Agricolas','Ganaderas','Acuicola','Bioles','Semillero','Vias','Jardines','Cosechas','Finca','Otros',
    'Plateo', 'Poda', 'Siembra', 'Mantenimiento Drenajes', 'Sanidad Vegetal', 'Fertilización', 'Mantenimiento de Vías'
  ];
  
  const estadosContrato = ['Activo', 'Suspendido', 'Finalizado', 'Liquidado', 'Cancelado'];

  useEffect(() => {
    fetchCatalogos();
  }, [tenantId, fincaId]);

  const fetchCatalogos = async () => {
    try {
      const tid = tenantId || 1;
      const resE = await authFetch(`/api/rrhh/empleados?tenantId=${tid}`);
      const dataE = await resE.json();
      setEmpleados(Array.isArray(dataE) ? dataE : []);

      const resR = await authFetch(`/api/cuadrilla/recursos?tenantId=${tid}`);
      if (resR.ok) {
        const rec = await resR.json();
        setLotes(rec.lotes || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchContratos = async () => {
    setLoading(true);
    setYaBuscado(true);
    try {
      const tid = tenantId || 1;
      let url = `/api/rrhh/contratos?tenantId=${tid}`;
      if (fincaId) url += `&fincaId=${fincaId}`;
      if (filtroResponsable) url += `&responsableId=${filtroResponsable}`;
      if (filtroCategoria !== 'Todas') url += `&categoria=${filtroCategoria}`;
      if (filtroEstado !== 'Todos') url += `&estado=${filtroEstado}`;
      if (fechaDesde) url += `&fechaDesde=${fechaDesde}`;
      if (fechaHasta) url += `&fechaHasta=${fechaHasta}`;

      const res = await authFetch(url);
      const data = await res.json();
      setContratos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      message.error('Error al cargar contratos');
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setSelectedContrato(null);
    setActiveTab('datos');
    setFormData({
      nombre_obra: '', categoria: 'Cosechas', valor_total: '', finca_id: fincaId || '',
      id_lote: '', ubicacion_detalle: '', id_responsable: '', id_director: '', fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: '', observaciones: '', estado: 'Activo'
    });
    setShowModal(true);
  };

  const openEditModal = (c, tab = 'datos') => {
    setEditingId(c.id_contrato);
    setSelectedContrato(c);
    setActiveTab(tab);
    setFormData({
      nombre_obra: c.nombre_obra || '', categoria: c.categoria || 'Cosechas', valor_total: c.valor_total || '',
      finca_id: c.id_finca || '', id_lote: c.id_lote || '', ubicacion_detalle: c.ubicacion_detalle || '',
      id_responsable: c.id_responsable || '', id_director: c.id_director || '', fecha_inicio: c.fecha_inicio ? c.fecha_inicio.substring(0, 10) : '',
      fecha_fin: c.fecha_fin ? c.fecha_fin.substring(0, 10) : '', observaciones: c.observaciones || '', estado: c.estado || 'Activo'
    });
    
    if (tab === 'pagos') {
      loadPagos(c.id_contrato);
      setNuevoPago({ fecha_pago: new Date().toISOString().split('T')[0], monto: '', tipo_pago: 'Parcial', observaciones: '' });
    }
    
    setShowModal(true);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'pagos' && editingId) {
      loadPagos(editingId);
      setNuevoPago({ fecha_pago: new Date().toISOString().split('T')[0], monto: '', tipo_pago: 'Parcial', observaciones: '' });
    }
  };

  const handleSaveContrato = async () => {
    if (!formData.nombre_obra || !formData.categoria) return message.error('Nombre y Categoría obligatorios');
    try {
      const url = editingId ? `/api/rrhh/contratos/${editingId}` : '/api/rrhh/contratos';
      const method = editingId ? 'PUT' : 'POST';
      const payload = { ...formData, tenantId: tenantId || 1 };
      
      const res = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Error al guardar el contrato');
      
      message.success(`Contrato guardado correctamente`);
      setShowModal(false);
      if (yaBuscado) fetchContratos();
    } catch (e) {
      message.error(e.message);
    }
  };

  const loadPagos = async (id_contrato) => {
    setLoadingPagos(true);
    try {
      const res = await authFetch(`/api/rrhh/contratos/${id_contrato}/pagos`);
      const data = await res.json();
      setPagos(Array.isArray(data) ? data : []);
    } catch (e) {
      message.error('Error al cargar pagos');
    } finally {
      setLoadingPagos(false);
    }
  };

  const handleSavePago = async () => {
    if (!nuevoPago.monto || nuevoPago.monto <= 0) return message.error('Ingrese un monto válido');
    setSavingPago(true);
    try {
      const payload = { ...nuevoPago, tenantId: tenantId || 1, id_contrato: editingId };
      const res = await authFetch('/api/rrhh/contratos/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Error al registrar pago');
      
      message.success('Abono registrado y asiento contable generado');
      loadPagos(editingId);
      if (yaBuscado) fetchContratos();
      
      const resData = await res.json();
      setSelectedContrato({
        ...selectedContrato,
        total_abonado: resData.nuevoAbonado,
        saldo_pendiente: resData.nuevoSaldo
      });
      setNuevoPago({ ...nuevoPago, monto: '', observaciones: '' });
    } catch (e) {
      message.error(e.message);
    } finally {
      setSavingPago(false);
    }
  };

  // Generador de Contrato Legal en PDF
  const exportPDF = () => {
    if (!selectedContrato) return;
    const doc = new (getJsPDFConstructor())();
    
    // Configuración general
    const margenIzq = 20;
    let y = 20;

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('CONTRATO DE OBRA O LABOR DETERMINADA', 105, y, { align: 'center' });
    y += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Documento generado el: ${new Date().toLocaleDateString()}`, 105, y, { align: 'center' });
    y += 15;

    // Partes Involucradas
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.setFontSize(11);
    
    const textoPartes = `Entre los suscritos, por una parte AgroPaccioli (en adelante EL CONTRATANTE), y por la otra ${selectedContrato.responsable_nombre || '_______________________'} (en adelante EL CONTRATISTA), se ha celebrado el presente CONTRATO DE OBRA O LABOR DETERMINADA, el cual se regirá por las siguientes cláusulas:`;
    
    const splitPartes = doc.splitTextToSize(textoPartes, 170);
    doc.text(splitPartes, margenIzq, y);
    y += (splitPartes.length * 5) + 10;

    // Cláusulas
    doc.setFont('helvetica', 'bold');
    doc.text('PRIMERA. Objeto del Contrato:', margenIzq, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
    const objText = `EL CONTRATISTA se obliga a ejecutar la labor denominada "${selectedContrato.nombre_obra}" clasificada en la categoría de "${selectedContrato.categoria}".`;
    doc.text(doc.splitTextToSize(objText, 170), margenIzq, y);
    y += 12;

    doc.setFont('helvetica', 'bold');
    doc.text('SEGUNDA. Lugar de Ejecución:', margenIzq, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
    const lugarText = `Las labores se llevarán a cabo en ${selectedContrato.finca_nombre || 'la sede principal'}, en la ubicación específica: ${selectedContrato.lote_nombre || selectedContrato.ubicacion_detalle || 'General'}.`;
    doc.text(doc.splitTextToSize(lugarText, 170), margenIzq, y);
    y += 12;

    doc.setFont('helvetica', 'bold');
    doc.text('TERCERA. Valor y Forma de Pago:', margenIzq, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
    const valorText = `El valor total acordado para la ejecución de la labor es de $${Number(selectedContrato.valor_total).toLocaleString()} COP. A la fecha de este documento se registra un total abonado de $${Number(selectedContrato.total_abonado).toLocaleString()} COP.`;
    doc.text(doc.splitTextToSize(valorText, 170), margenIzq, y);
    y += 12;

    doc.setFont('helvetica', 'bold');
    doc.text('CUARTA. Director o Supervisor:', margenIzq, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
    const directorText = `La obra será supervisada y recibida a satisfacción por el Director de Destino: ${selectedContrato.director_nombre || '_______________________'}.`;
    doc.text(doc.splitTextToSize(directorText, 170), margenIzq, y);
    y += 12;

    // Tabla de Pagos
    if (pagos.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Historial de Pagos y Abonos Registrados:', margenIzq, y);
      y += 5;
      
      const tableData = pagos.map(p => [
        p.fecha_pago.substring(0, 10),
        p.tipo_pago,
        `$${Number(p.monto).toLocaleString()}`,
        p.id_asiento ? `Comprobante #${p.id_asiento}` : 'N/A'
      ]);

      runAutoTable(doc, {
        startY: y,
        head: [['Fecha', 'Tipo', 'Monto (COP)', 'Asiento Contable']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: margenIzq, right: margenIzq }
      });
      
      y = doc.lastAutoTable.finalY + 15;
    } else {
      doc.text('No hay abonos registrados para este contrato a la fecha.', margenIzq, y);
      y += 15;
    }

    // Firmas
    if (y > 230) {
      doc.addPage();
      y = 30;
    }

    doc.line(margenIzq, y + 20, margenIzq + 60, y + 20); // Firma contratante
    doc.line(margenIzq + 90, y + 20, margenIzq + 150, y + 20); // Firma contratista

    doc.setFontSize(10);
    doc.text('_______________________', margenIzq, y + 20);
    doc.text('EL CONTRATANTE', margenIzq, y + 25);
    doc.text('Firma y Sello', margenIzq, y + 30);

    doc.text('_______________________', margenIzq + 90, y + 20);
    doc.text('EL CONTRATISTA', margenIzq + 90, y + 25);
    doc.text(selectedContrato.responsable_nombre || '', margenIzq + 90, y + 30);

    downloadPdfDoc(doc, `Contrato_${selectedContrato.nombre_obra.replace(/\s+/g, '_')}.pdf`);
    message.success('Contrato legal generado exitosamente en PDF.');
  };

  const sendWhatsApp = () => {
    if (!selectedContrato) return;
    const { responsable_nombre, director_nombre, nombre_obra, saldo_pendiente, valor_total, total_abonado } = selectedContrato;
    
    let text = `*AgroPaccioli - Detalle de Contrato*\n\n`;
    text += `🚜 *Obra/Labor:* ${nombre_obra}\n`;
    text += `👷 *Contratista:* ${responsable_nombre || 'N/A'}\n`;
    if (director_nombre) text += `👨‍💼 *Director de Destino:* ${director_nombre}\n`;
    text += `\n💰 *Valor Total:* $${Number(valor_total).toLocaleString()}\n`;
    text += `💵 *Abonado a la fecha:* $${Number(total_abonado).toLocaleString()}\n`;
    text += `📉 *Saldo Pendiente:* $${Number(saldo_pendiente).toLocaleString()}\n\n`;
    text += `Cualquier duda, por favor comunicarse con el Director de Destino.`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    message.success(`Abriendo WhatsApp Web para enviar notificación...`);
  };

  const contratosFiltrados = contratos.filter(c => {
    if (!busqueda) return true;
    const b = busqueda.toLowerCase();
    return (c.nombre_obra || '').toLowerCase().includes(b) || (c.responsable_nombre || '').toLowerCase().includes(b);
  });

  const selectStyles = { control: (base) => ({ ...base, borderRadius: '8px', minHeight: '38px' }) };
  
  // Mapeo seguro de empleados para react-select
  const empleadosOptions = empleados.map(e => ({ 
    value: e.id_empleado, 
    label: `${e.documento || e.t_documento || ''} - ${e.nombre_completo || e.nombres || ''}`.trim() 
  }));

  return (
    <div className="catalog-container">
      <div className="catalog-header print:hidden">
        <h2>🤝 Control de Contratos Agroindustriales</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={openNewModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>+</span> Nuevo Contrato
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="print:hidden" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <span style={{ fontSize: '18px' }}>🔍</span>
          <h3 style={{ margin: 0, fontSize: '15px', color: '#334155' }}>Filtros de Contratos</h3>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Búsqueda Textual</label>
            <input type="text" placeholder="Obra o responsable..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Responsable / Contratista</label>
            <Select 
              options={empleadosOptions}
              value={filtroResponsable ? empleadosOptions.find(o => o.value === filtroResponsable) : null}
              onChange={sel => setFiltroResponsable(sel ? sel.value : '')}
              isClearable
              placeholder="Buscar responsable..."
              styles={selectStyles}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Categoría de Labor</label>
            <select value={filtroCategoria} onChange={e=>setFiltroCategoria(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}>
              <option value="Todas">Todas</option>
              {categoriasCompletas.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Rango Inicio</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <DatePickerClaro value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              <DatePickerClaro value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
          <button onClick={fetchContratos} className="btn btn-primary" style={{ padding: '10px 24px', fontWeight: 'bold', fontSize: '14px', background: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚙️</span> {loading ? 'Cargando...' : 'Procesar / Consultar'}
          </button>
        </div>
      </div>

      {!yaBuscado && !loading ? (
        <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', color: '#64748b' }}>
          👆 Presione <strong>Procesar / Consultar</strong> para cargar la lista de contratos.
        </div>
      ) : loading ? (
        <div className="loading-container"><div className="spinner"></div><span className="loading-text">Cargando contratos...</span></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
          {contratosFiltrados.length === 0 ? (
             <p style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', color: '#64748b', background: 'white', borderRadius: '12px' }}>No hay contratos registrados con estos filtros.</p>
          ) : (
            contratosFiltrados.map(c => {
              const progreso = (Number(c.valor_total) > 0) ? (Number(c.total_abonado) / Number(c.valor_total)) * 100 : 0;
              return (
                <div key={c.id_contrato} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>{c.nombre_obra}</h3>
                      <span style={{ fontSize: '11px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#475569', fontWeight: 'bold' }}>{c.categoria}</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '12px', background: c.estado === 'Activo' ? '#dcfce7' : '#f1f5f9', color: c.estado === 'Activo' ? '#166534' : '#475569' }}>
                      {c.estado}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '13px', color: '#334155' }}>
                    <strong>Contratista:</strong> {c.responsable_nombre || 'No asignado'}<br/>
                    <strong>Director Destino:</strong> {c.director_nombre || 'No asignado'}<br/>
                    <strong>Ubicación:</strong> {c.lote_nombre || c.ubicacion_detalle || 'General'}<br/>
                    <strong>Fechas:</strong> {c.fecha_inicio ? c.fecha_inicio.substring(0,10) : 'N/A'} al {c.fecha_fin ? c.fecha_fin.substring(0,10) : 'N/A'}
                  </div>

                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ color: '#64748b' }}>Valor Total:</span>
                      <strong style={{ color: '#0f172a' }}>${Number(c.valor_total).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ color: '#64748b' }}>Abonado:</span>
                      <strong style={{ color: '#10b981' }}>${Number(c.total_abonado).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                      <span style={{ color: '#64748b', fontWeight: 'bold' }}>Saldo:</span>
                      <strong style={{ color: '#ef4444' }}>${Number(c.saldo_pendiente).toLocaleString()}</strong>
                    </div>
                    
                    <div style={{ height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(progreso, 100)}%`, background: '#3b82f6', transition: 'width 0.3s' }}></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button onClick={() => openEditModal(c, 'pagos')} style={{ flex: 2, background: '#10b981', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                      💰 Ver/Registrar Pagos
                    </button>
                    <button onClick={() => openEditModal(c, 'datos')} style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                      ✏️ Editar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL ÚNICO CON PESTAÑAS (DATOS Y PAGOS) */}
      {showModal && (
        <div style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(15, 23, 42, 0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding: '20px' }}>
          <div style={{ background:'white', borderRadius:'12px', width:'100%', maxWidth: activeTab === 'pagos' ? '800px' : '650px', maxHeight:'90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'max-width 0.3s ease' }}>
            
            {/* Header del Modal */}
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '20px' }}>
                {editingId ? `Gestión de Contrato: ${formData.nombre_obra || 'Sin nombre'}` : 'Crear Nuevo Contrato'}
              </h3>
              
              {editingId && activeTab === 'pagos' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={exportPDF} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>📄 Descargar PDF Oficial</button>
                  <button onClick={sendWhatsApp} style={{ background: '#25D366', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>💬 Enviar WhatsApp</button>
                </div>
              )}
            </div>

            {/* Pestañas */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <button 
                onClick={() => handleTabChange('datos')}
                style={{ flex: 1, padding: '12px', border: 'none', background: activeTab === 'datos' ? 'white' : 'transparent', borderBottom: activeTab === 'datos' ? '2px solid #3b82f6' : '2px solid transparent', fontWeight: 'bold', color: activeTab === 'datos' ? '#3b82f6' : '#64748b', cursor: 'pointer' }}
              >
                📝 Datos del Contrato
              </button>
              <button 
                onClick={() => handleTabChange('pagos')}
                disabled={!editingId}
                style={{ flex: 1, padding: '12px', border: 'none', background: activeTab === 'pagos' ? 'white' : 'transparent', borderBottom: activeTab === 'pagos' ? '2px solid #10b981' : '2px solid transparent', fontWeight: 'bold', color: activeTab === 'pagos' ? '#10b981' : '#64748b', cursor: !editingId ? 'not-allowed' : 'pointer', opacity: !editingId ? 0.5 : 1 }}
                title={!editingId ? "Guarde el contrato primero para registrar pagos" : ""}
              >
                💰 Control de Abonos y Pagos
              </button>
            </div>

            {/* Contenido Desplazable */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              
              {/* PESTAÑA 1: DATOS */}
              {activeTab === 'datos' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Nombre de la Labor/Obra</label>
                    <input type="text" value={formData.nombre_obra} onChange={e=>setFormData({...formData, nombre_obra:e.target.value})} style={{ width:'100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Categoría de Labor</label>
                    <select value={formData.categoria} onChange={e=>setFormData({...formData, categoria:e.target.value})} style={{ width:'100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      {categoriasCompletas.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Valor Total del Contrato ($)</label>
                    <input type="number" value={formData.valor_total} onChange={e=>setFormData({...formData, valor_total:e.target.value})} style={{ width:'100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>

                  <div style={{ gridColumn: '1 / -1', background: '#f1f5f9', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#1e293b' }}>Responsable / Contratista Principal</label>
                      <Select 
                        options={empleadosOptions}
                        value={formData.id_responsable ? empleadosOptions.find(o => o.value === formData.id_responsable) : null}
                        onChange={sel => setFormData({...formData, id_responsable: sel ? sel.value : ''})}
                        isClearable
                        placeholder="Buscar Contratista..."
                        styles={selectStyles}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#0f766e' }}>Director de Destino / Supervisor</label>
                      <Select 
                        options={empleadosOptions}
                        value={formData.id_director ? empleadosOptions.find(o => o.value === formData.id_director) : null}
                        onChange={sel => setFormData({...formData, id_director: sel ? sel.value : ''})}
                        isClearable
                        placeholder="Buscar Director..."
                        styles={selectStyles}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Fecha de Inicio</label>
                    <DatePickerClaro value={formData.fecha_inicio} onChange={e=>setFormData({...formData, fecha_inicio:e.target.value})} style={{ width:'100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Fecha Fin / Entrega</label>
                    <DatePickerClaro value={formData.fecha_fin} onChange={e=>setFormData({...formData, fecha_fin:e.target.value})} style={{ width:'100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                     <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Observaciones / Condiciones Específicas</label>
                     <textarea value={formData.observaciones} onChange={e=>setFormData({...formData, observaciones:e.target.value})} rows="2" style={{ width:'100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: PAGOS Y ABONOS */}
              {activeTab === 'pagos' && selectedContrato && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
                  
                  {/* Columna Izquierda: Formulario de Pago */}
                  <div>
                    {Number(selectedContrato.saldo_pendiente) <= 0 ? (
                      <div style={{ background: '#dcfce7', padding: '20px', borderRadius: '12px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#166534' }}>✅ Contrato Pagado</h4>
                        <p style={{ margin: 0, color: '#15803d', fontSize: '13px' }}>El saldo de este contrato es $0. No se pueden registrar más abonos.</p>
                      </div>
                    ) : (
                      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 16px 0', color: '#334155' }}>Registrar Nuevo Abono</h4>
                        
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Fecha de Pago</label>
                          <DatePickerClaro value={nuevoPago.fecha_pago} onChange={e=>setNuevoPago({...nuevoPago, fecha_pago: e.target.value})} style={{ width:'100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Monto ($ COP)</label>
                          <input type="number" value={nuevoPago.monto} onChange={e=>{
                            const val = e.target.value;
                            let tipo = 'Parcial';
                            if (Number(val) >= Number(selectedContrato.saldo_pendiente)) tipo = 'Liquidacion Final';
                            setNuevoPago({...nuevoPago, monto: val, tipo_pago: tipo});
                          }} placeholder={`Máx: ${Number(selectedContrato.saldo_pendiente)}`} style={{ width:'100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '16px', fontWeight: 'bold', color: '#10b981' }} />
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Tipo de Pago</label>
                          <select value={nuevoPago.tipo_pago} onChange={e=>setNuevoPago({...nuevoPago, tipo_pago: e.target.value})} style={{ width:'100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            <option value="Anticipo">Anticipo</option>
                            <option value="Parcial">Abono Parcial</option>
                            <option value="Liquidacion Final">Liquidación Final</option>
                          </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>Observaciones</label>
                          <textarea rows="2" value={nuevoPago.observaciones} onChange={e=>setNuevoPago({...nuevoPago, observaciones: e.target.value})} style={{ width:'100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'none' }} />
                        </div>

                        <button onClick={handleSavePago} disabled={savingPago} style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: savingPago ? 'not-allowed' : 'pointer' }}>
                          {savingPago ? 'Registrando...' : '💳 Registrar en Contabilidad'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Columna Derecha: Historial y Saldos */}
                  <div>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', padding: '12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                       <div>
                         <span style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 'bold', display: 'block' }}>VALOR TOTAL</span>
                         <span style={{ fontSize: '16px', color: '#1e3a8a', fontWeight: 'bold' }}>${Number(selectedContrato.valor_total).toLocaleString()}</span>
                       </div>
                       <div style={{ borderLeft: '1px solid #93c5fd', paddingLeft: '16px' }}>
                         <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold', display: 'block' }}>TOTAL ABONADO</span>
                         <span style={{ fontSize: '16px', color: '#065f46', fontWeight: 'bold' }}>${Number(selectedContrato.total_abonado).toLocaleString()}</span>
                       </div>
                       <div style={{ borderLeft: '1px solid #93c5fd', paddingLeft: '16px' }}>
                         <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold', display: 'block' }}>SALDO PENDIENTE</span>
                         <span style={{ fontSize: '16px', color: '#991b1b', fontWeight: 'bold' }}>${Number(selectedContrato.saldo_pendiente).toLocaleString()}</span>
                       </div>
                    </div>

                    <h4 style={{ margin: '0 0 12px 0', color: '#334155' }}>Historial de Abonos Registrados</h4>
                    {loadingPagos ? (
                      <p>Cargando historial...</p>
                    ) : pagos.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', color: '#94a3b8' }}>
                        No hay abonos registrados para este contrato.
                      </div>
                    ) : (
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                              <th style={{ padding: '8px' }}>Fecha</th>
                              <th style={{ padding: '8px' }}>Tipo</th>
                              <th style={{ padding: '8px' }}>Monto</th>
                              <th style={{ padding: '8px' }}>Asiento</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pagos.map(p => (
                              <tr key={p.id_pago} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '10px 8px', color: '#334155' }}>{p.fecha_pago.substring(0,10)}</td>
                                <td style={{ padding: '10px 8px' }}>
                                  <span style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{p.tipo_pago}</span>
                                </td>
                                <td style={{ padding: '10px 8px', fontWeight: 'bold', color: '#10b981' }}>
                                  ${Number(p.monto).toLocaleString()}
                                </td>
                                <td style={{ padding: '10px 8px', color: '#64748b' }}>
                                  {p.id_asiento ? `#AS-${p.id_asiento}` : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-outline" style={{ background: 'white' }}>Cerrar</button>
              {activeTab === 'datos' && (
                <button onClick={handleSaveContrato} className="btn btn-primary" style={{ background: '#3b82f6', color: 'white', border: 'none' }}>
                  {editingId ? 'Guardar Cambios' : 'Crear Contrato'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
