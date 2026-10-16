import React, { useEffect, useState } from 'react';
import { authFetch } from '../../utils/api';

const DashboardGerencial = () => {
  const [periodo, setPeriodo] = useState('2026-05');
  const [kpis, setKpis] = useState({
    liquidezCorriente: 0,
    pruebaAcida: 0,
    endeudamiento: 0,
    margenEBITDA: 0,
    roe: 0,
    roa: 0,
    costoHectareaPromedio: 0,
    ingresosTotales: 0,
    costosOperativos: 0,
    variacionIngresosPct: 0,
    variacionEbitdaPct: 0,
    variacionCostoHaPct: 0
  });

  useEffect(() => {
    authFetch(`/api/estados-financieros/kpis-gerenciales?tenantId=1&periodo=${periodo}`)
      .then(res => {
        if (!res.ok) throw new Error('Error cargando KPIs gerenciales');
        return res.json();
      })
      .then(data => {
        if (data) setKpis(data);
      })
      .catch(err => console.error(err));
  }, [periodo]);

  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  const formatPct = (val) => (val * 100).toFixed(1) + '%';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ margin: '20px', background: 'var(--bg-main)', borderRadius: '8px', minHeight: '80vh' }}>
      
      {/* HEADER */}
      <div className="no-print" style={{ background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)', padding: '24px', color: 'white', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0' }}>📈 Dashboard Gerencial & KPIs</h2>
          <p style={{ margin: 0, color: '#94a3b8' }}>Indicadores financieros clave para la toma de decisiones de la Alta Gerencia.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: '#1e293b', color: 'white' }} />
          <button onClick={handlePrint} style={{ background: '#3b82f6', color: 'white', padding: '9px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            🖨️ Exportar Informe
          </button>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        
        {/* ROW 1: RENTABILIDAD & OPERACION */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
          
          <div style={{ flex: 1, minWidth: '250px', background: 'var(--card-bg)', color: 'var(--text)', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderTop: '4px solid #10b981' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '8px' }}>INGRESOS TOTALES (YTD)</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text)' }}>{formatCurrency(kpis.ingresosTotales)}</div>
            <div style={{ fontSize: '12px', color: kpis.variacionIngresosPct >= 0 ? '#10b981' : '#ef4444', marginTop: '8px', fontWeight: 'bold' }}>
              {kpis.variacionIngresosPct >= 0 ? '↑' : '↓'} {formatPct(Math.abs(kpis.variacionIngresosPct))} vs Año Anterior
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '250px', background: 'var(--card-bg)', color: 'var(--text)', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderTop: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '8px' }}>MARGEN EBITDA</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text)' }}>{formatPct(kpis.margenEBITDA)}</div>
            <div style={{ fontSize: '12px', color: kpis.variacionEbitdaPct >= 0 ? '#10b981' : '#ef4444', marginTop: '8px', fontWeight: 'bold' }}>
              {kpis.variacionEbitdaPct >= 0 ? '↑' : '↓'} {formatPct(Math.abs(kpis.variacionEbitdaPct))} (Eficiencia en costos)
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '250px', background: 'var(--card-bg)', color: 'var(--text)', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderTop: '4px solid #3b82f6' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '8px' }}>COSTO PROMEDIO / HECTÁREA</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text)' }}>{formatCurrency(kpis.costoHectareaPromedio)}</div>
            <div style={{ fontSize: '12px', color: kpis.variacionCostoHaPct <= 0 ? '#10b981' : '#ef4444', marginTop: '8px', fontWeight: 'bold' }}>
              {kpis.variacionCostoHaPct <= 0 ? '↓' : '↑'} {formatPct(Math.abs(kpis.variacionCostoHaPct))} vs Presupuesto
            </div>
          </div>

        </div>

        {/* ROW 2: LIQUIDEZ Y SOLVENCIA */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          
          {/* Liquidity Card */}
          <div style={{ flex: 1, minWidth: '300px', background: 'var(--card-bg)', color: 'var(--text)', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: 'var(--text)' }}>Liquidez y Cobertura</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>Razón Corriente</span>
                <span style={{ fontWeight: 'bold', color: kpis.liquidezCorriente > 1.5 ? '#10b981' : '#f59e0b' }}>{kpis.liquidezCorriente}x</span>
              </div>
              <div style={{ width: '100%', background: 'var(--border)', height: '8px', borderRadius: '4px' }}>
                <div style={{ width: `${Math.min(kpis.liquidezCorriente * 30, 100)}%`, background: kpis.liquidezCorriente > 1.5 ? '#10b981' : '#f59e0b', height: '100%', borderRadius: '4px' }}></div>
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' }}>Capacidad para cubrir deudas a corto plazo.</p>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>Prueba Ácida</span>
                <span style={{ fontWeight: 'bold', color: kpis.pruebaAcida > 1 ? '#10b981' : '#ef4444' }}>{kpis.pruebaAcida}x</span>
              </div>
              <div style={{ width: '100%', background: 'var(--border)', height: '8px', borderRadius: '4px' }}>
                <div style={{ width: `${Math.min(kpis.pruebaAcida * 40, 100)}%`, background: kpis.pruebaAcida > 1 ? '#10b981' : '#ef4444', height: '100%', borderRadius: '4px' }}></div>
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' }}>Liquidez sin contar inventarios y biológicos.</p>
            </div>
          </div>

          {/* Solvency & Returns Card */}
          <div style={{ flex: 1, minWidth: '300px', background: 'var(--card-bg)', color: 'var(--text)', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: 'var(--text)' }}>Endeudamiento y Retorno</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              
              <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '8px' }}>Nivel de Endeudamiento</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: kpis.endeudamiento > 0.6 ? '#ef4444' : 'var(--text)' }}>{formatPct(kpis.endeudamiento)}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>Pasivo Total / Activo Total</div>
              </div>

              <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '8px' }}>ROE (Retorno s/ Equity)</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{formatPct(kpis.roe)}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>Utilidad / Patrimonio</div>
              </div>

              <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '8px' }}>ROA (Retorno sobre Activos)</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{formatPct(kpis.roa)}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>Utilidad / Activos Totales (Incluyendo Biológicos NIC 41)</div>
              </div>

            </div>
          </div>

        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important;   table, th, td { color: black !important; border-color: #ccc !important; }
}
          .no-print { display: none !important; }
          div { box-shadow: none !important; }
        }
      `}} />
    </div>
  );
};

export default DashboardGerencial;
