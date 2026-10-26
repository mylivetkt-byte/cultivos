import React, { useState, useEffect } from 'react';
import DatePickerClaro from '../Common/DatePickerClaro';
import { useAuth } from '../../context/AuthContext';
import { authFetch } from '../../utils/api';
import { History, FileText, Download, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { downloadExcelWorkbook } from '../../utils/exportExcel';
import { getJsPDFConstructor, runAutoTable, downloadPdfDoc } from '../../utils/exportPdf';
import { useSortableData } from '../../hooks/useSortableData';
import Pagination from '../Pagination';


export default function POSHistoricoCajeros() {
  const { tenantId } = useAuth();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  const { items: sortedHistorial, requestSort, getSortClass, getSortIndicator } = useSortableData(historial, { key: 'fecha_apertura', direction: 'descending' });
  
  const [filtros, setFiltros] = useState({
    fechaDesde: '',
    fechaHasta: '',
    id_bodega: '',
    id_caja: '',
    id_usuario: ''
  });

  const [bodegas, setBodegas] = useState([]);
  const [cajas, setCajas] = useState([]);

  useEffect(() => {
    // Initial fetch of filters
    const init = async () => {
      try {
        const [resB, resC] = await Promise.all([
          authFetch(`/api/table/bodegas/data?tenantId=${tenantId || 1}&pageSize=100`).then(r => r.json()),
          authFetch(`/api/pos/cajas?tenantId=${tenantId || 1}`).then(r => r.json())
        ]);
        if (resB.data) setBodegas(resB.data);
        if (resC.success) setCajas(resC.data);
      } catch (e) {
        console.error(e);
      }
    };
    init();
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setCurrentPage(1);
    try {
      const params = new URLSearchParams();
      params.append('tenantId', tenantId || 1);
      if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
      if (filtros.id_bodega) params.append('id_bodega', filtros.id_bodega);
      if (filtros.id_caja) params.append('id_caja', filtros.id_caja);
      if (filtros.id_usuario) params.append('id_usuario', filtros.id_usuario);

      const response = await authFetch(`/api/pos/historico-cajeros?${params.toString()}`);
      const res = await response.json();
      if (res.success) setHistorial(res.data);
    } catch (e) {
      console.error(e);
      alert('Error cargando historial');
    }
    setLoading(false);
  };

  const handleFilter = (e) => {
    e.preventDefault();
    loadData();
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(historial);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial");
    downloadExcelWorkbook(wb, "historico_cajeros.xlsx");
  };

  const exportPDF = () => {
    const doc = new (getJsPDFConstructor())('landscape');
    doc.text("Histórico de Arqueos / Turnos", 14, 15);
    const tableData = historial.map(h => [
      h.bodega_nombre || 'N/A',
      new Date(h.fecha_apertura).toLocaleDateString(),
      h.turno,
      h.caja_nombre || 'N/A',
      h.cajero_nombre,
      `$${h.saldo_inicial}`,
      `$${h.ventas_efectivo}`,
      `$${h.ventas_credito}`,
      `$${h.ventas_bancos}`,
      `$${h.ventas_tc}`,
      `$${h.ventas_nequi}`,
      `$${h.saldo_final_sistema}`
    ]);
    runAutoTable(doc, {
      head: [['Bodega', 'Fecha', 'Turno', 'Caja', 'Cajero', 'Base', 'Efectivo', 'Crédito', 'Bancos', 'T.C', 'Nequi', 'Total Sist.']],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 }
    });
    downloadPdfDoc(doc, "historico_cajeros.pdf");
  };

  return (
    <div style={{ padding: '20px', color: '#fff', background: '#0f172a', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
          <History className="text-orange-400" /> Histórico de Cajeros (POS)
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportPDF} style={{ padding: '8px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <FileText size={16}/> PDF
          </button>
          <button onClick={exportExcel} style={{ padding: '8px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Download size={16}/> Excel
          </button>
        </div>
      </div>

      <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <form onSubmit={handleFilter} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '5px' }}>Desde</label>
            <DatePickerClaro value={filtros.fechaDesde} onChange={e => setFiltros({...filtros, fechaDesde: e.target.value})} style={{ padding: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '5px' }}>Hasta</label>
            <DatePickerClaro value={filtros.fechaHasta} onChange={e => setFiltros({...filtros, fechaHasta: e.target.value})} style={{ padding: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '5px' }}>Bodega</label>
            <select value={filtros.id_bodega} onChange={e => setFiltros({...filtros, id_bodega: e.target.value})} style={{ padding: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', width: '150px' }}>
              <option value="">Todas</option>
              {bodegas.map(b => <option key={b.id_bodega} value={b.id_bodega}>{b.nombre}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '5px' }}>Caja</label>
            <select value={filtros.id_caja} onChange={e => setFiltros({...filtros, id_caja: e.target.value})} style={{ padding: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', width: '150px' }}>
              <option value="">Todas</option>
              {cajas.map(c => <option key={c.id_caja} value={c.id_caja}>{c.nombre}</option>)}
            </select>
          </div>
          <button type="submit" style={{ padding: '8px 16px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Filter size={16}/> Filtrar
          </button>
        </form>
      </div>

      {loading ? (
        <div style={{ padding: '20px' }}>Cargando historial...</div>
      ) : (
        <div style={{ background: '#1e293b', borderRadius: '8px', overflow: 'hidden', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px' }}>
            <thead>
              <tr style={{ background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th onClick={() => requestSort('bodega_nombre')} className={`cursor-pointer select-none p-[12px] hover:text-white ${getSortClass('bodega_nombre')}`}>Bodega {getSortIndicator('bodega_nombre')}</th>
                <th onClick={() => requestSort('fecha_apertura')} className={`cursor-pointer select-none p-[12px] hover:text-white ${getSortClass('fecha_apertura')}`}>Fecha {getSortIndicator('fecha_apertura')}</th>
                <th onClick={() => requestSort('caja_nombre')} className={`cursor-pointer select-none p-[12px] hover:text-white ${getSortClass('caja_nombre')}`}>Caja {getSortIndicator('caja_nombre')}</th>
                <th onClick={() => requestSort('cajero_nombre')} className={`cursor-pointer select-none p-[12px] hover:text-white ${getSortClass('cajero_nombre')}`}>Cajero {getSortIndicator('cajero_nombre')}</th>
                <th onClick={() => requestSort('turno')} className={`cursor-pointer select-none p-[12px] hover:text-white ${getSortClass('turno')}`}>Turno {getSortIndicator('turno')}</th>
                <th onClick={() => requestSort('saldo_inicial')} className={`cursor-pointer select-none p-[12px] hover:text-white ${getSortClass('saldo_inicial')}`}>Base {getSortIndicator('saldo_inicial')}</th>
                <th onClick={() => requestSort('ventas_efectivo')} className={`cursor-pointer select-none p-[12px] hover:text-white text-green-400 ${getSortClass('ventas_efectivo')}`}>Efectivo {getSortIndicator('ventas_efectivo')}</th>
                <th onClick={() => requestSort('ventas_credito')} className={`cursor-pointer select-none p-[12px] hover:text-white text-blue-400 ${getSortClass('ventas_credito')}`}>Crédito {getSortIndicator('ventas_credito')}</th>
                <th onClick={() => requestSort('ventas_bancos')} className={`cursor-pointer select-none p-[12px] hover:text-white text-pink-400 ${getSortClass('ventas_bancos')}`}>Bancos {getSortIndicator('ventas_bancos')}</th>
                <th className={`select-none p-[12px] text-purple-400`}>Tarjetas</th>
                <th onClick={() => requestSort('ventas_nequi')} className={`cursor-pointer select-none p-[12px] hover:text-white text-orange-400 ${getSortClass('ventas_nequi')}`}>Nequi {getSortIndicator('ventas_nequi')}</th>
                <th onClick={() => requestSort('saldo_final_sistema')} className={`cursor-pointer select-none p-[12px] hover:text-white ${getSortClass('saldo_final_sistema')}`}>Totales {getSortIndicator('saldo_final_sistema')}</th>
                <th onClick={() => requestSort('diferencia')} className={`cursor-pointer select-none p-[12px] hover:text-white ${getSortClass('diferencia')}`}>Estado {getSortIndicator('diferencia')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedHistorial.length === 0 ? (
                <tr><td colSpan="13" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No hay registros para los filtros seleccionados</td></tr>
              ) : sortedHistorial.slice((currentPage - 1) * 20, currentPage * 20).map(h => (
                <tr key={h.id_arqueo} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }} className="hover:bg-sky-500/5 transition-colors">
                  <td style={{ padding: '12px' }}>{h.bodega_nombre || 'N/A'}</td>
                  <td style={{ padding: '12px' }}>{new Date(h.fecha_apertura).toLocaleDateString()}</td>
                  <td style={{ padding: '12px' }}>{h.caja_nombre || 'N/A'}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{h.cajero_nombre}</td>
                  <td style={{ padding: '12px' }}>{h.turno}</td>
                  <td style={{ padding: '12px' }}>${parseFloat(h.saldo_inicial).toLocaleString()}</td>
                  <td style={{ padding: '12px', color: '#4ade80' }}>${parseFloat(h.ventas_efectivo).toLocaleString()}</td>
                  <td style={{ padding: '12px', color: '#60a5fa' }}>${parseFloat(h.ventas_credito).toLocaleString()}</td>
                  <td style={{ padding: '12px', color: '#f472b6' }}>${parseFloat(h.ventas_bancos).toLocaleString()}</td>
                  <td style={{ padding: '12px', color: '#c084fc' }}>${(parseFloat(h.ventas_tc) + parseFloat(h.ventas_td)).toLocaleString()}</td>
                  <td style={{ padding: '12px', color: '#fb923c' }}>${parseFloat(h.ventas_nequi).toLocaleString()}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 'bold', color: '#38bdf8' }}>${parseFloat(h.saldo_final_sistema).toLocaleString()}</div>
                    <div style={{ fontSize: '11px', color: parseFloat(h.diferencia) >= 0 ? '#4ade80' : '#f87171' }}>
                      Dif: ${parseFloat(h.diferencia).toLocaleString()}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', background: h.estado === 'Abierta' ? 'rgba(56,189,248,0.2)' : 'rgba(148,163,184,0.2)', color: h.estado === 'Abierta' ? '#38bdf8' : '#cbd5e1' }}>
                      {h.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination 
            currentPage={currentPage}
            totalItems={sortedHistorial.length}
            pageSize={20}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
