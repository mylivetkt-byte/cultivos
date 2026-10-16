import React, { useState, useEffect } from 'react';
import { FileText, Search, Eye, Download, Calendar, Filter, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authFetch } from '../../utils/api';
import { useSortableData } from '../../hooks/useSortableData';
import CrearNotaCreditoModal from './CrearNotaCreditoModal';
import Pagination from '../Pagination';

function POSHistorial() {
  const { tenantId } = useAuth();
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [detalles, setDetalles] = useState([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [showNotaCreditoModal, setShowNotaCreditoModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { items: sortedVentas, requestSort, getSortClass, getSortIndicator } = useSortableData(ventas, { key: 'fecha_emision', direction: 'descending' });

  // Set default date range to current month
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    setFiltroFechaDesde(firstDay.toISOString().split('T')[0]);
    setFiltroFechaHasta(now.toISOString().split('T')[0]);
  }, []);

  const fetchVentas = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams({ tenantId: tenantId || 1 });
      if (filtroFechaDesde) params.append('desde', filtroFechaDesde);
      if (filtroFechaHasta) params.append('hasta', filtroFechaHasta);
      if (filtroCliente) params.append('cliente', filtroCliente);

      const res = await authFetch(`/api/pos/ventas/historial?${params}`);
      const data = await res.json();
      if (data.success) {
        setVentas(data.ventas || []);
      } else {
        setErrorMsg(data.error || 'Error al cargar historial');
        setVentas([]);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Error de conexión con el servidor.');
      setVentas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filtroFechaDesde && filtroFechaHasta) {
      fetchVentas();
    }
  }, [filtroFechaDesde, filtroFechaHasta, tenantId]);

  const handleVerDetalle = async (venta) => {
    setSelectedVenta(venta);
    setLoadingDetalle(true);
    try {
      const res = await authFetch(`/api/pos/ventas/${venta.id_documento}/detalle?tenantId=${tenantId || 1}`);
      const data = await res.json();
      if (data.success) {
        setDetalles(data.detalles || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const cardStyle = {
    background: '#1e293b',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '20px'
  };

  const inputStyle = {
    padding: '8px 12px',
    background: '#0f172a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '13px'
  };

  return (
    <div style={{ padding: '20px', color: '#fff', background: '#0f172a', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <FileText size={24} style={{ color: '#38bdf8' }} />
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Historial de Ventas POS</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Consulta y detalle de todas las ventas registradas desde el Punto de Venta</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'end', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '5px' }}>
              <Calendar size={12} style={{ marginRight: '4px' }} />Desde
            </label>
            <input
              type="date"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '5px' }}>
              <Calendar size={12} style={{ marginRight: '4px' }} />Hasta
            </label>
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '5px' }}>
              <Search size={12} style={{ marginRight: '4px' }} />Cliente
            </label>
            <input
              type="text"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              placeholder="Nombre o documento..."
              style={{ ...inputStyle, width: '200px' }}
            />
          </div>
          <button
            onClick={fetchVentas}
            style={{
              padding: '8px 16px',
              background: '#38bdf8',
              color: '#0f172a',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '37px'
            }}
          >
            <Filter size={14} /> Filtrar
          </button>
          <button
            onClick={() => { setFiltroCliente(''); fetchVentas(); }}
            style={{
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.06)',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '37px'
            }}
          >
            <RefreshCw size={14} /> Limpiar
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#fca5a5', fontSize: '13px' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Results Table */}
      <div style={cardStyle}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Cargando historial...</div>
        ) : ventas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <FileText size={40} style={{ marginBottom: '10px', opacity: 0.3 }} />
            <p>No se encontraron ventas en el rango de fechas seleccionado.</p>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                  <th onClick={() => requestSort('numero_documento')} className={`cursor-pointer select-none text-left p-[10px_8px] hover:text-white ${getSortClass('numero_documento')}`}>Documento {getSortIndicator('numero_documento')}</th>
                  <th onClick={() => requestSort('fecha_emision')} className={`cursor-pointer select-none text-left p-[10px_8px] hover:text-white ${getSortClass('fecha_emision')}`}>Fecha {getSortIndicator('fecha_emision')}</th>
                  <th onClick={() => requestSort('nombre_cliente')} className={`cursor-pointer select-none text-left p-[10px_8px] hover:text-white ${getSortClass('nombre_cliente')}`}>Cliente {getSortIndicator('nombre_cliente')}</th>
                  <th onClick={() => requestSort('tipo_pago')} className={`cursor-pointer select-none text-left p-[10px_8px] hover:text-white ${getSortClass('tipo_pago')}`}>Pago {getSortIndicator('tipo_pago')}</th>
                  <th onClick={() => requestSort('subtotal')} className={`cursor-pointer select-none text-right p-[10px_8px] hover:text-white ${getSortClass('subtotal')}`}>Subtotal {getSortIndicator('subtotal')}</th>
                  <th onClick={() => requestSort('iva_total')} className={`cursor-pointer select-none text-right p-[10px_8px] hover:text-white ${getSortClass('iva_total')}`}>IVA {getSortIndicator('iva_total')}</th>
                  <th onClick={() => requestSort('total')} className={`cursor-pointer select-none text-right p-[10px_8px] hover:text-white ${getSortClass('total')}`}>Total {getSortIndicator('total')}</th>
                  <th onClick={() => requestSort('estado')} className={`cursor-pointer select-none text-center p-[10px_8px] hover:text-white ${getSortClass('estado')}`}>Estado {getSortIndicator('estado')}</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedVentas.slice((currentPage - 1) * 20, currentPage * 20).map((v) => (
                  <tr key={v.id_documento} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56,189,248,0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 8px', fontWeight: 600, color: '#38bdf8' }}>{v.numero_documento}</td>
                    <td style={{ padding: '10px 8px' }}>{new Date(v.fecha_emision).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 8px' }}>{v.nombre_cliente || v.id_tercero}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: v.tipo_pago === 'Contado' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                        color: v.tipo_pago === 'Contado' ? '#10b981' : '#f59e0b'
                      }}>
                        {v.tipo_pago}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>${Number(v.subtotal || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>${Number(v.iva_total || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700 }}>${Number(v.total || 0).toLocaleString()} {v.moneda || 'COP'}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: v.estado === 'Emitido' ? 'rgba(56,189,248,0.15)' : v.estado === 'Anulado' ? 'rgba(239,68,68,0.15)' : 'rgba(148,163,184,0.15)',
                        color: v.estado === 'Emitido' ? '#38bdf8' : v.estado === 'Anulado' ? '#ef4444' : '#94a3b8'
                      }}>
                        {v.estado}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleVerDetalle(v)}
                        style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '4px' }}
                        title="Ver detalle"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalItems={sortedVentas.length}
              pageSize={20}
              onPageChange={setCurrentPage}
            />
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '12px', color: '#94a3b8' }}>
          <span>{ventas.length} documento(s) encontrados</span>
          <span>Total general: <strong style={{ color: '#38bdf8' }}>${ventas.reduce((s, v) => s + Number(v.total || 0), 0).toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedVenta && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}
          onClick={() => setSelectedVenta(null)}
        >
          <div
            style={{ background: '#1e293b', borderRadius: '12px', padding: '30px', maxWidth: '700px', width: '90%', maxHeight: '80vh', overflow: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 5px 0', color: '#38bdf8' }}>
              {selectedVenta.numero_documento}
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#94a3b8' }}>
              {new Date(selectedVenta.fecha_emision).toLocaleDateString()} • {selectedVenta.nombre_cliente || `Tercero #${selectedVenta.id_tercero}`} • {selectedVenta.tipo_pago}
            </p>

            {loadingDetalle ? (
              <p style={{ color: '#64748b', textAlign: 'center' }}>Cargando detalle...</p>
            ) : detalles.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center' }}>Sin líneas de detalle registradas.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Producto</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Cant</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>P. Unit</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>IVA %</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detalles.map((d, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px' }}>{d.nombre_producto || `Insumo #${d.id_insumo}`}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{d.cantidad}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>${Number(d.precio_unitario || 0).toLocaleString()}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{d.iva_porcentaje}%</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>${(Number(d.precio_unitario || 0) * Number(d.cantidad || 0) + Number(d.iva_valor || 0)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
              <div style={{ fontSize: '14px' }}>
                <span style={{ color: '#94a3b8' }}>Total: </span>
                <strong style={{ color: '#38bdf8', fontSize: '18px' }}>${Number(selectedVenta.total || 0).toLocaleString()} {selectedVenta.moneda || 'COP'}</strong>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {selectedVenta.estado !== 'Anulado' && (
                  <button
                    onClick={() => setShowNotaCreditoModal(true)}
                    style={{ padding: '8px 20px', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Nota de Crédito
                  </button>
                )}
                <button
                  onClick={() => setSelectedVenta(null)}
                  style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nota Credito Modal */}
      {showNotaCreditoModal && selectedVenta && (
        <CrearNotaCreditoModal
          venta={selectedVenta}
          detalles={detalles}
          onClose={() => setShowNotaCreditoModal(false)}
          onSuccess={(data) => {
            setShowNotaCreditoModal(false);
            setSelectedVenta(null);
            fetchVentas();
            alert(`Nota de crédito generada con éxito: ${data.consecutivo}`);
          }}
        />
      )}
    </div>
  );
}

export default POSHistorial;
