import { jsPDF } from 'jspdf';
import { API_BASE, getAuthHeaders } from './api';
import { triggerFileDownload } from './fileDownload';

const getJsPDFConstructor = () => {
  if (typeof jsPDF === 'function') return jsPDF;
  if (jsPDF && typeof jsPDF.jsPDF === 'function') return jsPDF.jsPDF;
  if (jsPDF && typeof jsPDF.default === 'function') return jsPDF.default;
  if (typeof window !== 'undefined') {
    if (window.jspdf && typeof window.jspdf.jsPDF === 'function') return window.jspdf.jsPDF;
    if (window.jsPDF && typeof window.jsPDF === 'function') return window.jsPDF;
  }
  return jsPDF;
};

const fetchImageBase64 = async (url) => {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
};

export async function exportFichasPdf(tableName, columns = [], data = [], metadata = {}, fkOptions = {}, previewWindow = null) {
  try {
    const PDFConstructor = getJsPDFConstructor();
    const doc = new PDFConstructor({ orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Load Logo
    let logoBase64 = null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const resPath = await fetch(`${API_BASE}/config/logo`, { 
        headers: getAuthHeaders(),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (resPath.ok) {
        const { logo_path } = await resPath.json();
        if (logo_path) {
          const baseUrl = API_BASE || '/api';
          const imgUrl = logo_path.startsWith('http') ? logo_path : `${baseUrl.replace('/api', '')}${logo_path.startsWith('/') ? '' : '/'}${logo_path}`;
          logoBase64 = await fetchImageBase64(imgUrl);
        }
      }
    } catch (e) { console.warn("Logo error", e); }

    let titleText = 'Catálogo Ilustrado';
    if (tableName === 'enfermedades') titleText = 'Catálogo Ilustrado de Enfermedades';
    if (tableName === 'plagas') titleText = 'Catálogo Ilustrado de Plagas';
    if (tableName === 'malezas') titleText = 'Catálogo Ilustrado de Malezas';

    let currentY = 15;
    
    // Draw Header
    const drawHeader = () => {
      if (logoBase64) {
        try { doc.addImage(logoBase64, 'PNG', pageWidth - 40, 10, 25, 25); } 
        catch(e) { try { doc.addImage(logoBase64, 'JPEG', pageWidth - 40, 10, 25, 25); } catch(err){} }
      }
      doc.setFontSize(18);
      doc.setTextColor(26, 35, 50);
      doc.text(metadata.empresa || 'AgroPaccioli', 15, 20);
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text(titleText, 15, 28);
      currentY = 40;
    };

    drawHeader();

    const itemsPerPage = 3;
    let cardHeight = 75;

    for (let i = 0; i < (data || []).length; i++) {
      const item = data[i];
      if (i > 0 && i % itemsPerPage === 0) {
        doc.addPage();
        drawHeader();
      }

      // Card Background Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, currentY, pageWidth - 28, cardHeight, 3, 3, 'FD');

      // Image or placeholder
      let imgData = null;
      if (item.fotografia) {
        imgData = await fetchImageBase64(item.fotografia);
      }

      if (imgData) {
        try {
          doc.addImage(imgData, 'JPEG', 18, currentY + 5, 65, 65);
        } catch(e) {
          try {
            doc.addImage(imgData, 'PNG', 18, currentY + 5, 65, 65);
          } catch(err) {
            doc.setFillColor(230, 230, 230);
            doc.rect(18, currentY + 5, 65, 65, 'F');
            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.text("Sin Imagen", 40, currentY + 38);
          }
        }
      } else {
        doc.setFillColor(235, 240, 245);
        doc.rect(18, currentY + 5, 65, 65, 'F');
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text("Sin Imagen", 40, currentY + 38);
      }

      // Details Column
      let textX = 90;
      let textY = currentY + 12;

      // Common Name
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(item.nombre_comun || item.nombre || 'Sin Nombre', textX, textY);
      
      // Scientific Name
      textY += 6;
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'italic');
      doc.text(item.nombre_cientifico || 'N/A', textX, textY);

      // Reset Font
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);

      textY += 8;
      let cultivoName = 'General';
      if (item.id_cultivo && fkOptions['id_cultivo']) {
         const opt = fkOptions['id_cultivo'].find(o => String(o.id) === String(item.id_cultivo));
         if (opt) cultivoName = opt.display || opt.label;
      }
      doc.text(`Cultivo Afectado: ${cultivoName}`, textX, textY);

      textY += 6;
      const gravedad = item.gravedad || item.nivel_agresividad || 'No especificada';
      doc.text(`Nivel de Daño / Agresividad: ${gravedad}`, textX, textY);

      textY += 8;
      const desc = item.sintomas || item.descripcion || 'Sin descripción detallada.';
      const splitDesc = doc.splitTextToSize(desc, pageWidth - textX - 20);
      doc.text(splitDesc.slice(0, 3), textX, textY);

      currentY += cardHeight + 8;
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      const footerText = `Página ${i} de ${pageCount} - AgroPaccioli - ${new Date().toLocaleString('es-CO')}`;
      doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    if (metadata.returnBase64) {
      if (previewWindow && !previewWindow.closed) previewWindow.close();
      return doc.output('datauristring');
    }

    const cleanTableName = (tableName || 'reporte').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${cleanTableName}_ilustrado_${new Date().toISOString().slice(0, 10)}.pdf`;

    const blob = doc.output('blob');

    if (previewWindow && !previewWindow.closed) {
      try {
        const previewUrl = URL.createObjectURL(blob);
        previewWindow.document.open();
        previewWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${fileName}</title>
              <style>
                html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #525659; }
                iframe { width: 100%; height: 100%; border: none; }
              </style>
            </head>
            <body>
              <iframe src="${previewUrl}#view=FitH" type="application/pdf"></iframe>
            </body>
          </html>
        `);
        previewWindow.document.close();
        setTimeout(() => {
          try { URL.revokeObjectURL(previewUrl); } catch {}
        }, 600000);
      } catch {
        try {
          const previewUrl = URL.createObjectURL(blob);
          previewWindow.location.href = previewUrl;
        } catch {}
      }
    }

    triggerFileDownload(blob, fileName);
    return true;
  } catch (err) {
    if (previewWindow && !previewWindow.closed) {
      try { previewWindow.close(); } catch {}
    }
    console.error('Error exporting Ficha PDF:', err);
    throw new Error('Error al generar Catálogo Ilustrado: ' + err.message);
  }
}
