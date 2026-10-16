import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/api';
import { 
  Card, Row, Col, Statistic, Table, Select, Button, 
  Alert, Typography, Space, Spin, Tag, message, DatePicker
} from 'antd';
import { useGlobalSelectors } from '../../context/GlobalSelectorsContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  ShieldCheck, AlertTriangle, CheckCircle, TrendingUp, DollarSign, 
  Users, Map, FileText, Download, RefreshCw
} from 'lucide-react';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function AuditoriaCostosDashboard({ tenantId }) {
  const { state: globalState } = useGlobalSelectors();
  const selectedFinca = globalState?.finca || 'Todas';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    periodoAnio: new Date().getFullYear(),
    periodoMes: new Date().getMonth() + 1,
    quincena: 'Primera',
    fechaInicio: null,
    fechaFin: null
  });
  const [contabilizando, setContabilizando] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      let queryString = `tenantId=${tenantId || 1}&periodoAnio=${filters.periodoAnio}&periodoMes=${filters.periodoMes}&quincena=${filters.quincena}`;
      if (selectedFinca !== 'Todas') {
        queryString += `&idFinca=${selectedFinca}`;
      }
      if (filters.fechaInicio && filters.fechaFin) {
        queryString += `&fechaInicio=${filters.fechaInicio}&fechaFin=${filters.fechaFin}`;
      }
      
      const res = await authFetch(`/api/rrhh/auditoria-costos?${queryString}`);
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || 'Error de red');
      }
      const jsonData = await res.json();
      setData(jsonData);
    } catch (err) {
      console.error(err);
      message.error("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenantId, filters.periodoAnio, filters.periodoMes, filters.quincena, filters.fechaInicio, filters.fechaFin, selectedFinca]);

  const handleContabilizar = async () => {
    if (!data) return;
    setContabilizando(true);
    setSuccessMsg(null);
    try {
      const res = await authFetch('/api/rrhh/contabilizar-nomina', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenantId || 1,
          pAnio: filters.periodoAnio,
          pMes: filters.periodoMes,
          pQuin: filters.quincena,
          totalNomina: data.kpis.totalNomina,
          totalLabores: data.kpis.totalLabores,
          variacion: data.kpis.variacion
        })
      });
      const responseData = await res.json();
      if (responseData.success) {
        setSuccessMsg(`Comprobante ${responseData.documento} generado con éxito.`);
        message.success(`Comprobante ${responseData.documento} generado con éxito.`);
      } else {
        throw new Error(responseData.error || 'Error desconocido');
      }
    } catch (err) {
      console.error(err);
      message.error('Error al contabilizar: ' + (err.response?.data?.error || err.message));
    } finally {
      setContabilizando(false);
    }
  };

  const kpis = data?.kpis || { totalNomina: 0, totalLabores: 0, variacion: 0 };
  const trazabilidad = data?.trazabilidad || [];
  const lotes = data?.lotes || [];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
  };

  const variacionPercentage = kpis.totalNomina > 0 
    ? ((kpis.variacion / kpis.totalNomina) * 100).toFixed(1) 
    : 0;

  const isAuditClean = Math.abs(kpis.variacion) < 1000; // Tolerance threshold
  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const columns = [
    {
      title: 'ID / Empleado',
      key: 'empleado',
      render: (_, record) => (
        <Space>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', backgroundColor: '#f3f4f6', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#6b7280'
          }}>
            {record.nombres?.charAt(0) || 'E'}
          </div>
          <div>
            <div style={{ fontWeight: 'bold', color: '#111827' }}>{record.nombres} {record.apellidos}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>ID: {record.id_empleado}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Nómina Liquidada',
      dataIndex: 'nomina_devengada',
      key: 'nomina_devengada',
      align: 'right',
      render: (val) => <Text strong>{formatCurrency(val)}</Text>
    },
    {
      title: 'Labores Creadas',
      dataIndex: 'cantidad_labores',
      key: 'cantidad_labores',
      align: 'center',
      render: (val) => <Tag color="blue">{val}</Tag>
    },
    {
      title: 'Costo a Lotes',
      dataIndex: 'costo_reportado_labores',
      key: 'costo_reportado_labores',
      align: 'right',
      render: (val) => <Text strong type="success">{formatCurrency(val)}</Text>
    },
    {
      title: 'Variación / Ocio',
      key: 'variacion',
      align: 'right',
      render: (_, record) => {
        const diff = (record.nomina_devengada || 0) - (record.costo_reportado_labores || 0);
        const isDiff = Math.abs(diff) > 1000;
        return (
          <Space style={{ color: isDiff ? '#d97706' : '#9ca3af', fontWeight: 'bold' }}>
            {isDiff && <AlertTriangle size={14} />}
            {formatCurrency(diff)}
          </Space>
        );
      }
    }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldCheck size={32} color="#10b981" /> 
            Auditoría de Costos
          </Title>
          <Text type="secondary" style={{ fontSize: '16px' }}>
            Cruce transaccional entre Nómina Pagada y Costos de Producción en Lotes.
          </Text>
        </div>
        
        <Space size="middle" style={{ backgroundColor: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <Text strong>Finca:</Text>
          <Tag color="green">{selectedFinca === 'Todas' ? 'Todas las Fincas' : `ID Finca: ${selectedFinca}`}</Tag>
          
          <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb' }}></div>
          
          <RangePicker 
            onChange={(dates, dateStrings) => {
              if (dates) {
                setFilters({...filters, fechaInicio: dateStrings[0], fechaFin: dateStrings[1]});
              } else {
                setFilters({...filters, fechaInicio: null, fechaFin: null});
              }
            }}
          />

          <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb' }}></div>
          <Select 
            value={filters.periodoMes} 
            onChange={(val) => setFilters({...filters, periodoMes: val, fechaInicio: null, fechaFin: null})}
            style={{ width: 120 }}
            bordered={false}
            disabled={filters.fechaInicio !== null}
          >
            {Array.from({length: 12}, (_, i) => (
              <Option key={i+1} value={i+1}>
                {new Date(2000, i, 1).toLocaleString('es', { month: 'long' }).toUpperCase()}
              </Option>
            ))}
          </Select>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb' }}></div>
          <Select 
            value={filters.quincena} 
            onChange={(val) => setFilters({...filters, quincena: val, fechaInicio: null, fechaFin: null})}
            style={{ width: 140 }}
            bordered={false}
            disabled={filters.fechaInicio !== null}
          >
            <Option value="Primera">1ra Quincena</Option>
            <Option value="Segunda">2da Quincena</Option>
            <Option value="Mensual">Mensual</Option>
          </Select>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb' }}></div>
          <Button 
            type="text" 
            icon={<RefreshCw size={18} className={loading ? 'animate-spin' : ''} />} 
            onClick={fetchData}
            style={{ color: '#10b981' }}
          />
        </Space>
      </div>

      <Spin spinning={loading && !data}>
        {data && (
          <>
            {/* Alerta de Estado */}
            <Alert
              message={<span style={{ fontSize: '16px', fontWeight: 'bold' }}>{isAuditClean ? 'Cruce Operativo Exitoso' : 'Descuadre Detectado en el Cruce'}</span>}
              description={isAuditClean 
                ? 'El 100% de la nómina operativa ha sido costeada y reportada en las labores de los lotes.'
                : `Existe una diferencia de ${formatCurrency(kpis.variacion)} entre la nómina pagada y el valor costeado en campo.`}
              type={isAuditClean ? 'success' : 'warning'}
              showIcon
              icon={isAuditClean ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
              style={{ marginBottom: '24px', padding: '16px', borderRadius: '12px' }}
              action={
                !isAuditClean && (
                  <Button type="primary" danger style={{ marginTop: '8px' }}>
                    Ver Detalle de Fugas
                  </Button>
                )
              }
            />

            {/* KPIs */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
              <Col xs={24} sm={8}>
                <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <Statistic
                    title={<span style={{ fontWeight: 500, color: '#6b7280' }}>TOTAL NÓMINA PAGADA</span>}
                    value={kpis.totalNomina}
                    formatter={(value) => formatCurrency(value)}
                    prefix={<DollarSign size={20} color="#ef4444" style={{ marginRight: 8, background: '#fee2e2', padding: 4, borderRadius: '50%' }}/>}
                    valueStyle={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}
                  />
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '8px' }}>
                    Extractado de <Text code>rrhh_nomina_detalle</Text>
                  </Text>
                </Card>
              </Col>
              
              <Col xs={24} sm={8}>
                <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <Statistic
                    title={<span style={{ fontWeight: 500, color: '#6b7280' }}>COSTEADO A LOTES</span>}
                    value={kpis.totalLabores}
                    formatter={(value) => formatCurrency(value)}
                    prefix={<Map size={20} color="#10b981" style={{ marginRight: 8, background: '#d1fae5', padding: 4, borderRadius: '50%' }}/>}
                    valueStyle={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}
                  />
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '8px' }}>
                    Extractado de <Text code>labores_diarias</Text>
                  </Text>
                </Card>
              </Col>

              <Col xs={24} sm={8}>
                <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: isAuditClean ? 'none' : '1px solid #fde68a', backgroundColor: isAuditClean ? '#fff' : '#fffbeb' }}>
                  <Statistic
                    title={<span style={{ fontWeight: 500, color: isAuditClean ? '#6b7280' : '#92400e' }}>VARIACIÓN (TIEMPO OCIOSO)</span>}
                    value={kpis.variacion}
                    formatter={(value) => formatCurrency(value)}
                    prefix={<TrendingUp size={20} color={isAuditClean ? "#6366f1" : "#d97706"} style={{ marginRight: 8, background: isAuditClean ? '#e0e7ff' : '#fef3c7', padding: 4, borderRadius: '50%' }}/>}
                    valueStyle={{ fontSize: '28px', fontWeight: 700, color: isAuditClean ? '#111827' : '#78350f' }}
                  />
                  <Text style={{ fontSize: '13px', display: 'block', marginTop: '8px', color: isAuditClean ? '#059669' : '#b45309', fontWeight: 500 }}>
                    {variacionPercentage}% respecto a la nómina
                  </Text>
                </Card>
              </Col>
            </Row>

            {/* Grafico y Accion */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
              <Col xs={24} lg={12}>
                <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <Title level={4} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                    <Map size={20} color="#4f46e5" /> Distribución Operativa por Lote
                  </Title>
                  <div style={{ height: 300, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={lotes} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="lote" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                        <YAxis 
                          axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}}
                          tickFormatter={(val) => `$${val / 1000}k`}
                        />
                        <RechartsTooltip 
                          cursor={{fill: '#f9fafb'}}
                          contentStyle={{borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                          formatter={(val) => [formatCurrency(val), 'Costo']}
                        />
                        <Bar dataKey="costo_total" radius={[6, 6, 0, 0]}>
                          {lotes.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', backgroundColor: '#e0e7ff', height: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', padding: '0 16px' }}>
                    <div style={{ width: 56, height: 56, backgroundColor: '#c7d2fe', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                      <FileText size={28} color="#4f46e5" />
                    </div>
                    <Title level={3} style={{ marginTop: 0 }}>Integración Contable</Title>
                    <Paragraph style={{ color: '#4b5563', fontSize: '15px' }}>
                      La nómina de este periodo está lista para ser transferida a la contabilidad. Se generará un comprobante diario afectando automáticamente las cuentas de Costos de Producción (7105), Gastos y Pasivos.
                    </Paragraph>
                    
                    {successMsg && (
                      <Alert 
                        type="success" 
                        showIcon 
                        message={successMsg} 
                        style={{ marginBottom: '16px' }}
                      />
                    )}
                    
                    <Button 
                      type="primary" 
                      size="large"
                      onClick={handleContabilizar}
                      loading={contabilizando}
                      disabled={successMsg !== null}
                      style={{ 
                        backgroundColor: successMsg ? '#10b981' : '#4f46e5', 
                        borderColor: successMsg ? '#10b981' : '#4f46e5',
                        width: '100%',
                        fontWeight: 'bold',
                        height: '48px',
                        borderRadius: '8px',
                        marginTop: 'auto'
                      }}
                    >
                      {successMsg ? 'Contabilizado Exitosamente' : 'Generar Comprobante Contable'}
                    </Button>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* Tabla Detalle */}
            <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 0 }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={20} color="#6b7280" /> Trazabilidad Detallada por Empleado
                </Title>
                <Button type="text" icon={<Download size={16} />}>
                  Exportar CSV
                </Button>
              </div>
              <Table 
                columns={columns}
                dataSource={trazabilidad}
                rowKey="id_empleado"
                pagination={{
                  defaultPageSize: 10,
                  showSizeChanger: true,
                  pageSizeOptions: ['10', '25', '50'],
                  showTotal: (total) => `Total ${total} empleados`
                }}
                style={{ width: '100%' }}
              />
            </Card>
          </>
        )}
      </Spin>
    </div>
  );
}
