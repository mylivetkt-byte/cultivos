import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Modal, Form, Input, Select, message, Tag, Space } from 'antd';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useGlobalSelectors } from '../../context/GlobalSelectorsContext';
import { authFetch } from '../../utils/api';

const { Option } = Select;

const CatalogoCuadrillas = () => {
  const { tenantId, selectedFinca } = useGlobalSelectors();
  const [cuadrillas, setCuadrillas] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);

  const fetchCuadrillas = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/rrhh-cuadrillas?tenantId=${tenantId || 1}`);
      if (res.ok) {
        const data = await res.json();
        setCuadrillas(data);
      }
    } catch (err) {
      message.error("Error cargando cuadrillas");
    } finally {
      setLoading(false);
    }
  };

  const fetchFincas = async () => {
    try {
      const res = await authFetch(`/api/table/fincas?tenantId=${tenantId || 1}`);
      if (res.ok) {
        const data = await res.json();
        setFincas(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCuadrillas();
    fetchFincas();
  }, [tenantId]);

  const showModal = (record = null) => {
    if (record) {
      setEditingId(record.id_cuadrilla);
      form.setFieldsValue(record);
    } else {
      setEditingId(null);
      form.resetFields();
      if (selectedFinca !== 'Todas' && selectedFinca !== 'Ninguna') {
        form.setFieldsValue({ id_finca: parseInt(selectedFinca) });
      }
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingId(null);
  };

  const handleSave = async (values) => {
    try {
      const payload = { ...values, tenantId: tenantId || 1 };
      const url = editingId ? `/api/rrhh-cuadrillas/${editingId}` : '/api/rrhh-cuadrillas';
      const method = editingId ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        message.success(`Cuadrilla ${editingId ? 'actualizada' : 'creada'} correctamente`);
        setIsModalVisible(false);
        fetchCuadrillas();
      } else {
        const err = await res.json();
        message.error(err.error || "Error al guardar");
      }
    } catch (err) {
      message.error("Error de conexión");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que desea eliminar esta cuadrilla?")) return;
    try {
      const res = await authFetch(`/api/rrhh-cuadrillas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        message.success("Cuadrilla eliminada");
        fetchCuadrillas();
      } else {
        const err = await res.json();
        message.error(err.error || "No se pudo eliminar");
      }
    } catch (err) {
      message.error("Error al eliminar");
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id_cuadrilla',
      key: 'id_cuadrilla',
      width: 70
    },
    {
      title: 'Nombre de la Cuadrilla',
      dataIndex: 'nombre',
      key: 'nombre',
    },
    {
      title: 'Finca Base',
      dataIndex: 'finca_nombre',
      key: 'finca_nombre',
      render: (text) => text || 'Global / Sin Asignar'
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      render: (tipo) => {
        let color = 'blue';
        if (tipo === 'Agricola') color = 'green';
        if (tipo === 'Ganadera') color = 'orange';
        if (tipo === 'Acuicola') color = 'cyan';
        return <Tag color={color}>{tipo}</Tag>;
      }
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado) => (
        <Tag color={estado === 'Activa' ? 'success' : 'error'}>{estado}</Tag>
      )
    },
    {
      title: 'Fecha Creación',
      dataIndex: 'fecha_creacion',
      key: 'fecha_creacion',
      render: (val) => val ? val.split('T')[0] : ''
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space>
          <Button type="primary" icon={<Edit size={16} />} size="small" onClick={() => showModal(record)} />
          <Button danger icon={<Trash2 size={16} />} size="small" onClick={() => handleDelete(record.id_cuadrilla)} />
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Catálogo de Cuadrillas</h2>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => showModal()}>
          Nueva Cuadrilla
        </Button>
      </div>

      <Card>
        <Table 
          columns={columns} 
          dataSource={cuadrillas} 
          rowKey="id_cuadrilla" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingId ? "Editar Cuadrilla" : "Nueva Cuadrilla"}
        open={isModalVisible}
        onCancel={handleCancel}
        onOk={() => form.submit()}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item 
            name="nombre" 
            label="Nombre de la Cuadrilla" 
            rules={[{ required: true, message: 'Ingrese el nombre' }]}
          >
            <Input placeholder="Ej. Cuadrilla Cosecha Lotes Norte" />
          </Form.Item>

          <Form.Item 
            name="id_finca" 
            label="Finca a la que pertenece"
            rules={[{ required: true, message: 'Seleccione una finca' }]}
          >
            <Select placeholder="Seleccione Finca">
              {fincas.map(f => (
                <Option key={f.id_finca} value={f.id_finca}>{f.nombre}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item 
            name="tipo" 
            label="Tipo de Cuadrilla"
            initialValue="Agricola"
          >
            <Select>
              <Option value="Agricola">Agrícola</Option>
              <Option value="Ganadera">Ganadera</Option>
              <Option value="Acuicola">Acuícola</Option>
              <Option value="Bioles">Planta de Bioles</Option>
              <Option value="Produccion">Producción (Producto Terminado)</Option>
              <Option value="Mantenimiento">Mantenimiento (Talleres)</Option>
              <Option value="Otra">Otra</Option>
            </Select>
          </Form.Item>

          <Form.Item 
            name="estado" 
            label="Estado"
            initialValue="Activa"
          >
            <Select>
              <Option value="Activa">Activa</Option>
              <Option value="Inactiva">Inactiva</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CatalogoCuadrillas;
