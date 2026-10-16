import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Download, Eye, RefreshCw, Layers, ShieldCheck, Hammer, Users, Printer, FileText, Send } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';

const ProductionHistoryDashboard = () => {
  const { user } = useAuth();
  const id_tenant = localStorage.getItem('tenant_id') || 1;

  // Helper to fetch company logo in Base64
  const fetchLogoBase64 = async () => {
    try {
      const token = localStorage.getItem('token');
      const resPath = await axios.get('/api/config/logo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { logo_path } = resPath.data;
      if (logo_path) {
        const imgUrl = logo_path.startsWith('http') ? logo_path : `${logo_path.startsWith('/') ? '' : '/'}${logo_path}`;
        const imgRes = await fetch(imgUrl);
        if (imgRes.ok) {
          const blob = await imgRes.blob();
          return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        }
      }
    } catch (e) {
      console.warn("Could not load logo", e);
    }
    return null;
  };

  // Data & state
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processingTime, setProcessingTime] = useState(null);
  const [hasProcessed, setHasProcessed] = useState(false); // Controls table empty state before click

  // Filter options loaded on mount
  const [fincas, setFincas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [maquinas, setMaquinas] = useState([]);

  // Search filter inputs
  const [filtros, setFiltros] = useState({
    lote_generado: '',
    lote_insumo_origen: '',
    id_empleado: '',
    id_maquina_taller: '',
    id_finca: '',
    fecha_desde: '',
    fecha_hasta: '',
    estado: '',
    limit: 50,
    offset: 0,
  });

  // Search text states for searchable select inputs (Rule of Searchable Selects)
  const [searchFinca, setSearchFinca] = useState('');
  const [searchEmpleado, setSearchEmpleado] = useState('');
  const [searchMaquina, setSearchMaquina] = useState('');

  // Selected order details for genealogy drawer
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Load catalogs on mount
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [resFincas, resEmpleados, resMaquinas] = await Promise.all([
          axios.get(`/api/tables/finca?tenantId=${id_tenant}&pageSize=100`).catch(err => {
            console.error('Error fetching fincas:', err);
            return { data: { data: [] } };
          }),
          axios.get(`/api/produccion/empleados?id_tenant=${id_tenant}`).catch(err => {
            console.error('Error fetching empleados:', err);
            return { data: { data: [] } };
          }),
          axios.get(`/api/produccion/maquinas?id_tenant=${id_tenant}`).catch(err => {
            console.error('Error fetching maquinas:', err);
            return { data: { data: [] } };
          }),
        ]);
        setFincas(resFincas.data.data || []);
        setEmpleados(resEmpleados.data.data || []);
        setMaquinas(resMaquinas.data.data || []);
      } catch (err) {
        console.error('Error loading filter catalogs:', err);
      }
    };
    loadCatalogs();
  }, [id_tenant]);

  const procesarConsulta = async () => {
    setLoading(true);
    setError(null);
    setHasProcessed(true);
    const start = Date.now();
    try {
      const response = await axios.post(`/api/produccion/historico-producciones?id_tenant=${id_tenant}`, {
        filtros,
      });
      setData(response.data.registros || []);
      setProcessingTime(Date.now() - start);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar la consulta');
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetails = async (id_orden) => {
    setLoadingDetails(true);
    try {
      const response = await axios.get(`/api/produccion/lote/${id_orden}?id_tenant=${id_tenant}`);
      setOrderDetails(response.data);
      setSelectedOrderId(id_orden);
    } catch (err) {
      alert('Error al cargar la trazabilidad del lote');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Export to CSV/Excel (UTF-8 BOM optimized)
  const exportToExcel = () => {
    if (data.length === 0) return;
    const headers = ['Orden', 'Fecha/Hora Creación', 'Lote Generado', 'Producto', 'Fórmula', 'Cantidad', 'Costo Total', 'Estado', 'Fecha Cierre'];
    const rows = data.map((r) => [
      r.codigo_orden,
      r.creado_el ? new Date(r.creado_el).toLocaleString('es-CO') : 'N/A',
      r.lote_generado || 'N/A',
      r.nombre_producto,
      r.nombre_formula,
      `${r.cantidad_ordenada} ${r.unidad_medida}`,
      r.costo_total,
      r.estado,
      r.fecha_cierre ? new Date(r.fecha_cierre).toLocaleDateString('es-CO') : 'N/A',
    ]);

    // Use UTF-8 BOM so Excel opens accents correctly
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `historico_produccion_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export report to PDF using jsPDF
  const exportToPDF = async () => {
    if (data.length === 0) return;
    const logoBase64 = await fetchLogoBase64();
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF();
      doc.setFillColor(19, 27, 46); // Dark blue header
      doc.rect(0, 0, 210, 42, 'F');
      
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 165, 6, 30, 30);
        } catch (e) {
          try {
            doc.addImage(logoBase64, 'JPEG', 165, 6, 30, 30);
          } catch (err) {}
        }
      }
      
      doc.setTextColor(20, 184, 166); // Teal
      doc.setFontSize(16);
      doc.setFont('Helvetica-Bold');
      doc.text("REPORTE HISTÓRICO DE PRODUCCIONES", 15, 14);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      const companyName = user?.tenant_nombre || 'AgroPaccioli';
      const companyNit = user?.tenant_nit ? `NIT: ${user.tenant_nit}` : '';
      doc.text(`${companyName} ${companyNit ? ' - ' + companyNit : ''}`, 15, 21);
      
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8.5);
      const selectedFincaObj = fincas.find(f => String(f.id_finca) === String(filtros.id_finca));
      const fincaName = selectedFincaObj ? selectedFincaObj.nombre : 'Todas las fincas';
      
      const dateFrom = filtros.fecha_desde ? new Date(filtros.fecha_desde + 'T00:00:00').toLocaleDateString('es-CO') : 'Sin límite inicio';
      const dateTo = filtros.fecha_hasta ? new Date(filtros.fecha_hasta + 'T00:00:00').toLocaleDateString('es-CO') : 'Sin límite fin';
      
      doc.text(`Finca: ${fincaName}  |  Rango de Fechas: ${dateFrom} a ${dateTo}`, 15, 28);
      doc.text(`Generado por: ${user?.username || 'Usuario'}  |  Fecha: ${new Date().toLocaleString('es-CO')}  |  Registros: ${data.length}`, 15, 34);
      
      let y = 50;
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Código Orden", 15, y);
      doc.text("Creado El", 40, y);
      doc.text("Lote Generado", 75, y);
      doc.text("Producto / Fórmula", 110, y);
      doc.text("Cantidad", 165, y);
      doc.text("Costo Total", 185, y);
      
      doc.setDrawColor(226, 232, 240);
      doc.line(15, y + 2, 195, y + 2);
      y += 8;
      
      doc.setTextColor(15, 23, 42);
      data.forEach((row) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(row.codigo_orden || '', 15, y);
        doc.text(row.creado_el ? new Date(row.creado_el).toLocaleString('es-CO') : '—', 40, y);
        doc.text(row.lote_generado || '⏳ Pendiente', 75, y);
        
        const prodFormName = `${row.nombre_producto || ''} (${row.nombre_formula || ''})`;
        const truncatedName = prodFormName.length > 25 ? prodFormName.substring(0, 23) + '..' : prodFormName;
        doc.text(truncatedName, 110, y);
        
        doc.text(`${parseFloat(row.cantidad_ordenada).toFixed(1)} ${row.unidad_medida}`, 165, y);
        doc.text(`$${parseFloat(row.costo_total).toLocaleString('es-CO')}`, 185, y);
        y += 8;
      });
      
      doc.save(`Historico_Produccion_${Date.now()}.pdf`);
    });
  };

  // Share report details via WhatsApp Web
  const sendWhatsApp = () => {
    if (data.length === 0) return;
    let text = `*HISTORICO DE PRODUCCION - AGROPACCIOLI*\n\n`;
    data.slice(0, 15).forEach(r => {
      const fechaCreacion = r.creado_el ? new Date(r.creado_el).toLocaleString('es-CO') : 'N/A';
      text += `• *Orden:* ${r.codigo_orden} | *Creado:* ${fechaCreacion}\n  *Lote:* ${r.lote_generado || 'Pendiente'}\n  *Producto:* ${r.nombre_producto}\n  *Cant:* ${parseFloat(r.cantidad_ordenada).toFixed(1)} ${r.unidad_medida} | *Costo:* $${parseFloat(r.costo_total).toLocaleString('es-CO')}\n\n`;
    });
    if (data.length > 15) {
      text += `_Y ${data.length - 15} registros más..._\n`;
    }
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const downloadLabelPdf = async (details) => {
    const logoBase64 = await fetchLogoBase64();
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [100, 150]
      });

      doc.setFillColor(11, 15, 25);
      doc.rect(0, 0, 100, 150, 'F');

      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 75, 4, 16, 16);
        } catch (e) {
          try {
            doc.addImage(logoBase64, 'JPEG', 75, 4, 16, 16);
          } catch (err) {}
        }
      }

      doc.setTextColor(20, 184, 166);
      doc.setFontSize(14);
      doc.text("AGROPACCIOLI", 15, 15);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text("ETIQUETA DE TRAZABILIDAD BPM", 50, 22, { align: "center" });

      doc.setDrawColor(51, 65, 85);
      doc.line(10, 27, 90, 27);

      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("Producto:", 15, 35);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(details.producto, 15, 41);

      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("Lote Generado:", 15, 52);
      doc.setTextColor(45, 212, 191);
      doc.setFontSize(12);
      doc.text(details.lote_generado, 15, 58);

      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("Cantidad Producida:", 15, 69);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(`${details.cantidad} ${details.unidad_medida}`, 15, 75);

      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("Fecha Empaque:", 15, 86);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(details.fecha_cierre, 15, 92);

      doc.setDrawColor(20, 184, 166);
      doc.rect(35, 105, 30, 30);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("[ Escanear QR BPM ]", 50, 140, { align: "center" });

      doc.save(`Etiqueta_BPM_${details.lote_generado}.pdf`);
    });
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-teal-400 bg-clip-text text-transparent">
            Histórico y Trazabilidad de Producciones
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Buscador avanzado y genealogía de lotes para cumplimiento BPM
          </p>
        </div>

        {/* Filters */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-teal-400 mb-4">Buscador Avanzado</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Lote Producto Terminado</label>
              <input
                type="text"
                placeholder="Ej. LOT-..."
                value={filtros.lote_generado}
                onChange={(e) => setFiltros({ ...filtros, lote_generado: e.target.value })}
                className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Lote de Insumo Origen</label>
              <input
                type="text"
                placeholder="Ej. LOT-MP-..."
                value={filtros.lote_insumo_origen}
                onChange={(e) => setFiltros({ ...filtros, lote_insumo_origen: e.target.value })}
                className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Searchable Finca Select */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-400 mb-1">Finca</label>
              <input
                type="text"
                placeholder="Buscar Finca..."
                value={searchFinca}
                onChange={(e) => setSearchFinca(e.target.value)}
                className="w-full bg-[#1b253b] border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-teal-500"
              />
              <select
                value={filtros.id_finca}
                onChange={(e) => setFiltros({ ...filtros, id_finca: e.target.value })}
                className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">Todas las fincas</option>
                {fincas
                  .filter(f => (f.nombre || '').toLowerCase().includes(searchFinca.toLowerCase()))
                  .map((f) => (
                    <option key={f.id_finca} value={f.id_finca}>
                      {f.nombre}
                    </option>
                  ))
                }
              </select>
            </div>

            {/* Searchable Empleado Select */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-400 mb-1">Empleado</label>
              <input
                type="text"
                placeholder="Buscar Empleado..."
                value={searchEmpleado}
                onChange={(e) => setSearchEmpleado(e.target.value)}
                className="w-full bg-[#1b253b] border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-teal-500"
              />
              <select
                value={filtros.id_empleado}
                onChange={(e) => setFiltros({ ...filtros, id_empleado: e.target.value })}
                className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">Todos los empleados</option>
                {empleados
                  .filter(e => (e.nombre || '').toLowerCase().includes(searchEmpleado.toLowerCase()))
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))
                }
              </select>
            </div>

            {/* Searchable Maquinaria Select */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-400 mb-1">Maquinaria</label>
              <input
                type="text"
                placeholder="Buscar Máquina..."
                value={searchMaquina}
                onChange={(e) => setSearchMaquina(e.target.value)}
                className="w-full bg-[#1b253b] border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-teal-500"
              />
              <select
                value={filtros.id_maquina_taller}
                onChange={(e) => setFiltros({ ...filtros, id_maquina_taller: e.target.value })}
                className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">Todas las máquinas</option>
                {maquinas
                  .filter(m => {
                    const type = (m.tipo || '').toLowerCase();
                    const placa = (m.placa || '').toUpperCase();
                    if (type !== 'procesamiento' && !placa.startsWith('MAQ-')) return false;

                    return (m.nombre || '').toLowerCase().includes(searchMaquina.toLowerCase()) || 
                           (m.placa || '').toLowerCase().includes(searchMaquina.toLowerCase());
                  })
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} (Placa: {m.placa})
                    </option>
                  ))
                }
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Estado</label>
              <select
                value={filtros.estado}
                onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">Todos los estados</option>
                <option value="Finalizada">Finalizada</option>
                <option value="En_Proceso">En Proceso</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha Desde</label>
              <input
                type="date"
                value={filtros.fecha_desde}
                onChange={(e) => setFiltros({ ...filtros, fecha_desde: e.target.value })}
                className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha Hasta</label>
              <input
                type="date"
                value={filtros.fecha_hasta}
                onChange={(e) => setFiltros({ ...filtros, fecha_hasta: e.target.value })}
                className="w-full bg-[#1b253b] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <button className="btn-action-base btn-procesar" onClick={procesarConsulta}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Procesar Consulta
            </button>
            <button className="btn-action-base btn-excel" onClick={exportToExcel}>
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </button>
            <button className="btn-action-base btn-pdf" onClick={exportToPDF}>
              <FileText className="w-4 h-4 mr-2" />
              Exportar PDF
            </button>
            <button
              onClick={sendWhatsApp}
              disabled={data.length === 0}
              className="inline-flex items-center px-4 py-2.5 bg-teal-950/40 text-teal-400 border border-teal-500/20 hover:bg-teal-900 transition font-bold rounded-lg"
            >
              <Send className="w-4 h-4 mr-2" />
              Compartir WhatsApp
            </button>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#1b253b] text-slate-300 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3 font-semibold">Código Orden</th>
                  <th className="px-6 py-3 font-semibold">Lote Generado</th>
                  <th className="px-6 py-3 font-semibold">Producto / Fórmula</th>
                  <th className="px-6 py-3 font-semibold text-right">Cantidad</th>
                  <th className="px-6 py-3 font-semibold text-right">Costo Total</th>
                  <th className="px-6 py-3 font-semibold">Estado</th>
                  <th className="px-6 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {hasProcessed ? (
                  data.map((row) => (
                    <tr key={row.id_orden} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-indigo-400">{row.codigo_orden}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
                          Creado: {row.creado_el ? new Date(row.creado_el).toLocaleString('es-CO') : '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono">{row.lote_generado || '⏳ Pendiente'}</td>
                      <td className="px-6 py-4">
                        <div>{row.nombre_producto}</div>
                        <div className="text-xs text-slate-400">{row.nombre_formula}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        {parseFloat(row.cantidad_ordenada).toFixed(2)} {row.unidad_medida}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-red-400">
                        ${parseFloat(row.costo_total).toLocaleString('es-CO')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          row.estado === 'Finalizada' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' : 'bg-yellow-950 text-yellow-400 border border-yellow-500/20'
                        }`}>
                          {row.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => loadOrderDetails(row.id_orden)}
                          className="inline-flex items-center px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold rounded transition"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Trazar Lote
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-16 text-slate-400">
                      Presione <strong className="text-indigo-400 font-bold">"Procesar Consulta"</strong> para cargar los registros del histórico.
                    </td>
                  </tr>
                )}

                {hasProcessed && data.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-slate-500">
                      No hay registros disponibles. Prueba ajustando los filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Genealogy Trace Drawer */}
      {selectedOrderId && orderDetails && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0f1422] border-l border-slate-800 shadow-2xl overflow-y-auto p-8 text-slate-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
              <div>
                <h3 className="text-2xl font-extrabold text-teal-400">Genealogía del Lote</h3>
                <p className="text-xs text-slate-400 font-mono mt-1">Orden: {orderDetails.orden?.codigo_orden}</p>
              </div>
              <button
                onClick={() => { setSelectedOrderId(null); setOrderDetails(null); }}
                className="text-slate-400 hover:text-white text-3xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Lote Final */}
              <div className="bg-[#1b253b] p-6 rounded-xl border border-slate-800 shadow-inner flex flex-col md:flex-row gap-6 items-center">
                {orderDetails.orden?.lote_generado && (
                  <div className="bg-[#0b0f19] p-3 rounded-lg border border-slate-700">
                    <QRCodeCanvas value={orderDetails.orden.lote_generado} size={90} includeMargin={true} />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lote Producido</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-black text-white font-mono">{orderDetails.orden?.lote_generado || 'PENDIENTE'}</span>
                    <span className="text-sm font-semibold text-slate-300">
                      {parseFloat(orderDetails.orden?.cantidad_ordenada).toFixed(2)} {orderDetails.orden?.unidad_medida}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex justify-between font-mono">
                    <span>Vencimiento: {new Date(orderDetails.orden?.fecha_vencimiento || new Date()).toLocaleDateString()}</span>
                    <span>Costo: ${parseFloat(orderDetails.orden?.costo_total).toLocaleString('es-CO')}</span>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => downloadLabelPdf({
                        codigo_orden: orderDetails.orden.codigo_orden,
                        lote_generado: orderDetails.orden.lote_generado,
                        producto: orderDetails.orden.nombre_producto || 'Producto Terminado',
                        fecha_cierre: new Date(orderDetails.orden.fecha_orden).toLocaleDateString('es-CO'),
                        cantidad: parseFloat(orderDetails.orden.cantidad_ordenada),
                        unidad_medida: orderDetails.orden.unidad_medida,
                      })}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold rounded-lg text-xs shadow-md transition"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1.5" />
                      Reimprimir Etiqueta BPM
                    </button>
                  </div>
                </div>
              </div>

              {/* Insumos */}
              <div>
                <h4 className="text-sm font-bold text-teal-400 flex items-center mb-3">
                  <Layers className="w-5 h-5 mr-2" />
                  1. Lotes de Origen Consumidos (MP)
                </h4>
                <div className="space-y-3">
                  {orderDetails.insumos?.map((ins) => (
                    <div key={ins.id_orden_insumo} className="bg-[#131b2e] p-4 rounded-xl border border-slate-850 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-white text-sm">{ins.nombre_insumo}</p>
                        <p className="text-xs font-mono text-slate-400 mt-1">Lote Origen: {ins.lote_insumo_origen}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono text-slate-200">{parseFloat(ins.cantidad_consumida).toFixed(2)} {ins.unidad_medida}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Costo Unit: ${parseFloat(ins.costo_unitario).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mano de Obra */}
              <div>
                <h4 className="text-sm font-bold text-teal-400 flex items-center mb-3">
                  <Users className="w-5 h-5 mr-2" />
                  2. Mano de Obra Directa (MOD)
                </h4>
                <div className="space-y-3">
                  {orderDetails.manoObra?.map((mo) => (
                    <div key={mo.id_orden_mo} className="bg-[#131b2e] p-4 rounded-xl border border-slate-855 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-white text-sm">{mo.nombre_empleado}</p>
                        <p className="text-xs font-mono text-slate-400 mt-1">Cédula: {mo.cedula}</p>
                      </div>
                      <div className="text-right font-mono">
                        <p className="text-sm text-slate-200">{mo.horas_jornales} Horas</p>
                        <p className="text-xs text-slate-500 mt-0.5">Subtotal: ${parseFloat(mo.subtotal).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Maquinarias */}
              <div>
                <h4 className="text-sm font-bold text-teal-400 flex items-center mb-3">
                  <Hammer className="w-5 h-5 mr-2" />
                  3. Maquinarias e Indirectos (CIF)
                </h4>
                <div className="space-y-3">
                  {orderDetails.maquinaria?.map((maq) => (
                    <div key={maq.id_orden_maq} className="bg-[#131b2e] p-4 rounded-xl border border-slate-855 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-white text-sm">{maq.maquina_nombre}</p>
                        <p className="text-xs font-mono text-slate-400 mt-1">Placa: {maq.placa}</p>
                      </div>
                      <div className="text-right font-mono">
                        <p className="text-sm text-slate-200">{maq.horas_reales} Horas</p>
                        <p className="text-xs text-slate-500 mt-0.5">Subtotal: ${parseFloat(maq.subtotal).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}

                  {/* Servicios Públicos e Impuestos CIF */}
                  <div className="bg-[#131b2e] p-4 rounded-xl border border-slate-855 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-slate-400 block mb-1">Energía</span>
                      <span className="font-bold text-purple-300 font-mono">${parseFloat(orderDetails.orden?.costo_energia || 0).toLocaleString('es-CO')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Agua</span>
                      <span className="font-bold text-purple-300 font-mono">${parseFloat(orderDetails.orden?.costo_agua || 0).toLocaleString('es-CO')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Impuestos/Otros</span>
                      <span className="font-bold text-purple-300 font-mono">${parseFloat(orderDetails.orden?.costo_impuestos || 0).toLocaleString('es-CO')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BPM Checklist */}
              {orderDetails.calidad && (
                <div>
                  <h4 className="text-sm font-bold text-teal-400 flex items-center mb-3">
                    <ShieldCheck className="w-5 h-5 mr-2" />
                    4. Calidad y Cumplimiento BPM
                  </h4>
                  <div className="bg-[#131b2e] p-5 rounded-xl border border-slate-855 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center pb-3 border-b border-slate-800 text-xs">
                      <div>
                        <p className="text-slate-400">Primera (Exp)</p>
                        <p className="text-lg font-bold text-green-400 font-mono">{parseFloat(orderDetails.calidad.cantidad_primera).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Segunda (Local)</p>
                        <p className="text-lg font-bold text-yellow-400 font-mono">{parseFloat(orderDetails.calidad.cantidad_segunda).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Merma</p>
                        <p className="text-lg font-bold text-red-400 font-mono">{parseFloat(orderDetails.calidad.merma).toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mt-3 text-sm">
                      {orderDetails.calidad.checklist_bpm_json && Object.entries(JSON.parse(orderDetails.calidad.checklist_bpm_json)).map(([key, val]) => (
                        <div key={key} className="flex justify-between items-center text-xs">
                          <span className="capitalize text-slate-400">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className={`font-bold ${val ? 'text-green-400' : 'text-red-400'}`}>{val ? 'Aprobado ✅' : 'Rechazado ❌'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => { setSelectedOrderId(null); setOrderDetails(null); }}
              className="w-full mt-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition"
            >
              Cerrar Vista de Trazabilidad
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionHistoryDashboard;
