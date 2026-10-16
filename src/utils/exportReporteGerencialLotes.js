import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { API_BASE, getAuthHeaders, authFetch } from './api';

export async function exportReporteGerencialLotes(tenantId, metadata = {}, filtros = {}) {
  try {
    // 1. Fetch data
    let url = `/api/produccion/lotes/gerencial?id_tenant=${tenantId}`;
    if (filtros.fincaId) url += `&id_finca=${filtros.fincaId}`;
    if (filtros.nucleoId) url += `&id_nucleo=${filtros.nucleoId}`;
    if (filtros.fechaInicio) url += `&fecha_inicio=${filtros.fechaInicio}`;
    if (filtros.fechaFin) url += `&fecha_fin=${filtros.fechaFin}`;

    const response = await authFetch(url);
    const json = await response.json();
    if (!json.success) throw new Error(json.error || 'Error fetching data');
    const data = json.data || [];

    const doc = new jsPDF({ orientation: 'landscape' });

    // 2. Fetch Logo
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

    // 3. Document Header
    doc.setFontSize(16);
    doc.setTextColor(26, 35, 50);
    doc.text(`${metadata.empresa || 'AgroPaccioli'}`, startX, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.text(`Reporte Gerencial: Estado de Lotes y Siembras`, startX, 26);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Filtros Aplicados:`, startX, 32);
    
    let filterY = 37;
    if (metadata.fincaNombre) { doc.text(`Finca: ${metadata.fincaNombre}`, startX, filterY); filterY += 5; }
    if (metadata.nucleoNombre) { doc.text(`Núcleo: ${metadata.nucleoNombre}`, startX, filterY); filterY += 5; }
    if (metadata.fechaRango) { doc.text(`Siembras entre: ${metadata.fechaRango}`, startX, filterY); filterY += 5; }
    
    const rolStr = metadata.rol ? ` (Rol: ${metadata.rol})` : '';
    doc.text(`Generado por: ${metadata.usuario || 'Usuario del Sistema'}${rolStr}`, startX, filterY); filterY += 5;
    doc.text(`Fecha y Hora: ${new Date().toLocaleString('es-ES')}`, startX, filterY); filterY += 5;
    doc.text(`Total de Registros: ${data.length}`, startX, filterY);

    // 4. Columns & Data Mapping
    const headers = [
      'Finca',
      'Núcleo',
      'Código Lote',
      'Nombre Lote',
      'Hectáreas',
      'Cultivo Actual',
      'Última Cosecha',
      'Producción Est. (Ton)',
      'Recolectado (Ton)'
    ];

    let totalHectareas = 0;
    let totalEstimado = 0;
    let totalRecolectado = 0;

    const rows = data.map(row => {
      const hectareas = parseFloat(row.hectareas) || 0;
      const estimado = parseFloat(row.produccion_estimada_ton) || 0;
      const recolectado = parseFloat(row.recolectado_ton) || 0;

      totalHectareas += hectareas;
      totalEstimado += estimado;
      totalRecolectado += recolectado;

      return [
        row.finca_nombre || 'N/A',
        row.nucleo_nombre || 'N/A',
        row.lote_codigo || '',
        row.lote_nombre || '',
        new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(hectareas),
        row.cultivo_actual || 'Sin Cultivo',
        row.fecha_ultima_cosecha ? new Date(row.fecha_ultima_cosecha).toLocaleDateString('es-ES') : 'N/A',
        new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(estimado),
        new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(recolectado)
      ];
    });

    // Add Totals Row
    rows.push([
      { content: 'TOTALES', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(totalHectareas), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: '', styles: { fillColor: [240, 240, 240] } },
      { content: '', styles: { fillColor: [240, 240, 240] } },
      { content: new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(totalEstimado), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(totalRecolectado), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
    ]);

    doc.autoTable({
      head: [headers],
      body: rows,
      startY: filterY + 5,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [26, 35, 50],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      margin: { top: 40, left: 10, right: 10 },
    });

    // 5. Footer Page Numbers
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

    doc.save(`Reporte_Gerencial_Lotes_${new Date().toISOString().slice(0, 10)}.pdf`);
    return true;
  } catch (err) {
    console.error('Error exporting PDF:', err);
    alert('Error al generar PDF: ' + err.message);
    return false;
  }
}
