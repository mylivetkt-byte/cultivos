import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, Select, Alert, Tag, DatePicker, Button } from 'antd';
import { CheckSquareOutlined, SearchOutlined } from '@ant-design/icons';
import { authFetch } from '../../utils/api';

const { Title, Text } = Typography;
const { Option } = Select;

export default function TallerChecklists({ tenantId }) {
  const [checklists, setChecklists] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMaquina, setSelectedMaquina] = useState(null);
  const [dateRange, setDateRange] = useState([null, null]);

  useEffect(() => {
    if (tenantId) {
      loadMaquinas();
      loadChecklists();
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

  const loadChecklists = async () => {
    setLoading(true);
    try {
      let url = `/api/taller/checklists?tenantId=${tenantId}`;
      if (selectedMaquina) url += `&id_maquina=${selectedMaquina}`;
      if (dateRange && dateRange[0] && dateRange[1]) {
        url += `&startDate=${dateRange[0].format('YYYY-MM-DD')}&endDate=${dateRange[1].format('YYYY-MM-DD')}`;
      }
      const res = await authFetch(url);
      const data = await res.json();
      if(data.success) setChecklists(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <Card style={{ borderRadius: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}><CheckSquareOutlined /> Checklists Pre-operacionales</Title>
            <Text type="secondary">Inspecciones de maquinaria antes de la jornada</Text>
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
              <Button type="primary" icon={<SearchOutlined />} onClick={loadChecklists} loading={loading}>
                Consultar
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card style={{ borderRadius: 12 }}>
        {!selectedMaquina && <Alert message="Mostrando todos los checklists. Selecciona una máquina para ver sus revisiones." type="info" showIcon style={{marginBottom: 16}} />}
        <Table 
          dataSource={checklists}
          rowKey="id_checklist"
          loading={loading}
          columns={[
            { title: 'Fecha', dataIndex: 'fecha', render: f => new Date(f).toLocaleDateString() },
            { title: 'Máquina', render: (_, r) => `[${r.placa}] ${r.maquina_nombre}` },
            { title: 'Operario', render: (_, r) => `${r.operario_nombre} ${r.operario_apellido}` },
            { title: 'Presión Llantas', dataIndex: 'presion_llantas', render: v => <Tag color={v===1?'green':'orange'}>{v===1?'OK':'Revisar'}</Tag> },
            { title: 'Fugas Aceite', dataIndex: 'fugas_aceite', render: v => <Tag color={v===0?'green':'red'}>{v===0?'No':'Sí'}</Tag> },
            { title: 'Frenos', dataIndex: 'frenos', render: v => <Tag color={v===1?'green':'red'}>{v===1?'OK':'Revisar'}</Tag> },
            { title: 'Novedades', dataIndex: 'novedades' },
          ]}
        />
      </Card>
    </div>
  );
}
