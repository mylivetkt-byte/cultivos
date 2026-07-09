import { jsPDF } from 'jspdf';
import { readFileSync } from 'fs';
import { getConfig } from '../models/configEmpresa.js';

/**
 * Genera un reporte PDF en base64.
 * @param {Object} data - Información que se mostrará en el reporte.
 * @param {number} tenantId - Id del tenant para obtener la ruta del logo.
 * @returns {Promise<string>} PDF codificado en base64.
 */
export async function generateReport(data, tenantId) {
  // Obtener la configuración del cliente (logo_path)
  const config = await getConfig(tenantId);
  const logoPath = config.logo_path;

  const doc = new jsPDF();

  // Si existe logo, cargarlo y agregar al PDF
  if (logoPath) {
    try {
      const logoBuffer = readFileSync(logoPath);
      const base64 = logoBuffer.toString('base64');
      // Asumimos PNG; ajustar según tipo si fuera necesario
      doc.addImage(`data:image/png;base64,${base64}`, 'PNG', 10, 10, 40, 20);
    } catch (e) {
      console.error('Error al cargar logo desde ruta local:', e);
    }
  }

  // Cabecera del reporte
  doc.setFontSize(16);
  doc.text('Reporte Ganado/Herramientas', 10, 40);

  // Ejemplo de datos (personalizar según requerimientos)
  doc.setFontSize(12);
  let y = 50;
  for (const [key, value] of Object.entries(data)) {
    doc.text(`${key}: ${value}`, 10, y);
    y += 7;
  }

  // Devolver PDF como base64 (sin prefijo data:application/pdf;)
  const pdfBase64 = doc.output('datauristring').split(',')[1];
  return pdfBase64;
}
