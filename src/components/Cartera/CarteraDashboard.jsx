import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { API_BASE } from '../../utils/api';
import { authFetch } from '../../utils/api';

const COLORS_CxC = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#b91c1c']; // Verdes a Rojos intensos
const COLORS_CxP = ['#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#be123c'];

function CarteraDashboard({ tenantId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantId) {
      setLoading(true);
      authFetch(`/api/cartera/dashboard?id_tenant=${tenantId}`)
        .then(res => res.json())
        .then(resData => setData(resData))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [tenantId]);

  if (loading) {
    return <div style={{ padding: '24px', color: 'var(--text)' }}>Cargando Dashboard Gerencial de Cartera...</div>;
  }

  if (!data) return null;

  // Prepare Pie Chart Data
  const formatPieData = (vencimientosObj) => {
    const labels = ['Al día', '1-30 días', '31-60 días', '61-90 días', '+90 días'];
    return labels.map(label => ({
      name: label,
      value: vencimientosObj[label] || 0
    })).filter(item => item.value > 0);
  };

  const pieCxC = formatPieData(data.vencimientos_cxc);
  const pieCxP = formatPieData(data.vencimientos_cxp);

  return (
    <div className="module-container">
      <div className="module-header">
        <h1>📊 Dashboard Gerencial de Cartera</h1>
        <p>Análisis de vencimientos, control de morosidad y recordatorios de pago.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: 'white' }}>
          <div className="stat-title" style={{ color: '#ecfdf5' }}>Total Cuentas por Cobrar (A favor)</div>
          <div className="stat-value" style={{ color: 'white' }}>${data.resumen.cxc_total.toLocaleString('es-CO')}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white' }}>
          <div className="stat-title" style={{ color: '#eff6ff' }}>Total Cuentas por Pagar (Deuda)</div>
          <div className="stat-value" style={{ color: 'white' }}>${data.resumen.cxp_total.toLocaleString('es-CO')}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Aging CxC */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text)', textAlign: 'center' }}>Vencimientos: Cuentas por Cobrar</h3>
          <div style={{ height: '300px' }}>
            {pieCxC.length === 0 ? <p style={{ textAlign: 'center', marginTop: '120px' }}>No hay saldos pendientes.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieCxC} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({name, percent}) => `${name} (${(percent*100).toFixed(0)}%)`}>
                    {pieCxC.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_CxC[index % COLORS_CxC.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString('es-CO')}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Aging CxP */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text)', textAlign: 'center' }}>Vencimientos: Cuentas por Pagar</h3>
          <div style={{ height: '300px' }}>
            {pieCxP.length === 0 ? <p style={{ textAlign: 'center', marginTop: '120px' }}>No hay saldos pendientes.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieCxP} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({name, percent}) => `${name} (${(percent*100).toFixed(0)}%)`}>
                    {pieCxP.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_CxP[index % COLORS_CxP.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString('es-CO')}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Panel de Alertas de Cobro (Recordatorios) */}
        <div className="card" style={{ padding: '0', border: '1px solid #ef4444', overflow: 'hidden' }}>
          <div style={{ background: '#ef4444', color: 'white', padding: '16px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
            <span>⚠️ Alertas de Cobro Inminente</span>
            <span style={{ background: 'white', color: '#ef4444', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
              {data.alertas.length}
            </span>
          </div>
          <div style={{ padding: '16px', maxHeight: '400px', overflowY: 'auto' }}>
            {data.alertas.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No hay facturas vencidas o por vencer próximamente.</p>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {data.alertas.map((alerta, i) => (
                  <div key={i} style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.05)', borderLeft: '4px solid #ef4444', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong>{alerta.nombre_completo}</strong>
                      <span style={{ color: '#ef4444', fontWeight: 'bold' }}>${Number(alerta.saldo_pendiente).toLocaleString('es-CO')}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Factura: {alerta.numero_documento} | 
                      <span style={{ color: alerta.dias_vencidos > 0 ? '#ef4444' : '#f59e0b', marginLeft: '6px' }}>
                        {alerta.dias_vencidos > 0 ? `Vencida hace ${alerta.dias_vencidos} días` : `Vence en ${Math.abs(alerta.dias_vencidos)} días`}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '8px', display: 'flex', gap: '12px' }}>
                      <span>📞 {alerta.telefono_contacto || 'Sin teléfono'}</span>
                      <span>👤 {alerta.contacto || 'Sin contacto'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top 5 Deudores */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ background: 'var(--primary)', color: 'white', padding: '16px', fontWeight: 'bold' }}>
            🏆 Top 5 Principales Deudores
          </div>
          <div style={{ padding: '16px' }}>
            {data.top_deudores.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No hay deudores en el sistema.</p>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {data.top_deudores.map((deudor, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {i + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', color: 'var(--text)' }}>{deudor.nombre}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>NIT: {deudor.documento}</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#ef4444' }}>
                      ${Number(deudor.saldo_total).toLocaleString('es-CO')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default CarteraDashboard;
