import jsPDF from 'jspdf';
import { API_BASE, getAuthHeaders } from './api';

const fetchImageBase64 = async (url) => {
  if (!url) return null;
  try {
    const res = await fetch(url);
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

export async function exportFichasPdf(tableName, columns, data, metadata = {}, fkOptions = {}) {
  try {
    const doc = new jsPDF({ orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Load Logo
    let logoBase64 = null;
    try {
      const resPath = await fetch(`${API_BASE}/config/logo`, { headers: getAuthHeaders() });
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

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      
      // Page break check
      if (currentY > pageHeight - 60) {
        doc.addPage();
        drawHeader();
      }

      // Card Background
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(15, currentY, pageWidth - 30, 50, 3, 3, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(15, currentY, pageWidth - 30, 50, 3, 3, 'S');

      // Card Title
      doc.setFontSize(14);
      doc.setTextColor(26, 35, 50);
      doc.setFont('helvetica', 'bold');
      const nombreComun = item.nombre_comun || 'Desconocido';
      doc.text(nombreComun.toUpperCase(), 20, currentY + 10);
      
      // Subtitle (Nombre Científico)
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'italic');
      doc.text(item.nombre_cientifico || '', 20, currentY + 16);

      // Info Fields
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      
      // Resolve Cultivo
      let cultivoName = 'General';
      if (item.id_cultivo && fkOptions['id_cultivo']) {
         const opt = fkOptions['id_cultivo'].find(o => String(o.id) === String(item.id_cultivo));
         if (opt) cultivoName = opt.display || opt.label;
      }
      
      doc.text(`Cultivo: ${cultivoName}`, 20, currentY + 24);
      doc.text(`Gravedad/Agresividad: ${item.gravedad || item.nivel_agresividad || 'N/A'}`, 20, currentY + 30);
      
      if (item.agente_causal) {
         doc.text(`Agente Causal: ${item.agente_causal}`, 20, currentY + 36);
      } else if (item.hospederos) {
         doc.text(`Hospederos: ${item.hospederos}`, 20, currentY + 36);
      }

      // Symptoms or Description
      const textToWrap = item.sintomas || item.descripcion || '';
      if (textToWrap) {
         doc.setFontSize(9);
         doc.setTextColor(80, 80, 80);
         const lines = doc.splitTextToSize(textToWrap, pageWidth - 90);
         doc.text(lines, 20, currentY + 44);
      }

      // Fetch and draw image
      if (item.imagen_url) {
        const itemImageBase64 = await fetchImageBase64(item.imagen_url);
        if (itemImageBase64) {
           const imgWidth = 40;
           const imgHeight = 40;
           const imgX = pageWidth - 15 - 5 - imgWidth; // right aligned inside card
           const imgY = currentY + 5;
           try {
             doc.addImage(itemImageBase64, 'JPEG', imgX, imgY, imgWidth, imgHeight);
           } catch(e) {
             try { doc.addImage(itemImageBase64, 'PNG', imgX, imgY, imgWidth, imgHeight); } catch(err){}
           }
        }
      }

      currentY += 55; // space for next card
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      const footerText = `Página ${i} de ${pageCount} - AgroPaccioli - ${new Date().toLocaleString('es-ES')}`;
      doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    if (metadata.returnBase64) return doc.output('datauristring');
    doc.save(`${tableName}_ilustrado_${new Date().toISOString().slice(0, 10)}.pdf`);
    
  } catch (err) {
    console.error('Error exporting Ficha PDF:', err);
    alert('Error al generar Catálogo Ilustrado: ' + err.message);
  }
}
