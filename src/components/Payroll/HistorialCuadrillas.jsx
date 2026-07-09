import React, { useState, useEffect } from 'react';
import { Card, Table, Form, DatePicker, Select, Button, message, Tag, Row, Col, Typography } from 'antd';
import { Search } from 'lucide-react';
import { useGlobalSelectors } from '../../context/GlobalSelectorsContext';
import { authFetch } from '../../utils/api';
import moment from 'moment';

const { Option } = Select;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const HistorialCuadrillas = () => {
  const { tenantId, selectedFinca } = useGlobalSelectors();
  const [form] = Form.useForm();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cuadrillas, setCuadrillas] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [lotes, setLotes] = useState([]);

  useEffect(() => {
    fetchFincas();
    fetchCuadrillas();
    fetchLotes();
  }, [tenantId]);

  const fetchFincas = async () => {
    try {
      const res = await authFetch(`/api/table/fincas?tenantId=${tenantId || 1}`);
      if (res.ok) setFincas(await res.json());
    } catch (err) {}
  };

  const fetchCuadrillas = async () => {
    try {
      const res = await authFetch(`/api/rrhh-cuadrillas?tenantId=${tenantId || 1}`);
      if (res.ok) setCuadrillas(await res.json());
    } catch (err) {}
  };

  const fetchLotes = async () => {
    try {
      const res = await authFetch(`/api/table/lotes?tenantId=${tenantId || 1}`);
      if (res.ok) setLotes(await res.json());
    } catch (err) {}
  };

  const handleSearch = async (values) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tenantId: tenantId || 1 });
      
      if (values.rangoFechas && values.rangoFechas.length === 2) {
        params.append('fecha_inicio', values.rangoFechas[0].format('YYYY-MM-DD'));
        params.append('fecha_fin', values.rangoFechas[1].format('YYYY-MM-DD'));
      }
      if (values.id_finca) params.append('id_finca', values.id_finca);
      else if (selectedFinca !== 'Todas' && selectedFinca !== 'Ninguna') params.append('id_finca', selectedFinca);

      if (values.id_cuadrilla) params.append('id_cuadrilla', values.id_cuadrilla);
      if (values.id_lote) params.append('id_lote', values.id_lote);

      const res = await authFetch(`/api/rrhh-cuadrillas/historial?${params.toString()}`);
      if (res.ok) {
        setHistorial(await res.json());
      } else {
        message.error("Error al consultar el récord operativo");
      }
    } catch (err) {
      message.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'fecha_planificada',
      key: 'fecha_planificada',
      render: (val) => val ? val.split('T')[0] : ''
    },
    {
      title: 'Cuadrilla',
      dataIndex: 'cuadrilla_nombre',
      key: 'cuadrilla_nombre',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.cuadrilla_tipo}</Text>
        </div>
      )
    },
    {
      title: 'Ubicación',
      key: 'ubicacion',
      render: (_, record) => (
        <div>
          <div>{record.finca_nombre || 'Sin Finca'}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>Lote: {record.lote_nombre || 'N/A'}</Text>
        </div>
      )
    },
    {
      title: 'Trabajador',
      dataIndex: 'empleado_nombre',
      key: 'empleado_nombre',
    },
    {
      title: 'Labor',
      dataIndex: 'descripcion_labor',
      key: 'descripcion_labor',
      render: (text, record) => (
        <div>
          <div>{text}</div>
          <Tag>{record.categoria}</Tag>
        </div>
      )
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado) => (
        <Tag color={estado === 'Completada' ? 'success' : estado === 'Incumplida' ? 'error' : 'default'}>
          {estado}
        </Tag>
      )
    },
    {
      title: 'Horas',
      dataIndex: 'horas_trabajadas',
      key: 'horas_trabajadas',
      render: val => val ? `${val} h` : '-'
    },
    {
      title: 'Prod.',
      dataIndex: 'cantidad_producida',
      key: 'cantidad_producida',
      render: val => val || '-'
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: '24px' }}>Récord Operativo e Historial de Cuadrillas</Title>
      
      <Card style={{ marginBottom: '24px' }}>
        <Form form={form} layout="vertical" onFinish={handleSearch}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="rangoFechas" label="Rango de Fechas">
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={5}>
              <Form.Item name="id_finca" label="Finca">
                <Select placeholder="Todas las Fincas" allowClear>
                  {fincas.map(f => <Option key={f.id_finca} value={f.id_finca}>{f.nombre}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={5}>
              <Form.Item name="id_cuadrilla" label="Cuadrilla Específica">
                <Select placeholder="Todas" allowClear>
                  {cuadrillas.map(c => <Option key={c.id_cuadrilla} value={c.id_cuadrilla}>{c.nombre}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item name="id_lote" label="Lote / Potrero">
                <Select placeholder="Todos" allowClear showSearch optionFilterProp="children">
                  {lotes.map(l => <Option key={l.id_lote} value={l.id_lote}>{l.nombre}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={2} style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<Search size={16} />} block>
                  Buscar
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card>
        <Table 
          columns={columns} 
          dataSource={historial} 
          rowKey={(record, idx) => `hist_${idx}`} 
          loading={loading}
          pagination={{ pageSize: 15 }}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
};

export default HistorialCuadrillas;
