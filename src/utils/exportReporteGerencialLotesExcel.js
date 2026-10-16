import * as XLSX from 'xlsx';
import { authFetch } from './api';

export async function exportReporteGerencialLotesExcel(tenantId, metadata = {}, filtros = {}) {
  try {
    let url = `/api/produccion/lotes/gerencial?id_tenant=${tenantId}`;
    if (filtros.fincaId) url += `&id_finca=${filtros.fincaId}`;
    if (filtros.nucleoId) url += `&id_nucleo=${filtros.nucleoId}`;
    if (filtros.fechaInicio) url += `&fecha_inicio=${filtros.fechaInicio}`;
    if (filtros.fechaFin) url += `&fecha_fin=${filtros.fechaFin}`;

    const response = await authFetch(url);
    const json = await response.json();
    if (!json.success) throw new Error(json.error || 'Error fetching data');
    const data = json.data || [];

    const excelData = [];
    
    // Metadata rows
    excelData.push(['Reporte Gerencial: Estado de Lotes y Siembras']);
    excelData.push([`Empresa: ${metadata.empresa || 'AgroPaccioli'}`]);
    if (metadata.fincaNombre) excelData.push([`Filtro Finca: ${metadata.fincaNombre}`]);
    if (metadata.nucleoNombre) excelData.push([`Filtro Núcleo: ${metadata.nucleoNombre}`]);
    if (metadata.fechaRango) excelData.push([`Filtro Fechas Siembras: ${metadata.fechaRango}`]);
    excelData.push([`Generado por: ${metadata.usuario || 'Gerencia'} - Fecha: ${new Date().toLocaleString('es-ES')}`]);
    excelData.push([]); // Empty row
    
    // Headers
    excelData.push([
      'Finca', 'Núcleo', 'Código Lote', 'Nombre Lote', 'Hectáreas', 
      'Cultivo Actual', 'Última Cosecha', 'Producción Est. (Ton)', 'Recolectado (Ton)'
    ]);

    let totalHectareas = 0;
    let totalEstimado = 0;
    let totalRecolectado = 0;

    data.forEach(row => {
      const hectareas = parseFloat(row.hectareas) || 0;
      const estimado = parseFloat(row.produccion_estimada_ton) || 0;
      const recolectado = parseFloat(row.recolectado_ton) || 0;

      totalHectareas += hectareas;
      totalEstimado += estimado;
      totalRecolectado += recolectado;

      excelData.push([
        row.finca_nombre || 'N/A',
        row.nucleo_nombre || 'N/A',
        row.lote_codigo || '',
        row.lote_nombre || '',
        hectareas,
        row.cultivo_actual || 'Sin Cultivo',
        row.fecha_ultima_cosecha ? new Date(row.fecha_ultima_cosecha).toLocaleDateString('es-ES') : 'N/A',
        estimado,
        recolectado
      ]);
    });

    // Totals
    excelData.push([
      'TOTALES', '', '', '', totalHectareas, '', '', totalEstimado, totalRecolectado
    ]);

    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lotes');
    
    XLSX.writeFile(wb, `Reporte_Gerencial_Lotes_${new Date().toISOString().slice(0, 10)}.xlsx`);
    return true;
  } catch (err) {
    console.error('Error exportando Excel:', err);
    alert('Error al generar Excel: ' + err.message);
    return false;
  }
}
