import { getJsPDFConstructor, runAutoTable, downloadPdfDoc } from './exportPdf';
import { API_BASE, getAuthHeaders } from './api';

export async function exportSimulationPdf(projectData) {
  try {
    const PDFConstructor = getJsPDFConstructor();
    const doc = new PDFConstructor({ orientation: 'portrait' });

    // 1. Cargar Logo
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

    // --- ENCABEZADO GERENCIAL ---
    let startX = 14;
    let currentY = 20;

    if (logoBase64) {
      const pageWidth = doc.internal.pageSize.getWidth();
      const logoWidth = 25;
      const logoX = pageWidth - 14 - logoWidth;
      try { doc.addImage(logoBase64, 'PNG', logoX, 15, logoWidth, 25); } catch(e) {
        try { doc.addImage(logoBase64, 'JPEG', logoX, 15, logoWidth, 25); } catch(err) {}
      }
    }

    doc.setFontSize(18);
    doc.setTextColor(22, 163, 74); // Verde oscuro
    doc.text(`Reporte Agronómico: ${projectData.cultivo}`, startX, currentY);
    
    currentY += 8;
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text(`Finca: ${projectData.fincaNombre}`, startX, currentY);
    
    currentY += 6;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Área Sembrada: ${projectData.area} Hectáreas`, startX, currentY);
    
    currentY += 6;
    doc.text(`Duración del Ciclo: ${projectData.ciclo} Días`, startX, currentY);
    
    currentY += 6;
    doc.text(`Fecha de Siembra: ${projectData.fechaInicio}  |  Fecha Est. Cosecha: ${projectData.fechaFin}`, startX, currentY);

    currentY += 12;

    // --- SECCIÓN 1: RESUMEN FINANCIERO ---
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.text("1. Proyección Financiera (ABC)", startX, currentY);
    currentY += 6;

    const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

    const financialData = [
      ["Mano de Obra (Jornales Estimados)", formatCurrency(projectData.costos.manoObra)],
      ["Insumos (Semillas, Fertilizantes)", formatCurrency(projectData.costos.insumos)],
      ["Maquinaria (Horas Tractor/Equipos)", formatCurrency(projectData.costos.maquinaria)],
      ["Gastos Varios e Imprevistos", formatCurrency(projectData.costos.gastosVarios)],
      ["COSTO TOTAL PROYECTADO", formatCurrency(projectData.costos.total)],
      ["Ventas Proyectadas Estimadas", formatCurrency(projectData.ventas)],
      ["GANANCIA O PÉRDIDA NETA (ROI)", formatCurrency(projectData.roi)],
      ["CONCEPTO AGRONÓMICO", projectData.roi < 0 ? "INVIABLE: Los costos superan las ventas estimadas. Evaluar alternativas." : "VIABLE: El margen proyectado es positivo. Condiciones favorables."]
    ];

    if (projectData.alternativas && projectData.alternativas.length > 0) {
      let altText = "Alternativas Sugeridas (Mercado):\n";
      projectData.alternativas.forEach(alt => {
        altText += `- ${alt.cultivo}: Precio ${formatCurrency(alt.precio)}/Kg (ROI Est: ${formatCurrency(alt.roi_ha * projectData.area)})\n`;
      });
      financialData.push(["INTELIGENCIA DE MERCADO", altText]);
    }

    runAutoTable(doc, {
      head: [["Concepto Financiero", "Valor (COP)"]],
      body: financialData,
      startY: currentY,
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175] },
      didParseCell: function(data) {
        // Resaltar totales
        if (data.row.index === 4 || data.row.index === 6 || data.row.index === 7 || data.row.index === 8) {
          data.cell.styles.fontStyle = 'bold';
          if (data.row.index === 6 || data.row.index === 7) {
            data.cell.styles.textColor = projectData.roi < 0 ? [220, 38, 38] : [22, 163, 74];
          } else if (data.row.index === 4) {
            data.cell.styles.textColor = [220, 38, 38]; // Rojo para costo total
          } else if (data.row.index === 8) {
            data.cell.styles.textColor = [217, 119, 6]; // Ambar para Inteligencia
          }
        }
      }
    });

    currentY = doc.lastAutoTable.finalY + 15;

    // --- SECCIÓN 2: CRONOGRAMA OPERATIVO SEMANA A SEMANA ---
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.text("2. Cronograma de Labores (Semana a Semana)", startX, currentY);
    currentY += 6;

    // Algoritmo matemático para dividir el ciclo en semanas clave
    const semanasTotal = Math.ceil(projectData.ciclo / 7);
    const timeline = [];

    // Semana 1: Preparación
    timeline.push(["Semana 1", "0 a 7 días", "Preparación de Suelo", "Arado, cincelado y aplicación de enmiendas. Uso de Tractor."]);
    // Semana 2: Siembra
    timeline.push(["Semana 2", "8 a 14 días", "Siembra", "Aplicación de semilla y fertilizante de arranque."]);
    // Fertilización (25% del ciclo)
    const semFert1 = Math.max(3, Math.round(semanasTotal * 0.25));
    timeline.push([`Semana ${semFert1}`, `${(semFert1-1)*7} a ${semFert1*7} días`, "Fertilización 1", "Aplicación de Urea/NPK según requerimiento."]);
    // Fitosanitario (40% del ciclo)
    const semFito = Math.max(semFert1 + 1, Math.round(semanasTotal * 0.40));
    timeline.push([`Semana ${semFito}`, `${(semFito-1)*7} a ${semFito*7} días`, "Control Fitosanitario", "Aplicación de Herbicidas o Insecticidas preventivos."]);
    // Fertilización 2 (60% del ciclo)
    const semFert2 = Math.max(semFito + 1, Math.round(semanasTotal * 0.60));
    timeline.push([`Semana ${semFert2}`, `${(semFert2-1)*7} a ${semFert2*7} días`, "Fertilización 2", "Refuerzo nutricional para llenado de grano/fruto."]);
    // Cosecha (Última semana)
    timeline.push([`Semana ${semanasTotal}`, `${(semanasTotal-1)*7} a ${projectData.ciclo} días`, "Cosecha", "Recolección, empaque y logística de transporte de la cosecha."]);

    runAutoTable(doc, {
      head: [["Etapa / Semana", "Días", "Tipo de Labor", "Recomendación Operativa"]],
      body: timeline,
      startY: currentY,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] },
      styles: { cellPadding: 3, fontSize: 9 }
    });

    currentY = doc.lastAutoTable.finalY + 15;

    // --- SECCIÓN 3: LOGÍSTICA DE TRANSPORTE ---
    if (projectData.transportadores && projectData.transportadores.length > 0) {
      // Check if we need a new page
      if (currentY > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(30, 64, 175);
      doc.text("3. Logística de Transporte (Directorio Sugerido)", startX, currentY);
      currentY += 6;

      const totalToneladas = projectData.area * (projectData.rendimiento / 1000);
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(`Volumen Estimado a Cosechar: ${totalToneladas.toFixed(1)} Toneladas`, startX, currentY);
      currentY += 6;

      const transportData = projectData.transportadores.map(t => {
        const totalFlete = totalToneladas * (t.precio_tonelada_promedio || 0);
        return [
          t.nombre,
          t.ciudad_base || 'N/A',
          t.tipo_vehiculos || 'N/A',
          t.telefono || 'N/A',
          `${formatCurrency(t.precio_tonelada_promedio || 0)}/Ton`,
          formatCurrency(totalFlete)
        ];
      });

      runAutoTable(doc, {
        head: [["Empresa", "Origen", "Vehículos", "Teléfono", "Tarifa", "Flete Est."]],
        body: transportData,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11] },
        styles: { cellPadding: 3, fontSize: 8 }
      });
    }

    const timestamp = new Date().toLocaleString('es-CO');
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generado por: Planificador AgroPaccioli | ${timestamp}`, startX, doc.internal.pageSize.getHeight() - 10);
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.getWidth() - 25, doc.internal.pageSize.getHeight() - 10);
    }

    downloadPdfDoc(doc, `Proyeccion_${projectData.cultivo}_${(projectData.fincaNombre || '').replace(/\s+/g, '_')}.pdf`);
  } catch (error) {
    console.error("Error generando PDF de Simulación:", error);
    throw new Error("Hubo un problema al generar el PDF: " + error.message);
  }
}
