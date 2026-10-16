import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Select } from 'antd';
import { 
  Command, 
  DollarSign, 
  Save, 
  RefreshCw, 
  Plus, 
  FileText, 
  FileSpreadsheet, 
  Share2, 
  Search, 
  Calendar, 
  X,
  TrendingUp,
  Clock,
  Database,
  Edit,
  Trash2,
  CloudDownload
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Pagination from '../Pagination';

const { Option } = Select;

// Estilos globales para forzar el Select de antd al modo oscuro
const darkSelectStyles = `
  .dark-select .ant-select-selector {
    background-color: #1b253b !important;
    border-color: #334155 !important;
    color: white !important;
    height: 38px !important;
    padding-top: 3px !important;
    border-radius: 0.5rem !important;
  }
  .dark-select .ant-select-selection-search-input {
    color: white !important;
  }
  .dark-select .ant-select-selection-item {
    color: white !important;
  }
  .dark-select .ant-select-arrow {
    color: #94a3b8 !important;
  }
  .dark-select-dropdown {
    background-color: #1b253b !important;
  }
  .dark-select-dropdown .ant-select-item {
    color: #cbd5e1 !important;
  }
  .dark-select-dropdown .ant-select-item-option-active,
  .dark-select-dropdown .ant-select-item-option-selected {
    background-color: #1e293b !important;
    color: white !important;
  }
`;

const ProductionPreciosMercado = () => {
  const id_tenant = localStorage.getItem('tenant_id') || 1;
  
  // State variables
  const [productos, setproductos] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingTime, setProcessingTime] = useState(null);
  const [success, setSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Filter states
  const [filterProduct, setFilterProduct] = useState('');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');
  
  // Modal creation states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [newProduct, setNewProduct] = useState('');
  const [newPrecio, setNewPrecio] = useState('');
  const [newFuente, setNewFuente] = useState('Manual');
  const [newNotas, setNewNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // WhatsApp share states
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [waPhone, setWaPhone] = useState('');

  // Load initial options
  useEffect(() => {
    const fetchInsumos = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/table/insumos/data?tenantId=${id_tenant}&pageSize=150`);
        // Filter only finished products
        const finishedProducts = (res.data.data || []).filter(
          p => (p.codigo || '').toUpperCase().startsWith('PT-')
        );
        setproductos(finishedProducts);
      } catch (err) {
        console.error('Error loading products:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInsumos();
  }, [id_tenant]);

  // Process historical query under demand
  const handleProcessQuery = async () => {
    console.log('Process Query button clicked');
    setProcessing(true);
    setSuccess('');
    setErrorMsg('');
    try {
      const res = await axios.post(`/api/produccion/consultar-precios?id_tenant=${id_tenant}`, {
        filtros: {
          id_insumo_producto: filterProduct,
          fecha_desde: filterFechaDesde,
          fecha_hasta: filterFechaHasta
        }
      });
      if (res.data.success) {
        setRegistros(res.data.registros || []);
        setCurrentPage(1);
        setProcessingTime(res.data.tiempo_procesamiento_ms);
        setSuccess('Consulta procesada exitosamente.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Error al consultar precios de mercado');
    } finally {
      setProcessing(false);
    }
  };

  // Open modal for new price
  const handleOpenNewPriceModal = () => {
    console.log('Nuevo Precio button clicked');
    setEditId(null);
    setNewProduct('');
    setNewPrecio('');
    setNewFuente('Manual');
    setNewNotas('');
    setIsModalOpen(true);
  };

  // Open modal for editing price
  const handleOpenEditModal = (r) => {
    console.log('Edit button clicked for id', r.id_precio_mercado);
    setEditId(r.id_precio_mercado);
    setNewProduct(r.id_insumo_producto);
    setNewPrecio(r.precio_unitario);
    setNewFuente(r.fuente);
    setNewNotas(r.notas || '');
    setIsModalOpen(true);
  };

  // Delete price record
  const handleDeletePrice = async (id) => {
    console.log('Delete button clicked for id', id);
    if (!window.confirm('¿Seguro que deseas eliminar este registro de precio de mercado?')) {
      return;
    }
    setErrorMsg('');
    setSuccess('');
    try {
      const res = await axios.delete(`/api/produccion/precios-mercado/${id}?id_tenant=${id_tenant}`);
      if (res.data.success) {
        setSuccess('Registro de precio eliminado correctamente.');
        handleProcessQuery();
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Error al eliminar el precio de mercado');
    }
  };

  // Submit new or edited price
  const handleSubmitPriceForm = async (e) => {
    e.preventDefault();
    console.log('Submitting price form');
    if (!newProduct) {
      setErrorMsg('Debe seleccionar un producto');
      return;
    }
    if (!newPrecio) {
      setErrorMsg('Debe ingresar un precio');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    setSuccess('');
    try {
      const payload = {
        id_tenant,
        id_insumo_producto: newProduct,
        precio_unitario: parseFloat(newPrecio),
        fuente: newFuente,
        notas: newNotas,
      };
      let res;
      if (editId) {
        // Update existing record
        res = await axios.put(`/api/produccion/precios-mercado/${editId}?id_tenant=${id_tenant}`, payload);
      } else {
        // Create new record
        res = await axios.post(`/api/produccion/precios-mercado?id_tenant=${id_tenant}`, payload);
      }
      if (res.data.success) {
        setSuccess(editId ? 'Precio actualizado correctamente' : 'Precio registrado correctamente');
        setIsModalOpen(false);
        handleProcessQuery();
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setErrorMsg(res.data.error || 'Error al guardar el precio');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Error al guardar el precio');
    } finally {
      setSaving(false);
    }
  };

  // Sync con API DANE SIPSA
  const handleSyncDane = async () => {
    setSyncing(true);
    setSuccess('');
    setErrorMsg('');
    try {
      const res = await axios.post(`/api/produccion/precios-mercado/sync-dane?id_tenant=${id_tenant}`);
      if (res.data.success) {
        setSuccess(res.data.message);
        handleProcessQuery(); // refrescar grilla
      } else {
        setErrorMsg(res.data.error || 'Error en sincronización');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Error al conectar con servidor SIPSA');
    } finally {
      setSyncing(false);
    }
  };

  // Generate PDF report
  const handleExportPDF = () => {
    console.log('Export PDF button clicked');
    if (registros.length === 0) {
      alert('No hay registros en la grilla para exportar. Haz clic en "Procesar Consulta" primero.');
      return;
    }
    const doc = new jsPDF();
    
    // Header styling
    doc.setFillColor(11, 15, 25);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('AGROPACCIOLI', 15, 18);
    doc.setFontSize(10);
    doc.text('INTELIGENCIA DE MERCADO - PRECIOS REFERENCIALES', 15, 25);
    doc.text(`Fecha Reporte: ${new Date().toLocaleString()}`, 140, 18);
    doc.text(`Tenant ID: ${id_tenant}`, 140, 25);

    // Body
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('Reporte de Precios de Mercado Consultados:', 15, 50);

    const tableRows = registros.map(r => [
      r.nombre_producto,
      r.codigo_producto,
      new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(r.precio_unitario),
      r.fuente,
      new Date(r.vigente_desde).toLocaleDateString('es-CO'),
      r.vigente_hasta ? new Date(r.vigente_hasta).toLocaleDateString('es-CO') : 'Vigente',
      r.notas || ''
    ]);

    doc.autoTable({
      startY: 55,
      head: [['Producto', 'Código', 'Precio (COP)', 'Fuente', 'Vigente Desde', 'Vigente Hasta', 'Notas']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [20, 110, 120] },
      styles: { fontSize: 8 }
    });

    doc.save(`Precios_Mercado_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Export to CSV/Excel
  const handleExportExcel = () => {
    console.log('Export Excel button clicked');
    if (registros.length === 0) {
      alert('No hay registros en la grilla para exportar. Haz clic en "Procesar Consulta" primero.');
      return;
    }
    const headers = ['Producto', 'Código', 'Precio Unitario (COP)', 'Fuente', 'Vigente Desde', 'Vigente Hasta', 'Notas'];
    const rows = registros.map(r => [
      r.nombre_producto,
      r.codigo_producto,
      r.precio_unitario,
      r.fuente,
      new Date(r.vigente_desde).toLocaleDateString('es-CO'),
      r.vigente_hasta ? new Date(r.vigente_hasta).toLocaleDateString('es-CO') : 'Vigente',
      r.notas || ''
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Precios_Mercado_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // WhatsApp share
  const handleShareWhatsApp = (e) => {
    console.log('WhatsApp share button clicked');
    e.preventDefault();
    if (registros.length === 0) {
      alert('No hay registros en la grilla para compartir.');
      return;
    }
    if (!waPhone) {
      alert('Por favor ingresa un número de teléfono válido.');
      return;
    }

    const cleanPhone = waPhone.replace(/\D/g, '');
    let text = `*Reporte de Precios de Mercado - AgroPaccioli*\n\n`;
    registros.slice(0, 10).forEach(r => {
      text += `• *${r.nombre_producto}* (${r.codigo_producto}): $${parseFloat(r.precio_unitario).toLocaleString('es-CO')} (${r.fuente}) - ${r.vigente_hasta ? 'Histórico' : 'Vigente'}\n`;
    });
    if (registros.length > 10) {
      text += `... y ${registros.length - 10} registros más.\n`;
    }
    text += `\nGenerado el: ${new Date().toLocaleDateString()}`;

    const encodedText = encodeURIComponent(text);
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    window.open(url, '_blank');
    setIsWaModalOpen(false);
    setWaPhone('');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white p-6">
      <style>{darkSelectStyles}</style>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-teal-400" />
              Precios de Mercado Referenciales
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Registra y consulta precios de referencia históricos y vigentes para inteligencia de mercado
            </p>
          </div>
        </div>

        {/* Message alerts */}
        {success && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-4 text-emerald-300 text-sm animate-pulse">
            {success}
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-4 text-red-300 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Filters and Search Bar Container */}
        <div className="bg-[#131b2e]/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-teal-400">
            <Search className="w-5 h-5" />
            <h2 className="font-semibold text-white">Buscador y Filtros</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Product selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase">Producto de Producción (PT)</label>
              <Select
                showSearch
                value={filterProduct || undefined}
                onChange={val => setFilterProduct(val || '')}
                placeholder="Todos los productos terminados..."
                optionFilterProp="children"
                filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
                className="w-full dark-select"
                popupClassName="dark-select-dropdown"
                allowClear
              >
                {productos.map(p => (
                  <Option key={p.id_insumo} value={p.id_insumo}>
                    {p.nombre} ({p.codigo})
                  </Option>
                ))}
              </Select>
            </div>

            {/* Fecha Desde */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase">Fecha Inicial</label>
              <div className="relative">
                <input
                  type="date"
                  value={filterFechaDesde}
                  onChange={e => setFilterFechaDesde(e.target.value)}
                  className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500/30"
                />
              </div>
            </div>

            {/* Fecha Hasta */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase">Fecha Final</label>
              <div className="relative">
                <input
                  type="date"
                  value={filterFechaHasta}
                  onChange={e => setFilterFechaHasta(e.target.value)}
                  className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500/30"
                />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap justify-between items-center pt-4 border-t border-slate-800/80 gap-3">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              {processingTime !== null && (
                <span className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-full text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-yellow-400" />
                  Consulta: {processingTime} ms
                </span>
              )}
              {registros.length > 0 && (
                <span className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-full text-slate-300">
                  <Database className="w-3.5 h-3.5 text-teal-400" />
                  Registros: {registros.length}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Process Query */}
              <button
                onClick={handleProcessQuery}
                disabled={processing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-bold rounded-lg transition disabled:opacity-50 text-sm"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Procesar Consulta
                  </>
                )}
              </button>

              {/* Botón Sincronizar DANE */}
              <button
                onClick={handleSyncDane}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold rounded-lg transition text-sm shadow-md shadow-blue-500/10 disabled:opacity-50"
              >
                {syncing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CloudDownload className="w-4 h-4" />
                )}
                Sync SIPSA
              </button>

              {/* Nuevo Registro (Always Visible in Filter Bar) */}
              <button
                onClick={handleOpenNewPriceModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold rounded-lg transition text-sm shadow-md shadow-teal-500/10"
              >
                <Plus className="w-4 h-4" />
                Nuevo Precio
              </button>

              {/* Export PDF */}
              <button
                onClick={handleExportPDF}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg border border-slate-700 transition"
                title="Exportar PDF"
              >
                <FileText className="w-4 h-4 text-red-400" />
                PDF
              </button>

              {/* Export Excel */}
              <button className="btn-action-base btn-excel" onClick={handleExportExcel}>
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Excel
              </button>

              {/* Share WhatsApp */}
              <button
                onClick={() => setIsWaModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg border border-slate-700 transition"
                title="Compartir por WhatsApp"
              >
                <Share2 className="w-4 h-4 text-teal-400" />
                WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Data Grid Table */}
        <div className="bg-[#131b2e]/60 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#1b253b] text-slate-200 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4">Código</th>
                  <th className="px-6 py-4">Precio Unitario</th>
                  <th className="px-6 py-4">Fuente</th>
                  <th className="px-6 py-4">Vigencia</th>
                  <th className="px-6 py-4">Notas / Observaciones</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {registros.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                      No hay datos cargados. Aplica filtros y presiona "Procesar Consulta" para cargar los registros.
                    </td>
                  </tr>
                ) : (
                  registros.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(r => (
                    <tr key={r.id_precio_mercado} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-semibold text-white">{r.nombre_producto}</td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-xs text-slate-300">
                          {r.codigo_producto}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-teal-400">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(r.precio_unitario)}
                      </td>
                      <td className="px-6 py-4">{r.fuente}</td>
                      <td className="px-6 py-4 text-xs">
                        <div>Desde: {new Date(r.vigente_desde).toLocaleDateString('es-CO')}</div>
                        <div className="text-[10px] text-slate-500">
                          Hasta: {r.vigente_hasta ? new Date(r.vigente_hasta).toLocaleDateString('es-CO') : 'Vigente'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 max-w-xs truncate" title={r.notas}>{r.notas || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(r)}
                            className="p-1 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded transition"
                            title="Editar registro"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePrice(r.id_precio_mercado)}
                            className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {registros.length > 0 && (
            <div className="py-4 border-t border-slate-800/80">
              <Pagination 
                currentPage={currentPage}
                totalItems={registros.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>

        {/* Modal: New / Edit Price Record */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#131b2e] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-800 text-teal-400">
                <DollarSign className="w-5 h-5" />
                <h3 className="text-xl font-bold text-white">
                  {editId ? 'Editar Precio de Mercado' : 'Registrar Precio de Mercado'}
                </h3>
              </div>

              <form onSubmit={handleSubmitPriceForm} className="space-y-4">
                {/* Product Select */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Producto Terminado (PT)</label>
                  <Select
                    showSearch
                    value={newProduct || undefined}
                    onChange={val => setNewProduct(val)}
                    placeholder="Selecciona un producto..."
                    disabled={!!editId} // Product cannot be changed during editing
                    optionFilterProp="children"
                    filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
                    className="w-full dark-select"
                    popupClassName="dark-select-dropdown"
                  >
                    {productos.map(p => (
                      <Option key={p.id_insumo} value={p.id_insumo}>
                        {p.nombre} ({p.codigo})
                      </Option>
                    ))}
                  </Select>
                </div>

                {/* Price Input */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Precio Unitario (COP)</label>
                  <input
                    type="number"
                    value={newPrecio}
                    onChange={e => setNewPrecio(e.target.value)}
                    min="0"
                    placeholder="Ej. 15000"
                    required
                    className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500/20"
                  />
                </div>

                {/* Source Input */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Fuente de Información</label>
                  <select
                    value={newFuente}
                    onChange={e => setNewFuente(e.target.value)}
                    className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500/20"
                  >
                    <option value="Manual">Manual</option>
                    <option value="Bolsa">Bolsa Nacional Agropecuaria</option>
                    <option value="API">API de Precios / Mercado</option>
                    <option value="Distribuidor">Distribuidor / Mayorista</option>
                  </select>
                </div>

                {/* Notes Textarea */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Notas / Observaciones</label>
                  <textarea
                    value={newNotas}
                    onChange={e => setNewNotas(e.target.value)}
                    rows="3"
                    placeholder="Especificar calidad, variedad o términos de entrega..."
                    className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500/20"
                  ></textarea>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t border-slate-800 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold rounded-lg transition disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {editId ? 'Guardar Cambios' : 'Registrar'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: WhatsApp Share */}
        {isWaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#131b2e] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
              <button
                onClick={() => setIsWaModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-800 text-teal-400">
                <Share2 className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white">Compartir Reporte por WhatsApp</h3>
              </div>

              <form onSubmit={handleShareWhatsApp} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Número de WhatsApp (con prefijo de país)</label>
                  <input
                    type="text"
                    value={waPhone}
                    onChange={e => setWaPhone(e.target.value)}
                    placeholder="Ej: 573123456789"
                    required
                    className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500/20"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Ingresa el número con el código del país sin espacios ni símbolos (Ej: 57 para Colombia).
                  </p>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-800 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsWaModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold rounded-lg transition"
                  >
                    <Share2 className="w-4 h-4" />
                    Enviar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProductionPreciosMercado;