import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Typography, Select, Row, Col, Space, Tag, Modal, notification, DatePicker, Statistic, Input } from 'antd';
import { PlusOutlined, FilePdfOutlined, FileExcelOutlined, CheckCircleOutlined, CloseCircleOutlined, CarOutlined, WhatsAppOutlined } from '@ant-design/icons';
import { fetchTableData } from '../../utils/api';
import WhatsAppManager from '../Sistemas/WhatsAppManager';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { authFetch } from '../../utils/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const areasOrigen = [
  'Todas', 'Pre-vivero', 'Vivero', 'Siembra', 'Mantenimiento_Agricola', 'Sanidad_Vegetal', 
  'Cosecha_Recoleccion', 'Vias_Canales', 'Planta_Extractora', 'Taller_Maquinaria', 
  'Bodega', 'Administracion', 'Campamento_Casino', 'Produccion_Bioles', 'Seguridad'
];

export default function RequisicionesDashboard({ tenantId }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showWhatsAppManager, setShowWhatsAppManager] = useState(false);
  const [filtros, setFiltros] = useState({ estado: 'Todos', tipoOrigen: 'Todas', fechas: null });
  const [view, setView] = useState('list'); // list, detail, create
  const [activePedido, setActivePedido] = useState(null);
  const [detalles, setDetalles] = useState([]);
  
  // Para Autorizaciones
  const [autorizadores, setAutorizadores] = useState([]);
  const [authModal, setAuthModal] = useState({ visible: false, type: null });
  const [selectedAuth, setSelectedAuth] = useState(null);
  const [aprobarCantidades, setAprobarCantidades] = useState({});
  
  // WhatsApp
  const [whatsappModal, setWhatsappModal] = useState({ visible: false, selectedPhone: null });
  const [sendingWA, setSendingWA] = useState(false);

  // Para Nueva Solicitud
  const [insumosCata, setInsumosCata] = useState([]);
  const [empleadosCata, setEmpleadosCata] = useState([]);
  const [nuevoPedido, setNuevoPedido] = useState({ tipo_origen: 'Administracion', nombre_solicitante: '', observaciones: '', fecha_requerida: null, id_origen: null });
  const [cartItems, setCartItems] = useState([]);
  const [selectedInsumo, setSelectedInsumo] = useState(null);
  const [selectedCant, setSelectedCant] = useState(1);

  useEffect(() => {
    if (tenantId) {
      loadPedidos();
      loadAutorizadores();
      loadInsumos();
      loadEmpleados();
    }
  }, [tenantId, filtros]);

  const loadEmpleados = () => {
    authFetch(`/api/table/rrhh_empleados/data?tenantId=${tenantId}&pageSize=1000`)
      .then(res => res.json())
      .then(data => {
        if (data.data) setEmpleadosCata(data.data);
      });
  };

  const loadInsumos = () => {
    authFetch(`/api/table/insumos/data?tenantId=${tenantId}&pageSize=500`)
      .then(res => res.json())
      .then(data => {
        if (data.data) setInsumosCata(data.data);
      });
  };

  const loadPedidos = () => {
    setLoading(true);
    let url = `/api/pedidos-internos?tenantId=${tenantId}&estado=${filtros.estado}&tipoOrigen=${filtros.tipoOrigen}`;
    if (filtros.fechas) {
      url += `&fechaInicio=${filtros.fechas[0].format('YYYY-MM-DD')}&fechaFin=${filtros.fechas[1].format('YYYY-MM-DD')}`;
    }
    authFetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.success) setPedidos(data.pedidos);
      })
      .finally(() => setLoading(false));
  };

  const loadAutorizadores = () => {
    authFetch(`/api/pedidos-internos/autorizadores?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setAutorizadores(data.autorizadores);
      });
  };

  const loadDetalles = (idPedido) => {
    setLoading(true);
    authFetch(`/api/pedidos-internos/${idPedido}/detalles`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDetalles(data.detalles);
          // Init cant aprobada
          const cants = {};
          data.detalles.forEach(d => {
            cants[d.id_detalle] = d.cantidad_aprobada !== null ? d.cantidad_aprobada : d.cantidad_solicitada;
          });
          setAprobarCantidades(cants);
        }
      })
      .finally(() => setLoading(false));
  };

  const handleOpenDetail = (pedido) => {
    setActivePedido(pedido);
    setView('detail');
    loadDetalles(pedido.id_pedido);
  };

  const handleAutorizar = () => {
    if (!selectedAuth) {
      notification.warning({ message: 'Seleccione un autorizador válido' });
      return;
    }
    const authRecord = autorizadores.find(a => a.id_autorizador === selectedAuth);
    const nombreAuth = `${authRecord.nombres} ${authRecord.apellidos}`;
    
    const items_aprobados = detalles.map(d => ({
      id_detalle: d.id_detalle,
      cantidad_aprobada: aprobarCantidades[d.id_detalle]
    }));

    authFetch(`/api/pedidos-internos/${activePedido.id_pedido}/autorizar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estado: authModal.type,
        id_autorizador: selectedAuth,
        nombre_autorizador: nombreAuth,
        items_aprobados
      })
    }).then(res => res.json()).then(data => {
      if (data.success) {
        notification.success({ message: `Pedido ${authModal.type} exitosamente` });
        setAuthModal({ visible: false, type: null });
        loadPedidos();
        setView('list');
      } else {
        notification.error({ message: 'Error', description: data.error });
      }
    });
  };

  const handleSendWhatsApp = () => {
    if (!whatsappModal.selectedPhone) {
      notification.warning({ message: 'Seleccione a un empleado con número de teléfono' });
      return;
    }
    setSendingWA(true);
    authFetch('/api/whatsapp/send-pedido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_pedido: activePedido.id_pedido,
        phone: whatsappModal.selectedPhone,
        tenantId
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        notification.success({ message: 'Enviado correctamente por WhatsApp' });
        setWhatsappModal({ visible: false, selectedPhone: null });
      } else {
        notification.error({ message: 'Error enviando', description: data.error });
      }
    })
    .catch(err => {
      notification.error({ message: 'Error de red', description: err.message });
    })
    .finally(() => setSendingWA(false));
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(pedidos.map(p => ({
      'ID Pedido': p.id_pedido,
      'Fecha': p.fecha_solicitud?.substring(0,10),
      'Origen': p.tipo_origen,
      'Solicitante': p.nombre_solicitante,
      'Autorizador': p.nombre_autorizador || 'Pendiente',
      'Estado': p.estado,
      'Ítems': p.total_items
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
    XLSX.writeFile(wb, `Requisiciones_Auditoria.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    doc.text(`Auditoría de Requisiciones Internas`, 14, 15);
    
    const tableColumn = ["ID", "FECHA", "ORIGEN", "SOLICITANTE", "AUTORIZADOR", "ESTADO", "ÍTEMS"];
    const tableRows = pedidos.map(p => [
      p.id_pedido,
      p.fecha_solicitud?.substring(0,10),
      p.tipo_origen,
      p.nombre_solicitante,
      p.nombre_autorizador || '-',
      p.estado,
      p.total_items
    ]);

    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20 });
    doc.save(`Requisiciones_Auditoria.pdf`);
  };

  const getStatusColor = (estado) => {
    const colors = {
      'Pendiente_Aprobacion': 'orange',
      'Aprobado': 'blue',
      'Rechazado': 'red',
      'En_Despacho': 'cyan',
      'Despachado': 'purple',
      'Recibido': 'green'
    };
    return colors[estado] || 'default';
  };

  const handleSavePedido = () => {
    if (!nuevoPedido.nombre_solicitante || cartItems.length === 0) {
      notification.warning({ message: 'Llene el nombre del solicitante y agregue al menos 1 ítem.' });
      return;
    }
    setLoading(true);
    authFetch('/api/pedidos-internos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        id_bodega_provee: 1, // Default main bodega
        tipo_origen: nuevoPedido.tipo_origen,
        id_origen: nuevoPedido.id_origen,
        nombre_solicitante: nuevoPedido.nombre_solicitante,
        observaciones: nuevoPedido.observaciones,
        fecha_requerida: nuevoPedido.fecha_requerida ? nuevoPedido.fecha_requerida.format('YYYY-MM-DD') : null,
        items: cartItems.map(c => ({ id_insumo: c.id_insumo, cantidad_solicitada: c.cantidad }))
      })
    }).then(res => res.json()).then(data => {
      if (data.success) {
        notification.success({ message: 'Requisición Creada', description: 'Enviada para aprobación.' });
        setView('list');
        setCartItems([]);
        setNuevoPedido({ tipo_origen: 'Administracion', nombre_solicitante: '', observaciones: '', fecha_requerida: null, id_origen: null });
        loadPedidos();
      } else {
        notification.error({ message: 'Error', description: data.error });
      }
    }).finally(() => setLoading(false));
  };

  const handleAddToCart = () => {
    if (!selectedInsumo || selectedCant <= 0) return;
    const ins = insumosCata.find(i => i.id_insumo === selectedInsumo);
    if (!ins) return;
    
    setCartItems([...cartItems, { ...ins, cantidad: selectedCant }]);
    setSelectedInsumo(null);
    setSelectedCant(1);
  };

  if (view === 'create') {
    return (
      <div style={{ padding: 24, background: 'var(--bg-card)', minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>Nueva Requisición Interna</Title>
          <Space>
            <Button onClick={() => setView('list')}>Cancelar</Button>
            <Button type="primary" onClick={handleSavePedido} loading={loading}>Guardar y Enviar a Aprobación</Button>
          </Space>
        </div>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Text strong>Área Solicitante:</Text>
            <Select style={{ width: '100%', marginTop: 8 }} value={nuevoPedido.tipo_origen} onChange={v => setNuevoPedido({...nuevoPedido, tipo_origen: v})}>
              {areasOrigen.map(a => <Option key={a} value={a}>{a.replace('_', ' ')}</Option>)}
            </Select>
          </Col>
          <Col span={8}>
            <Text strong>Empleado Solicitante:</Text>
            <Select 
              showSearch
              style={{ width: '100%', marginTop: 8 }} 
              placeholder="Buscar por nombre o cédula..."
              value={nuevoPedido.id_origen}
              onChange={(val, option) => {
                setNuevoPedido({
                  ...nuevoPedido, 
                  id_origen: val, 
                  nombre_solicitante: option.children
                });
              }}
              filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
            >
              {empleadosCata.map(e => (
                <Option key={e.id_empleado} value={e.id_empleado}>
                  {e.documento} - {e.nombres} {e.apellidos}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <Text strong>Fecha Requerida:</Text>
            <DatePicker 
              style={{ width: '100%', marginTop: 8 }} 
              value={nuevoPedido.fecha_requerida}
              onChange={d => setNuevoPedido({...nuevoPedido, fecha_requerida: d})}
            />
          </Col>
        </Row>
        
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Text strong>Observaciones / Justificación:</Text>
            <Input.TextArea 
              style={{ marginTop: 8 }} 
              rows={2} 
              value={nuevoPedido.observaciones}
              onChange={e => setNuevoPedido({...nuevoPedido, observaciones: e.target.value})}
            />
          </Col>
        </Row>

        <Card title="Agregar Ítems al Pedido" size="small" style={{ marginBottom: 24 }}>
          <Row gutter={16} style={{ alignItems: 'flex-end' }}>
            <Col span={12}>
              <Text strong>Seleccionar Insumo/Repuesto:</Text>
              <Select 
                showSearch
                style={{ width: '100%', marginTop: 8 }} 
                placeholder="Buscar insumo..."
                value={selectedInsumo}
                onChange={v => setSelectedInsumo(v)}
                filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
              >
                {insumosCata.map(i => (
                  <Option key={i.id_insumo} value={i.id_insumo}>[{i.codigo}] {i.nombre}</Option>
                ))}
              </Select>
            </Col>
            <Col span={6}>
              <Text strong>Cantidad Solicitada:</Text>
              <Input 
                type="number" 
                style={{ width: '100%', marginTop: 8 }} 
                value={selectedCant}
                onChange={e => setSelectedCant(Number(e.target.value))}
              />
            </Col>
            <Col span={6}>
              <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddToCart} style={{ width: '100%' }}>Agregar Ítem</Button>
            </Col>
          </Row>
        </Card>

        <Table 
          dataSource={cartItems}
          rowKey={(r, i) => i}
          pagination={false}
          columns={[
            { title: 'Cód', dataIndex: 'codigo' },
            { title: 'Insumo', dataIndex: 'nombre' },
            { title: 'U/M', dataIndex: 'unidad_medida' },
            { title: 'Cant. Pedida', dataIndex: 'cantidad', align: 'right' },
            { title: 'Quitar', render: (_, r, i) => <Button danger size="small" onClick={() => {
              const newCart = [...cartItems];
              newCart.splice(i, 1);
              setCartItems(newCart);
            }}>X</Button> }
          ]}
        />
      </div>
    );
  }

  if (view === 'detail' && activePedido) {
    return (
      <div style={{ padding: 24, background: 'var(--bg-card)', minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>Pedido #{activePedido.id_pedido} - {activePedido.tipo_origen.replace('_', ' ')}</Title>
            <Text type="secondary">Solicitante: {activePedido.nombre_solicitante} | Fecha: {activePedido.fecha_solicitud?.substring(0,10)}</Text>
            <br />
            <Tag color={getStatusColor(activePedido.estado)} style={{ marginTop: 8 }}>{activePedido.estado.replace('_', ' ')}</Tag>
            {activePedido.nombre_autorizador && <Text style={{ marginLeft: 16 }}>Autorizado por: <b>{activePedido.nombre_autorizador}</b></Text>}
          </div>
          <Space>
            <Button onClick={() => setView('list')}>Volver</Button>
            <Button 
              style={{ background: '#25D366', color: 'white', borderColor: '#25D366' }} 
              icon={<WhatsAppOutlined />} 
              onClick={() => setWhatsappModal({ visible: true, selectedPhone: null })}
            >
              Enviar por WhatsApp
            </Button>
            {activePedido.estado === 'Pendiente_Aprobacion' && (
              <>
                <Button danger icon={<CloseCircleOutlined />} onClick={() => setAuthModal({ visible: true, type: 'Rechazado' })}>Rechazar</Button>
                <Button type="primary" style={{ background: '#52c41a' }} icon={<CheckCircleOutlined />} onClick={() => setAuthModal({ visible: true, type: 'Aprobado' })}>Aprobar Pedido</Button>
              </>
            )}
            {activePedido.estado === 'Aprobado' && (
              <Button type="primary" icon={<CarOutlined />}>Despachar a Área</Button>
            )}
          </Space>
        </div>

        <Table 
          dataSource={detalles} 
          rowKey="id_detalle" 
          pagination={false}
          loading={loading}
          columns={[
            { title: 'Cód', dataIndex: 'codigo', key: 'codigo' },
            { title: 'Insumo', dataIndex: 'nombre', key: 'nombre' },
            { title: 'Cant. Solicitada', dataIndex: 'cantidad_solicitada', key: 'cantidad_solicitada' },
            { title: 'Cant. Aprobada', key: 'cantidad_aprobada', render: (_, r) => (
              activePedido.estado === 'Pendiente_Aprobacion' ? (
                <input 
                  type="number" 
                  value={aprobarCantidades[r.id_detalle] || 0}
                  onChange={e => setAprobarCantidades({...aprobarCantidades, [r.id_detalle]: e.target.value})}
                  style={{ width: 80, padding: 4 }}
                />
              ) : <b>{r.cantidad_aprobada !== null ? r.cantidad_aprobada : '-'}</b>
            )}
          ]}
        />

        <Modal
          title={`Confirmar ${authModal.type === 'Aprobado' ? 'Aprobación' : 'Rechazo'}`}
          open={authModal.visible}
          onOk={handleAutorizar}
          onCancel={() => setAuthModal({ visible: false, type: null })}
          okText={authModal.type}
          okButtonProps={{ danger: authModal.type === 'Rechazado', style: authModal.type === 'Aprobado' ? { background: '#52c41a' } : {} }}
        >
          <div style={{ marginBottom: 16 }}>
            <Text>Para aplicar esta acción, seleccione quién autoriza (Auditoría Estricta):</Text>
          </div>
          <Select style={{ width: '100%' }} placeholder="Seleccione Autorizador..." onChange={v => setSelectedAuth(v)}>
            {autorizadores.map(a => (
              <Option key={a.id_autorizador} value={a.id_autorizador}>{a.nombres} {a.apellidos} - {a.area_autorizada}</Option>
            ))}
          </Select>
        </Modal>

        <Modal
          title="📲 Enviar Pedido por WhatsApp"
          open={whatsappModal.visible}
          onOk={handleSendWhatsApp}
          confirmLoading={sendingWA}
          onCancel={() => setWhatsappModal({ visible: false, selectedPhone: null })}
          okText="Enviar PDF"
          okButtonProps={{ style: { background: '#25D366', borderColor: '#25D366' } }}
        >
          <div style={{ marginBottom: 16 }}>
            <Text>Selecciona al empleado que recibirá este documento PDF en su celular:</Text>
          </div>
          <Select 
            showSearch
            style={{ width: '100%' }} 
            placeholder="Buscar empleado por cédula, nombre o teléfono..." 
            onChange={v => setWhatsappModal({ ...whatsappModal, selectedPhone: v })}
            filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
          >
            {empleadosCata.map(e => (
              <Option key={e.id_empleado} value={e.telefono}>
                {e.documento} - {e.nombres} {e.apellidos} ({e.telefono || 'Sin teléfono'})
              </Option>
            ))}
          </Select>
          <div style={{ marginTop: 16, color: '#64748b', fontSize: '12px' }}>
            * Solo los empleados con un número válido recibirán el mensaje. Puedes asignarles un número desde la ficha del empleado.
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <Card style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0, color: '#001529' }}>📋 Gestor Estricto de Pedidos Internos</Title>
            <Text type="secondary">Control de requisiciones de todas las áreas (Auditoría y Autorizaciones)</Text>
          </div>
          <Space>
            <Button icon={<WhatsAppOutlined />} onClick={() => setShowWhatsAppManager(true)} style={{ background: '#25D366', color: 'white', borderColor: '#25D366' }}>Conexión WhatsApp</Button>
            <Button className="btn-action-base btn-excel" icon={<FileExcelOutlined />} onClick={exportToExcel}>Exportar Excel</Button>
            <Button className="btn-action-base btn-pdf" icon={<FilePdfOutlined />} onClick={exportToPDF}>Exportar PDF</Button>
            <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setView('create')}>Nueva Solicitud</Button>
          </Space>
        </div>
      </Card>

      <Card style={{ borderRadius: 12, marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Text strong>Estado:</Text>
            <Select style={{ width: '100%', marginTop: 8 }} value={filtros.estado} onChange={v => setFiltros({...filtros, estado: v})}>
              <Option value="Todos">Todos los Estados</Option>
              <Option value="Pendiente_Aprobacion">Pendiente Aprobación</Option>
              <Option value="Aprobado">Aprobado</Option>
              <Option value="Rechazado">Rechazado</Option>
              <Option value="Despachado">Despachado</Option>
              <Option value="Recibido">Recibido</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Text strong>Área Solicitante:</Text>
            <Select style={{ width: '100%', marginTop: 8 }} value={filtros.tipoOrigen} onChange={v => setFiltros({...filtros, tipoOrigen: v})}>
              {areasOrigen.map(a => <Option key={a} value={a}>{a.replace('_', ' ')}</Option>)}
            </Select>
          </Col>
          <Col span={8}>
            <Text strong>Rango de Fechas:</Text>
            <RangePicker style={{ width: '100%', marginTop: 8 }} onChange={dates => setFiltros({...filtros, fechas: dates})} />
          </Col>
        </Row>
      </Card>

      <Card style={{ borderRadius: 12, padding: 0 }} bodyStyle={{ padding: 0 }}>
        <Table 
          dataSource={pedidos}
          rowKey="id_pedido"
          loading={loading}
          pagination={{ pageSize: 10 }}
          className="data-table"
          onRow={(record) => ({
            onClick: () => handleOpenDetail(record),
            style: { cursor: 'pointer' }
          })}
          columns={[
            { title: 'ID', dataIndex: 'id_pedido', width: 80, render: id => <b>#{id}</b> },
            { title: 'Fecha Solicitud', dataIndex: 'fecha_solicitud', render: d => d?.substring(0,10) },
            { title: 'Área Origen', dataIndex: 'tipo_origen', render: t => <b style={{color:'#1890ff'}}>{t.replace('_', ' ')}</b> },
            { title: 'Solicitante', dataIndex: 'nombre_solicitante' },
            { title: 'Estado', dataIndex: 'estado', render: e => <Tag color={getStatusColor(e)}>{e.replace('_', ' ')}</Tag> },
            { title: 'Autorizador', dataIndex: 'nombre_autorizador', render: a => a ? a : <Text type="secondary">N/A</Text> },
            { title: 'Ítems', dataIndex: 'total_items', align: 'center' },
            { title: 'Acción', render: (_, r) => <Button type="link" onClick={(e) => { e.stopPropagation(); handleOpenDetail(r); }}>Auditar</Button> }
          ]}
        />
      </Card>

      {/* Modal de Conexión WhatsApp */}
      <Modal
        title={null}
        visible={showWhatsAppManager}
        onCancel={() => setShowWhatsAppManager(false)}
        footer={null}
        width={1000}
        bodyStyle={{ padding: '0', background: '#f8fafc' }}
        destroyOnClose
      >
        <WhatsAppManager tenantId={tenantId} />
      </Modal>
    </div>
  );
}
