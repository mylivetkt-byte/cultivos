import React, { useState } from 'react';
import { Card, Form, InputNumber, Button, Select, Typography, Alert, message, Divider, Modal } from 'antd';
import { ContainerOutlined, ArrowRightOutlined, CheckCircleOutlined, BookOutlined, SoundOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import AyudaCampesina from '../Common/AyudaCampesina';
import AsistenteAcuicolaCampesino from './AsistenteAcuicolaCampesino';
import { hablarEnVozCampesina } from '../../utils/glosarioCampesino';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export default function FormularioAlimentacionLagos() {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [success, setSuccess] = useState(null);
  const [showEscuelaAcuicola, setShowEscuelaAcuicola] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Simulación de llamada al backend que activa contabilizarAcuicultura(ALIMENTO)
      await new Promise(res => setTimeout(res, 1200));
      
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
    <div style={{ padding: '24px', maxWidth: 840, margin: '0 auto', color: '#fff' }}>
      {/* CABECERA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <Title level={2} style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ContainerOutlined style={{ color: '#38bdf8' }} /> Alimentación de Lagos y Estanques
          </Title>
          <Text type="secondary" style={{ color: '#94a3b8' }}>
            Control diario de ración, valorización de biomasa y buenas prácticas piscícolas.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<BookOutlined />}
          onClick={() => setShowEscuelaAcuicola(true)}
          style={{
            background: '#0284c7',
            borderColor: '#38bdf8',
            fontWeight: 'bold',
            height: '40px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
          }}
        >
          🐟 Escuela Piscícola (Secchi, Aclimatación, Ración)
        </Button>
      </div>

      {/* BANNER REGLA DE ORO CAMPESINA DE ALIMENTACIÓN */}
      <div style={{
        background: 'linear-gradient(135deg, #0c4a6e 0%, #082f49 100%)',
        border: '1px solid #0284c7',
        borderRadius: '12px',
        padding: '16px 20px',
        color: '#e0f2fe',
        marginBottom: '20px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '15px', color: '#7dd3fc' }}>
            <span style={{ fontSize: '22px' }}>🥣</span>
            <span>Regla de Oro de los 15 Minutos en Alimentación</span>
          </div>
          <Button
            size="small"
            icon={<SoundOutlined />}
            style={{ background: '#0284c7', borderColor: '#38bdf8', color: '#fff', fontWeight: 'bold' }}
            onClick={() => hablarEnVozCampesina(
              "Recuerde la regla de los quince minutos. Tire el concentrado despacio y silbe para llamar los peces. Si a los quince minutos todavía ve comida flotando en el agua, rebaje la ración de inmediato. El alimento sobrante se hunde al fondo, se pudre y se come el oxígeno del estanque."
            )}
          >
            🔊 Escuchar Guía
          </Button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', fontSize: '13px' }}>
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '8px' }}>
            <b>1. Horas Frescas:</b> Alimente entre 8:00-9:00 AM y 4:00-5:00 PM cuando el agua está tibia y los peces tienen apetito.
          </div>
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '8px' }}>
            <b>2. Comportamiento Voraz:</b> Si los peces no suben con fuerza a comer, revise el oxígeno antes de seguir tirando bultos.
          </div>
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '8px' }}>
            <b>3. Cero Desperdicio:</b> El concentrado en el fondo genera amonio tóxico. Es preferible que queden con apetito a que sobre alimento.
          </div>
        </div>
      </div>
      
      <Divider style={{ borderColor: '#333' }} />

      {success && (
        <Alert
          message="¡Biomasa Valorizada con Éxito!"
          description={`Se descargaron ${success.kilos} Kg de concentrado. El Lago ${success.lago} acaba de incrementar su valor como Activo Biológico en $${success.costo.toLocaleString()} COP en contabilidad.`}
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginBottom: 24, background: '#135200', borderColor: '#237804', color: '#fff' }}
        />
      )}

      <Card style={{ background: '#141414', borderColor: '#303030' }} className="dark-theme-form">
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item 
            name="lago" 
            label={
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span style={{ color: '#fff' }}>Lago o Estanque</span>
                <AyudaCampesina campoKey="id_lote" />
              </div>
            } 
            rules={[{ required: true, message: 'Seleccione el lago a alimentar' }]}
          >
            <Select placeholder="Seleccione el lago a alimentar" size="large">
              <Option value="LAGO_01">Lago 01 (Tilapia Roja - Levante)</Option>
              <Option value="LAGO_02">Lago 02 (Cachama Blanca - Engorde)</Option>
              <Option value="LAGO_03">Lago 03 (Trucha Arcoíris - Engorde)</Option>
              <Option value="ESTANQUE_04">Estanque 04 (Alevinaje Tilapia)</Option>
            </Select>
          </Form.Item>

          <Form.Item 
            name="insumo" 
            label={
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span style={{ color: '#fff' }}>Alimento Concentrado y Proteína</span>
                <AyudaCampesina campoKey="tasa_alimentacion" />
              </div>
            } 
            rules={[{ required: true, message: 'Seleccione el tipo de concentrado' }]}
          >
            <Select placeholder="Seleccione el bulto de alimento" size="large">
              <Option value="mojarra_45">Concentrado Alevinaje 45% Proteína (Micro-pellet)</Option>
              <Option value="mojarra_38">Concentrado Levante 38% Proteína (Pellet 2.5 mm)</Option>
              <Option value="mojarra_32">Concentrado Engorde 32% Proteína (Pellet 4.0 mm)</Option>
              <Option value="cachama_30">Concentrado Cachama 30% Proteína (Extruido flotante)</Option>
            </Select>
          </Form.Item>

          <Form.Item 
            name="kilos" 
            label={
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span style={{ color: '#fff' }}>Cantidad Suministrada en esta Tanda (Kg)</span>
                <AyudaCampesina campoKey="peso_neto" />
              </div>
            } 
            rules={[{ required: true, message: 'Ingrese los kilos lanzados al estanque' }]}
          >
            <InputNumber min={0.5} step={0.5} style={{ width: '100%' }} size="large" placeholder="Ej: 25 kilos" />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              size="large" 
              block 
              icon={<ArrowRightOutlined />}
              style={{
                height: '48px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: '#0284c7',
                borderColor: '#38bdf8'
              }}
            >
              💾 Registrar Alimentación (Afectar Kardex y Biomasa)
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* MODAL ESCUELA ACUÍCOLA */}
      <Modal
        open={showEscuelaAcuicola}
        onCancel={() => setShowEscuelaAcuicola(false)}
        footer={null}
        width={1040}
        destroyOnClose
        styles={{ body: { padding: '8px', background: '#0b1120' } }}
      >
        <AsistenteAcuicolaCampesino 
          onClose={() => setShowEscuelaAcuicola(false)} 
        />
      </Modal>
    </div>
  );
}
