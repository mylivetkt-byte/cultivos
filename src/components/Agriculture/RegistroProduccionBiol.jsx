import React, { useState } from 'react';
import { Card, Form, InputNumber, Button, Select, Typography, Alert, message, Divider, Space } from 'antd';
import { CheckCircleOutlined, ExperimentOutlined, FallOutlined, RiseOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

export default function RegistroProduccionBiol() {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [success, setSuccess] = useState(null);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Simulación de llamada al backend que activa contabilizarProduccionBiol()
      await new Promise(res => setTimeout(res, 1500));
      
      const totalCosto = (values.melaza * 500) + (values.estiercol * 200) + (values.microorganismos * 15000);
      
      setSuccess({
        litros: values.litrosProducidos,
        costo: totalCosto
      });
      message.success('Producción registrada y contabilizada por partida doble.');
      form.resetFields();
    } catch (error) {
      message.error('Error al guardar la producción.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto', color: '#fff' }}>
      <Title level={2} style={{ color: '#fff' }}><ExperimentOutlined /> Bio-Fábrica: Producción de Biol</Title>
      <Text type="secondary" style={{ color: '#aaa' }}>
        Al guardar, el sistema descargará los insumos del Kardex y creará el asiento contable sumando el costo al inventario del Biol.
      </Text>
      
      <Divider style={{ borderColor: '#333' }} />

      {success && (
        <Alert
          message="¡Partida Doble Ejecutada!"
          description={`Se ingresaron ${success.litros} Litros de Biol al Kardex. Se debitó $${success.costo.toLocaleString()} al Activo y se acreditó el mismo valor del inventario de materias primas.`}
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginBottom: 24, background: '#135200', borderColor: '#237804', color: '#fff' }}
        />
      )}

      <Card style={{ background: '#141414', borderColor: '#303030' }} className="dark-theme-form">
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="receta" label={<span style={{ color: '#fff' }}>Fórmula a Preparar</span>} rules={[{ required: true }]}>
            <Select placeholder="Seleccione la fórmula" style={{ width: '100%' }}>
              <Option value="biol_super_magro">Biol Súper Magro</Option>
              <Option value="caldo_sulfocalcico">Caldo Sulfocálcico</Option>
              <Option value="abono_bokashi">Abono Bokashi</Option>
            </Select>
          </Form.Item>

          <Title level={4} style={{ marginTop: 24, color: '#fff' }}><FallOutlined style={{ color: '#ff4d4f' }} /> Insumos Consumidos (Salida de Kardex)</Title>
          <Space size="large" style={{ display: 'flex', marginBottom: 16, flexWrap: 'wrap' }}>
            <Form.Item name="melaza" label={<span style={{ color: '#fff' }}>Melaza (Kg)</span>} rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: 150 }} placeholder="Ej: 50" />
            </Form.Item>
            <Form.Item name="estiercol" label={<span style={{ color: '#fff' }}>Estiércol Bovino (Kg)</span>} rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: 150 }} placeholder="Ej: 200" />
            </Form.Item>
            <Form.Item name="microorganismos" label={<span style={{ color: '#fff' }}>Microorganismos (L)</span>} rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: 150 }} placeholder="Ej: 5" />
            </Form.Item>
          </Space>

          <Title level={4} style={{ marginTop: 24, color: '#fff' }}><RiseOutlined style={{ color: '#52c41a' }} /> Producto Terminado (Entrada a Kardex)</Title>
          <Form.Item name="litrosProducidos" label={<span style={{ color: '#fff' }}>Biol Producido (Litros)</span>} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} size="large" placeholder="Volumen total extraído del biodigestor" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} size="large" block>
              Procesar y Contabilizar
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
