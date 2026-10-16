import React, { useState, useEffect } from 'react';
import { ConfigProvider, theme, Select, Button, Typography, Space, message } from 'antd';
import { FileExcelOutlined, FilePdfOutlined, PrinterOutlined } from '@ant-design/icons';
import { fetchTableData, authFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs';

const { Option } = Select;
const { Title, Text } = Typography;

function RentabilidadLote() {
  const { user } = useAuth();
  const tenantId = user?.id_tenant || 1;
  const [filtros, setFiltros] = useState({ finca: null, lote: null, cosecha: 1 });
  const [fincas, setFincas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [rentabilidadData, setRentabilidadData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFincas = async () => {
      try {
        const res = await fetchTableData('fincas', { tenantId, pageSize: 100 });
        setFincas(res.data || []);
      } catch (err) {
        console.error('Error cargando fincas:', err);
      }
    };
    fetchFincas();
  }, [tenantId]);

  useEffect(() => {
    const fetchLotes = async () => {
      if (!filtros.finca) {
        setLotes([]);
        return;
      }
      try {
        const res = await fetchTableData('lotes', { tenantId, id_finca: filtros.finca, pageSize: 500 });
        setLotes(res.data || []);
      } catch (err) {
        console.error('Error cargando lotes:', err);
      }
    };
    fetchLotes();
  }, [filtros.finca, tenantId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tenantId });
      if (filtros.finca) params.append('id_finca', filtros.finca);
      if (filtros.lote) params.append('id_lote', filtros.lote);
      if (filtros.cosecha) params.append('cosecha', filtros.cosecha);

      const res = await authFetch(`/api/finanzas-agro/rentabilidad-lote?${params.toString()}`);
      if (!res.ok) throw new Error('Error cargando rentabilidad');
      const data = await res.json();
      setRentabilidadData(data.data || []);
      message.success('Datos actualizados correctamente');
    } catch (err) {
      console.error(err);
      message.error('No se pudo cargar la rentabilidad');
    } finally {
      setLoading(false);
    }
  };

  const totalCosto = rentabilidadData.reduce((acc, row) => acc + Number(row.costo), 0);
  const totalIngreso = rentabilidadData.reduce((acc, row) => acc + Number(row.ingreso), 0);
  const utilidad = totalIngreso - totalCosto;
  const margen = totalIngreso > 0 ? ((utilidad / totalIngreso) * 100).toFixed(1) : 0;

  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const exportExcel = async () => {
    if (rentabilidadData.length === 0) return message.warning('No hay datos para exportar');
    
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = user?.nombre || 'Administrador';
      const headerDate = new Date().toLocaleString('es-CO');

      // 1. Hoja con Gráfico (Captura)
      const element = document.querySelector('.printable-rentabilidad');
      if (element) {
        const tempHeader = document.createElement('div');
        const fincaNombre = filtros.finca && fincas.length > 0 ? fincas.find(f => f.id_finca.toString() === filtros.finca.toString())?.nombre : 'Todas las Fincas';
        tempHeader.innerHTML = `
          <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #ccc; padding-bottom: 10px; background: white; color: black; padding-top: 20px;">
            <h1 style="margin: 0; font-size: 24px;">AGROPECUARIA LLANOS ORIENTALES S.A.S.</h1>
            <h2 style="margin: 5px 0; color: #3b82f6;">RENTABILIDAD AGRO-FINANCIERA POR LOTE</h2>
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
          ext: { width: canvas.width * 0.4, height: canvas.height * 0.4 }
        });
      }

      // 2. Hoja Datos
      const wsDatos = wb.addWorksheet('Datos Rentabilidad');
      wsDatos.addRow(['Agropecuaria Llanos Orientales S.A.S.']).font = { bold: true, size: 14 };
      wsDatos.addRow(['Reporte: Rentabilidad Agro-Financiera por Lote']).font = { bold: true, size: 12 };
      wsDatos.addRow([`Fecha de Impresión: ${headerDate}`]);
      wsDatos.addRow([`Usuario: ${user?.nombre || 'Administrador'}`]);
      wsDatos.addRow([]);

      const columns = [
        { header: 'Concepto', width: 40 },
        { header: 'Costos (Cta 7)', width: 25 },
        { header: 'Ingresos (Cta 4)', width: 25 }
      ];
      const headerRow = wsDatos.addRow(columns.map(c => c.header));
      headerRow.font = { bold: true };
      
      const rowData = rentabilidadData.map(r => [
        r.concepto,
        Number(r.costo || 0),
        Number(r.ingreso || 0)
      ]);
      rowData.push(['TOTAL', Number(totalCosto || 0), Number(totalIngreso || 0)]);

      rowData.forEach(r => {
        const row = wsDatos.addRow(r);
        row.eachCell((cell) => {
          if (typeof cell.value === 'number') {
            cell.numFmt = '#,##0';
          }
        });
      });
      wsDatos.columns = columns;

      // Guardar
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "Rentabilidad_Lote.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error("Error generando Excel", err);
    }
  };

  const exportPDF = () => {
    if (rentabilidadData.length === 0) return message.warning('No hay datos para exportar');
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Agropecuaria Llanos Orientales S.A.S.", 14, 20);
    doc.setFontSize(12);
    doc.text("Reporte: Rentabilidad Agro-Financiera por Lote", 14, 30);
    doc.setFontSize(10);
    doc.text(`Fecha de Impresión: ${new Date().toLocaleString('es-CO')}`, 14, 40);
    doc.text(`Usuario: ${user?.nombre || 'Administrador'}`, 14, 46);

    const rows = rentabilidadData.map(r => [r.concepto, formatCurrency(r.costo), formatCurrency(r.ingreso)]);
    rows.push(['TOTAL', formatCurrency(totalCosto), formatCurrency(totalIngreso)]);
    doc.autoTable({ startY: 55, head: [['Concepto', 'Costos (Cta 7)', 'Ingresos (Cta 4)']], body: rows });
    doc.save('Rentabilidad_Lote.pdf');
  };

  const downloadGraphicalPDF = async () => {
    const element = document.querySelector('.printable-rentabilidad');
    if (!element) return;
    
    const tempHeader = document.createElement('div');
    const fincaNombre = filtros.finca && fincas.length > 0 
      ? fincas.find(f => f.id_finca.toString() === filtros.finca.toString())?.nombre 
      : 'Todas las Fincas';
    tempHeader.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #ccc; padding-bottom: 10px; background: white; color: black; padding-top: 20px;">
        <h1 style="margin: 0; font-size: 24px;">AGROPECUARIA LLANOS ORIENTALES S.A.S.</h1>
        <h2 style="margin: 5px 0; color: #3b82f6;">RENTABILIDAD AGRO-FINANCIERA POR LOTE</h2>
        <p style="margin: 5px 0; font-size: 14px; font-weight: bold;">Finca/Subempresa: ${fincaNombre}</p>
        <p style="margin: 0; font-size: 12px; color: #666;">Fecha de Impresión: ${new Date().toLocaleString('es-CO')} | Usuario: ${user?.nombre || 'Administrador'}</p>
      </div>
    `;
    element.insertBefore(tempHeader, element.firstChild);
    
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      element.removeChild(tempHeader);
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('Rentabilidad_Lote_Grafico.pdf');
    } catch (err) {
      console.error('Error generando PDF', err);
      element.removeChild(tempHeader);
    }
  };

  const handlePrint = () => {
    const printContent = document.querySelector('.printable-rentabilidad');
    if (!printContent) return;
    
    const fincaNombre = filtros.finca && fincas.length > 0 
      ? fincas.find(f => f.id_finca.toString() === filtros.finca.toString())?.nombre 
      : 'Todas las Fincas';

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Rentabilidad Agro-Financiera por Lote</title>
          <style>
            @media print {
              @page { margin: 15mm; size: landscape; }
              body { font-family: system-ui, -apple-system, sans-serif; background: white !important; color: black !important; }
              .card { border: 1px solid #ccc !important; box-shadow: none !important; page-break-inside: avoid; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              h2, h3, h4, p, span, td, th { color: black !important; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ccc !important; padding: 8px !important; }
              th { background-color: #f3f4f6 !important; }
            }
          </style>
        </head>
        <body style="background: white; margin: 0; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #ccc; padding-bottom: 10px;">
            <h1 style="margin: 0; font-size: 24px;">AGROPECUARIA LLANOS ORIENTALES S.A.S.</h1>
            <h2 style="margin: 5px 0; color: #3b82f6;">RENTABILIDAD AGRO-FINANCIERA POR LOTE</h2>
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

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <div className="p-4 dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '15px' }}>
          <Title level={2} style={{ color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            🌾 <span style={{ color: 'var(--primary)' }}>Rentabilidad Agro-Financiera por Lote</span>
          </Title>
          <Space>
            <Button type="primary" onClick={exportExcel} style={{ background: '#10b981', borderColor: '#10b981' }} icon={<FileExcelOutlined />}>Excel</Button>
            <Button type="primary" onClick={exportPDF} style={{ background: '#64748b', borderColor: '#64748b' }} icon={<FilePdfOutlined />}>PDF (Datos)</Button>
            <Button type="primary" onClick={downloadGraphicalPDF} danger icon={<FilePdfOutlined />}>PDF (Gráfico)</Button>
            <Button type="primary" onClick={handlePrint} style={{ background: '#3b82f6', borderColor: '#3b82f6' }} icon={<PrinterOutlined />}>Imprimir</Button>
          </Space>
        </div>

        <div style={{ display: 'flex', gap: '15px', padding: '15px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '220px' }}>
            <Text type="secondary" style={{ fontSize: '12px', marginBottom: '5px' }}>Finca</Text>
            <Select 
              showSearch 
              style={{ width: '100%' }} 
              placeholder="Filtrar por Finca" 
              value={filtros.finca} 
              onChange={(val) => setFiltros({ ...filtros, finca: val })} 
              allowClear 
              optionFilterProp="children"
            >
              {fincas.map(f => (
                <Option key={f.id_finca || f.id} value={f.id_finca || f.id}>{f.codigo} - {f.nombre}</Option>
              ))}
            </Select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '220px' }}>
            <Text type="secondary" style={{ fontSize: '12px', marginBottom: '5px' }}>Lote</Text>
            <Select 
              showSearch 
              style={{ width: '100%' }} 
              placeholder="Filtrar por Lote" 
              value={filtros.lote} 
              onChange={(val) => setFiltros({ ...filtros, lote: val })} 
              allowClear 
              optionFilterProp="children"
            >
              {lotes.map(l => (
                <Option key={l.id_lote || l.id} value={l.id_lote || l.id}>{l.codigo} - {l.nombre}</Option>
              ))}
            </Select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '220px' }}>
            <Text type="secondary" style={{ fontSize: '12px', marginBottom: '5px' }}>Cosecha / Ciclo</Text>
            <Select 
              showSearch 
              style={{ width: '100%' }} 
              placeholder="Seleccione Ciclo" 
              value={filtros.cosecha} 
              onChange={(val) => setFiltros({ ...filtros, cosecha: val })} 
              allowClear 
              optionFilterProp="children"
            >
              <Option value={1}>Ciclo 2026-A</Option>
            </Select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <Button type="primary" onClick={loadData} loading={loading} style={{ height: '32px' }}>Procesar</Button>
          </div>
        </div>

        <div className="printable-rentabilidad" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderLeft: '5px solid #ef4444' }}>
              <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '14px' }}>Costos Totales</h4>
              <h2 style={{ color: '#ef4444', margin: 0 }}>{formatCurrency(totalCosto)}</h2>
            </div>
            <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderLeft: '5px solid #10b981' }}>
              <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '14px' }}>Ingresos Totales</h4>
              <h2 style={{ color: '#10b981', margin: 0 }}>{formatCurrency(totalIngreso)}</h2>
            </div>
            <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderLeft: '5px solid #3b82f6' }}>
              <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '14px' }}>Utilidad Bruta</h4>
              <h2 style={{ color: '#3b82f6', margin: 0 }}>{formatCurrency(utilidad)}</h2>
            </div>
            <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderLeft: '5px solid #8b5cf6' }}>
              <h4 style={{ color: 'var(--text-muted)', margin: '0 0 10px 0', fontSize: '14px' }}>Margen (%)</h4>
              <h2 style={{ color: '#8b5cf6', margin: 0 }}>{margen}%</h2>
            </div>
          </div>

          <div className="card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--border)', color: 'var(--text)' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Concepto (Labor/Venta)</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Costos (Cta 7)</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Ingresos (Cta 4)</th>
                </tr>
              </thead>
              <tbody>
                {rentabilidadData.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No hay datos contables para los filtros seleccionados. Presione Procesar.
                    </td>
                  </tr>
                ) : (
                  rentabilidadData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px', color: 'var(--text)' }}>{row.concepto}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: row.costo > 0 ? '#ef4444' : 'inherit' }}>{row.costo > 0 ? formatCurrency(row.costo) : '-'}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: row.ingreso > 0 ? '#10b981' : 'inherit' }}>{row.ingreso > 0 ? formatCurrency(row.ingreso) : '-'}</td>
                    </tr>
                  ))
                )}
                {rentabilidadData.length > 0 && (
                  <tr style={{ fontWeight: 'bold', background: 'rgba(0,0,0,0.02)' }}>
                    <td style={{ padding: '10px', textAlign: 'right' }}>TOTAL:</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#ef4444' }}>{formatCurrency(totalCosto)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#10b981' }}>{formatCurrency(totalIngreso)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}

export default RentabilidadLote;
