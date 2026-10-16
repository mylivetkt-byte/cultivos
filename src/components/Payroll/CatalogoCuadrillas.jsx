import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Modal, Form, Input, Select, message, Tag, Space, DatePicker, Row, Col, Typography } from 'antd';
import dayjs from 'dayjs';
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

  // Filtros
  const [filterFinca, setFilterFinca] = useState('Todas');
  const [filterTipo, setFilterTipo] = useState('Todas');
  const [filterDateRange, setFilterDateRange] = useState(null);

  const fetchCuadrillas = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/catalogo-cuadrillas?tenantId=${tenantId || 1}&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        console.log("Cuadrillas data:", data);
        if (Array.isArray(data)) {
          setCuadrillas([...data]);
          message.success(`Cargadas ${data.length} cuadrillas`);
        } else {
          setCuadrillas(data.data || []);
          message.warning("Advertencia: El backend no devolvió un Array");
        }
      } else {
        const txt = await res.text();
        message.error(`Error HTTP ${res.status}: ${txt.substring(0, 100)}`);
      }
    } catch (err) {
      console.error(err);
      message.error(`Error en fetchCuadrillas: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchFincas = async () => {
    try {
      const res = await authFetch(`/api/table/fincas/data?pageSize=100&tenantId=${tenantId || 1}`);
      if (res.ok) {
        const result = await res.json();
        setFincas(result.data || []);
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
      const url = editingId ? `/api/catalogo-cuadrillas/${editingId}` : '/api/catalogo-cuadrillas';
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
      const res = await authFetch(`/api/catalogo-cuadrillas/${id}`, { method: 'DELETE' });
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
      width: 70,
      render: id => <b>#{id}</b>
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
      title: 'Empleados',
      dataIndex: 'empleados_nombres',
      key: 'empleados_nombres',
      render: (text) => text ? <span style={{ fontSize: '12px' }}>{text}</span> : <Typography.Text type="secondary" style={{ fontSize: '12px' }}>Ninguno</Typography.Text>
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

  const filteredCuadrillas = cuadrillas.filter(c => {
    let match = true;
    if (filterFinca !== 'Todas') {
      if (filterFinca === 'Ninguna') {
        if (c.id_finca !== null) match = false;
      } else {
        if (String(c.id_finca) !== String(filterFinca)) match = false;
      }
    }
    if (filterTipo !== 'Todas') {
      if (c.tipo !== filterTipo) match = false;
    }
    if (filterDateRange && filterDateRange[0] && filterDateRange[1]) {
      const created = dayjs(c.fecha_creacion);
      if (created.isBefore(filterDateRange[0], 'day') || created.isAfter(filterDateRange[1], 'day')) {
        match = false;
      }
    }
    return match;
  });

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 600 }}>Catálogo de Cuadrillas</h2>
          <Typography.Text type="secondary">Gestione y filtre las cuadrillas disponibles en el sistema</Typography.Text>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => showModal()} style={{ borderRadius: '6px' }}>
          Nueva Cuadrilla
        </Button>
      </div>

      <Card style={{ marginBottom: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <div style={{ marginBottom: 4 }}><strong>Filtro por Finca</strong></div>
            <Select style={{ width: '100%' }} value={filterFinca} onChange={setFilterFinca}>
              <Option value="Todas">Todas las Fincas</Option>
              <Option value="Ninguna">Global / Sin Asignar</Option>
              {fincas.map(f => (
                <Option key={f.id_finca} value={f.id_finca}>{f.nombre}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <div style={{ marginBottom: 4 }}><strong>Tipo de Cuadrilla</strong></div>
            <Select style={{ width: '100%' }} value={filterTipo} onChange={setFilterTipo}>
              <Option value="Todas">Todos los Tipos</Option>
              <Option value="Agricola">Agrícola</Option>
              <Option value="Ganadera">Ganadera</Option>
              <Option value="Acuicola">Acuícola</Option>
              <Option value="Bioles">Planta de Bioles</Option>
              <Option value="Produccion">Producción (Producto Terminado)</Option>
              <Option value="Mantenimiento">Mantenimiento (Talleres)</Option>
              <Option value="Otra">Otra</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <div style={{ marginBottom: 4 }}><strong>Rango de Fechas</strong></div>
            <DatePicker.RangePicker 
              style={{ width: '100%' }} 
              onChange={setFilterDateRange}
              placeholder={['Fecha Inicio', 'Fecha Fin']}
            />
          </Col>
        </Row>
      </Card>

      <Card style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Table 
          columns={columns} 
          dataSource={filteredCuadrillas} 
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
            rules={[{ required: false }]}
          >
            <Select placeholder="Global / Sin Asignar" allowClear>
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
