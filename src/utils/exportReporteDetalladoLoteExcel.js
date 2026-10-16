import * as XLSX from 'xlsx';

export function exportReporteDetalladoLoteExcel(historicoData, cosechasData, laboresData, insumosData, metadata = {}) {
  try {
    const { lote, siembra, produccionAcumulada } = historicoData;
    const wb = XLSX.utils.book_new();

    // 1. Hoja de Datos Generales
    const wsGenerales = XLSX.utils.aoa_to_sheet([
      ['Reporte Detallado de Lote', ''],
      ['Empresa', metadata.empresa || 'AgroPaccioli'],
      ['Generado el', new Date().toLocaleString()],
      ['', ''],
      ['--- DATOS DEL LOTE ---', ''],
      ['Finca', lote?.finca_nombre || 'N/A'],
      ['Núcleo', lote?.nucleo_nombre || 'N/A'],
      ['Código', lote?.codigo],
      ['Nombre', lote?.nombre],
      ['Hectáreas', lote?.hectareas],
      ['', ''],
      ['--- CULTIVO ACTUAL ---', ''],
      ['Cultivo', siembra ? siembra.cultivo_nombre : 'Ninguno'],
      ['Fecha Siembra', siembra ? new Date(siembra.fecha_siembra).toLocaleDateString() : 'N/A'],
      ['Producción Histórica', produccionAcumulada ? `${Number(produccionAcumulada)} Kg` : '0 Kg']
    ]);
    XLSX.utils.book_append_sheet(wb, wsGenerales, 'Resumen Lote');

    // 2. Hoja de Cosechas
    if (cosechasData && cosechasData.length > 0) {
      const cosechasMatrix = [
        ['Fecha Cosecha', 'Producción Total (Kg)', 'Acumulado a la Fecha (Kg)']
      ];
      cosechasData.forEach(c => {
        cosechasMatrix.push([
          c.fecha_cosecha ? new Date(c.fecha_cosecha).toLocaleDateString() : '-',
          Number(c.produccion_total_kg || 0),
          Number(c.acumulado_kg || 0)
        ]);
      });
      const wsCosechas = XLSX.utils.aoa_to_sheet(cosechasMatrix);
      XLSX.utils.book_append_sheet(wb, wsCosechas, 'Cosechas');
    }

    // 3. Hoja de Nómina y Labores
    if (laboresData && laboresData.length > 0) {
      const laboresMatrix = [
        ['Fecha Completado', 'Labor', 'Categoría', 'Empleado (Nómina)', 'Horas', 'Costo (Mano Obra)', 'Maquinaria / Dron']
      ];
      let totalCosto = 0;
      laboresData.forEach(l => {
        const costo = Number(l.costo_mano_obra || 0);
        totalCosto += costo;
        laboresMatrix.push([
          l.fecha_completado ? new Date(l.fecha_completado).toLocaleDateString() : '-',
          l.labor_nombre || '-',
          l.labor_categoria || '-',
          `${l.empleado_nombres || ''} ${l.empleado_apellidos || ''}`.trim() || '-',
          Number(l.horas_trabajadas || 0),
          costo,
          l.maquinaria_nombre ? `${l.maquinaria_nombre}` : '-'
        ]);
      });
      laboresMatrix.push(['TOTALES', '', '', '', '', totalCosto, '']);
      const wsLabores = XLSX.utils.aoa_to_sheet(laboresMatrix);
      XLSX.utils.book_append_sheet(wb, wsLabores, 'Labores y Nómina');
    }

    // 4. Hoja de Insumos
    if (insumosData && insumosData.length > 0) {
      const insumosMatrix = [
        ['Fecha Aplicación', 'Insumo (Código)', 'Insumo (Nombre)', 'Labor Asociada', 'Cantidad', 'Unidad', 'Costo Unit.', 'Costo Total']
      ];
      let totalInsumos = 0;
      insumosData.forEach(i => {
        const total = Number(i.costo_total || 0);
        totalInsumos += total;
        insumosMatrix.push([
          i.fecha_completado ? new Date(i.fecha_completado).toLocaleDateString() : '-',
          i.insumo_codigo || '-',
          i.insumo_nombre || '-',
          i.labor_nombre || '-',
          Number(i.cantidad_aplicada || 0),
          i.unidad_medida || '',
          Number(i.costo_unitario || 0),
          total
        ]);
      });
      insumosMatrix.push(['TOTALES', '', '', '', '', '', '', totalInsumos]);
      const wsInsumos = XLSX.utils.aoa_to_sheet(insumosMatrix);
      XLSX.utils.book_append_sheet(wb, wsInsumos, 'Insumos Aplicados');
    }

    const safeLoteName = (lote?.codigo || 'Lote').replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(wb, `Reporte_Detallado_${safeLoteName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    return true;
  } catch (err) {
    console.error('Error exporting Excel:', err);
    alert('Error al generar Excel: ' + err.message);
    return false;
  }
}
