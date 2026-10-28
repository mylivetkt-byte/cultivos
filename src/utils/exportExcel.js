import * as XLSX from 'xlsx';
import { triggerFileDownload } from './fileDownload';

export function downloadExcelWorkbook(wb, fileName = 'reporte.xlsx') {
  const xlsx = XLSX;
  const excelBuffer = xlsx.write(wb, { bookType: 'xlsx', type: 'array' });
  
  // Standard OpenXML binary spreadsheet MIME type (must NEVER include charset=UTF-8)
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const safeFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  triggerFileDownload(blob, safeFileName);
  return blob;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderExcelViewer(previewWindow, fileName, metadata, headers, rows, blob) {
  if (!previewWindow || previewWindow.closed) return;

  try {
    const downloadUrl = blob ? URL.createObjectURL(blob) : null;
    const safeTitle = escapeHtml(fileName);
    const colLetters = headers.map((_, i) => {
      let letter = '';
      let n = i;
      while (n >= 0) {
        letter = String.fromCharCode((n % 26) + 65) + letter;
        n = Math.floor(n / 26) - 1;
      }
      return letter;
    });

    const metaItems = [
      { k: 'Empresa', v: metadata.empresa || 'AgroPaccioli' },
      { k: 'Reporte', v: metadata.reportName || 'REPORTE' },
      { k: 'Finca Operativa', v: metadata.finca || 'Todas las Fincas' },
      { k: 'Generado por', v: `${metadata.usuario || 'Usuario'}${metadata.rol ? ` (Rol: ${metadata.rol})` : ''}` },
      { k: 'Fecha y Hora', v: new Date().toLocaleString('es-CO') },
      { k: 'Total Registros', v: rows.length.toString() }
    ];

    const html = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>${safeTitle}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background: #f3f4f6;
              color: #1f2937;
              display: flex;
              flex-direction: column;
              height: 100vh;
              overflow: hidden;
            }
            .excel-header {
              background: #107c41;
              color: white;
              padding: 10px 18px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              box-shadow: 0 2px 4px rgba(0,0,0,0.15);
              flex-shrink: 0;
            }
            .header-left {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .excel-badge {
              background: white;
              color: #107c41;
              font-weight: 800;
              font-size: 13px;
              padding: 4px 8px;
              border-radius: 4px;
              display: flex;
              align-items: center;
              gap: 6px;
              letter-spacing: 0.5px;
            }
            .file-name {
              font-size: 16px;
              font-weight: 600;
              color: #f9fafb;
            }
            .header-actions {
              display: flex;
              gap: 10px;
            }
            .btn-action {
              background: white;
              color: #107c41;
              border: none;
              padding: 7px 15px;
              border-radius: 5px;
              font-weight: 600;
              font-size: 13px;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 6px;
              text-decoration: none;
              transition: all 0.2s;
            }
            .btn-action:hover {
              background: #e5e7eb;
              transform: translateY(-1px);
            }
            .formula-bar {
              background: #ffffff;
              border-bottom: 1px solid #d1d5db;
              padding: 6px 16px;
              display: flex;
              align-items: center;
              gap: 12px;
              font-size: 13px;
              color: #4b5563;
              flex-shrink: 0;
            }
            .fx-label {
              font-style: italic;
              font-weight: 700;
              color: #9ca3af;
              font-family: serif;
              font-size: 15px;
              border-right: 1px solid #e5e7eb;
              padding-right: 10px;
            }
            .meta-strip {
              display: flex;
              gap: 18px;
              flex-wrap: wrap;
            }
            .meta-tag b {
              color: #111827;
            }
            .spreadsheet-container {
              flex: 1;
              overflow: auto;
              background: #ffffff;
              position: relative;
            }
            table.sheet-table {
              border-collapse: collapse;
              width: max-content;
              min-width: 100%;
              font-size: 12.5px;
              table-layout: auto;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 6px 12px;
              white-space: nowrap;
            }
            th.corner-cell {
              background: #f9fafb;
              width: 45px;
              min-width: 45px;
              border-right: 2px solid #d1d5db;
              border-bottom: 2px solid #d1d5db;
            }
            th.col-letter {
              background: #f9fafb;
              color: #6b7280;
              font-weight: 600;
              text-align: center;
              font-size: 11px;
              border-bottom: 2px solid #d1d5db;
            }
            td.row-number {
              background: #f9fafb;
              color: #6b7280;
              font-weight: 600;
              text-align: center;
              font-size: 11px;
              width: 45px;
              min-width: 45px;
              border-right: 2px solid #d1d5db;
              user-select: none;
            }
            tr.data-header th {
              background: #e8f5e9;
              color: #1b5e20;
              font-weight: 700;
              text-align: left;
              border-bottom: 2px solid #81c784;
            }
            tr.meta-row td {
              background: #f8fafc;
              color: #475569;
              font-size: 12px;
            }
            tr.meta-row td b {
              color: #0f172a;
            }
            tr.data-row:nth-child(even) td {
              background: #fcfdfd;
            }
            tr.data-row:hover td {
              background: #f0fdf4 !important;
            }
            .sheet-tabs {
              background: #f3f4f6;
              border-top: 1px solid #d1d5db;
              padding: 4px 16px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              flex-shrink: 0;
              font-size: 12px;
            }
            .active-tab {
              background: white;
              padding: 5px 14px;
              border: 1px solid #d1d5db;
              border-bottom: none;
              font-weight: 600;
              color: #107c41;
              border-top: 2px solid #107c41;
              border-radius: 4px 4px 0 0;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            @media print {
              .excel-header, .sheet-tabs { display: none; }
              body { background: white; height: auto; overflow: visible; }
              .spreadsheet-container { overflow: visible; }
            }
          </style>
        </head>
        <body>
          <div class="excel-header">
            <div class="header-left">
              <div class="excel-badge">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="8" y1="13" x2="16" y2="13"></line>
                  <line x1="8" y1="17" x2="16" y2="17"></line>
                </svg>
                EXCEL
              </div>
              <span class="file-name">${safeTitle}</span>
            </div>
            <div class="header-actions">
              ${downloadUrl ? `<a href="${downloadUrl}" download="${safeTitle}" class="btn-action">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Descargar .XLSX
              </a>` : ''}
              <button onclick="window.print()" class="btn-action">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                Imprimir
              </button>
            </div>
          </div>

          <div class="formula-bar">
            <span class="fx-label">fx</span>
            <div class="meta-strip">
              ${metaItems.map(m => `<span class="meta-tag"><b>${escapeHtml(m.k)}:</b> ${escapeHtml(m.v)}</span>`).join('')}
            </div>
          </div>

          <div class="spreadsheet-container">
            <table class="sheet-table">
              <thead>
                <tr>
                  <th class="corner-cell"></th>
                  ${colLetters.map(l => `<th class="col-letter">${l}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${metaItems.slice(0, 5).map((m, idx) => `
                  <tr class="meta-row">
                    <td class="row-number">${idx + 1}</td>
                    <td colspan="${headers.length}"><b>${escapeHtml(m.k)}:</b> ${escapeHtml(m.v)}</td>
                  </tr>
                `).join('')}
                <tr class="meta-row">
                  <td class="row-number">6</td>
                  <td colspan="${headers.length}"></td>
                </tr>
                <tr class="data-header">
                  <td class="row-number">7</td>
                  ${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
                </tr>
                ${rows.map((row, rIdx) => `
                  <tr class="data-row">
                    <td class="row-number">${rIdx + 8}</td>
                    ${headers.map(h => `<td>${escapeHtml(row[h] !== undefined && row[h] !== null ? row[h] : '')}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="sheet-tabs">
            <div class="active-tab">
              📑 ${escapeHtml(metadata.reportName || 'Hoja1')}
            </div>
            <div style="color: #6b7280;">
              Total: ${rows.length} registros cargados correctamente
            </div>
          </div>
        </body>
      </html>
    `;

    previewWindow.document.open();
    previewWindow.document.write(html);
    previewWindow.document.close();
  } catch (e) {
    console.error('Error rendering Excel preview window:', e);
  }
}

export function exportToExcel(tableName, columns = [], data = [], metadata = {}, fkOptions = {}, previewWindow = null) {
  try {
    const xlsx = XLSX;

    // Filter out huge/unprintable binary, geometry or spatial columns
    const excludedTypes = ['polygon', 'point', 'blob', 'json', 'longtext', 'mediumtext'];
    const excludedNames = ['fotografia', 'imagen_url', 'poligono_gps', 'centro_gps', 'ficha_tecnica', 'contrasena', 'password', 'id_tenant', 'tenant_id'];

    const validColumns = (columns || []).filter(col => {
      const typeStr = (col.type || '').toLowerCase();
      const displayStr = (col.displayType || '').toLowerCase();
      if (excludedTypes.includes(typeStr) || excludedTypes.includes(displayStr)) return false;
      if (excludedNames.includes(col.name)) return false;
      return true;
    });

    const headers = validColumns.map((col) =>
      (col.name || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
    );

    const rows = (data || []).map((row) => {
      const rowData = {};
      validColumns.forEach((col) => {
        const headerName = (col.name || '')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        let val = row[col.name];

        if (val === null || val === undefined) {
          rowData[headerName] = '';
          return;
        }

        // Resolve Foreign Key human-friendly names (e.g. id_lote -> "Plaza PLZ-0005")
        if (fkOptions && fkOptions[col.name]) {
          const option = fkOptions[col.name].find(opt => String(opt.id) === String(val) || String(opt.value) === String(val));
          if (option) {
            val = option.display || option.label || val;
          }
        }

        // Format dates cleanly so Excel doesn't show corrupt serials or raw ISO
        if (col.displayType === 'date' || col.type === 'date' || val instanceof Date || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}(T|\b)/.test(val))) {
          try {
            const d = val instanceof Date ? val : new Date(val);
            if (!isNaN(d.getTime())) {
              val = d.toISOString().slice(0, 10);
            }
          } catch {
            val = String(val);
          }
        } else if (col.displayType === 'boolean' || col.type === 'tinyint(1)') {
          val = (val === 1 || val === true || val === '1') ? 'Sí' : 'No';
        } else if (typeof val === 'number') {
          // Keep numeric for proper Excel math and cell formatting
        } else if (typeof val === 'object') {
          try {
            val = JSON.stringify(val);
          } catch {
            val = String(val);
          }
        }

        // Sanitize string from invalid XML control characters to ensure Excel never complains of damaged file
        if (typeof val === 'string') {
          val = val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
        }

        rowData[headerName] = val;
      });
      return rowData;
    });

    const rolStr = metadata.rol ? ` (Rol: ${metadata.rol})` : '';
    const ws = xlsx.utils.aoa_to_sheet([
      [`Empresa: ${metadata.empresa || 'AgroPaccioli'}`],
      [`Reporte: ${metadata.reportName || tableName.replace(/_/g, ' ').toUpperCase()}`],
      [`Finca Operativa: ${metadata.finca || 'Todas las Fincas'}`],
      [`Generado por: ${metadata.usuario || 'Usuario del Sistema'}${rolStr}`],
      [`Fecha y Hora: ${new Date().toLocaleString('es-CO')}`],
      [],
    ]);

    xlsx.utils.sheet_add_json(ws, rows, { header: headers, origin: 'A7' });

    // Auto-fit column widths
    const validData = Array.isArray(data) ? data : [];
    const colWidths = headers.map((h, i) => {
      const colObj = validColumns[i];
      const maxDataWidth = validData.reduce((max, row) => {
        const val = row[colObj?.name];
        if (val === null || val === undefined) return max;
        return Math.max(max, String(val).length);
      }, 0);
      return { wch: Math.max(h.length + 3, maxDataWidth + 2, 12) };
    });
    ws['!cols'] = colWidths;

    const wb = xlsx.utils.book_new();
    const safeSheetName = (tableName || 'Datos').replace(/[\\/?*\[\]:]/g, '_').slice(0, 31);
    xlsx.utils.book_append_sheet(wb, ws, safeSheetName);

    const cleanTableName = (tableName || 'reporte').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${cleanTableName}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    const blob = downloadExcelWorkbook(wb, fileName);

    // If preview window was requested or can be opened, render interactive spreadsheet viewer in it
    let targetWindow = previewWindow;
    if (!targetWindow) {
      try {
        targetWindow = window.open('about:blank', '_blank');
      } catch {}
    }
    if (targetWindow && !targetWindow.closed) {
      renderExcelViewer(targetWindow, fileName, metadata, headers, rows, blob);
    }

    return true;
  } catch (err) {
    if (previewWindow && !previewWindow.closed) {
      try { previewWindow.close(); } catch {}
    }
    console.error('Error exporting Excel:', err);
    throw new Error('Error al generar Excel: ' + err.message);
  }
}
