import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, InputNumber, Button, notification, Table, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { fetchTableData, API_BASE, authFetch } from '../utils/api';
import BasculaSelector from './Inventory/BasculaSelector';

const { Option } = Select;

export default function NuevoTrasladoModal({ tenantId, fincas, bodegas, onClose, onSuccess }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [insumos, setInsumos] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    // Load insumos y usuarios
    const loadDatos = async () => {
      try {
        const resIns = await fetchTableData('insumos', { tenantId, pageSize: 500 });
        setInsumos(resIns.data || []);
        
        const resEmp = await fetchTableData('rrhh_empleados', { tenantId, pageSize: 500 });
        setUsuarios(resEmp.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    loadDatos();
  }, [tenantId]);

  const handleAddLinea = () => {
    setLineas([...lineas, { key: Date.now(), id_insumo: null, cantidad: 1 }]);
  };

  const handleRemoveLinea = (key) => {
    setLineas(lineas.filter(l => l.key !== key));
  };

  const handleChangeLinea = (key, field, value) => {
    setLineas(lineas.map(l => (l.key === key ? { ...l, [field]: value } : l)));
  };

  const handleSubmit = async (values) => {
    if (values.id_bodega_origen === values.id_bodega_destino) {
      return notification.error({ message: 'La bodega de origen y destino no pueden ser la misma.' });
    }
    
    // Check lineas
    const items = lineas.filter(l => l.id_insumo && l.cantidad > 0);
    if (items.length === 0) {
      return notification.error({ message: 'Debes añadir al menos un insumo al traslado.' });
    }

    setLoading(true);
    try {
      const payload = {
        id_tenant: tenantId,
        id_bodega_origen: values.id_bodega_origen,
        id_bodega_destino: values.id_bodega_destino,
        id_empleado_transportador: values.id_empleado_transportador,
        id_bascula: values.id_bascula,
        peso_total: values.peso_total,
        items: items.map(i => {
          const insumoObj = insumos.find(ins => ins.id_insumo === i.id_insumo);
          return {
            id_insumo: i.id_insumo,
            insumo_producto: insumoObj ? insumoObj.nombre : 'Insumo Desconocido',
            cantidad: i.cantidad
          };
        })
      };

      const res = await authFetch(`${API_BASE}/traslados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Error al guardar el traslado');
      }

      notification.success({ message: 'Traslado guardado y aplicado correctamente.' });
      onSuccess();
    } catch (error) {
      console.error(error);
      notification.error({ message: 'Hubo un error al procesar el traslado.' });
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Insumo',
      dataIndex: 'id_insumo',
      render: (val, record) => (
        <Select 
          showSearch
          placeholder="Seleccionar Insumo"
          style={{ width: '100%' }}
          value={val}
          onChange={(v) => handleChangeLinea(record.key, 'id_insumo', v)}
          filterOption={(input, option) =>
            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
        >
          {insumos.map(i => <Option key={i.id_insumo} value={i.id_insumo}>{i.codigo} - {i.nombre}</Option>)}
        </Select>
      )
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      width: 120,
      render: (val, record) => (
        <InputNumber 
          min={0.01} 
          step={0.01} 
          style={{ width: '100%' }} 
          value={val} 
          onChange={(v) => handleChangeLinea(record.key, 'cantidad', v)} 
        />
      )
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, record) => (
        <Button danger type="text" icon={<DeleteOutlined />} onClick={() => handleRemoveLinea(record.key)} />
      )
    }
  ];

  return (
    <Modal
      title="Nuevo Traslado"
      open={true}
      onCancel={onClose}
      width={850}
      footer={null}
      destroyOnClose
      okText="Guardar y Aplicar"
      cancelText="Cancelar"
    >
      <Form layout="vertical" form={form} onFinish={handleSubmit}>
        <Space style={{ width: '100%', marginBottom: 16 }} size="large" align="start">
          <div style={{ flex: 1 }}>
            <Form.Item 
              name="id_bodega_origen" 
              label="Bodega Origen" 
              rules={[{ required: true, message: 'Requerido' }]}
              style={{ marginBottom: 8, width: 220 }}
            >
              <Select placeholder="Selecciona origen">
                {bodegas.map(b => <Option key={b.id_bodega} value={b.id_bodega}>{b.nombre}</Option>)}
              </Select>
            </Form.Item>
          </div>

          <div style={{ flex: 1 }}>
            <Form.Item 
              name="id_bodega_destino" 
              label="Bodega Destino" 
              rules={[{ required: true, message: 'Requerido' }]}
              style={{ marginBottom: 8, width: 220 }}
            >
              <Select placeholder="Selecciona destino">
                {bodegas.map(b => <Option key={b.id_bodega} value={b.id_bodega}>{b.nombre}</Option>)}
              </Select>
            </Form.Item>
          </div>

          <div style={{ flex: 1 }}>
            <Form.Item 
              name="id_empleado_transportador" 
              label="Transportador / Custodio" 
              rules={[{ required: true, message: 'Requerido' }]}
              style={{ marginBottom: 8, width: 260 }}
            >
              <Select 
                showSearch
                placeholder="Buscar por cédula o nombre..."
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {usuarios.map(u => (
                  <Option key={u.id_empleado} value={u.id_empleado}>
                    {u.documento} - {u.nombres} {u.apellidos}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

            <div style={{ flex: 1 }}>
              <Form.Item 
                name="id_bascula"
                label="Báscula"
                rules={[{ required: true, message: 'Requerido' }]}
                style={{ marginBottom: 8, width: 260 }}
              >
                <BasculaSelector tenantId={tenantId} value={form.getFieldValue('id_bascula')} onChange={(val) => form.setFieldsValue({ id_bascula: val })} />
              </Form.Item>
            </div>
            <div style={{ flex: 1 }}>
              <Form.Item 
                name="peso_total"
                label="Peso Total (kg)"
                rules={[{ required: true, message: 'Requerido' }, { type: 'number', min: 0, message: 'Debe ser mayor que 0' }]}
                style={{ marginBottom: 8, width: 260 }}
              >
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </div>
        </Space>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <b>Detalle de Insumos</b>
            <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddLinea}>Agregar Línea</Button>
          </div>
          <Table 
            dataSource={lineas} 
            columns={columns} 
            pagination={false} 
            size="small" 
            locale={{ emptyText: 'No has agregado insumos' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="primary" htmlType="submit" loading={loading} style={{ background: '#2e7d32', borderColor: '#2e7d32' }}>
            Guardar y Aplicar
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
