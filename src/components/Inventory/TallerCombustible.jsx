import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, Select, Alert, Statistic, Row, Col, DatePicker, Button } from 'antd';
import { ThunderboltOutlined, SearchOutlined } from '@ant-design/icons';
import { authFetch } from '../../utils/api';

const { Title, Text } = Typography;
const { Option } = Select;

export default function TallerCombustible({ tenantId }) {
  const [historial, setHistorial] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMaquina, setSelectedMaquina] = useState(null);
  const [dateRange, setDateRange] = useState([null, null]);

  useEffect(() => {
    if (tenantId) {
      loadMaquinas();
      loadHistorial();
    }
  }, [tenantId]); // removed selectedMaquina and dateRange so it doesn't auto-fetch

  const loadMaquinas = async () => {
    try {
      const res = await authFetch(`/api/taller/maquinas?tenantId=${tenantId}`);
      const data = await res.json();
      if(data.success) setMaquinas(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadHistorial = async () => {
    setLoading(true);
    try {
      let url = `/api/taller/combustible?tenantId=${tenantId}`;
      if (selectedMaquina) url += `&id_maquina=${selectedMaquina}`;
      if (dateRange && dateRange[0] && dateRange[1]) {
        url += `&startDate=${dateRange[0].format('YYYY-MM-DD')}&endDate=${dateRange[1].format('YYYY-MM-DD')}`;
      }
      const res = await authFetch(url);
      const data = await res.json();
      if(data.success) setHistorial(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalGalones = historial.reduce((sum, h) => sum + parseFloat(h.galones || 0), 0);
  const costoTotal = historial.reduce((sum, h) => sum + parseFloat(h.costo_total || 0), 0);

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <Card style={{ borderRadius: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}><ThunderboltOutlined /> Suministro de Combustible</Title>
            <Text type="secondary">Control de galonaje y tanqueo de maquinaria</Text>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <Text strong style={{ marginRight: 8 }}>Rango: </Text>
              <DatePicker.RangePicker 
                value={dateRange[0] ? dateRange : null}
                onChange={(dates) => setDateRange(dates || [null, null])} 
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text strong>Máquina: </Text>
              <Select
                allowClear
                showSearch
                placeholder="Todas las máquinas"
                style={{ width: 250 }}
                value={selectedMaquina}
                onChange={setSelectedMaquina}
                filterOption={(input, option) => {
                  const text = String(option?.children?.join ? option.children.join('') : option?.children || '');
                  return text.toLowerCase().includes(input.toLowerCase());
                }}
              >
                {maquinas.map(m => (
                  <Option key={m.id_maq_agro} value={m.id_maq_agro}>{`[${m.placa || 'S/P'}] ${m.marca_modelo}`}</Option>
                ))}
              </Select>
              <Button type="primary" icon={<SearchOutlined />} onClick={loadHistorial} loading={loading}>
                Consultar
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title="Total Galones Suministrados" value={totalGalones.toFixed(2)} suffix="Galones" />
          </Card>
        </Col>
        <Col span={12}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic title="Costo Total" value={costoTotal} prefix="$" precision={2} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: 12 }}>
        {!selectedMaquina && <Alert message="Mostrando todo el historial de tanqueo. Selecciona una máquina para ver su consumo específico." type="info" showIcon style={{marginBottom: 16}} />}
        <Table 
          dataSource={historial}
          rowKey="id_tanqueo"
          loading={loading}
          columns={[
            { title: 'Fecha', dataIndex: 'fecha', render: f => new Date(f).toLocaleDateString() },
            { title: 'Máquina / Vehículo', render: (_, r) => `[${r.placa || 'S/P'}] ${r.maquina_nombre}` },
            { title: 'Operario', render: (_, r) => `${r.operario_nombre} ${r.operario_apellido}` },
            { title: 'Galones', dataIndex: 'galones', align: 'right', render: v => <b>{parseFloat(v).toFixed(2)}</b> },
            { title: 'Costo', dataIndex: 'costo_total', align: 'right', render: v => `$ ${parseFloat(v||0).toLocaleString()}` },
            { title: 'Horómetro al Tanqueo', dataIndex: 'horometro_tanqueo', align: 'right' }
          ]}
          summary={() => (
            <Table.Summary.Row style={{ background: '#fafafa' }}>
              <Table.Summary.Cell index={0} colSpan={3} align="right">
                <Text strong>Total Consulta:</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Text strong>{totalGalones.toFixed(2)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <Text strong type="danger">$ {costoTotal.toLocaleString()}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} />
            </Table.Summary.Row>
          )}
        />
      </Card>
    </div>
  );
}
