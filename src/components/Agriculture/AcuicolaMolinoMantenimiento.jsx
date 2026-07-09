import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, Select, DatePicker, Row, Col, message, Tag, Typography, Space } from 'antd';
import { ToolOutlined, CalendarOutlined, HistoryOutlined, PlusOutlined, EditOutlined, CheckCircleOutlined, CarOutlined, UndoOutlined, SearchOutlined } from '@ant-design/icons';
import { fetchApi } from '../../utils/api';
import moment from 'moment';

const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function AcuicolaMolinoMantenimiento({ tenantId = 1 }) {
  const [activeTab, setActiveTab] = useState('1');
  const [equipos, setEquipos] = useState([]);
  const [mantenimientos, setMantenimientos] = useState([]);
  const [salidasTaller, setSalidasTaller] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [filtroFechas, setFiltroFechas] = useState(null);
  const [filtroEquipo, setFiltroEquipo] = useState(null);

  // Modals state
  const [isEquipoVisible, setIsEquipoVisible] = useState(false);
  const [isMantenimientoVisible, setIsMantenimientoVisible] = useState(false);
  const [isFinalizarVisible, setIsFinalizarVisible] = useState(false);
  const [isSalidaVisible, setIsSalidaVisible] = useState(false);
  const [isRetornoVisible, setIsRetornoVisible] = useState(false);

  const [editingEquipo, setEditingEquipo] = useState(null);
  const [finishingMantenimiento, setFinishingMantenimiento] = useState(null);
  const [returningSalida, setReturningSalida] = useState(null);

  const [formEquipo] = Form.useForm();
  const [formMantenimiento] = Form.useForm();
  const [formFinalizar] = Form.useForm();
  const [formSalida] = Form.useForm();
  const [formRetorno] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eqs, mants, salidas] = await Promise.all([
        fetchApi('/table/acuicola_molino_equipos/data?pageSize=100'),
        fetchApi('/table/acuicola_molino_mantenimientos/data?pageSize=500'),
        fetchApi('/table/acuicola_molino_salidas_taller/data?pageSize=200')
      ]);
      setEquipos(eqs.data || []);
      setMantenimientos(mants.data || []);
      setSalidasTaller(salidas.data || []);
    } catch (e) {
      console.error(e);
      message.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEquipo = async (values) => {
    try {
      const payload = { ...values, id_tenant: tenantId, fecha_instalacion: values.fecha_instalacion?.format('YYYY-MM-DD') };
      if (editingEquipo) {
        await fetchApi(`/table/acuicola_molino_equipos/data/${editingEquipo.id_equipo}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        message.success('Equipo actualizado');
      } else {
        await fetchApi('/table/acuicola_molino_equipos/data', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        message.success('Equipo registrado');
      }
      setIsEquipoVisible(false);
      formEquipo.resetFields();
      setEditingEquipo(null);
      loadData();
    } catch(e) {
      message.error('Error al guardar equipo');
    }
  };

  const handleProgramarMantenimiento = async (values) => {
    try {
      const payload = {
        id_tenant: tenantId,
        id_equipo: values.id_equipo,
        tipo_mantenimiento: values.tipo_mantenimiento,
        fecha_programada: values.fecha_programada.format('YYYY-MM-DD'),
        detalles: values.detalles,
        estado: 'PROGRAMADO'
      };
      await fetchApi('/table/acuicola_molino_mantenimientos/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      message.success('Mantenimiento programado');
      setIsMantenimientoVisible(false);
      formMantenimiento.resetFields();
      loadData();
    } catch(e) {
      message.error('Error al programar mantenimiento');
    }
  };

  const handleFinalizarMantenimiento = async (values) => {
    try {
      const total = (parseFloat(values.costo_hh || 0) + parseFloat(values.costo_repuestos || 0) + parseFloat(values.costo_taller_externo || 0) + parseFloat(values.costo_otros || 0));
      
      const payload = {
        fecha_realizada: values.fecha_realizada.format('YYYY-MM-DD'),
        responsable: values.responsable,
        especialidad_tecnico: values.especialidad_tecnico,
        tipo_tecnico: values.tipo_tecnico,
        costo_hh: values.costo_hh || 0,
        costo_repuestos: values.costo_repuestos || 0,
        costo_taller_externo: values.costo_taller_externo || 0,
        costo_otros: values.costo_otros || 0,
        detalles: values.detalles_final,
        estado: 'COMPLETADO'
      };

      await fetchApi(`/table/acuicola_molino_mantenimientos/data/${finishingMantenimiento.id_mantenimiento}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });

      if (total > 0) {
        await fetchApi('/contabilidad/asientos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            fecha: payload.fecha_realizada,
            tipo: 'GASTO_MANTENIMIENTO',
            concepto: `Mantenimiento ${finishingMantenimiento.tipo_mantenimiento} Eq ${finishingMantenimiento.id_equipo} - ${payload.especialidad_tecnico} ${payload.tipo_tecnico}`,
            monto_total: total,
            referencia_id: finishingMantenimiento.id_mantenimiento,
            modulo_origen: 'MOLINO_MANTENIMIENTO',
            detalles: { hh: payload.costo_hh, repuestos: payload.costo_repuestos, taller: payload.costo_taller_externo, otros: payload.costo_otros }
          })
        });
      }

      message.success('Mantenimiento completado y registrado en contabilidad');
      setIsFinalizarVisible(false);
      formFinalizar.resetFields();
      setFinishingMantenimiento(null);
      loadData();
    } catch(e) {
      message.error('Error al finalizar mantenimiento');
    }
  };

  const handleSalidaTaller = async (values) => {
    try {
      const payload = {
        id_tenant: tenantId,
        id_equipo: values.id_equipo,
        fecha_salida: values.fecha_salida.format('YYYY-MM-DD'),
        fecha_retorno_estimada: values.fecha_retorno_estimada?.format('YYYY-MM-DD'),
        taller_destino: values.taller_destino,
        responsable: values.responsable,
        tipo_responsable: values.tipo_responsable,
        motivo: values.motivo,
        estado: 'EN TALLER'
      };
      // Registrar salida
      await fetchApi('/table/acuicola_molino_salidas_taller/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      // Cambiar estado equipo
      await fetchApi(`/table/acuicola_molino_equipos/data/${values.id_equipo}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'EN TALLER' })
      });

      message.success('Máquina registrada en salida a taller');
      setIsSalidaVisible(false);
      formSalida.resetFields();
      loadData();
    } catch (e) {
      message.error('Error al registrar salida');
    }
  };

  const handleRetornoTaller = async (values) => {
    try {
      const payload = {
        fecha_retorno_real: values.fecha_retorno_real.format('YYYY-MM-DD'),
        costos_adicionales: values.costos_adicionales || 0,
        estado: 'DEVUELTO'
      };
      
      // Actualizar salida
      await fetchApi(`/table/acuicola_molino_salidas_taller/data/${returningSalida.id_salida}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      // Cambiar estado equipo a operativo
      await fetchApi(`/table/acuicola_molino_equipos/data/${returningSalida.id_equipo}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'OPERATIVO' })
      });

      // Crear gasto contable si hay costos
      if (parseFloat(payload.costos_adicionales) > 0) {
         await fetchApi('/contabilidad/asientos', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            fecha: payload.fecha_retorno_real,
            tipo: 'GASTO_MANTENIMIENTO',
            concepto: `Reparación Taller - Equipo ID ${returningSalida.id_equipo}`,
            monto_total: parseFloat(payload.costos_adicionales),
            referencia_id: returningSalida.id_salida,
            modulo_origen: 'MOLINO_MANTENIMIENTO_TALLER',
            detalles: { otros: payload.costos_adicionales }
          })
        });
      }

      message.success('Retorno registrado correctamente');
      setIsRetornoVisible(false);
      formRetorno.resetFields();
      setReturningSalida(null);
      loadData();
    } catch(e) {
      message.error('Error al registrar retorno');
    }
  };

  const equiposCols = [
    { title: 'Cód.', dataIndex: 'codigo', width: 80 },
    { title: 'Nombre Equipo', dataIndex: 'nombre', render: t => <strong>{t}</strong> },
    { title: 'Tipo', dataIndex: 'tipo' },
    { title: 'Marca', dataIndex: 'marca' },
    { title: 'Estado', dataIndex: 'estado', render: e => <Tag color={e === 'OPERATIVO' ? 'green' : e === 'EN TALLER' ? 'purple' : 'red'}>{e}</Tag> },
    { title: 'Instalación', dataIndex: 'fecha_instalacion', render: d => d ? moment(d).format('YYYY-MM-DD') : '' },
    { title: 'Acciones', render: (_, r) => (
      <Button type="text" icon={<EditOutlined />} onClick={() => {
        setEditingEquipo(r);
        formEquipo.setFieldsValue({ ...r, fecha_instalacion: r.fecha_instalacion ? moment(r.fecha_instalacion) : null });
        setIsEquipoVisible(true);
      }}>Editar</Button>
    )}
  ];

  const progCols = [
    { title: 'ID', dataIndex: 'id_mantenimiento', width: 60 },
    { title: 'Fecha Prog.', dataIndex: 'fecha_programada', render: d => d ? moment(d).format('YYYY-MM-DD') : '' },
    { title: 'Equipo', dataIndex: 'id_equipo', render: id => {
      const eq = equipos.find(e => e.id_equipo === id);
      return eq ? `${eq.codigo} - ${eq.nombre}` : id;
    }},
    { title: 'Tipo', dataIndex: 'tipo_mantenimiento', render: t => <Tag color={t === 'PREVENTIVO' ? 'blue' : 'orange'}>{t}</Tag> },
    { title: 'Detalles', dataIndex: 'detalles' },
    { title: 'Acción', render: (_, r) => (
      <Button type="primary" icon={<CheckCircleOutlined />} style={{ background: '#10b981', borderColor: '#10b981' }} onClick={() => {
        setFinishingMantenimiento(r);
        formFinalizar.setFieldsValue({
          fecha_realizada: moment(), especialidad_tecnico: 'Mecánico', tipo_tecnico: 'Interno',
          costo_hh: 0, costo_repuestos: 0, costo_taller_externo: 0, costo_otros: 0
        });
        setIsFinalizarVisible(true);
      }}>
        Finalizar
      </Button>
    )}
  ];

  const histCols = [
    { title: 'Fecha Realizada', dataIndex: 'fecha_realizada', render: d => d ? moment(d).format('YYYY-MM-DD') : '' },
    { title: 'Equipo', dataIndex: 'id_equipo', render: id => {
      const eq = equipos.find(e => e.id_equipo === id);
      return eq ? `${eq.codigo} - ${eq.nombre}` : id;
    }},
    { title: 'Tipo', dataIndex: 'tipo_mantenimiento' },
    { title: 'Técnico', render: (_, r) => <span>{r.responsable} <br/><Text type="secondary" style={{fontSize:12}}>{r.especialidad_tecnico} ({r.tipo_tecnico})</Text></span> },
    { title: 'Costo Total', render: (_, r) => {
      const total = parseFloat(r.costo_hh || 0) + parseFloat(r.costo_repuestos || 0) + parseFloat(r.costo_taller_externo || 0) + parseFloat(r.costo_otros || 0);
      return <strong style={{ color: '#ef4444' }}>${total.toLocaleString()}</strong>;
    }},
    { title: 'Detalles', dataIndex: 'detalles' }
  ];

  const salidasCols = [
    { title: 'Fecha Salida', dataIndex: 'fecha_salida', render: d => d ? moment(d).format('YYYY-MM-DD') : '' },
    { title: 'Equipo', dataIndex: 'id_equipo', render: id => {
      const eq = equipos.find(e => e.id_equipo === id);
      return eq ? `${eq.codigo} - ${eq.nombre}` : id;
    }},
    { title: 'Taller / Destino', dataIndex: 'taller_destino' },
    { title: 'Responsable', render: (_, r) => <span>{r.responsable} <Tag>{r.tipo_responsable}</Tag></span> },
    { title: 'Motivo', dataIndex: 'motivo' },
    { title: 'Estado', render: (_, r) => (
      r.estado === 'EN TALLER' ? <Tag color="orange">En Taller</Tag> : <Tag color="green">Devuelto</Tag>
    )},
    { title: 'Acción', render: (_, r) => (
      r.estado === 'EN TALLER' ? (
        <Button type="primary" icon={<UndoOutlined />} onClick={() => {
          setReturningSalida(r);
          formRetorno.setFieldsValue({ fecha_retorno_real: moment(), costos_adicionales: 0 });
          setIsRetornoVisible(true);
        }}>Registrar Retorno</Button>
      ) : (
        <Text type="secondary">Retornó: {moment(r.fecha_retorno_real).format('YYYY-MM-DD')}</Text>
      )
    )}
  ];

  // Aplicar Filtros
  const aplicarFiltros = (lista, campoFecha) => {
    return lista.filter(item => {
      let passEq = true;
      let passDate = true;
      if (filtroEquipo) passEq = (item.id_equipo === filtroEquipo);
      if (filtroFechas && filtroFechas[0] && filtroFechas[1] && item[campoFecha]) {
        const itemDate = moment(item[campoFecha]);
        passDate = itemDate.isBetween(filtroFechas[0], filtroFechas[1], 'day', '[]');
      }
      return passEq && passDate;
    });
  };

  const programados = aplicarFiltros(mantenimientos.filter(m => m.estado === 'PROGRAMADO'), 'fecha_programada');
  const completados = aplicarFiltros(mantenimientos.filter(m => m.estado === 'COMPLETADO'), 'fecha_realizada').sort((a,b) => new Date(b.fecha_realizada) - new Date(a.fecha_realizada));
  const salidasList = aplicarFiltros(salidasTaller, 'fecha_salida').sort((a,b) => new Date(b.fecha_salida) - new Date(a.fecha_salida));

  const FiltrosGlobales = () => (
    <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
      <Space>
        <SearchOutlined /> <strong>Filtros:</strong>
      </Space>
      <Select 
        showSearch 
        allowClear
        style={{ width: 300 }} 
        placeholder="Buscar máquina (código o desc)" 
        optionFilterProp="children"
        value={filtroEquipo}
        onChange={setFiltroEquipo}
      >
        {equipos.map(e => <Select.Option key={e.id_equipo} value={e.id_equipo}>{e.codigo} - {e.nombre}</Select.Option>)}
      </Select>
      <RangePicker 
        value={filtroFechas}
        onChange={setFiltroFechas}
      />
      <Button onClick={() => { setFiltroEquipo(null); setFiltroFechas(null); }}>Limpiar</Button>
    </div>
  );

  return (
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Title level={2} style={{ color: '#0f172a', margin: 0 }}>
            <ToolOutlined style={{ color: '#f59e0b', marginRight: '12px' }} />
            Mantenimiento Planta y Equipos
          </Title>
          <Text type="secondary">Control de maquinaria del molino, mantenimientos y salidas a taller.</Text>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} size="large">
          <TabPane tab={<span><ToolOutlined /> Equipos y Maquinaria</span>} key="1">
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { formEquipo.resetFields(); setEditingEquipo(null); setIsEquipoVisible(true); }}>Registrar Máquina</Button>
            </div>
            <Table dataSource={equipos} columns={equiposCols} rowKey="id_equipo" loading={loading} />
          </TabPane>
          <TabPane tab={<span><CalendarOutlined /> Cronograma Preventivo</span>} key="2">
            <FiltrosGlobales />
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="primary" style={{ background: '#3b82f6', borderColor: '#3b82f6' }} icon={<PlusOutlined />} onClick={() => { formMantenimiento.resetFields(); setIsMantenimientoVisible(true); }}>Programar Mantenimiento</Button>
            </div>
            <Table dataSource={programados} columns={progCols} rowKey="id_mantenimiento" loading={loading} />
          </TabPane>
          <TabPane tab={<span><HistoryOutlined /> Historial y Costos</span>} key="3">
            <FiltrosGlobales />
            <Table dataSource={completados} columns={histCols} rowKey="id_mantenimiento" loading={loading} />
          </TabPane>
          <TabPane tab={<span><CarOutlined /> Salidas a Taller (Externo)</span>} key="4">
            <FiltrosGlobales />
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="primary" style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }} icon={<CarOutlined />} onClick={() => { formSalida.resetFields(); setIsSalidaVisible(true); }}>Registrar Salida de Máquina</Button>
            </div>
            <Table dataSource={salidasList} columns={salidasCols} rowKey="id_salida" loading={loading} />
          </TabPane>
        </Tabs>
      </div>

      {/* Modal Equipo */}
      <Modal title={editingEquipo ? "Editar Equipo" : "Registrar Equipo"} open={isEquipoVisible} onCancel={() => setIsEquipoVisible(false)} footer={null}>
        <Form form={formEquipo} layout="vertical" onFinish={handleSaveEquipo} initialValues={{ estado: 'OPERATIVO' }}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="codigo" label="Código" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}><Select showSearch optionFilterProp="children"><Select.Option value="Extrusora">Extrusora</Select.Option><Select.Option value="Mezcladora">Mezcladora</Select.Option><Select.Option value="Molino">Molino</Select.Option><Select.Option value="Caldera">Caldera</Select.Option><Select.Option value="Ensacadora">Ensacadora</Select.Option><Select.Option value="Repuesto/Accesorio">Repuesto/Accesorio</Select.Option><Select.Option value="Otro">Otro</Select.Option></Select></Form.Item></Col>
          </Row>
          <Form.Item name="nombre" label="Nombre/Descripción" rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="marca" label="Marca"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="fecha_instalacion" label="Fecha Instalación"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="estado" label="Estado"><Select><Select.Option value="OPERATIVO">Operativo</Select.Option><Select.Option value="EN MANTENIMIENTO">En Mantenimiento</Select.Option><Select.Option value="EN TALLER">En Taller Externo</Select.Option><Select.Option value="INACTIVO">Inactivo</Select.Option></Select></Form.Item>
          <Form.Item name="notas" label="Notas"><Input.TextArea rows={2}/></Form.Item>
          <Button type="primary" htmlType="submit" block>Guardar Equipo</Button>
        </Form>
      </Modal>

      {/* Modal Programar Mantenimiento */}
      <Modal title="Programar Mantenimiento" open={isMantenimientoVisible} onCancel={() => setIsMantenimientoVisible(false)} footer={null}>
        <Form form={formMantenimiento} layout="vertical" onFinish={handleProgramarMantenimiento}>
          <Form.Item name="id_equipo" label="Seleccionar Equipo" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children" placeholder="Buscar equipo por nombre o código">
              {equipos.map(e => <Select.Option key={e.id_equipo} value={e.id_equipo}>{e.codigo} - {e.nombre}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="tipo_mantenimiento" label="Tipo de Mantenimiento" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="PREVENTIVO">Preventivo</Select.Option>
              <Select.Option value="CORRECTIVO">Correctivo / Reparación</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="fecha_programada" label="Fecha Programada" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="detalles" label="Tareas a realizar">
            <Input.TextArea rows={3} placeholder="Describa el trabajo o falla a reparar..." />
          </Form.Item>
          <Button type="primary" htmlType="submit" block style={{ background: '#3b82f6', borderColor: '#3b82f6' }}>Guardar Programación</Button>
        </Form>
      </Modal>

      {/* Modal Finalizar Mantenimiento */}
      <Modal title="Finalizar Mantenimiento y Registrar Costos" open={isFinalizarVisible} onCancel={() => setIsFinalizarVisible(false)} footer={null}>
        <Form form={formFinalizar} layout="vertical" onFinish={handleFinalizarMantenimiento}>
          <Form.Item name="fecha_realizada" label="Fecha Ejecución" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          
          <div style={{ border: '1px solid #e2e8f0', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <Text strong>Técnico Responsable</Text>
            <Row gutter={16} style={{ marginTop: 8 }}>
              <Col span={24}><Form.Item name="responsable" rules={[{ required: true }]}><Input placeholder="Nombre del técnico o proveedor" /></Form.Item></Col>
              <Col span={12}><Form.Item name="especialidad_tecnico" label="Especialidad"><Select><Select.Option value="Mecánico">Mecánico</Select.Option><Select.Option value="Electricista">Electricista</Select.Option><Select.Option value="Electromecánico">Electromecánico</Select.Option><Select.Option value="Torno/Soldadura">Torno/Soldadura</Select.Option></Select></Form.Item></Col>
              <Col span={12}><Form.Item name="tipo_tecnico" label="Tipo"><Select><Select.Option value="Interno">Personal Interno</Select.Option><Select.Option value="Externo">Contratista Externo</Select.Option></Select></Form.Item></Col>
            </Row>
          </div>
          
          <Row gutter={16}>
            <Col span={12}><Form.Item name="costo_hh" label="Costo Hombre-Hora ($)"><Input type="number" min={0} /></Form.Item></Col>
            <Col span={12}><Form.Item name="costo_repuestos" label="Costo Repuestos ($)"><Input type="number" min={0} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="costo_taller_externo" label="Trabajos Externos ($)"><Input type="number" min={0} /></Form.Item></Col>
            <Col span={12}><Form.Item name="costo_otros" label="Otros Costos ($)"><Input type="number" min={0} /></Form.Item></Col>
          </Row>

          <Form.Item name="detalles_final" label="Observaciones Finales / Tareas realizadas">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block style={{ background: '#10b981', borderColor: '#10b981' }}>
            Completar y Cargar a Contabilidad
          </Button>
        </Form>
      </Modal>

      {/* Modal Registrar Salida */}
      <Modal title="Registrar Salida de Máquina a Taller" open={isSalidaVisible} onCancel={() => setIsSalidaVisible(false)} footer={null}>
        <Form form={formSalida} layout="vertical" onFinish={handleSalidaTaller}>
          <Form.Item name="id_equipo" label="Seleccionar Equipo" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children" placeholder="Máquina que sale">
              {equipos.filter(e => e.estado === 'OPERATIVO').map(e => <Select.Option key={e.id_equipo} value={e.id_equipo}>{e.codigo} - {e.nombre}</Select.Option>)}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="fecha_salida" label="Fecha de Salida" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }}/></Form.Item></Col>
            <Col span={12}><Form.Item name="fecha_retorno_estimada" label="Retorno Estimado"><DatePicker style={{ width: '100%' }}/></Form.Item></Col>
          </Row>
          <Form.Item name="taller_destino" label="Taller o Destino" rules={[{ required: true }]}><Input placeholder="Ej. Taller El Torno S.A." /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="responsable" label="Responsable (Recibe)" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="tipo_responsable" label="Tipo Resp." rules={[{ required: true }]}><Select><Select.Option value="Interno">Empleado Empresa</Select.Option><Select.Option value="Externo">Proveedor Externo</Select.Option></Select></Form.Item></Col>
          </Row>
          <Form.Item name="motivo" label="Motivo de la salida"><Input.TextArea rows={2} /></Form.Item>
          <Button type="primary" htmlType="submit" block style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }}>Generar Acta de Salida</Button>
        </Form>
      </Modal>

      {/* Modal Registrar Retorno */}
      <Modal title="Control de Recibido (Retorno de Taller)" open={isRetornoVisible} onCancel={() => setIsRetornoVisible(false)} footer={null}>
        <Form form={formRetorno} layout="vertical" onFinish={handleRetornoTaller}>
          <div style={{ padding: '12px', background: '#f0fdf4', color: '#166534', borderRadius: '8px', marginBottom: '16px' }}>
            Esta acción devolverá el equipo al estado OPERATIVO.
          </div>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="fecha_retorno_real" label="Fecha de Recibido" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }}/></Form.Item></Col>
            <Col span={12}><Form.Item name="costos_adicionales" label="Costos Adicionales ($)" tooltip="Costos incurridos por fletes, repuestos no cubiertos, etc."><Input type="number" min={0} /></Form.Item></Col>
          </Row>
          <Button type="primary" htmlType="submit" block style={{ background: '#10b981', borderColor: '#10b981' }}>Registrar Retorno y Reingresar</Button>
        </Form>
      </Modal>

    </div>
  );
}
