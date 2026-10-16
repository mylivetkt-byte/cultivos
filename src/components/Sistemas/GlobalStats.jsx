import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../utils/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { API_BASE } from '../../utils/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function GlobalStats() {
  const [stats, setStats] = useState(null);
  const [gerencia, setGerencia] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [resSystem, resGerencia] = await Promise.all([
          fetchApi('/sistemas/stats'),
          fetchApi('/sistemas/dashboard-alta-gerencia')
        ]);
        setStats(resSystem);
        setGerencia(resGerencia);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <p style={{ padding: '20px' }}>Cargando estadísticas...</p>;
  if (!stats || !gerencia) return <p style={{ padding: '20px' }}>Error cargando estadísticas</p>;

  const cardStyle = { background: 'var(--bg-card)', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' };
  const containerStyle = { background: 'var(--bg-card)', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '20px' };

  const exportPdf = async () => {
    const input = document.getElementById('dashboard-gerencia-content');
    if (!input) return;
    
    // Ocultar botón de exportar temporalmente
    const exportBtn = document.getElementById('btn-export-pdf');
    if (exportBtn) exportBtn.style.display = 'none';
    
    const canvas = await html2canvas(input, { scale: 2 });
    
    if (exportBtn) exportBtn.style.display = 'block';

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    let logoBase64 = null;
    try {
      const configRes = await fetchApi('/config/logo');
      if (configRes.logo_path) {
        if (configRes.logo_path.startsWith('data:image')) {
          logoBase64 = configRes.logo_path;
        } else {
          const imgUrl = configRes.logo_path.startsWith('http') 
            ? configRes.logo_path 
            : `${API_BASE.replace('/api', '')}${configRes.logo_path.startsWith('/') ? '' : '/'}${configRes.logo_path}`;
          const imgRes = await fetch(imgUrl);
          const blob = await imgRes.blob();
          logoBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        }
      }
    } catch (e) {
      console.error("Error cargando logo:", e);
    }

    pdf.setFontSize(18);
    pdf.text("Dashboard Alta Gerencia (Consolidado)", 14, 20);
    
    if (logoBase64) {
      const pageWidth = pdf.internal.pageSize.getWidth();
      const logoWidth = 25;
      const logoX = pageWidth - 14 - logoWidth;
      try { pdf.addImage(logoBase64, 'PNG', logoX, 10, logoWidth, 25); } catch(e) {
        try { pdf.addImage(logoBase64, 'JPEG', logoX, 10, logoWidth, 25); } catch(err) {}
      }
    }

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 40, pdfWidth, pdfHeight);
    pdf.save("Dashboard_Alta_Gerencia.pdf");
  };

  return (
    <div style={{ padding: '20px' }} id="dashboard-gerencia-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Estadísticas Globales del Sistema</h2>
        <button id="btn-export-pdf" onClick={exportPdf} style={{ padding: '8px 16px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Exportar a PDF
        </button>
      </div>
      
      {/* SaaS Admin Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ ...cardStyle, borderLeft: '4px solid #1976d2' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1976d2' }}>{stats.totalTenants || 0}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Total Empresas</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: '4px solid #388e3c' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#388e3c' }}>{stats.tenantsActivos || 0}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Empresas Activas</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: '4px solid #f57c00' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f57c00' }}>{stats.tenantsPendientes || 0}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Pendientes</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: '4px solid #7b1fa2' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#7b1fa2' }}>{stats.totalUsuarios || 0}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Total Usuarios</div>
        </div>
      </div>

      <hr style={{ margin: '40px 0', borderColor: '#eee' }} />
      
      <h2>Dashboard de Alta Gerencia (Operaciones)</h2>
      
      {/* Operational KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ ...cardStyle }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2e7d32' }}>{gerencia.kpis.hectareas_sembradas}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Hectáreas Sembradas</div>
        </div>
        <div style={{ ...cardStyle }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#c62828' }}>{gerencia.kpis.total_ganado}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Cabezas Ganado</div>
        </div>
        <div style={{ ...cardStyle }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0277bd' }}>{gerencia.kpis.total_lagos}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Lagos Acuícolas</div>
        </div>
        <div style={{ ...cardStyle }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f57f17' }}>{gerencia.kpis.total_maquinas}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Máquinas/Equipos</div>
        </div>
        <div style={{ ...cardStyle }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4527a0' }}>{gerencia.kpis.total_empleados}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Total Empleados</div>
        </div>
        <div style={{ ...cardStyle }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#607d8b' }}>{gerencia.kpis.total_bodegas}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Bodegas Activas</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Agricultura: Cultivos */}
        <div style={containerStyle}>
          <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Área por Cultivo (Hectáreas)</h3>
          {gerencia.agricultura.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gerencia.agricultura}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre_cultivo" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="area_total" name="Hectáreas" fill="#4caf50" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p>No hay cultivos registrados.</p>}
        </div>

        {/* Agricultura: Viveros */}
        <div style={containerStyle}>
          <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Semilleros y Viveros (Plantas en desarrollo)</h3>
          {gerencia.viveros.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gerencia.viveros}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre_vivero" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="plantas_desarrollo" name="Total Plantas" fill="#81c784" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p>No hay viveros registrados.</p>}
        </div>

        {/* Producción Orgánica (Bioles) */}
        <div style={containerStyle}>
          <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Producción Orgánica / Bioles (Litros)</h3>
          {gerencia.bioles.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gerencia.bioles}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="producto" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="volumen_total" name="Litros Producidos" fill="#cddc39" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p>No hay bioles registrados.</p>}
        </div>

        {/* Ganadería Razas */}
        <div style={containerStyle}>
          <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Distribución Ganadera por Raza</h3>
          {gerencia.ganaderia.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={gerencia.ganaderia} dataKey="total_cabezas" nameKey="nombre_raza" cx="50%" cy="50%" outerRadius={100} label>
                  {gerencia.ganaderia.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p>No hay ganadería registrada.</p>}
        </div>

        {/* Acuícola Especies */}
        <div style={containerStyle}>
          <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Acuícola: Peces en Engorde por Especie</h3>
          {gerencia.acuicola.especies.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={gerencia.acuicola.especies} dataKey="total_peces" nameKey="especie" cx="50%" cy="50%" outerRadius={100} label>
                  {gerencia.acuicola.especies.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index+2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p>No hay peces en engorde registrados.</p>}
        </div>
        
        {/* Acuícola Alevinos */}
        <div style={containerStyle}>
          <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Semillero Acuícola (Inventario Alevinos)</h3>
          {gerencia.acuicola.alevinos.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gerencia.acuicola.alevinos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="especie" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_alevinos" name="Cant. Alevinos" fill="#00bcd4" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p>No hay inventario de alevinos.</p>}
        </div>
      </div>

      {/* 5. Fincas y Operaciones */}
      {gerencia.centros_costo && gerencia.centros_costo.length > 0 && (
        <div style={{...containerStyle, marginTop: '20px'}}>
          <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Distribución Operativa por Fincas</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={gerencia.centros_costo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="empleados_asignados" name="Empleados" fill="#ff9800" />
              <Bar dataKey="maquinas_asignadas" name="Máquinas" fill="#795548" />
              <Bar dataKey="lotes_activos" name="Lotes Activos" fill="#8bc34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {/* Tabla detallada de Agricultura */}
      <div style={{...containerStyle, marginTop: '20px'}}>
        <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Detalle de Cosechas (Cultivos)</h3>
        {gerencia.agricultura.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', textAlign: 'left' }}>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Cultivo</th>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Hectáreas Totales</th>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Última Cosecha</th>
                <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Próxima Cosecha (Est)</th>
              </tr>
            </thead>
            <tbody>
              {gerencia.agricultura.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px' }}>{c.nombre_cultivo}</td>
                  <td style={{ padding: '12px' }}>{c.area_total}</td>
                  <td style={{ padding: '12px' }}>{c.ultima_cosecha ? new Date(c.ultima_cosecha).toLocaleDateString() : 'N/A'}</td>
                  <td style={{ padding: '12px' }}>{c.proxima_cosecha ? new Date(c.proxima_cosecha).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p>No hay detalle de cosechas.</p>}
      </div>

    </div>
  );
}
