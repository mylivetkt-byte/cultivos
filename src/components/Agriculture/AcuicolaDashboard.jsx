import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Tabs, Row, Col, Typography, Divider, Spin } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area } from 'recharts';
import { Fish, Droplets, ArrowUpRight, TrendingUp, DollarSign, Activity, ShieldCheck, Box, Target, Layers } from 'lucide-react';
import { fetchApi } from '../../utils/api';

const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Text } = Typography;

export default function AcuicolaDashboard() {
  const [fincas, setFincas] = useState([]);
  const [estanques, setEstanques] = useState([]);
  const [siembras, setSiembras] = useState([]);
  const [visitasGlobales, setVisitasGlobales] = useState([]);
  
  const [globalStats, setGlobalStats] = useState(null);
  const [selectedSiembra, setSelectedSiembra] = useState(null);
  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingGlobal, setLoadingGlobal] = useState(false);

  useEffect(() => {
    fetchFiltros();
    fetchGlobalStats();
  }, []);

  useEffect(() => {
    if (selectedSiembra) {
      fetchStats(selectedSiembra);
    } else {
      setStats(null);
    }
  }, [selectedSiembra]);

  const fetchFiltros = async () => {
    try {
      const data = await fetchApi('/acuicola/filtros');
      setFincas(data.fincas || []);
      setEstanques(data.estanques || []);
      setSiembras(data.siembras || []);
      setVisitasGlobales(data.visitas || []);
    } catch(e) {
      console.error(e);
    }
  };

  const fetchGlobalStats = async () => {
    setLoadingGlobal(true);
    try {
      const data = await fetchApi('/acuicola/global-stats');
      setGlobalStats(data);
    } catch(e) {
      console.error(e);
    } finally {
      setLoadingGlobal(false);
    }
  };

  const fetchStats = async (id) => {
    setLoading(true);
    try {
      const data = await fetchApi(`/acuicola/stats/${id}`);
      setStats(data);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const solicitarInsumosWp = () => {
    if (!stats) return;
    const texto = encodeURIComponent(`*Requerimiento de Insumos Acuícolas*\n\nFinca: ${stats.siembra.finca_nombre}\nEstanque: ${stats.siembra.estanque_codigo}\nLote/Siembra ID: ${stats.siembra.id_siembra_acui}\nEspecie: ${stats.siembra.especie_nombre}\n\nHola, requiero envío urgente de:\n- Concentrado de Engorde: ___ bultos\n- Insumos de Calidad de agua: ___\n\nFavor confirmar disponibilidad.`);
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  };

  // --- Lote Especifico ---
  let pezAlevines = 0, pecesVivos = 0, mortalidadPct = "0.00", supervivenciaPct = "0.00", costoTotal = 0, ultimaBiomasa = 0, isCosechado = false, ingresoTotal = 0, rentabilidad = 0, growthData = [], costosData = [];

  if (stats) {
    pezAlevines = stats.siembra.cantidad_alevines || 0;
    pecesVivos = stats.peces_vivos || 0;
    mortalidadPct = pezAlevines > 0 ? ((stats.novedades.total_muertes / pezAlevines) * 100).toFixed(2) : "0.00";
    supervivenciaPct = pezAlevines > 0 ? ((pecesVivos / pezAlevines) * 100).toFixed(2) : "0.00";

    costoTotal = (stats.siembra.costo_siembra || 0) + (stats.novedades.total_costo_repuestos || 0) + (stats.alimento.total_costo_alimento || 0) + (stats.costoNomina || 0);
    ultimaBiomasa = stats.muestreos.length > 0 ? stats.muestreos[stats.muestreos.length - 1].biomasa_estimada_kg : 0;
    
    isCosechado = !!stats.cosecha;
    ingresoTotal = isCosechado ? stats.cosecha.ingreso_total : 0;
    rentabilidad = ingresoTotal > 0 ? ingresoTotal - costoTotal : 0;

    growthData = stats.muestreos.map(m => ({
      Fecha: m.fecha.substring(0,10),
      Peso: parseFloat(m.peso_promedio_g)
    }));

    costosData = [
      { name: 'Alevinos', value: parseFloat(stats.siembra.costo_siembra || 0) },
      { name: 'Alimento', value: parseFloat(stats.alimento.total_costo_alimento || 0) },
      { name: 'Nómina', value: parseFloat(stats.costoNomina || 0) },
      { name: 'Repuestos', value: parseFloat(stats.novedades.total_costo_repuestos || 0) }
    ];
  }

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Header Gerencial */}
      <Card bordered={false} style={{ marginBottom: 24, borderRadius: 16 }}>
        <Row align="middle" gutter={16}>
          <Col>
            <Target size={32} color="#2563eb" />
          </Col>
          <Col>
            <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Panel Gerencial Acuícola</Title>
            <Text type="secondary">Visión global de operación, proyecciones y rentabilidad (Auditoría Criptográfica Activa)</Text>
          </Col>
        </Row>
      </Card>

      {loadingGlobal ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><Spin size="large" tip="Cargando datos gerenciales..." /></div>
      ) : globalStats ? (
        <>
          {/* Fila 1: KPIs Globales */}
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 16, height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <Text type="secondary" strong style={{ textTransform: 'uppercase', fontSize: 12 }}>Infraestructura</Text>
                    <Title level={2} style={{ margin: '4px 0', fontWeight: 900, color: '#1e293b' }}>{globalStats.resumen.lotes_activos}</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>Lotes Activos en Engorde</Text>
                  </div>
                  <div style={{ backgroundColor: '#e0f2fe', padding: 12, borderRadius: 12, display: 'flex' }}>
                    <Layers size={24} color="#0284c7" />
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 16, height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <Text type="secondary" strong style={{ textTransform: 'uppercase', fontSize: 12 }}>Biomasa Actual</Text>
                    <Title level={2} style={{ margin: '4px 0', fontWeight: 900, color: '#0891b2' }}>
                      {globalStats.resumen.biomasa_actual_est.toLocaleString(undefined, {maximumFractionDigits:0})} <span style={{ fontSize: 16 }}>kg</span>
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>Estimado Vivo en Agua</Text>
                  </div>
                  <div style={{ backgroundColor: '#cffafe', padding: 12, borderRadius: 12, display: 'flex' }}>
                    <Fish size={24} color="#0891b2" />
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 16, height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <Text type="secondary" strong style={{ textTransform: 'uppercase', fontSize: 12 }}>Proyección Cosecha</Text>
                    <Title level={2} style={{ margin: '4px 0', fontWeight: 900, color: '#059669' }}>
                      {globalStats.resumen.biomasa_proyectada.toLocaleString(undefined, {maximumFractionDigits:0})} <span style={{ fontSize: 16 }}>kg</span>
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>Estimado a peso comercial (500g)</Text>
                  </div>
                  <div style={{ backgroundColor: '#d1fae5', padding: 12, borderRadius: 12, display: 'flex' }}>
                    <TrendingUp size={24} color="#059669" />
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 16, height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <Text type="secondary" strong style={{ textTransform: 'uppercase', fontSize: 12 }}>Ingresos Históricos</Text>
                    <Title level={2} style={{ margin: '4px 0', fontWeight: 900, color: '#d97706' }}>
                      ${(globalStats.resumen.ingresos_historicos / 1000000).toLocaleString(undefined, {maximumFractionDigits:1})}M
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>Totales de Cosechas Cerradas</Text>
                  </div>
                  <div style={{ backgroundColor: '#fef3c7', padding: 12, borderRadius: 12, display: 'flex' }}>
                    <DollarSign size={24} color="#d97706" />
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Fila 2: Gráficos Gerenciales */}
          <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
            <Col xs={24} lg={16}>
              <Card bordered={false} style={{ borderRadius: 16, height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                  <Activity size={20} color="#3b82f6" />
                  <Title level={4} style={{ margin: 0 }}>Análisis Financiero: Costos vs Ventas</Title>
                </div>
                <div style={{ height: 300, width: '100%' }}>
                  {globalStats.ventasVsCostos.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={globalStats.ventasVsCostos} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="mes" stroke="#64748b" tick={{fontSize: 12}} />
                        <YAxis stroke="#64748b" tickFormatter={(v) => `$${v/1000000}M`} />
                        <RechartsTooltip formatter={(val) => `$${val.toLocaleString()}`} />
                        <Legend />
                        <Bar dataKey="costos" name="Inversión/Costos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="ventas" name="Ventas (Ingresos)" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div style={{ display:'flex', height:'100%', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>Sin datos financieros para mostrar</div>}
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card bordered={false} style={{ borderRadius: 16, height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                  <Droplets size={20} color="#06b6d4" />
                  <Title level={4} style={{ margin: 0 }}>Distribución de Lagos por Finca</Title>
                </div>
                <div style={{ height: 300, width: '100%' }}>
                  {globalStats.lagosFinca.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={globalStats.lagosFinca}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="cantidad"
                          nameKey="finca"
                        >
                          {globalStats.lagosFinca.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div style={{ display:'flex', height:'100%', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>No hay lagos registrados</div>}
                </div>
              </Card>
            </Col>
          </Row>

          {/* Fila 3: Proyección de Cosecha y Visitas */}
          <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
            <Col xs={24} lg={12}>
              <Card bordered={false} style={{ borderRadius: 16, height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                  <ArrowUpRight size={20} color="#10b981" />
                  <Title level={4} style={{ margin: 0 }}>Proyección de Cosecha Lote Activo</Title>
                </div>
                <div style={{ height: 300, width: '100%' }}>
                  {globalStats.proyeccionLotes.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={globalStats.proyeccionLotes} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="id" stroke="#64748b" tickFormatter={(id) => `Lote ${id}`} />
                        <YAxis stroke="#64748b" />
                        <RechartsTooltip formatter={(val) => `${val.toLocaleString(undefined, {maximumFractionDigits:0})} kg`} labelFormatter={(l) => `Lote #${l}`} />
                        <Legend />
                        <Area type="monotone" dataKey="biomasa_actual" name="Biomasa Actual Est." stackId="1" stroke="#0ea5e9" fill="#bae6fd" />
                        <Area type="monotone" dataKey="biomasa_futura" name="Meta Cosecha" stackId="2" stroke="#10b981" fill="#a7f3d0" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <div style={{ display:'flex', height:'100%', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>Sin lotes activos para proyectar</div>}
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card bordered={false} style={{ borderRadius: 16, height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                  <ShieldCheck size={20} color="#6366f1" />
                  <Title level={4} style={{ margin: 0 }}>Visitas Técnicas a Lagos</Title>
                </div>
                <div style={{ height: 300, width: '100%' }}>
                  {visitasGlobales?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={visitasGlobales} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="ubicacion" stroke="#64748b" tick={{fontSize: 10}} interval={0} angle={-25} textAnchor="end" height={60} />
                        <YAxis stroke="#64748b" />
                        <RechartsTooltip />
                        <Bar dataKey="cantidad" name="Visitas" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display:'flex', height:'100%', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>Sin visitas técnicas registradas</div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        </>
      ) : null}

      <Divider style={{ margin: '40px 0', borderColor: '#cbd5e1' }} />

      {/* Operativa Diaria / Análisis de Lote */}
      <Card bordered={false} style={{ borderRadius: 16 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Fish size={24} color="#64748b" />
              <Title level={3} style={{ margin: 0, color: '#1e293b' }}>Análisis Detallado por Lote</Title>
            </div>
            <Text type="secondary">Seleccione un estanque para ver métricas de campo y solicitar insumos.</Text>
          </Col>
          
          <Col>
            <div style={{ display: 'flex', gap: 12 }}>
              <Select 
                placeholder="Seleccione Siembra/Lote"
                style={{ width: 280 }}
                value={selectedSiembra}
                onChange={v => setSelectedSiembra(v)}
                size="large"
              >
                {siembras.map(s => (
                  <Option key={s.id_siembra_acui} value={s.id_siembra_acui}>
                    Lote #{s.id_siembra_acui} - {s.especie_nombre} ({s.estado})
                  </Option>
                ))}
              </Select>
              <Button size="large" type="primary" onClick={solicitarInsumosWp} icon={<Box size={16} />} style={{ backgroundColor: '#16a34a' }}>
                Pedir Insumos
              </Button>
            </div>
          </Col>
        </Row>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><Spin tip="Cargando datos del lote..." /></div>
        ) : stats ? (
          <Tabs defaultActiveKey="1">
            <TabPane tab={<span style={{ fontWeight: 500 }}>Resumen Biológico</span>} key="1">
              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} sm={12} md={6}>
                  <Card style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                    <Text type="secondary" strong style={{ fontSize: 12, textTransform: 'uppercase' }}>Peces Vivos</Text>
                    <Title level={2} style={{ margin: '4px 0', color: '#1e293b' }}>{pecesVivos.toLocaleString()}</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>Supervivencia: {supervivenciaPct}%</Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                    <Text type="secondary" strong style={{ fontSize: 12, textTransform: 'uppercase' }}>Mortalidad Total</Text>
                    <Title level={2} style={{ margin: '4px 0', color: '#e11d48' }}>{stats.novedades.total_muertes || 0}</Title>
                    <Text style={{ color: '#fb7185', fontSize: 12 }}>Tasa: {mortalidadPct}%</Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                    <Text type="secondary" strong style={{ fontSize: 12, textTransform: 'uppercase' }}>Biomasa Actual</Text>
                    <Title level={2} style={{ margin: '4px 0', color: '#0891b2' }}>{ultimaBiomasa.toLocaleString(undefined, {maximumFractionDigits:1})} kg</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>Último muestreo</Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                    <Text type="secondary" strong style={{ fontSize: 12, textTransform: 'uppercase' }}>FCA Actual</Text>
                    <Title level={2} style={{ margin: '4px 0', color: '#1e293b' }}>
                      {ultimaBiomasa > 0 ? (stats.alimento.total_alimento_kg / ultimaBiomasa).toFixed(2) : '0.00'}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>Conversión de Alimento</Text>
                  </Card>
                </Col>
              </Row>

              <div style={{ height: 300, marginTop: 24 }}>
                {stats.muestreos.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={growthData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="Fecha" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <RechartsTooltip />
                      <Legend />
                      <Line name="Peso (g)" type="monotone" dataKey="Peso" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div style={{ display:'flex', height:'100%', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>Sin muestreos registrados</div>}
              </div>
            </TabPane>
            
            <TabPane tab={<span style={{ fontWeight: 500 }}>Análisis Económico</span>} key="2">
              <Row gutter={[32, 32]} style={{ marginTop: 16 }}>
                <Col xs={24} md={12}>
                  <div style={{ height: 260, display: 'flex', justifyContent: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={costosData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {costosData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value) => `$${value.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <Title level={4} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 8, marginBottom: 16 }}>Estado Financiero del Lote</Title>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                      <Text type="secondary">Inversión (Semilla):</Text>
                      <Text strong>${parseFloat(stats.siembra.costo_siembra || 0).toLocaleString()}</Text>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                      <Text type="secondary">Alimento:</Text>
                      <Text strong>${parseFloat(stats.alimento.total_costo_alimento || 0).toLocaleString()}</Text>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 8 }}>
                      <Text strong>Costo Total:</Text>
                      <Text strong style={{ color: '#e11d48' }}>${costoTotal.toLocaleString()}</Text>
                    </li>
                    {isCosechado && (
                      <>
                        <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, borderTop: '1px dashed #cbd5e1', paddingTop: 16 }}>
                          <Text strong>Ingresos (Venta):</Text>
                          <Text strong style={{ color: '#059669' }}>${ingresoTotal.toLocaleString()}</Text>
                        </li>
                        <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                          <Text strong>Rentabilidad Bruta:</Text>
                          <Text strong style={{ color: rentabilidad > 0 ? '#059669' : '#e11d48' }}>${rentabilidad.toLocaleString()}</Text>
                        </li>
                      </>
                    )}
                  </ul>
                </Col>
              </Row>
            </TabPane>
          </Tabs>
        ) : (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: 12 }}>
            Selecciona un lote en el selector de arriba para ver su detalle operativo.
          </div>
        )}
      </Card>
    </div>
  );
}
