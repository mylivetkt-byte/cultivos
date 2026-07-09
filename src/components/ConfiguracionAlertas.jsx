import React, { useState, useEffect } from 'react';
import { Form, Switch, Select, Input, Button, notification, Card, Typography, Row, Col, Space } from 'antd';
import { SaveOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { API_BASE } from '../utils/api';
import { authFetch } from '../utils/api';

const { Title, Text } = Typography;
const { Option } = Select;

export default function ConfiguracionAlertas({ tenantId }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tenantId) {
      fetchConfig();
    }
  }, [tenantId]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/configuracion/alertas?tenantId=${tenantId}`);
      const data = await res.json();
      
      // Default state for 'Traslados' if it doesn't exist yet
      const trasladosCfg = data.find(d => d.modulo === 'Traslados') || {
        requiere_pin: false,
        canal_notificacion: 'Ninguno',
        smtp_host: '',
        smtp_port: '',
        smtp_user: '',
        smtp_pass: '',
        whatsapp_key: ''
      };
      
      form.setFieldsValue(trasladosCfg);
    } catch (error) {
      notification.error({ message: 'Error cargando configuración' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values) => {
    if (!tenantId) return notification.error({ message: 'Seleccione un cliente' });
    setLoading(true);
    try {
      const payload = {
        tenantId,
        modulo: 'Traslados',
        ...values
      };
      
      const res = await authFetch(`${API_BASE}/configuracion/alertas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error();
      notification.success({ message: 'Configuración guardada correctamente' });
    } catch (error) {
      notification.error({ message: 'Error al guardar la configuración' });
    } finally {
      setLoading(false);
    }
  };

  if (!tenantId) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Por favor seleccione un Cliente.</div>;
  }

  return (
    <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '8px', minHeight: '80vh' }}>
      <Title level={3} style={{ color: '#1e293b' }}>⚙️ Configuración de Alertas y Seguridad</Title>
      <Text type="secondary">Parametriza los controles de trazabilidad, códigos PIN y envío de notificaciones.</Text>
      
      <Form 
        form={form} 
        layout="vertical" 
        onFinish={handleSave} 
        style={{ marginTop: 24 }}
        initialValues={{ canal_notificacion: 'Ninguno' }}
      >
        <Row gutter={24}>
          <Col span={12}>
            <Card title={<><SafetyCertificateOutlined /> Reglas de Negocio (Seguridad)</>} bordered={false}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h4 style={{ margin: 0 }}>Traslados entre Bodegas</h4>
                  <Text type="secondary" style={{ fontSize: 12 }}>Exigir Asignación de Transportador y validación por PIN en el destino.</Text>
                </div>
                <Form.Item name="requiere_pin" valuePropName="checked" style={{ margin: 0 }}>
                  <Switch checkedChildren="ON" unCheckedChildren="OFF" />
                </Form.Item>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, opacity: 0.5 }}>
                <div>
                  <h4 style={{ margin: 0 }}>Entregas a Cultivos / Lotes (Próximamente)</h4>
                  <Text type="secondary" style={{ fontSize: 12 }}>Exigir validación del Agrónomo.</Text>
                </div>
                <Switch disabled />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.5 }}>
                <div>
                  <h4 style={{ margin: 0 }}>Suministros a Maquinaria (Próximamente)</h4>
                  <Text type="secondary" style={{ fontSize: 12 }}>Exigir validación del Operador.</Text>
                </div>
                <Switch disabled />
              </div>
            </Card>
          </Col>

          <Col span={12}>
            <Card title={<><MailOutlined /> Proveedor de Mensajería (Gateways)</>} bordered={false}>
              <Form.Item name="canal_notificacion" label="Canal Principal de Envío">
                <Select>
                  <Option value="Ninguno">Ninguno (Solo alertas en el sistema)</Option>
                  <Option value="Email">Correo Electrónico (Email)</Option>
                  <Option value="WhatsApp">WhatsApp (API Externa)</Option>
                </Select>
              </Form.Item>

              <Form.Item 
                noStyle 
                shouldUpdate={(prev, curr) => prev.canal_notificacion !== curr.canal_notificacion}
              >
                {({ getFieldValue }) => {
                  const canal = getFieldValue('canal_notificacion');
                  if (canal === 'Email') {
                    return (
                      <div style={{ background: '#f1f5f9', padding: 16, borderRadius: 8 }}>
                        <h4 style={{ marginTop: 0 }}>Credenciales SMTP</h4>
                        <Form.Item name="smtp_host" label="Host SMTP"><Input placeholder="smtp.gmail.com" /></Form.Item>
                        <Row gutter={16}>
                          <Col span={8}>
                            <Form.Item name="smtp_port" label="Puerto"><Input placeholder="465" /></Form.Item>
                          </Col>
                          <Col span={16}>
                            <Form.Item name="smtp_user" label="Usuario"><Input placeholder="correo@empresa.com" /></Form.Item>
                          </Col>
                        </Row>
                        <Form.Item name="smtp_pass" label="Contraseña">
                          <Input.Password placeholder="Clave de aplicación" />
                        </Form.Item>
                      </div>
                    );
                  }
                  if (canal === 'WhatsApp') {
                    return (
                      <div style={{ background: '#e0f2f1', padding: 16, borderRadius: 8 }}>
                        <h4 style={{ marginTop: 0 }}>Credenciales API WhatsApp</h4>
                        <Form.Item name="whatsapp_key" label="API Key / Token">
                          <Input.Password placeholder="Ingrese su Token de Twilio o Meta" />
                        </Form.Item>
                      </div>
                    );
                  }
                  return null;
                }}
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} size="large">
            Guardar Parámetros Globales
          </Button>
        </div>
      </Form>
    </div>
  );
}
