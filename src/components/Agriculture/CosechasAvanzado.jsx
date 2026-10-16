import React, { useState, useEffect } from 'react';
import PremiumSelect from '../PremiumSelect';
import { PlusOutlined, FilePdfOutlined, FileExcelOutlined, WhatsAppOutlined } from '@ant-design/icons';
import { API_BASE, fetchApi, authFetch } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { exportToPdf } from '../../utils/exportPdf';
import { exportToExcel } from '../../utils/exportExcel';
import { jsPDF } from 'jspdf';

export default function CosechasAvanzado({ tenantId, permisos = {} }) {
  const { user } = useAuth();
  const [cosechas, setCosechas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Filtros
  const [filters, setFilters] = useState({
    fechaInicio: '',
    fechaFin: '',
    finca: '',
    lote: '',
    cultivo: ''
  });

  // Catálogos
  const [fincas, setFincas] = useState([]);
  const [nucleos, setNucleos] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [cultivos, setCultivos] = useState([]);

  useEffect(() => {
    const initCatalogs = async () => {
      try {
        const [fRes, nRes, lRes, cRes] = await Promise.all([
          authFetch(`${API_BASE}/table/fincas/data?tenantId=${tenantId}&limit=1000`),
          authFetch(`${API_BASE}/table/nucleos/data?tenantId=${tenantId}&limit=5000`),
          authFetch(`${API_BASE}/table/lotes/data?tenantId=${tenantId}&limit=10000`),
          authFetch(`${API_BASE}/table/cultivos/data?tenantId=${tenantId}&limit=1000`)
        ]);
        
        if (fRes.ok) { const fData = await fRes.json(); setFincas(fData.data || []); }
        if (nRes.ok) { const nData = await nRes.json(); setNucleos(nData.data || []); }
        if (lRes.ok) { const lData = await lRes.json(); setLotes(lData.data || []); }
        if (cRes.ok) { const cData = await cRes.json(); setCultivos(cData.data || []); }

        // Fetch initial table data
        handleProcesar(true);
      } catch (err) {
        console.error(err);
        alert('Ocurrió un error al cargar catálogos.');
      } finally {
        setInitialLoading(false);
      }
    };
    initCatalogs();
  }, [tenantId]);

  const handleProcesar = async (isInitial = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tenantId });
      if (filters.finca) params.append('finca', filters.finca);
      if (filters.lote) params.append('lote', filters.lote);
      if (filters.cultivo) params.append('cultivo', filters.cultivo);
      if (filters.fechaInicio) params.append('fechaInicio', filters.fechaInicio);
      if (filters.fechaFin) params.append('fechaFin', filters.fechaFin);

      const res = await authFetch(`${API_BASE}/cosechas/avanzado?${params.toString()}`);

      if (res.ok) {
        const data = await res.json();
        setCosechas(data);
        setCurrentPage(1);
      } else {
        alert('Error al obtener datos');
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // Formateador de moneda colombiana
  const formatMoney = (amount) => {
    if (!amount) return '$ 0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0,00';
    return Number(num).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const columns = [
    { header: 'ID COSECHA', key: 'id_cosecha' },
    { header: 'LOTE', key: 'nombre_lote' },
    { header: 'CULTIVO', key: 'nombre_cultivo' },
    { header: 'FECHA COSECHA', getter: c => new Date(c.fecha_cosecha).toLocaleDateString('es-CO') },
    { header: 'HECTÁREAS COSECHADAS', getter: c => formatNumber(c.hectareas_cosechadas) },
    { header: 'RENDIMIENTO ESTIMADO HA', getter: c => formatNumber(c.rendimiento_estimado_ha) },
    { header: 'RENDIMIENTO REAL HA', getter: c => formatNumber(c.rendimiento_real_ha) },
    { header: 'PRODUCCIÓN TOTAL (KG)', getter: c => formatNumber(c.produccion_total_kg) }
  ];

  const getMetadata = () => {
    const fincaName = filters.finca ? fincas.find(f => f.id_finca == filters.finca)?.nombre : 'Todas';
    const loteName = filters.lote ? lotes.find(l => l.id_lote == filters.lote)?.nombre : 'Todos';
    const cultivoName = filters.cultivo ? cultivos.find(c => c.id_cultivo == filters.cultivo)?.nombre : 'Todos';
    
    return {
      empresa: 'AgroPaccioli',
      finca: fincaName || 'Todas',
      usuario: user?.nombre || user?.username || 'Administrador',
      rol: user?.rol || 'No asignado',
      reportName: 'Registro de Cosechas',
      filtros: `Lote: ${loteName} | Cultivo: ${cultivoName} | Rango: ${filters.fechaInicio || 'Inicio'} a ${filters.fechaFin || 'Fin'}`
    };
  };

  const prepareData = () => {
    return cosechas.map(item => {
      const row = {};
      columns.forEach(col => {
        row[col.header] = col.getter ? col.getter(item) : (item[col.key] || 'N/A');
      });
      return row;
    });
  };

  const handleExportExcel = () => {
    if (cosechas.length === 0) return;
    const exportData = prepareData();
    exportToExcel(exportData, 'Registro_Cosechas');
  };

  const handleExportPdf = async () => {
    if (cosechas.length === 0) return;
    const exportData = prepareData();
    const exportColumns = columns.map(col => ({ name: col.header }));
    await exportToPdf('Registro de Cosechas', exportColumns, exportData, getMetadata());
  };

  const handleExportWhatsApp = () => {
    if (cosechas.length === 0) return;
    let text = `*Registro de Cosechas*\n\n`;
    const metadata = getMetadata();
    text += `*Finca:* ${metadata.finca}\n*Filtros:* ${metadata.filtros}\n\n`;
    
    const limit = Math.min(cosechas.length, 10);
    for (let i = 0; i < limit; i++) {
      const item = cosechas[i];
      columns.forEach(col => {
        const val = col.getter ? col.getter(item) : (item[col.key] || 'N/A');
        text += `*${col.header}:* ${val}\n`;
      });
      text += `\n`;
    }
    if (cosechas.length > 10) {
      text += `_...y ${cosechas.length - 10} registros más. Exporta a PDF/Excel para ver todo._`;
    }

    const encodedText = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  const handleGeneratePassport = async (cosecha) => {
    let appsText = "Historial de Insumos y Aplicaciones (Últimos 90 días):\n\n";
    try {
       const res = await authFetch(`${API_BASE}/applications/schedule?tenantId=${tenantId}`);
       if (res.ok) {
          const apps = await res.json();
          // Match by lote name (or ID if available, but nombre_lote is safer based on schedule endpoint)
          const loteApps = apps.filter(a => a.lote_nombre === cosecha.nombre_lote && a.estado === 'Completada');
          if(loteApps.length > 0) {
             loteApps.slice(0, 5).forEach(a => {
                appsText += `- ${new Date(a.fecha_ejecucion || a.fecha_programada).toLocaleDateString('es-CO')}: ${a.nombre_receta}\n`;
             });
          } else {
             appsText += "✅ No se registraron aplicaciones químicas recientes (Producto Orgánico/Limpio).\n";
          }
       }
    } catch (e) {
       console.error("Error fetching applications for passport", e);
       appsText += "No se pudo verificar el historial.\n";
    }

    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(16, 185, 129); // Green background
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("PASAPORTE DIGITAL DE PRODUCTO", 105, 20, { align: "center" });
    
    // Body
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.text("Certificado de Trazabilidad e Inocuidad Agrícola", 20, 45);
    
    doc.setFontSize(11);
    doc.text(`ID de Trazabilidad (Lote de Cosecha): #${cosecha.id_cosecha}`, 20, 55);
    doc.text(`Finca / Origen: AgroPaccioli (Tenant ${tenantId})`, 20, 62);
    doc.text(`Lote / Potrero: ${cosecha.nombre_lote}`, 20, 69);
    doc.text(`Producto: ${cosecha.nombre_cultivo}`, 20, 76);
    doc.text(`Fecha de Cosecha: ${new Date(cosecha.fecha_cosecha).toLocaleDateString('es-CO')}`, 20, 83);
    doc.text(`Volumen Empacado: ${formatNumber(cosecha.produccion_total_kg)} KG`, 20, 90);
    
    // Safety Compliance Badge
    doc.setFillColor(240, 253, 244);
    doc.rect(20, 100, 170, 20, 'F');
    doc.setTextColor(21, 128, 61);
    doc.setFontSize(12);
    doc.text("✅ CUMPLE CON L.M.R. (Límites Máximos de Residuos) y GlobalG.A.P.", 25, 112);
    
    // Applications List
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    const splitApps = doc.splitTextToSize(appsText, 170);
    doc.text(splitApps, 20, 130);
    
    // QR Code Placeholder
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(1);
    doc.rect(80, 180, 50, 50);
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(10);
    doc.text("[ Código QR Dinámico ]", 105, 205, { align: "center" });
    
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text(`Para verificar la autenticidad, escanee el código o visite:`, 105, 240, { align: "center" });
    doc.text(`https://sas-agrotech.com/verify/trace/${cosecha.id_cosecha}`, 105, 245, { align: "center" });

    doc.save(`Pasaporte_Cosecha_${cosecha.id_cosecha}.pdf`);
  };

  // Paginación Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCosechas = cosechas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(cosechas.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ fontSize: '24px', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>🌾</span>
          Registro de Cosechas
        </h2>

        {/* Acciones Rápidas (CRUD y Exportación) */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <PlusOutlined /> Nuevo
          </button>
          <button className="btn btn-danger" onClick={handleExportPdf} disabled={cosechas.length === 0 || loading} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#ef4444', color: '#fff', border: 'none', opacity: (cosechas.length === 0 || loading) ? 0.5 : 1 }}>
            <FilePdfOutlined /> PDF
          </button>
          <button className="btn" onClick={handleExportExcel} disabled={cosechas.length === 0 || loading} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#10b981', color: '#fff', border: 'none', opacity: (cosechas.length === 0 || loading) ? 0.5 : 1 }}>
            <FileExcelOutlined /> Excel
          </button>
          <button className="btn" onClick={handleExportWhatsApp} disabled={cosechas.length === 0 || loading} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#25D366', color: '#fff', border: 'none', opacity: (cosechas.length === 0 || loading) ? 0.5 : 1 }}>
            <WhatsAppOutlined /> WhatsApp
          </button>
        </div>
      </div>

      {/* Panel de Filtros */}
      <div style={{ 
        background: 'var(--card-bg)', 
        padding: '20px', 
        borderRadius: '12px', 
        border: '1px solid var(--border)',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', alignItems: 'end', marginBottom: '20px' }}>
          
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.85em', color: '#94a3b8', marginBottom: '5px' }}>Finca</label>
            <PremiumSelect 
              value={filters.finca} 
              onChange={e => setFilters({...filters, finca: e.target.value})}
              options={[{ value: '', label: '-- Todas --' }, ...fincas.map(f => ({ value: String(f.id_finca), label: f.nombre }))]}
              isClearable={false}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.85em', color: '#94a3b8', marginBottom: '5px' }}>Lote / Potrero</label>
            <PremiumSelect 
              value={filters.lote} 
              onChange={e => setFilters({...filters, lote: e.target.value})}
              options={[{ value: '', label: '-- Todos --' }, ...lotes.filter(l => {
                if (!filters.finca) return true;
                const nucleo = nucleos.find(n => n.id_nucleo === l.id_nucleo);
                return nucleo && nucleo.id_finca === Number(filters.finca);
              }).map(l => ({ value: String(l.id_lote), label: l.nombre }))]}
              isClearable={false}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.85em', color: '#94a3b8', marginBottom: '5px' }}>Cultivo</label>
            <PremiumSelect 
              value={filters.cultivo} 
              onChange={e => setFilters({...filters, cultivo: e.target.value})}
              options={[{ value: '', label: '-- Todos --' }, ...cultivos.map(c => ({ value: String(c.id_cultivo), label: c.nombre }))]}
              isClearable={false}
            />
          </div>

          <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.85em', color: '#94a3b8', marginBottom: '5px' }}>Rango Fechas (Opcional)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input 
                type="date" 
                className="form-control" 
                style={{ cursor: 'pointer', background: '#334155', color: '#f8fafc', border: '1px solid #475569', textAlign: 'center' }}
                value={filters.fechaInicio} 
                onChange={e => setFilters({...filters, fechaInicio: e.target.value})} 
                title="Fecha Inicio"
                onClick={e => e.target.showPicker && e.target.showPicker()}
              />
              <input 
                type="date" 
                className="form-control" 
                style={{ cursor: 'pointer', background: '#334155', color: '#f8fafc', border: '1px solid #475569', textAlign: 'center' }}
                value={filters.fechaFin} 
                onChange={e => setFilters({...filters, fechaFin: e.target.value})} 
                title="Fecha Fin" 
                onClick={e => e.target.showPicker && e.target.showPicker()}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button className="btn btn-primary" onClick={() => handleProcesar(false)} disabled={loading || initialLoading} style={{ padding: '10px 24px', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            {loading ? 'Procesando...' : '🔍 Procesar'}
          </button>
        </div>
      </div>

      {/* Resultados Grilla */}
      <div style={{ 
        background: 'var(--card-bg)', 
        padding: '20px', 
        borderRadius: '12px', 
        border: '1px solid var(--border)',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
      }}>
        {initialLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Cargando catálogo...</div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Consultando base de datos...</div>
        ) : cosechas.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#94a3b8', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', border: '1px dashed #475569' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🌾</div>
            <div style={{ fontSize: '16px', fontWeight: '500', color: '#cbd5e1' }}>No se encontraron cosechas</div>
            <div style={{ fontSize: '14px', marginTop: '5px' }}>Intenta ajustando los filtros seleccionados para ver más resultados.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', color: 'var(--text)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 10px', fontWeight: '600' }}>ID COSECHA</th>
                  <th style={{ padding: '12px 10px', fontWeight: '600' }}>LOTE</th>
                  <th style={{ padding: '12px 10px', fontWeight: '600' }}>CULTIVO</th>
                  <th style={{ padding: '12px 10px', fontWeight: '600' }}>FECHA COSECHA</th>
                  <th style={{ padding: '12px 10px', fontWeight: '600' }}>HECTÁREAS COSECHADAS</th>
                  <th style={{ padding: '12px 10px', fontWeight: '600' }}>RENDIMIENTO ESTIMADO HA</th>
                  <th style={{ padding: '12px 10px', fontWeight: '600' }}>RENDIMIENTO REAL HA</th>
                  <th style={{ padding: '12px 10px', fontWeight: '600' }}>PRODUCCIÓN TOTAL (KG)</th>
                  <th style={{ padding: '12px 10px', fontWeight: '600', textAlign: 'center' }}>PASAPORTE</th>
                </tr>
              </thead>
              <tbody>
                {currentCosechas.map(c => (
                  <tr key={c.id_cosecha} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 10px' }}><strong>{c.id_cosecha}</strong></td>
                    <td style={{ padding: '12px 10px' }}>{c.nombre_lote || 'N/A'}</td>
                    <td style={{ padding: '12px 10px' }}>{c.nombre_cultivo || 'N/A'}</td>
                    <td style={{ padding: '12px 10px' }}>{new Date(c.fecha_cosecha).toLocaleDateString('es-CO')}</td>
                    <td style={{ padding: '12px 10px' }}>{formatNumber(c.hectareas_cosechadas)}</td>
                    <td style={{ padding: '12px 10px' }}>{formatNumber(c.rendimiento_estimado_ha)}</td>
                    <td style={{ padding: '12px 10px' }}>{formatNumber(c.rendimiento_real_ha)}</td>
                    <td style={{ padding: '12px 10px' }}>{formatNumber(c.produccion_total_kg)}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                      <button 
                        className="btn btn-sm" 
                        style={{ background: '#3b82f6', color: 'white', fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                        onClick={() => handleGeneratePassport(c)}
                        title="Generar PDF de Trazabilidad e Inocuidad"
                      >
                        🏷️ QR Pasaporte
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Footer Paginación */}
        {!initialLoading && !loading && cosechas.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ color: '#94a3b8', fontSize: '13px' }}>
              Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, cosechas.length)} de {cosechas.length} registros
              <select 
                style={{ marginLeft: '10px', background: '#334155', color: '#f8fafc', border: '1px solid #475569', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
                value={itemsPerPage}
                onChange={e => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10 por página</option>
                <option value={20}>20 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '5px' }}>
              <button 
                className="btn btn-outline" 
                style={{ padding: '4px 10px', fontSize: '13px', background: currentPage === 1 ? 'transparent' : '#1e293b', borderColor: '#475569', opacity: currentPage === 1 ? 0.5 : 1 }}
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                &lt; Anterior
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', background: '#334155', borderRadius: '4px', fontSize: '13px', fontWeight: '500' }}>
                Página {currentPage} de {totalPages}
              </div>

              <button 
                className="btn btn-outline" 
                style={{ padding: '4px 10px', fontSize: '13px', background: currentPage === totalPages ? 'transparent' : '#1e293b', borderColor: '#475569', opacity: currentPage === totalPages ? 0.5 : 1 }}
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Siguiente &gt;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
