import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api.js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import '../dashboard.css';

const BioFabrica = ({ tenantId = 1 }) => {
  const [activeTab, setActiveTab] = useState('saldos'); // saldos, produccion, mov_materias, mov_violes
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '2023-01-01',
    endDate: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      if (activeTab === 'saldos') endpoint = `/api/biofabrica/saldos-violes?tenantId=${tenantId}`;
      if (activeTab === 'produccion') endpoint = `/api/biofabrica/produccion?tenantId=${tenantId}&startDate=${filters.startDate}&endDate=${filters.endDate}`;
      if (activeTab === 'mov_materias') endpoint = `/api/biofabrica/movimientos-materias-primas?tenantId=${tenantId}&startDate=${filters.startDate}&endDate=${filters.endDate}`;
      if (activeTab === 'mov_violes') endpoint = `/api/biofabrica/movimientos-violes?tenantId=${tenantId}&startDate=${filters.startDate}&endDate=${filters.endDate}`;

      const res = await authFetch(endpoint);
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte BioFabrica");
    XLSX.writeFile(wb, `Reporte_${activeTab}_${new Date().getTime()}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Reporte: ${activeTab.toUpperCase()}`, 14, 15);
    
    let head = [];
    let body = [];

    if (activeTab === 'saldos') {
      head = [['Código', 'Producto', 'Stock Actual', 'Unidad', 'Costo Unitario', 'Costo Total']];
      body = data.map(r => [r.codigo, r.producto, r.stock_actual, r.unidad_medida, r.costo_unitario, r.costo_total]);
    } else if (activeTab === 'produccion') {
      head = [['Fecha', 'Lote', 'Producto', 'Cant. Producida', 'Costo Materiales', 'Costo Jornales', 'Costo Total']];
      body = data.map(r => [new Date(r.fecha_produccion).toLocaleDateString(), r.nombre_lote, r.producto_nombre, r.cantidad_litros, r.costo_materiales, r.costo_jornales, r.costo_total]);
    } else {
      head = [['Fecha', 'Insumo', 'Tipo Mov.', 'Cantidad', 'Costo Unit.', 'Costo Total', 'Responsable']];
      body = data.map(r => [new Date(r.fecha_movimiento).toLocaleDateString(), r.insumo || r.producto, r.tipo_movimiento, r.cantidad, r.costo_unitario, r.costo_total, r.responsable || r.usuario_responsable]);
    }

    doc.autoTable({
      head,
      body,
      startY: 20,
      styles: { fontSize: 8 }
    });
    doc.save(`Reporte_${activeTab}_${new Date().getTime()}.pdf`);
  };

  const handleSendWhatsApp = async () => {
    try {
      const summary = `*Reporte de Bio-fábrica: ${activeTab.toUpperCase()}*\nRegistros: ${data.length}\nGenerado el: ${new Date().toLocaleString()}`;
      const res = await authFetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: '573001234567', message: summary })
      });
      if (res.ok) alert('Resumen enviado por WhatsApp (simulado).');
    } catch (e) {
      console.error(e);
      alert('Error enviando WhatsApp');
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Auditoría: Bio-fábrica (Violes)</h1>
        <p style={{ color: 'var(--text-muted)' }}>Módulo avanzado de producción, inventario y movimientos orgánicos</p>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button className={`btn ${activeTab === 'saldos' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('saldos')}>📦 Saldos de Violes</button>
        <button className={`btn ${activeTab === 'produccion' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('produccion')}>🏭 Historial Producción</button>
        <button className={`btn ${activeTab === 'mov_materias' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('mov_materias')}>🔄 Mov. Materias Primas</button>
        <button className={`btn ${activeTab === 'mov_violes' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('mov_violes')}>🔄 Mov. Violes (Terminados)</button>
      </div>

      <div className="card" style={{ marginBottom: '25px' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {activeTab !== 'saldos' && (
            <>
              <div>
                <label style={{ color: '#fff', fontSize: '0.9em' }}>Fecha Inicio</label>
                <input type="date" className="form-control" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid #4B5563' }} />
              </div>
              <div>
                <label style={{ color: '#fff', fontSize: '0.9em' }}>Fecha Fin</label>
                <input type="date" className="form-control" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid #4B5563' }} />
              </div>
              <button className="btn btn-primary" onClick={fetchData} disabled={loading}>
                {loading ? '⏳' : '🔍 Procesar'}
              </button>
            </>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
            <button className="btn btn-success" onClick={handleExportExcel} disabled={loading || data.length === 0}>📊 Excel</button>
            <button className="btn btn-danger" onClick={handleExportPDF} disabled={loading || data.length === 0}>📄 PDF</button>
            <button className="btn" style={{ background: '#25D366', color: '#fff' }} onClick={handleSendWhatsApp} disabled={loading || data.length === 0}>💬 WhatsApp</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        {loading ? <div className="loading">Cargando datos...</div> : (
          <table className="data-table">
            <thead>
              {activeTab === 'saldos' && (
                <tr>
                  <th>Código</th>
                  <th>Producto Terminado</th>
                  <th>Stock Actual</th>
                  <th>Costo Unitario ($)</th>
                  <th>Valor Total Inv. ($)</th>
                </tr>
              )}
              {activeTab === 'produccion' && (
                <tr>
                  <th>Fecha Producción</th>
                  <th>Lote Destino</th>
                  <th>Producto (Viol)</th>
                  <th>Cant. Elaborada</th>
                  <th>Costo Mat.</th>
                  <th>Costo Jornales</th>
                  <th>Costo Total ($)</th>
                  <th>Receta/Detalle (Materias Primas)</th>
                </tr>
              )}
              {(activeTab === 'mov_materias' || activeTab === 'mov_violes') && (
                <tr>
                  <th>Fecha</th>
                  <th>Código</th>
                  <th>{activeTab === 'mov_materias' ? 'Materia Prima' : 'Producto Terminado'}</th>
                  <th>Movimiento</th>
                  <th>Cantidad</th>
                  <th>Costo Total</th>
                  <th>Resp.</th>
                </tr>
              )}
            </thead>
            <tbody>
              {data.length === 0 ? <tr><td colSpan="8" style={{textAlign: 'center'}}>No se encontraron registros.</td></tr> : data.map((item, i) => (
                <tr key={i}>
                  {activeTab === 'saldos' && (
                    <>
                      <td>{item.codigo}</td>
                      <td><strong>{item.producto}</strong></td>
                      <td><span style={{ color: '#10B981', fontWeight: 'bold' }}>{item.stock_actual} {item.unidad_medida}</span></td>
                      <td>${Number(item.costo_unitario).toLocaleString()}</td>
                      <td><span style={{ color: '#F59E0B' }}>${Number(item.costo_total).toLocaleString()}</span></td>
                    </>
                  )}
                  {activeTab === 'produccion' && (
                    <>
                      <td>{new Date(item.fecha_produccion).toLocaleDateString()}</td>
                      <td>{item.nombre_lote || 'General'}</td>
                      <td><strong>{item.producto_nombre}</strong></td>
                      <td><span style={{ color: '#10B981', fontWeight: 'bold' }}>{item.cantidad_litros} {item.unidad_medida}</span></td>
                      <td>${Number(item.costo_materiales).toLocaleString()}</td>
                      <td>${Number(item.costo_jornales).toLocaleString()}</td>
                      <td><span style={{ color: '#EF4444', fontWeight: 'bold' }}>${Number(item.costo_total).toLocaleString()}</span></td>
                      <td>
                        {item.detalles && item.detalles.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: '15px', fontSize: '0.85em', color: '#9CA3AF' }}>
                            {item.detalles.map((d, di) => (
                              <li key={di}>{d.cantidad} {d.unidad_medida} de {d.insumo_nombre} (${Number(d.costo_total).toLocaleString()})</li>
                            ))}
                          </ul>
                        ) : 'Sin receta detallada'}
                      </td>
                    </>
                  )}
                  {(activeTab === 'mov_materias' || activeTab === 'mov_violes') && (
                    <>
                      <td>{new Date(item.fecha_movimiento).toLocaleDateString()} {new Date(item.fecha_movimiento).toLocaleTimeString()}</td>
                      <td>{item.codigo}</td>
                      <td><strong>{item.insumo || item.producto}</strong></td>
                      <td>
                        <span style={{
                          padding: '3px 8px', borderRadius: '4px', fontSize: '0.85em', fontWeight: 'bold',
                          background: item.tipo_movimiento === 'ENTRADA' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: item.tipo_movimiento === 'ENTRADA' ? '#34D399' : '#F87171'
                        }}>{item.tipo_movimiento}</span>
                      </td>
                      <td>{item.cantidad} {item.unidad_medida}</td>
                      <td>${Number(item.costo_total).toLocaleString()}</td>
                      <td>{item.responsable || item.usuario_responsable || 'N/A'}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default BioFabrica;
