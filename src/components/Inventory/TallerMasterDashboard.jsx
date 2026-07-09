import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Typography, Select, Row, Col, Space, Tag, Tabs, Statistic, Alert } from 'antd';
import { ToolOutlined, DashboardOutlined, UserOutlined, ClockCircleOutlined, ThunderboltOutlined, CarOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

import { authFetch } from '../../utils/api';

export default function TallerMasterDashboard({ tenantId }) {
  const [maquinas, setMaquinas] = useState([]);
  const [ots, setOts] = useState([]);
  const [mecanicos, setMecanicos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [tenantId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const resMaq = await authFetch(`/api/taller/maquinas?tenantId=${tenantId}`);
      const dataMaq = await resMaq.json();
      if(dataMaq.success) setMaquinas(dataMaq.data);

      const resOts = await authFetch(`/api/taller/ordenes-trabajo?tenantId=${tenantId}`);
      const dataOts = await resOts.json();
      if(dataOts.success) setOts(dataOts.data);

      const resMec = await authFetch(`/api/taller/seguimiento-mecanicos?tenantId=${tenantId}`);
      const dataMec = await resMec.json();
      if(dataMec.success) setMecanicos(dataMec.data);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <Card style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0, color: '#001529' }}>
              <ToolOutlined /> Módulo Master de Taller y Mantenimiento
            </Title>
            <Text type="secondary">Control de Activos, Seguimiento de Labores y Órdenes de Trabajo</Text>
          </div>
        </div>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title="Total Activos Registrados" value={maquinas.length} prefix={<CarOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title="Activos Alquilados (Terceros)" value={maquinas.filter(m => m.es_alquilada).length} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title="Órdenes de Trabajo Abiertas" value={ots.filter(o => o.estado !== 'Completada').length} prefix={<ToolOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title="Costo Total Mantenimiento MTD" value={`$ ${ots.reduce((sum, o) => sum + parseFloat(o.costo_total||0), 0).toLocaleString()}`} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
      </Row>

      <Tabs 
        defaultActiveKey="1" 
        type="card"
        items={[
          {
            key: '1',
            label: <span><DashboardOutlined /> Catálogo 360° de Activos</span>,
            children: (
              <Card style={{ borderRadius: 12 }}>
                <Alert message="Vista general de toda la maquinaria pesada, vehículos, implementos y equipos menores." type="info" showIcon style={{marginBottom: 16}} />
                <Table 
                  dataSource={maquinas}
                  rowKey="id_maq_agro"
                  loading={loading}
                  columns={[
                    { title: 'Placa/ID', dataIndex: 'placa', render: t => <b>{t || 'N/A'}</b> },
                    { title: 'Tipo', dataIndex: 'tipo' },
                    { title: 'Marca / Modelo', dataIndex: 'marca_modelo' },
                    { title: 'Horómetro / Odómetro', dataIndex: 'horometro_actual', align: 'right', render: v => `${v} H` },
                    { title: 'Estado', dataIndex: 'estado_operativo', render: e => (
                      <Tag color={e === 'Operativo' ? 'green' : 'red'}>{e}</Tag>
                    )},
                    { title: 'Propiedad', dataIndex: 'es_alquilada', render: a => (
                      a ? <Tag color="orange">Alquilado</Tag> : <Tag color="blue">Propio</Tag>
                    )}
                  ]}
                />
              </Card>
            )
          },
          {
            key: '2',
            label: <span><UserOutlined /> Seguimiento Diario de Mecánicos</span>,
            children: (
              <Card style={{ borderRadius: 12 }}>
                <Alert message="Auditoría de rendimiento: Verifica cuántas horas de labor reales reportó cada mecánico y el costo asociado a su mano de obra." type="warning" showIcon style={{marginBottom: 16}} />
                <Table 
                  dataSource={mecanicos}
                  rowKey="id_empleado"
                  loading={loading}
                  columns={[
                    { title: 'Mecánico / Operario', render: (_, r) => <b>{r.nombres} {r.apellidos}</b> },
                    { title: 'OTs Atendidas', dataIndex: 'ots_atendidas', align: 'center', render: c => <Tag color="blue">{c} OTs</Tag> },
                    { title: 'Total Horas de Labor', dataIndex: 'total_horas_labor', align: 'right', render: v => <b>{parseFloat(v).toFixed(2)} Horas</b> },
                    { title: 'Costo Mano de Obra Generado', dataIndex: 'costo_total_mo', align: 'right', render: v => `$ ${parseFloat(v).toLocaleString()}` },
                    { title: 'Eficiencia Relativa', align: 'center', render: (_, r) => {
                      const efficiency = (r.total_horas_labor / 8) * 100;
                      let color = 'green';
                      if(efficiency > 100) color = 'red';
                      if(efficiency < 50) color = 'orange';
                      return <Tag color={color}>{efficiency.toFixed(0)}% del turno</Tag>
                    }}
                  ]}
                />
              </Card>
            )
          },
          {
            key: '3',
            label: <span><ToolOutlined /> Órdenes de Trabajo (OT)</span>,
            children: (
              <Card style={{ borderRadius: 12 }}>
                <Table 
                  dataSource={ots}
                  rowKey="id_orden_trabajo"
                  loading={loading}
                  columns={[
                    { title: 'OT #', dataIndex: 'numero_orden', render: n => <b>{n}</b> },
                    { title: 'Máquina', render: (_, r) => `[${r.placa}] ${r.maquina_nombre}` },
                    { title: 'Tipo', dataIndex: 'tipo_orden', render: t => (
                      <Tag color={t === 'Preventivo' ? 'blue' : 'volcano'}>{t}</Tag>
                    )},
                    { title: 'Mecánico Asignado', render: (_, r) => `${r.mecanico_nombre} ${r.mecanico_apellido}` },
                    { title: 'Horas Labor', dataIndex: 'horas_trabajadas', align: 'right', render: v => `${v} Hrs` },
                    { title: 'Costo Total', dataIndex: 'costo_total', align: 'right', render: v => <b>$ {parseFloat(v).toLocaleString()}</b> },
                    { title: 'Estado', dataIndex: 'estado', render: e => <Tag color="green">{e}</Tag> }
                  ]}
                />
              </Card>
            )
          }
        ]}
      />
    </div>
  );
}
