import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import GeneradorNominaDian from './GeneradorNominaDian';
import { authFetch } from '../../utils/api';

export default function NominaDianDashboard({ tenantId }) {
  const [nominas, setNominas] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, validadas: 0, rechazadas: 0, enProceso: 0, totalDinero: 0 });

  useEffect(() => {
    fetchData();
  }, [tenantId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const tid = tenantId || 1;
      const [resNominas, resConfig] = await Promise.all([
        authFetch(`/api/dian/nominas?tenantId=${tid}`),
        authFetch(`/api/dian/configuracion?tenantId=${tid}`)
      ]);
      
      if(resConfig.ok) {
        const configData = await resConfig.json();
        setConfig(configData);
      }
      
      if (resNominas.ok) {
        const data = await resNominas.json();
        setNominas(Array.isArray(data) ? data : []);
        
        // Calculate Stats
        let t=0, v=0, r=0, p=0, dinero=0;
        data.forEach(n => {
          t++;
          dinero += Number(n.total_comprobante || 0);
          if(n.estado_dian === 'Validada') v++;
          else if(n.estado_dian === 'Rechazada') r++;
          else p++;
        });
        setStats({ total: t, validadas: v, rechazadas: r, enProceso: p, totalDinero: dinero });
      }
    } catch (err) {
      message.error('Error cargando datos de la DIAN');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Validada': return { bg: '#dcfce7', text: '#166534' };
      case 'Rechazada': return { bg: '#fee2e2', text: '#991b1b' };
      case 'Procesando': return { bg: '#fef3c7', text: '#92400e' };
      default: return { bg: '#e2e8f0', text: '#475569' };
    }
  };

  return (
    <div className="dian-dashboard" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="https://pbs.twimg.com/profile_images/1618641178491871233/bO2s3-B6_400x400.jpg" alt="DIAN" style={{ height: '32px', width: '32px', borderRadius: '50%' }} /> 
            Nómina Electrónica DIAN
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>Panel de Control y Emisión de Comprobantes de Pago Electrónicos</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {config && (
            <span style={{ background: config.entorno === 'Pruebas' ? '#fef3c7' : '#dcfce7', color: config.entorno === 'Pruebas' ? '#92400e' : '#166534', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold' }}>
              Entorno: {config.entorno}
            </span>
          )}
          <button onClick={() => setShowGenerator(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>+</span> Generar y Transmitir
          </button>
        </div>
      </div>

      {showGenerator ? (
        <div style={{ marginBottom: '32px' }}>
          <GeneradorNominaDian 
            tenantId={tenantId} 
            onCancel={() => setShowGenerator(false)} 
            onSuccess={() => { setShowGenerator(false); fetchData(); }} 
          />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Emitidas</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', marginTop: '8px' }}>{stats.total}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Aprobadas DIAN</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#166534', marginTop: '8px' }}>{stats.validadas}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Rechazadas</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#991b1b', marginTop: '8px' }}>{stats.rechazadas}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Valor Reportado</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#92400e', marginTop: '8px' }}>${stats.totalDinero.toLocaleString()}</div>
        </div>
      </div>

      {/* Tabla de Nóminas */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Historial de Transmisiones</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'white', color: '#64748b', textTransform: 'uppercase', fontSize: '11px' }}>
              <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0' }}>Documento</th>
              <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0' }}>Fecha Emisión</th>
              <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0' }}>Empleados</th>
              <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0' }}>Total A Pagar</th>
              <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0' }}>Estado DIAN</th>
              <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0' }}>CUNE</th>
              <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Cargando datos...</td></tr>
            ) : nominas.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No hay nóminas transmitidas a la DIAN.</td></tr>
            ) : nominas.map(n => {
              const color = getStatusColor(n.estado_dian);
              return (
                <tr key={n.id_nomina_dian} style={{ borderBottom: '1px solid #e2e8f0' }} className="hover:bg-slate-50">
                  <td style={{ padding: '16px', fontWeight: 'bold', color: '#334155' }}>{n.prefijo}-{n.consecutivo}</td>
                  <td style={{ padding: '16px', color: '#475569' }}>{n.fecha_emision?.substring(0,10)}</td>
                  <td style={{ padding: '16px', color: '#475569' }}>{n.num_trabajadores}</td>
                  <td style={{ padding: '16px', fontWeight: 'bold', color: '#10b981' }}>${Number(n.total_comprobante).toLocaleString()}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ background: color.bg, color: color.text, padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                      {n.estado_dian}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>
                    {n.cune ? n.cune.substring(0, 15) + '...' : '---'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    {n.estado_dian === 'Validada' && (
                      <>
                        <button style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>📄 XML</button>
                        <button style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>📦 ZIP</button>
                      </>
                    )}
                    {n.estado_dian === 'Rechazada' && (
                      <button style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Ver Error</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      </>
      )}
    </div>
  );
}
