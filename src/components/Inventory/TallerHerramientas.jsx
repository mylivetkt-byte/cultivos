import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, Button, Modal, Form, Input, Select, Tag, Popconfirm, message } from 'antd';
import { ToolOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { authFetch } from '../../utils/api';

const { Title, Text } = Typography;
const { Option } = Select;

export default function TallerHerramientas({ tenantId }) {
  const [herramientas, setHerramientas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (tenantId) {
      loadHerramientas();
      loadEmpleados();
    }
  }, [tenantId]);

  const loadHerramientas = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/taller/herramientas?tenantId=${tenantId}`);
      const data = await res.json();
      if(data.success) setHerramientas(data.data);
    } catch (e) {
      message.error("Error al cargar herramientas");
    } finally {
      setLoading(false);
    }
  };

  const loadEmpleados = async () => {
    try {
      const res = await authFetch(`/api/rrhh/empleados?tenantId=${tenantId}`);
      const data = await res.json();
      if (Array.isArray(data)) setEmpleados(data);
      else if(data.success) setEmpleados(data.data);
    } catch (e) {}
  };

  const showModal = (record) => {
    setEditingId(record ? record.id_herramienta : null);
    if (record) {
      form.setFieldsValue(record);
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      values.id_tenant = tenantId;
      
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId 
        ? `/api/taller/herramientas/${editingId}`
        : `/api/taller/herramientas`;

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      const data = await res.json();
      if (data.success) {
        message.success(`Herramienta ${editingId ? 'actualizada' : 'creada'}`);
        setIsModalVisible(false);
        loadHerramientas();
      } else {
        message.error("Error al guardar herramienta");
      }
    } catch (e) {}
  };

  const handleDelete = async (id) => {
    try {
      const res = await authFetch(`/api/taller/herramientas/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        message.success("Herramienta eliminada");
        loadHerramientas();
      } else {
        message.error("Error al eliminar");
      }
    } catch (e) {}
  };

  const getEstadoColor = (estado) => {
    switch(estado) {
      case 'Buena': return 'green';
      case 'Regular': return 'orange';
      case 'Mala': return 'red';
      case 'Dada de Baja': return 'default';
      default: return 'blue';
    }
  };

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <Card style={{ borderRadius: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}><ToolOutlined /> Inventario de Herramientas</Title>
            <Text type="secondary">Control, asignación y estado de herramientas del taller</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal(null)}>
            Nueva Herramienta
          </Button>
        </div>
      </Card>

      <Card style={{ borderRadius: 12 }}>
        <Table 
          dataSource={herramientas}
          rowKey="id_herramienta"
          loading={loading}
          columns={[
            { title: 'Código', dataIndex: 'codigo' },
            { title: 'Nombre', dataIndex: 'nombre', render: n => <b>{n}</b> },
            { title: 'Marca', dataIndex: 'marca' },
            { title: 'Estado', dataIndex: 'estado', render: e => <Tag color={getEstadoColor(e)}>{e}</Tag> },
            { title: 'Asignado a', render: (_, r) => r.mecanico_nombre ? `${r.mecanico_nombre} ${r.mecanico_apellido}` : <Text type="secondary">Sin asignar</Text> },
            { title: 'Costo', dataIndex: 'costo', align: 'right', render: v => `$ ${parseFloat(v||0).toLocaleString()}` },
            { title: 'Acciones', render: (_, r) => (
              <div style={{display:'flex', gap:'8px'}}>
                <Button size="small" icon={<EditOutlined />} onClick={() => showModal(r)} />
                <Popconfirm title="¿Eliminar esta herramienta?" onConfirm={() => handleDelete(r.id_herramienta)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
            )}
          ]}
        />
      </Card>

      <Modal
        title={editingId ? "Editar Herramienta" : "Nueva Herramienta"}
        visible={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="codigo" label="Código"><Input /></Form.Item>
          <Form.Item name="nombre" label="Nombre" rules={[{required: true}]}><Input /></Form.Item>
          <Form.Item name="marca" label="Marca"><Input /></Form.Item>
          <Form.Item name="costo" label="Costo"><Input type="number" /></Form.Item>
          <Form.Item name="estado" label="Estado" initialValue="Buena">
            <Select>
              <Option value="Buena">Buena</Option>
              <Option value="Regular">Regular</Option>
              <Option value="Mala">Mala</Option>
              <Option value="Dada de Baja">Dada de Baja</Option>
            </Select>
          </Form.Item>
          <Form.Item name="id_mecanico_asignado" label="Asignar a Mecánico">
            <Select allowClear showSearch filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
              {empleados.map(e => (
                <Option key={e.id_empleado} value={e.id_empleado}>{e.nombres} {e.apellidos}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="observaciones" label="Observaciones"><Input.TextArea /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
