import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { API_BASE, getAuthHeaders } from './api';

export async function exportToPdf(tableName, columns, data, metadata = {}) {
  try {
    const doc = new jsPDF({ orientation: 'landscape' });

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

    const title = tableName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    let startX = 14;
    if (logoBase64) {
      try { doc.addImage(logoBase64, 'PNG', 14, 15, 25, 25); } catch(e) {
        try { doc.addImage(logoBase64, 'JPEG', 14, 15, 25, 25); } catch(err) {}
      }
      startX = 45;
    }

    // Title
    doc.setFontSize(16);
    doc.setTextColor(26, 35, 50);
    doc.text(`${metadata.empresa || 'SAS Agrícolas'} - ${title}`, startX, 20);

    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Finca Operativa: ${metadata.finca || 'Todas las Fincas'}`, startX, 28);
    doc.text(`Generado por: ${metadata.usuario || 'Usuario del Sistema'}`, startX, 33);
    doc.text(`Fecha y Hora: ${new Date().toLocaleString('es-ES')}`, startX, 38);
    doc.text(`Total de Registros: ${data.length}`, startX, 43);

    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Finca Operativa: ${metadata.finca || 'Todas las Fincas'}`, 14, 28);
    doc.text(`Generado por: ${metadata.usuario || 'Usuario del Sistema'}`, 14, 33);
    doc.text(`Fecha y Hora: ${new Date().toLocaleString('es-ES')}`, 14, 38);
    doc.text(`Total de Registros: ${data.length}`, 14, 43);

    // Filter out huge/unprintable columns
    const excludedTypes = ['json', 'polygon', 'point', 'longtext', 'mediumtext', 'blob'];
    const excludedNames = ['fotografia', 'imagen_url', 'poligono_gps', 'centro_gps', 'ficha_tecnica', 'contrasena', 'password'];
    
    const printableColumns = columns.filter(col => {
      const typeStr = (col.type || '').toLowerCase();
      const displayStr = (col.displayType || '').toLowerCase();
      if (excludedTypes.includes(typeStr) || excludedTypes.includes(displayStr)) return false;
      if (excludedNames.includes(col.name)) return false;
      return true;
    });

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

        if (typeof val === 'object') return JSON.stringify(val).slice(0, 50) + '...';
        return String(val);
      })
    );

    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 48,
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
      doc.text(
        `Página ${i} de ${pageCount} — SAS Agrícolas © ${new Date().getFullYear()}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`${tableName}_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (err) {
    console.error('Error exporting PDF:', err);
    alert('Error al generar PDF: ' + err.message);
  }
}
