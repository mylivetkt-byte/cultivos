import * as XLSX from 'xlsx';

export function exportToExcel(tableName, columns, data, metadata = {}) {
  try {
    const headers = columns.map((col) =>
      col.name
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
    );

    const rows = data.map((row) => {
      const rowData = {};
      columns.forEach((col) => {
        const headerName = col.name
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        const val = row[col.name];
        rowData[headerName] = val === null || val === undefined ? '' : val;
      });
      return rowData;
    });

    const ws = XLSX.utils.aoa_to_sheet([
      [`Empresa: ${metadata.empresa || 'SAS Agrícolas'}`],
      [`Reporte: ${tableName.replace(/_/g, ' ')}`],
      [`Finca Operativa: ${metadata.finca || 'Todas las Fincas'}`],
      [`Generado por: ${metadata.usuario || 'Usuario del Sistema'}`],
      [`Fecha y Hora: ${new Date().toLocaleString('es-ES')}`],
      [],
    ]);

    XLSX.utils.sheet_add_json(ws, rows, { header: headers, origin: 'A7' });

    // Auto-fit column widths
    const colWidths = headers.map((h, i) => {
      const maxDataWidth = data.reduce((max, row) => {
        const val = row[columns[i]?.name];
        if (val === null || val === undefined) return max;
        return Math.max(max, String(val).length);
      }, 0);
      return { wch: Math.max(h.length + 2, maxDataWidth + 2, 10) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    const sheetName = tableName.length > 31 ? tableName.slice(0, 31) : tableName;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    XLSX.writeFile(wb, `${tableName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (err) {
    console.error('Error exporting Excel:', err);
    alert('Error al generar Excel: ' + err.message);
  }
}
