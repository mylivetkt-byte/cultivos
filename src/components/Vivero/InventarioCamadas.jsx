import React, { useState, useEffect } from 'react';
import DatePickerClaro from '../Common/DatePickerClaro';
import { authFetch, API_BASE } from '../../utils/api.js';
import { formatCurrency } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { Select, ConfigProvider, theme } from 'antd';
import { getJsPDFConstructor, runAutoTable, downloadPdfDoc } from '../../utils/exportPdf';

import * as XLSX from 'xlsx';
import { downloadExcelWorkbook } from '../../utils/exportExcel';
import './InventarioCamadas.css';

export default function InventarioCamadas({ tenantId = 1 }) {
  const [inventario, setInventario] = useState([]);
  const [camadas, setCamadas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [activeTab, setActiveTab] = useState('inventario');
  const [hasSearchedMovimientos, setHasSearchedMovimientos] = useState(false);
  
  // Vivero & Lotes selection state
  const [viverosList, setViverosList] = useState([]);
  const [lotesList, setLotesList] = useState([]);
  const [selectedVivero, setSelectedVivero] = useState('Todos');

  // Bodega state
  const [showBodegaModal, setShowBodegaModal] = useState(false);
  const [bodegaInsumos, setBodegaInsumos] = useState([]);
  const [bodegaForm, setBodegaForm] = useState({ id_insumo: '', cantidad: '', id_empleado: '', observaciones: '' });
  const [logoBase64, setLogoBase64] = useState(null);

  const { user } = useAuth();

  // Filters state
  const [filters, setFilters] = useState({
    fechaInicio: '',
    fechaFin: '',
    idSemilla: '',
    idEmpleado: ''
  });

  // Form states
  const [showInvModal, setShowInvModal] = useState(false);
  const [invForm, setInvForm] = useState({ tipo: 'Semilla', nombre: '', proveedor: '', cantidad: '', unidad: '', costo: '', id_vivero: '' });

  const [showMovModal, setShowMovModal] = useState(false);
  const [movForm, setMovForm] = useState({ id_camada: '', tipo_movimiento: 'Salida_Siembra', cantidad: 0, precio_venta_total: 0, id_empleado: '', id_empleado_recibe: '', observaciones: '' });

  // Helper to add Company Header to PDF
  const addPdfHeader = (doc, title) => {
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 165, 8, 30, 20); // Top Right corner
      } catch (e) {
        try { doc.addImage(logoBase64, 'JPEG', 165, 8, 30, 20); } catch (err) { console.warn(err); }
      }
    }
    
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('AGROPECUARIA LLANOS ORIENTALES S.A.S.', 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('NIT: 900.XXX.XXX-X', 14, 21);
    doc.text(`Fecha y Hora de Impresión: ${new Date().toLocaleString()}`, 14, 26);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 30, 196, 30);
    
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(title, 14, 40);
  };

  const renderHeaderActions = () => (
    <div className="ic-header-actions">
      <button onClick={() => {
        setInvForm({ tipo: 'Semilla', nombre: '', proveedor: '', cantidad: '', unidad: '', costo: '', id_vivero: '' });
        setShowInvModal(true);
      }} className="ic-btn ic-btn-primary">+ Nuevo Insumo</button>
      <button onClick={handleAbrirBodega} className="ic-btn ic-btn-outline" style={{ borderColor: '#8b5cf6', color: '#8b5cf6', margin: '0 8px' }}>
        📦 Solicitar a Bodega
      </button>
      <button onClick={() => {
        setMovForm({ id_camada: '', tipo_movimiento: 'Salida_Siembra', cantidad: '', precio_venta_total: 0, id_empleado: '', id_empleado_recibe: '', observaciones: '', id_lote_destino: '' });
        setShowMovModal(true);
      }} className="ic-btn ic-btn-secondary" style={{ background: '#10b981' }}>Registrar Salida</button>
    </div>
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const safeJson = async (res) => {
        const json = await res.json();
        return Array.isArray(json) ? json : [];
      };
      
      // Fetch filters first if not loaded
      if (viverosList.length === 0) {
        try {
          const filterRes = await authFetch(`/api/semillero/filtros?tenantId=${tenantId}`);
          if (filterRes.ok) {
            const fData = await filterRes.json();
            setViverosList(fData.viveros || []);
            setLotesList(fData.lotes || []);
          }
        } catch (e) { console.error('Error fetching viveros', e); }
      }

      const vQuery = selectedVivero !== 'Todos' ? `&viveroId=${selectedVivero}` : '';

      const [invRes, camRes, empRes, movRes] = await Promise.all([
        authFetch(`/api/semillero/inventario?tenantId=${tenantId}${vQuery}`).then(safeJson),
        authFetch(`/api/semillero/camadas?tenantId=${tenantId}${vQuery}`).then(safeJson),
        authFetch(`/api/rrhh/empleados?tenantId=${tenantId}`).then(safeJson),
        authFetch(`/api/semillero/movimientos?tenantId=${tenantId}${vQuery}`).then(safeJson).catch(() => [])
      ]);
      setInventario(invRes);
      setCamadas(camRes);
      setEmpleados(empRes);
      
      // Auto-select logged in user if not set
      if (!movForm.id_empleado && user && empRes.length > 0) {
        const match = empRes.find(e => 
          e.nombres.toLowerCase().includes(user.username.toLowerCase()) || 
          user.username.toLowerCase().includes(e.nombres.toLowerCase())
        );
        if (match) {
          setMovForm(prev => ({ ...prev, id_empleado: match.id_empleado }));
        }
      }

      setMovimientos(movRes);
      
      // Cargar Logo de Empresa para PDFs
      try {
        const logoReq = await authFetch(`/api/config/logo?tenantId=${tenantId}`);
        if (logoReq.ok) {
          const lData = await logoReq.json();
          if (lData.logo_path) {
            if (lData.logo_path.startsWith('data:image')) {
              setLogoBase64(lData.logo_path);
            } else {
              const baseHost = API_BASE ? API_BASE.replace('/api', '') : '';
              const imgUrl = lData.logo_path.startsWith('http') ? lData.logo_path : `${baseHost}${lData.logo_path.startsWith('/') ? '' : '/'}${lData.logo_path}`;
              const img = new Image();
              img.crossOrigin = 'Anonymous';
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                setLogoBase64(canvas.toDataURL('image/png'));
              };
              img.src = imgUrl;
            }
          }
        }
      } catch (err) { console.error('Error fetching logo', err); }

      setHasSearchedMovimientos(true);
    } catch (err) {
      console.error('Error cargando datos vivero:', err);
      alert('Error cargando datos operativos del vivero: ' + err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [tenantId, selectedVivero]);

  const fetchMovimientos = async (e) => {
    if (e) e.preventDefault();
    setLoadingMovimientos(true);
    setHasSearchedMovimientos(true);
    try {
      let query = `tenantId=${tenantId}`;
      if (filters.fechaInicio) query += `&fechaInicio=${filters.fechaInicio}`;
      if (filters.fechaFin) query += `&fechaFin=${filters.fechaFin}`;
      if (filters.idSemilla) query += `&idSemilla=${filters.idSemilla}`;
      if (filters.idEmpleado) query += `&idEmpleado=${filters.idEmpleado}`;
      if (selectedVivero !== 'Todos') query += `&viveroId=${selectedVivero}`;

      const res = await authFetch(`/api/semillero/movimientos?${query}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error desconocido del servidor');
      }
      const json = await res.json();
      setMovimientos(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error('Error fetching movimientos:', err);
      alert('Error obteniendo historial: ' + err.message);
    }
    setLoadingMovimientos(false);
  };

  const handleCreateInventario = async (e) => {
    e.preventDefault();
    try {
      await authFetch('/api/semillero/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          tipo: invForm.tipo,
          nombre: invForm.nombre,
          proveedor: invForm.proveedor,
          cantidad_disponible: invForm.cantidad,
          unidad_medida: invForm.unidad,
          costo_unitario: invForm.costo,
          id_vivero: selectedVivero !== 'Todos' ? selectedVivero : invForm.id_vivero
        })
      });
      setShowInvModal(false);
      loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleRegistrarMovimiento = async (e) => {
    e.preventDefault();
    try {
      await authFetch('/api/semillero/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          id_camada: movForm.id_camada,
          id_item: null,
          tipo_movimiento: movForm.tipo_movimiento,
          cantidad: movForm.cantidad,
          id_empleado_responsable: movForm.id_empleado,
          id_empleado_recibe: movForm.id_empleado_recibe,
          observaciones: movForm.observaciones,
          precio_venta_total: movForm.precio_venta_total,
          id_lote_destino: movForm.id_lote_destino || null
        })
      });
      setShowMovModal(false);
      loadData();
      if (hasSearchedMovimientos) {
        fetchMovimientos(); // Refresh list if already loaded
      }
      if(movForm.tipo_movimiento === 'Venta') {
        alert('Movimiento registrado exitosamente. Se ha generado automáticamente el Asiento de Ingreso en Contabilidad.');
      } else if (movForm.tipo_movimiento === 'Salida_Siembra' || movForm.tipo_movimiento === 'Salida_Resiembra') {
        // Generar Remisión PDF y WhatsApp
        const camada = camadas.find(c => String(c.id_camada) === String(movForm.id_camada));
        const empDespacha = empleados.find(e => String(e.id_empleado) === String(movForm.id_empleado));
        const empRecibe = empleados.find(e => String(e.id_empleado) === String(movForm.id_empleado_recibe));
        const lote = lotesList.find(l => String(l.id_lote) === String(movForm.id_lote_destino));
        
        const empDespachaName = empDespacha ? `${empDespacha.nombres} ${empDespacha.apellidos}` : 'Sin asignar';
        const empRecibeName = empRecibe ? `${empRecibe.nombres} ${empRecibe.apellidos}` : 'Sin asignar';
        const loteName = lote ? `${lote.nombre} (${lote.codigo}) - ${lote.finca_nombre}` : 'Sin asignar';
        const camadaName = camada ? `${camada.codigo_camada} (${camada.nombre_semilla})` : 'Desconocida';

        // 1. Generar PDF
        const doc = new (getJsPDFConstructor())();
        addPdfHeader(doc, 'REMISIÓN DE DESPACHO A LOTE');
        
        doc.setFontSize(11);
        doc.text(`Camada Origen: ${camadaName}`, 14, 50);
        doc.text(`Lote Destino: ${loteName}`, 14, 60);
        doc.text(`Cantidad Despachada: ${movForm.cantidad} plántulas`, 14, 70);
        doc.text(`Responsable Despacha: ${empDespachaName}`, 14, 80);
        doc.text(`Responsable (Recibe): ${empRecibeName}`, 14, 90);
        doc.text(`Observaciones: ${movForm.observaciones || 'Ninguna'}`, 14, 100);
        
        doc.line(14, 130, 90, 130);
        doc.text('Firma Responsable Vivero', 14, 140);
        doc.line(120, 130, 196, 130);
        doc.text('Firma de Quien Recibe', 120, 140);

        downloadPdfDoc(doc, `Remision_Despacho_${Date.now()}.pdf`);

        // 2. Enviar por WhatsApp
        const msj = `*REMISIÓN DE DESPACHO (VIVERO)*\n\nHola ${empRecibeName}, te informo que se acaban de despachar *${movForm.cantidad} plántulas* de la camada *${camadaName}* hacia el *${loteName}*.\n\nPor favor, asegúrate de recibirlas y firmar la remisión adjunta.`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msj)}`, '_blank');
        
        alert('Movimiento registrado. Se ha generado la Remisión PDF y se abrirá WhatsApp.');
      } else {
        alert('Movimiento registrado exitosamente.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleAbrirBodega = async () => {
    setShowBodegaModal(true);
    try {
      const res = await authFetch(`/api/semillero/bodega/insumos?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setBodegaInsumos(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegistrarPedidoBodega = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/semillero/bodega/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          ...bodegaForm
        })
      });
      if (res.ok) {
        alert('Pedido enviado a Bodega exitosamente. Te notificaremos cuando llegue.');
        setShowBodegaModal(false);
      } else {
        alert('Error al crear pedido');
      }
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleExportPDF = () => {
    const doc = new (getJsPDFConstructor())();
    if (activeTab === 'inventario') {
      addPdfHeader(doc, 'Inventario Base (Semillas y Abonos)');
      runAutoTable(doc, {
        startY: 45,
        head: [['Tipo', 'Nombre/Variedad', 'Stock Disponible', 'Costo Promedio']],
        body: inventario.map(item => [item.tipo, item.nombre, `${item.cantidad_disponible} ${item.unidad_medida}`, formatCurrency(Number(item.costo_unitario))])
      });
      downloadPdfDoc(doc, 'Inventario_Vivero.pdf');
    } else if (activeTab === 'camadas') {
      addPdfHeader(doc, 'Camadas en Crecimiento');
      const activas = camadas.filter(c => c.estado !== 'Agotada' && c.estado !== 'Descartada');
      runAutoTable(doc, {
        startY: 45,
        head: [['Código', 'Semilla', 'Estado', 'Plántulas Actuales', 'Edad']],
        body: activas.map(camada => [camada.codigo_camada, camada.nombre_semilla, camada.estado, camada.cantidad_actual, `${camada.dias_crecimiento} días`])
      });
      downloadPdfDoc(doc, 'Camadas_Activas.pdf');
    } else if (activeTab === 'movimientos') {
      addPdfHeader(doc, 'Historial de Movimientos');
      runAutoTable(doc, {
        startY: 45,
        head: [['Fecha', 'Tipo', 'Camada', 'Cantidad', 'Responsable', 'Estado Nómina', 'Observaciones']],
        body: movimientos.map(mov => [
          mov.fecha ? new Date(mov.fecha).toLocaleDateString() : '-',
          mov.tipo_movimiento?.replace(/_/g, ' '),
          mov.codigo_camada || '-',
          mov.cantidad,
          mov.empleado_nombres ? `${mov.empleado_nombres} ${mov.empleado_apellidos}` : 'Sin asignar',
          mov.labor_estado || '-',
          mov.observaciones || '-'
        ])
      });
      downloadPdfDoc(doc, 'Movimientos_Vivero.pdf');
    }
  };

  const handleExportExcel = () => {
    let ws, filename;
    if (activeTab === 'inventario') {
      ws = XLSX.utils.json_to_sheet(inventario.map(item => ({
        Tipo: item.tipo,
        'Nombre/Variedad': item.nombre,
        'Stock Disponible': `${item.cantidad_disponible} ${item.unidad_medida}`,
        'Costo Promedio': item.costo_unitario
      })));
      filename = 'Inventario_Vivero.xlsx';
    } else if (activeTab === 'camadas') {
      const activas = camadas.filter(c => c.estado !== 'Agotada' && c.estado !== 'Descartada');
      ws = XLSX.utils.json_to_sheet(activas.map(camada => ({
        Código: camada.codigo_camada,
        Semilla: camada.nombre_semilla,
        Estado: camada.estado,
        'Plántulas Actuales': camada.cantidad_actual,
        Edad: `${camada.dias_crecimiento} días`
      })));
      filename = 'Camadas_Activas.xlsx';
    } else if (activeTab === 'movimientos') {
      ws = XLSX.utils.json_to_sheet(movimientos.map(mov => ({
        Fecha: mov.fecha ? new Date(mov.fecha).toLocaleDateString() : '-',
        Tipo: mov.tipo_movimiento?.replace(/_/g, ' '),
        Camada: mov.codigo_camada || '-',
        Cantidad: mov.cantidad,
        Responsable: mov.empleado_nombres ? `${mov.empleado_nombres} ${mov.empleado_apellidos}` : 'Sin asignar',
        'Estado Nómina': mov.labor_estado || '-',
        Observaciones: mov.observaciones || '-'
      })));
      filename = 'Movimientos_Vivero.xlsx';
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    downloadExcelWorkbook(wb, filename);
  };

  const handleExportWhatsApp = () => {
    let text = '';
    if (activeTab === 'inventario') {
      text = `*Inventario Base Vivero*\n\n`;
      inventario.forEach(item => {
        text += `- ${item.tipo} ${item.nombre}: ${item.cantidad_disponible} ${item.unidad_medida} (${formatCurrency(Number(item.costo_unitario))})\n`;
      });
    } else if (activeTab === 'camadas') {
      text = `*Camadas en Crecimiento*\n\n`;
      const activas = camadas.filter(c => c.estado !== 'Agotada' && c.estado !== 'Descartada');
      activas.forEach(camada => {
        text += `- ${camada.codigo_camada} (${camada.nombre_semilla}): ${camada.cantidad_actual} plántulas [${camada.estado}]\n`;
      });
    } else if (activeTab === 'movimientos') {
      text = `*Últimos Movimientos Vivero*\n\n`;
      movimientos.slice(0, 10).forEach(mov => {
        text += `- ${mov.fecha ? new Date(mov.fecha).toLocaleDateString() : '-'} | ${mov.tipo_movimiento?.replace(/_/g, ' ')} | ${mov.codigo_camada || '-'} | Cant: ${mov.cantidad}\n`;
      });
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) return <div className="ic-loading">Cargando inventario de vivero...</div>;

  return (
    <div className="ic-container">
      <div className="ic-header">
        <div>
          <h1 className="ic-title">🌱 Control Operativo Vivero</h1>
          <p className="ic-subtitle">Gestión de insumos y camadas (lotes) de plántulas.</p>
        </div>
        
        {/* Vivero Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Filtro Vivero:</span>
          <select 
            value={selectedVivero} 
            onChange={(e) => setSelectedVivero(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
          >
            <option value="Todos">-- Todos los Viveros --</option>
            {viverosList.map(v => (
              <option key={v.id_vivero} value={v.id_vivero}>{v.nombre} ({v.codigo})</option>
            ))}
          </select>
        </div>

        <div className="ic-header-actions">
          <div className="ic-primary-actions">
            {renderHeaderActions()}
          </div>
          <div className="ic-export-actions">
            <button onClick={handleExportPDF} className="ic-btn ic-btn-export ic-btn-pdf">
              📄 PDF
            </button>
            <button className="btn-action-base btn-excel" onClick={handleExportExcel}>
              📊 Excel
            </button>
            <button className="btn-action-base btn-whatsapp" onClick={handleExportWhatsApp}>
              💬 WhatsApp
            </button>
          </div>
        </div>
      </div>

      <div className="ic-tabs">
        <button 
          onClick={() => setActiveTab('inventario')} 
          className={`ic-tab ${activeTab === 'inventario' ? 'active' : ''}`}
        >
          Inventario Base
        </button>
        <button 
          onClick={() => setActiveTab('camadas')} 
          className={`ic-tab ${activeTab === 'camadas' ? 'active' : ''}`}
        >
          Camadas en Crecimiento
        </button>
        <button 
          onClick={() => setActiveTab('movimientos')} 
          className={`ic-tab ${activeTab === 'movimientos' ? 'active' : ''}`}
        >
          Historial de Movimientos
        </button>
      </div>

      {activeTab === 'inventario' && (
        <div className="ic-card">
          <div className="ic-card-header">
            <h2 className="ic-card-title">📦 Inventario Base (Semillas y Abonos)</h2>
          </div>
          <div className="ic-table-wrapper">
            <table className="ic-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Nombre/Variedad</th>
                  <th>Stock Disponible</th>
                  <th>Costo Promedio</th>
                </tr>
              </thead>
              <tbody>
                {inventario.map(item => (
                  <tr key={item.id_item}>
                    <td><span className="ic-badge ic-badge-gray">{item.tipo}</span></td>
                    <td style={{ fontWeight: 600 }}>{item.nombre}</td>
                    <td>{item.cantidad_disponible} {item.unidad_medida}</td>
                    <td>{formatCurrency(Number(item.costo_unitario))}</td>
                  </tr>
                ))}
                {inventario.length === 0 && (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8' }}>No hay insumos registrados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'camadas' && (
        <div className="ic-card">
          <div className="ic-card-header">
            <h2 className="ic-card-title">🌿 Camadas en Crecimiento</h2>
          </div>
          <div className="ic-table-wrapper">
            <table className="ic-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Semilla</th>
                  <th>Estado</th>
                  <th>Plántulas Actuales</th>
                  <th>Edad</th>
                </tr>
              </thead>
              <tbody>
                {camadas.filter(c => c.estado !== 'Agotada' && c.estado !== 'Descartada').map(camada => (
                  <tr key={camada.id_camada}>
                    <td className="ic-mono">{camada.codigo_camada}</td>
                    <td style={{ fontWeight: 500 }}>{camada.nombre_semilla}</td>
                    <td>
                      <span className={`ic-badge ${
                        camada.estado === 'Lista para Siembra' ? 'ic-badge-green' :
                        'ic-badge-blue'
                      }`}>
                        {camada.estado}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{camada.cantidad_actual}</td>
                    <td>{camada.dias_crecimiento} días</td>
                  </tr>
                ))}
                {camadas.length === 0 && (
                  <tr><td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8' }}>No hay camadas activas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'movimientos' && (
        <>
          <form onSubmit={fetchMovimientos} className="ic-filter-bar">
            <div className="ic-filter-group">
              <label className="ic-filter-label">Fecha Desde</label>
              <DatePickerClaro className="ic-filter-input" value={filters.fechaInicio} onChange={e => setFilters({...filters, fechaInicio: e.target.value})} />
            </div>
            <div className="ic-filter-group">
              <label className="ic-filter-label">Fecha Hasta</label>
              <DatePickerClaro className="ic-filter-input" value={filters.fechaFin} onChange={e => setFilters({...filters, fechaFin: e.target.value})} />
            </div>
            <div className="ic-filter-group">
              <label className="ic-filter-label">Semilla / Variedad</label>
              <select className="ic-filter-input" value={filters.idSemilla} onChange={e => setFilters({...filters, idSemilla: e.target.value})}>
                <option value="">Todas</option>
                {inventario.filter(i => i.tipo === 'Semilla' || i.tipo === 'Plántula').map(item => (
                  <option key={item.id_item} value={item.id_item}>{item.nombre}</option>
                ))}
              </select>
            </div>
            <div className="ic-filter-group">
              <label className="ic-filter-label">Empleado / Responsable</label>
              <select className="ic-filter-input" value={filters.idEmpleado} onChange={e => setFilters({...filters, idEmpleado: e.target.value})}>
                <option value="">Todos</option>
                {empleados.map(emp => (
                  <option key={emp.id_empleado} value={emp.id_empleado}>{emp.nombres} {emp.apellidos}</option>
                ))}
              </select>
            </div>
            <div className="ic-filter-actions">
              <button type="submit" className="ic-btn ic-btn-secondary" style={{ marginBottom: '2px' }}>
                🔍 Procesar
              </button>
              <button 
                type="button" 
                className="ic-btn ic-btn-outline" 
                style={{ marginBottom: '2px' }}
                onClick={(e) => {
                  e.preventDefault();
                  setFilters({ fechaInicio: '', fechaFin: '', idSemilla: '', idEmpleado: '' });
                  // We simulate the fetch with empty filters immediately
                  setLoadingMovimientos(true);
                  setHasSearchedMovimientos(true);
                  const vQ = selectedVivero !== 'Todos' ? `&viveroId=${selectedVivero}` : '';
                  authFetch(`/api/semillero/movimientos?tenantId=${tenantId}${vQ}`)
                    .then(res => {
                      if (!res.ok) throw new Error('Error en servidor');
                      return res.json();
                    })
                    .then(json => {
                      setMovimientos(Array.isArray(json) ? json : []);
                      setLoadingMovimientos(false);
                    })
                    .catch(err => {
                      console.error(err);
                      alert('Error: ' + err.message);
                      setLoadingMovimientos(false);
                    });
                }}
              >
                🧹 Limpiar
              </button>
            </div>
          </form>

          <div className="ic-card">
            <div className="ic-card-header">
              <h2 className="ic-card-title">🔄 Historial de Movimientos</h2>
              <p className="ic-card-desc">Movimientos realizados con responsable y estado de cumplimiento en nómina.</p>
            </div>
            <div className="ic-table-wrapper">
              <table className="ic-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Camada / Semilla</th>
                    <th>Cantidad</th>
                    <th>Empleado Responsable</th>
                    <th>Costo Labor</th>
                    <th>Estado Nómina</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingMovimientos ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>Consultando base de datos...</td></tr>
                  ) : !hasSearchedMovimientos ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>Utiliza los filtros de arriba y presiona "Procesar" para cargar el historial.</td></tr>
                  ) : movimientos.length === 0 ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>No se encontraron movimientos para los filtros seleccionados.</td></tr>
                  ) : (
                    movimientos.map(mov => (
                      <tr key={mov.id_movimiento}>
                        <td style={{ whiteSpace: 'nowrap' }}>{mov.fecha ? new Date(mov.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                        <td>
                          <span className={`ic-badge ${
                            mov.tipo_movimiento === 'Salida_Siembra' ? 'ic-badge-green' :
                            mov.tipo_movimiento === 'Venta' ? 'ic-badge-blue' :
                            mov.tipo_movimiento === 'Baja_Enfermedad' ? 'ic-badge-red' :
                            'ic-badge-gray'
                          }`}>
                            {mov.tipo_movimiento?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>
                          <div className="ic-mono" style={{ fontSize: '0.85rem' }}>{mov.codigo_camada || '-'}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{mov.nombre_semilla || ''}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{mov.cantidad}</td>
                        <td>
                          {mov.empleado_nombres ? (
                            <div>
                              <div style={{ fontWeight: 600 }}>{mov.empleado_nombres} {mov.empleado_apellidos}</div>
                              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{mov.empleado_cargo}</div>
                            </div>
                          ) : (
                            <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Sin asignar</span>
                          )}
                        </td>
                        <td>
                          {mov.labor_costo ? (
                            <span style={{ fontWeight: 500 }}>${Number(mov.labor_costo).toLocaleString('es-CO')}</span>
                          ) : (
                            <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Sin costo</span>
                          )}
                        </td>
                        <td>
                          {mov.labor_estado ? (
                            <span className={`ic-badge ${
                              mov.labor_estado === 'Completada' ? 'ic-badge-green' :
                              mov.labor_estado === 'En Progreso' ? 'ic-badge-yellow' :
                              mov.labor_estado === 'Incumplida' ? 'ic-badge-red' :
                              'ic-badge-gray'
                            }`}>
                              {mov.labor_estado}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          )}
                        </td>
                        <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85rem' }}>{mov.observaciones || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Nuevo Insumo */}
      {showInvModal && (
        <div className="ic-modal-overlay">
          <div className="ic-modal">
            <div className="ic-modal-header">
              <h3 className="ic-modal-title">Registrar Insumo de Vivero</h3>
              <button onClick={() => setShowInvModal(false)} className="ic-modal-close">&times;</button>
            </div>
            <form onSubmit={handleCreateInventario} className="ic-modal-body">
              <div className="ic-form-group">
                <label className="ic-label">Vivero Destino</label>
                <select 
                  required 
                  className="ic-select" 
                  value={selectedVivero !== 'Todos' ? selectedVivero : (invForm.id_vivero || '')} 
                  onChange={e => setInvForm({...invForm, id_vivero: e.target.value})}
                  disabled={selectedVivero !== 'Todos'}
                  style={selectedVivero !== 'Todos' ? { opacity: 0.7, cursor: 'not-allowed', background: 'var(--bg-main)' } : {}}
                >
                  <option value="">Seleccione un vivero...</option>
                  {viverosList.map(v => (
                    <option key={v.id_vivero} value={v.id_vivero}>{v.nombre}</option>
                  ))}
                </select>
                {selectedVivero !== 'Todos' && <small style={{color: 'var(--text-secondary)', marginTop: '4px', display: 'block'}}>Autoseleccionado por el filtro global</small>}
              </div>
              <div className="ic-form-group">
                <label className="ic-label">Tipo</label>
                <select className="ic-select" value={invForm.tipo} onChange={e => setInvForm({...invForm, tipo: e.target.value})}>
                  <option>Semilla</option>
                  <option>Abono Químico</option>
                  <option>Abono Orgánico</option>
                  <option>Plántula</option>
                </select>
              </div>
              <div className="ic-form-group">
                <label className="ic-label">Nombre / Variedad</label>
                <input type="text" required className="ic-input" value={invForm.nombre} onChange={e => setInvForm({...invForm, nombre: e.target.value})} />
              </div>
              <div className="ic-form-row">
                <div style={{ flex: 1 }}>
                  <label className="ic-label">Cantidad Inicial</label>
                  <input type="number" required min="0" step="0.01" className="ic-input" value={invForm.cantidad} onChange={e => setInvForm({...invForm, cantidad: e.target.value})} />
                </div>
                <div style={{ flex: '0 0 100px' }}>
                  <label className="ic-label">Unidad</label>
                  <input type="text" required placeholder="kg, und" className="ic-input" value={invForm.unidad} onChange={e => setInvForm({...invForm, unidad: e.target.value})} />
                </div>
              </div>
              <div className="ic-form-group">
                <label className="ic-label">Costo Unitario ($)</label>
                <input type="number" required min="0" step="0.01" className="ic-input" value={invForm.costo} onChange={e => setInvForm({...invForm, costo: e.target.value})} />
              </div>
              <div className="ic-modal-footer">
                <button type="button" onClick={() => setShowInvModal(false)} className="ic-btn ic-btn-outline">Cancelar</button>
                <button type="submit" className="ic-btn ic-btn-primary">Guardar Insumo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Movimiento */}
      {showMovModal && (
        <div className="ic-modal-overlay">
          <div className="ic-modal">
            <div className="ic-modal-header">
              <h3 className="ic-modal-title">Despacho de Camada (Salida)</h3>
              <button onClick={() => setShowMovModal(false)} className="ic-modal-close">&times;</button>
            </div>
            <form onSubmit={handleRegistrarMovimiento} className="ic-modal-body">
              <div className="ic-form-group">
                <label className="ic-label">Camada de Origen</label>
                <select required className="ic-select" value={movForm.id_camada} onChange={e => setMovForm({...movForm, id_camada: e.target.value})}>
                  <option value="">Seleccione una camada activa...</option>
                  {camadas.filter(c => c.cantidad_actual > 0).map(c => (
                    <option key={c.id_camada} value={c.id_camada}>{c.codigo_camada} - {c.nombre_semilla} ({c.cantidad_actual} disp.)</option>
                  ))}
                </select>
              </div>
              <div className="ic-form-group">
                <label className="ic-label">Tipo de Movimiento</label>
                <select className="ic-select" value={movForm.tipo_movimiento} onChange={e => setMovForm({...movForm, tipo_movimiento: e.target.value})}>
                  <option value="Salida_Siembra">Sembrar en Lote de Campo</option>
                  <option value="Venta">Venta a Terceros (Genera Ingreso)</option>
                  <option value="Obsequio">Obsequio / Muestra</option>
                  <option value="Baja_Enfermedad">Baja por Plaga/Enfermedad</option>
                </select>
              </div>
              <div className="ic-form-group">
                <label className="ic-label">Cantidad a Despachar</label>
                <input type="number" required min="1" className="ic-input" value={movForm.cantidad} onChange={e => setMovForm({...movForm, cantidad: e.target.value})} />
              </div>
              {movForm.tipo_movimiento === 'Venta' && (
                <div className="ic-form-group">
                  <label className="ic-label">Precio de Venta Total ($)</label>
                  <input type="number" required min="1" step="0.01" className="ic-input" value={movForm.precio_venta_total} onChange={e => setMovForm({...movForm, precio_venta_total: e.target.value})} />
                  <p style={{ fontSize: '0.8rem', color: '#2563eb', marginTop: '4px' }}>Este valor generará un Comprobante de Ingreso automático.</p>
                </div>
              )}
              <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
                <div className="ic-form-group">
                  <label className="ic-label">Responsable Vivero (Despacha)</label>
                  <Select
                    showSearch
                    placeholder="Seleccione responsable..."
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    value={movForm.id_empleado || undefined}
                    onChange={val => setMovForm({...movForm, id_empleado: val})}
                    options={empleados.map(emp => ({
                      value: emp.id_empleado,
                      label: `${emp.nombres} ${emp.apellidos}`
                    }))}
                    style={{ width: '100%', height: '38px' }}
                  />
                </div>
                {(movForm.tipo_movimiento === 'Salida_Siembra' || movForm.tipo_movimiento === 'Salida_Resiembra') && (
                  <>
                    <div className="ic-form-group">
                      <label className="ic-label" style={{ color: '#8b5cf6' }}>Persona que Recibe (en el Lote)</label>
                      <Select
                        showSearch
                        placeholder="Buscar empleado que recibe..."
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        value={movForm.id_empleado_recibe || undefined}
                        onChange={val => setMovForm({...movForm, id_empleado_recibe: val})}
                        options={empleados.map(emp => ({
                          value: emp.id_empleado,
                          label: `${emp.nombres} ${emp.apellidos}`
                        }))}
                        style={{ width: '100%', height: '38px' }}
                      />
                    </div>
                    <div className="ic-form-group">
                      <label className="ic-label">Lote Destino (Siembra)</label>
                      <Select
                        showSearch
                        placeholder="Seleccione el lote destino..."
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        value={movForm.id_lote_destino || undefined}
                        onChange={val => setMovForm({...movForm, id_lote_destino: val})}
                        options={lotesList.map(l => ({
                          value: l.id_lote,
                          label: `${l.nombre} (${l.codigo}) - ${l.finca_nombre}`
                        }))}
                        style={{ width: '100%', height: '38px' }}
                      />
                    </div>
                  </>
                )}
              </ConfigProvider>
              <div className="ic-form-group">
                <label className="ic-label">Observaciones {(!movForm.tipo_movimiento.includes('Siembra')) && '/ Lote Destino'}</label>
                <input type="text" className="ic-input" placeholder="Ej: Sembrado en Sector Norte, o Cliente XYZ" value={movForm.observaciones || ''} onChange={e => setMovForm({...movForm, observaciones: e.target.value})} />
              </div>
              <div className="ic-modal-footer">
                <button type="button" onClick={() => setShowMovModal(false)} className="ic-btn ic-btn-outline">Cancelar</button>
                <button type="submit" className="ic-btn ic-btn-primary">Ejecutar Despacho</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Solicitar a Bodega */}
      {showBodegaModal && (
        <div className="ic-modal-overlay">
          <div className="ic-modal">
            <div className="ic-modal-header">
              <h3 className="ic-modal-title">📦 Solicitar Insumo a Bodega Central</h3>
              <button onClick={() => setShowBodegaModal(false)} className="ic-modal-close">&times;</button>
            </div>
            <form onSubmit={handleRegistrarPedidoBodega} className="ic-modal-body">
              <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
                <div className="ic-form-group">
                  <label className="ic-label">Insumo Requerido</label>
                  <Select
                    showSearch
                    placeholder="Buscar insumo..."
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    value={bodegaForm.id_insumo || undefined}
                    onChange={val => setBodegaForm({...bodegaForm, id_insumo: val})}
                    options={bodegaInsumos.map(ins => ({
                      value: ins.id_insumo,
                      label: `${ins.nombre} (Stock Total: ${ins.stockTotal} ${ins.unidad_medida})`
                    }))}
                    style={{ width: '100%', height: '38px' }}
                  />
                </div>
              </ConfigProvider>
              
              {bodegaForm.id_insumo && (() => {
                const sel = bodegaInsumos.find(i => i.id_insumo === bodegaForm.id_insumo);
                if (sel && sel.stockTotal > 0) {
                  return (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                      <p style={{ color: '#10b981', margin: 0, fontSize: '0.9rem' }}>
                        ✅ <strong>Hay Stock Disponible</strong>
                      </p>
                      <ul style={{ margin: '5px 0 0 20px', color: '#94a3b8', fontSize: '0.85rem' }}>
                        {sel.bodegas.map((b, i) => <li key={i}>{b.bodega}: {b.cantidad} {sel.unidad_medida}</li>)}
                      </ul>
                    </div>
                  );
                } else if (sel) {
                  return (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                      <p style={{ color: '#ef4444', margin: 0, fontSize: '0.9rem' }}>
                        ⚠️ <strong>Sin Stock en Bodega</strong>. Se enviará solicitud de compra al Jefe de Compras.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="ic-form-row">
                <div style={{ flex: 1 }}>
                  <label className="ic-label">Cantidad a Pedir</label>
                  <input type="number" required min="0.01" step="0.01" className="ic-input" value={bodegaForm.cantidad} onChange={e => setBodegaForm({...bodegaForm, cantidad: e.target.value})} />
                </div>
              </div>

              <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
                <div className="ic-form-group">
                  <label className="ic-label">Solicitante</label>
                  <Select
                    showSearch
                    placeholder="Seleccione responsable..."
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    value={bodegaForm.id_empleado || undefined}
                    onChange={val => setBodegaForm({...bodegaForm, id_empleado: val})}
                    options={empleados.map(emp => ({
                      value: emp.id_empleado,
                      label: `${emp.nombres} ${emp.apellidos}`
                    }))}
                    style={{ width: '100%', height: '38px' }}
                  />
                </div>
              </ConfigProvider>
              
              <div className="ic-form-group">
                <label className="ic-label">Justificación / Observaciones</label>
                <input type="text" className="ic-input" required placeholder="¿Para qué se necesita?" value={bodegaForm.observaciones || ''} onChange={e => setBodegaForm({...bodegaForm, observaciones: e.target.value})} />
              </div>
              <div className="ic-modal-footer">
                <button type="button" onClick={() => setShowBodegaModal(false)} className="ic-btn ic-btn-outline">Cancelar</button>
                <button type="submit" className="ic-btn ic-btn-primary" style={{ background: '#8b5cf6', borderColor: '#8b5cf6', boxShadow: '0 0 10px rgba(139, 92, 246, 0.4)' }}>Enviar Solicitud</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
