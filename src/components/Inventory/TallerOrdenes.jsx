import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, Select, Tag, Alert, Button, Modal, Form, Input, message, Tooltip, DatePicker } from 'antd';
import { ToolOutlined, WhatsAppOutlined, SearchOutlined } from '@ant-design/icons';
import { authFetch } from '../../utils/api';

const { Title, Text } = Typography;
const { Option } = Select;

export default function TallerOrdenes({ tenantId }) {
  const [ordenes, setOrdenes] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [pedidoItems, setPedidoItems] = useState([]);
  const [existencias, setExistencias] = useState([]);
  const [invPedidoItems, setInvPedidoItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingExistencias, setLoadingExistencias] = useState(false);
  
  // Historial Pedidos State
  const [historialVisible, setHistorialVisible] = useState(false);
  const [historialData, setHistorialData] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [historialSearch, setHistorialSearch] = useState('');
  const [historialMaquina, setHistorialMaquina] = useState(null);
  const [historialDates, setHistorialDates] = useState([null, null]);
  const [selectedMaquina, setSelectedMaquina] = useState(null);
  const [dateRange, setDateRange] = useState([null, null]);

  const [wspModalVisible, setWspModalVisible] = useState(false);
  const [invModalVisible, setInvModalVisible] = useState(false);
  const [wspActionType, setWspActionType] = useState(''); // 'ot' or 'repuestos'
  const [selectedOT, setSelectedOT] = useState(null);
  const [wspForm] = Form.useForm();

  const [detallePedidoVisible, setDetallePedidoVisible] = useState(false);
  const [detallesPedidoData, setDetallesPedidoData] = useState([]);
  const [loadingDetalles, setLoadingDetalles] = useState(false);

  const handleViewDetallePedido = async (idPedido) => {
    setDetallePedidoVisible(true);
    setLoadingDetalles(true);
    try {
      const res = await authFetch(`/api/pedidos_internos/${idPedido}/detalles`);
      const data = await res.json();
      if(data.success) {
        setDetallesPedidoData(data.detalles);
      }
    } catch (e) {
      console.error(e);
      message.error("Error al cargar detalles del pedido");
    } finally {
      setLoadingDetalles(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadMaquinas();
      loadOrdenes();
      loadContactos();
      loadInsumos();
    }
  }, [tenantId]); // removed selectedMaquina and dateRange so it doesn't auto-fetch

  const loadContactos = async () => {
    try {
      const res = await authFetch(`/api/taller/contactos?tenantId=${tenantId}`);
      const data = await res.json();
      if(data.success) setContactos(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadInsumos = async () => {
    try {
      const res = await authFetch(`/api/taller/repuestos-catalogo?tenantId=${tenantId}`);
      const data = await res.json();
      if(Array.isArray(data)) setInsumos(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadExistencias = async () => {
    setLoadingExistencias(true);
    try {
      const res = await authFetch(`/api/bodegas_avanzado/existencias?tenantId=${tenantId}`);
      const data = await res.json();
      setExistencias(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingExistencias(false);
    }
  };

  const handleOpenInvModal = () => {
    setInvModalVisible(true);
    setInvPedidoItems({});
    loadExistencias();
  };

  const handleGenerateGeneralPedido = async () => {
    const itemsToOrder = Object.keys(invPedidoItems)
      .map(id => ({
        id_existencia: id,
        ...invPedidoItems[id]
      }))
      .filter(item => item.cantidad > 0);

    if (itemsToOrder.length === 0) {
      return message.warning("Ingresa una cantidad mayor a 0 en al menos un producto.");
    }

    try {
      const payload = {
        tenantId,
        id_bodega_provee: 1, // Bodega principal
        tipo_origen: 'Taller_Maquinaria',
        id_origen: null, // Pedido general del taller
        nombre_solicitante: 'Taller Agrícola',
        observaciones: 'Reabastecimiento de Taller Automático',
        fecha_requerida: new Date().toISOString().split('T')[0],
        items: itemsToOrder.map(i => ({ id_insumo: i.id_insumo, cantidad_solicitada: i.cantidad }))
      };

      const res = await authFetch(`/api/pedidos_internos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if(data.success) {
        message.success("Pedido interno general generado exitosamente (ID: " + data.id_pedido + ")");
        setInvModalVisible(false);
        setInvPedidoItems({});
      } else {
        message.error("Error al generar el pedido: " + data.error);
      }
    } catch (e) {
      console.error(e);
      message.error("Error al procesar el pedido.");
    }
  };

  const loadHistorialPedidos = async () => {
    setLoadingHistorial(true);
    try {
      let url = `/api/taller/pedidos-historial?tenantId=${tenantId}`;
      if (historialMaquina) url += `&id_maquina=${historialMaquina}`;
      if (historialDates && historialDates[0] && historialDates[1]) {
        url += `&startDate=${historialDates[0].format('YYYY-MM-DD')}&endDate=${historialDates[1].format('YYYY-MM-DD')}`;
      }
      const res = await authFetch(url);
      const data = await res.json();
      if(data.success) {
        setHistorialData(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const loadMaquinas = async () => {
    try {
      const res = await authFetch(`/api/taller/maquinas?tenantId=${tenantId}`);
      const data = await res.json();
      if(data.success) setMaquinas(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadOrdenes = async () => {
    setLoading(true);
    try {
      let url = `/api/taller/ordenes-trabajo?tenantId=${tenantId}`;
      if (selectedMaquina) url += `&id_maquina=${selectedMaquina}`;
      if (dateRange && dateRange[0] && dateRange[1]) {
        url += `&startDate=${dateRange[0].format('YYYY-MM-DD')}&endDate=${dateRange[1].format('YYYY-MM-DD')}`;
      }
      const res = await authFetch(url);
      const data = await res.json();
      if(data.success) setOrdenes(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWspModal = (record, actionType) => {
    setSelectedOT(record);
    setWspActionType(actionType);
    setWspModalVisible(true);
    wspForm.resetFields();

    // Auto-fill phone if mechanic is assigned and we can find them in contactos
    if (actionType === 'ot' && record.mecanico_telefono) {
      wspForm.setFieldsValue({ phone: record.mecanico_telefono });
    }
  };

  const handleSendWsp = async () => {
    try {
      const values = await wspForm.validateFields();
      
      const phone = values.phone ? values.phone.replace(/\\D/g, '') : '';
      let msg = '';
      
      if (wspActionType === 'ot') {
        if (!phone) return message.error('Ingresa el número de WhatsApp');
        msg = encodeURIComponent(`Hola ${values.contacto_select || ''},\nTe he asignado la OT #${selectedOT.numero_orden}.\nMáquina: ${selectedOT.maquina_nombre}\nProblema: ${selectedOT.descripcion_problema}`);
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
        setWspModalVisible(false);
      } else {
        if (pedidoItems.length === 0) return message.warning('Debes agregar al menos un repuesto a la lista.');
        
        // Save to DB
        const res = await authFetch(`/api/pedidos_internos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            id_bodega_provee: 1, // Bodega Principal
            tipo_origen: 'Taller_Maquinaria',
            id_origen: selectedOT.id_orden_trabajo,
            nombre_solicitante: 'Taller Agrícola',
            observaciones: `Solicitud Automática OT #${selectedOT.numero_orden}`,
            fecha_requerida: new Date().toISOString().split('T')[0],
            items: pedidoItems.map(i => ({ id_insumo: i.id_insumo, cantidad_solicitada: i.cantidad }))
          })
        });
        
        const data = await res.json();
        if(data.success) {
          message.success("Pedido interno generado exitosamente (ID: " + data.id_pedido + ")");
          
          if (phone) {
             const listText = pedidoItems.map(i => `- ${i.cantidad} ${i.unidad_medida} de ${i.insumo_nombre}`).join('\n');
             msg = encodeURIComponent(`Hola,\nRequiero los siguientes repuestos para la OT #${selectedOT.numero_orden}:\n${listText}`);
             window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
          }
          
          setWspModalVisible(false);
          setPedidoItems([]);
        } else {
          message.error("Error al generar el pedido: " + data.error);
        }
      }

    } catch (e) {
      console.error(e);
    }
  };

  const [nuevaOTVisible, setNuevaOTVisible] = useState(false);
  const [nuevaOTForm] = Form.useForm();
  const [creatingOT, setCreatingOT] = useState(false);

  const handleCreateOT = async () => {
    try {
      const values = await nuevaOTForm.validateFields();
      setCreatingOT(true);
      const res = await authFetch(`/api/taller/ordenes-trabajo?tenantId=${tenantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      const data = await res.json();
      if(data.success) {
        message.success("Orden de trabajo creada exitosamente");
        setNuevaOTVisible(false);
        nuevaOTForm.resetFields();
        loadOrdenes();
      } else {
        message.error("Error al crear la orden: " + data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingOT(false);
    }
  };

  const [horometroModalVisible, setHorometroModalVisible] = useState(false);
  const [horometroForm] = Form.useForm();
  const [savingHorometro, setSavingHorometro] = useState(false);

  const handleSaveHorometro = async () => {
    try {
      const values = await horometroForm.validateFields();
      setSavingHorometro(true);
      const res = await authFetch(`/api/taller/horometros?tenantId=${tenantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          fecha: values.fecha.format('YYYY-MM-DD')
        })
      });
      const data = await res.json();
      if(data.success) {
        message.success("Horómetro registrado correctamente");
        setHorometroModalVisible(false);
        horometroForm.resetFields();
        loadMaquinas(); // Reload maquinas to get updated horometro
      } else {
        message.error("Error: " + data.error);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setSavingHorometro(false);
    }
  };

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <Card style={{ borderRadius: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}><ToolOutlined /> Órdenes de Trabajo</Title>
            <Text type="secondary">Historial de mantenimientos y reparaciones</Text>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button type="primary" style={{ background: '#10b981', borderColor: '#10b981' }} onClick={() => setNuevaOTVisible(true)}>
            + Nueva Orden
          </Button>
          <Button type="default" onClick={() => setHorometroModalVisible(true)} style={{ background: '#f59e0b', color: 'white', border: 'none' }}>
            <ClockCircleOutlined /> Registrar Horómetro
          </Button>
          <Button type="default" onClick={handleOpenInvModal}>
            📦 Consultar Inventario
          </Button>
          <Button type="default" onClick={() => { setHistorialVisible(true); loadHistorialPedidos(); }}>
            📋 Historial de Pedidos
          </Button>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div>
            <Text strong style={{marginRight: 8}}>Rango: </Text>
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
              style={{ width: 200 }}
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
            <Button type="primary" icon={<SearchOutlined />} onClick={loadOrdenes} loading={loading}>
              Consultar
            </Button>
          </div>
        </div>
      </div>
      </Card>


      <Card style={{ borderRadius: 12 }}>
        {!selectedMaquina && <Alert message="Mostrando todo el historial. Selecciona una máquina para ver sus mantenimientos específicos." type="info" showIcon style={{marginBottom: 16}} />}
        <Table 
          dataSource={ordenes}
          rowKey="id_orden_trabajo"
          loading={loading}
          columns={[
            { title: 'OT #', dataIndex: 'numero_orden', render: n => <b>{n}</b> },
            { title: 'Fecha', dataIndex: 'fecha_inicio', render: f => new Date(f).toLocaleDateString() },
            { title: 'Máquina', render: (_, r) => `[${r.placa}] ${r.maquina_nombre}` },
            { title: 'Tipo', dataIndex: 'tipo_orden', render: t => (
              <Tag color={t === 'Preventivo' ? 'blue' : 'volcano'}>{t}</Tag>
            )},
            { title: 'Problema', dataIndex: 'descripcion_problema' },
            { title: 'Técnico', render: (_, r) => `${r.mecanico_nombre} ${r.mecanico_apellido}` },
            { title: 'Estado OT', dataIndex: 'estado', render: e => <Tag color="green">{e}</Tag> },
            { title: 'Estado Pedido', dataIndex: 'estado_pedido_repuestos', render: (e, r) => {
              if (!e) return <Text type="secondary" italic>Sin Pedidos</Text>;
              let color = 'default';
              if (e === 'Pendiente_Aprobacion') color = 'orange';
              if (e === 'Aprobado') color = 'blue';
              if (e === 'Despachado') color = 'cyan';
              if (e === 'Completado') color = 'green';
              if (e === 'Cancelado' || e === 'Rechazado') color = 'red';
              return (
                <Button 
                  size="small" 
                  type="dashed" 
                  onClick={() => handleViewDetallePedido(r.id_pedido_repuestos)}
                  style={{ color: 'var(--ant-primary-color)' }}
                >
                  <Tag color={color} style={{ margin: 0, cursor: 'pointer' }}>{e}</Tag>
                </Button>
              );
            } },
            { title: 'Acciones', render: (_, r) => (
              <div style={{display:'flex', gap:'8px'}}>
                <Tooltip title="Enviar OT al Mecánico por WhatsApp">
                  <Button size="small" type="primary" style={{ background: '#25D366', borderColor: '#25D366' }} icon={<WhatsAppOutlined />} onClick={() => handleOpenWspModal(r, 'ot')} />
                </Tooltip>
                <Tooltip title="Pedir Repuestos a Bodega">
                  <Button size="small" icon={<WhatsAppOutlined style={{ color: '#25D366' }}/>} onClick={() => handleOpenWspModal(r, 'repuestos')} />
                </Tooltip>
              </div>
            )}
          ]}
        />
      </Card>

      <Modal
        title="Nueva Orden de Trabajo"
        open={nuevaOTVisible}
        onOk={handleCreateOT}
        onCancel={() => setNuevaOTVisible(false)}
        confirmLoading={creatingOT}
        okText="Guardar Orden"
      >
        <Form form={nuevaOTForm} layout="vertical">
          <Form.Item name="id_maquina" label="Máquina" rules={[{required: true}]}>
            <Select showSearch placeholder="Selecciona la máquina">
              {maquinas.map(m => (
                <Option key={m.id_maq_agro} value={m.id_maq_agro}>[{m.placa}] {m.marca_modelo}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="tipo_orden" label="Tipo de Mantenimiento" rules={[{required: true}]}>
            <Select placeholder="Selecciona">
              <Option value="Preventivo">Preventivo</Option>
              <Option value="Correctivo">Correctivo</Option>
            </Select>
          </Form.Item>
          <Form.Item name="id_mecanico_asignado" label="Mecánico Asignado" rules={[{required: true}]}>
            <Select placeholder="Selecciona el mecánico">
              {contactos.filter(c => c.tipo === 'Mecánico Interno').map(c => (
                <Option key={c.id} value={c.id}>{c.nombre} {c.cargo ? `- ${c.cargo}` : ''}</Option> 
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="descripcion_problema" label="Descripción del Trabajo / Problema" rules={[{required: true}]}>
            <Input.TextArea rows={3} placeholder="Detalles..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Registrar Horómetro / Odómetro"
        open={horometroModalVisible}
        onOk={handleSaveHorometro}
        onCancel={() => setHorometroModalVisible(false)}
        confirmLoading={savingHorometro}
        okText="Guardar Registro"
      >
        <Alert message="Llevar el control de horas de motor permite al sistema predecir y sugerir rutinas de mantenimiento." type="info" showIcon style={{marginBottom: 16}} />
        <Form form={horometroForm} layout="vertical">
          <Form.Item name="id_maq_agro" label="Máquina" rules={[{required: true}]}>
            <Select showSearch placeholder="Selecciona la máquina">
              {maquinas.map(m => (
                <Option key={m.id_maq_agro} value={m.id_maq_agro}>[{m.placa}] {m.marca_modelo} (Actual: {m.horometro_actual || 0}H)</Option>
              ))}
            </Select>
          </Form.Item>
          <div style={{display:'flex', gap:'16px'}}>
            <Form.Item name="fecha" label="Fecha" rules={[{required: true}]} style={{flex:1}}>
              <DatePicker style={{width:'100%'}} />
            </Form.Item>
            <Form.Item name="lectura_horas" label="Horas de Motor" rules={[{required: true}]} style={{flex:1}}>
              <Input type="number" step="0.1" addonAfter="H" placeholder="Ej: 520.5" />
            </Form.Item>
          </div>
          <Form.Item name="operador" label="Operador / Responsable">
            <Input placeholder="Nombre del tractorista o responsable" />
          </Form.Item>
          <Form.Item name="notas" label="Observaciones">
            <Input.TextArea rows={2} placeholder="Novedades durante el turno..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={wspActionType === 'ot' ? "Notificar a Mecánico (WhatsApp)" : "Solicitar Repuestos a Bodega"}
        open={wspModalVisible}
        width={700}
        onOk={handleSendWsp}
        onCancel={() => setWspModalVisible(false)}
        okText={wspActionType === 'ot' ? "Abrir WhatsApp Web" : "Generar Pedido"}
      >
        <Alert message={wspActionType === 'ot' ? "Esto abrirá WhatsApp Web/App para enviar el mensaje directamente." : "Esto generará un Pedido Interno en Inventario y opcionalmente abrirá WhatsApp para notificar al jefe de bodega."} type="info" showIcon style={{marginBottom: 16}} />
        <Form form={wspForm} layout="vertical">
          {wspActionType === 'ot' && (
            <Form.Item name="contacto_select" label="Buscar Contacto (Mecánicos)">
              <Select 
                allowClear 
                showSearch 
                placeholder="Buscar por nombre..."
                filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
                onChange={(val, opt) => {
                  if (opt && opt['data-phone']) {
                    wspForm.setFieldsValue({ phone: opt['data-phone'] });
                  }
                }}
              >
                {contactos.map((c, i) => (
                  <Option key={i} value={c.nombre} data-phone={c.telefono}>
                    {c.nombre} ({c.tipo}) - {c.telefono || 'Sin número'}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {wspActionType === 'repuestos' && (
            <Form.Item name="contacto_select" label="Jefe de Bodega a notificar (Opcional)">
              <Select 
                allowClear 
                showSearch 
                placeholder="Seleccionar jefe de bodega..."
                filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
                onChange={(val, opt) => {
                  if (opt && opt['data-phone']) {
                    wspForm.setFieldsValue({ phone: opt['data-phone'] });
                  }
                }}
              >
                {contactos.filter(c => c.cargo && ['bodeg', 'admin', 'mayor', 'jefe'].some(role => c.cargo.toLowerCase().includes(role))).map((c, i) => (
                  <Option key={i} value={c.nombre} data-phone={c.telefono}>
                    {c.nombre} ({c.cargo}) - {c.telefono || 'Sin número'}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item name="phone" label={wspActionType === 'ot' ? "Número de WhatsApp Destino" : "Número de WhatsApp Destino (Opcional)"} rules={[{required: wspActionType === 'ot', message: 'Ingresa el número (ej: 3001234567)'}]}>
            <Input placeholder="Número celular (sin código país si es Colombia)" />
          </Form.Item>

          {wspActionType === 'repuestos' && (
            <>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'flex-end' }}>
                <Form.Item name="selectedInsumo" style={{ marginBottom: 0, flex: 1 }}>
                  <Select
                    showSearch
                    placeholder="Seleccionar Insumo/Repuesto"
                    popupMatchSelectWidth={false}
                    dropdownStyle={{ minWidth: 400 }}
                    filterOption={(input, option) => {
                      const text = String(option?.children?.join ? option.children.join('') : option?.children || '');
                      return text.toLowerCase().includes(input.toLowerCase());
                    }}
                  >
                    {insumos.map(i => (
                      <Option key={i.id_insumo} value={i.id_insumo}>
                        {i.codigo} - {i.insumo_nombre} (Stock: {i.cantidad} en {i.bodega_nombre})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="selectedQty" style={{ marginBottom: 0, width: '100px' }}>
                  <Input type="number" placeholder="Cant." />
                </Form.Item>
                <Button type="default" onClick={() => {
                  const insId = wspForm.getFieldValue('selectedInsumo');
                  const qty = wspForm.getFieldValue('selectedQty');
                  if(!insId || !qty || qty <= 0) return message.warning('Seleccione producto y cantidad válida');
                  const insObj = insumos.find(x => x.id_insumo === insId);
                  
                  // Check if already in list
                  const existingIdx = pedidoItems.findIndex(x => x.id_insumo === insId);
                  let newItems = [...pedidoItems];
                  if (existingIdx > -1) {
                    newItems[existingIdx].cantidad += Number(qty);
                  } else {
                    newItems.push({ ...insObj, cantidad: Number(qty) });
                  }
                  
                  setPedidoItems(newItems);
                  wspForm.setFieldsValue({ selectedInsumo: null, selectedQty: '' });
                }}>
                  Agregar
                </Button>
              </div>
              
              <Table
                dataSource={pedidoItems}
                rowKey="id_insumo"
                pagination={false}
                size="small"
                scroll={{ y: 200 }}
                columns={[
                  { title: 'Código', dataIndex: 'codigo' },
                  { title: 'Producto', dataIndex: 'insumo_nombre' },
                  { title: 'Cant.', dataIndex: 'cantidad', align: 'right' },
                  { title: 'Unidad', dataIndex: 'unidad_medida' },
                  { title: '', render: (_, r) => <Button danger size="small" onClick={() => setPedidoItems(pedidoItems.filter(x => x.id_insumo !== r.id_insumo))}>X</Button>}
                ]}
              />
            </>
          )}
        </Form>
      </Modal>

      <Modal
        title="Historial de Pedidos (Consultar Productos Solicitados)"
        open={historialVisible}
        onCancel={() => setHistorialVisible(false)}
        footer={null}
        width={1100}
      >
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <Select
            allowClear
            showSearch
            placeholder="Filtrar por Máquina"
            style={{ width: 250 }}
            value={historialMaquina}
            onChange={v => setHistorialMaquina(v)}
            filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
          >
            {maquinas.map(m => <Option key={m.id_maq_agro} value={m.id_maq_agro}>[{m.placa}] {m.marca_modelo}</Option>)}
          </Select>
          <DatePicker.RangePicker 
            value={historialDates} 
            onChange={v => setHistorialDates(v)} 
            style={{ width: 250 }}
          />
          <Input 
            placeholder="Buscar por código o producto..."
            value={historialSearch}
            onChange={e => setHistorialSearch(e.target.value)}
            style={{ width: 200 }}
          />
          <Button type="primary" onClick={loadHistorialPedidos}>Buscar</Button>
        </div>

        <Table
          dataSource={historialData.filter(d => 
            !historialSearch || 
            (d.codigo && d.codigo.toLowerCase().includes(historialSearch.toLowerCase())) ||
            (d.insumo_nombre && d.insumo_nombre.toLowerCase().includes(historialSearch.toLowerCase()))
          )}
          rowKey="id_detalle"
          loading={loadingHistorial}
          size="small"
          pagination={{ pageSize: 15 }}
          columns={[
            { title: 'Fecha', dataIndex: 'fecha_solicitud', render: d => new Date(d).toLocaleDateString() },
            { title: 'OT #', dataIndex: 'numero_orden', render: o => o || 'Pedido General' },
            { title: 'Máquina', render: (_, r) => r.maquina_nombre ? `[${r.placa}] ${r.maquina_nombre}` : '-' },
            { title: 'Código', dataIndex: 'codigo' },
            { title: 'Repuesto/Insumo', dataIndex: 'insumo_nombre', render: (t, r) => <b>{t}</b> },
            { title: 'Solicitado', dataIndex: 'cantidad_solicitada', align: 'right', render: (v, r) => `${parseFloat(v)} ${r.unidad_medida}` },
            { title: 'Aprobado', dataIndex: 'cantidad_aprobada', align: 'right', render: (v, r) => v ? `${parseFloat(v)} ${r.unidad_medida}` : '-' },
            { title: 'Estado', dataIndex: 'estado_pedido', render: e => <Tag color={e === 'Aprobado' ? 'green' : (e === 'Rechazado' ? 'red' : 'orange')}>{e}</Tag> }
          ]}
        />
      </Modal>

      <Modal
        title="Consultar Existencias y Solicitar Reabastecimiento"
        open={invModalVisible}
        onCancel={() => setInvModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setInvModalVisible(false)}>Cerrar</Button>,
          <Button key="order" type="primary" onClick={handleGenerateGeneralPedido}>Generar Pedido al Almacén Principal</Button>
        ]}
        width={900}
      >
        <Alert message="Ingresa la cantidad a pedir en la columna 'Cant. Pedir' para los productos que necesites reabastecer en el taller, luego haz clic en Generar Pedido." type="info" showIcon style={{marginBottom: 16}} />
        <Table 
          dataSource={existencias}
          rowKey="id_existencia"
          loading={loadingExistencias}
          columns={[
            { title: 'Bodega', dataIndex: 'bodega_nombre', render: n => <b>{n}</b> },
            { title: 'Código', dataIndex: 'codigo' },
            { title: 'Insumo / Repuesto', dataIndex: 'insumo_nombre' },
            { title: 'Cantidad Disponible', dataIndex: 'cantidad', align: 'right', render: v => <Tag color={v > 0 ? 'green' : 'red'}>{parseFloat(v||0).toLocaleString()}</Tag> },
            { title: 'Unidad', dataIndex: 'unidad_medida' },
            { title: 'Cant. Pedir', width: 120, render: (_, r) => (
              <Input 
                type="number" 
                min={0}
                placeholder="0" 
                value={invPedidoItems[r.id_existencia]?.cantidad || ''}
                onChange={e => {
                  setInvPedidoItems({
                    ...invPedidoItems,
                    [r.id_existencia]: { id_insumo: r.id_insumo, cantidad: Number(e.target.value) }
                  });
                }}
              />
            )}
          ]}
          pagination={{ pageSize: 8 }}
        />
      </Modal>

      <Modal
        title="Detalles del Pedido de Repuestos"
        open={detallePedidoVisible}
        onCancel={() => setDetallePedidoVisible(false)}
        footer={null}
        width={700}
      >
        <Table
          dataSource={detallesPedidoData}
          rowKey="id_detalle"
          loading={loadingDetalles}
          pagination={false}
          columns={[
            { title: 'Código', dataIndex: 'codigo' },
            { title: 'Insumo/Repuesto', dataIndex: 'nombre' },
            { title: 'Cantidad', dataIndex: 'cantidad_solicitada' },
            { title: 'Unidad', dataIndex: 'unidad_medida' }
          ]}
        />
      </Modal>
    </div>
  );
}
