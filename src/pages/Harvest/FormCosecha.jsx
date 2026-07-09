import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Select, DatePicker, Button, message, Spin } from 'antd';
import { fetchFKLookup, checkUniqueValue, insertRecord } from '../../utils/api';
import dayjs from 'dayjs';
import './Harvest.css';

const { Option } = Select;

export default function FormCosecha() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [parcels, setParcels] = useState([]);
  const [cultivos, setCultivos] = useState([]);

  // Load lookup data for parcelas and cultivos
  useEffect(() => {
    async function loadLookups() {
      try {
        const [p, c] = await Promise.all([
          fetchFKLookup('parcelas', 'id_parcela'),
          fetchFKLookup('cultivos', 'id_cultivo'),
        ]);
        setParcels(p);
        setCultivos(c);
      } catch (err) {
        message.error('Error cargando datos auxiliares');
      }
    }
    loadLookups();
  }, []);

  const validateCodigo = async (_, value) => {
    if (!value) return Promise.reject(new Error('Código es obligatorio'));
    const res = await checkUniqueValue('cosechas', 'codigoCosecha', value);
    if (res.isUnique) return Promise.resolve();
    return Promise.reject(new Error('Código ya existe'));
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        id_parcela: values.parcela,
        id_cultivo: values.cultivo,
        codigoCosecha: values.codigo,
        fecha_cosecha: values.fecha.format('YYYY-MM-DD'),
        peso_total_kg: parseFloat(values.peso),
      };
      await insertRecord('cosechas', payload);
      message.success('Cosecha registrada');
      navigate('/cosechas/dashboard');
    } catch (err) {
      message.error(err.message || 'Error al guardar cosecha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="harvest-form-container glass">
      <h2 className="title">Crear Nueva Cosecha</h2>
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="parcela" label="Parcela" rules={[{ required: true }]}>
            <Select placeholder="Selecciona parcela" showSearch optionFilterProp="label">
              {parcels.map(p => (
                <Option key={p.id_parcela} value={p.id_parcela}>{p.nombre}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="cultivo" label="Cultivo" rules={[{ required: true }]}>
            <Select placeholder="Selecciona cultivo" showSearch optionFilterProp="label">
              {cultivos.map(c => (
                <Option key={c.id_cultivo} value={c.id_cultivo}>{c.nombre}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="codigo" label="Código Cosecha" rules={[{ validator: validateCodigo }]}>
            <Input placeholder="Código único" />
          </Form.Item>
          <Form.Item name="fecha" label="Fecha de Cosecha" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} disabledDate={d => d && d.isAfter(dayjs())} />
          </Form.Item>
          <Form.Item name="peso" label="Peso Total (kg)" rules={[{ required: true, type: 'number', min: 0 }]}>
            <Input type="number" placeholder="Peso total en kg" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>Guardar Cosecha</Button>
          </Form.Item>
        </Form>
      </Spin>
    </div>
  );
}
