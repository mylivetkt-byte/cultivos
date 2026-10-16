import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { authFetch } from '../../utils/api';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs';
import { useAuth } from '../../context/AuthContext';

function FinanzasDashboard({ tenantId = 1 }) {
  const { user } = useAuth();
  const [data, setData] = useState({
    flujoMensual: [],
    gastosCategorias: [],
    resumen: { plataGastada: 0, plataEnterrada: 0, ventasReales: 0, proyeccionCosecha: 0 }
  });

  const [filters, setFilters] = useState({
    fechaDesde: '',
    fechaHasta: '',
    id_finca: '',
    id_lote: '',
    anio: '',
    cosecha: ''
  });

  const [fincas, setFincas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [lapsos, setLapsos] = useState([]);

  const loadData = () => {
    const params = new URLSearchParams({ tenantId, anio: new Date().getFullYear() });
    Object.keys(filters).forEach(k => {
      if (filters[k]) params.append(k, filters[k]);
    });
    
    authFetch(`/api/finanzas-agro/dashboard?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('Error cargando dashboard');
        return res.json();
      })
      .then(setData)
      .catch(err => console.error(err));
  };

  const loadOptions = async () => {
    try {
      const [fRes, lRes, pRes] = await Promise.all([
        authFetch(`/api/contabilidad/subempresas?tenantId=${tenantId || 1}`),
        authFetch(`/api/table/lotes/data?tenantId=${tenantId || 1}&pageSize=1000`),
        authFetch(`/api/contabilidad/periodos?tenantId=${tenantId || 1}`)
      ]);
      if (fRes.ok) setFincas(await fRes.json());
      if (lRes.ok) { const d = await lRes.json(); setLotes(d.data || []); }
      if (pRes.ok) setLapsos(await pRes.json());
    } catch (err) {
      console.error("Error loading options:", err);
    }
  };

  useEffect(() => {
    loadOptions();
  }, [tenantId]);

  useEffect(() => {
    loadData();
  }, [tenantId, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    if (name === 'anio') {
      if (value) {
        setFilters({ ...filters, anio: value, fechaDesde: `${value}-01-01`, fechaHasta: `${value}-12-31` });
      } else {
        setFilters({ ...filters, anio: '', fechaDesde: '', fechaHasta: '' });
      }
    } else {
      setFilters({ ...filters, [name]: value });
    }
  };

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#64748b'];

  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);

  const exportExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = user?.nombre || 'Administrador';
      
      const headerDate = new Date().toLocaleString('es-CO');
      
      // 1. Hoja con Gráfico (Captura)
      const element = document.querySelector('.printable-dashboard');
      if (element) {
        const tempHeader = document.createElement('div');
        const fincaNombre = filters.id_finca && fincas.length > 0 ? fincas.find(f => f.id_finca.toString() === filters.id_finca)?.nombre : 'Todas las Fincas';
        tempHeader.innerHTML = `
          <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #ccc; padding-bottom: 10px; background: white; color: black; padding-top: 20px;">
            <h1 style="margin: 0; font-size: 24px;">AGROPECUARIA LLANOS ORIENTALES S.A.S.</h1>
            <h2 style="margin: 5px 0; color: #3b82f6;">BOLSILLO DEL PRODUCTOR</h2>
            <p style="margin: 5px 0; font-size: 14px; font-weight: bold;">Finca/Subempresa: ${fincaNombre}</p>
            <p style="margin: 0; font-size: 12px; color: #666;">Fecha de Impresión: ${headerDate}</p>
          </div>
        `;
        element.insertBefore(tempHeader, element.firstChild);
        
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        element.removeChild(tempHeader);
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const imageId = wb.addImage({ base64: imgData, extension: 'jpeg' });
        
        const wsGrafico = wb.addWorksheet('Gráfico Completo');
        wsGrafico.addImage(imageId, {
          tl: { col: 0, row: 0 },
          ext: { width: canvas.width * 0.4, height: canvas.height * 0.4 } // Scale down a bit for Excel
        });
      }

      // Función auxiliar para crear y formatear hojas
      const createSheet = (name, title, columns, rowData) => {
        const ws = wb.addWorksheet(name);
        ws.addRow(['Agropecuaria Llanos Orientales S.A.S.']).font = { bold: true, size: 14 };
        ws.addRow([title]).font = { bold: true, size: 12 };
        ws.addRow([`Fecha de Impresión: ${headerDate}`]);
        ws.addRow([`Usuario: ${user?.nombre || 'Administrador'}`]);
        ws.addRow([]);
        
        const headerRow = ws.addRow(columns.map(c => c.header));
        headerRow.font = { bold: true };
        
        rowData.forEach(r => {
          const row = ws.addRow(r);
          // Apply number format with thousands separator to cells that are numbers
          row.eachCell((cell) => {
            if (typeof cell.value === 'number') {
              cell.numFmt = '#,##0';
            }
          });
        });
        
        ws.columns = columns;
      };

      // 2. Hoja Resumen
      createSheet('Resumen', 'Reporte: Bolsillo del Productor', 
        [{ header: 'Rubro', key: 'rubro', width: 35 }, { header: 'Valor', key: 'valor', width: 25 }],
        [
          [ 'Plata Gastada (Costos Pagados)', Number(data.resumen.plataGastada) ],
          [ 'Plata Enterrada (Activos Biológicos)', Number(data.resumen.plataEnterrada) ],
          [ 'Ventas Reales (Ingresos)', Number(data.resumen.ventasReales) ],
          [ 'Proyección Cosecha', Number(data.resumen.proyeccionCosecha) ]
        ]
      );

      // 3. Hoja Flujo Mensual
      if (data.flujoMensual && data.flujoMensual.length > 0) {
        createSheet('Flujo Mensual', 'Flujo Mensual (Ventas vs Gastos)',
          [
            { header: 'Periodo', width: 20 },
            { header: 'Ingresos', width: 25 },
            { header: 'Gastos', width: 25 },
            { header: 'Utilidad', width: 25 }
          ],
          data.flujoMensual.map(item => [
            item.periodo,
            Number(item.ingresos || 0),
            Number(item.egresos || 0),
            Number(item.ingresos || 0) - Number(item.egresos || 0)
          ])
        );
      }

      // 4. Hoja Gastos Categoria
      if (data.gastosCategorias && data.gastosCategorias.length > 0) {
        createSheet('Gastos Categoria', 'Gastos por Categoría',
          [
            { header: 'Categoría', width: 35 },
            { header: 'Total Gastado', width: 25 }
          ],
          data.gastosCategorias.map(item => [ item.name, Number(item.value || 0) ])
        );
      }

      // Guardar
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "Bolsillo_Productor.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error("Error generando Excel", err);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Agropecuaria Llanos Orientales S.A.S.", 14, 20);
    doc.setFontSize(12);
    doc.text("Reporte: Bolsillo del Productor", 14, 30);
    doc.setFontSize(10);
    doc.text(`Fecha de Impresión: ${new Date().toLocaleString('es-CO')}`, 14, 40);
    doc.text(`Usuario: ${user?.nombre || 'Administrador'}`, 14, 46);

    const rows = [
      ['Plata Gastada', formatCurrency(data.resumen.plataGastada)],
      ['Plata Enterrada', formatCurrency(data.resumen.plataEnterrada)],
      ['Ventas Reales', formatCurrency(data.resumen.ventasReales)],
      ['Proyección Cosecha', formatCurrency(data.resumen.proyeccionCosecha)]
    ];
    doc.autoTable({ startY: 55, head: [['Concepto', 'Valor']], body: rows });
    doc.save('Bolsillo_Productor.pdf');
  };

  const downloadGraphicalPDF = async () => {
    const element = document.querySelector('.printable-dashboard');
    if (!element) return;
    
    // Configurar encabezado temporal
    const tempHeader = document.createElement('div');
    const fincaNombre = filters.id_finca && fincas.length > 0 ? fincas.find(f => f.id_finca.toString() === filters.id_finca)?.nombre : 'Todas las Fincas';
    tempHeader.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #ccc; padding-bottom: 10px; background: white; color: black; padding-top: 20px;">
        <h1 style="margin: 0; font-size: 24px;">AGROPECUARIA LLANOS ORIENTALES S.A.S.</h1>
        <h2 style="margin: 5px 0; color: #3b82f6;">BOLSILLO DEL PRODUCTOR</h2>
        <p style="margin: 5px 0; font-size: 14px; font-weight: bold;">Finca/Subempresa: ${fincaNombre}</p>
        <p style="margin: 0; font-size: 12px; color: #666;">Fecha de Impresión: ${new Date().toLocaleString('es-CO')} | Usuario: ${user?.nombre || 'Administrador'}</p>
      </div>
    `;
    element.insertBefore(tempHeader, element.firstChild);
    
    try {
      // Ocultar temporalmente estilos oscuros si es necesario para el canvas (html2canvas usa el DOM real)
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      element.removeChild(tempHeader);
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Si la imagen es más larga que la página A4, se cortará. Pero normalmente en landscape entra bien.
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('Bolsillo_Productor_Grafico.pdf');
    } catch (err) {
      console.error('Error generando PDF Gráfico', err);
      element.removeChild(tempHeader);
    }
  };

  const handlePrint = () => { 
    const printContent = document.querySelector('.printable-dashboard');
    if (!printContent) return;
    
    const fincaNombre = filters.id_finca && fincas.length > 0 
      ? fincas.find(f => f.id_finca.toString() === filters.id_finca)?.nombre 
      : 'Todas las Fincas';

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Bolsillo del Productor</title>
          <style>
            @media print {
              @page { margin: 15mm; size: landscape; }
              body { font-family: system-ui, -apple-system, sans-serif; background: white !important; color: black !important; }
              .card { border: 1px solid #ccc !important; box-shadow: none !important; page-break-inside: avoid; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              h2, h3, h4, p, span, text { color: black !important; }
            }
          </style>
        </head>
        <body style="background: white; margin: 0; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #ccc; padding-bottom: 10px;">
            <h1 style="margin: 0; font-size: 24px;">AGROPECUARIA LLANOS ORIENTALES S.A.S.</h1>
            <h2 style="margin: 5px 0; color: #3b82f6;">BOLSILLO DEL PRODUCTOR</h2>
            <p style="margin: 5px 0; font-size: 14px; font-weight: bold;">Finca/Subempresa: ${fincaNombre}</p>
            <p style="margin: 0; font-size: 12px; color: #666;">Fecha de Impresión: ${new Date().toLocaleString('es-CO')} | Usuario: ${user?.nombre || 'Administrador'}</p>
          </div>
          <div style="display: flex; flex-direction: column; gap: 20px;">
            ${printContent.innerHTML}
          </div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 800);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const shareWhatsApp = () => { 
    const msg = `*Resumen Financiero*\nGastado: ${formatCurrency(data.resumen.plataGastada)}\nInvertido: ${formatCurrency(data.resumen.plataEnterrada)}\nVentas: ${formatCurrency(data.resumen.ventasReales)}\nProyección: ${formatCurrency(data.resumen.proyeccionCosecha)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="p-4 dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>📊 Bolsillo del Productor</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={exportExcel} style={{ background: '#10b981', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📗 Excel</button>
            <button onClick={exportPDF} style={{ background: '#64748b', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📄 PDF (Datos)</button>
            <button onClick={downloadGraphicalPDF} style={{ background: '#ef4444', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📕 PDF (Gráfico)</button>
            <button onClick={handlePrint} style={{ background: '#3b82f6', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🖨️ Imprimir</button>
            <button onClick={shareWhatsApp} style={{ background: '#25D366', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>💬 WhatsApp</button>
          </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ display: 'flex', gap: '15px', padding: '15px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Finca / Subempresa</label>
          <select name="id_finca" value={filters.id_finca} onChange={handleFilterChange} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}>
            <option value="">-- Todas las Fincas --</option>
            {fincas.map(f => <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Lote / Vivero</label>
          <select name="id_lote" value={filters.id_lote} onChange={handleFilterChange} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}>
            <option value="">-- Todos los Lotes --</option>
            {lotes.filter(l => !filters.id_finca || String(l.id_finca) === String(filters.id_finca)).map(l => <option key={l.id_lote || l.id} value={l.id_lote || l.id}>{l.nombre || l.codigo}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Año Contable</label>
          <select name="anio" value={filters.anio} onChange={handleFilterChange} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }}>
            <option value="">-- Año Actual --</option>
            {Array.from(new Set(lapsos.map(p => p.ano || (p.periodo ? p.periodo.split('-')[0] : new Date().getFullYear())))).sort().reverse().map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Desde</label>
          <input type="date" name="fechaDesde" value={filters.fechaDesde} onChange={handleFilterChange} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hasta</label>
          <input type="date" name="fechaHasta" value={filters.fechaHasta} onChange={handleFilterChange} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <button onClick={loadData} style={{ background: 'var(--primary)', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Procesar</button>
        </div>
      </div>

      <div className="printable-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 4 KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderLeft: '5px solid #ef4444', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase' }}>💸 Plata Gastada</h4>
            <h2 style={{ color: '#ef4444', margin: 0 }}>{formatCurrency(data.resumen.plataGastada)}</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '5px 0 0 0' }}>Costos pagados e insumos</p>
          </div>
          <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderLeft: '5px solid #f59e0b', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase' }}>🌱 Plata Enterrada</h4>
            <h2 style={{ color: '#f59e0b', margin: 0 }}>{formatCurrency(data.resumen.plataEnterrada)}</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '5px 0 0 0' }}>Inversión en cultivos activos</p>
          </div>
          <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderLeft: '5px solid #10b981', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase' }}>💰 Ventas Reales</h4>
            <h2 style={{ color: '#10b981', margin: 0 }}>{formatCurrency(data.resumen.ventasReales)}</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '5px 0 0 0' }}>Ingresos por comercialización</p>
          </div>
          <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderLeft: '5px solid #8b5cf6', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase' }}>🔮 Proyección de Cosecha</h4>
            <h2 style={{ color: '#8b5cf6', margin: 0 }}>{formatCurrency(data.resumen.proyeccionCosecha)}</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '5px 0 0 0' }}>Ingreso esperado ciclo actual</p>
          </div>
        </div>

        {/* CHARTS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '20px', color: 'var(--text)' }}>Ventas vs Gastos (Mensual)</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={data.flujoMensual} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="periodo" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }} />
                  <Legend />
                  <Bar dataKey="ingresos" name="Ventas" fill="#10b981" />
                  <Bar dataKey="egresos" name="Gastos" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '20px', color: 'var(--text)' }}>¿En qué se gasta la plata?</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data.gastosCategorias}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.gastosCategorias.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinanzasDashboard;
