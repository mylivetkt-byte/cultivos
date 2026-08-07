import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Card, Row, Col, Statistic, Table, Input, Select, 
  Button, DatePicker, Tag, Typography, Empty, Space 
} from 'antd';
import { 
  Search, Briefcase, Clock, DollarSign, Download, Settings2, FileText, Pickaxe, Tractor
} from 'lucide-react';
import moment from 'moment';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

export default function LaboresReport({ tenantId }) {
  const [labores, setLabores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState(null);

  useEffect(() => {
    const fetchLabores = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/rrhh/labores-historial?tenantId=${tenantId || 1}`);
        setLabores(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLabores();
  }, [tenantId]);

  // Aplicar filtros locales
  const filteredData = useMemo(() => {
    return labores.filter(item => {
      let matchesSearch = true;
      if (searchText) {
        const lowerSearch = searchText.toLowerCase();
        matchesSearch = 
          (item.empleado && item.empleado.toLowerCase().includes(lowerSearch)) ||
          (item.labor && item.labor.toLowerCase().includes(lowerSearch)) ||
          (item.lote && item.lote.toLowerCase().includes(lowerSearch));
      }

      let matchesDate = true;
      if (dateRange && dateRange[0] && dateRange[1]) {
        const itemDate = moment(item.fecha);
        matchesDate = itemDate.isBetween(dateRange[0], dateRange[1], 'day', '[]');
      }

      return matchesSearch && matchesDate;
    });
  }, [labores, searchText, dateRange]);

  // KPIs
  const totalLabores = filteredData.length;
  const totalHoras = filteredData.reduce((acc, curr) => acc + (Number(curr.horas) || 0), 0);
  const totalCosto = filteredData.reduce((acc, curr) => acc + (Number(curr.costo_estimado) || 0), 0);

  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      sorter: (a, b) => new Date(a.fecha) - new Date(b.fecha),
      render: (val) => val ? moment(val).format('YYYY-MM-DD') : '',
    },
    {
      title: 'Responsable',
      dataIndex: 'empleado',
      key: 'empleado',
      sorter: (a, b) => (a.empleado || '').localeCompare(b.empleado || ''),
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text || 'Sin asignar'}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.cargo || 'Sin cargo'}</Text>
        </div>
      )
    },
    {
      title: 'Actividad / Labor',
      dataIndex: 'labor',
      key: 'labor',
      render: (text) => (
        <Tag color="blue" icon={<Pickaxe size={12} style={{marginRight: 4}}/>} style={{ display: 'flex', alignItems: 'center', width: 'fit-content' }}>
          {text || 'N/A'}
        </Tag>
      )
    },
    {
      title: 'Lote / Área',
      dataIndex: 'lote',
      key: 'lote',
      render: (text) => text || 'Sin lote'
    },
    {
      title: 'Duración',
      dataIndex: 'horas',
      key: 'horas',
      align: 'right',
      sorter: (a, b) => (Number(a.horas) || 0) - (Number(b.horas) || 0),
      render: (val) => `${Number(val || 0)} hrs`
    },
    {
      title: 'Costo (COP)',
      dataIndex: 'costo_estimado',
      key: 'costo_estimado',
      align: 'right',
      sorter: (a, b) => (Number(a.costo_estimado) || 0) - (Number(b.costo_estimado) || 0),
      render: (val) => `$${Number(val || 0).toLocaleString()}`
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Tractor size={32} color="#16a34a" /> 
          Reporte de Labores y Jornales
        </Title>
        <Space>
          <Button icon={<Download size={16} />} type="primary" style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}>
            Exportar Excel
          </Button>
        </Space>
      </div>

      {/* Indicadores */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%' }}>
            <Statistic
              title={<span style={{ fontWeight: 500, color: '#6b7280' }}>Labores Registradas</span>}
              value={totalLabores}
              prefix={<FileText size={20} color="#4f46e5" style={{ marginRight: 8, background: '#e0e7ff', padding: 4, borderRadius: '50%' }}/>}
              valueStyle={{ fontSize: '28px', fontWeight: 600, color: '#1f2937' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%' }}>
            <Statistic
              title={<span style={{ fontWeight: 500, color: '#6b7280' }}>Horas Máquina / Hombre</span>}
              value={totalHoras}
              suffix="hrs"
              prefix={<Clock size={20} color="#16a34a" style={{ marginRight: 8, background: '#dcfce7', padding: 4, borderRadius: '50%' }}/>}
              valueStyle={{ fontSize: '28px', fontWeight: 600, color: '#1f2937' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%' }}>
            <Statistic
              title={<span style={{ fontWeight: 500, color: '#6b7280' }}>Costo Estimado</span>}
              value={totalCosto}
              prefix={<DollarSign size={20} color="#2563eb" style={{ marginRight: 8, background: '#dbeafe', padding: 4, borderRadius: '50%' }}/>}
              valueStyle={{ fontSize: '28px', fontWeight: 600, color: '#1f2937' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Buscador / Filtros */}
      <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px' }} bodyStyle={{ padding: '16px 24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <Input 
              placeholder="Buscar por empleado, labor o lote..." 
              prefix={<Search size={16} color="#9ca3af" />}
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              size="large"
              style={{ borderRadius: '8px' }}
            />
          </Col>
          <Col xs={24} md={8}>
            <RangePicker 
              style={{ width: '100%', borderRadius: '8px' }} 
              size="large"
              value={dateRange}
              onChange={(val) => setDateRange(val)}
              placeholder={['Fecha inicial', 'Fecha final']}
            />
          </Col>
        </Row>
      </Card>

      {/* Tabla de Resultados */}
      <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 0 }}>
        <Table 
          columns={columns} 
          dataSource={filteredData}
          rowKey={(record, index) => record.id_labor || index}
          loading={loading}
          pagination={{
            defaultPageSize: 15,
            showSizeChanger: true,
            pageSizeOptions: ['15', '30', '50', '100'],
            showTotal: (total) => `Total ${total} labores`
          }}
          locale={{ emptyText: <Empty description="No se encontraron labores" /> }}
          style={{ width: '100%' }}
        />
      </Card>

    </div>
  );
}
