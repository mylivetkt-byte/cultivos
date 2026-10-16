import React, { useState } from 'react';
import { Card, Form, InputNumber, Button, Select, Typography, Alert, message, Divider } from 'antd';
import { ContainerOutlined, ArrowRightOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

export default function FormularioAlimentacionLagos() {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [success, setSuccess] = useState(null);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Simulación de llamada al backend que activa contabilizarAcuicultura(ALIMENTO)
      await new Promise(res => setTimeout(res, 1500));
      
      // Suponiendo que el concentrado cuesta $4500 el Kg
      const costoTotal = values.kilos * 4500;
      
      setSuccess({
        lago: values.lago,
        kilos: values.kilos,
        costo: costoTotal
      });
      message.success('Alimentación registrada. Activo Biológico incrementado.');
      form.resetFields();
    } catch (error) {
      message.error('Error al guardar la alimentación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 600, margin: '0 auto', color: '#fff' }}>
      <Title level={2} style={{ color: '#fff' }}><ContainerOutlined /> Alimentación de Lagos</Title>
      <Text type="secondary" style={{ color: '#aaa' }}>
        Este registro descargará el alimento del Kardex y trasladará su costo al Activo Biológico (Biomasa) del Lago seleccionado.
      </Text>
      
      <Divider style={{ borderColor: '#333' }} />

      {success && (
        <Alert
          message="¡Biomasa Valorizada!"
          description={`Se descargaron ${success.kilos} Kg de concentrado. El Lago ${success.lago} acaba de incrementar su valor como Activo Biológico en $${success.costo.toLocaleString()} COP.`}
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginBottom: 24, background: '#135200', borderColor: '#237804', color: '#fff' }}
        />
      )}

      <Card style={{ background: '#141414', borderColor: '#303030' }} className="dark-theme-form">
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="lago" label={<span style={{ color: '#fff' }}>Lago / Estanque</span>} rules={[{ required: true }]}>
            <Select placeholder="Seleccione el lago a alimentar">
              <Option value="LAGO_01">Lago 01 (Tilapia Roja)</Option>
              <Option value="LAGO_02">Lago 02 (Cachama)</Option>
              <Option value="LAGO_03">Lago 03 (Trucha)</Option>
            </Select>
          </Form.Item>

          <Form.Item name="insumo" label={<span style={{ color: '#fff' }}>Alimento Concentrado</span>} rules={[{ required: true }]}>
            <Select placeholder="Seleccione el bulto de alimento">
              <Option value="mojarra_45">Concentrado Mojarra 45% Proteína</Option>
              <Option value="cachama_30">Concentrado Cachama 30% Proteína</Option>
            </Select>
          </Form.Item>

          <Form.Item name="kilos" label={<span style={{ color: '#fff' }}>Cantidad Suministrada (Kg)</span>} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} size="large" placeholder="Kilos de alimento lanzados al lago" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} size="large" block icon={<ArrowRightOutlined />}>
              Registrar Alimentación (Afectar Partida Doble)
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
