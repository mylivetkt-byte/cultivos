import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { exportToExcel } from '../../utils/exportExcel';
import { authFetch } from '../../utils/api';

function AccountStatement({ tenantId }) {
  const [terceros, setTerceros] = useState([]);
  const [selectedTercero, setSelectedTercero] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tenantId) {
      authFetch(`/api/table/terceros/data?tenantId=${tenantId}&pageSize=1000`)
        .then(res => res.json())
        .then(data => {
          setTerceros(data.data.map(t => ({
            value: t.id_tercero,
            label: `${t.documento} - ${t.nombre_completo}`
          })));
        })
        .catch(err => console.error(err));
    }
  }, [tenantId]);

  useEffect(() => {
    if (selectedTercero && tenantId) {
      setLoading(true);
      authFetch(`/api/cartera/estado-cuenta/${selectedTercero.value}?id_tenant=${tenantId}`)
        .then(res => res.json())
        .then(data => {
          setHistorial(data.historial || []);
          setStats(data.stats || {});
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setHistorial([]);
      setStats({});
    }
  }, [selectedTercero, tenantId]);

  const totalCargos = historial.reduce((sum, h) => sum + Number(h.cargo), 0);
  const totalAbonos = historial.reduce((sum, h) => sum + Number(h.abono), 0);
  const saldoFinal = totalCargos - totalAbonos;

  const handleExport = () => {
    if (!selectedTercero) return;
    const dataToExport = historial.map(h => ({
      'Fecha': new Date(h.fecha).toLocaleDateString(),
      'Operación': h.tipo_operacion,
      'Documento': h.referencia,
      'Cargo (+)': Number(h.cargo),
      'Abono (-)': Number(h.abono),
      'Saldo Acumulado': h.saldo_acumulado,
      'Cartera': h.tipo_cartera
    }));
    exportToExcel(dataToExport, `Estado_Cuenta_${selectedTercero.label}.xlsx`);
  };

  return (
    <div className="module-container">
      <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>📜 Estado de Cuenta Detallado</h1>
          <p>Consulta el historial claro de facturas y pagos por Proveedor, Cliente o Empleado.</p>
        </div>
        {selectedTercero && historial.length > 0 && (
          <button onClick={handleExport} className="btn btn-secondary">
            ⬇️ Exportar Excel
          </button>
        )}
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Buscar Tercero (Cliente, Proveedor, Empleado)</label>
        <Select 
          options={terceros}
          value={selectedTercero}
          onChange={setSelectedTercero}
          placeholder="Busque por NIT, Cédula o Nombre..."
          styles={{
            control: (base) => ({ ...base, background: 'var(--card-bg)', borderColor: 'var(--border)' }),
            menu: (base) => ({ ...base, background: 'var(--card-bg)', zIndex: 999 }),
            singleValue: (base) => ({ ...base, color: 'var(--text)' }),
            option: (base, state) => ({ ...base, background: state.isFocused ? 'var(--primary-light)' : 'transparent' })
          }}
        />
      </div>

      {selectedTercero && (
        <>
          <div className="card" style={{ padding: '20px', marginBottom: '20px', background: 'var(--bg-color)', borderLeft: '4px solid var(--primary)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--primary)', fontSize: '16px' }}>
              👤 Información y Condiciones Comerciales
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '13px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Contacto:</div>
                <div style={{ fontWeight: 'bold' }}>{stats.contacto || 'No registrado'} ({stats.telefono_contacto || 'N/A'})</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Cupo de Crédito:</div>
                <div style={{ fontWeight: 'bold' }}>${Number(stats.cupo_credito || 0).toLocaleString('es-CO')}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Días de Plazo:</div>
                <div style={{ fontWeight: 'bold' }}>{stats.dias_plazo || 0} días</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Última Compra/Venta:</div>
                <div style={{ fontWeight: 'bold' }}>
                  {stats.ultima_factura_fecha ? `${new Date(stats.ultima_factura_fecha).toLocaleDateString()} ($${Number(stats.ultima_factura_monto).toLocaleString('es-CO')})` : 'Ninguna'}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Último Pago:</div>
                <div style={{ fontWeight: 'bold' }}>
                  {stats.ultimo_pago_fecha ? `${new Date(stats.ultimo_pago_fecha).toLocaleDateString()} ($${Number(stats.ultimo_pago_monto).toLocaleString('es-CO')})` : 'Ninguno'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div className="stat-card">
              <div className="stat-title">Total Facturado (Cargos)</div>
              <div className="stat-value" style={{ color: '#f59e0b' }}>${totalCargos.toLocaleString('es-CO')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-title">Total Pagado (Abonos)</div>
              <div className="stat-value" style={{ color: '#10b981' }}>${totalAbonos.toLocaleString('es-CO')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-title">Saldo Actual (Deuda)</div>
              <div className="stat-value" style={{ color: saldoFinal > 0 ? '#ef4444' : 'var(--text)' }}>
                ${saldoFinal.toLocaleString('es-CO')}
              </div>
            </div>
          </div>

          <div className="card table-container">
            {loading ? <p style={{ padding: '20px' }}>Cargando histórico...</p> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Operación</th>
                    <th>Referencia</th>
                    <th>Cartera</th>
                    <th style={{ textAlign: 'right' }}>Cargo (+)</th>
                    <th style={{ textAlign: 'right' }}>Abono (-)</th>
                    <th style={{ textAlign: 'right' }}>Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No hay movimientos registrados para este tercero.</td></tr>
                  ) : (
                    historial.map((h, i) => (
                      <tr key={i}>
                        <td>{new Date(h.fecha).toLocaleDateString()}</td>
                        <td>
                          <span style={{
                            padding: '4px 8px', borderRadius: '12px', fontSize: '12px',
                            background: h.cargo > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: h.cargo > 0 ? '#f59e0b' : '#10b981'
                          }}>
                            {h.tipo_operacion}
                          </span>
                        </td>
                        <td style={{ fontWeight: 'bold' }}>{h.referencia}</td>
                        <td>{h.tipo_cartera}</td>
                        <td style={{ textAlign: 'right', color: '#f59e0b' }}>
                          {Number(h.cargo) > 0 ? `$${Number(h.cargo).toLocaleString('es-CO')}` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', color: '#10b981' }}>
                          {Number(h.abono) > 0 ? `$${Number(h.abono).toLocaleString('es-CO')}` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                          ${Number(h.saldo_acumulado).toLocaleString('es-CO')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AccountStatement;
