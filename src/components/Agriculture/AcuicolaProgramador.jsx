import React, { useState, useEffect } from 'react';
import { Table, Tabs, Button, Card, Tag, Typography, message, Row, Col, Statistic, Space, Modal, Form, Input, DatePicker, Select } from 'antd';
import { DatabaseOutlined, CalendarOutlined, LineChartOutlined, DashboardOutlined, AppstoreAddOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { fetchApi } from '../../utils/api';

const { TabPane } = Tabs;
const { Title, Text } = Typography;

export default function AcuicolaProgramador({ tenantId }) {
  const [alevinos, setAlevinos] = useState([]);
  const [programacion, setProgramacion] = useState([]);
  const [siembras, setSiembras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resAl, resProg, resSiembras] = await Promise.all([
        fetchApi('/acuicola_programador/alevinos').catch(() => ({ data: [] })),
        fetchApi('/acuicola_programador/programacion').catch(() => ({ data: [] })),
        fetchApi('/acuicola_programador/siembras').catch(() => ({ data: [] }))
      ]);
      setAlevinos(resAl.data || []);
      setProgramacion(resProg.data || []);
      setSiembras(resSiembras.data || []);
    } catch (err) {
      console.error(err);
      message.error("Error cargando los datos.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProgramacion = async (values) => {
    try {
      await fetchApi('/acuicola_programador/programacion', {
        method: 'POST',
        body: JSON.stringify(values)
      });
      message.success('Actividad programada correctamente.');
      setIsModalVisible(false);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error('Error al guardar.');
    }
  };

  const alevinosCols = [
    { title: 'Lote #', dataIndex: 'id_lote_alev', width: 80, render: id => <Tag color="geekblue">#{id}</Tag> },
    { title: 'Especie', dataIndex: 'especie_nombre', render: t => <strong>{t}</strong> },
    { title: 'Recepción', dataIndex: 'fecha_recepcion', render: d => new Date(d).toISOString().split('T')[0] },
    { title: 'Proveedor', dataIndex: 'proveedor' },
    { title: 'Disp / Recib.', render: (_, r) => <Tag color="blue">{r.cantidad_disponible} / {r.cantidad_recibida}</Tag> },
    { title: 'Peso (g)', dataIndex: 'peso_promedio_g', render: p => `${p}g` }
  ];

  const siembrasCols = [
    { title: 'Siembra #', dataIndex: 'id_siembra_acui', width: 100, render: id => <b>#{id}</b> },
    { title: 'Finca', dataIndex: 'finca_nombre' },
    { title: 'Lago / Estanque', dataIndex: 'estanque_codigo', render: t => <Tag color="cyan">{t}</Tag> },
    { title: 'Especie', dataIndex: 'especie_nombre', render: t => <strong>{t}</strong> },
    { title: 'Fecha Siembra', dataIndex: 'fecha_siembra', render: d => new Date(d).toISOString().split('T')[0] },
    { title: 'Días Cultivo', dataIndex: 'dias_cultivo', render: d => <Tag color={d > 150 ? 'red' : d > 90 ? 'orange' : 'green'}>{d} días</Tag> },
    { title: 'Cant. Peces', dataIndex: 'cantidad_alevines', render: c => <span><DashboardOutlined/> {c.toLocaleString()}</span> },
    { title: 'Estado', dataIndex: 'estado', render: e => <Tag color={e === 'Activo' ? 'green' : 'default'}>{e}</Tag> }
  ];

  const progCols = [
    { title: 'Reg #', dataIndex: 'id_programacion', width: 80, render: id => <b>#{id}</b> },
    { title: 'Lago', dataIndex: 'estanque_codigo' },
    { title: 'Actividad', dataIndex: 'tipo_actividad', render: act => <Tag color="purple">{act}</Tag> },
    { title: 'Fecha', dataIndex: 'fecha_programada', render: d => new Date(d).toISOString().split('T')[0] },
    { title: 'Estado', dataIndex: 'estado', render: e => <Tag color={e === 'Programado' ? 'orange' : 'green'}>{e}</Tag> },
    { title: 'Notas', dataIndex: 'notas' }
  ];

  // Estilos "Glassmorphism" Premium
  const glassCardStyle = {
    background: 'rgba(25, 33, 50, 0.65)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    color: '#fff',
    overflow: 'hidden'
  };

  const metricCardStyle = {
    ...glassCardStyle,
    background: 'linear-gradient(135deg, rgba(30,58,138,0.8) 0%, rgba(17,24,39,0.9) 100%)',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };

  const totalPecesActivos = siembras.filter(s => s.estado === 'Activo').reduce((acc, curr) => acc + curr.cantidad_alevines, 0);

  return (
    <div style={{ padding: '24px', background: 'radial-gradient(circle at top left, #0f172a, #020617)', minHeight: '100vh', color: '#e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <Title level={2} style={{ color: '#fff', margin: 0, fontWeight: 700, letterSpacing: '-0.5px' }}>
            <DashboardOutlined style={{ color: '#38bdf8', marginRight: '12px' }} />
            Intelligence Center: Acuícola
          </Title>
          <Text style={{ color: '#94a3b8', fontSize: '15px' }}>Control integral de Semilla, Engorde y Cosechas</Text>
        </div>
        <Button type="primary" size="large" icon={<AppstoreAddOutlined />} style={{ borderRadius: '8px', background: '#0ea5e9', border: 'none', boxShadow: '0 4px 14px rgba(14, 165, 233, 0.4)' }} onClick={() => setIsModalVisible(true)}>
          Nueva Programación
        </Button>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
        <Col span={8}>
          <div style={metricCardStyle}>
            <div>
              <Text style={{ color: '#93c5fd', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Semilla Disponible</Text>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#fff', marginTop: '8px' }}>
                {alevinos.reduce((a,b)=>a+b.cantidad_disponible,0).toLocaleString()}
              </div>
            </div>
            <DatabaseOutlined style={{ fontSize: '48px', color: 'rgba(56, 189, 248, 0.3)' }} />
          </div>
        </Col>
        <Col span={8}>
          <div style={{...metricCardStyle, background: 'linear-gradient(135deg, rgba(6,78,59,0.8) 0%, rgba(17,24,39,0.9) 100%)'}}>
            <div>
              <Text style={{ color: '#6ee7b7', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Peces Vivos (Engorde)</Text>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#fff', marginTop: '8px' }}>
                {totalPecesActivos.toLocaleString()}
              </div>
            </div>
            <LineChartOutlined style={{ fontSize: '48px', color: 'rgba(52, 211, 153, 0.3)' }} />
          </div>
        </Col>
        <Col span={8}>
          <div style={{...metricCardStyle, background: 'linear-gradient(135deg, rgba(124,58,237,0.8) 0%, rgba(17,24,39,0.9) 100%)'}}>
            <div>
              <Text style={{ color: '#c4b5fd', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Actividades Pendientes</Text>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#fff', marginTop: '8px' }}>
                {programacion.filter(p => p.estado === 'Programado').length}
              </div>
            </div>
            <CalendarOutlined style={{ fontSize: '48px', color: 'rgba(167, 139, 250, 0.3)' }} />
          </div>
        </Col>
      </Row>

      <Card style={{ ...glassCardStyle, padding: '8px' }} bodyStyle={{ padding: 0 }} bordered={false}>
        <Tabs defaultActiveKey="2" centered tabBarStyle={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
          <TabPane tab={<span style={{ fontSize: '15px' }}><DatabaseOutlined /> 1. Banco de Semillas (Alevinos)</span>} key="1">
            <div style={{ padding: '24px' }}>
              <Table dataSource={alevinos} columns={alevinosCols} rowKey="id_lote_alev" loading={loading} pagination={{ pageSize: 5 }} 
                rowClassName={() => 'dark-table-row'}
              />
            </div>
          </TabPane>
          <TabPane tab={<span style={{ fontSize: '15px' }}><LineChartOutlined /> 2. Lotes en Engorde (Por Lago)</span>} key="2">
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px', color: '#cbd5e1' }}>Vista general de lagos activos, con cálculo de edades y peso estimado.</div>
              <Table dataSource={siembras} columns={siembrasCols} rowKey="id_siembra_acui" loading={loading} pagination={{ pageSize: 10 }}
                rowClassName={() => 'dark-table-row'}
              />
            </div>
          </TabPane>
          <TabPane tab={<span style={{ fontSize: '15px' }}><CalendarOutlined /> 3. Programador y Calendario</span>} key="3">
            <div style={{ padding: '24px' }}>
              <Table dataSource={programacion} columns={progCols} rowKey="id_programacion" loading={loading} pagination={{ pageSize: 10 }}
                rowClassName={() => 'dark-table-row'}
              />
            </div>
          </TabPane>
        </Tabs>
      </Card>

      <Modal title="Programar Actividad" open={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreateProgramacion}>
          <Form.Item name="id_estanque" label="Estanque / Lago ID" rules={[{ required: true }]}>
             <Input type="number" placeholder="Ej: 23" />
          </Form.Item>
          <Form.Item name="tipo_actividad" label="Actividad" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="Revision Calidad Agua">Revisión Calidad de Agua</Select.Option>
              <Select.Option value="Mantenimiento/Secado">Mantenimiento/Secado</Select.Option>
              <Select.Option value="Muestreo">Muestreo de Talla/Peso</Select.Option>
              <Select.Option value="Cosecha">Cosecha</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="fecha_programada" label="Fecha" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notas" label="Notas">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block style={{ background: '#0ea5e9', borderColor: '#0ea5e9' }}>
            Guardar
          </Button>
        </Form>
      </Modal>

      <style>{`
        .dark-table-row {
          background: transparent !important;
          color: #f1f5f9;
        }
        .ant-table { background: transparent !important; color: #f1f5f9 !important; }
        .ant-table-thead > tr > th { background: rgba(0,0,0,0.3) !important; color: #38bdf8 !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; }
        .ant-table-tbody > tr > td { border-bottom: 1px solid rgba(255,255,255,0.05) !important; }
        .ant-table-tbody > tr:hover > td { background: rgba(56,189,248,0.1) !important; }
        .ant-tabs-tab { color: #94a3b8 !important; }
        .ant-tabs-tab-active .ant-tabs-tab-btn { color: #38bdf8 !important; font-weight: bold; }
        .ant-tabs-ink-bar { background: #38bdf8 !important; }
        .ant-pagination-item a { color: #cbd5e1 !important; }
        .ant-pagination-item-active { background: #38bdf8 !important; border-color: #38bdf8 !important; }
        .ant-pagination-item-active a { color: #fff !important; }
      `}</style>
    </div>
  );
}
