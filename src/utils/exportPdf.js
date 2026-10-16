import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { API_BASE, getAuthHeaders } from './api';

export async function exportToPdf(tableName, columns, data, metadata = {}, fkOptions = {}) {
  try {
    const doc = new jsPDF({ orientation: 'landscape' });

    let logoBase64 = null;
    try {
      const resPath = await fetch(`${API_BASE}/config/logo`, { headers: getAuthHeaders() });
      if (resPath.ok) {
        const { logo_path } = await resPath.json();
        if (logo_path) {
          const baseUrl = API_BASE || '/api';
          const imgUrl = logo_path.startsWith('http') ? logo_path : `${baseUrl.replace('/api', '')}${logo_path.startsWith('/') ? '' : '/'}${logo_path}`;
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

    const title = tableName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    let startX = 14;
    if (logoBase64) {
      const pageWidth = doc.internal.pageSize.getWidth();
      const logoWidth = 25;
      const logoX = pageWidth - 14 - logoWidth;
      try { doc.addImage(logoBase64, 'PNG', logoX, 15, logoWidth, 25); } catch(e) {
        try { doc.addImage(logoBase64, 'JPEG', logoX, 15, logoWidth, 25); } catch(err) {}
      }
    }

    // Title
    doc.setFontSize(16);
    doc.setTextColor(26, 35, 50);
    doc.text(`${metadata.empresa || 'AgroPaccioli'}`, startX, 20);
    
    // Report Name
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.text(`Reporte: ${metadata.reportName || title}`, startX, 26);

    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    let currentY = 32;
    doc.text(`Finca Operativa: ${metadata.finca || 'Todas las Fincas'}`, startX, currentY);
    currentY += 5;
    
    if (metadata.cultivo) {
      doc.text(`Cultivo: ${metadata.cultivo}`, startX, currentY);
      currentY += 5;
    }
    
    if (metadata.fechaDesde || metadata.fechaHasta) {
      const fd = metadata.fechaDesde || 'Histórico';
      const fh = metadata.fechaHasta || 'Histórico';
      doc.text(`Periodo: ${fd} a ${fh}`, startX, currentY);
      currentY += 5;
    }
    
    if (metadata.extraFiltros && metadata.extraFiltros.length > 0) {
      metadata.extraFiltros.forEach(f => {
        doc.text(`${f.label}: ${f.value}`, startX, currentY);
        currentY += 5;
      });
    }
    
    doc.text(`Total de Registros: ${data.length}`, startX, currentY);

    // Filter out huge/unprintable columns
    const excludedTypes = ['json', 'polygon', 'point', 'longtext', 'mediumtext', 'blob'];
    const excludedNames = ['fotografia', 'imagen_url', 'poligono_gps', 'centro_gps', 'ficha_tecnica', 'contrasena', 'password', 'id_tenant', 'tenant_id', 'created_at', 'updated_at'];
    
    let printableColumns = columns.filter(col => {
      const typeStr = (col.type || '').toLowerCase();
      const displayStr = (col.displayType || '').toLowerCase();
      if (excludedTypes.includes(typeStr) || excludedTypes.includes(displayStr)) return false;
      if (excludedNames.includes(col.name)) return false;
      return true;
    });

    // GUARANTEE: Never exceed 9 columns to prevent horizontal squishing in PDF
    if (printableColumns.length > 9) {
      printableColumns = printableColumns.slice(0, 9);
    }

    // Column headers and data rows
    const headers = printableColumns.map((col) =>
      col.name
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
    );

    const rows = data.map((row) =>
      printableColumns.map((col) => {
        const val = row[col.name];
        if (val === null || val === undefined) return '';
        
        // Booleans
        if (col.displayType === 'boolean' || col.type === 'tinyint(1)') {
          return val ? 'Sí' : 'No';
        }
        
        // Dates
        if (col.displayType === 'date' || col.type === 'date') {
           try { return new Date(val).toLocaleDateString('es-ES'); } catch { return String(val); }
        }

        // Currency / Decimals
        if (col.displayType === 'decimal' || (col.type && col.type.toLowerCase().startsWith('decimal'))) {
           const num = parseFloat(val);
           if (isNaN(num)) return String(val);
           const isCurrency = /costo|precio|valor|total|salario|pago|monto|tarifa/i.test(col.name);
           if (isCurrency) {
             return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
           }
           return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(num);
        }

        if (fkOptions && fkOptions[col.name]) {
          const option = fkOptions[col.name].find(opt => String(opt.id) === String(val) || String(opt.value) === String(val));
          if (option) return String(option.display || option.label || val);
        }

        if (typeof val === 'object') return JSON.stringify(val).slice(0, 50) + '...';
        return String(val);
      })
    );

    doc.autoTable({
      head: [headers],
      body: rows,
      startY: currentY + 5,
      styles: {
        fontSize: 7,
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

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      const rolStr = metadata.rol ? ` (Rol: ${metadata.rol})` : '';
      const footerText1 = `Generado por: ${metadata.usuario || 'Usuario del Sistema'}${rolStr} | Fecha y Hora: ${new Date().toLocaleString('es-ES')}`;
      const footerText2 = `Página ${i} de ${pageCount} — AgroPaccioli © ${new Date().getFullYear()}`;
      
      doc.text(
        footerText1,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 14,
        { align: 'center' }
      );
      doc.text(
        footerText2,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    if (metadata.returnBase64) {
      return doc.output('datauristring');
    }
    doc.save(`${tableName}_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (err) {
    console.error('Error exporting PDF:', err);
    alert('Error al generar PDF: ' + err.message);
  }
}
