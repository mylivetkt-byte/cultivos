import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Typography, Select, Row, Col, Space, Tag, notification, Tabs } from 'antd';
import { FileExcelOutlined, FilePdfOutlined, CheckCircleOutlined, AlertOutlined, SafetyCertificateOutlined, CarOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { authFetch } from '../../utils/api';

const { Title, Text } = Typography;
const { Option } = Select;

export default function CustodiaRepuestosDashboard({ tenantId, currentUserId }) {
  const [deudas, setDeudas] = useState([]);
  const [chatarra, setChatarra] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ estado: 'Pendiente' }); // Pendiente, Entregado_Bodega, Todos

  useEffect(() => {
    if (tenantId) {
      loadDeudas();
      loadChatarra();
    }
  }, [tenantId, filtros]);

  const loadDeudas = () => {
    setLoading(true);
    authFetch(`/api/custodia-repuestos/deudas?tenantId=${tenantId}&estado=${filtros.estado}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setDeudas(data.deudas);
      })
      .finally(() => setLoading(false));
  };

  const loadChatarra = () => {
    authFetch(`/api/custodia-repuestos/chatarra?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setChatarra(data.inventario);
      });
  };

  const handleDescargo = (idCambio, nombreMecanico, nombreInsumo) => {
    if (!window.confirm(`¿Confirmas que el mecánico ${nombreMecanico} te acaba de entregar la pieza rota/vieja de [${nombreInsumo}]?`)) return;

    setLoading(true);
    authFetch(`/api/custodia-repuestos/${idCambio}/descargar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_usuario_recibe: currentUserId || null })
    }).then(res => res.json()).then(data => {
      if (data.success) {
        notification.success({ 
          message: 'Descargo Exitoso', 
          description: `La pieza fue recibida y enviada a la Bodega de Chatarra.`
        });
        loadDeudas();
        loadChatarra();
      } else {
        notification.error({ message: 'Error', description: data.error });
      }
    }).finally(() => setLoading(false));
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(deudas.map(d => ({
      'ID Pedido Origen': d.id_pedido_origen,
      'Cédula': d.documento,
      'Mecánico': `${d.nombres} ${d.apellidos}`,
      'Repuesto': d.insumo_nombre,
      'Estado Devolución': d.estado_devolucion,
      'Fecha Recepción': d.fecha_entrega_pieza?.substring(0,10) || 'Pendiente'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Deudores_Repuestos");
    XLSX.writeFile(wb, `Auditoria_Repuestos.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Cuentas por Cobrar de Repuestos (Control Antirrobo)`, 14, 15);
    
    const tableColumn = ["PEDIDO", "MECÁNICO", "REPUESTO", "ESTADO", "ENTREGA"];
    const tableRows = deudas.map(d => [
      d.id_pedido_origen || '-',
      `${d.nombres} ${d.apellidos}`,
      d.insumo_nombre,
      d.estado_devolucion,
      d.fecha_entrega_pieza?.substring(0,10) || 'NO ENTREGADO'
    ]);

    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20 });
    doc.save(`Auditoria_Repuestos.pdf`);
  };

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <Card style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0, color: '#001529' }}><SafetyCertificateOutlined /> Custodia de Repuestos y Chatarra</Title>
            <Text type="secondary">Control Estricto 1 a 1: Mecánico debe devolver pieza vieja para descargo de responsabilidad.</Text>
          </div>
          <Space>
            <Button icon={<FileExcelOutlined />} onClick={exportToExcel} style={{ color: '#52c41a', borderColor: '#52c41a' }}>Exportar Audit</Button>
            <Button icon={<FilePdfOutlined />} onClick={exportToPDF} danger>Exportar Audit PDF</Button>
          </Space>
        </div>
      </Card>

      <Tabs 
        defaultActiveKey="1" 
        type="card"
        items={[
          {
            key: '1',
            label: <span><AlertOutlined /> Cuentas por Cobrar (Deudores)</span>,
            children: (
              <>
                <Card style={{ borderRadius: 12, marginBottom: 24 }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Text strong>Filtrar por Estado de Devolución:</Text>
                      <Select style={{ width: '100%', marginTop: 8 }} value={filtros.estado} onChange={v => setFiltros({...filtros, estado: v})}>
                        <Option value="Todos">Todos</Option>
                        <Option value="Pendiente">Pendientes de Devolver (ROJO)</Option>
                        <Option value="Entregado_Bodega">Devueltos (Paz y Salvo)</Option>
                      </Select>
                    </Col>
                  </Row>
                </Card>

                <Card style={{ borderRadius: 12, padding: 0 }} bodyStyle={{ padding: 0 }}>
                  <Table 
                    dataSource={deudas}
                    rowKey="id_cambio"
                    loading={loading}
                    pagination={{ pageSize: 15 }}
                    columns={[
                      { title: 'Pedido Origen', dataIndex: 'id_pedido_origen', width: 120 },
                      { title: 'Mecánico / Operador', render: (_, r) => <b>{r.documento} - {r.nombres} {r.apellidos}</b> },
                      { title: 'Pieza Entregada (Nueva)', render: (_, r) => `[${r.insumo_codigo}] ${r.insumo_nombre}` },
                      { title: 'Estado Deuda', dataIndex: 'estado_devolucion', render: e => (
                        <Tag color={e === 'Pendiente' ? 'red' : 'green'}>{e.replace('_', ' ')}</Tag>
                      )},
                      { title: 'Fecha Descargo', dataIndex: 'fecha_entrega_pieza', render: d => d ? d.substring(0,10) : <Text type="danger">Moroso</Text> },
                      { title: 'Acción Almacén', width: 200, align: 'center', render: (_, r) => (
                        r.estado_devolucion === 'Pendiente' ? (
                          <Button type="primary" style={{ background: '#1890ff' }} icon={<CheckCircleOutlined />} onClick={() => handleDescargo(r.id_cambio, r.nombres, r.insumo_nombre)}>
                            Recibir Pieza Vieja
                          </Button>
                        ) : <Text type="secondary">Paz y Salvo</Text>
                      )}
                    ]}
                  />
                </Card>
              </>
            )
          },
          {
            key: '2',
            label: <span><CarOutlined /> Bodega de Chatarra (Para Vender)</span>,
            children: (
              <Card style={{ borderRadius: 12 }}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Todo el inventario listado aquí fue descargado por los mecánicos y está almacenado en el Cementerio listo para su monetización como chatarra.</Text>
                </div>
                <Table 
                  dataSource={chatarra}
                  rowKey="codigo"
                  pagination={false}
                  columns={[
                    { title: 'Código Insumo/Pieza', dataIndex: 'codigo' },
                    { title: 'Descripción', dataIndex: 'nombre' },
                    { title: 'Cant. Viejas Recibidas', dataIndex: 'cantidad', align: 'right', render: c => <b>{c}</b> },
                    { title: 'Unidad', dataIndex: 'unidad_medida' },
                  ]}
                />
              </Card>
            )
          }
        ]}
      />
    </div>
  );
}
