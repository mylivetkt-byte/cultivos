import { getJsPDFConstructor, runAutoTable, downloadPdfDoc } from './exportPdf';
import { API_BASE, getAuthHeaders } from './api';

export async function exportReporteDetalladoLote(historicoData, cosechasData, laboresData, insumosData, metadata = {}) {
  try {
    const PDFConstructor = getJsPDFConstructor();
    const doc = new PDFConstructor({ orientation: 'portrait' });
    const { lote, siembra, produccionAcumulada } = historicoData;

    // 1. Fetch Logo
    let logoBase64 = null;
    try {
      const resPath = await fetch(`${API_BASE}/config/logo`, { headers: getAuthHeaders() });
      if (resPath.ok) {
        const { logo_path } = await resPath.json();
        if (logo_path) {
          const imgUrl = logo_path.startsWith('http') ? logo_path : `${API_BASE.replace('/api', '')}${logo_path.startsWith('/') ? '' : '/'}${logo_path}`;
          const imgRes = await fetch(imgUrl);
          if (imgRes.ok) {
             const blob = await imgRes.blob();
             logoBase64 = await new Promise((resolve) => {
               const reader = new FileReader();
               reader.onloadend = () => resolve(reader.result);
               reader.readAsDataURL(blob);
             });
          }
        }
      }
    } catch (e) {
      console.warn("Could not load logo", e);
    }

    let startX = 14;
    if (logoBase64) {
      const pageWidth = doc.internal.pageSize.getWidth();
      const logoWidth = 25;
      const logoX = pageWidth - 14 - logoWidth;
      try { doc.addImage(logoBase64, 'PNG', logoX, 15, logoWidth, 25); } catch(e) {
        try { doc.addImage(logoBase64, 'JPEG', logoX, 15, logoWidth, 25); } catch(err) {}
      }
    }

    // 2. Document Header
    doc.setFontSize(16);
    doc.setTextColor(26, 35, 50);
    doc.text(`${metadata.empresa || 'AgroPaccioli'}`, startX, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.text(`Reporte Detallado de Lote`, startX, 28);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    
    let currentY = 36;
    doc.text(`Finca: ${lote?.finca_nombre || 'N/A'}`, startX, currentY); currentY += 5;
    doc.text(`Núcleo: ${lote?.nucleo_nombre || 'N/A'}`, startX, currentY); currentY += 5;
    doc.text(`Lote: ${lote?.codigo} - ${lote?.nombre}`, startX, currentY); currentY += 5;
    doc.text(`Hectáreas: ${lote?.hectareas}`, startX, currentY); currentY += 5;
    doc.text(`Cultivo: ${siembra ? siembra.cultivo_nombre : 'Ninguno'}`, startX, currentY); currentY += 5;
    doc.text(`Fecha Generación: ${new Date().toLocaleString('es-ES')}`, startX, currentY); currentY += 10;

    // 3. Tabla Cosechas
    if (cosechasData && cosechasData.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(26, 35, 50);
      doc.text('Historial de Cosechas', startX, currentY);
      currentY += 4;
      
      const cols = ['Fecha Cosecha', 'Producción Total (Kg)', 'Acumulado a la Fecha (Kg)'];
      const rows = cosechasData.map(c => [
        c.fecha_cosecha ? new Date(c.fecha_cosecha).toLocaleDateString() : '-',
        `${Number(c.produccion_total_kg || 0).toLocaleString()}`,
        `${Number(c.acumulado_kg || 0).toLocaleString()}`
      ]);
      
      doc.autoTable({
        head: [cols],
        body: rows,
        startY: currentY,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [178, 69, 146] }
      });
      currentY = doc.lastAutoTable.finalY + 15;
    }

    // 4. Tabla Nómina y Labores
    if (laboresData && laboresData.length > 0) {
      // check if we need new page
      if (currentY > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(26, 35, 50);
      doc.text('Historial de Nómina, Maquinaria y Labores', startX, currentY);
      currentY += 4;
      
      const cols = ['Fecha', 'Labor', 'Categoría', 'Empleado', 'Horas', 'Costo Mano Obra', 'Maquinaria'];
      let totalCosto = 0;
      const rows = laboresData.map(l => {
        totalCosto += Number(l.costo_mano_obra || 0);
        return [
          l.fecha_completado ? new Date(l.fecha_completado).toLocaleDateString() : '-',
          l.labor_nombre || '-',
          l.labor_categoria || '-',
          `${l.empleado_nombres || ''} ${l.empleado_apellidos || ''}`.trim() || '-',
          l.horas_trabajadas || '-',
          `$${Number(l.costo_mano_obra || 0).toLocaleString()}`,
          l.maquinaria_nombre ? `${l.maquinaria_nombre}` : '-'
        ];
      });
      rows.push([{ content: 'TOTAL MANO OBRA', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `$${Number(totalCosto).toLocaleString()}`, styles: { fontStyle: 'bold' } }, '']);

      runAutoTable(doc, {
        head: [cols],
        body: rows,
        startY: currentY,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [19, 78, 94] }
      });
      currentY = (doc.lastAutoTable?.finalY || currentY) + 15;
    }

    // 5. Tabla Insumos Aplicados
    if (insumosData && insumosData.length > 0) {
      if (currentY > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(26, 35, 50);
      doc.text('Historial de Insumos Aplicados', startX, currentY);
      currentY += 4;
      
      const cols = ['Fecha', 'Insumo', 'Labor Asoc.', 'Cantidad', 'Costo Unit.', 'Costo Total'];
      let totalInsumos = 0;
      const rows = insumosData.map(i => {
        totalInsumos += Number(i.costo_total || 0);
        return [
          i.fecha_completado ? new Date(i.fecha_completado).toLocaleDateString() : '-',
          `${i.insumo_codigo} - ${i.insumo_nombre}`,
          i.labor_nombre || '-',
          `${i.cantidad_aplicada} ${i.unidad_medida || ''}`,
          `$${Number(i.costo_unitario || 0).toLocaleString()}`,
          `$${Number(i.costo_total || 0).toLocaleString()}`
        ];
      });
      rows.push([{ content: 'TOTAL INSUMOS', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `$${Number(totalInsumos).toLocaleString()}`, styles: { fontStyle: 'bold' } }]);

      runAutoTable(doc, {
        head: [cols],
        body: rows,
        startY: currentY,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [35, 122, 59] } // Verde
      });
    }

    // 6. Footer Page Numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${i} de ${pageCount} — AgroPaccioli © ${new Date().getFullYear()}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    const safeLoteName = (lote?.codigo || 'Lote').replace(/[^a-zA-Z0-9]/g, '_');
    downloadPdfDoc(doc, `Reporte_Detallado_${safeLoteName}_${new Date().toISOString().slice(0, 10)}.pdf`);
    return true;
  } catch (err) {
    console.error('Error exporting PDF:', err);
    throw new Error('Error al generar PDF: ' + err.message);
  }
}
