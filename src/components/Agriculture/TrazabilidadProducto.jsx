import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchTableData, fetchApi, API_BASE, getAuthHeaders } from '../../utils/api';
import { exportToPdf } from '../../utils/exportPdf';
import { exportToExcel } from '../../utils/exportExcel';
import Select from 'react-select';
import { Button, Space, Table, Tag, ConfigProvider, theme } from 'antd';
import { FileExcelOutlined, FilePdfOutlined, WhatsAppOutlined } from '@ant-design/icons';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function TrazabilidadProducto({ tenantId, fincaId, nucleoId }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('grid');
  
  // Filtros
  const [cultivos, setCultivos] = useState([]);
  const [selectedCultivo, setSelectedCultivo] = useState(null);
  const [fincas, setFincas] = useState([]);
  const [selectedFincaFiltro, setSelectedFincaFiltro] = useState(fincaId ? { value: fincaId, label: 'Finca Global' } : null);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  
  // Data state
  const [dataGrid, setDataGrid] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processed, setProcessed] = useState(false);
  const dashboardRef = useRef(null);

  // Load Cultivos and Fincas for the dropdowns
  useEffect(() => {
    fetchTableData('cultivos', { tenantId, pageSize: 1000 })
      .then(res => {
        if (res.data) {
          const opts = res.data.filter(c => c.activo === 1).map(c => ({ value: c.id_cultivo, label: c.nombre }));
          setCultivos(opts);
        }
      })
      .catch(err => console.error("Error fetching cultivos", err));

    fetchTableData('fincas', { tenantId, pageSize: 1000 })
      .then(res => {
        if (res.data) {
          const opts = res.data.map(f => ({ value: f.id_finca || f.id, label: f.nombre }));
          setFincas(opts);
          // Update label of default global finca if found
          if (fincaId) {
            const found = opts.find(o => String(o.value) === String(fincaId));
            if (found) setSelectedFincaFiltro(found);
          }
        }
      })
      .catch(err => console.error("Error fetching fincas", err));
  }, [tenantId, fincaId]);

  const handleProcesar = async () => {
    setLoading(true);
    setProcessed(true);
    try {
      const qs = new URLSearchParams({
        tenantId,
        id_finca: selectedFincaFiltro ? selectedFincaFiltro.value : '',
        id_cultivo: selectedCultivo?.value || '',
        fecha_desde: fechaDesde || '',
        fecha_hasta: fechaHasta || ''
      }).toString();
      
      const res = await fetchApi(`/produccion/trazabilidad?${qs}`);
      
      if (res.success) {
        setDataGrid(res.grid || []);
        setDashboardData(res.dashboard);
      } else {
        setDataGrid([]);
      }
    } catch (error) {
      console.error("Error al procesar", error);
      setDataGrid([]);
    } finally {
      setLoading(false);
    }
  };

  const getExportMetadata = () => ({
    empresa: 'AgroPaccioli',
    finca: selectedFincaFiltro ? selectedFincaFiltro.label : 'Todas las Fincas',
    cultivo: selectedCultivo ? selectedCultivo.label : 'Todos los Cultivos',
    fechaDesde: fechaDesde,
    fechaHasta: fechaHasta,
    usuario: user?.nombre || user?.username || 'Usuario del Sistema',
    rol: user?.rol || 'No asignado',
    reportName: 'TRAZABILIDAD PRODUCTO'
  });

  const getExportColumns = () => [
    { name: 'id_traz_prod' }, { name: 'id_finca' }, { name: 'id_lote' }, 
    { name: 'fecha_evento' }, { name: 'etapa' }, { name: 'descripcion' }, { name: 'peso_kg' }
  ];

  const handleExportPdf = () => {
    if (dataGrid.length === 0) return;
    exportToPdf('trazabilidad_producto', getExportColumns(), dataGrid, getExportMetadata());
  };

  const handleExportExcel = () => {
    if (dataGrid.length === 0) return;
    exportToExcel('trazabilidad_producto', getExportColumns(), dataGrid, getExportMetadata());
  };

  const handleExportWhatsApp = () => {
    if (dataGrid.length === 0) return;
    let text = `*Reporte: TRAZABILIDAD PRODUCTO*\n\n`;
    const limit = Math.min(dataGrid.length, 10);
    for (let i = 0; i < limit; i++) {
      const item = dataGrid[i];
      text += `*ID:* ${item.id_traz_prod} | *Fecha:* ${new Date(item.fecha_evento).toLocaleDateString()}\n`;
      text += `*Etapa:* ${item.etapa} | *Peso:* ${item.peso_kg} Kg\n`;
      text += `-----------------\n`;
    }
    if (dataGrid.length > 10) {
      text += `\n_...y ${dataGrid.length - 10} registros más._`;
    }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleExportDashboardPdf = async () => {
    if (!dashboardRef.current) return;
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      let startX = 14;
      
      // 1. Cargar Logo de la empresa
      let logoBase64 = null;
      try {
        const resPath = await fetch(`${API_BASE}/config/logo`, { headers: getAuthHeaders() });
        if (resPath.ok) {
          const { logo_path } = await resPath.json();
          if (logo_path) {
            const imgUrl = logo_path.startsWith('http') ? logo_path : `${API_BASE.replace('/api', '')}${logo_path.startsWith('/') ? '' : '/'}${logo_path}`;
            const imgRes = await fetch(imgUrl);
            if (imgRes.ok) {
               const blob = await imgRes.blob();
               logoBase64 = await new Promise((resolve) => {
                 const reader = new FileReader();
                 reader.onloadend = () => resolve(reader.result);
                 reader.readAsDataURL(blob);
               });
            }
          }
        }
      } catch (e) {
        console.warn("Could not load logo", e);
      }

      // 2. Colocar Logo
      if (logoBase64) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const logoWidth = 25;
        const logoX = pageWidth - 14 - logoWidth;
        try { doc.addImage(logoBase64, 'PNG', logoX, 15, logoWidth, 25); } catch(e) {
          try { doc.addImage(logoBase64, 'JPEG', logoX, 15, logoWidth, 25); } catch(err) {}
        }
      }

      const metadata = getExportMetadata();
      
      // 3. Encabezado Oficial (Empresa, Nombre Reporte, Metadatos y Fecha)
      doc.setFontSize(16);
      doc.setTextColor(26, 35, 50);
      doc.text(`${metadata.empresa || 'AgroPaccioli'}`, startX, 20);
      
      doc.setFontSize(14);
      doc.setTextColor(50, 50, 50);
      doc.text(`Reporte: DASHBOARD DE TRAZABILIDAD Y AUDITORÍA`, startX, 26);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      let currentY = 32;
      doc.text(`Finca Operativa: ${metadata.finca || 'Todas las Fincas'}`, startX, currentY);
      currentY += 5;
      if (metadata.cultivo) {
        doc.text(`Cultivo: ${metadata.cultivo}`, startX, currentY);
        currentY += 5;
      }
      
      const fd = metadata.fechaDesde || 'Histórico';
      const fh = metadata.fechaHasta || 'Histórico';
      doc.text(`Periodo: ${fd} a ${fh}`, startX, currentY);
      currentY += 5;
      
      // 4. Capturar el Dashboard con fondo oscuro (para que el texto blanco sea legible)
      const canvas = await html2canvas(dashboardRef.current, { scale: 2, backgroundColor: '#0f172a' });
      const imgData = canvas.toDataURL('image/png');
      
      // 5. Dibujar la imagen ajustada a la hoja (con márgenes)
      const pdfWidth = doc.internal.pageSize.getWidth() - 28; 
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      doc.addImage(imgData, 'PNG', 14, currentY + 3, pdfWidth, pdfHeight);
      
      // 6. Pie de página oficial
      doc.setFontSize(8);
      doc.setTextColor(150);
      const rolStr = metadata.rol ? ` (Rol: ${metadata.rol})` : '';
      const footerText1 = `Generado por: ${metadata.usuario || 'Usuario del Sistema'}${rolStr} | Fecha y Hora: ${new Date().toLocaleString('es-ES')}`;
      const footerText2 = `Página 1 de 1 — AgroPaccioli © ${new Date().getFullYear()}`;
      
      doc.text(
        footerText1,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 14,
        { align: 'center' }
      );
      doc.text(
        footerText2,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      
      doc.save(`Dashboard_Trazabilidad_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('Error exportando dashboard a PDF:', error);
    }
  };

  const handleExportDashboardExcel = () => {
    if (!dashboardData) return;
    const summaryData = [
      { Métrica: 'Volumen Total (Kg)', Valor: dashboardData.kpi.volumen_total },
      { Métrica: 'Rendimiento Promedio (Kg/Ha)', Valor: dashboardData.kpi.rendimiento_ha },
      { Métrica: 'Compliance Auditoría (%)', Valor: dashboardData.kpi.porcentaje_compliance },
      { Métrica: 'Costo Unitario Promedio ($)', Valor: dashboardData.kpi.costo_estimado_unidad }
    ];
    exportToExcel('dashboard_resumen', [{name:'Métrica'},{name:'Valor'}], summaryData, getExportMetadata());
  };

  const handleExportDashboardWhatsApp = () => {
    if (!dashboardData) return;
    const text = `*Dashboard de Trazabilidad*\n\n` +
      `*Volumen Total:* ${dashboardData.kpi.volumen_total.toLocaleString()} Kg\n` +
      `*Rendimiento:* ${dashboardData.kpi.rendimiento_ha.toLocaleString()} Kg/Ha\n` +
      `*Compliance:* ${dashboardData.kpi.porcentaje_compliance}%\n` +
      `*Costo Promedio:* $${dashboardData.kpi.costo_estimado_unidad}\n`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="module-container">
      <div className="module-header">
        <h1>Trazabilidad de Producto</h1>
        <p>Seleccione un cultivo y presione Procesar para cargar la información.</p>
      </div>

      {/* Filtros y Botón Procesar */}
      <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: 'var(--text-muted)' }}>Finca</label>
            <Select 
              options={fincas}
              value={selectedFincaFiltro}
              onChange={setSelectedFincaFiltro}
              placeholder="-- Todas --"
              isClearable
              styles={{
                control: (base) => ({ ...base, background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text)', minHeight: '38px' }),
                menu: (base) => ({ ...base, background: 'var(--card-bg)', zIndex: 9999 }),
                singleValue: (base) => ({ ...base, color: 'var(--text)' }),
                option: (base, state) => ({
                  ...base,
                  background: state.isFocused ? 'var(--primary)' : 'var(--card-bg)',
                  color: state.isFocused ? 'white' : 'var(--text)',
                }),
              }}
            />
          </div>

          <div style={{ minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: 'var(--text-muted)' }}>Cultivo</label>
            <Select 
              options={cultivos}
              value={selectedCultivo}
              onChange={setSelectedCultivo}
              placeholder="-- Todos --"
              isClearable
              styles={{
                control: (base) => ({ ...base, background: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text)', minHeight: '38px' }),
                menu: (base) => ({ ...base, background: 'var(--card-bg)', zIndex: 9999 }),
                singleValue: (base) => ({ ...base, color: 'var(--text)' }),
                option: (base, state) => ({
                  ...base,
                  background: state.isFocused ? 'var(--primary)' : 'var(--card-bg)',
                  color: state.isFocused ? 'white' : 'var(--text)',
                }),
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: 'var(--text-muted)' }}>Desde</label>
            <input 
              type="date" 
              className="form-control" 
              style={{ background: 'var(--card-bg)', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px', borderRadius: '4px', minHeight: '38px' }}
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: 'var(--text-muted)' }}>Hasta</label>
            <input 
              type="date" 
              className="form-control" 
              style={{ background: 'var(--card-bg)', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px', borderRadius: '4px', minHeight: '38px' }}
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
          
          <button className="btn-action-base btn-procesar" onClick={handleProcesar}>
            {loading ? 'Procesando...' : '🔍 Procesar'}
          </button>
        </div>
      </div>

      {processed && (
        <div className="card">
          <div className="tabs-header" style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
            <button 
              style={{
                padding: '12px 24px', background: 'transparent', border: 'none', cursor: 'pointer',
                color: activeTab === 'grid' ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'grid' ? '3px solid var(--primary)' : 'none',
                fontWeight: activeTab === 'grid' ? 'bold' : 'normal',
                fontSize: '16px'
              }}
              onClick={() => setActiveTab('grid')}
            >
              📋 Registros de Trazabilidad
            </button>
            <button 
              style={{
                padding: '12px 24px', background: 'transparent', border: 'none', cursor: 'pointer',
                color: activeTab === 'dashboard' ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'dashboard' ? '3px solid var(--primary)' : 'none',
                fontWeight: activeTab === 'dashboard' ? 'bold' : 'normal',
                fontSize: '16px'
              }}
              onClick={() => setActiveTab('dashboard')}
            >
              📊 Dashboard Gerencial y Auditoría
            </button>
          </div>

          <div className="tab-content" style={{ padding: '10px' }}>
            {/* PESTAÑA: GRID */}
            {activeTab === 'grid' && (
              <div>
                <Space style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                  <Button className="btn-action-base btn-excel" icon={<FileExcelOutlined />} onClick={handleExportExcel} size="large">
                    Excel
                  </Button>
                  <Button className="btn-action-base btn-pdf" icon={<FilePdfOutlined />} onClick={handleExportPdf} size="large">
                    PDF
                  </Button>
                  <Button className="btn-action-base btn-whatsapp" icon={<WhatsAppOutlined />} onClick={handleExportWhatsApp} size="large">
                    WhatsApp
                  </Button>
                </Space>
                <div style={{ background: 'var(--card-bg)', borderRadius: '8px', padding: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorBgContainer: '#1e293b', colorBorderSecondary: '#334155', colorText: '#cbd5e1' } }}>
                    <Table 
                      columns={[
                        { title: 'ID TRAZ', dataIndex: 'id_traz_prod', key: 'id', render: v => <b>{v}</b> },
                        { title: 'ID FINCA / LOTE', key: 'ubicacion', render: (_, r) => <span>Finca {r.id_finca} | Lote {r.id_lote}</span> },
                        { title: 'FECHA EVENTO', dataIndex: 'fecha_evento', key: 'fecha', render: d => new Date(d).toLocaleDateString() },
                        { title: 'ETAPA', dataIndex: 'etapa', key: 'etapa', render: t => <Tag color={t.includes('Recepcion') ? 'blue' : t.includes('Transporte') ? 'orange' : 'green'}>{t}</Tag> },
                        { title: 'DESCRIPCIÓN', dataIndex: 'descripcion', key: 'desc' },
                        { title: 'PESO (KG)', dataIndex: 'peso_kg', key: 'peso', align: 'right', render: v => <b>{Number(v).toLocaleString()}</b> }
                      ]}
                      dataSource={dataGrid}
                      rowKey="id_traz_prod"
                      pagination={{ pageSize: 15 }}
                      bordered
                      size="middle"
                    />
                  </ConfigProvider>
                </div>
              </div>
            )}

            {/* PESTAÑA: DASHBOARD */}
            {activeTab === 'dashboard' && dashboardData && (
              <div ref={dashboardRef}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0 }}>Indicadores de Auditoría y Eficiencia</h3>
                  <Space>
                    <Button className="btn-action-base btn-excel" icon={<FileExcelOutlined />} onClick={handleExportDashboardExcel} size="large">
                      Excel
                    </Button>
                    <Button className="btn-action-base btn-pdf" icon={<FilePdfOutlined />} onClick={handleExportDashboardPdf} size="large">
                      PDF
                    </Button>
                    <Button className="btn-action-base btn-whatsapp" icon={<WhatsAppOutlined />} onClick={handleExportDashboardWhatsApp} size="large">
                      WhatsApp
                    </Button>
                  </Space>
                </div>
                
                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                  <div className="card" style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-color)' }}>
                    <h4 style={{ color: 'var(--text-muted)', marginBottom: '10px', fontSize: '14px' }}>Volumen Total Cosechado</h4>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--primary)' }}>
                      {dashboardData.kpi.volumen_total.toLocaleString()} Kg
                    </div>
                  </div>
                  
                  <div className="card" style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-color)' }}>
                    <h4 style={{ color: 'var(--text-muted)', marginBottom: '10px', fontSize: '14px' }}>Rendimiento Promedio</h4>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>
                      {dashboardData.kpi.rendimiento_ha.toLocaleString()} Kg/Ha
                    </div>
                  </div>
                  
                  <div className="card" style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-color)', borderLeft: '4px solid #f59e0b' }}>
                    <h4 style={{ color: 'var(--text-muted)', marginBottom: '10px', fontSize: '14px' }}>Compliance Auditoría</h4>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>
                      {dashboardData.kpi.porcentaje_compliance}%
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>Registros completos</small>
                  </div>
                  
                  <div className="card" style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-color)' }}>
                    <h4 style={{ color: 'var(--text-muted)', marginBottom: '10px', fontSize: '14px' }}>Costo Unitario Promedio</h4>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef4444' }}>
                      ${dashboardData.kpi.costo_estimado_unidad}
                    </div>
                  </div>
                </div>

                {/* GRAFICOS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px' }}>
                  <div className="card" style={{ padding: '20px' }}>
                    <h4>Tendencia de Cosecha (Volumen)</h4>
                    <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
                      <ResponsiveContainer>
                        <LineChart data={dashboardData.tendencias}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="name" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                          <Legend />
                          <Line type="monotone" dataKey="volumen" stroke="#10b981" strokeWidth={3} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className="card" style={{ padding: '20px' }}>
                    <h4>Distribución por Lote (Productividad)</h4>
                    <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={dashboardData.distribucion}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            label
                          >
                            {dashboardData.distribucion.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
