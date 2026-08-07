import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Card, Row, Col, Statistic, Tabs, Table, Input, Select, 
  Button, DatePicker, Tag, Space, Typography, Tooltip, Empty 
} from 'antd';
import { 
  Search, Users, Briefcase, Truck, DollarSign, Filter 
} from 'lucide-react';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function RRHHDashboard({ tenantId }) {
  const [kpis, setKpis] = useState(null);
  const [labores, setLabores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [filterEmpleado, setFilterEmpleado] = useState('');
  const [filterCargo, setFilterCargo] = useState('Todos');
  const [dateRange, setDateRange] = useState(null);

  useEffect(() => {
    fetchData();
  }, [tenantId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kpiRes, labRes] = await Promise.all([
        axios.get(`/api/rrhh/kpis?tenantId=${tenantId || 1}`),
        axios.get(`/api/rrhh/labores-historial?tenantId=${tenantId || 1}`)
      ]);
      setKpis(kpiRes.data);
      setLabores(labRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalCostoOperativo = kpis?.costos?.reduce((sum, c) => sum + Number(c.costo || 0), 0) || 0;

  // Derive unique cargos for the filter dropdown
  const uniqueCargos = useMemo(() => {
    const cargos = new Set(labores.map(l => l.cargo || 'Sin cargo'));
    return ['Todos', ...Array.from(cargos)];
  }, [labores]);

  // Filter logic for the table
  const filteredLabores = useMemo(() => {
    return labores.filter(l => {
      let match = true;
      if (filterEmpleado && !l.empleado?.toLowerCase().includes(filterEmpleado.toLowerCase())) {
        match = false;
      }
      if (filterCargo !== 'Todos' && (l.cargo || 'Sin cargo') !== filterCargo) {
        match = false;
      }
      if (dateRange && dateRange.length === 2) {
        const laborDate = dayjs(l.fecha);
        if (laborDate.isBefore(dateRange[0], 'day') || laborDate.isAfter(dateRange[1], 'day')) {
          match = false;
        }
      }
      return match;
    });
  }, [labores, filterEmpleado, filterCargo, dateRange]);

  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      sorter: (a, b) => new Date(a.fecha) - new Date(b.fecha),
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Empleado / Contratista',
      dataIndex: 'empleado',
      key: 'empleado',
      render: (text) => <Text>{text}</Text>
    },
    {
      title: 'Cargo',
      dataIndex: 'cargo',
      key: 'cargo',
      render: (text) => <Tag color="blue">{text || 'Sin cargo'}</Tag>
    },
    {
      title: 'Labor Realizada',
      dataIndex: 'labor',
      key: 'labor',
      render: (text) => <Tag color="purple">{text}</Tag>
    },
    {
      title: 'Lote / Finca',
      dataIndex: 'lote',
      key: 'lote',
      render: (text) => text || 'Global'
    },
    {
      title: 'Horas',
      dataIndex: 'horas',
      key: 'horas',
      align: 'right',
      render: (val) => `${val}h`
    },
    {
      title: 'Costo Est.',
      dataIndex: 'costo_estimado',
      key: 'costo_estimado',
      align: 'right',
      render: (val) => <Text type="success" strong>${Number(val).toLocaleString()}</Text>
    }
  ];

  const items = [
    {
      key: '1',
      label: 'Resumen Ejecutivo',
      children: (
        <div style={{ marginTop: 24 }}>
          {/* KPI Cards */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Statistic
                  title="Headcount Activo"
                  value={kpis?.headcount || 0}
                  prefix={<Users size={20} style={{ color: '#1890ff', marginRight: 8 }} />}
                  valueStyle={{ color: '#1f2937', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Statistic
                  title="Equipos / Plantas"
                  value={kpis?.maquinas || 0}
                  prefix={<Briefcase size={20} style={{ color: '#52c41a', marginRight: 8 }} />}
                  valueStyle={{ color: '#1f2937', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Statistic
                  title="Vehículos Operativos"
                  value={kpis?.vehiculos || 0}
                  prefix={<Truck size={20} style={{ color: '#faad14', marginRight: 8 }} />}
                  valueStyle={{ color: '#1f2937', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Statistic
                  title="Costo Mensual Est."
                  value={totalCostoOperativo}
                  prefix={<DollarSign size={20} style={{ color: '#f5222d', marginRight: 8 }} />}
                  precision={2}
                  valueStyle={{ color: '#1f2937', fontWeight: 700, fontSize: '20px' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            {/* Distribución por Cargos */}
            <Col xs={24} lg={8}>
              <Card 
                title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Briefcase size={18} color="#1890ff"/> Distribución por Cargos</span>} 
                bordered={false} 
                style={{ borderRadius: '12px', height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
              >
                {kpis?.cargos && kpis.cargos.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {kpis.cargos.map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text>{c.cargo}</Text>
                        <Tag color="geekblue">{c.cantidad}</Tag>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty description="No hay datos de cargos" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </Col>

            {/* Costos Operativos Acumulados */}
            <Col xs={24} lg={16}>
              <Card 
                title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><DollarSign size={18} color="#52c41a"/> Costos Operativos Acumulados</span>} 
                bordered={false} 
                style={{ borderRadius: '12px', height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
              >
                {kpis?.costos && kpis.costos.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {kpis.costos.map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f0f0f0' }}>
                        <Text strong style={{ fontSize: '15px' }}>{c.tipo}</Text>
                        <Text type="success" strong style={{ fontSize: '16px' }}>${Number(c.costo).toLocaleString()}</Text>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty description="No hay costos contables registrados en el periodo actual." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </Col>
          </Row>
        </div>
      )
    },
    {
      key: '2',
      label: 'Historial de Labores (Detalle)',
      children: (
        <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginTop: 24 }}>
          {/* Advanced Filter Bar */}
          <div style={{ marginBottom: 24, padding: 20, background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Filter style={{ color: '#1890ff', width: 20, height: 20 }} />
              <Text strong>Filtros de Búsqueda Avanzada</Text>
            </div>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8} lg={6}>
                <Input
                  placeholder="Buscar Empleado..."
                  value={filterEmpleado}
                  onChange={e => setFilterEmpleado(e.target.value)}
                  prefix={<Search style={{ color: '#bfbfbf', width: 16, height: 16 }} />}
                  allowClear
                />
              </Col>
              <Col xs={24} sm={8} lg={6}>
                <Select
                  style={{ width: '100%' }}
                  value={filterCargo}
                  onChange={setFilterCargo}
                  showSearch
                >
                  {uniqueCargos.map(c => (
                    <Option key={c} value={c}>{c}</Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={8} lg={8}>
                <RangePicker 
                  style={{ width: '100%' }}
                  onChange={dates => setDateRange(dates)}
                  format="YYYY-MM-DD"
                  allowClear
                />
              </Col>
              <Col xs={24} lg={4}>
                <Button type="primary" onClick={fetchData} block>
                  Actualizar Datos
                </Button>
              </Col>
            </Row>
          </div>

          {/* Scalable Data Table */}
          <Table 
            columns={columns} 
            dataSource={filteredLabores} 
            rowKey={(record, index) => `${record.fecha}-${index}`}
            loading={loading}
            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (total) => `Total: ${total} registros` }}
            scroll={{ x: 800 }}
          />
        </Card>
      )
    }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '32px' }}>👥</span> Dashboard RRHH y Maquinaria
        </Title>
        <Text type="secondary" style={{ fontSize: '16px' }}>
          Visión global de recursos humanos, costos operativos y reporte detallado de labores de campo.
        </Text>
      </div>

      <Tabs 
        defaultActiveKey="1" 
        items={items}
        type="card"
        size="large"
        tabBarStyle={{ marginBottom: 0 }}
      />
    </div>
  );
}
